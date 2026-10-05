// /routine's client, .agents/skills/routine/scripts/routine.mjs, against a fake Cloudflare over HTTP
// and a fake runner: the runner's real list and router on stand-in storage, with a stand-in for
// pi-ai. npm and wrangler never run, and the memory script's `member add` is a stand-in that keeps
// its contract: one new private file outside every repo, holding a real key for the id it was given.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { RoutineError, buildRoutine, defaultName, githubRemote, main, makerOf, refusalReason, runnerConfig } from '../../.agents/skills/routine/scripts/routine.mjs';
import { AI_RUN_TOKEN as RUN_TOKEN_GROUPS, ROUTINES_PROVISION, run as runTool } from '../../.agents/skills/routine/scripts/lib/cloudflare.mjs';
import { EXIT, PaseoError, parseCommand } from '../../.agents/skills/routine/scripts/lib/paseo.mjs';
import { MACHINE_ID } from '../../.agents/skills/memory/scripts/lib/machine-id.mjs';
import { newKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { GATEWAY, SHORTLIST } from '../routine-runner/models.mjs';
import { API_VERSION } from '../routine-runner/routines.mjs';
import { memoryMachine } from '../routine-runner/run.mjs';
import { ACCOUNT, TOKEN, fakeCloudflare } from './fixtures/cloudflare.mjs';
import { AI_RUN_TOKEN, CATALOG, KIMI, ROUTINES_KEY, fakeModels, fakeRunner } from './fixtures/routine-runner.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const cli = path.join(repoRoot, '.agents/skills/routine/scripts/routine.mjs');
const RUNNER = 'demo-routines';
const REMOTE = `https://${ACCOUNT}.artifacts.cloudflare.net/git/wongstack/demo.git`;
const MEMORY = 'wongm_memory-key-secret';
const PROJECT_KEY = 'github_pat_project-secret';
const ZAI_KEY = `${'0123456789abcdef'.repeat(2)}.PastedModelKeySecret`;
const CREATE = ['create', '--cron', '0 9 * * 1-5', '--prompt', '/improve', '--timezone', 'UTC'];
const SECRETS = `/accounts/${ACCOUNT}/workers/scripts/${RUNNER}/secrets`;
const ROUTINES = { worker: RUNNER, url: 'https://demo-routines.ada.workers.dev', accountId: ACCOUNT, route: 'artifacts', gateway: RUNNER };
const MEMORY_SCRIPT = path.join(repoRoot, '.agents/skills/memory/scripts/memory.mjs');
const MEMORY_STORE = { databaseId: 'uuid-demo-memory', worker: 'https://demo.ada.workers.dev/_memory' };
/** What setup records, without the id it made for the runs' memory key. */
const sansMemory = ({ memoryMachine: _id, ...rest } = {}) => rest;
const CLOUDFLARE_PICK = { via: 'cloudflare', provider: GATEWAY, model: KIMI, service: 'Cloudflare' };
const ZAI_PICK = { via: 'key', provider: 'zai', model: 'glm-5.3', service: 'Z.ai Coding Plan' };
// Monday 5 October 2026, 08:00 UTC.
const NOW = Date.parse('2026-10-05T08:00:00Z');

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();

/**
 * An install named "demo": a repo with the runner's pack folder, keys in an ignored .env, and an
 * install record. `route` is where its project lives. `installed` records the runner as already set
 * up, with this computer holding its key and the runner its model-only token; `picked` also puts a
 * Cloudflare model in use. `store: false` is an install with no memory store. Commands run
 * in-process, against a fake Cloudflare and a fake runner whose secrets are the ones the fake
 * Cloudflare holds for the runner's Worker. `memory.issued` lists each key the memory script's
 * stand-in was asked for; `memory.refuse` makes it fail as a token that can't issue keys does.
 */
async function install(t, { route = 'artifacts', installed = false, picked = false, paid = true, store = true, keys = {} } = {}) {
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
      memory: { accountId: ACCOUNT, database: 'demo-memory', ...(store ? MEMORY_STORE : {}) },
      ...(route === 'artifacts' ? { delivery: { route: 'artifacts', accountId: ACCOUNT, namespace: 'wongstack', repo: 'demo', remote: REMOTE } } : {}),
      ...(installed ? { routines: { ...ROUTINES, route } } : {}),
    },
  };
  writeFileSync(path.join(dir, '.claude/.wong-stack.json'), `${JSON.stringify(record, null, 2)}\n`);
  const env = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_MEMORY_TOKEN: MEMORY, ...(installed ? { WONG_ROUTINES_KEY: ROUTINES_KEY } : {}), ...keys };
  writeFileSync(path.join(dir, '.env'), Object.entries(env).map(([name, value]) => `${name}=${value}\n`).join(''));
  git(dir, 'add', '--all');
  git(dir, 'commit', '-q', '-m', 'init');

  const fake = await fakeCloudflare({ paid });
  t.after(fake.close);
  if (installed) {
    fake.state.workers.push(RUNNER);
    fake.state.workerSecrets[RUNNER] = { AI_RUN_TOKEN };
  }
  const runner = await fakeRunner({ config: { route } });
  t.after(runner.close);
  Object.defineProperty(runner.state, 'env', { get: () => fake.state.workerSecrets[RUNNER] ?? {} });
  if (picked) await runner.routines.choose({ via: 'cloudflare', model: KIMI });

  const ran = [];
  const memory = { issued: [], refuse: false };
  const exec = async (file, args, options = {}) => {
    if (file === process.execPath && args[0] === MEMORY_SCRIPT) {
      const keyFile = args[args.indexOf('--key-file') + 1];
      const asked = { args: args.slice(1), cwd: options.cwd, file: keyFile, mode: null, key: null };
      memory.issued.push(asked);
      for (let folder = path.dirname(keyFile); ; folder = path.dirname(folder)) {
        assert.equal(existsSync(path.join(folder, '.git')), false, 'the private file is outside every repo');
        if (path.dirname(folder) === folder) break;
      }
      writeFileSync(keyFile, '', { flag: 'wx', mode: 0o600 });
      asked.mode = statSync(path.dirname(keyFile)).mode & 0o077;
      if (memory.refuse) throw new Error('node exited with 1: CLOUDFLARE_API_TOKEN lacks D1 Write; widen the provisioning token and run again');
      asked.key = newKey(args[3]);
      writeFileSync(keyFile, `${JSON.stringify({ key: asked.key, machineId: args[3], ...MEMORY_STORE })}\n`, { mode: 0o600 });
      return { stdout: `Prepared member repository access for machine ${args[3]} in the private transfer file.\n`, stderr: '' };
    }
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
    dir, fake, runner, ran, memory, at, envFile, run: at(dir),
    record: () => JSON.parse(readFileSync(path.join(dir, '.claude/.wong-stack.json'), 'utf8')).components,
    addKey: (name, value) => writeFileSync(path.join(dir, '.env'), `${readFileSync(path.join(dir, '.env'), 'utf8')}${name}=${value}\n`),
    held: () => fake.state.workerSecrets[RUNNER] ?? {},
    stored: () => runner.storage.map.get('model') ?? null,
    calls: (prefix) => fake.calls.filter((call) => `${call.method} ${call.path}`.startsWith(prefix)),
  };
}

