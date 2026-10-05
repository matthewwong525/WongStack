// /routine's client, .agents/skills/routine/scripts/routine.mjs, against a fake Cloudflare over HTTP
// and a fake runner: the runner's real list and router on stand-in storage. npm and wrangler never run.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { RoutineError, buildRoutine, defaultName, githubRemote, main, makerOf, runnerConfig } from '../../.agents/skills/routine/scripts/routine.mjs';
import { CliError, EXIT } from '../../.agents/skills/routine/scripts/lib/cli.mjs';
import { ROUTINES_PROVISION, run as runTool } from '../../.agents/skills/routine/scripts/lib/cloudflare.mjs';
import { API_VERSION } from '../routine-runner/routines.mjs';
import { ACCOUNT, TOKEN, fakeCloudflare } from './fixtures/cloudflare.mjs';
import { ROUTINES_KEY, fakeRunner } from './fixtures/routine-runner.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const cli = path.join(repoRoot, '.agents/skills/routine/scripts/routine.mjs');
const RUNNER = 'demo-routines';
const REMOTE = `https://${ACCOUNT}.artifacts.cloudflare.net/git/wongstack/demo.git`;
const MEMORY = 'wongm_memory-key-secret';
const SUBSCRIPTION = 'sk-ant-oat-subscription-secret';
const PROJECT_KEY = 'github_pat_project-secret';
const CREATE = ['create', '--cron', '0 9 * * 1-5', '--prompt', '/improve', '--agent', 'claude', '--timezone', 'UTC'];
const SECRETS = `/accounts/${ACCOUNT}/workers/scripts/${RUNNER}/secrets`;
// Monday 5 October 2026, 08:00 UTC.
const NOW = Date.parse('2026-10-05T08:00:00Z');

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();

/**
 * An install named "demo": a repo with the runner's pack folder, keys in an ignored .env, and an
 * install record. `route` is where its project lives. `installed` records the runner as already set
 * up, with this computer holding its key. Commands run in-process, against a fake Cloudflare and a
 * fake runner whose secrets are the ones the fake Cloudflare holds for the runner's Worker.
 */
