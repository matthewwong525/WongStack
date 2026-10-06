// What one run of a routine does and is given: scripts/routine-runner/run.mjs against stand-ins for
// a Workflow's steps and a Sandbox. The published SDK ships no test fixtures.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GATEWAY } from '../routine-runner/models.mjs';
import {
  BOUNDS, NOTICE, PINS, agentCommand, bootstrap, holdings, keySecret, memoryMachine, missing, modelRefused, projectAccess, promptOf, redact, runRoutine, skillPromptOf, startupOf,
  verbOf,
} from '../routine-runner/run.mjs';
import { AI_RUN_TOKEN, KIMI, MAKER, PICKED, clock, sandbox, steps } from './fixtures/routine-runner.mjs';

const MACHINE = '6f1d2c3b-4a59-4e68-9b7a-0c1d2e3f4a5b';
const MEMORY = `wongm_${Buffer.from(`machine:${MACHINE}`).toString('base64url')}.${'m'.repeat(43)}`;
const ZAI_KEY = `${'0123456789abcdef'.repeat(2)}.PastedModelKeySecret`;
const PASTED = { via: 'key', provider: 'zai', model: 'glm-5.3' };
const ACCOUNT = 'a'.repeat(32);
const ARTIFACTS = { account: ACCOUNT, route: 'artifacts', remote: `https://${ACCOUNT}.artifacts.cloudflare.net/git/wongstack/demo.git`, repo: 'demo', gateway: 'demo-routines' };
const GITHUB = { account: ACCOUNT, route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo', gateway: 'demo-routines' };
// The Worker's secrets. The last four are what a run must never be handed, whatever its routine names.
const ENV = {
  AI_RUN_TOKEN,
  MODEL_KEY: ZAI_KEY,
  MEMORY_TOKEN: MEMORY,
  RUN_STRIPE_KEY: 'sk_live_stripe-secret',
  GITHUB_TOKEN: 'github_pat_project-secret',
  ROUTINES_KEY: 'routines-key-secret',
  CLOUDFLARE_API_TOKEN: 'cf-user-token-secret',
  CF_TOKEN: 'cf-deploy-token-secret',
  RUN_OTHER_KEY: 'another-routines-secret',
};
const NEVER = ['routines-key-secret', 'cf-user-token-secret', 'cf-deploy-token-secret', 'another-routines-secret'];
const TOOLS = { manifest: '{"name":"wongstack-routine-tools"}', lock: '{"lockfileVersion":3}' };
const routine = (overrides = {}) => ({ id: 'a1000000', name: 'improve demo', prompt: '/improve-code', keys: ['STRIPE_KEY'], maker: MAKER, ...overrides });
const ARTIFACTS_ACCESS = { user: 'x', token: 'art_v1_0123456789abcdef0123456789abcdef01234567' };
const basic = (user, token) => Buffer.from(`${user}:${token}`).toString('base64');
const GATEWAY_ENV = { CLOUDFLARE_API_KEY: AI_RUN_TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_GATEWAY_ID: 'demo-routines' };

/** One run on stand-ins. `free` is what the line for a computer answers, in order; the last answer repeats. */
async function runOn({ config = ARTIFACTS, env = ENV, box = sandbox(), free = [true], choice = PICKED, ...overrides } = {}) {
  const time = clock();
  const flow = steps(time);
  const asked = { take: 0, leave: 0, mint: 0 };
  const result = await runRoutine({
    routine: routine(overrides), runId: 'run-a1000000-x-0001', env, config, choice, tools: TOOLS, step: flow.step, now: time.now,
    sandbox: () => box.box,
    mint: async () => { asked.mint++; return `${ARTIFACTS_ACCESS.token}?expires=1790000000`; },
    slots: { take: async () => free[Math.min(asked.take++, free.length - 1)], leave: async () => { asked.leave++; return true; } },
  });
  return { result, flow, box, asked, time };
}

test('a run needs a model, what reaches it, and on GitHub the project key; there is no sign-in gate', () => {
  assert.equal(missing(ENV, ARTIFACTS, null), 'model');
  assert.equal(missing(ENV, ARTIFACTS, PICKED), null);
  assert.equal(missing(ENV, ARTIFACTS, PASTED), null);
  assert.equal(missing({ ...ENV, MODEL_KEY: undefined }, ARTIFACTS, PASTED), 'model-key', 'a pasted key in use but not stored');
  assert.equal(missing({ ...ENV, AI_RUN_TOKEN: undefined }, ARTIFACTS, PICKED), 'model-key', 'a Cloudflare pick with no model-only token');
  assert.equal(missing({ ...ENV, AI_RUN_TOKEN: undefined }, ARTIFACTS, PASTED), null, 'a pasted key needs nothing of Cloudflare\'s');
  assert.equal(missing(ENV, { ...ARTIFACTS, gateway: undefined }, PICKED), 'model-key');
  assert.equal(missing({ ...ENV, GITHUB_TOKEN: undefined }, GITHUB, PICKED), 'project-access');
  assert.equal(missing(ENV, GITHUB, PICKED), null);
  assert.equal(keySecret('STRIPE_KEY'), 'RUN_STRIPE_KEY');
});

test('the prompt is the fixed notice, then the routine\'s text unchanged', () => {
  const text = '  summarize the inbox\n\n"quoted" $HOME `x`  ';
  assert.equal(promptOf(routine({ prompt: text })), `${NOTICE}\n\n${text}`);
  assert.equal(NOTICE, 'This is a scheduled run and nobody can answer. Take the recommended option wherever you would ask, and mark it assumed. If that leaves something for the person, record it as a memory thread: when this project has `.agents/skills/memory/SKILL.md`, read it and write one fact tagged `routine` through its write gate, leaving `session` out of the JSON because a scheduled run has no chat session, and check the script answers `stored`; when it has none, end your reply with what is left. If nothing is left, do neither.');
});

test('a prompt that starts with a verb names its skill file, and the rest of the prompt follows', () => {
  assert.deepEqual(verbOf('/improve-code'), { name: 'improve-code', rest: '' });
  assert.deepEqual(verbOf('/improve-code --audit-only\nthe billing page'), { name: 'improve-code', rest: '--audit-only\nthe billing page' });
  assert.deepEqual(verbOf('  /wong-sync  '), { name: 'wong-sync', rest: '' });
  for (const prompt of ['improve', 'please /improve', '/', '/Improve', '/../../etc/passwd', '/improve/..', '/a b/c', undefined]) {
    const verb = verbOf(prompt);
    assert.ok(verb === null || /^[a-z][a-z0-9-]*$/.test(verb.name), `${prompt} names no path`);
  }
  assert.equal(verbOf('improve'), null);
  assert.equal(verbOf('/../../etc/passwd'), null);
  assert.equal(skillPromptOf(routine({ prompt: '/improve-code' })), `${NOTICE}\n\nRead \`.agents/skills/improve-code/SKILL.md\` and follow it.`);
  assert.equal(skillPromptOf(routine({ prompt: '/improve-code --audit-only' })), `${NOTICE}\n\nRead \`.agents/skills/improve-code/SKILL.md\` and follow it.\n\n--audit-only`);
  assert.equal(skillPromptOf(routine({ prompt: 'find news about our competitors' })), null);
});

test('a routine made under a skill\'s old name runs the renamed skill, the rest of its prompt unchanged', () => {
  assert.deepEqual(verbOf('/improve'), { name: 'improve-code', rest: '' });
  assert.deepEqual(verbOf('/dream --dry-run'), { name: 'dream-memory', rest: '--dry-run' });
  assert.deepEqual(verbOf('/improve-code'), { name: 'improve-code', rest: '' }, 'the new name is not mapped twice');
  assert.deepEqual(verbOf('/constructor'), { name: 'constructor', rest: '' }, 'only a listed name is mapped');
  assert.equal(skillPromptOf(routine({ prompt: '/improve --audit-only' })), `${NOTICE}\n\nRead \`.agents/skills/improve-code/SKILL.md\` and follow it.\n\n--audit-only`);
  assert.equal(skillPromptOf(routine({ prompt: '/dream' })), `${NOTICE}\n\nRead \`.agents/skills/dream-memory/SKILL.md\` and follow it.`);
  const held = holdings({ routine: routine({ prompt: '/improve' }), env: ENV, config: ARTIFACTS, access: ARTIFACTS_ACCESS, choice: PICKED });
  assert.equal(held.agent.WONG_SKILL, 'improve-code', 'the run names the skill that ran');
  assert.equal(held.agent.WONG_PROMPT, `${NOTICE}\n\n/improve`, 'the stored prompt is kept as typed');
});

test('a run on a Cloudflare pick is given the gateway\'s three names with the model-only token, this one project, the memory key and its named keys, and nothing else', () => {
  const held = holdings({ routine: routine(), env: ENV, config: ARTIFACTS, access: ARTIFACTS_ACCESS, choice: PICKED });
  const header = `Authorization: Basic ${basic('x', ARTIFACTS_ACCESS.token)}`;
  const git = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `http.${ARTIFACTS.remote}.extraHeader`, GIT_CONFIG_VALUE_0: header, GIT_TERMINAL_PROMPT: '0' };
  assert.deepEqual(held.bootstrap, {
    ...git, WONG_REMOTE: ARTIFACTS.remote, WONG_AUTHOR_NAME: 'Ada', WONG_AUTHOR_EMAIL: 'ada@example.com',
    WONG_ENV_FILE: `CLOUDFLARE_MEMORY_TOKEN=${MEMORY}\nSTRIPE_KEY=sk_live_stripe-secret\n`, WONG_MACHINE_ID: MACHINE,
  });
  assert.deepEqual(held.agent, {
    ...git, ...GATEWAY_ENV, WONG_PROVIDER: GATEWAY, WONG_MODEL: KIMI, WONG_PROMPT: `${NOTICE}\n\n/improve-code`,
    WONG_SKILL: 'improve-code', WONG_SKILL_PROMPT: `${NOTICE}\n\nRead \`.agents/skills/improve-code/SKILL.md\` and follow it.`, PI_SKIP_VERSION_CHECK: '1', PI_TELEMETRY: '0',
  });
  const given = JSON.stringify([held.bootstrap, held.agent]);
  for (const secret of [...NEVER, ZAI_KEY]) assert.equal(given.includes(secret), false, `a run was handed ${secret}`);
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CF_TOKEN', 'ROUTINES_KEY', 'MODEL_KEY', 'ZAI_API_KEY']) assert.equal(given.includes(name), false, name);
  assert.deepEqual(held.secrets.map((secret) => secret.name), ['CLOUDFLARE_API_KEY', 'PROJECT_ACCESS', 'PROJECT_ACCESS', 'CLOUDFLARE_MEMORY_TOKEN', 'STRIPE_KEY']);
  assert.equal(held.secrets[0].value, AI_RUN_TOKEN);
});

