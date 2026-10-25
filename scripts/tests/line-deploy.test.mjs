// The live line's own Worker deploys before the app, from the default branch's line config and the build's bundle,
// so the app keeps its preview links (wiki/stack/live-line.md). A refused or failed line deploy stops the app's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEMO_CONFIG, demoRepo, fakeTools, wranglerCalls } from './fixtures/workflow.mjs';

const [prodDb] = DEMO_CONFIG.d1_databases;
const [stagingDb] = DEMO_CONFIG.env.staging.d1_databases;
const strip = ({ binding, database_name, database_id }) => ({ binding, database_name, database_id });
const LINE = {
  name: 'demo-line',
  main: 'worker/line-worker.ts',
  workers_dev: false,
  preview_urls: false,
  d1_databases: [strip(prodDb)],
  durable_objects: { bindings: [{ name: 'LINE', class_name: 'Line' }] },
  migrations: [{ tag: 'line-1', new_sqlite_classes: ['Line'] }],
  env: { staging: { name: 'demo-line-staging', d1_databases: [strip(stagingDb)], durable_objects: { bindings: [{ name: 'LINE', class_name: 'Line' }] } } },
};
const binding = (script) => ({ durable_objects: { bindings: [{ name: 'LIVE_LINE', class_name: 'Line', script_name: script }] } });
const APP = { ...DEMO_CONFIG, ...binding('demo-line'), env: { staging: { ...DEMO_CONFIG.env.staging, ...binding('demo-line-staging') } } };

function repo(t, { line = LINE, config = APP } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-line-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const made = demoRepo(root, { config });
  if (line) made.write('app/wrangler.line.jsonc', `${JSON.stringify(line, null, 2)}\n`);
  return made;
}

const script = (root, tools, name, args, env = {}) => {
  const result = spawnSync('bash', [join(root, 'scripts', name), ...args], { cwd: root, encoding: 'utf8', env: {
    PATH: `${tools.bin}:${process.env.PATH}`, HOME: root, ...tools.env, WONG_WRANGLER: tools.env.FAKE_WRANGLER,
    CF_BRANCH: 'feature-x', CF_PRODUCTION_BRANCH: 'main', ...env,
  } });
  return { ...result, log: `${result.stdout}${result.stderr}` };
};

// A branch's build, made by its own cf-build.sh with no key, as the build job makes it.
function built(t, tools, options, env) {
  const branch = repo(t, options);
  const result = script(branch.root, tools, 'cf-build.sh', ['--build-only'], env);
  assert.equal(result.status, 0, result.log);
  return branch.root;
}

const deploys = (tools) => wranglerCalls(tools.calls()).filter((call) => call.args[0] === 'deploy');

test('a build bundles the line for the environment it chose, keyless, and an app with no line bundles none', (t) => {
  const tools = fakeTools(t);
  const root = built(t, tools);
  assert.ok(existsSync(join(root, 'app/dist/line/line-worker.js')));
  const [call] = deploys(tools);
  assert.deepEqual(call.args, ['deploy', '--dry-run', '--outdir', 'dist/line', '--config', join(root, 'app/wrangler.line.jsonc'), '--env', 'staging']);
  assert.equal(call.keyed, false);
  built(t, tools, {}, { CF_BRANCH: 'main' });
  assert.equal(deploys(tools)[0].args.includes('--env'), false, 'a production build bundles the live line');
  assert.ok(!existsSync(join(built(t, tools, { line: null, config: DEMO_CONFIG }), 'app/dist/line')));
  assert.deepEqual(deploys(tools), []);
});

test('a preview deploys the staging line, then the staging app; the default branch, the live line then the app', (t) => {
  const tools = fakeTools(t);
  const main = repo(t);
  const branchLine = { ...LINE, env: { staging: { ...LINE.env.staging, d1_databases: [strip(prodDb)] } } };
  const branch = built(t, tools, { line: branchLine });
  tools.calls();
  assert.equal(script(main.root, tools, 'cf-deploy.sh', ['--take-build', branch]).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(main.root, 'app/wrangler.line.jsonc'), 'utf8')), LINE, 'the branch\'s line config was copied in');
  const preview = script(main.root, tools, 'cf-deploy.sh', []);
  assert.equal(preview.status, 0, preview.log);
  const calls = deploys(tools);
  assert.deepEqual(calls.map((call) => call.worker), ['demo-line-staging', 'demo-staging']);
  assert.deepEqual(calls[0].args, ['deploy', 'dist/line/line-worker.js', '--no-bundle', '--config', join(main.root, 'app/wrangler.line.jsonc'), '--env', 'staging']);

  const live = repo(t);
  assert.equal(script(live.root, tools, 'cf-deploy.sh', ['--take-build', built(t, tools, {}, { CF_BRANCH: 'main' })], { CF_BRANCH: 'main' }).status, 0);
  tools.calls();
  assert.equal(script(live.root, tools, 'cf-deploy.sh', [], { CF_BRANCH: 'main' }).status, 0);
  assert.deepEqual(deploys(tools).map((call) => call.worker), ['demo-line', 'demo']);
});

test('a failed or refused line deploy stops the app\'s deploy', (t) => {
  const tools = fakeTools(t);
  const take = (main, branch) => assert.equal(script(main.root, tools, 'cf-deploy.sh', ['--take-build', branch]).status, 0);
  const failing = repo(t);
  take(failing, built(t, tools));
  tools.calls();
  const failed = script(failing.root, tools, 'cf-deploy.sh', [], { FAKE_FAIL_WORKER: 'demo-line-staging' });
  assert.notEqual(failed.status, 0);
  assert.deepEqual(deploys(tools).map((call) => call.worker), ['demo-line-staging']);

  // The default branch's line config gives the line a web address.
  const open = repo(t, { line: { ...LINE, workers_dev: true } });
  take(open, built(t, tools));
  tools.calls();
  const refused = script(open.root, tools, 'cf-deploy.sh', []);
  assert.notEqual(refused.status, 0);
  assert.match(refused.log, /must set workers_dev to false[\s\S]*the app was not deployed either/);
  assert.deepEqual(deploys(tools), []);

  // A build from before the line had its own Worker carries no bundle.
  const older = repo(t);
  take(older, built(t, tools, { line: null, config: APP }));
  tools.calls();
  const unbundled = script(older.root, tools, 'cf-deploy.sh', []);
  assert.notEqual(unbundled.status, 0);
  assert.match(unbundled.log, /the build has no/);
  assert.deepEqual(deploys(tools), []);
});

test('a preview whose line binding points at the live line Worker is refused before any deploy', (t) => {
  const tools = fakeTools(t);
  const main = repo(t);
  const config = { ...APP, env: { staging: { ...APP.env.staging, ...binding('demo-line') } } };
  const taken = script(main.root, tools, 'cf-deploy.sh', ['--take-build', built(t, tools, { config })]);
  assert.notEqual(taken.status, 0);
  assert.match(taken.log, /binding 'LIVE_LINE' points at the Worker 'demo-line', not 'demo-line-staging', the default branch's staging line/);
});

test('a preview whose staging app binds no line is taken', (t) => {
  const tools = fakeTools(t);
  const main = repo(t);
  const config = { ...APP, env: { staging: DEMO_CONFIG.env.staging } };
  // Wrangler's environments inherit no Durable Object binding; the stand-in build would copy production's.
  const noLine = { BUILD_EXTRA: JSON.stringify({ durable_objects: { bindings: [] } }) };
  const taken = script(main.root, tools, 'cf-deploy.sh', ['--take-build', built(t, tools, { config }, noLine)]);
  assert.equal(taken.status, 0, taken.log);
});
