// The loop's profile runs Daily's and the browser's scripts by path: each path it runs must name a real file.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import profile from '../../.agents/loop/profile.mjs';

const root = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

/** Runs `part` with a stand-in `node` first on PATH, and returns each script path it was given. */
function scriptsRun(t, part) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-loop-profile-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = join(dir, 'ran.txt');
  writeFileSync(join(dir, 'node'), `#!/bin/sh\nprintf '%s\\n' "$1" >> '${log}'\n`);
  chmodSync(join(dir, 'node'), 0o755);
  const path = process.env.PATH;
  process.env.PATH = `${dir}:${path}`;
  try { part(); } finally { process.env.PATH = path; }
  return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
}

for (const [name, part] of [
  ['closeWorkspace', () => profile.closeWorkspace({ root, args: [] })],
  ['newWorkspace open', () => profile.newWorkspace({ root, args: ['open', 'a task'] })],
  ['newWorkspace scratch', () => profile.newWorkspace({ root, args: ['scratch'] })],
]) {
  test(`${name} runs only scripts that exist`, t => {
    const ran = scriptsRun(t, part);
    assert.ok(ran.length > 0, 'it runs a script');
    for (const file of ran) assert.ok(existsSync(file), `${file} exists`);
  });
}
