// Access's chat start: one ask when the slots file is missing, quiet on a resume and once the file is there.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ASK, SLOTS_FILE, startLine } from '../../.agents/plugins/access/scripts/session-start.mjs';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agents/plugins/access/scripts/session-start.mjs');
const root = mkdtempSync(join(tmpdir(), 'wong-test-access-start-'));
after(() => rmSync(root, { recursive: true, force: true }));
execFileSync('git', ['init', '-q', root]);
const inner = join(root, 'app/src');
mkdirSync(inner, { recursive: true });
const run = input => spawnSync(process.execPath, [script], { cwd: inner, input, encoding: 'utf8' });

test('a new chat with no slots file asks once, from any folder in the repo', () => {
  const started = run(JSON.stringify({ source: 'startup', cwd: inner }));
  assert.equal(started.status, 0);
  assert.equal(started.stdout, `${ASK}\n`);
  assert.match(ASK, /Access isn't set up yet\. Set it up now\?/);
});

test('a resumed chat is quiet, and bad input still ends the hook', () => {
  assert.equal(run(JSON.stringify({ source: 'resume', cwd: inner })).stdout, '');
  const broken = run('not json');
  assert.equal(broken.status, 0);
  assert.equal(broken.stdout, `${ASK}\n`);
});

test('once the slots file is there, nothing prints', () => {
  mkdirSync(join(root, dirname(SLOTS_FILE)), { recursive: true });
  writeFileSync(join(root, SLOTS_FILE), '{}');
  assert.equal(startLine({ cwd: inner }), '');
  assert.equal(run('{}').stdout, '');
});
