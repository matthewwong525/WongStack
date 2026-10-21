// The deploy workflow runs a branch's own code with no deploy key, and deploys with the default branch's own
// scripts and tools. Each run test plays .github/workflows/deploy.yml's jobs on this machine with fake tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO } from './fixtures/pack.mjs';
import {
  DEMO_CONFIG, KEY, PRINTS_KEY, demoRepo, fakeTools, loadWorkflow, plant, runWorkflow, secretProblems, trustedJobProblems, wranglerCalls,
} from './fixtures/workflow.mjs';

const WORKFLOW = join(REPO, '.github/workflows/deploy.yml');
const SECRETS = { CLOUDFLARE_DEPLOY_TOKEN: KEY, CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32) };
const MAIN_SHA = 'm'.repeat(40);

const github = (over = {}) => ({
  event_name: 'push', ref_name: 'feature-x', head_ref: '', sha: 'f'.repeat(40), repository: 'ana/demo', token: 'gh-token',
  event: { repository: { default_branch: 'main' } }, ...over,
});

function dir(t, prefix) {
  const path = mkdtempSync(join(tmpdir(), `wong-test-${prefix}-`));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

// A branch that tries to reach the key from each place it can: install and build scripts, the deploy scripts,
// and a package setting. `config` and `build` change its wrangler config and what its build leaves.
function hostileBranch(t, { config = DEMO_CONFIG, build = '' } = {}) {
  const root = dir(t, 'branch');
  const { write } = demoRepo(root, { config, scripts: {
    preinstall: PRINTS_KEY, postinstall: PRINTS_KEY, 'build:app': `${PRINTS_KEY} && ${build}node build.mjs`,
  } });
  plant(root, 'cf-build.sh', 'echo "PLANTED-SAW:${CLOUDFLARE_API_TOKEN:-none}" >&2');
  plant(root, 'cf-deploy.sh', 'echo PLANTED-DEPLOY >&2');
  write('app/.npmrc', 'script-shell=/tmp/evil\n');
  return root;
}

function run(t, { head, main, event = github(), secrets = SECRETS }) {
  const tools = fakeTools(t);
  const mainTree = main ?? demoRepo(dir(t, 'main')).root;
  const result = runWorkflow(t, loadWorkflow(WORKFLOW), { github: event, secrets, trees: { main: mainTree, head }, tools, mainSha: MAIN_SHA });
  return { ...result, calls: tools.calls() };
}

const keyFree = ({ log }) => {
  assert.ok(!log.includes(KEY), `the deploy key reached the branch's code:\n${log}`);
  assert.ok(!log.includes('PLANTED-DEPLOY'), 'the branch\'s copy of cf-deploy.sh ran');
};

test('the job that runs branch code names no secret, and the deploy job runs only the default branch\'s files', () => {
  const workflow = loadWorkflow(WORKFLOW);
  assert.deepEqual(Object.keys(workflow.jobs), ['build', 'deploy']);
  assert.deepEqual(secretProblems(workflow, ['build']), []);
  assert.deepEqual(trustedJobProblems('deploy', workflow.jobs.deploy), []);
  assert.equal(workflow.jobs.deploy.needs, 'build');
  assert.match(workflow.jobs.deploy.if, /github\.event_name == 'push'/);
});

test('the shape checks name a secret in a build job, a branch checkout, a cache and an install with scripts on', () => {
  const step = (extra) => ({ name: 's', ...extra });
  assert.match(secretProblems({ jobs: { build: { env: { T: '${{ secrets.CLOUDFLARE_API_TOKEN }}' }, steps: [] } } }, ['build']).join('\n'), /job-level env T/);
  assert.match(secretProblems({ jobs: { build: { steps: [step({ env: { T: '${{ secrets.X }}' } })] } } }, ['build']).join('\n'), /names a secret/);
  const problems = trustedJobProblems('deploy', { steps: [
    step({ uses: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1', with: { path: 'trusted', 'persist-credentials': false } }),
    step({ uses: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020', with: { cache: 'npm' } }),
    step({ uses: './.github/actions/change-scope' }),
    step({ run: 'npm ci --no-audit' }),
    step({ run: 'bash scripts/cf-deploy.sh' }),
    step({ run: 'npx wrangler deploy' }),
    step({ 'working-directory': 'app', run: 'true' }),
  ] }).join('\n');
  for (const words of ['pushed branch', 'npm cache', 'not pinned', 'install scripts on', 'outside trusted/', 'package\'s own command', 'runs in app']) {
    assert.ok(problems.includes(words), `no problem says "${words}":\n${problems}`);
  }
});

test('a branch push deploys its build to main\'s staging Worker, and its own scripts never see the key', t => {
  const result = run(t, { head: hostileBranch(t) });
  keyFree(result);
  assert.match(result.log, /KEY-SEEN:none/, 'the branch\'s package scripts ran, with no key');
  assert.match(result.log, /PLANTED-SAW:none/, 'the branch\'s build script ran, with no key');
  assert.equal(result.jobs.build.result, 'success', result.log);
  assert.equal(result.jobs.deploy?.result, 'success', result.log);

  const trusted = realpathSync(join(result.jobs.deploy.workspace, 'trusted'));
  const wrangler = wranglerCalls(result.calls);
  assert.ok(wrangler.length > 0, result.log);
  for (const call of wrangler) assert.ok(call.cwd.startsWith(trusted), `wrangler ran outside the default branch's checkout: ${call.cwd}`);
  const deploys = wrangler.filter(call => ['deploy', 'versions'].includes(call.args[0]));
  assert.deepEqual(deploys.map(call => [call.args[0], call.worker, call.routes, call.keyed]), [['deploy', 'demo-staging', [], true], ['versions', 'demo-staging', [], true]]);
  assert.deepEqual(wrangler.find(call => call.args[0] === 'd1').args, ['d1', 'migrations', 'apply', 'demo-db-staging', '--remote', '--env', 'staging']);
  assert.ok(result.calls.some(call => call.tool === 'gh' && call.args.includes('environment=staging')), 'the preview link is published');
  assert.ok(!existsSync(join(trusted, 'app/.npmrc')), 'the branch\'s package setting was copied into the deploy');
  assert.ok(!readFileSync(join(trusted, 'scripts/cf-deploy.sh'), 'utf8').includes('PLANTED'), 'the branch\'s script was copied in');
});

test('a branch build that names production, claims a route or binds production\'s database deploys nothing', t => {
  const named = structuredClone(DEMO_CONFIG);
  named.env.staging.name = 'demo';
  const prodDb = structuredClone(DEMO_CONFIG);
  prodDb.env.staging.d1_databases[0].database_id = 'prod-id';
  for (const [name, branch] of [
    ['staging named as production', { config: named }],
    ['a route of its own', { build: 'BUILD_EXTRA=\'{"routes":[{"pattern":"demo.com","custom_domain":true}]}\' ' }],
    ['production\'s database', { config: prodDb }],
    ['assets read from outside the project', { build: 'BUILD_EXTRA=\'{"assets":{"directory":"/proc/self"}}\' ' }],
  ]) {
    const result = run(t, { head: hostileBranch(t, branch) });
    const touched = wranglerCalls(result.calls).filter(call => ['deploy', 'versions', 'd1'].includes(call.args[0]));
    assert.deepEqual(touched, [], `${name}: wrangler deployed or migrated`);
    keyFree(result);
    assert.match(result.log, /this build can not deploy/, name);
    assert.equal(result.jobs.deploy?.result, 'failure', `${name}:\n${result.log}`);
  }
});

test('a fork\'s pull request from a branch named main only builds, even when secrets reach it', t => {
  const event = github({
    event_name: 'pull_request', ref_name: '42/merge', head_ref: 'main',
    event: { repository: { default_branch: 'main' }, pull_request: { number: 42, head: { repo: { full_name: 'mallory/demo' } } } },
  });
  const result = run(t, { head: hostileBranch(t), event });
  assert.deepEqual(wranglerCalls(result.calls).filter(call => call.worker === 'demo'), [], 'a fork deployed production');
  keyFree(result);
  assert.match(result.log, /branch=pull-42/, 'the fork builds as its pull request, never as main');
  assert.equal(result.jobs.build.result, 'success', result.log);
  assert.equal(result.jobs.deploy?.result, 'skipped');
});

test('a push to the default branch deploys production from its own commit and records the release', t => {
  const main = demoRepo(dir(t, 'main')).root;
  const result = run(t, { head: main, main, event: github({ ref_name: 'main', sha: MAIN_SHA }) });
  assert.equal(result.jobs.deploy.result, 'success', result.log);
  const deploys = wranglerCalls(result.calls).filter(call => call.args[0] === 'deploy');
  assert.deepEqual(deploys.map(call => call.worker), ['demo']);
  assert.deepEqual(wranglerCalls(result.calls).find(call => call.args[0] === 'd1').args, ['d1', 'migrations', 'apply', 'demo-db', '--remote']);
  assert.ok(result.calls.some(call => call.tool === 'gh' && call.args.includes('environment=production')), result.log);
});

test('with no deploy token the build still runs and nothing deploys, and the old secret name is no token', t => {
  for (const secrets of [{}, { CLOUDFLARE_API_TOKEN: KEY, CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32) }]) {
    const result = run(t, { head: hostileBranch(t), secrets });
    assert.equal(result.jobs.deploy.result, 'success', result.log);
    assert.match(result.log, /No CLOUDFLARE_DEPLOY_TOKEN secret — built without deploying/);
    assert.deepEqual(wranglerCalls(result.calls), []);
    keyFree(result);
  }
});

// An older commit's workflow reads the deploy key under this name at job level, where branch code runs; that secret is
// deleted once setup sets the new one, so a branch started from such a commit gets no key.
test('no workflow reads the old deploy secret name', () => {
  const folder = join(REPO, '.github/workflows');
  for (const file of readdirSync(folder).filter(name => /\.ya?ml$/.test(name))) {
    assert.doesNotMatch(readFileSync(join(folder, file), 'utf8'), /secrets\.CLOUDFLARE_API_TOKEN\b/,
      `${file} reads the old secret name; read secrets.CLOUDFLARE_DEPLOY_TOKEN, which only the current deploy steps know`);
  }
});

test('a default branch whose scripts can not take a build yet previews the change after it is published', t => {
  const main = demoRepo(dir(t, 'main')).root;
  const script = join(main, 'scripts/cf-deploy.sh');
  writeFileSync(script, readFileSync(script, 'utf8').replaceAll('--take-build', '--take-a-build'));
  const result = run(t, { head: hostileBranch(t), main });
  assert.equal(result.jobs.deploy.result, 'success', result.log);
  assert.match(result.jobs.deploy.summary, /previews after it is published/);
  assert.deepEqual(wranglerCalls(result.calls), []);
  keyFree(result);
});
