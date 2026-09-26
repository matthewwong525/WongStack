import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  '.agents/skills/plan/scripts/build-review.mjs': [],
  '.agents/skills/save/scripts/checkpoint-evidence.mjs': [],
  '.agents/skills/save/scripts/render-pr-body.mjs': [],
  '.agents/skills/improve/scripts/survey.mjs': [],
  '.agents/skills/wong-sync/scripts/preflight.mjs': [],
  '.agents/skills/routine/scripts/routine.mjs': ['ls'],
  '.agents/skills/memory/scripts/memory.mjs': ['search'],
};

const run = (script, args) => spawnSync(process.execPath, [join(repo, script), ...args], { cwd: repo, encoding: 'utf8' });

for (const [script, prefix] of Object.entries(scripts)) {
  test(`${script}: --help prints usage and exits 0; an unknown flag exits 2`, () => {
    const help = run(script, ['--help']);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /usage/i);
    const unknown = run(script, [...prefix, '--no-such-flag']);
    assert.equal(unknown.status, 2, `${unknown.stdout}${unknown.stderr}`);
  });
}
