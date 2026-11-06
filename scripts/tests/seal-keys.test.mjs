// scripts/seal-keys.mjs: the pair of locks, and the publish's step that opens waiting keys. Stand-in wrangler and gh
// keep what they are handed in files, so a test reads where each value went, and that no output or argument holds one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REPO, pack } from './fixtures/pack.mjs';
import { parseConfig } from '../lib-wrangler-config.mjs';
import { makePair, open, seal } from '../../app/src/lib/seal.ts';

const CONFIG = `{
  "name": "demo",
  "main": "worker/index.ts",
  "vars": {
    // The owner's email.
    "WONG_ENVIRONMENT": "production"
  },
  "d1_databases": [{ "binding": "DB", "database_name": "demo-db", "database_id": "prod-id" }],
  "env": { "staging": { "name": "demo-staging", "vars": { "WONG_ENVIRONMENT": "staging" } } }
}
`;
// wrangler: logs its arguments; answers the waiting rows from rows.json; keeps a bulk file's keys and a put's stdin;
// FAKE_FAIL names a call that fails, printing what it was handed.
const WRANGLER = `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const args = process.argv.slice(2), root = process.env.FAKE_ROOT;
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'wrangler', args, env: process.env.CLOUDFLARE_ENV ?? null, account: process.env.CLOUDFLARE_ACCOUNT_ID ?? null }) + '\\n');
const handed = args[1] === 'bulk' ? fs.readFileSync(args[2], 'utf8') : args[1] === 'put' ? fs.readFileSync(0, 'utf8') : '';
if (process.env.FAKE_FAIL === args[1]) { console.error('wrangler refused: ' + handed); process.exit(1); }
if (args[1] === 'bulk') fs.writeFileSync(path.join(root, 'put.json'), handed);
if (args[1] === 'put') fs.writeFileSync(path.join(root, 'runner-secret'), handed);
if (args.includes('--json')) console.log(JSON.stringify([{ results: JSON.parse(fs.readFileSync(path.join(root, 'rows.json'), 'utf8')), success: true }]));
`;
const GH = `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'gh', args: process.argv.slice(2) }) + '\\n');
const handed = fs.readFileSync(0, 'utf8');
if (process.env.FAKE_FAIL === 'gh') { console.error('gh: HTTP 403 for ' + handed); process.exit(1); }
fs.writeFileSync(path.join(process.env.FAKE_ROOT, 'gh-secret'), handed);
`;

function repo(t, config = CONFIG) {
  const made = pack(t, { scripts: ['seal-keys.mjs', 'lib-wrangler-config.mjs', 'lib-cli.mjs'], config, tools: { wrangler: WRANGLER, gh: GH }, prefix: 'seal-keys-' });
  mkdirSync(join(made.root, 'app/src/lib'), { recursive: true });
  copyFileSync(join(REPO, 'app/src/lib/seal.ts'), join(made.root, 'app/src/lib/seal.ts'));
  const env = { WONG_WRANGLER: join(made.dir, 'bin', 'wrangler') };
  const run = (command, extra = {}) => made.run('seal-keys.mjs', [command], { env: { ...env, ...extra } });
  const read = name => readFileSync(join(made.root, name), 'utf8');
  return { ...made, run, read, tools: calls => calls.map(line => JSON.parse(line)) };
}

test('pair puts the private half on GitHub and the public half in every vars block, printing neither', async t => {
  const r = repo(t);
  const ran = r.run('pair');
  assert.equal(ran.status, 0, ran.out);
  const config = parseConfig(join(r.root, 'app/wrangler.jsonc'));
  const publicKey = config.vars.WONG_KEY_SEAL_PUBLIC;
  assert.equal(config.env.staging.vars.WONG_KEY_SEAL_PUBLIC, publicKey, 'named environments inherit no vars, so staging gets its own copy');
  assert.equal(config.env.staging.vars.WONG_ENVIRONMENT, 'staging');
  assert.match(r.read('app/wrangler.jsonc'), /"vars": \{\n {4}"WONG_KEY_SEAL_PUBLIC": "[A-Za-z0-9+/=]+",\n {4}\/\/ The owner's email\./);
  assert.deepEqual(r.tools(ran.calls).map(call => [call.tool, call.args]), [['gh', ['secret', 'set', 'WONG_KEY_SEAL_PRIVATE']]]);
  const privateKey = r.read('gh-secret');
  assert.equal(await open(await seal('a made-up key', publicKey), privateKey), 'a made-up key', 'the two halves are one pair');
  assert.ok(!ran.out.includes(privateKey) && !ran.calls.join('\n').includes(privateKey));
  assert.match(ran.out, /WONG_KEY_SEAL_PUBLIC written to app\/wrangler\.jsonc; WONG_KEY_SEAL_PRIVATE set on GitHub/);
  // Again: a new pair, written in the same place.
  assert.equal(r.run('pair').status, 0);
  const again = parseConfig(join(r.root, 'app/wrangler.jsonc')).vars.WONG_KEY_SEAL_PUBLIC;
  assert.notEqual(again, publicKey);
  assert.equal(r.read('app/wrangler.jsonc').match(/WONG_KEY_SEAL_PUBLIC/g).length, 2, 'one line a vars block, replaced in place');
  assert.equal(parseConfig(join(r.root, 'app/wrangler.jsonc')).env.staging.vars.WONG_KEY_SEAL_PUBLIC, again);
});

test('pair changes nothing when the private half can not be set, or the config has no top-level vars', t => {
  const r = repo(t);
  const failed = r.run('pair', { FAKE_FAIL: 'gh' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /WONG_KEY_SEAL_PRIVATE was not set on GitHub, so nothing changed: gh: HTTP 403 for \*\*\*\*/);
  assert.equal(r.read('app/wrangler.jsonc'), CONFIG);
  const bare = repo(t, CONFIG.replace(/"vars": \{[^}]*\},\n/, ''));
  const refused = bare.run('pair');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /needs a top-level "vars" first/);
  assert.deepEqual(refused.calls, []);
});

test('pair on the Artifacts route sets the check runner\'s secret with the person\'s Cloudflare login', t => {
  const r = repo(t);
  r.write('.claude/.wong-stack.json', JSON.stringify({ components: { delivery: { route: 'artifacts', workflow: 'demo-checks', accountId: 'a'.repeat(32) } } }));
  const missing = r.run('pair');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /CLOUDFLARE_API_TOKEN is not set/);
  r.write('.env', 'CLOUDFLARE_API_TOKEN=made-up-token\n');
  const ran = r.run('pair');
  assert.equal(ran.status, 0, ran.out);
  assert.deepEqual(r.tools(ran.calls).map(call => [call.args, call.account]), [[['secret', 'put', 'WONG_KEY_SEAL_PRIVATE', '--name', 'demo-checks'], 'a'.repeat(32)]]);
  assert.ok(r.read('runner-secret').length > 1000);
  assert.match(ran.out, /set on the check runner demo-checks/);
});

