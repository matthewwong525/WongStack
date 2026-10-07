import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { failureDigest, targetFiles } from '../check-target-app.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, 'scripts/check-target-app.mjs');
const INVENTORY = '.agents/skills/wong-sync/references/payload-files.json';

// ── Which files an install receives ──────────────────────────────────────────

test('an install receives the listed files, skill folders and whole folders, without what the inventory leaves out', () => {
  const manifest = {
    core: { skillDirs: ['save'], files: ['.claude/settings.json', 'wiki/voice.md', 'paseo.json'] },
    pack: { files: ['scripts/cf-build.sh'], dirs: ['wiki/stack'] },
    scaffold: { dirs: ['app'], exclude: ['app/wrangler.jsonc', 'app/src/apps/tips', 'app/worker/apps/sample'] },
    seededBySetup: { files: ['wiki/README.md'] },
  };
  const paths = [
    '.agents/skills/save/SKILL.md', '.agents/skills/save/scripts/checkpoint.mjs', '.agents/settings.json', 'paseo.json', 'wiki/voice.md',
    'scripts/cf-build.sh', 'wiki/stack/README.md', 'app/package.json', 'app/src/apps/hello/App.tsx', 'app/worker/apps/hello/api.ts',
    // Left out: an unlisted skill, a meta-only script and page, the seeded hub, and everything the scaffold excludes.
    '.agents/skills/sample-report/actions.json', '.agents/skills/saver/SKILL.md', 'scripts/check-target-app.mjs', 'wiki/maintaining/README.md', 'wiki/README.md',
    'app/wrangler.jsonc', 'app/src/apps/tips/App.tsx', 'app/src/apps/tips/tip.test.ts', 'app/worker/apps/sample/api.ts', 'CHANGELOG.md',
    // A folder that only starts with an excluded name is not excluded.
    'app/src/apps/tips-jar/App.tsx',
  ];
  assert.deepEqual(targetFiles(paths, manifest), [
    '.agents/skills/save/SKILL.md', '.agents/skills/save/scripts/checkpoint.mjs', '.agents/settings.json', 'paseo.json', 'wiki/voice.md',
    'scripts/cf-build.sh', 'wiki/stack/README.md', 'app/package.json', 'app/src/apps/hello/App.tsx', 'app/worker/apps/hello/api.ts', 'app/src/apps/tips-jar/App.tsx',
  ]);
  assert.deepEqual(targetFiles(paths, {}), []);
});

test('the real inventory leaves the sample apps, the sample skill and this check out of an install', () => {
  const manifest = JSON.parse(readFileSync(join(repo, INVENTORY), 'utf8'));
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);
  const received = targetFiles(tracked, manifest);
  for (const kept of ['app/package.json', 'app/worker/index.ts', 'app/worker/employee-access/seed.test.ts', 'app/src/apps/hello/App.tsx', 'scripts/cf-build.sh', 'schema/seed.sql', '.agents/skills/memory/worker/memory-worker.mjs']) {
    assert.ok(received.includes(kept), `${kept} did not reach the install`);
  }
  const left = received.filter(path => /^app\/(src|worker)\/apps\/(tips|sample)\/|sample-report|check-target-app|^app\/wrangler\.jsonc$|wong-setup/.test(path));
  assert.deepEqual(left, []);
});

test('a red run names its failed files, tests and type errors before the end of its output', () => {
  const filler = Array.from({ length: 200 }, (_, n) => ` ✓ worker/passing-${n}.test.ts`);
  const output = ['worker/index.test.ts(26,79): error TS2345: Property \'info\' is missing in type \'ArtifactsRepo\'', ...filler,
    ' FAIL  worker/employee-access/seed.test.ts > staging starts with practice people', ' × lists the sample skill', 'ERROR: Coverage for lines (99%) does not meet global threshold (100%)', 'Test Files  1 failed | 44 passed'].join('\n');
  const digest = failureDigest(output).split('\n');
  assert.deepEqual(digest.slice(0, 4), [output.split('\n')[0], ' FAIL  worker/employee-access/seed.test.ts > staging starts with practice people', ' × lists the sample skill', 'ERROR: Coverage for lines (99%) does not meet global threshold (100%)']);
  assert.equal(digest.at(-1), 'Test Files  1 failed | 44 passed');
  assert.ok(digest.length < 140, 'the passing tests around a failure are not all printed');
  // Output that names nothing prints its end alone, and many failures are counted, not all listed.
  assert.equal(failureDigest('npm error code ENOENT\n'), 'npm error code ENOENT');
  const many = failureDigest(Array.from({ length: 80 }, (_, n) => ` FAIL  worker/broken-${n}.test.ts`).join('\n'));
  assert.match(many, /^ {2}and 20 more$/m);
});