async function install(t, { route = 'artifacts', installed = false, paid = true, keys = {} } = {}) {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'wong-test-routine-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const dir = path.join(base, 'demo');
  mkdirSync(path.join(dir, '.claude'), { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'Ada@Example.com');
  git(dir, 'config', 'user.name', 'Ada');
  if (route === 'github') git(dir, 'remote', 'add', 'origin', 'git@github.com:ada/demo.git');
  writeFileSync(path.join(dir, '.gitignore'), '.env*\n!.env.example\n');
  cpSync(path.join(repoRoot, 'scripts/routine-runner'), path.join(dir, 'scripts/routine-runner'), { recursive: true, filter: (source) => !/node_modules|wrangler\.jsonc$|\.wrangler/.test(source) });
  const record = {
    components: {
      memory: { accountId: ACCOUNT, database: 'demo-memory' },
      ...(route === 'artifacts' ? { delivery: { route: 'artifacts', accountId: ACCOUNT, namespace: 'wongstack', repo: 'demo', remote: REMOTE } } : {}),
      ...(installed ? { routines: { worker: RUNNER, url: 'https://demo-routines.ada.workers.dev', accountId: ACCOUNT, route } } : {}),
    },
  };
  writeFileSync(path.join(dir, '.claude/.wong-stack.json'), `${JSON.stringify(record, null, 2)}\n`);
  const env = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_MEMORY_TOKEN: MEMORY, ...(installed ? { WONG_ROUTINES_KEY: ROUTINES_KEY } : {}), ...keys };
  writeFileSync(path.join(dir, '.env'), Object.entries(env).map(([name, value]) => `${name}=${value}\n`).join(''));
  git(dir, 'add', '--all');
  git(dir, 'commit', '-q', '-m', 'init');

  const fake = await fakeCloudflare({ paid });
  t.after(fake.close);
  if (installed) fake.state.workers.push(RUNNER);
  const runner = await fakeRunner({ config: { route } });
  t.after(runner.close);
  Object.defineProperty(runner.state, 'env', { get: () => fake.state.workerSecrets[RUNNER] ?? {} });

  const ran = [];
  const exec = async (file, args, options = {}) => {
    if (file !== 'npm' && file !== 'npx') return runTool(file, args, options);
    ran.push({ file, args, cwd: options.cwd, token: options.env?.CLOUDFLARE_API_TOKEN === TOKEN });
    if (args.includes('deploy')) {
      const { name } = JSON.parse(readFileSync(path.join(options.cwd, 'wrangler.jsonc'), 'utf8'));
      if (!fake.state.workers.includes(name)) fake.state.workers.push(name);
    }
    return { stdout: '', stderr: '' };
  };
  const at = (cwd) => async (...argv) => {
    let text = '';
    const code = await main(argv, { WONG_CLOUDFLARE_API: fake.api, WONG_ROUTINES_API: runner.url }, { cwd, exec, sleep: async () => {}, now: () => NOW, out: (chunk) => (text += chunk), timeoutMs: 5000 });
    return { code, text, data: JSON.parse(text) };
  };
  const envFile = (file = path.join(dir, '.env')) => Object.fromEntries(readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  return {
    dir, fake, runner, ran, at, envFile, run: at(dir),
    record: () => JSON.parse(readFileSync(path.join(dir, '.claude/.wong-stack.json'), 'utf8')).components,
    addKey: (name, value) => writeFileSync(path.join(dir, '.env'), `${readFileSync(path.join(dir, '.env'), 'utf8')}${name}=${value}\n`),
    held: () => fake.state.workerSecrets[RUNNER] ?? {},
    calls: (prefix) => fake.calls.filter((call) => `${call.method} ${call.path}`.startsWith(prefix)),
  };
}

/** Asserts no key's value reached a command's output. */
function noSecret(text, env) {
  for (const value of [TOKEN, MEMORY, SUBSCRIPTION, PROJECT_KEY, ROUTINES_KEY, env.envFile().WONG_ROUTINES_KEY, ...Object.values(env.held())].filter(Boolean)) {
    assert.equal(text.includes(value), false, `a key's value was printed: ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// Pure helpers

test('a routine is named for its prompt and the repo', () => {
  assert.equal(defaultName('/improve --audit-only', '/home/ada/demo'), 'improve demo');
  assert.equal(defaultName('  summarize the support inbox every week  ', '/home/ada/demo'), 'summarize the support inbox demo');
});

test('a routine runs as the git author here, filed under a short id of their email in any case', () => {
  const who = makerOf(' Ada@Example.com ', 'Ada');
  assert.deepEqual(who, { id: 'b5fc85e55755', name: 'Ada', email: 'Ada@Example.com' });
  assert.equal(makerOf('ada@example.com', '').id, who.id);
  assert.equal(makerOf('ada@example.com', '').name, 'ada@example.com', 'with no git name the email stands in');
  assert.throws(() => makerOf('', 'Ada'), (error) => error instanceof RoutineError && error.code === EXIT.input && /user\.email/.test(error.message));
});

test('a GitHub origin in any spelling becomes one https address, and anything else is not GitHub', () => {
  const expected = { repo: 'ada/recipe-box.io', remote: 'https://github.com/ada/recipe-box.io.git' };
  for (const origin of ['git@github.com:ada/recipe-box.io.git', 'https://github.com/ada/recipe-box.io', 'https://github.com/ada/recipe-box.io.git/', 'https://token@github.com/ada/recipe-box.io.git', 'ssh://git@github.com/ada/recipe-box.io.git']) {
    assert.deepEqual(githubRemote(origin), expected, origin);
  }
  for (const origin of ['', undefined, REMOTE, 'https://gitlab.com/ada/demo.git', 'https://github.com/ada']) assert.equal(githubRemote(origin), null, String(origin));
});

test('a create is checked here before anything is sent', () => {
  const maker = makerOf('ada@example.com', 'Ada');
  const good = { prompt: ' /improve ', cron: ' 0  9 * * 1-5 ', timezone: 'UTC', name: 'improve demo', agent: 'claude', keys: 'STRIPE_KEY, MAPS_KEY', maker };
  assert.deepEqual(buildRoutine(good), { name: 'improve demo', prompt: '/improve', cron: '0 9 * * 1-5', timezone: 'UTC', agent: 'claude', keys: ['STRIPE_KEY', 'MAPS_KEY'], maker });
  assert.equal(buildRoutine({ ...good, model: 'claude-opus-5-5', keys: undefined }).model, 'claude-opus-5-5');
  const refused = (change, message, extra = {}) => assert.throws(() => buildRoutine({ ...good, ...change }), (error) => error.code === EXIT.input && message.test(error.message) && Object.entries(extra).every(([key, value]) => error.extra[key] === value), JSON.stringify(change));
  refused({ prompt: '  ' }, /prompt is empty/);
  refused({ cron: '0 9 * *' }, /Invalid cron "0 9 \* \*": field count/, { field: 'field count (4, expected 5)' });
  refused({ cron: '0 25 * * *' }, /hour/, { field: 'hour' });
  refused({ timezone: 'Mars/Olympus' }, /Unknown timezone/, { field: 'timezone' });
  refused({ agent: 'gemini' }, /Unknown agent "gemini"/);
  refused({ agent: undefined }, /Pass --agent claude or --agent codex/);
  refused({ keys: 'CLOUDFLARE_API_TOKEN' }, /can not be given CLOUDFLARE_API_TOKEN/);
  refused({ keys: 'stripe key' }, /is not a key name/);
});

test('the runner\'s config is the template filled for the install, with no Artifacts binding on GitHub', () => {
  const template = readFileSync(path.join(repoRoot, 'scripts/routine-runner/wrangler.template.jsonc'), 'utf8');
  const artifacts = JSON.parse(runnerConfig({ account: ACCOUNT, runner: RUNNER, route: 'artifacts', remote: REMOTE, repo: 'demo', namespace: 'wongstack' }, template));
  assert.deepEqual([artifacts.name, artifacts.account_id, artifacts.containers[0].name, artifacts.workflows[0].name], [RUNNER, ACCOUNT, RUNNER, RUNNER]);
  assert.deepEqual(artifacts.artifacts, [{ binding: 'ARTIFACTS', namespace: 'wongstack' }]);
  assert.deepEqual(JSON.parse(artifacts.vars.WONG_ROUTINES), { account: ACCOUNT, route: 'artifacts', remote: REMOTE, repo: 'demo' });
  const github = JSON.parse(runnerConfig({ account: ACCOUNT, runner: RUNNER, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo' }, template));
  assert.equal(github.artifacts, undefined);
  assert.deepEqual(JSON.parse(github.vars.WONG_ROUTINES), { account: ACCOUNT, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo' });
  assert.throws(() => runnerConfig({ account: ACCOUNT, runner: RUNNER, route: 'github', remote: 'x', repo: 'y' }, `${template}\n"<new>"`), /routine runner's config has a placeholder this script does not fill: <new>/);
});

// ---------------------------------------------------------------------------
// setup

test('setup --dry-run says what the first routine adds, the cost, and full permissions, and makes nothing', async (t) => {
  const env = await install(t, { route: 'github' });
  const { code, data } = await env.run('setup', '--dry-run');
  assert.equal(code, 0);
  assert.deepEqual([data.ok, data.dryRun, data.installed], [true, true, false]);
  assert.equal(data.adds.length, 4);
  assert.match(data.adds.join(' '), /keeps the list of routines and the clock.*short-lived cloud computer.*private key.*Workers Containers Write and Billing Read/);
  assert.match(data.cost, /about \$5 a month/);
  assert.match(data.fullPermissions, /full permissions/);
  assert.equal((await (await install(t)).run('setup', '--dry-run')).data.adds.length, 3, 'an Artifacts install already has both permissions');
  assert.deepEqual([env.fake.calls.length, env.runner.state.calls.length, env.ran.length], [0, 0, 0]);
  assert.equal(env.record().routines, undefined);
});

test('on a free account setup stops with the cost, and nothing is added or recorded', async (t) => {
  const env = await install(t, { route: 'github', paid: false });
  const { code, data } = await env.run('setup');
  assert.equal(code, 3);
  assert.deepEqual([data.ok, data.code, data.needs, data.cost, data.upgrade], [false, 3, 'paid-plan', 'about $5 a month', `https://dash.cloudflare.com/${ACCOUNT}/workers/plans`]);
  assert.match(data.error, /need Cloudflare's paid plan.*Nothing was added/);
  assert.deepEqual(data.granted, ROUTINES_PROVISION.map((row) => row.name), 'the token gained only the read that sees the plan, and the computers\' group');
  assert.deepEqual(env.fake.state.workers, []);
  assert.deepEqual(env.ran, []);
  assert.equal(existsSync(path.join(env.dir, 'scripts/routine-runner/wrangler.jsonc')), false);
  assert.equal(env.envFile().WONG_ROUTINES_KEY, undefined);
  assert.equal(env.record().routines, undefined);
  assert.equal((await env.run(...CREATE)).data.needs, 'setup', 'and no routine can be made');
});

test('the first setup installs the runner from the pack\'s pinned tools, stores its keys, and records it last', async (t) => {
  const env = await install(t);
  const { code, data, text } = await env.run('setup');
  assert.equal(code, 0, text);
  const routines = { worker: RUNNER, url: 'https://demo-routines.ada.workers.dev', accountId: ACCOUNT, route: 'artifacts' };
  assert.deepEqual([data.ok, data.routines, data.plan, data.needs], [true, routines, 'Workers Paid', undefined]);
  assert.deepEqual(data.created, ['scripts/routine-runner/wrangler.jsonc', 'WONG_ROUTINES_KEY in .env']);
  assert.deepEqual(data.updated, [`routine runner ${RUNNER}`, '.claude/.wong-stack.json components.routines']);
  assert.deepEqual(env.record().routines, routines);

  const folder = path.join(env.dir, 'scripts/routine-runner');
  const config = JSON.parse(readFileSync(path.join(folder, 'wrangler.jsonc'), 'utf8'));
  assert.deepEqual([config.name, config.artifacts[0].namespace, JSON.parse(config.vars.WONG_ROUTINES).remote], [RUNNER, 'wongstack', REMOTE]);
  assert.deepEqual(env.ran.map((tool) => [tool.file, tool.cwd]), [['npm', folder], ['npx', folder]]);
  assert.deepEqual(env.ran[0].args, ['ci', '--no-audit', '--no-fund', '--ignore-scripts']);
  assert.deepEqual(env.ran[1].args, ['--no-install', 'wrangler', 'deploy', '--config', 'wrangler.jsonc']);
  assert.deepEqual(env.ran.map((tool) => tool.token), [false, true], 'only the deploy gets the token, in its environment');

  const key = env.envFile().WONG_ROUTINES_KEY;
  assert.match(key, /^[A-Za-z0-9_-]{43}$/, '32 random bytes');
  assert.deepEqual(env.held(), { ROUTINES_KEY: key, MEMORY_TOKEN: MEMORY });
  assert.equal(git(env.dir, 'status', '--porcelain', '--', 'scripts'), '', 'what setup generates is kept out of git');
  assert.match(readFileSync(path.join(env.dir, '.git/info/exclude'), 'utf8'), /^scripts\/routine-runner\/wrangler\.jsonc\nscripts\/routine-runner\/node_modules\/\nscripts\/routine-runner\/\.wrangler\/\n/m);
  noSecret(text, env);

  const again = await env.run('setup');
  assert.equal(again.code, 0);
  assert.deepEqual([again.data.created, again.data.granted], [[], []]);
  assert.equal(env.envFile().WONG_ROUTINES_KEY, key, 'a second setup keeps the key this computer holds');
  assert.equal(env.held().ROUTINES_KEY, key);
  assert.equal(readFileSync(path.join(env.dir, '.git/info/exclude'), 'utf8').match(/routine-runner\/wrangler\.jsonc/g).length, 1);
});

test('a setup that fails midway records nothing, and the next one finishes', async (t) => {
  const env = await install(t);
  env.fake.state.refuse = [`PUT ${SECRETS}`];
  const { code, data } = await env.run('setup');
  assert.equal(code, 4);
  assert.match(data.error, /Cloudflare did not take the change: Cloudflare PUT .*secrets: HTTP 500 1000\. Nothing was recorded; try again\./);
  assert.equal(env.envFile().WONG_ROUTINES_KEY, undefined);
  assert.equal(env.record().routines, undefined);
  assert.deepEqual(env.held(), {});
  assert.equal((await env.run('ls')).data.installed, false);

  env.fake.state.refuse = [];
  assert.equal((await env.run('setup')).code, 0);
  assert.equal(env.held().ROUTINES_KEY, env.envFile().WONG_ROUTINES_KEY);
});

test('a GitHub install widens the token by two groups, drops the Artifacts binding, and waits for the project key', async (t) => {
  const env = await install(t, { route: 'github' });
  const first = await env.run('setup');
  assert.equal(first.code, 0, first.text);
  assert.deepEqual([first.data.needs, first.data.keys, first.data.granted], ['project-access', ['WONG_ROUTINE_GITHUB_TOKEN'], ['Workers Containers Write', 'Billing Read']]);
  const config = JSON.parse(readFileSync(path.join(env.dir, 'scripts/routine-runner/wrangler.jsonc'), 'utf8'));
  assert.equal(config.artifacts, undefined);
  assert.deepEqual(JSON.parse(config.vars.WONG_ROUTINES), { account: ACCOUNT, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo' });
  assert.equal(env.held().GITHUB_TOKEN, undefined);
  const held = env.fake.state.policies.flatMap((policy) => policy.permission_groups.map((group) => group.id));
  for (const row of ROUTINES_PROVISION) assert.ok(held.includes(row.id), row.name);
  assert.equal(env.fake.state.puts.length, 1);

  env.addKey('WONG_ROUTINE_GITHUB_TOKEN', PROJECT_KEY);
  const second = await env.run('setup');
  assert.deepEqual([second.data.needs, second.data.granted], [undefined, []]);
  assert.equal(env.held().GITHUB_TOKEN, PROJECT_KEY);
  assert.equal(env.fake.state.puts.length, 1, 'a token that holds both groups is not widened again');
  noSecret(`${first.text}${second.text}`, env);
});

test('setup stops, naming what is missing, before Cloudflare is asked for anything it can not do', async (t) => {
  const noToken = await install(t);
  writeFileSync(path.join(noToken.dir, '.env'), `CLOUDFLARE_ACCOUNT_ID=${ACCOUNT}\n`);
  const tokenless = await noToken.run('setup');
  assert.deepEqual([tokenless.code, tokenless.data.keys], [2, ['CLOUDFLARE_API_TOKEN']]);
  assert.match(tokenless.data.error, /CLOUDFLARE_API_TOKEN is not in this install's \.env/);

  const elsewhere = await install(t, { route: 'github' });
  git(elsewhere.dir, 'remote', 'set-url', 'origin', 'https://gitlab.com/ada/demo.git');
  const foreign = await elsewhere.run('setup');
  assert.deepEqual([foreign.code, foreign.data.error], [2, 'This project has no GitHub or Cloudflare repository to run from: `origin` is not a GitHub address.']);

  const bare = await install(t);
  writeFileSync(path.join(bare.dir, '.claude/.wong-stack.json'), '{}\n');
  writeFileSync(path.join(bare.dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\n`);
  assert.match((await bare.run('setup')).data.error, /records no Cloudflare account/);
  writeFileSync(path.join(bare.dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\nCLOUDFLARE_ACCOUNT_ID=${ACCOUNT}\n`);
  assert.match((await bare.run('setup')).data.error, /has not been set up on Cloudflare yet/);
  for (const env of [noToken, elsewhere, bare]) assert.deepEqual(env.ran, []);

  const exposed = await install(t);
  writeFileSync(path.join(exposed.dir, '.gitignore'), '');
  const unsafe = await exposed.run('setup');
  assert.equal(unsafe.code, 2);
  assert.match(unsafe.data.error, /\.env is not git-ignored .* no key was saved/);
  assert.equal(exposed.record().routines, undefined);
});

// ---------------------------------------------------------------------------
// signin

test('signin sends the value only to Cloudflare, under its maker\'s id, and prints names only', async (t) => {
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_CLAUDE_TOKEN: SUBSCRIPTION, WONG_ROUTINE_ANTHROPIC_KEY: 'sk-ant-api-paid-secret' } });
  const { code, data, text } = await env.run('signin', '--agent', 'claude');
  assert.equal(code, 0, text);
  assert.deepEqual(data, { ok: true, action: 'signin', agent: 'claude', stored: 'WONG_ROUTINE_CLAUDE_TOKEN', for: { name: 'Ada', email: 'Ada@Example.com' } });
  assert.deepEqual(env.held(), { SIGNIN_CLAUDE_B5FC85E55755: `CLAUDE_CODE_OAUTH_TOKEN=${SUBSCRIPTION}` }, 'the subscription sign-in is first choice');
  assert.deepEqual(env.runner.state.calls, [], 'the runner\'s own address never sees a sign-in');
  assert.equal(env.fake.calls.filter((call) => call.body.includes(SUBSCRIPTION)).length, 1);
  assert.equal(text.includes(SUBSCRIPTION) || text.includes('sk-ant-api-paid-secret'), false);
});

test('signin falls back to the pay-per-use key, and stores Codex\'s under its own name', async (t) => {
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_ANTHROPIC_KEY: 'sk-ant-api-paid-secret', WONG_ROUTINE_OPENAI_KEY: 'sk-openai-secret' } });
  assert.equal((await env.run('signin', '--agent', 'claude')).data.stored, 'WONG_ROUTINE_ANTHROPIC_KEY');
  assert.equal((await env.run('signin', '--agent', 'codex')).data.stored, 'WONG_ROUTINE_OPENAI_KEY');
  assert.deepEqual(env.held(), { SIGNIN_CLAUDE_B5FC85E55755: 'ANTHROPIC_API_KEY=sk-ant-api-paid-secret', SIGNIN_CODEX_B5FC85E55755: 'OPENAI_API_KEY=sk-openai-secret' });
});

test('signin with no key saved asks for one by name; before setup it asks for setup; a failed store says so', async (t) => {
  const env = await install(t, { installed: true });
  const none = await env.run('signin', '--agent', 'claude');
  assert.deepEqual([none.code, none.data.needs, none.data.keys], [3, 'signin', ['WONG_ROUTINE_CLAUDE_TOKEN', 'WONG_ROUTINE_ANTHROPIC_KEY']]);
  assert.deepEqual([(await env.run('signin', '--agent', 'gemini')).code, (await env.run('signin')).code], [2, 2]);
  assert.deepEqual(env.fake.calls, []);

  env.addKey('WONG_ROUTINE_OPENAI_KEY', 'sk-openai-secret');
  env.fake.state.refuse = [`GET ${SECRETS}`];
  const failed = await env.run('signin', '--agent', 'codex');
  assert.equal(failed.code, 4);
  assert.equal(failed.text.includes('sk-openai-secret'), false);

  const fresh = await install(t, { keys: { WONG_ROUTINE_CLAUDE_TOKEN: SUBSCRIPTION } });
  const early = await fresh.run('signin', '--agent', 'claude');
  assert.deepEqual([early.code, early.data.needs, early.data.adds.length], [3, 'setup', 3]);
});

// ---------------------------------------------------------------------------
// create

test('create --dry-run shows the routine, whose sign-in it runs with, and its next run, and sends nothing', async (t) => {
  const env = await install(t);
  const { code, data } = await env.run(...CREATE, '--model', 'claude-opus-5-5', '--dry-run');
  assert.equal(code, 0);
  assert.deepEqual(data.request, {
    name: 'improve demo', prompt: '/improve', cron: '0 9 * * 1-5', timezone: 'UTC', agent: 'claude', model: 'claude-opus-5-5', keys: [],
    maker: { id: 'b5fc85e55755', name: 'Ada', email: 'Ada@Example.com' },
  });
  assert.deepEqual([data.dryRun, data.installed, data.runsAs, data.nextRunAt], [true, false, { name: 'Ada', email: 'Ada@Example.com' }, '2026-10-05T09:00:00.000Z']);
  assert.equal(data.adds.length, 3, 'before setup the preview also says what the first routine adds');
  assert.deepEqual([env.fake.calls.length, env.runner.state.calls.length], [0, 0]);
  const zoned = await (await install(t, { installed: true })).run('create', '--cron', '0 9 * * *', '--prompt', 'tidy up', '--agent', 'codex', '--dry-run');
  assert.deepEqual([zoned.data.request.timezone, zoned.data.adds, zoned.data.request.name], [Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', undefined, 'tidy up demo']);
});

test('create asks for setup, then the sign-in, then project access, each by name, and then makes the routine', async (t) => {
  const env = await install(t, { route: 'github' });
  const first = await env.run(...CREATE);
  assert.deepEqual([first.code, first.data.needs, first.data.adds.length], [3, 'setup', 4]);
  assert.match(first.data.cost, /\$5 a month/);
  assert.deepEqual(env.runner.state.calls, [], 'nothing is asked of a runner that is not installed');
  assert.equal((await env.run('setup')).code, 0);

  const second = await env.run(...CREATE);
  assert.deepEqual([second.code, second.data.needs, second.data.keys], [3, 'signin', ['WONG_ROUTINE_CLAUDE_TOKEN', 'WONG_ROUTINE_ANTHROPIC_KEY']]);
  env.addKey('WONG_ROUTINE_CLAUDE_TOKEN', SUBSCRIPTION);
  assert.equal((await env.run('signin', '--agent', 'claude')).code, 0);

  const third = await env.run(...CREATE);
  assert.deepEqual([third.code, third.data.needs, third.data.keys], [3, 'project-access', ['WONG_ROUTINE_GITHUB_TOKEN']]);
  env.addKey('WONG_ROUTINE_GITHUB_TOKEN', PROJECT_KEY);
  assert.equal((await env.run('setup')).data.needs, undefined);
  assert.deepEqual((await env.run('ls')).data.routines, [], 'no routine exists until every need is met');

  const made = await env.run(...CREATE);
  assert.equal(made.code, 0, made.text);
  assert.deepEqual([made.data.ok, made.data.version, made.data.routine.name, made.data.routine.cadence, made.data.routine.maker], [true, undefined, 'improve demo', '0 9 * * 1-5 (UTC)', { name: 'Ada', email: 'Ada@Example.com' }]);
  assert.match(made.data.routine.nextRunAt, /^\d{4}-\d\d-\d\dT09:00:00\.000Z$/);
  noSecret([first, second, third, made].map((each) => each.text).join(''), env);
});

test('a routine\'s named keys go from .env to Cloudflare by name; a key that is not saved stops the create', async (t) => {
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_CLAUDE_TOKEN: SUBSCRIPTION, STRIPE_KEY: 'sk_live_stripe-secret' } });
  await env.run('signin', '--agent', 'claude');
  const lacking = await env.run(...CREATE, '--keys', 'STRIPE_KEY,MAPS_KEY');
  assert.deepEqual([lacking.code, lacking.data.keys], [2, ['MAPS_KEY']]);
  assert.equal(env.held().RUN_STRIPE_KEY, undefined);
  const made = await env.run(...CREATE, '--keys', 'STRIPE_KEY');
  assert.equal(made.code, 0, made.text);
  assert.deepEqual(made.data.routine.keys, ['STRIPE_KEY']);
  assert.equal(env.held().RUN_STRIPE_KEY, 'sk_live_stripe-secret');
  assert.equal(made.text.includes('sk_live_stripe-secret'), false);
  assert.equal((await env.run(...CREATE, '--keys', 'CLOUDFLARE_API_TOKEN')).code, 2);
  assert.equal(env.held().RUN_CLOUDFLARE_API_TOKEN, undefined);

  env.fake.state.refuse = [`PUT ${SECRETS}`];
  const failed = await env.run(...CREATE, '--name', 'second', '--keys', 'STRIPE_KEY');
  assert.equal(failed.code, 4);
  assert.equal((await env.run('ls')).data.routines.length, 1, 'a key Cloudflare did not take makes no routine');
});

