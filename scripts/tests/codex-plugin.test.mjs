// The Codex step, .agents/skills/wong-sync/scripts/codex-plugin.mjs, run with a stand-in `codex` on PATH and a stand-in
// Codex config: it removes the module plugins an older WongStack added.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/wong-sync/scripts/codex-plugin.mjs');

const temp = (t, name) => {
  const dir = mkdtempSync(join(tmpdir(), `wong-test-codex-${name}-`));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

// A folder for PATH and CODEX_HOME, with a `codex` that logs its arguments and fails on `fail` when one is given.
function codexHome(t, config, fail) {
  const dir = temp(t, 'home');
  const fake = `#!/bin/sh\necho "$*" >> "${dir}/log"\n${fail ? `case "$*" in *${fail}*) echo "no such plugin" >&2; exit 1;; esac\n` : ''}`;
  writeFileSync(join(dir, 'codex'), fake);
  chmodSync(join(dir, 'codex'), 0o755);
  writeFileSync(join(dir, 'config.toml'), config);
  return dir;
}

// A checkout with memory and Daily in its skills folder, as a module holds them.
function checkout(t) {
  const root = temp(t, 'repo');
  mkdirSync(join(root, '.claude/skills/memory'), { recursive: true });
  writeFileSync(join(root, '.claude/skills/memory/VERSION'), '5.0.0\n');
  mkdirSync(join(root, '.claude/skills/daily/hooks'), { recursive: true });
  writeFileSync(join(root, '.claude/skills/daily/hooks/codex.json'), '{}\n');
  mkdirSync(join(root, '.claude/skills/plan'));
  return root;
}

const config = root => [
  '[projects."/root"]', 'trust_level = "trusted"', '',
  '[marketplaces.wongstack]', 'source_type = "local"', `source = "${root}"`, '',
  '[marketplaces.other]', 'source_type = "local"', 'source = "/elsewhere"', '',
  '[plugins."memory@wongstack"]', 'enabled = true', '',
  '[plugins."daily@wongstack"]', 'enabled = true', '',
  '[plugins."plan@other"]', 'enabled = true', '',
].join('\n');

const run = (home, root, ...args) => spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8', env: { ...process.env, PATH: home, CODEX_HOME: home } });
const log = dir => readFileSync(join(dir, 'log'), 'utf8');

test('it removes each module plugin, then the plugin list at this checkout, and leaves the rest', t => {
  const root = checkout(t);
  const home = codexHome(t, config(root));
  const result = run(home, root);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "Codex no longer has memory@wongstack, daily@wongstack and the wongstack plugin list; the project's hooks run each module.\n");
  assert.equal(log(home), 'plugin remove memory@wongstack\nplugin remove daily@wongstack\nplugin marketplace remove wongstack\n');
});

test('with nothing to remove, it runs no codex command and prints one line', t => {
  const root = checkout(t);
  const home = codexHome(t, '[plugins."plan@other"]\nenabled = true\n');
  assert.equal(run(home, root).stdout, 'Codex has no WongStack module plugin on this computer.\n');
  assert.throws(() => log(home), /ENOENT/);
});

test('a failed command prints one line with its cause, stops there, and exits 0', t => {
  const root = checkout(t);
  const home = codexHome(t, config(root), 'daily');
  const result = run(home, root);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Codex did not remove daily@wongstack: `codex plugin remove daily@wongstack` failed (no such plugin).\n');
  assert.equal(log(home), 'plugin remove memory@wongstack\nplugin remove daily@wongstack\n');
});

test('with no Codex on the computer, it prints one line and exits 0', t => {
  const root = checkout(t);
  const home = codexHome(t, config(root));
  rmSync(join(home, 'codex'));
  const result = run(home, root);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Codex is not on this computer: no Codex plugin to remove.\n');
});

test('--check names the command only while Codex has a module plugin, and removes nothing', t => {
  const root = checkout(t);
  const home = codexHome(t, config(root));
  assert.match(run(home, root, '--check').stdout, /^Codex still has the memory@wongstack and daily@wongstack plugin .*codex-plugin\.mjs`\.\n$/);
  writeFileSync(join(home, 'config.toml'), '[plugins."plan@other"]\nenabled = true\n');
  assert.equal(run(home, root, '--check').stdout, '');
  assert.throws(() => log(home), /ENOENT/, 'no codex command ran');
});

test("it keeps another vendor's plugin named like a module, and removes one from the repo's own list", t => {
  const root = checkout(t);
  mkdirSync(join(root, '.claude/skills/browser'));
  writeFileSync(join(root, '.claude/skills/browser/VERSION'), '2.0.0\n');
  const home = codexHome(t, [
    '[marketplaces.acme]', 'source_type = "local"', 'source = "/elsewhere"', '',
    '[marketplaces."my-tools"]', 'source_type = "local"', `source = "${root}"`, '',
    '[plugins."browser@acme"]', 'enabled = true', '',
    '[plugins."memory@my-tools"]', 'enabled = true', '',
  ].join('\n'));
  assert.equal(run(home, root).stdout, "Codex no longer has memory@my-tools and the my-tools plugin list; the project's hooks run each module.\n");
  assert.equal(log(home), 'plugin remove memory@my-tools\nplugin marketplace remove my-tools\n');
  writeFileSync(join(home, 'config.toml'), '[marketplaces.acme]\nsource = "/elsewhere"\n\n[plugins."browser@acme"]\nenabled = true\n');
  assert.equal(run(home, root, '--check').stdout, '', 'no false warning for browser@acme');
});