// ── A whole run, on a small stand-in repository ──────────────────────────────

// The stand-in app's `npm test`. It plays the type check (the declared binding must take the generated
// one) and the test runner (each test file is loaded), and notes what it could see.
const SUITE = `import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const types = readFileSync('worker-configuration.d.ts', 'utf8');
const code = readFileSync('worker/code.ts', 'utf8');
writeFileSync('seen.json', JSON.stringify({ cloudflare: Object.keys(process.env).filter(name => name.startsWith('CLOUDFLARE_')), config: existsSync('wrangler.jsonc') }));
if (/ARTIFACTS: Artifacts/.test(types) && /ARTIFACTS\\?: CodeBinding/.test(code)) {
  console.log("worker/code.ts(2,3): error TS2345: Property 'info' is missing in type 'ArtifactsRepo'");
  process.exit(2);
}
for (const file of readdirSync('worker').filter(name => name.endsWith('.test.mjs'))) {
  try {
    await import('./worker/' + file);
    console.log(' ✓ worker/' + file);
  } catch (error) {
    console.log(' FAIL  worker/' + file);
    console.log('Error: ' + error.message);
    process.exitCode = 1;
  }
}
`;
// A stand-in wrangler: `types` writes the binding types the config asks for, as the real one does.
const WRANGLER = `#!/usr/bin/env bash
[ "$1" = types ] || exit 1
[ -z "\${FAKE_WRANGLER_FAILS:-}" ] || { echo "wrangler: could not start workerd" >&2; exit 1; }
if grep -q '"binding": "ARTIFACTS"' wrangler.jsonc; then echo 'interface Env { DB: D1Database; ARTIFACTS: Artifacts; }' > worker-configuration.d.ts
else echo 'interface Env { DB: D1Database; }' > worker-configuration.d.ts; fi
`;
// npx, as the pack's scripts call it: the app's own installed tool.
const NPX = '#!/usr/bin/env bash\ntool=$1; shift\nexec "./node_modules/.bin/$tool" "$@"\n';
const COMMITTED_TYPES = 'interface Env { DB: D1Database; }\n';
const PACK = ['cf-build.sh', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs'];

/**
 * A repository shaped like this one: an app with a shipped Hello, a source-only extra folder the
 * inventory leaves out, the pack's real build scripts, and its packages installed. `files` adds or
 * replaces files; `installed: false` leaves the packages out.
 */
function fixture(t, { files = {}, installed = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-target-app-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, 'repo');
  const write = (path, text, mode) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
    if (mode) chmodSync(join(root, path), mode);
  };
  for (const name of PACK) {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    copyFileSync(join(repo, 'scripts', name), join(root, 'scripts', name));
  }
  for (const shared of ['cli.mjs', 'primary-root.mjs']) {
    const path = `.agents/skills/memory/scripts/lib/${shared}`;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(join(repo, path), join(root, path));
  }
  write(INVENTORY, JSON.stringify({
    core: { skillDirs: ['memory'] },
    pack: { files: PACK.map(name => `scripts/${name}`) },
    scaffold: { dirs: ['app'], exclude: ['app/wrangler.jsonc', 'app/extra'] },
  }));
  write('.gitignore', 'node_modules/\n.dev.vars\n');
  write('app/package.json', JSON.stringify({ scripts: { test: 'node run-tests.mjs' }, devDependencies: { typescript: '~7.0.2' } }));
  write('app/run-tests.mjs', SUITE);
  write('app/worker/code.ts', 'export interface CodeEnv {\n  ARTIFACTS?: unknown;\n}\n');
  write('app/worker/hello.test.mjs', "import { existsSync } from 'node:fs';\nif (!existsSync('worker/code.ts')) throw new Error('no code');\n");
  write('app/worker-configuration.d.ts', COMMITTED_TYPES);
  // What only the source repository has, or keeps for itself.
  write('app/wrangler.jsonc', '{ "name": "the-source-repo-own-worker" }\n');
  write('app/extra/sample.mjs', 'export const sample = 1;\n');
  write('app/extra/sample.test.mjs', "import './sample.mjs';\n");
  write('app/.dev.vars', 'SECRET=never-copied\n');
  write('scripts/check-target-app.mjs', '// meta-only\n');
  if (installed) {
    write('app/node_modules/.bin/wrangler', WRANGLER, 0o755);
    write('app/node_modules/a-package/index.js', 'module.exports = 1;\n');
    write('app/node_modules/.tmp/tsconfig.tsbuildinfo', '{"own":"source"}\n');
  }
  for (const [path, text] of Object.entries(files)) write(path, text);
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin/npx'), NPX);
  chmodSync(join(dir, 'bin/npx'), 0o755);
  mkdirSync(join(dir, 'tmp'));
  const env = { PATH: `${join(dir, 'bin')}:${process.env.PATH}`, HOME: dir, TMPDIR: join(dir, 'tmp'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    ...(process.env.NODE_V8_COVERAGE ? { NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE } : {}),
    // A credential in reach of the caller must never reach the install's tests.
    CLOUDFLARE_API_TOKEN: 'deploy-token-made-up', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32) };
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root, env });
  const run = (args = [], vars = {}) => {
    const result = spawnSync(process.execPath, [script, '--root', root, ...args], { cwd: dir, env: { ...env, ...vars }, encoding: 'utf8' });
    const out = `${result.stdout}${result.stderr}`;
    return { status: result.status, out, last: result.stdout.trimEnd().split('\n').at(-1), left: readdirSync(join(dir, 'tmp')).filter(name => name.startsWith('wong-target-app-')) };
  };
  return { root, run, read: path => readFileSync(join(root, path), 'utf8') };
}

