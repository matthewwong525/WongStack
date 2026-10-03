import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locateSuite, run } from '../../.github/scripts/checks.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.github/scripts/checks.mjs');
const read = path => readFileSync(join(repo, path), 'utf8');
const BASE = 'b'.repeat(40);

// What a step is, whatever folder it runs in.
function label(file, args) {
  const line = [file, ...args].join(' ');
  for (const [name, mark] of [['scope', 'app-untouched.sh'], ['loosened', 'loosened-checks.mjs'], ['wiki', 'wiki-links.mjs'], ['app-dir', 'cf-build.sh'], ['parity', 'cf-secrets.mjs']]) {
    if (line.includes(mark)) return name;
  }
  return file === 'npx' ? 'types' : line;
}

// A repo folder and a pretend runner: every step is recorded and answers with
// the status and stdout the test gives it. Nothing real runs.
function harness(t, { files = {}, scope = {}, status = {}, stdout = {}, env = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-checks-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const summaryFile = join(root, 'summary.md');
  const answers = { untouched: 'false', base: BASE, docs_only: 'false', wiki_affected: 'true', ...scope };
  const calls = [];
  let printed = '';
  const exec = (file, args, options) => {
    const name = label(file, args);
    calls.push({ name, args, ...options });
    if (name === 'scope' && !(name in status)) return { status: 0, stdout: Object.entries(answers).map(([key, value]) => `${key}=${value}\n`).join('') };
    return { status: status[name] ?? 0, stdout: stdout[name] ?? (name === 'app-dir' ? `${join(root, 'app')}\n` : '') };
  };
  const go = (verbs, { plan = false } = {}) => run({ verbs, plan, root, env: { GITHUB_EVENT_NAME: 'push', GITHUB_STEP_SUMMARY: summaryFile, ...env }, exec, out: text => { printed += text; } });
  return {
    root, calls, go,
    names: () => calls.map(call => call.name),
    printed: () => printed,
    summary: () => existsSync(summaryFile) ? readFileSync(summaryFile, 'utf8') : '',
  };
}

const SUITE = { 'app/package.json': JSON.stringify({ scripts: { test: 'vitest run', 'build:app': 'vite build' }, devDependencies: { typescript: '1' } }) };
const INSTALL = 'npm ci --no-audit --no-fund';

test('a repo with no test script runs no suite, says so, and still runs the other checks', t => {
  const h = harness(t, { files: { 'package.json': '{"scripts":{"build":"x"}}', 'app/package.json': '{}' } });
  assert.equal(h.go(['test']), 0);
  assert.deepEqual(h.names(), ['scope', 'loosened', 'wiki']);
  assert.match(h.summary(), /^### No test suite yet\n/);
  assert.match(h.summary(), /The main app changed, but no test suite is declared\.\n$/);
  assert.match(h.printed(), /No test script declared — nothing to run\./);
});

test('the suite is found at the root first, then one folder down, never in node_modules or a dot folder', t => {
  const withTest = '{"scripts":{"test":"x"}}';
  const h = harness(t, { files: { 'node_modules/pkg/package.json': withTest, '.hidden/package.json': withTest, 'web/package.json': withTest, 'api/package.json': withTest, 'broken/package.json': '{' } });
  assert.equal(locateSuite(h.root), join(h.root, 'api'));
  writeFileSync(join(h.root, 'package.json'), withTest);
  assert.equal(locateSuite(h.root), h.root);
  assert.equal(locateSuite(mkdtempSync(join(h.root, 'empty-'))), '');
});

test('a docs-only change skips the suite and the build, and keeps the checks that read docs', t => {
  const h = harness(t, { files: SUITE, scope: { untouched: 'true', docs_only: 'true' } });
  assert.equal(h.go(['test']), 0);
  assert.deepEqual(h.names(), ['scope', 'loosened', 'wiki']);
  assert.equal(h.summary(), 'The main app is untouched (only docs changed), so its suite did not run.\n');

  const build = harness(t, { files: SUITE, scope: { untouched: 'true' } });
  assert.equal(build.go(['build']), 0);
  assert.deepEqual(build.names(), ['scope']);
  assert.equal(build.summary(), 'The main app is untouched (only docs changed), so no main-app migration, build, or deploy ran.\n');
});

test('the wiki check skips only when no page or linked file changed', t => {
  const h = harness(t, { files: SUITE, scope: { wiki_affected: 'false' } });
  assert.equal(h.go(['test']), 0);
  assert.deepEqual(h.names(), ['scope', INSTALL, 'npm test', 'loosened']);
  assert.equal(h.summary(), 'The main app changed, so its suite ran: success. The wiki check skipped, because no page or linked file changed.\n');
});

test('a caller that needs every commit built gets a build of a docs-only change', t => {
  const h = harness(t, { files: SUITE, scope: { untouched: 'true' }, env: { CHECKS_BUILD: 'always' } });
  assert.equal(h.go(['test', 'build']), 0);
  assert.deepEqual(h.names(), ['scope', 'loosened', 'wiki', 'app-dir', INSTALL, 'parity', 'types', 'npm run build:app']);
});

test('a failing step gives its own exit code, and the checks after a red suite still run', t => {
  const red = harness(t, { files: SUITE, status: { 'npm test': 7, loosened: 1 }, stdout: { loosened: '### Loosened checks\n' } });
  assert.equal(red.go(['test', 'build']), 7, 'the first failure is the exit code');
  assert.deepEqual(red.names(), ['scope', INSTALL, 'npm test', 'loosened', 'wiki'], 'a failed verb starts no build');
  assert.equal(red.summary(), '### Loosened checks\nThe main app changed, so its suite ran: failure. A check was loosened with no written reason; see Loosened checks above.\n');

  const install = harness(t, { files: SUITE, status: { [INSTALL]: 5 } });
  assert.equal(install.go(['test']), 5);
  assert.deepEqual(install.names(), ['scope', INSTALL, 'loosened', 'wiki']);
  assert.match(install.summary(), /its suite ran: skipped\./);

  const wiki = harness(t, { files: SUITE, status: { wiki: 1 }, stdout: { wiki: '### Wiki checks\n' } });
  assert.equal(wiki.go(['test']), 1);
  assert.match(wiki.summary(), /^### Wiki checks\nThe main app changed, so its suite ran: success\. A wiki page has a broken link/);
  assert.match(wiki.printed(), /### Wiki checks/);
});

test('the comparison base comes from the environment and reaches the loosened-checks step', t => {
  const hosted = harness(t, { files: SUITE, env: { GITHUB_EVENT_NAME: '', CHECKS_BASE: BASE } });
  assert.equal(hosted.go(['test']), 0);
  const scope = hosted.calls.find(call => call.name === 'scope');
  assert.equal(scope.env.CHECKS_BASE, BASE);
  assert.equal(scope.env.GITHUB_EVENT_NAME, '', 'a named base needs no pretend event');
  assert.deepEqual(hosted.calls.find(call => call.name === 'loosened').args.slice(-2), ['--base', BASE]);

  const github = harness(t, { files: SUITE, env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main', BEFORE_SHA: 'c'.repeat(40) } });
  github.go(['test']);
  const passed = github.calls.find(call => call.name === 'scope').env;
  assert.deepEqual([passed.GITHUB_EVENT_NAME, passed.GITHUB_BASE_REF, passed.BEFORE_SHA], ['pull_request', 'main', 'c'.repeat(40)]);

  const bare = harness(t, { files: SUITE, env: { GITHUB_EVENT_NAME: '' } });
  bare.go(['test']);
  const assumed = bare.calls.find(call => call.name === 'scope').env;
  assert.deepEqual([assumed.GITHUB_EVENT_NAME, assumed.GITHUB_REF_NAME], ['push', ''], 'with no base named, the branch is compared with the default branch');
});

test('a scope answer that can not be read assumes the main app changed', t => {
  const h = harness(t, { files: SUITE, status: { scope: 1 } });
  assert.equal(h.go(['test']), 0);
  assert.deepEqual(h.names(), ['scope', INSTALL, 'npm test', 'loosened', 'wiki']);
  assert.deepEqual(h.calls.find(call => call.name === 'loosened').args.slice(-2), ['--base', '']);
});

test('an app with no wrangler config builds nothing, says so, and passes', t => {
  const h = harness(t, { files: SUITE, status: { 'app-dir': 3 } });
  assert.equal(h.go(['build']), 0);
  assert.deepEqual(h.names(), ['scope', 'app-dir']);
  assert.match(h.summary(), /^### Not configured yet\n/);
  assert.match(h.printed(), /No wrangler config yet — run \/wong-sync to plan Cloudflare provisioning\./);

  const broken = harness(t, { files: SUITE, status: { 'app-dir': 1 } });
  assert.equal(broken.go(['build']), 1, 'any other exit is a real error');
  assert.equal(broken.summary(), '');
});

test('the build is credential-free: binding types and build:app, with CLOUDFLARE_ENV on the build alone', t => {
  const h = harness(t, { files: SUITE, env: { CLOUDFLARE_ENV: 'staging' }, status: { types: 1 } });
  assert.equal(h.go(['test', 'build']), 0, 'failed binding types only warn');
  assert.deepEqual(h.names(), ['scope', INSTALL, 'npm test', 'loosened', 'wiki', 'scope', 'app-dir', 'parity', 'types', 'npm run build:app'], 'one install serves both verbs');
  for (const call of h.calls) assert.equal(call.env.CLOUDFLARE_ENV, call.name === 'npm run build:app' ? 'staging' : undefined, call.name);
  assert.equal(h.calls.at(-1).cwd, join(h.root, 'app'));
  assert.equal(h.names().some(name => /migrat|deploy|--remote/.test(name)), false);

  const unwired = harness(t, { files: { 'app/package.json': '{"scripts":{"build":"vite build"}}' } });
  assert.equal(unwired.go(['build']), 0);
  assert.deepEqual(unwired.names(), ['scope', 'app-dir', INSTALL, 'parity', 'npm run build']);

  const red = harness(t, { files: SUITE, status: { parity: 4, 'npm run build:app': 9 } });
  assert.equal(red.go(['build']), 4);
  assert.ok(red.names().includes('npm run build:app'), 'drift is reported even when the build is what breaks');
});

test('with a deploy token the build is left to the caller, after its migration', t => {
  const h = harness(t, { files: SUITE, env: { CLOUDFLARE_API_TOKEN: 'deploy-token' } });
  assert.equal(h.go(['build']), 0);
  assert.deepEqual(h.names(), ['scope', 'app-dir', INSTALL, 'parity']);
  const failing = harness(t, { files: SUITE, env: { CLOUDFLARE_API_TOKEN: 'deploy-token' }, status: { parity: 1 } });
  assert.equal(failing.go(['build']), 1);
});

test('--plan runs nothing and prints where the suite or app is', t => {
  const h = harness(t, { files: SUITE });
  assert.equal(h.go(['test'], { plan: true }), 0);
  assert.equal(h.printed(), `untouched=false\nfound=true\ndir=${join(h.root, 'app')}\n`);
  assert.deepEqual(h.names(), ['scope']);
  assert.equal(h.summary(), '');

  const build = harness(t, { files: SUITE });
  assert.equal(build.go(['build'], { plan: true }), 0);
  assert.equal(build.printed(), `untouched=false\nconfigured=true\ndir=${join(build.root, 'app')}\n`);
  assert.deepEqual(build.names(), ['scope', 'app-dir']);

  for (const options of [{ scope: { untouched: 'true' } }, { status: { 'app-dir': 3 } }]) {
    const skipped = harness(t, { files: SUITE, ...options });
    assert.equal(skipped.go(['build'], { plan: true }), 0);
    assert.match(skipped.printed(), /^configured=false$/m);
    assert.equal(skipped.summary(), '');
  }
  const untouched = harness(t, { files: SUITE, scope: { untouched: 'true' } });
  untouched.go(['test'], { plan: true });
  assert.equal(untouched.printed(), 'untouched=true\nfound=false\ndir=\n');
});

test('the command line takes one or both verbs, once each, and one verb with --plan', () => {
  const cli = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_STEP_SUMMARY: '', CHECKS_BASE: '', CHECKS_BUILD: 'always' } });
  for (const args of [[], ['lint'], ['test', 'test'], ['test', 'build', '--plan']]) assert.equal(cli(args).status, 2, args.join(' '));
  // The real scripts, in this repo: where its app is, and nothing run.
  const plan = cli(['build', '--plan']);
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /^untouched=false\nconfigured=(true\ndir=.+|false\ndir=)\n$/);
});

// One list, two callers: a check command named anywhere but the entry point is a second list.
test('neither workflow nor the hosted runner names a check command of its own', () => {
  const OWNED = [/\bnpm\s+(ci|install|test|run)\b/, /\bnpx\b/, /\bvitest\b/, /\bwrangler\s+types\b/, /app-untouched/, /loosened-checks/, /wiki-links/, /cf-secrets/, /change-scope/, /build:app/];
  const callers = {
    '.github/workflows/test.yml': ['node .github/scripts/checks.mjs test'],
    '.github/workflows/deploy.yml': ['node .github/scripts/checks.mjs build'],
    'server/hosted/pipeline.mjs': ["const CHECKS = '.github/scripts/checks.mjs';", 'node ${CHECKS} test build'],
  };
  for (const [path, calls] of Object.entries(callers)) {
    // Comments explain; only what runs can be a second list.
    const live = read(path).split('\n').filter(line => !/^\s*(#|\/\/)/.test(line)).join('\n');
    for (const call of calls) assert.ok(live.includes(call), `${path} must call the shared entry point: ${call}`);
    for (const pattern of OWNED) assert.doesNotMatch(live, pattern, `${path} names a check of its own`);
  }
  // What only the workflow can do stays: the token-holding migrate and deploy steps.
  const deploy = read('.github/workflows/deploy.yml');
  assert.match(deploy, /run: bash scripts\/cf-build\.sh\n/);
  assert.match(deploy, /run: bash scripts\/cf-deploy\.sh\n/);
});


test('both callers use the normal Knip parser without dropping any check or caller build input', t => {
  for (const event of ['pull_request', '']) {
    const h = harness(t, { files: SUITE, env: { GITHUB_EVENT_NAME: event, CHECKS_BASE: BASE, CLOUDFLARE_ENV: 'staging', KNIP_DISABLE_RAW_TRANSFER: '0' } });
    assert.equal(h.go(['test', 'build']), 0);
    assert.deepEqual(h.names(), ['scope', INSTALL, 'npm test', 'loosened', 'wiki', 'scope', 'app-dir', 'parity', 'types', 'npm run build:app']);
    for (const call of h.calls) {
      assert.equal(call.env.KNIP_DISABLE_RAW_TRANSFER, '1', call.name);
      assert.equal(call.env.CLOUDFLARE_ENV, call.name === 'npm run build:app' ? 'staging' : undefined);
    }
    assert.equal(h.calls.find(call => call.name === 'loosened').args.at(-1), BASE);
  }
});