test('put opens each waiting key, puts them in one go, and deletes only those rows; one it can not open stays, named', async t => {
  const r = repo(t);
  const pair = await makePair();
  const other = await makePair();
  const rows = [
    { name: 'TOOL_SHOPIFY', sealed: await seal('shpss_made-up-secret', pair.publicKey), sent_at: 1700000000001 },
    { name: 'TOOL_SHOPIFY_ID', sealed: await seal('made-up-client-id', pair.publicKey), sent_at: 1700000000002 },
    { name: 'TOOL_NOTION', sealed: await seal('ntn_made-up-token', other.publicKey), sent_at: 1700000000003 },
    { name: 'WONG_CODE_WRITE', sealed: await seal('made-up-code-key', pair.publicKey), sent_at: 1700000000004 },
  ];
  writeFileSync(join(r.root, 'rows.json'), JSON.stringify(rows));
  const ran = r.run('put', { WONG_KEY_SEAL_PRIVATE: pair.privateKey, CF_BRANCH: 'main', CF_PRODUCTION_BRANCH: 'main', CLOUDFLARE_ENV: 'staging' });
  assert.equal(ran.status, 1, ran.out);
  assert.deepEqual(JSON.parse(r.read('put.json')), { TOOL_SHOPIFY: 'shpss_made-up-secret', TOOL_SHOPIFY_ID: 'made-up-client-id' });
  const calls = r.tools(ran.calls);
  assert.deepEqual(calls.map(call => call.args.slice(0, 2)), [['d1', 'execute'], ['secret', 'bulk'], ['d1', 'execute']]);
  assert.deepEqual(calls.map(call => call.env), [null, null, null], 'production, never the environment the job had');
  assert.equal(calls[0].args.slice(2, 4).join(' '), 'demo-db --remote');
  assert.equal(calls[2].args.at(-1), "DELETE FROM sealed_keys WHERE (name = 'TOOL_SHOPIFY' AND sent_at = 1700000000001) OR (name = 'TOOL_SHOPIFY_ID' AND sent_at = 1700000000002)");
  assert.match(ran.out, /could not open TOOL_NOTION, WONG_CODE_WRITE; they stay waiting\nseal-keys: put TOOL_SHOPIFY, TOOL_SHOPIFY_ID in the live app's secrets/);
  for (const value of ['made-up', pair.privateKey]) assert.ok(!ran.out.includes(value) && !ran.calls.join('\n').includes(value), value);
});

test('put opens nothing without the private half or on a preview, says when none wait, and keeps every row when the put fails', async t => {
  const r = repo(t);
  const pair = await makePair();
  const none = r.run('put');
  assert.deepEqual([none.status, none.out.trim(), none.calls], [0, 'seal-keys: no WONG_KEY_SEAL_PRIVATE here, so waiting keys stay waiting', []]);
  const preview = r.run('put', { WONG_KEY_SEAL_PRIVATE: pair.privateKey, CF_BRANCH: 'feature-x', CF_PRODUCTION_BRANCH: 'main' });
  assert.deepEqual([preview.status, preview.calls], [1, []]);
  assert.match(preview.stderr, /never a preview/);
  writeFileSync(join(r.root, 'rows.json'), '[]');
  const empty = r.run('put', { WONG_KEY_SEAL_PRIVATE: pair.privateKey });
  assert.deepEqual([empty.status, empty.out.trim()], [0, 'seal-keys: no keys wait']);
  writeFileSync(join(r.root, 'rows.json'), JSON.stringify([{ name: 'TOOL_STRIPE', sealed: await seal('sk_made-up-value', pair.publicKey), sent_at: 1 }]));
  const failed = r.run('put', { WONG_KEY_SEAL_PRIVATE: pair.privateKey, FAKE_FAIL: 'bulk' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /the waiting keys were not put, so all stay waiting: wrangler refused: \{"TOOL_STRIPE":"\*\*\*\*"\}/);
  assert.deepEqual(r.tools(failed.calls).map(call => call.args[1]), ['execute', 'bulk']);
  assert.ok(!existsSync(join(r.root, 'put.json')));
  assert.ok(!failed.out.includes('sk_made-up'));
  // The file the keys went through is gone.
  assert.ok(!existsSync(dirname(r.tools(failed.calls)[1].args[2])));
});