test('an app that needs only what an install receives passes, built as an install kept in Cloudflare', t => {
  const f = fixture(t);
  const result = f.run(['--keep']);
  assert.equal(result.status, 0, result.out);
  assert.equal(result.last, 'TARGET_APP=pass');
  const kept = /^target app: kept at (.+)$/m.exec(result.out)?.[1];
  assert.ok(kept && existsSync(kept), result.out);
  t.after(() => rmSync(kept, { recursive: true, force: true }));
  const built = path => readFileSync(join(kept, path), 'utf8');
  // Only what an install receives: nothing excluded, ignored, or unlisted.
  for (const gone of ['app/extra', 'app/.dev.vars', 'scripts/check-target-app.mjs', '.gitignore']) assert.equal(existsSync(join(kept, gone)), false, `${gone} was copied`);
  for (const there of ['app/run-tests.mjs', 'app/worker/hello.test.mjs', 'scripts/cf-build.sh', '.agents/skills/memory/scripts/lib/cli.mjs']) assert.ok(existsSync(join(kept, there)), `${there} is missing`);
  // Laid out as an install: a real .agents folder, with the two links to it.
  for (const link of ['.claude', '.codex']) assert.ok(lstatSync(join(kept, link)).isSymbolicLink(), link);
  // The config is provisioning's own, for a project kept in Cloudflare: named, bound twice, and no real id.
  const config = built('app/wrangler.jsonc');
  assert.doesNotMatch(config, /the-source-repo-own-worker/);
  assert.match(config, /"name": "target-check"/);
  assert.equal(config.match(/"artifacts": \[\{ "binding": "ARTIFACTS", "namespace": "wongstack" \}\]/g)?.length, 2, 'production and staging both bind the repository');
  assert.equal(config.match(/"WONG_CODE_REPOSITORY": "target-check"/g)?.length, 2);
  // The types were regenerated from that config before the tests ran, in the copy alone.
  assert.match(built('app/worker-configuration.d.ts'), /ARTIFACTS: Artifacts/);
  assert.equal(f.read('app/worker-configuration.d.ts'), COMMITTED_TYPES, 'the source repository\'s committed types were rewritten');
  assert.equal(f.read('app/wrangler.jsonc'), '{ "name": "the-source-repo-own-worker" }\n');
  // The packages are linked, and a tool's cache is the copy's own.
  assert.ok(lstatSync(join(kept, 'app/node_modules/a-package')).isSymbolicLink());
  assert.ok(lstatSync(join(kept, 'app/node_modules/.bin')).isSymbolicLink());
  assert.equal(lstatSync(join(kept, 'app/node_modules')).isSymbolicLink(), false);
  assert.equal(existsSync(join(kept, 'app/node_modules/.tmp')), false);
  // The tests ran there, with no Cloudflare credential in reach.
  assert.deepEqual(JSON.parse(built('app/seen.json')), { cloudflare: [], config: true });
  // Without --keep, nothing is left behind.
  const again = f.run();
  assert.equal(again.status, 0, again.out);
  assert.deepEqual(again.left.filter(name => name !== kept.split('/').at(-1)), []);
});