/** Asserts no key's value reached a command's output. */
function noSecret(text, env) {
  for (const value of [TOKEN, MEMORY, PROJECT_KEY, ZAI_KEY, ROUTINES_KEY, AI_RUN_TOKEN, env.envFile().WONG_ROUTINES_KEY, ...env.fake.state.minted, ...env.memory.issued.map((asked) => asked.key), ...Object.values(env.held())].filter(Boolean)) {
    assert.equal(text.includes(value), false, `a key's value was printed: ${text.slice(0, 200)}`);
  }
}

/** The rows of the table under `### <heading>` on the routines page: each group's name, scope, and id. */
function pageRows(heading) {
  const page = readFileSync(path.join(repoRoot, 'wiki/stack/cloud-routines.md'), 'utf8');
  const start = page.indexOf(`### ${heading}\n`);
  assert.notEqual(start, -1, `the routines page has no "${heading}" table`);
  const rows = page.slice(start).split('\n').slice(1);
  const next = rows.findIndex((line) => line.startsWith('#'));
  return rows.slice(0, next === -1 ? rows.length : next).filter((line) => line.startsWith('| `')).map((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replaceAll('`', ''));
    return { name: cells[0], scope: cells[1], id: cells.at(-1) };
  });
}

// ---------------------------------------------------------------------------
// Pure helpers

test('parseCommand reads values, booleans, and bare words, and refuses the rest with exit 2', () => {
  const options = { values: ['name'], booleans: { '--dry-run': 'dryRun' }, positional: true, unknown: (arg) => `Unknown flag ${arg}.` };
  assert.deepEqual(parseCommand(['pause', 'daily', '--name', '--odd', '--dry-run'], options), { command: 'pause', flags: { name: '--odd', dryRun: true }, positional: ['daily'] });
  const refused = (argv, message, extra = {}) => assert.throws(() => parseCommand(argv, { ...options, ...extra }), (error) => error instanceof PaseoError && error.code === EXIT.input && error.message === message);
  refused(['ls', '--nope'], 'Unknown flag --nope.');
  refused(['ls', '--name'], '--name needs a value.');
  refused(['ls', 'daily'], 'Unknown flag daily.', { positional: false });
  refused(['ls', 'constructor'], 'Unknown flag constructor.', { positional: false });
});

test('a routine is named for its prompt and the repo', () => {
  assert.equal(defaultName('/improve --audit-only', '/home/ada/demo'), 'improve demo');
  assert.equal(defaultName('  summarize the support inbox every week  ', '/home/ada/demo'), 'summarize the support inbox demo');
});

