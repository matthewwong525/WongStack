import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newKey, hashKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { buildDigest } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { renderPacket, byteSize } from '../../.agents/skills/memory/scripts/lib/documents/packet.mjs';
import { validateRetrieval } from '../../.agents/skills/memory/scripts/lib/documents/input.mjs';
import { recallPacket } from '../../.agents/skills/memory/scripts/lib/documents/commands.mjs';
import { callMemory, memoryOperations } from '../../.agents/skills/memory/scripts/operations.mjs';
import { memory, node, setup, tempDir } from './fixtures/memory/harness.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
function document(repo, text = '# Delivery guidance\nDelivery waits for approved checks.\n') {
  mkdirSync(join(repo.root, 'wiki'), { recursive: true }); writeFileSync(join(repo.root, 'wiki/guide.md'), text);
}
const fakeFact = (id, body = 'Original permitted delivery evidence.') => ({ id, slug: 'delivery', type: 'project', body,
  author: 'synthetic@example.com', created_at: '2026-10-04', session_id: null, state: 'conversation' });
const fakeDoc = (index, text = 'Original document evidence.') => ({ path: `wiki/guide-${index}.md`, role: 'wiki',
  reference: `wiki/guide-${index}.md:1`, heading: 'Guide', hash: 'a'.repeat(64), startLine: 1, endLine: text.split('\n').length,
  text, freshness: 'verified', truncated: false });