test('a run on a pasted key is given that key under its service\'s own name, and none of Cloudflare\'s', () => {
  const held = holdings({ routine: routine({ prompt: 'find news about our competitors' }), env: ENV, config: ARTIFACTS, access: ARTIFACTS_ACCESS, choice: PASTED });
  assert.deepEqual([held.agent.ZAI_API_KEY, held.agent.WONG_PROVIDER, held.agent.WONG_MODEL], [ZAI_KEY, 'zai', 'glm-5.3']);
  for (const name of ['CLOUDFLARE_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_GATEWAY_ID', 'WONG_SKILL', 'WONG_SKILL_PROMPT']) assert.equal(name in held.agent, false, name);
  assert.equal(JSON.stringify(held.agent).includes(AI_RUN_TOKEN), false);
  assert.deepEqual(held.secrets[0], { name: 'ZAI_API_KEY', value: ZAI_KEY });
  const subscription = holdings({ routine: routine(), env: { ...ENV, MODEL_KEY: 'sk-ant-oat01-subscription-secret' }, config: ARTIFACTS, access: ARTIFACTS_ACCESS, choice: { via: 'key', provider: 'anthropic', model: 'claude-sonnet-5' } });
  assert.equal(subscription.agent.ANTHROPIC_OAUTH_TOKEN, 'sk-ant-oat01-subscription-secret');
  assert.equal('ANTHROPIC_API_KEY' in subscription.agent, false);
});