test('a routine runs as the git author here, with a short id of their email in any case', () => {
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

test('a create is checked here before anything is sent, and names no assistant and no model', () => {
  const maker = makerOf('ada@example.com', 'Ada');
  const good = { prompt: ' /improve ', cron: ' 0  9 * * 1-5 ', timezone: 'UTC', name: 'improve demo', keys: 'STRIPE_KEY, MAPS_KEY', maker };
  assert.deepEqual(buildRoutine(good), { name: 'improve demo', prompt: '/improve', cron: '0 9 * * 1-5', timezone: 'UTC', keys: ['STRIPE_KEY', 'MAPS_KEY'], maker });
  assert.deepEqual(buildRoutine({ ...good, keys: undefined, model: 'gpt-5.5', agent: 'claude' }).keys, []);
  const refused = (change, message, extra = {}) => assert.throws(() => buildRoutine({ ...good, ...change }), (error) => error.code === EXIT.input && message.test(error.message) && Object.entries(extra).every(([key, value]) => error.extra[key] === value), JSON.stringify(change));
  refused({ prompt: '  ' }, /prompt is empty/);
  refused({ cron: '0 9 * *' }, /Invalid cron "0 9 \* \*": field count/, { field: 'field count (4, expected 5)' });
  refused({ cron: '0 25 * * *' }, /hour/, { field: 'hour' });
  refused({ timezone: 'Mars/Olympus' }, /Unknown timezone/, { field: 'timezone' });
  refused({ keys: 'CLOUDFLARE_API_TOKEN' }, /can not be given CLOUDFLARE_API_TOKEN/);
  refused({ keys: 'WONG_ROUTINE_MODEL_KEY' }, /can not be given WONG_ROUTINE_MODEL_KEY/);
  refused({ keys: 'stripe key' }, /is not a key name/);
});

test('the runner\'s config is the template filled for the install, with no Artifacts binding on GitHub', () => {
  const template = readFileSync(path.join(repoRoot, 'scripts/routine-runner/wrangler.template.jsonc'), 'utf8');
  const artifacts = JSON.parse(runnerConfig({ account: ACCOUNT, runner: RUNNER, route: 'artifacts', remote: REMOTE, repo: 'demo', namespace: 'wongstack' }, template));
  assert.deepEqual([artifacts.name, artifacts.account_id, artifacts.containers[0].name, artifacts.workflows[0].name], [RUNNER, ACCOUNT, RUNNER, RUNNER]);
  assert.deepEqual(artifacts.artifacts, [{ binding: 'ARTIFACTS', namespace: 'wongstack' }]);
  assert.deepEqual(JSON.parse(artifacts.vars.WONG_ROUTINES), { account: ACCOUNT, route: 'artifacts', remote: REMOTE, repo: 'demo', gateway: RUNNER });
  const github = JSON.parse(runnerConfig({ account: ACCOUNT, runner: RUNNER, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo' }, template));
  assert.equal(github.artifacts, undefined);
  assert.deepEqual(JSON.parse(github.vars.WONG_ROUTINES), { account: ACCOUNT, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo', gateway: RUNNER });
  assert.throws(() => runnerConfig({ account: ACCOUNT, runner: RUNNER, route: 'github', remote: 'x', repo: 'y' }, `${template}\n"<new>"`), /routine runner's config has a placeholder this script does not fill: <new>/);
});

test('a refused model test is put in plain words by its status', () => {
  assert.deepEqual([401, 403, 402, 429, 404, 500, null].map(refusalReason), [
    'the service refused it', 'the service refused it', 'the account behind it has no credit left, or is over its limit', 'the account behind it has no credit left, or is over its limit',
    'the service does not list that model', 'the service answered HTTP 500', 'the service could not be reached',
  ]);
});

test('the permission groups match the tables on the routines page, and the model-only key holds no group that changes the account', () => {
  const plain = (rows) => rows.map(({ name, scope, id }) => ({ name, scope, id }));
  assert.deepEqual(pageRows('What the first routine adds to your token'), plain(ROUTINES_PROVISION));
  assert.deepEqual(pageRows('The model-only key'), plain(RUN_TOKEN_GROUPS));
  assert.deepEqual(RUN_TOKEN_GROUPS.map((row) => row.name), ['AI Gateway Run', 'Workers AI Read']);
  for (const row of RUN_TOKEN_GROUPS) {
    assert.doesNotMatch(row.name, /Write|Tokens|Billing|Workers Scripts|Containers/, `${row.name} is more than running a model`);
    assert.deepEqual(ROUTINES_PROVISION.find((each) => each.name === row.name), row, 'the person\'s token holds what it gives the key');
  }
});

// ---------------------------------------------------------------------------
// setup

test('setup --dry-run says what the first routine adds, the cost, and full permissions, and makes nothing', async (t) => {
  const env = await install(t, { route: 'github' });
  const { code, data } = await env.run('setup', '--dry-run');
  assert.equal(code, 0);
  assert.deepEqual([data.ok, data.dryRun, data.installed], [true, true, false]);
  assert.equal(data.adds.length, 6);
  assert.match(data.adds.join(' '), /keeps the list of routines and the clock.*short-lived cloud computer.*gateway to Cloudflare's AI models.*can only run models.*private key.*memory key made only for runs.*never your private facts or chats.*Workers Containers Write, Billing Read, AI Gateway Write, AI Gateway Run, Workers AI Read/);
  assert.match(data.cost, /about \$5 a month/);
  assert.match(data.fullPermissions, /full permissions/);
  assert.deepEqual([env.fake.calls.length, env.runner.state.calls.length, env.ran.length], [0, 0, 0]);
  assert.equal(env.record().routines, undefined);
  assert.equal((await (await install(t, { installed: true })).run('setup', '--dry-run')).data.installed, true);
});

test('with no Cloudflare account, setup and a first routine stop with exit 3 and add nothing', async (t) => {
  const noToken = await install(t);
  writeFileSync(path.join(noToken.dir, '.env'), `CLOUDFLARE_ACCOUNT_ID=${ACCOUNT}\n`);
  const tokenless = await noToken.run('setup');
  assert.deepEqual([tokenless.code, tokenless.data.needs, tokenless.data.keys], [3, 'cloudflare', ['CLOUDFLARE_API_TOKEN']]);
  assert.match(tokenless.data.error, /CLOUDFLARE_API_TOKEN is not in this install's \.env/);

  const bare = await install(t);
  writeFileSync(path.join(bare.dir, '.claude/.wong-stack.json'), '{}\n');
  writeFileSync(path.join(bare.dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\n`);
  const accountless = await bare.run('setup');
  assert.deepEqual([accountless.code, accountless.data.needs], [3, 'cloudflare']);
  assert.match(accountless.data.error, /records no Cloudflare account/);
  const first = await bare.run(...CREATE);
  assert.deepEqual([first.code, first.data.needs], [3, 'cloudflare'], 'a first routine says the same');
  assert.deepEqual((await bare.run('ls')).data, { ok: true, installed: false, routines: [] });
  writeFileSync(path.join(bare.dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\nCLOUDFLARE_ACCOUNT_ID=${ACCOUNT}\n`);
  const unnamed = await bare.run('setup');
  assert.deepEqual([unnamed.code, unnamed.data.needs], [3, 'cloudflare']);
  assert.match(unnamed.data.error, /has not been set up on Cloudflare yet/);
  for (const env of [noToken, bare]) {
    assert.deepEqual([env.ran, env.fake.state.workers, env.fake.state.gateways, env.fake.state.puts], [[], [], [], []]);
    assert.equal(env.record()?.routines, undefined);
  }
});

test('setup stops, naming what is wrong, before anything is made for a project it can not run from or keys it can not keep', async (t) => {
  const elsewhere = await install(t, { route: 'github' });
  git(elsewhere.dir, 'remote', 'set-url', 'origin', 'https://gitlab.com/ada/demo.git');
  const foreign = await elsewhere.run('setup');
  assert.deepEqual([foreign.code, foreign.data.error], [2, 'This project has no GitHub or Cloudflare repository to run from: `origin` is not a GitHub address.']);
  assert.deepEqual(elsewhere.ran, []);

  const exposed = await install(t);
  writeFileSync(path.join(exposed.dir, '.gitignore'), '');
  const unsafe = await exposed.run('setup');
  assert.equal(unsafe.code, 2);
  assert.match(unsafe.data.error, /\.env is not git-ignored .* no key was saved/);
  assert.equal(exposed.record().routines, undefined);
});

test('on a free account setup stops with the cost, and nothing is added or recorded', async (t) => {
  const env = await install(t, { route: 'github', paid: false });
  const { code, data } = await env.run('setup');
  assert.equal(code, 3);
  assert.deepEqual([data.ok, data.code, data.needs, data.cost, data.upgrade], [false, 3, 'paid-plan', 'about $5 a month', `https://dash.cloudflare.com/${ACCOUNT}/workers/plans`]);
  assert.match(data.error, /need Cloudflare's paid plan.*Nothing was added/);
  assert.deepEqual(data.granted, ROUTINES_PROVISION.map((row) => row.name), 'the token gained only what reads the plan and what a routine needs');
  const first = await env.run(...CREATE);
  assert.deepEqual([first.code, first.data.needs, first.data.cost], [3, 'paid-plan', 'about $5 a month'], 'a first routine on a free account says the same, and makes no routine');
  assert.deepEqual([env.fake.state.workers, env.fake.state.gateways, env.fake.state.accountTokens, env.ran], [[], [], [], []]);
  assert.equal(existsSync(path.join(env.dir, 'scripts/routine-runner/wrangler.jsonc')), false);
  assert.equal(env.envFile().WONG_ROUTINES_KEY, undefined);
  assert.equal(env.record().routines, undefined);
  assert.deepEqual(env.runner.state.calls, []);
});

test('the first setup installs the runner from the pack\'s pinned tools, makes the gateway and its model-only key, stores the keys, and records it last', async (t) => {
  const env = await install(t);
  const { code, data, text } = await env.run('setup');
  assert.equal(code, 0, text);
  assert.deepEqual([data.ok, sansMemory(data.routines), data.plan, data.needs, data.todo], [true, ROUTINES, 'Workers Paid', undefined, undefined]);
  assert.deepEqual(data.created, ['scripts/routine-runner/wrangler.jsonc', `AI Gateway ${RUNNER}`, `model-only key ${RUNNER}-ai`, 'memory key for runs', 'WONG_ROUTINES_KEY in .env']);
  assert.deepEqual(data.updated, [`routine runner ${RUNNER}`, '.claude/.wong-stack.json components.routines']);
  assert.deepEqual(data.granted, ROUTINES_PROVISION.map((row) => row.name));
  assert.deepEqual(env.record().routines, data.routines, 'the install record names the Worker, its address, and the runs\' memory id');

  const folder = path.join(env.dir, 'scripts/routine-runner');
  const config = JSON.parse(readFileSync(path.join(folder, 'wrangler.jsonc'), 'utf8'));
  assert.deepEqual([config.name, config.artifacts[0].namespace, JSON.parse(config.vars.WONG_ROUTINES).remote, JSON.parse(config.vars.WONG_ROUTINES).gateway], [RUNNER, 'wongstack', REMOTE, RUNNER]);
  assert.deepEqual(env.ran.map((tool) => [tool.file, tool.cwd]), [['npm', folder], ['npx', folder]]);
  assert.deepEqual(env.ran[0].args, ['ci', '--no-audit', '--no-fund', '--ignore-scripts']);
  assert.deepEqual(env.ran[1].args, ['--no-install', 'wrangler', 'deploy', '--config', 'wrangler.jsonc']);
  assert.deepEqual(env.ran.map((tool) => tool.token), [false, true], 'only the deploy gets the token, in its environment');

  assert.deepEqual(env.fake.state.gateways.map((gateway) => [gateway.id, gateway.authentication, gateway.collect_logs]), [[RUNNER, true, false]], 'the gateway takes only requests that carry a key, and keeps no log of them');
  const [minted] = env.fake.state.accountTokens;
  assert.equal(minted.name, `${RUNNER}-ai`);
  assert.deepEqual(minted.policies, [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: RUN_TOKEN_GROUPS.map((row) => ({ id: row.id })) }], 'the key a run holds can run models on this account, and nothing else');
  const key = env.envFile().WONG_ROUTINES_KEY;
  assert.match(key, /^[A-Za-z0-9_-]{43}$/, '32 random bytes');
  const [asked] = env.memory.issued;
  assert.deepEqual(env.held(), { ROUTINES_KEY: key, AI_RUN_TOKEN: env.fake.state.minted[0], MEMORY_TOKEN: asked.key });
  assert.equal(git(env.dir, 'status', '--porcelain', '--', 'scripts'), '', 'what setup generates is kept out of git');
  assert.match(readFileSync(path.join(env.dir, '.git/info/exclude'), 'utf8'), /^scripts\/routine-runner\/wrangler\.jsonc\nscripts\/routine-runner\/node_modules\/\nscripts\/routine-runner\/\.wrangler\/\n/m);
  noSecret(text, env);

  const again = await env.run('setup');
  assert.equal(again.code, 0);
  assert.deepEqual([again.data.created, again.data.granted], [[], []]);
  assert.deepEqual([env.memory.issued.length, again.data.routines.memoryMachine, env.held().MEMORY_TOKEN], [1, data.routines.memoryMachine, asked.key], 'while the runner holds the runs\' memory key, its id is reused and no key is issued');
  assert.equal(env.envFile().WONG_ROUTINES_KEY, key, 'a second setup keeps the key this computer holds');
  assert.deepEqual([env.held().ROUTINES_KEY, env.fake.state.minted.length, env.fake.state.gateways.length], [key, 1, 1], 'nothing is made twice');
  assert.equal(readFileSync(path.join(env.dir, '.git/info/exclude'), 'utf8').match(/routine-runner\/wrangler\.jsonc/g).length, 1);
});

test('a setup that fails midway records nothing here, and the next one finishes', async (t) => {
  const env = await install(t);
  env.fake.state.refuse = [`PUT ${SECRETS}`];
  const { code, data } = await env.run('setup');
  assert.equal(code, 4);
  assert.match(data.error, /Cloudflare did not take the change: Cloudflare PUT .*secrets: HTTP 500 1000\. Nothing was recorded; try again\./);
  assert.equal(env.envFile().WONG_ROUTINES_KEY, undefined);
  assert.equal(env.record().routines, undefined);
  assert.deepEqual(env.held(), {});
  assert.deepEqual(env.memory.issued, [], 'a stop before it issues no memory key');
  assert.equal((await env.run('ls')).data.installed, false);

  env.fake.state.refuse = [`POST /accounts/${ACCOUNT}/tokens`];
  assert.equal((await env.run('setup')).code, 4, 'a key that can not be made stops it too');
  assert.equal(env.record().routines, undefined);
  assert.equal(env.envFile().WONG_ROUTINES_KEY, undefined);

  env.fake.state.refuse = [];
  const done = await env.run('setup');
  assert.equal(done.code, 0, done.text);
  assert.equal(env.held().ROUTINES_KEY, env.envFile().WONG_ROUTINES_KEY);
  assert.deepEqual(sansMemory(env.record().routines), ROUTINES);
  assert.equal(env.fake.state.gateways.length, 1);
});

test('runs get a memory key of their own, made for a new id, and this install\'s own memory key is sent nowhere', async (t) => {
  const env = await install(t);
  const { code, data, text } = await env.run('setup');
  assert.equal(code, 0, text);
  const [asked] = env.memory.issued;
  const id = data.routines.memoryMachine;
  assert.match(id, MACHINE_ID);
  assert.deepEqual(asked.args, ['member', 'add', id, '--role', 'member', '--label', 'routine runs', '--key-file', asked.file], 'a member key: shared notes only');
  assert.equal(asked.cwd, env.dir);
  assert.deepEqual([path.isAbsolute(asked.file), asked.file.startsWith(`${path.dirname(env.dir)}${path.sep}`), asked.mode], [true, false, 0], 'the key file is in a folder only this user can open, outside the project');
  assert.deepEqual([existsSync(asked.file), existsSync(path.dirname(asked.file))], [false, false], 'the private file is gone afterwards, with its folder');
  assert.equal(memoryMachine(env.held().MEMORY_TOKEN), id, 'the runner holds the key of the id that is recorded, so a run\'s memory is filed under it');
  assert.equal(env.calls(`PUT ${SECRETS}`).filter((call) => call.body.includes(asked.key)).length, 1, 'the new key goes to Cloudflare once, as the runner\'s secret');
  for (const call of env.fake.calls) assert.equal(`${call.path}${call.body}`.includes(MEMORY), false, `this install's own memory key reached Cloudflare: ${call.method} ${call.path}`);
  assert.equal(env.envFile().CLOUDFLARE_MEMORY_TOKEN, MEMORY, 'and it stays as it was in .env');
  assert.equal(Object.values(env.held()).includes(MEMORY), false);
  noSecret(text, env);
});

test('a repeat setup issues the runs\' memory key again, for the same id, when the runner no longer holds it', async (t) => {
  const env = await install(t);
  const first = await env.run('setup');
  const id = first.data.routines.memoryMachine;
  delete env.fake.state.workerSecrets[RUNNER].MEMORY_TOKEN;
  const second = await env.run('setup');
  assert.equal(second.code, 0, second.text);
  assert.deepEqual(env.memory.issued.map((asked) => asked.args[2]), [id, id], 'the same id, so the earlier key ends and the runs keep their notes');
  assert.deepEqual([second.data.created, second.data.updated, second.data.routines.memoryMachine], [[], [`routine runner ${RUNNER}`, 'memory key for runs: new value sent to the routine runner'], id]);
  assert.equal(env.held().MEMORY_TOKEN, env.memory.issued[1].key);
  assert.notEqual(env.memory.issued[1].key, env.memory.issued[0].key);
  assert.equal(env.memory.issued.some((asked) => existsSync(asked.file)), false);

  // A runner that holds a memory key no record names, as a setup before this one could leave: it is replaced.
  const older = await install(t, { installed: true });
  older.fake.state.workerSecrets[RUNNER].MEMORY_TOKEN = MEMORY;
  const replaced = await older.run('setup');
  assert.equal(replaced.code, 0, replaced.text);
  assert.deepEqual([older.memory.issued.length, older.held().MEMORY_TOKEN, older.record().routines.memoryMachine], [1, older.memory.issued[0].key, older.memory.issued[0].args[2]]);
  assert.equal(replaced.text.includes(MEMORY), false);
  noSecret(second.text, env);
  noSecret(replaced.text, older);
});

test('with no memory store, or a token that can not issue a key, setup leaves a to-do and installs the rest', async (t) => {
  const bare = await install(t, { store: false });
  const none = await bare.run('setup');
  assert.equal(none.code, 0, none.text);
  assert.deepEqual([none.data.ok, none.data.todo, none.data.routines], [true, ['this install has no memory store, so a run leaves its note in its result, not in memory; add one with /wong-sync, then run setup again'], ROUTINES]);
  assert.deepEqual([bare.memory.issued, bare.held().MEMORY_TOKEN, bare.record().routines], [[], undefined, ROUTINES], 'nothing is issued, sent, or recorded for memory');
  assert.deepEqual(Object.keys(bare.held()), ['ROUTINES_KEY', 'AI_RUN_TOKEN'], 'the rest is installed');

  const env = await install(t);
  env.memory.refuse = true;
  const refused = await env.run('setup');
  assert.equal(refused.code, 0, refused.text);
  assert.deepEqual(refused.data.todo, ['no memory key could be made for runs, so a run leaves its note in its result, not in memory; the Cloudflare token here must be able to issue memory keys (wiki/development/memory-key.md), then run setup again']);
  assert.deepEqual([env.memory.issued.length, existsSync(env.memory.issued[0].file), existsSync(path.dirname(env.memory.issued[0].file))], [1, false, false], 'the private file a refused issue left is gone too');
  assert.deepEqual([env.held().MEMORY_TOKEN, env.record().routines, refused.data.created.includes('memory key for runs')], [undefined, ROUTINES, false]);
  const listed = await env.run('ls');
  assert.deepEqual([listed.code, listed.data.routines], [0, []], 'routines work without it');

  env.memory.refuse = false;
  const done = await env.run('setup');
  assert.deepEqual([done.code, done.data.todo, done.data.created], [0, undefined, ['memory key for runs']]);
  assert.equal(memoryMachine(env.held().MEMORY_TOKEN), env.record().routines.memoryMachine);
  for (const each of [bare, env]) for (const call of each.fake.calls) assert.equal(call.body.includes(MEMORY), false, 'no to-do sends this install\'s own memory key instead');
  noSecret(none.text, bare);
  noSecret(`${refused.text}${done.text}`, env);
});

test('a GitHub install drops the Artifacts binding and answers needs project-access until the project key is given', async (t) => {
  const env = await install(t, { route: 'github' });
  const first = await env.run('setup');
  assert.equal(first.code, 0, first.text);
  assert.deepEqual([first.data.needs, first.data.keys, first.data.routines.route], ['project-access', ['WONG_ROUTINE_GITHUB_TOKEN'], 'github']);
  const config = JSON.parse(readFileSync(path.join(env.dir, 'scripts/routine-runner/wrangler.jsonc'), 'utf8'));
  assert.equal(config.artifacts, undefined);
  assert.deepEqual(JSON.parse(config.vars.WONG_ROUTINES), { account: ACCOUNT, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo', gateway: RUNNER });
  assert.equal(env.held().GITHUB_TOKEN, undefined);
  const held = env.fake.state.policies.flatMap((policy) => policy.permission_groups.map((group) => group.id));
  for (const row of ROUTINES_PROVISION) assert.ok(held.includes(row.id), row.name);
  assert.equal(env.fake.state.puts.length, 1);
  await env.runner.routines.choose({ via: 'cloudflare', model: KIMI });
  const waiting = await env.run(...CREATE);
  assert.deepEqual([waiting.code, waiting.data.needs, waiting.data.keys], [3, 'project-access', ['WONG_ROUTINE_GITHUB_TOKEN']], 'and no routine is made meanwhile');
  assert.deepEqual((await env.run('ls')).data.routines, []);

  env.addKey('WONG_ROUTINE_GITHUB_TOKEN', PROJECT_KEY);
  const second = await env.run('setup');
  assert.deepEqual([second.data.needs, second.data.granted], [undefined, []]);
  assert.equal(env.held().GITHUB_TOKEN, PROJECT_KEY);
  assert.equal(env.fake.state.puts.length, 1, 'a token that holds every group is not widened again');
  assert.equal((await env.run(...CREATE)).code, 0);
  noSecret(`${first.text}${waiting.text}${second.text}`, env);
});

// ---------------------------------------------------------------------------
// create

test('create --dry-run shows the routine, who it runs as, its next run, and the model, and sends nothing before setup', async (t) => {
  const env = await install(t);
  const { code, data } = await env.run(...CREATE, '--dry-run');
  assert.equal(code, 0);
  assert.deepEqual(data.request, { name: 'improve demo', prompt: '/improve', cron: '0 9 * * 1-5', timezone: 'UTC', keys: [], maker: { id: 'b5fc85e55755', name: 'Ada', email: 'Ada@Example.com' } });
  assert.deepEqual([data.dryRun, data.installed, data.runsAs, data.nextRunAt, data.model], [true, false, { name: 'Ada', email: 'Ada@Example.com' }, '2026-10-05T09:00:00.000Z', null]);
  assert.deepEqual([data.adds.length, data.shortlist], [6, SHORTLIST], 'before setup the preview also says what the first routine adds, and which models it can ask about');
  assert.deepEqual([env.fake.calls.length, env.runner.state.calls.length, env.ran.length], [0, 0, 0]);

  const ready = await install(t, { installed: true, picked: true });
  const zoned = await ready.run('create', '--cron', '0 9 * * *', '--prompt', 'tidy up', '--dry-run');
  assert.deepEqual([zoned.data.request.timezone, zoned.data.adds, zoned.data.request.name, zoned.data.model, zoned.data.shortlist], [Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', undefined, 'tidy up demo', CLOUDFLARE_PICK, undefined]);
  assert.deepEqual(ready.runner.state.calls, ['GET /model'], 'the preview only reads');
  assert.deepEqual((await ready.run('ls')).data.routines, []);
});

test('the first routine installs the pieces, then asks which model with the shortlist, then is made', async (t) => {
  const env = await install(t);
  const first = await env.run(...CREATE);
  assert.deepEqual([first.code, first.data.ok, first.data.needs, first.data.shortlist], [3, false, 'model', SHORTLIST], first.text);
  assert.match(first.data.error, /No model is picked/);
  assert.deepEqual([sansMemory(first.data.setup.routines), first.data.setup.created.length], [ROUTINES, 5], 'the stop still names what the first routine added');
  assert.deepEqual(sansMemory(env.record().routines), ROUTINES);
  assert.deepEqual(env.fake.state.workers, [RUNNER]);
  assert.deepEqual((await env.run('ls')).data.routines, [], 'no routine exists until a model is picked');

  const picked = await env.run('model', KIMI);
  assert.deepEqual([picked.code, picked.data], [0, { ok: true, action: 'model', model: CLOUDFLARE_PICK }]);
  const made = await env.run(...CREATE);
  assert.equal(made.code, 0, made.text);
  assert.deepEqual([made.data.ok, made.data.version, made.data.setup, made.data.routine.name, made.data.routine.cadence, made.data.routine.maker], [true, undefined, undefined, 'improve demo', '0 9 * * 1-5 (UTC)', { name: 'Ada', email: 'Ada@Example.com' }]);
  assert.match(made.data.routine.nextRunAt, /^\d{4}-\d\d-\d\dT09:00:00\.000Z$/);
  assert.equal(env.ran.length, 2, 'the pieces are installed once');
  noSecret([first, picked, made].map((each) => each.text).join(''), env);
});

test('a routine\'s named keys go from .env to Cloudflare by name; a key that is not saved stops the create', async (t) => {
  const env = await install(t, { installed: true, picked: true, keys: { STRIPE_KEY: 'sk_live_stripe-secret' } });
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
  const env = await install(t, { installed: true, picked: true });
  const bad = await env.run('create', '--cron', '0 9 * *', '--prompt', '/improve');
  assert.deepEqual([bad.code, bad.data.ok, bad.data.code, bad.data.field], [2, false, 2, 'field count (4, expected 5)']);
  assert.equal((await env.run('create', '--cron', '0 9 * * *')).data.error, 'The prompt is empty.');
  assert.equal((await env.run(...CREATE, '--agent', 'claude')).data.error, 'Unknown flag --agent.', 'a routine names no assistant');
  assert.equal((await env.run(...CREATE)).code, 0);
  const clash = await env.run(...CREATE);
  assert.equal(clash.code, 2);
  assert.match(clash.data.error, /A routine named "improve demo" already exists/);
  assert.equal((await env.run(...CREATE, '--name', 'second one')).data.routine.name, 'second one');
});

// ---------------------------------------------------------------------------
// model

test('model with no id shows the shortlist, Cloudflare\'s list, and the model in use, and changes nothing', async (t) => {
  const fresh = await install(t);
  assert.deepEqual((await fresh.run('model')).data, { ok: true, installed: false, model: null, shortlist: SHORTLIST, models: [] });
  assert.deepEqual(fresh.runner.state.calls, []);

  const env = await install(t, { installed: true });
  const none = await env.run('model');
  assert.deepEqual([none.code, none.data], [0, { ok: true, installed: true, model: null, shortlist: SHORTLIST, models: CATALOG }]);
  await env.runner.routines.choose({ via: 'cloudflare', model: KIMI });
  assert.deepEqual((await env.run('model')).data.model, CLOUDFLARE_PICK);
  assert.deepEqual(env.runner.state.calls, ['GET /models', 'GET /models']);
});

test('a pick Cloudflare refuses stores nothing and says why; an accepted pick is put in use', async (t) => {
  const env = await install(t, { installed: true });
  env.runner.state.models = fakeModels({ accepts: ({ model }) => model.startsWith('workers-ai/'), status: 402, message: 'Add credit to your account to use this model.' });
  const refused = await env.run('model', 'claude-sonnet-5');
  assert.deepEqual([refused.code, refused.data.ok, refused.data.refused, refused.data.status, refused.data.said, refused.data.model], [2, false, true, 402, 'Add credit to your account to use this model.', null]);
  assert.match(refused.data.error, /^Cloudflare refused claude-sonnet-5: the account behind it has no credit left, or is over its limit\. A model like Claude or GPT needs credit loaded in your Cloudflare account, or your own key\. Routines keep the model they had\.$/);
  assert.equal(env.stored(), null, 'a refused pick stores nothing');

  const picked = await env.run('model', KIMI);
  assert.deepEqual([picked.code, picked.data], [0, { ok: true, action: 'model', model: CLOUDFLARE_PICK }]);
  assert.deepEqual(env.stored(), { use: 'cloudflare', cloudflare: KIMI, key: null });
  const second = await env.run('model', 'gpt-5.5');
  assert.deepEqual([second.code, second.data.model], [2, CLOUDFLARE_PICK], 'a refused pick never replaces a working one');
  assert.deepEqual(env.stored(), { use: 'cloudflare', cloudflare: KIMI, key: null });
  assert.deepEqual(env.runner.state.models.tested.map((each) => [each.provider, each.model, each.key]), [[GATEWAY, 'claude-sonnet-5', null], [GATEWAY, KIMI, null], [GATEWAY, 'gpt-5.5', null]], 'one test request a pick, through Cloudflare, with no key');
  assert.deepEqual(env.fake.calls, [], 'a pick asks nothing of the Cloudflare API from this computer');

  const unlisted = await env.run('model', 'workers-ai/@cf/no-such/model');
  assert.deepEqual([unlisted.code, unlisted.data.error], [2, 'Cloudflare lists no model "workers-ai/@cf/no-such/model".']);
  assert.equal((await (await install(t)).run('model', KIMI)).data.needs, 'setup', 'before the pieces are installed a pick asks for setup');
});

// ---------------------------------------------------------------------------
// key

test('key with no key saved asks for it by name; a shape nobody is known for asks which service', async (t) => {
  const env = await install(t, { installed: true, picked: true });
  const blank = await env.run('key');
  assert.deepEqual([blank.code, blank.data.needs, blank.data.keys], [3, 'model-key', ['WONG_ROUTINE_MODEL_KEY']]);
  assert.match(blank.data.error, /Send the key link for WONG_ROUTINE_MODEL_KEY/);

  env.addKey('WONG_ROUTINE_MODEL_KEY', 'a-key-of-no-known-shape');
  const unknown = await env.run('key');
  assert.deepEqual([unknown.code, unknown.data.needs, unknown.data.services.map((service) => service.provider)], [3, 'provider', ['anthropic', 'openrouter', 'openai', 'google', 'groq', 'xai', 'zai', 'deepseek', 'moonshotai']]);
  assert.match(unknown.data.error, /can't be told from its shape/);
  const outside = await env.run('key', '--provider', 'mistral');
  assert.deepEqual([outside.code, outside.data.error], [2, '"mistral" has no model set here. Say which model to use.']);
  assert.deepEqual([(await env.run('key', '--provider', 'openai-codex', '--model', 'gpt-6.1-sol')).data.needs, (await env.run('key', '--provider')).code], ['provider', 2]);
  assert.deepEqual([env.runner.state.calls, env.fake.calls, env.held().MODEL_KEY], [[], [], undefined], 'nothing was tested, sent, or stored');
  for (const answer of [blank, unknown, outside]) assert.equal(answer.text.includes('a-key-of-no-known-shape'), false);

  const fresh = await install(t, { keys: { WONG_ROUTINE_MODEL_KEY: ZAI_KEY } });
  assert.deepEqual([(await fresh.run('key')).code, (await fresh.run('key')).data.needs], [3, 'setup']);
});

test('a key its service refuses stores nothing, in Cloudflare or in the runner, and says so without the key', async (t) => {
  const env = await install(t, { installed: true, picked: true, keys: { WONG_ROUTINE_MODEL_KEY: ZAI_KEY } });
  env.runner.state.models = fakeModels({ accepts: () => false, status: 401, message: ({ key }) => `Invalid API key: ${key}` });
  const refused = await env.run('key');
  assert.deepEqual([refused.code, refused.data.ok, refused.data.refused, refused.data.tried], [2, false, true, [{ service: 'Z.ai Coding Plan', provider: 'zai', model: 'glm-5.3', status: 401, reason: 'the service refused it' }]]);
  assert.equal(refused.data.error, 'The key was refused: Z.ai Coding Plan, the service refused it. Nothing was stored, and routines keep the model they had.');
  assert.equal(env.held().MODEL_KEY, undefined);
  assert.deepEqual(env.fake.calls, [], 'a refused key never reaches Cloudflare\'s API');
  assert.deepEqual(env.stored(), { use: 'cloudflare', cloudflare: KIMI, key: null });
  assert.equal(refused.text.includes(ZAI_KEY), false);
  assert.deepEqual(env.runner.state.calls, ['POST /model/test']);
});

test('an accepted key is stored once, put in use, and named by its service and model, never by its value', async (t) => {
  const env = await install(t, { installed: true, picked: true, keys: { WONG_ROUTINE_MODEL_KEY: ZAI_KEY } });
  const { code, data, text } = await env.run('key');
  assert.equal(code, 0, text);
  assert.deepEqual(data, { ok: true, action: 'key', model: ZAI_PICK });
  assert.equal(env.held().MODEL_KEY, ZAI_KEY);
  assert.deepEqual(env.stored(), { use: 'key', cloudflare: KIMI, key: { provider: 'zai', model: 'glm-5.3' } });
  assert.equal(text.includes(ZAI_KEY), false);
  assert.deepEqual(env.runner.state.calls, ['POST /model/test', 'POST /model']);
  assert.deepEqual(env.runner.state.models.tested, [{ provider: 'zai', model: 'glm-5.3', key: ZAI_KEY }]);
  assert.equal(env.fake.calls.filter((call) => call.body.includes(ZAI_KEY)).length, 1, 'the key goes to Cloudflare once, as the Worker\'s secret');
  assert.deepEqual((await env.run(...CREATE)).code, 0, 'the next routine runs on it');
  assert.deepEqual((await env.run(...CREATE, '--name', 'preview', '--dry-run')).data.model, ZAI_PICK);
});

test('a key whose shape several services share is tried on each in order; --provider and --model override', async (t) => {
  const shared = 'sk-0123456789abcdef-shared-shape-secret';
  const env = await install(t, { installed: true, keys: { WONG_ROUTINE_MODEL_KEY: shared } });
  env.runner.state.models = fakeModels({ accepts: ({ provider }) => provider === 'deepseek' });
  const guessed = await env.run('key');
  assert.deepEqual([guessed.code, guessed.data.model], [0, { via: 'key', provider: 'deepseek', model: 'deepseek-v4-pro', service: 'DeepSeek' }]);
  assert.deepEqual(env.runner.state.models.tested.map((each) => each.provider), ['openai', 'deepseek']);

  env.runner.state.models = fakeModels();
  const named = await env.run('key', '--provider', 'moonshotai', '--model', 'kimi-k2.7-code');
  assert.deepEqual(named.data.model, { via: 'key', provider: 'moonshotai', model: 'kimi-k2.7-code', service: 'Moonshot AI' });
  assert.deepEqual(env.runner.state.models.tested, [{ provider: 'moonshotai', model: 'kimi-k2.7-code', key: shared }]);
  const outside = await env.run('key', '--provider', 'mistral', '--model', 'devstral-medium-latest');
  assert.deepEqual(outside.data.model, { via: 'key', provider: 'mistral', model: 'devstral-medium-latest', service: 'mistral' });
  for (const answer of [guessed, named, outside]) assert.equal(answer.text.includes(shared), false);

  env.fake.state.refuse = [`PUT ${SECRETS}`];
  const before = env.stored();
  const unstored = await env.run('key', '--provider', 'openai');
  assert.equal(unstored.code, 4, 'a key Cloudflare did not take is not put in use');
  assert.deepEqual(env.stored(), before);
  assert.equal(unstored.text.includes(shared), false);
});

test('key --remove deletes the stored key and returns to the last Cloudflare pick, or to no model', async (t) => {
  const env = await install(t, { installed: true, picked: true, keys: { WONG_ROUTINE_MODEL_KEY: ZAI_KEY } });
  await env.run('key');
  const removed = await env.run('key', '--remove');
  assert.deepEqual([removed.code, removed.data], [0, { ok: true, action: 'forget-key', model: CLOUDFLARE_PICK }]);
  assert.equal(env.held().MODEL_KEY, undefined);
  assert.equal(env.calls(`DELETE ${SECRETS}/MODEL_KEY`).length, 1);
  assert.equal(env.held().AI_RUN_TOKEN, AI_RUN_TOKEN, 'nothing else of the runner\'s is touched');
  assert.equal((await env.run('key', '--remove')).code, 0, 'removing a key that is not there is not an error');

  const keyOnly = await install(t, { installed: true, keys: { WONG_ROUTINE_MODEL_KEY: ZAI_KEY } });
  await keyOnly.run('key');
  const none = await keyOnly.run('key', '--remove');
  assert.deepEqual([none.code, none.data.model, none.data.needs, none.data.shortlist], [0, null, 'model', SHORTLIST]);
  assert.equal((await keyOnly.run(...CREATE)).data.needs, 'model');
});

// ---------------------------------------------------------------------------
// list and manage

test('routines are listed, changed, paused, resumed, run now, read, and deleted', async (t) => {
  const env = await install(t, { installed: true, picked: true });
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
  await env.runner.routines.finish(id, ran.data.run.runId, { status: 'ok', exitCode: 0, startupMs: 31_000, durationMs: 240_000, log: 'shipped one fix\n' });
  const logs = await env.run('logs', id);
  assert.deepEqual([logs.data.action, logs.data.log, logs.data.results.map((result) => result.status)], ['logs', 'shipped one fix', ['ok']]);
  const { lastRun } = (await env.run('ls')).data.routines[0];
  assert.deepEqual([lastRun.status, lastRun.startupMs, lastRun.durationMs], ['ok', 31_000, 240_000], 'the list shows the last result, with how long it took to start and to run');

  const deleted = await env.run('delete', 'improve demo');
  assert.deepEqual([deleted.data.action, deleted.data.routine], ['delete', { id, name: 'improve demo' }]);
  assert.deepEqual((await env.run('ls')).data.routines, []);
  assert.deepEqual(env.runner.state.calls.slice(-2), [`DELETE /routines/improve%20demo`, 'GET /routines']);
});

test('an ambiguous name changes nothing and lists the matching ids; bad input is exit 2', async (t) => {
  const env = await install(t, { installed: true, picked: true });
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
  assert.equal((await env.run('explode')).data.error, 'Unknown command "explode". Use create, ls, pause, resume, run, logs, change, delete, model, key, or setup.');
  assert.equal((await env.run('ls', '--force')).data.error, 'Unknown flag --force.');
  assert.equal(JSON.stringify([...env.runner.storage.map]), before);
});

// ---------------------------------------------------------------------------
// When the cloud cannot be reached

test('when the runner does not answer, nothing changes and the exit is 4', async (t) => {
  const env = await install(t, { installed: true, picked: true, keys: { WONG_ROUTINE_MODEL_KEY: ZAI_KEY } });
  for (const answer of [{ status: 500, body: 'Internal Server Error', type: 'text/plain' }, { status: 503, body: '{}' }, { status: 404, body: '' }]) {
    env.runner.state.answer = answer;
    const silent = await env.run('ls');
    assert.deepEqual([silent.code, silent.data.ok, silent.data.code], [4, false, 4], JSON.stringify(answer));
    assert.match(silent.data.error, /did not answer .*Nothing changed\. Try again/);
  }
  assert.match((await env.run('ls')).data.error, /not found, or this computer's key is not theirs/);
  // A key Cloudflare has not spread yet looks the same for a few seconds: the call is tried again.
  env.runner.state.answer = { status: 404, body: '', times: 2 };
  const settled = await env.run('ls');
  assert.deepEqual([settled.code, settled.data.ok, env.runner.state.answer], [0, true, null], 'two empty 404s, then the list');
  env.runner.state.answer = { status: 404, body: '' };
  for (const argv of [['model'], ['model', KIMI], ['key'], ['key', '--remove'], [...CREATE, '--dry-run']]) assert.equal((await env.run(...argv)).code, 4, argv.join(' '));
  assert.deepEqual([env.held().MODEL_KEY, env.fake.calls.length], [undefined, 0], 'a key is never stored for a runner that did not test it');
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
  assert.equal((await env.run('model', KIMI)).code, 5);
});

test('before setup the list is empty and every change asks for setup; a computer without the key asks too', async (t) => {
  const fresh = await install(t);
  assert.deepEqual((await fresh.run('ls')).data, { ok: true, installed: false, routines: [] });
  for (const argv of [['pause', 'x'], ['delete', 'x'], ['change', 'x', '--prompt', 'y'], ['logs', 'x'], ['key', '--remove']]) {
    const asked = await fresh.run(...argv);
    assert.deepEqual([asked.code, asked.data.needs, asked.data.adds.length], [3, 'setup', 6], argv.join(' '));
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

  const env = await install(t, { installed: true, picked: true });
  git(env.dir, 'config', 'user.email', '');
  const nobody = await env.run(...CREATE);
  assert.equal(nobody.code, 2);
  assert.match(nobody.data.error, /Git has no user\.email here/);
});

test('the script runs as a process: --help prints usage, and one JSON object comes out', async (t) => {
  const env = await install(t);
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', cwd: env.dir });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^usage: routine\.mjs create --cron <expr> --prompt <text> \[--name <n>\]/);
  assert.match(help.stdout, /routine\.mjs model \[<id>\]\n\s+routine\.mjs key \[--provider <id>\] \[--model <id>\]\n\s+routine\.mjs key --remove\n\s+routine\.mjs setup \[--dry-run\]\n$/);
  assert.doesNotMatch(help.stdout, /--agent|signin|paseo/i);
  const listed = spawnSync(process.execPath, [cli, 'ls'], { encoding: 'utf8', cwd: env.dir });
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout), { ok: true, installed: false, routines: [] });
  const bad = spawnSync(process.execPath, [cli, 'explode'], { encoding: 'utf8', cwd: env.dir });
  assert.equal(bad.status, 2);
  assert.equal(JSON.parse(bad.stdout).ok, false);
  assert.ok(new RoutineError(EXIT.input, 'x') instanceof PaseoError);
});
