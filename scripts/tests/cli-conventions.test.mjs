import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Each script, and the arguments that reach its flag parser with an unknown flag.
const scripts = {
  'scripts/company-api.mjs': [],
  'scripts/employee-bootstrap.mjs': [],
  '.agents/skills/browser/scripts/connect-browser.mjs': [],
  '.agents/memory/operations.mjs': [],
  'scripts/measure-context.mjs': [],
  'scripts/check-openspec-config.mjs': [],
  'scripts/check-payload-links.mjs': [],
  'scripts/check-app-keys.mjs': [],
  '.agents/plugins/access/scripts/check-definitions.mjs': [],
  '.agents/plugins/access/scripts/services.mjs': [],
  'scripts/check-runtime-tests.mjs': [],
  'scripts/check-app-checks.mjs': [],
  'scripts/check-skill-actions.mjs': [],
  'scripts/check-attachments.mjs': [],
  'scripts/check-module-versions.mjs': [],
  'scripts/reset-staging-d1.mjs': [],
  'scripts/line-stand-in.mjs': [],
  'scripts/cf-secrets.mjs': [],
  'scripts/lib-wrangler-config.mjs': [],
  'scripts/tag-releases.mjs': [],
  'scripts/eval-verify.mjs': [],
  'scripts/verify-memory-areas.mjs': [],
  'scripts/verify-revision-chain.mjs': [],
  '.agents/skills/save/scripts/saved-revision.mjs': [],
  '.agents/skills/save/scripts/checkpoint.mjs': [],
  '.agents/skills/ship/scripts/ship.mjs': ['prepare'],
  'scripts/payload-checks.mjs': [],
  'scripts/measure-sessions.mjs': [],
  '.agents/skills/verify/scripts/verify-receipts.mjs': ['check'],
  '.agents/loop/staging/verify-journeys.mjs': ['check'],
  '.agents/loop/staging/own-site.mjs': [],
  '.agents/skills/memory/scripts/lib/primary-root.mjs': [],
  '.agents/skills/browser/scripts/lib/primary-root.mjs': [],
  '.github/scripts/loosened-checks.mjs': [],
  '.github/scripts/checks.mjs': [],
  '.agents/skills/plan/scripts/build-review.mjs': [],
  '.agents/skills/save/scripts/checkpoint-evidence.mjs': [],
  '.agents/skills/save/scripts/render-pr-body.mjs': [],
  '.agents/loop/other-work.mjs': [],
  '.agents/skills/continue/scripts/pickup.mjs': [],
  '.agents/loop/ask-check.mjs': ['stop'],
  '.agents/plugins/memory/skills/dream-memory/scripts/dream.mjs': ['since'],
  '.agents/skills/hand-over/scripts/hand-over.mjs': [],
  '.agents/skills/reply-link/scripts/reply-link.mjs': [],
  '.agents/skills/browser/scripts/browse.mjs': [],
  '.agents/skills/shop/scripts/shop.mjs': [],
  '.agents/skills/ship/scripts/number-release.mjs': [],
  '.agents/skills/wong-sync/scripts/preflight.mjs': [],
  '.agents/skills/wong-sync/scripts/merge-check.mjs': [],
  '.agents/skills/wong-sync/scripts/codex-plugin.mjs': [],
  '.agents/skills/wong-sync/scripts/install-path.mjs': [],
  '.agents/skills/wong-setup/scripts/provision.mjs': [],
  '.agents/skills/update-dependencies/scripts/update.mjs': [],
  '.agents/skills/schedule/scripts/schedule.mjs': ['ls'],
  '.agents/skills/schedule/scripts/tidy.mjs': ['sweep'],
  '.agents/skills/schedule/scripts/presets.mjs': ['add'],
  '.agents/skills/memory/scripts/memory.mjs': ['search'],
  '.agents/skills/memory/scripts/run.mjs': [],
  '.agents/skills/memory/scripts/session-start.mjs': [],
  '.agents/skills/memory/scripts/session-end.mjs': [],
  '.agents/skills/memory/scripts/topic-match.mjs': [],
  '.agents/loop/helper-stop-check.mjs': [],
  '.agents/skills/apply/scripts/preview-review.mjs': [],
  '.agents/skills/plan/scripts/prototype.mjs': ['start', 'demo'],
  '.agents/plugins/loop/scripts/slot.mjs': [],
  '.agents/plugins/loop/scripts/lib/primary-root.mjs': [],
};