test('a bad create is exit 2 with the reason, and a name already taken is the runner\'s own refusal', async (t) => {
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_CLAUDE_TOKEN: SUBSCRIPTION } });
  await env.run('signin', '--agent', 'claude');
  const bad = await env.run('create', '--cron', '0 9 * *', '--prompt', '/improve', '--agent', 'claude');
  assert.deepEqual([bad.code, bad.data.ok, bad.data.code, bad.data.field], [2, false, 2, 'field count (4, expected 5)']);
  assert.equal((await env.run('create', '--cron', '0 9 * * *', '--agent', 'claude')).data.error, 'The prompt is empty.');
  assert.equal((await env.run(...CREATE)).code, 0);
  const clash = await env.run(...CREATE);
  assert.equal(clash.code, 2);
  assert.match(clash.data.error, /A routine named "improve demo" already exists/);
  assert.equal((await env.run(...CREATE, '--name', 'second one')).data.routine.name, 'second one');
});

// ---------------------------------------------------------------------------
// list and manage

test('routines are listed, changed, paused, resumed, run now, read, and deleted', async (t) => {
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_CLAUDE_TOKEN: SUBSCRIPTION } });
  await env.run('signin', '--agent', 'claude');
  await env.run(...CREATE);
  const listed = await env.run();
  assert.equal(listed.code, 0);
  assert.deepEqual(listed.data.routines.map((routine) => [routine.name, routine.cadence, routine.status, routine.lastRun]), [['improve demo', '0 9 * * 1-5 (UTC)', 'active', null]]);
  assert.deepEqual((await env.run('ls')).data, listed.data, 'no command means list');
  const { id } = listed.data.routines[0];

  const changed = await env.run('change', 'improve demo', '--cron', '30 14 * * *', '--timezone', 'America/Toronto', '--prompt', '/improve docs');
  assert.deepEqual([changed.data.action, changed.data.routine.cadence, changed.data.routine.prompt], ['change', '30 14 * * * (America/Toronto)', '/improve docs']);
  assert.deepEqual([(await env.run('pause', id)).data.routine.status, (await env.run('resume', id.slice(0, 3))).data.routine.status], ['paused', 'active']);

  const ran = await env.run('run', 'IMPROVE DEMO');
  assert.deepEqual([ran.data.action, ran.data.run.started, ran.data.routine.running], ['run', true, true]);
  assert.deepEqual(env.runner.state.started, [{ id, runId: ran.data.run.runId }]);
  await env.runner.routines.finish(id, ran.data.run.runId, { status: 'ok', exitCode: 0, durationMs: 1000, log: 'shipped one fix\n' });
  const logs = await env.run('logs', id);
  assert.deepEqual([logs.data.action, logs.data.log, logs.data.results.map((result) => result.status)], ['logs', 'shipped one fix', ['ok']]);
  assert.equal((await env.run('ls')).data.routines[0].lastRun.status, 'ok');

  const deleted = await env.run('delete', 'improve demo');
  assert.deepEqual([deleted.data.action, deleted.data.routine], ['delete', { id, name: 'improve demo' }]);
  assert.deepEqual((await env.run('ls')).data.routines, []);
  assert.deepEqual(env.runner.state.calls.slice(-2), [`DELETE /routines/improve%20demo`, 'GET /routines']);
});

