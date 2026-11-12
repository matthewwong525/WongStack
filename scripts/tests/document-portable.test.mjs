// Document search is tested with Node alone: no sqlite, private store, dependency or download.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('a fresh checkout returns original passages by words, refuses the removed modes, and writes nothing outside it', t => {
  const cwd = mkdtempSync(join(tmpdir(), 'wong-portable-documents-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd }); mkdirSync(join(cwd, 'wiki'));
  writeFileSync(join(cwd, 'wiki/guide.md'), '# Portable guidance\nPortable keyword retrieval reads originals.\n');
  const data = join(cwd, 'data'), cli = fileURLToPath(new URL('../../.agents/skills/memory/scripts/memory.mjs', import.meta.url));
  const env = { ...process.env, LOCALAPPDATA: data, XDG_DATA_HOME: data, CLOUDFLARE_MEMORY_TOKEN: '' };
  const run = args => spawnSync(process.execPath, [cli, 'documents', 'portable keyword retrieval', ...args, '--json'], { cwd, env, encoding: 'utf8' });
  for (const args of [[], ['--mode', 'keyword'], ['--mode', 'auto']]) {
    const { status, stdout } = run(args), packet = JSON.parse(stdout);
    assert.equal(status, 0); assert.ok(Buffer.byteLength(stdout) <= 6144); assert.equal(packet.version, 2);
    for (const gone of ['mode', 'backend', 'coverage', 'requestedModeState']) assert.equal(gone in packet, false, gone);
    assert.equal(packet.documents[0].path, 'wiki/guide.md'); assert.equal(packet.documents[0].freshness, 'verified');
    assert.deepEqual(packet.sources.documents, { state: 'ok' });
  }
  for (const mode of ['semantic', 'deep']) {
    const { status, stdout, stderr } = run(['--mode', mode]);
    assert.equal(status, 2); assert.equal(stdout, ''); assert.match(stderr, /Meaning-based search was removed/);
  }
  assert.equal(existsSync(join(data, 'wongstack/documents')), false);
  assert.equal(existsSync(data), false, 'nothing is written to the data folder');
});