test('on GitHub the project key is also the run\'s gh login; a key the routine names but nobody stored is left out', () => {
  const held = holdings({ routine: routine({ keys: ['STRIPE_KEY', 'MISSING_KEY'] }), env: { ...ENV, MEMORY_TOKEN: undefined }, config: GITHUB, access: { user: 'x-access-token', token: ENV.GITHUB_TOKEN }, choice: PICKED });
  assert.equal(held.agent.GH_TOKEN, ENV.GITHUB_TOKEN);
  assert.equal(held.agent.GIT_CONFIG_KEY_0, 'http.https://github.com/ada/demo.git.extraHeader', 'git sends the key to this project\'s address only');
  assert.equal(held.agent.GIT_CONFIG_VALUE_0, `Authorization: Basic ${basic('x-access-token', ENV.GITHUB_TOKEN)}`);
  assert.deepEqual([held.bootstrap.WONG_ENV_FILE, held.bootstrap.WONG_MACHINE_ID], ['STRIPE_KEY=sk_live_stripe-secret\n', '']);
});

test('the .env a run writes quotes a value the way dotenv reads it back', () => {
  const env = { ...ENV, RUN_PLAIN: 'abc-123', RUN_SPACED: 'two words', RUN_QUOTED: 'it\'s', RUN_LINES: 'one\ntwo' };
  const file = holdings({ routine: routine({ keys: ['PLAIN', 'SPACED', 'QUOTED', 'LINES'] }), env, config: ARTIFACTS, access: ARTIFACTS_ACCESS, choice: PICKED }).bootstrap.WONG_ENV_FILE;
  assert.equal(file, `CLOUDFLARE_MEMORY_TOKEN=${MEMORY}\nPLAIN=abc-123\nSPACED='two words'\nQUOTED="it's"\nLINES="one\\ntwo"\n`);
});