// Run from an empty temp dir, with npx, wrangler, and gh stubs first on PATH that record any call
// and exit 97, so a parser that falls through to the main path reaches nothing live.
function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-cli-conventions-'));
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

// A script that prints isMain for itself and for the shared module it imports.
test('isMain is true through a symlinked path and false for an imported module', t => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-is-main-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cli = pathToFileURL(join(repo, '.agents/skills/memory/scripts/lib/cli.mjs')).href;
  const script = join(dir, 'probe.mjs');
  writeFileSync(script, `import { isMain } from '${cli}';\nconsole.log(JSON.stringify([isMain(import.meta.url), isMain('${cli}')]));\n`);
  symlinkSync(dir, join(dir, 'linked'));
  for (const path of [script, join(dir, 'linked', 'probe.mjs')]) {
    const result = spawnSync(process.execPath, [path], { encoding: 'utf8' });
    assert.deepEqual(JSON.parse(result.stdout), [true, false], `${path}: ${result.stderr}`);
  }
});

// The browser module keeps its own copies, so it imports nothing outside its folders; each must stay memory's.
test("the browser module's cli, primary-root, and env copies equal memory's", async () => {
  const lib = (skill, file) => import(pathToFileURL(join(repo, `.agents/skills/${skill}/scripts/lib/${file}`)).href);
  for (const file of ['cli.mjs', 'primary-root.mjs']) {
    const [mine, memory] = await Promise.all([lib('browser', file), lib('memory', file)]);
    assert.deepEqual(Object.keys(mine).sort(), Object.keys(memory).sort(), file);
    for (const name of Object.keys(memory)) assert.equal(String(mine[name]), String(memory[name]), `${file}: ${name}`);
  }
  const [env, store] = await Promise.all([lib('browser', 'env.mjs'), lib('memory', 'store.mjs')]);
  assert.deepEqual(Object.keys(env), ['parseEnv'], 'env.mjs');
  assert.equal(String(env.parseEnv), String(store.parseEnv), 'env.mjs: parseEnv');
});

// Both entry verbs send attached review notes to /plan's one section.
// Only the link is held: the wording is the skill's to change.
test('apply and ship link review-note handling', () => {
  for (const verb of ['apply', 'ship']) {
    const skill = readFileSync(join(repo, `.agents/skills/${verb}/SKILL.md`), 'utf8');
    assert.match(skill, /plan\/SKILL\.md#review-notes/);
  }
});

// The loop module keeps its own copies of memory's helpers, so it imports nothing outside its folder.
test('the loop module\'s helper copies match memory\'s', async () => {
  const load = path => import(pathToFileURL(join(repo, path)).href);
  const pairs = [['scripts/lib/cli.mjs', 'scripts/lib/cli.mjs', ['isMain', 'usageError', 'parseCli']],
    ['scripts/lib/primary-root.mjs', 'scripts/lib/primary-root.mjs', ['primaryRoot', 'PrimaryRootError']],
    ['scripts/lib/env.mjs', 'scripts/lib/store.mjs', ['parseEnv']]];
  for (const [copy, original, names] of pairs) {
    const [mine, theirs] = await Promise.all([load(`.agents/plugins/loop/${copy}`), load(`.agents/plugins/memory/${original}`)]);
    for (const name of names) assert.equal(String(mine[name]), String(theirs[name]), `${copy}: ${name}`);
  }
});
