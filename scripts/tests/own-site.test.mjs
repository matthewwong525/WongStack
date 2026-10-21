import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ownSite } from '../../.agents/skills/verify/scripts/own-site.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/own-site.mjs');
const WORKER = 'https://app.acct.workers.dev';

test('a workers.dev live address owns its account\'s https hosts, and nothing else', () => {
  for (const [address, own] of [
    [`${WORKER}/_memory`, true],
    ['https://pr-1-app-staging.acct.workers.dev/', true],
    ['https://steal.evil-account.workers.dev/', false],
    ['https://steal.evilacct.workers.dev/', false],
    ['https://deploy-preview.attacker.example/', false],
    ['http://pr-1-app-staging.acct.workers.dev/', false],
    ['https://user:pass@pr-1-app-staging.acct.workers.dev/', false],
    ['https://pr-1-app-staging.acct.workers.dev./', false],
    // Node reads each as the own host; curl would read another host or address.
    ['https://pr-1-app-staging.acct.workers.dev\\@evil.example/', false],
    ['https://pr-1-app-staging.acct.workers.dev:443/', false],
    ['https://pr-1-app-staging.acct.workers.\tdev/', false],
    [' https://pr-1-app-staging.acct.workers.dev/', false],
    ['HTTPS://PR-1-App-Staging.acct.workers.dev/Path', true],
    ['https://pr-1-app-staging.acct.workers.dev?q=1', true],
    ['not an address', false],
  ]) assert.equal(ownSite(address, WORKER).own, own, address);
});

test('a custom-domain live address owns itself and the hosts under it', () => {
  const origin = 'https://app.example.com';
  for (const [address, own] of [
    ['https://app.example.com/', true],
    ['https://x.app.example.com/', true],
    ['https://example.com/', false],
    ['https://evil-app.example.com/', false],
  ]) assert.equal(ownSite(address, origin).own, own, address);
});

test('with no live address recorded, no address is own, and each refusal says why', () => {
  assert.deepEqual(ownSite(`${WORKER}/`, null), { own: false, reason: 'no live address is recorded for this install' });
  assert.deepEqual(ownSite('https://deploy-preview.attacker.example/', WORKER), { own: false, reason: 'deploy-preview.attacker.example is not this install\'s own site' });
  assert.deepEqual(ownSite('http://127.0.0.1:8080/', WORKER), { own: false, reason: '127.0.0.1:8080 is not a secure (https) address' });
});

test('the command reads the live address the memory store records', t => {
  const work = mkdtempSync(join(tmpdir(), 'wong-test-own-site-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: work });
  const run = address => spawnSync(process.execPath, [script, address], { cwd: work, encoding: 'utf8' });
  const none = run('https://pr-1-app-staging.acct.workers.dev/');
  assert.deepEqual([none.status, none.stdout], [1, 'no live address is recorded for this install\n']);
  mkdirSync(join(work, '.claude'));
  writeFileSync(join(work, '.claude/.wong-stack.json'), JSON.stringify({ components: { memory: { accountId: 'a', databaseId: 'd', worker: `${WORKER}/_memory` } } }));
  const own = run('https://pr-1-app-staging.acct.workers.dev/');
  assert.deepEqual([own.status, own.stdout], [0, '']);
  const stranger = run('https://deploy-preview.attacker.example/');
  assert.deepEqual([stranger.status, stranger.stdout], [1, 'deploy-preview.attacker.example is not this install\'s own site\n']);
  assert.equal(run('').status, 1, 'an empty address is no address');
  assert.equal(spawnSync(process.execPath, [script], { cwd: work }).status, 2);
});