test('a memory key names the installation it was issued to, and anything else names none', () => {
  assert.equal(memoryMachine(MEMORY), MACHINE);
  for (const token of [undefined, '', 'wongm_bad', `wongm_${Buffer.from('admin').toString('base64url')}.${'m'.repeat(43)}`, `wongm_!!!!.${'m'.repeat(43)}`]) assert.equal(memoryMachine(token), null, String(token));
});

test('project access is the stored GitHub token, or a fresh key for the one Artifacts repository', async () => {
  assert.deepEqual(await projectAccess(GITHUB, ENV, () => assert.fail('GitHub needs no minted key')), { user: 'x-access-token', token: ENV.GITHUB_TOKEN });
  assert.deepEqual(await projectAccess(ARTIFACTS, ENV, async () => 'art_v1_abc?expires=1790000000'), { user: 'x', token: 'art_v1_abc' });
});

test('every held value is replaced by its name in saved output, the longest first', () => {
  const secrets = [{ name: 'SHORT', value: 'abc' }, { name: 'LONG', value: 'abcdef' }, { name: 'EMPTY', value: '' }];
  assert.equal(redact('abcdef abc xyz', secrets), '[LONG] [SHORT] xyz');
  assert.equal(redact(undefined, secrets), '');
});

test('the tools a run installs are the ones the runner\'s own locked list names, at exact versions', () => {
  for (const pin of Object.values(PINS)) assert.match(pin, /(^|@)\d+\.\d+\.\d+$/, `${pin} is not one exact version`);
  const folder = new URL('../routine-runner/tools/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('package.json', folder), 'utf8'));
  const lock = JSON.parse(readFileSync(new URL('package-lock.json', folder), 'utf8'));
  assert.deepEqual(Object.entries(manifest.dependencies).map(([name, version]) => `${name}@${version}`), [PINS.pi, PINS.openspec]);
  assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
  for (const [name, version] of Object.entries(manifest.dependencies)) assert.equal(lock.packages[`node_modules/${name}`]?.version, version, `the lockfile locks another ${name}`);
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (key && !entry.link) assert.ok(entry.integrity && entry.resolved?.startsWith('https://registry.npmjs.org/'), `${key} is not integrity-checked from the registry`);
  }
  assert.equal(lock.packages['node_modules/@earendil-works/pi-coding-agent'].bin.pi, 'dist/bundle/cli.js');
});

