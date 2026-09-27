import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Each script, and the arguments that reach its flag parser with an unknown flag.
const scripts = {
  'scripts/measure-usage.mjs': [],
  'scripts/measure-context.mjs': [],
  'scripts/check-openspec-config.mjs': [],
  'scripts/check-payload-links.mjs': [],
  'scripts/reset-staging-d1.mjs': [],
  'scripts/cf-secrets.mjs': [],
  'scripts/mini-dashboard.mjs': [],
  'scripts/lib-wrangler-config.mjs': [],
  'scripts/tag-releases.mjs': [],
  '.agents/skills/memory/scripts/lib/primary-root.mjs': [],
  '.github/scripts/loosened-checks.mjs': [],
  '.agents/skills/plan/scripts/build-review.mjs': [],
  '.agents/skills/save/scripts/checkpoint-evidence.mjs': [],
  '.agents/skills/save/scripts/render-pr-body.mjs': [],
  '.agents/skills/improve/scripts/survey.mjs': [],
  '.agents/skills/wong-sync/scripts/preflight.mjs': [],
  '.agents/skills/routine/scripts/routine.mjs': ['ls'],
  '.agents/skills/memory/scripts/memory.mjs': ['search'],
};

// Run from an empty temp dir, with npx, wrangler, and gh stubs first on PATH that record any call
// and exit 97, so a parser that falls through to the main path reaches nothing live.
function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cli-conventions-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  const marker = join(dir, 'called');
  for (const tool of ['npx', 'wrangler', 'gh']) {
    writeFileSync(join(bin, tool), `#!/bin/sh\necho "${tool} $*" >> "${marker}"\nexit 97\n`);
    chmodSync(join(bin, tool), 0o755);
  }
  const run = (script, args) => spawnSync(process.execPath, [join(repo, script), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  const called = () => existsSync(marker) ? readFileSync(marker, 'utf8') : '';
  return { run, called };
}

for (const [script, prefix] of Object.entries(scripts)) {
  test(`${script}: --help prints usage and exits 0; an unknown flag exits 2`, t => {
    const { run, called } = sandbox(t);
    const help = run(script, ['--help']);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /usage/i);
    const unknown = run(script, [...prefix, '--no-such-flag']);
    assert.equal(unknown.status, 2, `${unknown.stdout}${unknown.stderr}`);
    assert.equal(called(), '', 'a live tool was called');
  });
}