test('an ambiguous name changes nothing and lists the matching ids; bad input is exit 2', async (t) => {
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_CLAUDE_TOKEN: SUBSCRIPTION } });
  await env.run('signin', '--agent', 'claude');
  await env.run(...CREATE, '--name', 'first');
  await env.run(...CREATE, '--name', 'second');
  const before = JSON.stringify([...env.runner.storage.map]);
  const ambiguous = await env.run('pause', 'a');
  assert.deepEqual([ambiguous.code, ambiguous.data.matches.map((match) => match.name)], [2, ['first', 'second']]);
  assert.match(ambiguous.data.error, /matches more than one routine/);
  const none = await env.run('delete', 'monthly');
  assert.deepEqual([none.code, none.data.error, none.data.routines.length], [2, 'No routine matches "monthly".', 2]);
  for (const argv of [['pause'], ['logs', '  '], ['change', 'first'], ['change', 'first', '--cron', 'soon'], ['explode'], ['ls', '--force'], ['create', '--cron']]) {
    assert.equal((await env.run(...argv)).code, 2, argv.join(' '));
  }
  assert.equal((await env.run('explode')).data.error, 'Unknown command "explode". Use create, ls, pause, resume, run, logs, change, delete, setup, or signin.');
  assert.equal((await env.run('ls', '--force')).data.error, 'Unknown flag --force.');
  assert.equal(JSON.stringify([...env.runner.storage.map]), before);
});