test('the bootstrap is fixed text for each install route: the project, then npm ci from the runner\'s own list', () => {
  const artifacts = bootstrap('artifacts');
  const github = bootstrap('github');
  for (const script of [artifacts, github]) {
    assert.match(script, /^set -eu\n/);
    assert.match(script, /git clone -q "\$WONG_REMOTE" \/workspace\/project\n/);
    assert.match(script, /git config user\.name "\$WONG_AUTHOR_NAME"\ngit config user\.email "\$WONG_AUTHOR_EMAIL"\n/);
    assert.match(script, /printf '%s' "\$WONG_ENV_FILE" > \.env\n/);
    assert.match(script, /machine-id"\n/);
    assert.ok(script.includes('cp /workspace/wong-tools-package.json /workspace/tools/package.json\ncp /workspace/wong-tools-package-lock.json /workspace/tools/package-lock.json\ncd /workspace/tools\nnpm ci --no-audit --no-fund --ignore-scripts\n'));
    assert.doesNotMatch(script, /npm install/, 'nothing is installed outside the locked list');
    assert.match(script, /echo "WONG_STARTUP clone=\$\(\(cloned - began\)\) tools=\$\(\(\$\(clock\) - cloned\)\)"\n/);
    assert.match(script, /echo "WONG_BOOTSTRAPPED \$\(git -C \/workspace\/project rev-parse HEAD\)"\n$/);
  }
  assert.equal(artifacts.includes('gh_'), false, 'an Artifacts install has no GitHub tool');
  assert.ok(github.includes(`releases/download/v${PINS.gh}/gh_${PINS.gh}_linux_amd64.tar.gz`));
  assert.equal(github.replace(/curl .*\ninstall .*\n/, ''), artifacts, 'the routes differ only by the GitHub tool');
  assert.throws(() => bootstrap('gitlab'), /no bootstrap/);
  assert.deepEqual(startupOf('cloning\nWONG_STARTUP clone=2010 tools=23400\nWONG_BOOTSTRAPPED abc\n'), { cloneMs: 2010, toolsMs: 23_400 });
  for (const output of ['', undefined, 'WONG_STARTUP clone=x tools=1', 'said WONG_STARTUP clone=1 tools=2']) assert.equal(startupOf(output), null, String(output));
});

test('the assistant is pi -p on the chosen provider and model, with full permissions, and its prompt reaches it only as a quoted variable', () => {
  const script = agentCommand();
  assert.match(script, /\nexec pi -p --approve --no-session --provider "\$WONG_PROVIDER" --model "\$WONG_MODEL" -- "\$prompt"\n$/);
  assert.match(script, /\nexport PATH="\/workspace\/tools\/node_modules\/\.bin:\$PATH"\n/);
  assert.ok(script.includes('prompt="$WONG_PROMPT"\nif [ -n "${WONG_SKILL:-}" ] && [ -f ".agents/skills/$WONG_SKILL/SKILL.md" ]; then\n  prompt="$WONG_SKILL_PROMPT"\nfi\n'), 'the skill\'s prompt is used only when this copy of the project holds the skill\'s file');
  for (const text of [script, bootstrap('github')]) {
    for (const leaked of ['/improve', KIMI, 'glm-5.3', GATEWAY]) assert.equal(text.includes(leaked), false, leaked);
  }
});

test('a run readies a fresh computer, runs the assistant, and returns how it ended and how long it took to start', async () => {
  const box = sandbox({ bootstrap: { exitCode: 0, stdout: 'WONG_STARTUP clone=2010 tools=23400\nWONG_BOOTSTRAPPED abc\n', stderr: '' } });
  const { result, flow, asked } = await runOn({ box });
  assert.deepEqual(result, { startedAt: Date.parse('2026-10-05T08:00:00Z'), startupMs: 0, startup: { cloneMs: 2010, toolsMs: 23_400 }, durationMs: 40_000, exitCode: 0, status: 'ok', log: 'done' });
  assert.deepEqual(flow.names(), ['slot-0', 'started', 'bootstrap', 'agent', 'agent-started', 'wait-0', 'poll-0', 'wait-1', 'poll-1', 'log', 'ended', 'destroy', 'leave']);
  const [exec] = box.called('exec');
  assert.equal(exec.command, 'bash /workspace/wong-bootstrap.sh');
  assert.equal(box.files['/workspace/wong-bootstrap.sh'], bootstrap('artifacts'));
  assert.equal(box.files['/workspace/wong-agent.sh'], agentCommand());
  assert.deepEqual([box.files['/workspace/wong-tools-package.json'], box.files['/workspace/wong-tools-package-lock.json']], [TOOLS.manifest, TOOLS.lock], 'the runner writes its own locked list into the computer');
  assert.equal(exec.options.env.WONG_REMOTE, ARTIFACTS.remote);
  const [started] = box.called('startProcess');
  assert.deepEqual([started.command, started.options.cwd, started.options.processId, started.options.autoCleanup], ['bash /workspace/wong-agent.sh', '/workspace/project', 'run-a1000000-x-0001', false]);
  assert.deepEqual([started.options.env.WONG_PROVIDER, started.options.env.WONG_MODEL, started.options.env.CLOUDFLARE_API_KEY], [GATEWAY, KIMI, AI_RUN_TOKEN]);
  assert.equal(box.called('destroy').length, 1, 'nothing of the computer is left');
  assert.deepEqual(asked, { take: 1, leave: 1, mint: 3 });
  const stepOf = (name) => flow.done.find((step) => step.name === name);
  assert.deepEqual(stepOf('bootstrap').config, { retries: { limit: 0, delay: '1 second' }, timeout: '8 minutes' });
  assert.deepEqual(stepOf('agent').config, { retries: { limit: 0, delay: '1 second' } });
});

test('start-up time runs from the computer starting to the assistant starting', async () => {
  const time = clock();
  const flow = steps(time);
  const box = sandbox();
  const exec = box.box.exec;
  box.box.exec = async (...args) => { time.advance(31_000); return exec(...args); };
  const result = await runRoutine({
    routine: routine(), runId: 'run-a1000000-x-0002', env: ENV, config: ARTIFACTS, choice: PASTED, tools: TOOLS, step: flow.step, now: time.now,
    sandbox: () => box.box, mint: async () => ARTIFACTS_ACCESS.token, slots: { take: async () => true, leave: async () => true },
  });
  assert.deepEqual([result.status, result.startupMs, result.startup, result.durationMs], ['ok', 31_000, null, 71_000]);
});

test('a run that prints everything it holds leaves no value in its result or in any stored step', async () => {
  const header = basic('x-access-token', ENV.GITHUB_TOKEN);
  const dump = `ZAI_API_KEY=${ZAI_KEY}\nGH_TOKEN=${ENV.GITHUB_TOKEN}\nGIT_CONFIG_VALUE_0=Authorization: Basic ${header}\n$ cat .env\nCLOUDFLARE_MEMORY_TOKEN=${MEMORY}\nSTRIPE_KEY=${ENV.RUN_STRIPE_KEY}\n`;
  const box = sandbox({ bootstrap: { exitCode: 0, stdout: `cloning with ${ENV.GITHUB_TOKEN}\n`, stderr: '' }, output: dump, errors: `warn ${ZAI_KEY}\n` });
  const { result, flow } = await runOn({ config: GITHUB, box, choice: PASTED });
  assert.equal(result.status, 'ok');
  assert.equal(result.log, `ZAI_API_KEY=[ZAI_API_KEY]\nGH_TOKEN=[PROJECT_ACCESS]\nGIT_CONFIG_VALUE_0=Authorization: Basic [PROJECT_ACCESS]\n$ cat .env\nCLOUDFLARE_MEMORY_TOKEN=[CLOUDFLARE_MEMORY_TOKEN]\nSTRIPE_KEY=[STRIPE_KEY]\n\nwarn [ZAI_API_KEY]`);
  const kept = `${JSON.stringify(result)}${flow.stored()}`;
  for (const secret of [ZAI_KEY, ENV.GITHUB_TOKEN, header, MEMORY, ENV.RUN_STRIPE_KEY, AI_RUN_TOKEN, ...NEVER]) assert.equal(kept.includes(secret), false, `${secret} was kept`);
  assert.ok(flow.stored().includes('cloning with [PROJECT_ACCESS]'), 'the bootstrap\'s output is redacted inside its own step');

  const picked = await runOn({ box: sandbox({ output: `CLOUDFLARE_API_KEY=${AI_RUN_TOKEN}\n` }) });
  assert.equal(picked.result.log, 'CLOUDFLARE_API_KEY=[CLOUDFLARE_API_KEY]');
  assert.equal(`${JSON.stringify(picked.result)}${picked.flow.stored()}`.includes(AI_RUN_TOKEN), false, 'the model-only token is hidden too');
});

test('a run\'s environment holds no Cloudflare user token and no deploy token', async () => {
  for (const [config, choice] of [[ARTIFACTS, PICKED], [GITHUB, PASTED]]) {
    const { box } = await runOn({ config, choice });
    const given = JSON.stringify([box.called('exec')[0].options.env, box.called('startProcess')[0].options.env]);
    for (const secret of NEVER) assert.equal(given.includes(secret), false, `a run was handed ${secret}`);
    for (const name of ['CLOUDFLARE_API_TOKEN', 'CF_TOKEN', 'ROUTINES_KEY']) assert.equal(given.includes(`"${name}"`), false, name);
  }
});

test('a run past 30 minutes is stopped and ends as timed out', async () => {
  const box = sandbox({ polls: Infinity, output: 'still thinking\n' });
  const { result, flow } = await runOn({ box });
  assert.equal(BOUNDS.runMs, 30 * 60_000);
  assert.deepEqual(result, { startedAt: Date.parse('2026-10-05T08:00:00Z'), startupMs: 0, startup: null, durationMs: BOUNDS.runMs, exitCode: null, status: 'timed-out', note: 'The run was stopped at 30 minutes.', log: 'still thinking' });
  assert.equal(box.called('getProcess').length, BOUNDS.runMs / (BOUNDS.pollSeconds * 1000));
  assert.equal(box.called('killProcess').length, 1);
  assert.deepEqual(flow.names().slice(-5), ['stop', 'log', 'ended', 'destroy', 'leave']);
});

test('a computer that can not be made ready ends the run before the assistant starts', async () => {
  const failed = sandbox({ bootstrap: { exitCode: 128, stdout: '', stderr: `fatal: could not read from ${ARTIFACTS_ACCESS.token}\n` } });
  const first = await runOn({ box: failed });
  assert.deepEqual([first.result.status, first.result.exitCode, first.result.log, first.result.startupMs], ['bootstrap-failed', 128, 'fatal: could not read from [PROJECT_ACCESS]', null]);
  assert.match(first.result.note, /assistant never started/);
  assert.deepEqual(failed.called('startProcess'), []);
  assert.deepEqual(first.flow.names(), ['slot-0', 'started', 'bootstrap', 'ended', 'destroy', 'leave']);

  const lost = sandbox({ bootstrap: new Error(`command timed out holding ${AI_RUN_TOKEN}`) });
  const second = await runOn({ box: lost });
  assert.deepEqual([second.result.status, second.result.exitCode, second.result.log], ['bootstrap-failed', null, 'command timed out holding [CLOUDFLARE_API_KEY]']);
  assert.equal(lost.called('destroy').length, 1);
});

test('an assistant that ends with an error is a failed run; a refused key or pick says to choose again', async () => {
  const failed = await runOn({ box: sandbox({ exitCode: 1, output: 'Error: the build broke\n' }) });
  assert.deepEqual([failed.result.status, failed.result.exitCode, failed.result.note], ['failed', 1, 'The assistant ended with an error.']);
  const refused = await runOn({ box: sandbox({ exitCode: 1, output: 'Error: 401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}\n' }) });
  assert.deepEqual([refused.result.status, refused.result.note], ['model-refused', 'The model\'s service refused the request. Pick a model or paste a key again, then run the routine.']);
  for (const said of ['Incorrect API key provided', '401 Unauthorized', 'OAuth token has been revoked', 'invalid x-api-key', 'No API key found for zai', 'Insufficient credits']) assert.equal(modelRefused(said), true, said);
  for (const said of ['the test expected 401', 'all 12 checks passed', undefined]) assert.equal(modelRefused(said), false, String(said));
});

test('with no model, no key for it, or no project access, nothing starts: no step, no computer', async () => {
  const none = await runOn({ choice: null });
  assert.deepEqual(none.result, { status: 'needs-model', note: 'No model is picked for this install\'s routines. Pick one, then run it.', log: '' });
  const keyless = await runOn({ choice: PASTED, env: { ...ENV, MODEL_KEY: '' } });
  assert.equal(keyless.result.status, 'needs-model-key');
  const locked = await runOn({ config: GITHUB, env: { ...ENV, GITHUB_TOKEN: '' } });
  assert.equal(locked.result.status, 'needs-project-access');
  for (const run of [none, keyless, locked]) {
    assert.deepEqual(run.flow.names(), []);
    assert.deepEqual(run.box.calls, []);
    assert.deepEqual(run.asked, { take: 0, leave: 0, mint: 0 });
  }
});

test('a run waits its turn for a computer, and gives up when none comes free', async () => {
  const waited = await runOn({ free: [false, false, true] });
  assert.equal(waited.result.status, 'ok');
  assert.deepEqual(waited.flow.names().slice(0, 6), ['slot-0', 'slot-wait-0', 'slot-1', 'slot-wait-1', 'slot-2', 'started']);
  assert.equal(waited.result.startedAt, Date.parse('2026-10-05T08:00:40Z'), 'the 30 minutes start when the computer does');

  const never = await runOn({ free: [false] });
  assert.deepEqual(never.result, { status: 'failed', note: 'No cloud computer came free in time.', log: '' });
  assert.equal(never.asked.take, BOUNDS.slotPolls);
  assert.deepEqual(never.box.calls, []);
});

test('a computer that vanishes mid-run ends the run as failed, with whatever output is left', async () => {
  const box = sandbox();
  box.box.getProcess = async () => null;
  box.box.getProcessLogs = async () => { throw new Error('no such process'); };
  box.box.destroy = async () => { throw new Error('already gone'); };
  const { result, flow } = await runOn({ box });
  assert.deepEqual([result.status, result.exitCode, result.log], ['failed', null, '']);
  assert.deepEqual(flow.done.filter((step) => step.name === 'destroy').map((step) => step.result), [false]);
});
