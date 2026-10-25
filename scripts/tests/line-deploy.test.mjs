// The live line's own Worker deploys before the live app, from the default branch's line config and the build's
// bundle (wiki/stack/live-line.md). A refused or failed line deploy stops the app's; a preview deploys no line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEMO_CONFIG, demoRepo, fakeTools, wranglerCalls } from './fixtures/workflow.mjs';

const [prodDb] = DEMO_CONFIG.d1_databases;
const strip = ({ binding, database_name, database_id }) => ({ binding, database_name, database_id });
const LINE = {
  name: 'demo-line',
  main: 'worker/line-worker.ts',
  workers_dev: false,
  preview_urls: false,
  d1_databases: [strip(prodDb)],
  durable_objects: { bindings: [{ name: 'LINE', class_name: 'Line' }] },
  migrations: [{ tag: 'line-1', new_sqlite_classes: ['Line'] }],
};
const binding = (script) => ({ durable_objects: { bindings: [{ name: 'LIVE_LINE', class_name: 'Line', script_name: script }] } });
const APP = { ...DEMO_CONFIG, ...binding('demo-line') };

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

const MAIN = { CF_BRANCH: 'main' };
const deploys = (tools) => wranglerCalls(tools.calls()).filter((call) => call.args[0] === 'deploy');

test('a live build bundles the line, keyless; a preview build or an app with no line bundles none', (t) => {
  const tools = fakeTools(t);
  const root = built(t, tools, {}, MAIN);
  assert.ok(existsSync(join(root, 'app/dist/line/line-worker.js')));
  const [call] = deploys(tools);
  assert.deepEqual(call.args, ['deploy', '--dry-run', '--outdir', 'dist/line', '--config', join(root, 'app/wrangler.line.jsonc')]);
  assert.equal(call.keyed, false);
  assert.ok(!existsSync(join(built(t, tools), 'app/dist/line')), 'a preview has no line');
  assert.ok(!existsSync(join(built(t, tools, { line: null, config: DEMO_CONFIG }, MAIN), 'app/dist/line')));
  assert.deepEqual(deploys(tools), []);
});

test('a branch push deploys only the staging app; the default branch, the live line then the app', (t) => {
  const tools = fakeTools(t);
  const main = repo(t);
  const branch = built(t, tools, { line: { ...LINE, name: 'other-line' } });
  tools.calls();
  assert.equal(script(main.root, tools, 'cf-deploy.sh', ['--take-build', branch]).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(main.root, 'app/wrangler.line.jsonc'), 'utf8')), LINE, 'the branch\'s line config was copied in');
  const preview = script(main.root, tools, 'cf-deploy.sh', []);
  assert.equal(preview.status, 0, preview.log);
  assert.deepEqual(deploys(tools).map((call) => call.worker), ['demo-staging']);

  const live = repo(t);
  assert.equal(script(live.root, tools, 'cf-deploy.sh', ['--take-build', built(t, tools, {}, MAIN)], MAIN).status, 0);
  tools.calls();
  assert.equal(script(live.root, tools, 'cf-deploy.sh', [], MAIN).status, 0);
  const calls = deploys(tools);
  assert.deepEqual(calls.map((call) => call.worker), ['demo-line', 'demo']);
  assert.deepEqual(calls[0].args, ['deploy', 'dist/line/line-worker.js', '--no-bundle', '--config', join(live.root, 'app/wrangler.line.jsonc')]);
});

test('a failed or refused line deploy stops the live app\'s deploy', (t) => {
  const tools = fakeTools(t);
  const take = (main, branch) => assert.equal(script(main.root, tools, 'cf-deploy.sh', ['--take-build', branch], MAIN).status, 0);
  const failing = repo(t);
  take(failing, built(t, tools, {}, MAIN));
  tools.calls();
  const failed = script(failing.root, tools, 'cf-deploy.sh', [], { ...MAIN, FAKE_FAIL_WORKER: 'demo-line' });
  assert.notEqual(failed.status, 0);
  assert.deepEqual(deploys(tools).map((call) => call.worker), ['demo-line']);

  // The default branch's line config gives the line a web address, or keeps a test line.
  for (const [line, why] of [[{ ...LINE, workers_dev: true }, /must set workers_dev to false/], [{ ...LINE, env: { staging: { name: 'demo-line-staging' } } }, /previews have no line; remove env.staging/]]) {
    const refusing = repo(t, { line });
    take(refusing, built(t, tools, {}, MAIN));
    tools.calls();
    const refused = script(refusing.root, tools, 'cf-deploy.sh', [], MAIN);
    assert.notEqual(refused.status, 0);
    assert.match(refused.log, new RegExp(`${why.source}[\\s\\S]*the app was not deployed either`));
    assert.deepEqual(deploys(tools), []);
  }

  // A build from before the line had its own Worker carries no bundle.
  const older = repo(t);
  take(older, built(t, tools, { line: null, config: APP }, MAIN));
  tools.calls();
  const unbundled = script(older.root, tools, 'cf-deploy.sh', [], MAIN);
  assert.notEqual(unbundled.status, 0);
  assert.match(unbundled.log, /the build has no/);
  assert.deepEqual(deploys(tools), []);
});

test('a preview whose staging app binds any other Worker\'s Durable Object is refused before any deploy, naming it', (t) => {
  const tools = fakeTools(t);
  for (const script_name of ['demo-line', 'demo-line-staging', 'billing']) {
    const main = repo(t);
    const config = { ...APP, env: { staging: { ...APP.env.staging, ...binding(script_name) } } };
    const taken = script(main.root, tools, 'cf-deploy.sh', ['--take-build', built(t, tools, { config })]);
    assert.notEqual(taken.status, 0);
    assert.match(taken.log, new RegExp(`binding 'LIVE_LINE' points at the Worker '${script_name}'; previews have no line`));
  }
  assert.deepEqual(deploys(tools), []);
});

test('a preview whose staging app binds no line is taken', (t) => {
  const tools = fakeTools(t);
  const main = repo(t);
  const taken = script(main.root, tools, 'cf-deploy.sh', ['--take-build', built(t, tools)]);
  assert.equal(taken.status, 0, taken.log);
});