test('a shipped test that needs a file that does not ship fails the check, named, though it passes in the source repository', t => {
  const f = fixture(t, { files: { 'app/worker/shipped.test.mjs': "import { sample } from '../extra/sample.mjs';\nif (sample !== 1) throw new Error('no sample');\n" } });
  // Here, where the excluded folder exists, the same suite passes.
  const here = spawnSync(process.execPath, ['run-tests.mjs'], { cwd: join(f.root, 'app'), encoding: 'utf8' });
  assert.equal(here.status, 0, here.stdout);
  rmSync(join(f.root, 'app/seen.json'));
  const result = f.run();
  assert.equal(result.status, 1, result.out);
  assert.equal(result.last, 'TARGET_APP=fail (tests)');
  assert.match(result.out, /^target app: tests FAILED$/m);
  assert.match(result.out, /^ FAIL {2}worker\/shipped\.test\.mjs$/m, 'the failing test is named');
  assert.match(result.out, /Cannot find module .*extra\/sample\.mjs/);
  assert.deepEqual(result.left, [], 'the temporary folder is removed after a failure too');
});

test('an app that does not compile once the project\'s repository is connected fails the check, though the source repository has no such connection', t => {
  const f = fixture(t, { files: { 'app/worker/code.ts': 'type CodeBinding = { get(name: string): unknown };\nexport interface CodeEnv {\n  ARTIFACTS?: CodeBinding;\n}\n' } });
  // Against the committed types, which know no such binding, it compiles.
  const here = spawnSync(process.execPath, ['run-tests.mjs'], { cwd: join(f.root, 'app'), encoding: 'utf8' });
  assert.equal(here.status, 0, here.stdout);
  const result = f.run();
  assert.equal(result.status, 1, result.out);
  assert.equal(result.last, 'TARGET_APP=fail (tests)');
  assert.match(result.out, /^worker\/code\.ts\(2,3\): error TS2345: Property 'info' is missing in type 'ArtifactsRepo'$/m);
  assert.deepEqual(result.left, []);
});

test('types that can not be regenerated fail the check before any test runs: stale types would hide the fault', t => {
  const f = fixture(t);
  const result = f.run([], { FAKE_WRANGLER_FAILS: '1' });
  assert.equal(result.status, 1, result.out);
  assert.equal(result.last, 'TARGET_APP=fail (types)');
  assert.match(result.out, /binding types were not regenerated/);
  assert.match(result.out, /could not start workerd/);
  assert.deepEqual(result.left, []);
});

test('with the app\'s packages not installed the check says it did not run, and builds nothing', t => {
  const f = fixture(t, { installed: false });
  const result = f.run();
  assert.equal(result.status, 7, result.out);
  assert.equal(result.last, 'TARGET_APP=not run (app/node_modules is missing; install the app\'s packages first)');
  assert.deepEqual(result.left, []);
});

test('the check ships to no install, and the shared checks run it by the name it has', () => {
  assert.doesNotMatch(readFileSync(join(repo, INVENTORY), 'utf8'), /check-target-app/);
  const checks = readFileSync(join(repo, '.github/scripts/checks.mjs'), 'utf8');
  assert.match(checks, /const TARGET_SCRIPT = 'scripts\/check-target-app\.mjs';/);
  assert.match(checks, new RegExp(`const INVENTORY = '${INVENTORY.replaceAll('.', '\\.')}';`));
});