test('shared text and JSON budgets preserve whole Unicode facts, source balance, references and omissions', () => {
  for (const json of [false, true]) {
    const facts = Array.from({ length: 8 }, (_, index) => fakeFact(index + 1, '原始🧠'.repeat(70)));
    const documents = Array.from({ length: 5 }, (_, index) => fakeDoc(index, Array.from({ length: 15 }, () => 'Retrieved original line.').join('\n')));
    const result = renderPacket({ question: '原'.repeat(4000), facts, documents,
      factSource: { state: 'ok' }, documentSource: { state: 'ok' } }, { json });
    assert.ok(result.bytes <= 6144); assert.equal(byteSize(result.text), result.bytes);
    assert.ok(result.packet.facts.length > 0); assert.ok(result.packet.documents.length > 0);
    assert.ok(result.packet.omitted.facts > 0 || result.packet.omitted.documents > 0);
    for (const fact of result.packet.facts) assert.equal(fact.body, facts.find(source => source.id === fact.id).body);
    for (const doc of result.packet.documents) { assert.equal(doc.freshness, 'verified'); assert.ok(doc.reference); }
    if (json) assert.equal(JSON.parse(result.text).version, 1);
  }
});
test('unused source budget is reclaimed, oversized entries are omitted and line excerpts marked truncated', () => {
  const facts = [fakeFact(1, 'x'.repeat(20000)), fakeFact(2)];
  const document = fakeDoc(1, Array.from({ length: 500 }, () => 'Short original line.').join('\n'));
  const result = renderPacket({ question: 'delivery', facts, documents: [document], factSource: { state: 'ok' }, documentSource: { state: 'ok' } }, { json: true });
  assert.ok(result.bytes <= 6144); assert.equal(result.packet.facts[0].id, 2); assert.equal(result.packet.omitted.facts, 1);
  assert.equal(result.packet.documents[0].truncated, true);
  assert.equal(result.packet.documents[0].endLine, result.packet.documents[0].text.split('\n').length);
});
test('large current excerpts reserve useful active and archived bodies and reject empty heading-only evidence', () => {
  const documents = ['wiki', 'specs', 'active', 'archive'].map((role, index) => ({
    ...fakeDoc(index, `# ${role}\n\nUseful ${role} decision evidence.\n${('Additional original evidence.\n').repeat(250)}`), role,
  }));
  documents.push(fakeDoc(4, '# Empty section\n\n'));
  for (const json of [false, true]) {
    const result = renderPacket({ question: 'Why this decision?', documents, factSource: { state: 'empty' }, documentSource: { state: 'ok' } }, { json });
    assert.ok(result.bytes <= 6144);
    assert.deepEqual(result.packet.documents.map(doc => doc.role), ['wiki', 'specs', 'active', 'archive']);
    assert.equal(result.packet.omitted.documents, 1);
    for (const doc of result.packet.documents) {
      assert.match(doc.text, new RegExp(`Useful ${doc.role} decision evidence`));
      assert.equal(doc.text, documents.find(original => original.path === doc.path).text.split('\n').slice(0, doc.endLine).join('\n'));
    }
  }
});
test('company CLI writes near-budget document packets compactly without enlarging original evidence', t => {
  const target = tempDir(t, 'company-document-budget-'); execFileSync('git', ['init', '-q'], { cwd: target });
  mkdirSync(join(target, 'wiki'));
  for (let index = 0; index < 5; index++) writeFileSync(join(target, `wiki/guide-${index}.md`),
    `# Delivery ${index}\n${Array.from({ length: 35 }, (_, line) => `Delivery evidence ${line}: ${'x'.repeat(150)}`).join('\n')}\n`);
  const stdout = execFileSync(process.execPath, [join(root, 'scripts/company-api.mjs'), 'call', 'memory.documents', '--file', '-'], {
    cwd: target, encoding: 'utf8', input: JSON.stringify({ question: 'delivery', mode: 'keyword' }),
    env: { ...process.env, XDG_DATA_HOME: join(target, 'data'), CLOUDFLARE_MEMORY_TOKEN: '' },
  });
  assert.ok(Buffer.byteLength(stdout) > 5300); assert.ok(Buffer.byteLength(stdout) <= 6144);
  const packet = JSON.parse(stdout); assert.equal(packet.version, 1); assert.ok(packet.documents.length > 0);
  assert.equal(stdout, `${JSON.stringify(packet)}\n`);
  assert.ok(Buffer.byteLength(`${JSON.stringify(packet, null, 2)}\n`) > 6144);
});
test('document CLI requires no memory configuration or secret and invalid input exits2 before access', t => {
  const target = tempDir(t, 'documents-portable-'); execFileSync('git', ['init', '-q'], { cwd: target });
  document({ root: target });
  const cli = join(root, '.agents/skills/memory/scripts/memory.mjs');
  const run = args => execFileSync(process.execPath, [cli, ...args], { cwd: target, encoding: 'utf8', env: { ...process.env, XDG_DATA_HOME: join(target, 'data'), CLOUDFLARE_MEMORY_TOKEN: '' } });
  const packet = JSON.parse(run(['documents', 'delivery', '--mode', 'keyword', '--json']));
  assert.equal(packet.documents[0].path, 'wiki/guide.md'); assert.equal(packet.facts.length, 0); assert.equal(packet.backend, 'lexical-fallback');
  assert.throws(() => run(['documents', 'delivery', '--everyone']), error => error.status === 2);
  assert.throws(() => run(['documents', 'delivery', '--scope', 'private']), error => error.status === 2);
});
test('combined CLI returns live fact metadata once with independently verified local documents', async t => {
  const { repo, fake } = await setup(t); document(repo);
  fake.db.prepare("INSERT INTO facts (slug,type,body,source,created_at,author,owner_machine_id,shared) VALUES ('delivery','project','Delivery uses approved checks.','migration','2026-10-04','synthetic@example.com',?,1)").run(repo.machineId);
  const result = await memory(repo, fake, ['recall', 'delivery', '--mode', 'keyword', '--json']);
  assert.equal(result.code, 0, result.stderr); const packet = JSON.parse(result.stdout);
  assert.equal(packet.facts.length, 1); assert.equal(packet.facts[0].body, 'Delivery uses approved checks.');
  assert.equal(packet.sources.facts.state, 'ok'); assert.equal(packet.sources.documents.state, 'ok');
  assert.equal(packet.documents[0].freshness, 'verified'); assert.ok(Buffer.byteLength(result.stdout) <= 6144);
});
test('denied or offline facts leave usable documents and no hidden fact identifiers', async t => {
  const { repo, fake } = await setup(t); document(repo);
  const denied = await memory(repo, fake, ['recall', 'delivery', '--mode', 'keyword', '--json'], { env: { CLOUDFLARE_MEMORY_TOKEN: 'wongm_missing.bad' } });
  assert.equal(denied.code, 0, denied.stderr); const packet = JSON.parse(denied.stdout);
  assert.equal(packet.sources.facts.state, 'denied'); assert.deepEqual(packet.facts, []); assert.ok(packet.documents.length > 0);
  fake.setOffline(true);
  const offline = await memory(repo, fake, ['recall', 'delivery', '--mode', 'keyword', '--json']);
  assert.equal(offline.code, 0); assert.equal(JSON.parse(offline.stdout).sources.facts.state, 'unavailable');
});
test('member installed recall keeps personal facts private and never expands admin scope', async t => {
  const { repo, fake } = await setup(t); document(repo);
  const key = newKey(repo.machineId);
  fake.db.prepare("INSERT INTO memory_keys (hash,email,role,created_at,machine_id) VALUES (?,'same@example.com','member','now',?)").run(await hashKey(key), repo.machineId);
  const insert = fake.db.prepare("INSERT INTO facts (slug,type,body,source,created_at,author,owner_machine_id,shared) VALUES ('delivery',?,?,'migration','2026-10-04','same@example.com',?,?)");
  insert.run('project', 'Delivery shared evidence.', repo.machineId, 1);
  insert.run('user', 'Delivery private evidence.', 'other-owner', 0);
  const result = await node(repo, fake, 'operations.mjs', ['call', 'memory.recall', '--file', '-'],
    { input: JSON.stringify({ question: 'delivery', mode: 'keyword' }), env: { CLOUDFLARE_MEMORY_TOKEN: key } });
  assert.equal(result.code, 0, result.stderr); const packet = JSON.parse(result.stdout);
  assert.equal(packet.version, 1); assert.deepEqual(packet.facts.map(fact => fact.body), ['Delivery shared evidence.']);
  assert.ok(!result.stdout.includes('private evidence')); assert.ok(packet.documents.length > 0);
});
test('recall total deadline bounds even adapters that ignore cancellation', async t => {
  const target = tempDir(t, 'recall-deadline-'); execFileSync('git', ['init', '-q'], { cwd: target }); document({ root: target });
  const started = Date.now();
  const result = await recallPacket({ root: target, commonDir: join(target, '.git') }, validateRetrieval('delivery', { json: true }, { recall: true }), {
    timeoutMs: 40, factsRead: () => new Promise(() => {}), documentsRead: () => new Promise(() => {}),
  });
  assert.ok(Date.now() - started < 2000); assert.equal(result.packet.sources.facts.state, 'unavailable');
  assert.equal(result.packet.sources.documents.state, 'partial'); assert.ok(result.packet.documents.length > 0);
});
test('installed local operation validates before loading credentials and returns packet without secondary truncation', async t => {
  const target = tempDir(t, 'recall-adapter-'); execFileSync('git', ['init', '-q'], { cwd: target });
  const packet = renderPacket({ question: 'delivery', documents: [fakeDoc(1)], factSource: { state: 'empty' }, documentSource: { state: 'ok' } }, { json: true });
  const result = await callMemory('memory.documents', { question: 'delivery' }, { cwd: target, execute: async (_command, args) => {
    assert.ok(args.includes('--json')); return { stdout: packet.text };
  } });
  assert.deepEqual(result, packet.packet);
  assert.equal(memoryOperations.find(action => action.operationId === 'memory.documents').authentication, 'local-checkout');
  await assert.rejects(callMemory('memory.recall', { question: 'x', everyone: true }, { cwd: '/absent' }), /Invalid/);
  await assert.rejects(callMemory('memory.documents', { question: 'lex: injection' }, { cwd: '/absent' }), /Question/);
});
test('payload carries every retrieval module and runbook but no installed models', t => {
  const target = tempDir(t, 'retrieval-payload-');
  cpSync(join(root, '.agents/skills/memory'), join(target, '.agents/skills/memory'), { recursive: true });
  const inventory = JSON.parse(readFileSync(join(root, '.agents/skills/wong-sync/references/payload-files.json')));
  assert.ok(inventory.core.files.includes('wiki/development/document-retrieval.md'));
  for (const file of ['commands.mjs', 'corpus.mjs', 'state.mjs', 'qmd.mjs', 'setup.mjs', 'retrieve.mjs', 'lexical.mjs', 'packet.mjs', 'runtime.json', 'runtime/package-lock.json'])
    assert.ok(existsSync(join(target, '.agents/skills/memory/scripts/lib/documents', file)));
  const description = JSON.parse(execFileSync(process.execPath, [join(target, '.agents/skills/memory/scripts/operations.mjs'), 'describe', 'memory.documents'], { cwd: target, encoding: 'utf8' }));
  assert.equal(description.transport, 'installed-client'); assert.equal(description.authentication, 'local-checkout');
  assert.equal(existsSync(join(target, 'models')), false); assert.equal(existsSync(join(target, 'node_modules')), false);
});
test('agent guidance recalls then reads originals while startup and first-edit hooks remain model-free', () => {
  const digest = buildDigest({ facts: [fakeFact(1)], personal: true, admin: true });
  assert.match(digest, /recall <question>/); assert.match(digest, /search <terms> --everyone/);
  assert.doesNotMatch(digest, /recall <question> --everyone/);
  for (const path of ['.agents/skills/memory/scripts/session-start.mjs', '.agents/skills/memory/scripts/before-edit.mjs']) {
    const source = readFileSync(join(root, path), 'utf8'); assert.doesNotMatch(source, /documents\/|runQmd|documents-setup/);
  }
  const explore = readFileSync(join(root, '.agents/skills/explore/SKILL.md'), 'utf8');
  assert.match(explore, /recall <question>/); assert.match(explore, /read cited originals/); assert.match(explore, /areas <paths>/);
});
