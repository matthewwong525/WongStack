// The Codex plugin step, .agents/skills/wong-sync/scripts/codex-plugin.mjs, run with a fake `codex` on PATH, and the
// line memory's own session start prints when Codex's copy is older than the repo's.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { pluginLines } from '../../.agents/plugins/memory/scripts/session-start.mjs';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/wong-sync/scripts/codex-plugin.mjs');

// A folder for PATH, with a `codex` that logs its arguments and fails on `fail` when one is given.
function bin(t, fail) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-codex-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fake = `#!/bin/sh\necho "$*" >> "${dir}/log"\n${fail ? `case "$*" in *${fail}*) echo "no such shop" >&2; exit 1;; esac\n` : ''}`;
  writeFileSync(join(dir, 'codex'), fake);
  chmodSync(join(dir, 'codex'), 0o755);
  return dir;
}

const run = (path, root = '/repo', ...args) => spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8', env: { ...process.env, PATH: path } });
const log = dir => readFileSync(join(dir, 'log'), 'utf8');

test('with Codex present, it adds the repo shop, then the memory plugin', (t) => {
  const dir = bin(t);
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Codex has memory@wongstack.\n');
  assert.equal(log(dir), 'plugin marketplace add /repo\nplugin add memory@wongstack\n');
});

test('a failed command prints one line with its cause, stops there, and exits 0', (t) => {
  const dir = bin(t, 'marketplace');
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Codex did not install memory@wongstack: `codex plugin marketplace add /repo` failed (no such shop).\n');
  assert.equal(log(dir), 'plugin marketplace add /repo\n');
});

test('with no Codex, it prints one line and exits 0', () => {
  const result = run(join(tmpdir(), 'wong-test-no-codex'));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Codex is not on this computer: no Codex plugin to install.\n');
});

// A repo whose root plugin list is named `name`, with memory's skill folder at `version`.
function repo(t, name, version) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-codex-repo-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.claude-plugin'));
  writeFileSync(join(root, '.claude-plugin/marketplace.json'), JSON.stringify({ name, plugins: [{ name: 'memory', source: './.agents/skills/memory' }] }));
  mkdirSync(join(root, '.agents/skills/memory/.codex-plugin'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/memory/.codex-plugin/plugin.json'), JSON.stringify({ name: 'memory', version }));
  return root;
}

test("it installs by the name of the repo's own plugin list", (t) => {
  const dir = bin(t);
  const root = repo(t, 'relay', '1.0.0');
  assert.equal(run(dir, root).stdout, 'Codex has memory@relay.\n');
  assert.equal(log(dir), `plugin marketplace add ${root}\nplugin add memory@relay\n`);
});

test('--check names the command only when Codex has no memory plugin, and installs nothing', (t) => {
  const dir = bin(t);
  const root = repo(t, 'wongstack', '1.0.0');
  const check = () => spawnSync(process.execPath, [SCRIPT, '--root', root, '--check'], { encoding: 'utf8', env: { ...process.env, PATH: dir, CODEX_HOME: dir } });
  assert.match(check().stdout, /^Memory: Codex has no memory@wongstack plugin .*codex-plugin\.mjs`\.\n$/);
  writeFileSync(join(dir, 'config.toml'), '[plugins."memory@wongstack"]\nenabled = true\n');
  assert.equal(check().stdout, '');
  assert.throws(() => log(dir), /ENOENT/, 'no codex command ran');
});

test("Codex's copy older than the repo's skill folder names the update commands; anything else prints nothing", (t) => {
  const root = repo(t, 'relay', '1.1.0');
  const copy = join(repo(t, 'relay', '1.0.0'), '.agents/skills/memory');
  const ctx = { root, primaryRoot: root };
  assert.deepEqual(pluginLines(ctx, 'codex', { plugin: copy }), [
    `Memory: this computer's Codex copy of memory is older than this checkout's; run \`codex plugin marketplace add ${root}\` and \`codex plugin add memory@relay\`.`,
  ]);
  assert.deepEqual(pluginLines(ctx, 'claude', { plugin: copy }), []);
  assert.deepEqual(pluginLines(ctx, 'codex', { plugin: join(root, '.agents/skills/memory') }), []);
  assert.deepEqual(pluginLines({ root: copy, primaryRoot: copy }, 'codex', { plugin: copy }), [], 'a repo with no memory folder');
});