// ---------------------------------------------------------------------------
// When the cloud cannot be reached

test('when the runner does not answer, nothing changes and the exit is 4', async (t) => {
  const env = await install(t, { installed: true });
  for (const answer of [{ status: 500, body: 'Internal Server Error', type: 'text/plain' }, { status: 503, body: '{}' }, { status: 404, body: '' }]) {
    env.runner.state.answer = answer;
    const silent = await env.run('ls');
    assert.deepEqual([silent.code, silent.data.ok, silent.data.code], [4, false, 4], JSON.stringify(answer));
    assert.match(silent.data.error, /did not answer .*Nothing changed\. Try again/);
  }
  assert.match((await env.run('ls')).data.error, /not found, or this computer's key is not theirs/);
  await env.runner.close();
  const gone = await env.run(...CREATE);
  assert.equal(gone.code, 4);
  assert.match(gone.data.error, /did not answer \(no reply\)/);
});

test('when the runner\'s answers have changed, nothing is guessed and the exit is 5', async (t) => {
  const env = await install(t, { installed: true });
  const changed = [
    { status: 200, body: '<html>Hello</html>', type: 'text/html' },
    { status: 200, body: JSON.stringify({ ok: true, version: API_VERSION + 1, routines: [] }) },
    { status: 200, body: JSON.stringify({ version: API_VERSION, routines: [] }) },
    { status: 400, body: JSON.stringify({ error: 'unknown' }) },
    { status: 200, body: 'null' },
  ];
  for (const answer of changed) {
    env.runner.state.answer = answer;
    const odd = await env.run('ls');
    assert.deepEqual([odd.code, odd.data.code], [5, 5], answer.body);
    assert.match(odd.data.error, /answered in a way this version does not understand\. Nothing changed\. Run setup again/);
  }
});

test('before setup the list is empty and every change asks for setup; a computer without the key asks too', async (t) => {
  const fresh = await install(t);
  assert.deepEqual((await fresh.run('ls')).data, { ok: true, installed: false, routines: [] });
  for (const argv of [['pause', 'x'], ['delete', 'x'], ['change', 'x', '--prompt', 'y'], ['logs', 'x']]) {
    const asked = await fresh.run(...argv);
    assert.deepEqual([asked.code, asked.data.needs], [3, 'setup'], argv.join(' '));
  }
  assert.deepEqual(fresh.runner.state.calls, []);

  const keyless = await install(t, { installed: true });
  writeFileSync(path.join(keyless.dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\n`);
  const asked = await keyless.run('ls');
  assert.deepEqual([asked.code, asked.data.needs], [3, 'setup']);
  assert.match(asked.data.error, /no WONG_ROUTINES_KEY in \.env/);
  assert.deepEqual(keyless.runner.state.calls, []);
});

// ---------------------------------------------------------------------------
// Where it runs from

test('from a linked worktree the keys are the main copy\'s, and a new key is saved to both', async (t) => {
  const env = await install(t);
  const linked = path.join(path.dirname(env.dir), 'linked');
  git(env.dir, 'worktree', 'add', '-q', '-b', 'feature', linked);
  writeFileSync(path.join(linked, '.env'), 'CLOUDFLARE_API_TOKEN=a-stale-branch-copy\nBRANCH_ONLY=1\n');
  const run = env.at(linked);
  const { code, data, text } = await run('setup');
  assert.equal(code, 0, text);
  assert.equal(data.routines.worker, RUNNER);
  const key = env.envFile().WONG_ROUTINES_KEY;
  assert.match(key, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(env.envFile(path.join(linked, '.env')).WONG_ROUTINES_KEY, key);
  assert.equal(env.envFile(path.join(linked, '.env')).BRANCH_ONLY, '1');
  assert.equal(env.record().routines, undefined, 'the record is this checkout\'s own edit, saved like any other');
  assert.equal(JSON.parse(readFileSync(path.join(linked, '.claude/.wong-stack.json'), 'utf8')).components.routines.worker, RUNNER);
  assert.equal(existsSync(path.join(linked, 'scripts/routine-runner/wrangler.jsonc')), true);
  assert.equal(git(linked, 'status', '--porcelain', '--', 'scripts'), '');
  assert.deepEqual((await run('ls')).data.routines, []);
});

test('outside a repo, or with no git email, a command is exit 2 with the reason', async (t) => {
  const outside = realpathSync(mkdtempSync(path.join(tmpdir(), 'wong-test-routine-outside-')));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  let text = '';
  assert.equal(await main(['ls'], {}, { cwd: outside, out: (chunk) => (text += chunk) }), 2);
  assert.match(JSON.parse(text).error, /not inside a Git checkout/);

  const env = await install(t, { installed: true });
  git(env.dir, 'config', 'user.email', '');
  const nobody = await env.run(...CREATE);
  assert.equal(nobody.code, 2);
  assert.match(nobody.data.error, /Git has no user\.email here/);
});

test('the script runs as a process: --help prints usage, and one JSON object comes out', async (t) => {
  const env = await install(t);
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', cwd: env.dir });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^usage: routine\.mjs create --cron <expr> --prompt <text> --agent claude\|codex/);
  assert.match(help.stdout, /routine\.mjs setup \[--dry-run\]\n\s+routine\.mjs signin --agent claude\|codex\n$/);
  const listed = spawnSync(process.execPath, [cli, 'ls'], { encoding: 'utf8', cwd: env.dir });
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout), { ok: true, installed: false, routines: [] });
  const bad = spawnSync(process.execPath, [cli, 'explode'], { encoding: 'utf8', cwd: env.dir });
  assert.equal(bad.status, 2);
  assert.equal(JSON.parse(bad.stdout).ok, false);
  assert.ok(new RoutineError(EXIT.input, 'x') instanceof CliError);
});
