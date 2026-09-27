// Test harness for the pack scripts: a throwaway repo with the scripts under
// test, a wrangler config, and fake tools that log their calls.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

// A fake tool that logs "<prefix><args>" to $FAKE_LOG and does nothing else.
export const logger = (prefix = '') => `#!/usr/bin/env bash\necho "${prefix}$*" >> "$FAKE_LOG"\n`;

// Builds the repo and removes it when the test ends.
//   scripts  names under scripts/ to copy from this repo
//   config   text for app/wrangler.jsonc; omit to leave it out (app/ still exists)
//   tools    { name: script } fake executables on PATH; each logs to $FAKE_LOG
//   subdir   put the repo in a folder of the temp dir, beside bin/ (for a sibling worktree)
// Returns { dir, root, write, run }.
export function pack(t, { scripts = [], config, tools = {}, subdir, prefix = 'pack-' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = subdir ? join(dir, subdir) : dir;
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };

  mkdirSync(join(root, 'scripts'), { recursive: true });
  for (const name of scripts) copyFileSync(join(REPO, 'scripts', name), join(root, 'scripts', name));
  // cf-secrets.mjs finds the primary worktree through the memory skill's shared lookup.
  const lookup = '.claude/skills/memory/scripts/lib/primary-root.mjs';
  mkdirSync(dirname(join(root, lookup)), { recursive: true });
  copyFileSync(join(REPO, lookup), join(root, lookup));
  mkdirSync(join(root, 'app'));
  if (config != null) write('app/wrangler.jsonc', config);

  const bin = join(dir, 'bin');
  mkdirSync(bin);
  for (const [tool, text] of Object.entries(tools)) {
    writeFileSync(join(bin, tool), text);
    chmodSync(join(bin, tool), 0o755);
  }
  const log = join(dir, 'calls.log');

  // Runs scripts/<script> (node for .mjs, else bash) from `cwd`, the repo root
  // by default. `env` adds to or, with `undefined`, removes from a minimal
  // environment. Returns the exit status, output, and the logged calls, which
  // it then clears.
  const run = (script, args = [], { env = {}, cwd = root } = {}) => {
    const vars = {
      PATH: `${bin}:${process.env.PATH}`,
      HOME: dir,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      FAKE_ROOT: root,
      FAKE_LOG: log,
      ...env,
    };
    for (const key of Object.keys(vars)) if (vars[key] === undefined) delete vars[key];
    const command = script.endsWith('.mjs') ? process.execPath : 'bash';
    const result = spawnSync(command, [join(cwd, 'scripts', script), ...args], { cwd, encoding: 'utf8', env: vars });
    assert.equal(result.error, undefined, `${command} failed to start: ${result.error}`);
    const calls = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
    rmSync(log, { force: true });
    return { status: result.status, out: `${result.stdout}${result.stderr}`, stderr: result.stderr, calls };
  };

  return { dir, root, write, run };
}
