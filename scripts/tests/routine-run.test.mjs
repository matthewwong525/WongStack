// What one run of a routine does and is given: scripts/routine-runner/run.mjs against stand-ins for
// a Workflow's steps and a Sandbox. The published SDK ships no test fixtures.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOUNDS, NOTICE, PINS, SIGNINS, agentCommand, bootstrap, holdings, keySecret, memoryMachine, missing, projectAccess, promptOf, redact, runRoutine,
  signinOf, signinRefused, signinSecret, signinValue,
} from '../routine-runner/run.mjs';
import { MAKER, clock, sandbox, signedIn, steps } from './fixtures/routine-runner.mjs';

const MACHINE = '6f1d2c3b-4a59-4e68-9b7a-0c1d2e3f4a5b';
const MEMORY = `wongm_${Buffer.from(`machine:${MACHINE}`).toString('base64url')}.${'m'.repeat(43)}`;
const SIGNIN = 'sk-ant-oat-subscription-secret';
const ARTIFACTS = { account: 'a'.repeat(32), route: 'artifacts', remote: `https://${'a'.repeat(32)}.artifacts.cloudflare.net/git/wongstack/demo.git`, repo: 'demo' };
const GITHUB = { account: 'a'.repeat(32), route: 'github', remote: 'https://github.com/ada/demo.git', repo: 'ada/demo' };
// The Worker's secrets. The last four are what a run must never be handed, whatever its routine names.
const ENV = {
  ...signedIn(),
  MEMORY_TOKEN: MEMORY,
  RUN_STRIPE_KEY: 'sk_live_stripe-secret',
  GITHUB_TOKEN: 'github_pat_project-secret',
  ROUTINES_KEY: 'routines-key-secret',
  CLOUDFLARE_API_TOKEN: 'cf-user-token-secret',
  CF_TOKEN: 'cf-deploy-token-secret',
  RUN_OTHER_KEY: 'another-routines-secret',
};
const NEVER = ['routines-key-secret', 'cf-user-token-secret', 'cf-deploy-token-secret', 'another-routines-secret'];
const routine = (overrides = {}) => ({ id: 'a1000000', name: 'improve demo', agent: 'claude', model: null, prompt: '/improve', keys: ['STRIPE_KEY'], maker: MAKER, ...overrides });
const ARTIFACTS_ACCESS = { user: 'x', token: 'art_v1_0123456789abcdef0123456789abcdef01234567' };
const basic = (user, token) => Buffer.from(`${user}:${token}`).toString('base64');

/** One run on stand-ins. `free` is what the line for a computer answers, in order; the last answer repeats. */
async function runOn({ config = ARTIFACTS, env = ENV, box = sandbox(), free = [true], ...overrides } = {}) {
  const time = clock();
  const flow = steps(time);
  const asked = { take: 0, leave: 0, mint: 0 };
  const result = await runRoutine({
    routine: routine(overrides), runId: 'run-a1000000-x-0001', env, config, step: flow.step, now: time.now,
    sandbox: () => box.box,
    mint: async () => { asked.mint++; return `${ARTIFACTS_ACCESS.token}?expires=1790000000`; },
    slots: { take: async () => free[Math.min(asked.take++, free.length - 1)], leave: async () => { asked.leave++; return true; } },
  });
  return { result, flow, box, asked, time };
}

test('each sign-in in the person\'s .env maps to the one name its assistant reads in a run', () => {
  assert.deepEqual(SIGNINS, {
    claude: [{ from: 'WONG_ROUTINE_CLAUDE_TOKEN', as: 'CLAUDE_CODE_OAUTH_TOKEN' }, { from: 'WONG_ROUTINE_ANTHROPIC_KEY', as: 'ANTHROPIC_API_KEY' }],
    codex: [{ from: 'WONG_ROUTINE_OPENAI_KEY', as: 'OPENAI_API_KEY' }],
  });
  assert.equal(signinSecret('claude', MAKER.id), 'SIGNIN_CLAUDE_0123456789AB');
  assert.equal(keySecret('STRIPE_KEY'), 'RUN_STRIPE_KEY');
  assert.deepEqual(signinOf(routine(), ENV), { name: 'CLAUDE_CODE_OAUTH_TOKEN', value: SIGNIN });
  const paid = { [signinSecret('claude', MAKER.id)]: signinValue('ANTHROPIC_API_KEY', 'sk-ant-api=with=equals') };
  assert.deepEqual(signinOf(routine(), paid), { name: 'ANTHROPIC_API_KEY', value: 'sk-ant-api=with=equals' });
  const codex = signedIn('codex', 'OPENAI_API_KEY', 'sk-openai-secret');
  assert.deepEqual(signinOf(routine({ agent: 'codex' }), codex), { name: 'OPENAI_API_KEY', value: 'sk-openai-secret' });
});

test('a sign-in that is missing, empty, another person\'s, or under a name the assistant does not read is no sign-in', () => {
  assert.equal(signinOf(routine(), {}), null);
  assert.equal(signinOf(routine({ maker: { ...MAKER, id: 'ffffffffffff' } }), ENV), null, 'another person\'s sign-in is not used');
  assert.equal(signinOf(routine({ agent: 'codex' }), ENV), null, 'a Claude sign-in does not run Codex');
  for (const stored of ['CLAUDE_CODE_OAUTH_TOKEN=', 'sk-ant-oat-no-name', 'PATH=/bin', 'OPENAI_API_KEY=sk-openai', '=value']) {
    assert.equal(signinOf(routine(), { [signinSecret('claude', MAKER.id)]: stored }), null, stored);
  }
  assert.equal(missing(routine(), {}, ARTIFACTS), 'signin');
  assert.equal(missing(routine(), ENV, ARTIFACTS), null);
  assert.equal(missing(routine(), { ...ENV, GITHUB_TOKEN: undefined }, GITHUB), 'project-access');
  assert.equal(missing(routine(), ENV, GITHUB), null);
});

test('the prompt is the fixed notice, then the routine\'s text unchanged', () => {
  const text = '  /improve --audit-only\n\n"quoted" $HOME `x`  ';
  assert.equal(promptOf(routine({ prompt: text })), `${NOTICE}\n\n${text}`);
  assert.equal(NOTICE, 'This is a scheduled run and nobody can answer. Take the recommended option wherever you would ask, mark it assumed, and record anything left for the person as a memory thread.');
});

test('a run is given its maker\'s sign-in, this one project, the memory key and its named keys, and nothing else', () => {
  const held = holdings({ routine: routine({ model: 'claude-opus-5-5' }), env: ENV, config: ARTIFACTS, access: ARTIFACTS_ACCESS });
  const header = `Authorization: Basic ${basic('x', ARTIFACTS_ACCESS.token)}`;
  const git = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `http.${ARTIFACTS.remote}.extraHeader`, GIT_CONFIG_VALUE_0: header, GIT_TERMINAL_PROMPT: '0' };
  assert.deepEqual(held.bootstrap, {
    ...git, WONG_REMOTE: ARTIFACTS.remote, WONG_AUTHOR_NAME: 'Ada', WONG_AUTHOR_EMAIL: 'ada@example.com',
    WONG_ENV_FILE: `CLOUDFLARE_MEMORY_TOKEN=${MEMORY}\nSTRIPE_KEY=sk_live_stripe-secret\n`, WONG_MACHINE_ID: MACHINE,
  });
  assert.deepEqual(held.agent, { ...git, CLAUDE_CODE_OAUTH_TOKEN: SIGNIN, WONG_PROMPT: `${NOTICE}\n\n/improve`, WONG_MODEL: 'claude-opus-5-5', IS_SANDBOX: '1' });
  const given = JSON.stringify([held.bootstrap, held.agent]);
  for (const secret of NEVER) assert.equal(given.includes(secret), false, `a run was handed ${secret}`);
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CF_TOKEN', 'ROUTINES_KEY']) assert.equal(given.includes(name), false, name);
  assert.deepEqual(held.secrets.map((secret) => secret.name), ['CLAUDE_CODE_OAUTH_TOKEN', 'PROJECT_ACCESS', 'PROJECT_ACCESS', 'CLOUDFLARE_MEMORY_TOKEN', 'STRIPE_KEY']);
});

test('on GitHub the project key is also the run\'s gh login; a key the routine names but nobody stored is left out', () => {
  const held = holdings({ routine: routine({ keys: ['STRIPE_KEY', 'MISSING_KEY'] }), env: { ...ENV, MEMORY_TOKEN: undefined }, config: GITHUB, access: { user: 'x-access-token', token: ENV.GITHUB_TOKEN } });
  assert.equal(held.agent.GH_TOKEN, ENV.GITHUB_TOKEN);
  assert.equal(held.agent.GIT_CONFIG_KEY_0, 'http.https://github.com/ada/demo.git.extraHeader', 'git sends the key to this project\'s address only');
  assert.equal(held.agent.GIT_CONFIG_VALUE_0, `Authorization: Basic ${basic('x-access-token', ENV.GITHUB_TOKEN)}`);
  assert.equal('WONG_MODEL' in held.agent, false);
  assert.deepEqual([held.bootstrap.WONG_ENV_FILE, held.bootstrap.WONG_MACHINE_ID], ['STRIPE_KEY=sk_live_stripe-secret\n', '']);
});

test('the .env a run writes quotes a value the way dotenv reads it back', () => {
  const env = { ...ENV, RUN_PLAIN: 'abc-123', RUN_SPACED: 'two words', RUN_QUOTED: 'it\'s', RUN_LINES: 'one\ntwo' };
  const file = holdings({ routine: routine({ keys: ['PLAIN', 'SPACED', 'QUOTED', 'LINES'] }), env, config: ARTIFACTS, access: ARTIFACTS_ACCESS }).bootstrap.WONG_ENV_FILE;
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

test('the bootstrap is fixed text for each install route and assistant, at pinned versions', () => {
  for (const pin of Object.values(PINS)) assert.match(pin, /(^|@)\d+\.\d+\.\d+$/, `${pin} is not one exact version`);
  const artifacts = bootstrap('artifacts', 'claude');
  const github = bootstrap('github', 'claude');
  for (const script of [artifacts, github]) {
    assert.match(script, /^set -eu\n/);
    assert.match(script, /git clone -q "\$WONG_REMOTE" \/workspace\/project\n/);
    assert.match(script, /git config user\.name "\$WONG_AUTHOR_NAME"\ngit config user\.email "\$WONG_AUTHOR_EMAIL"\n/);
    assert.match(script, /printf '%s' "\$WONG_ENV_FILE" > \.env\n/);
    assert.ok(script.includes(`npm install -g --no-audit --no-fund ${PINS.claude} ${PINS.openspec}\n`));
    assert.match(script, /machine-id"\n/);
  }
  assert.equal(artifacts.includes('gh_'), false, 'an Artifacts install has no GitHub tool');
  assert.ok(github.includes(`releases/download/v${PINS.gh}/gh_${PINS.gh}_linux_amd64.tar.gz`));
  assert.equal(github.replace(/curl .*\ninstall .*\n/, ''), artifacts, 'the routes differ only by the GitHub tool');
  assert.ok(bootstrap('artifacts', 'codex').includes(`${PINS.codex} ${PINS.openspec}`));
  assert.equal(bootstrap('artifacts', 'codex').includes(PINS.claude), false);
  assert.throws(() => bootstrap('gitlab', 'claude'), /no bootstrap/);
  assert.throws(() => bootstrap('github', 'gemini'), /no bootstrap/);
});

test('the assistant runs once with full permissions, and its prompt reaches it only as a quoted variable', () => {
  assert.match(agentCommand('claude'), /\nexec claude -p "\$WONG_PROMPT" --permission-mode bypassPermissions \$\{WONG_MODEL:\+--model "\$WONG_MODEL"\}\n$/);
  assert.match(agentCommand('codex'), /\nexec codex exec --dangerously-bypass-approvals-and-sandbox \$\{WONG_MODEL:\+--model "\$WONG_MODEL"\} "\$WONG_PROMPT"\n$/);
  assert.throws(() => agentCommand('gemini'), /no command/);
  for (const script of [agentCommand('claude'), agentCommand('codex'), bootstrap('github', 'claude')]) assert.equal(script.includes('/improve'), false);
});

test('a run readies a fresh computer, runs the assistant, and returns how it ended', async () => {
  const { result, flow, box, asked } = await runOn();
  assert.deepEqual(result, { startedAt: Date.parse('2026-10-05T08:00:00Z'), durationMs: 40_000, exitCode: 0, status: 'ok', log: 'done' });
  assert.deepEqual(flow.names(), ['slot-0', 'started', 'bootstrap', 'agent', 'wait-0', 'poll-0', 'wait-1', 'poll-1', 'log', 'ended', 'destroy', 'leave']);
  const [exec] = box.called('exec');
  assert.equal(exec.command, 'bash /workspace/wong-bootstrap.sh');
  assert.equal(box.files['/workspace/wong-bootstrap.sh'], bootstrap('artifacts', 'claude'));
  assert.equal(box.files['/workspace/wong-agent.sh'], agentCommand('claude'));
  assert.equal(exec.options.env.WONG_REMOTE, ARTIFACTS.remote);
  const [started] = box.called('startProcess');
  assert.deepEqual([started.command, started.options.cwd, started.options.processId, started.options.autoCleanup], ['bash /workspace/wong-agent.sh', '/workspace/project', 'run-a1000000-x-0001', false]);
  assert.equal(started.options.env.CLAUDE_CODE_OAUTH_TOKEN, SIGNIN);
  assert.equal(box.called('destroy').length, 1, 'nothing of the computer is left');
  assert.deepEqual(asked, { take: 1, leave: 1, mint: 3 });
  const stepOf = (name) => flow.done.find((step) => step.name === name);
  assert.deepEqual(stepOf('bootstrap').config, { retries: { limit: 0, delay: '1 second' }, timeout: '8 minutes' });
  assert.deepEqual(stepOf('agent').config, { retries: { limit: 0, delay: '1 second' } });
});

test('a run that prints everything it holds leaves no value in its result or in any stored step', async () => {
  const header = basic('x-access-token', ENV.GITHUB_TOKEN);
  const dump = `CLAUDE_CODE_OAUTH_TOKEN=${SIGNIN}\nGH_TOKEN=${ENV.GITHUB_TOKEN}\nGIT_CONFIG_VALUE_0=Authorization: Basic ${header}\n$ cat .env\nCLOUDFLARE_MEMORY_TOKEN=${MEMORY}\nSTRIPE_KEY=${ENV.RUN_STRIPE_KEY}\n`;
  const box = sandbox({ bootstrap: { exitCode: 0, stdout: `cloning with ${ENV.GITHUB_TOKEN}\n`, stderr: '' }, output: dump, errors: `warn ${SIGNIN}\n` });
  const { result, flow } = await runOn({ config: GITHUB, box });
  assert.equal(result.status, 'ok');
  assert.equal(result.log, `CLAUDE_CODE_OAUTH_TOKEN=[CLAUDE_CODE_OAUTH_TOKEN]\nGH_TOKEN=[PROJECT_ACCESS]\nGIT_CONFIG_VALUE_0=Authorization: Basic [PROJECT_ACCESS]\n$ cat .env\nCLOUDFLARE_MEMORY_TOKEN=[CLOUDFLARE_MEMORY_TOKEN]\nSTRIPE_KEY=[STRIPE_KEY]\n\nwarn [CLAUDE_CODE_OAUTH_TOKEN]`);
  const kept = `${JSON.stringify(result)}${flow.stored()}`;
  for (const secret of [SIGNIN, ENV.GITHUB_TOKEN, header, MEMORY, ENV.RUN_STRIPE_KEY, ...NEVER]) assert.equal(kept.includes(secret), false, `${secret} was kept`);
  assert.ok(flow.stored().includes('cloning with [PROJECT_ACCESS]'), 'the bootstrap\'s output is redacted inside its own step');
});

test('a run past 30 minutes is stopped and ends as timed out', async () => {
  const box = sandbox({ polls: Infinity, output: 'still thinking\n' });
  const { result, flow } = await runOn({ box });
  assert.equal(BOUNDS.runMs, 30 * 60_000);
  assert.deepEqual(result, { startedAt: Date.parse('2026-10-05T08:00:00Z'), durationMs: BOUNDS.runMs, exitCode: null, status: 'timed-out', note: 'The run was stopped at 30 minutes.', log: 'still thinking' });
  assert.equal(box.called('getProcess').length, BOUNDS.runMs / (BOUNDS.pollSeconds * 1000));
  assert.equal(box.called('killProcess').length, 1);
  assert.deepEqual(flow.names().slice(-5), ['stop', 'log', 'ended', 'destroy', 'leave']);
});

test('a computer that can not be made ready ends the run before the assistant starts', async () => {
  const failed = sandbox({ bootstrap: { exitCode: 128, stdout: '', stderr: `fatal: could not read from ${ARTIFACTS_ACCESS.token}\n` } });
  const first = await runOn({ box: failed });
  assert.deepEqual([first.result.status, first.result.exitCode, first.result.log], ['bootstrap-failed', 128, 'fatal: could not read from [PROJECT_ACCESS]']);
  assert.match(first.result.note, /assistant never started/);
  assert.deepEqual(failed.called('startProcess'), []);
  assert.deepEqual(first.flow.names(), ['slot-0', 'started', 'bootstrap', 'ended', 'destroy', 'leave']);

  const lost = sandbox({ bootstrap: new Error(`command timed out holding ${SIGNIN}`) });
  const second = await runOn({ box: lost });
  assert.deepEqual([second.result.status, second.result.exitCode, second.result.log], ['bootstrap-failed', null, 'command timed out holding [CLAUDE_CODE_OAUTH_TOKEN]']);
  assert.equal(lost.called('destroy').length, 1);
});

test('an assistant that ends with an error is a failed run; a refused sign-in says to renew it', async () => {
  const failed = await runOn({ box: sandbox({ exitCode: 1, output: 'Error: the build broke\n' }) });
  assert.deepEqual([failed.result.status, failed.result.exitCode, failed.result.note], ['failed', 1, 'The assistant ended with an error.']);
  const refused = await runOn({ box: sandbox({ exitCode: 1, output: 'API Error: 401 {"type":"error","error":{"type":"authentication_error","message":"OAuth token has expired"}}\n' }) });
  assert.deepEqual([refused.result.status, refused.result.note], ['needs-signin', 'The sign-in was refused. Renew it, then run the routine.']);
  for (const said of ['Invalid API key · Please run /login', '401 Unauthorized', 'OAuth token has been revoked', 'invalid x-api-key']) assert.equal(signinRefused(said), true, said);
  for (const said of ['the test expected 401', 'all 12 checks passed', undefined]) assert.equal(signinRefused(said), false, String(said));
});

test('with no sign-in, or no project access, nothing starts: no step, no computer', async () => {
  const none = await runOn({ env: {} });
  assert.deepEqual(none.result, { status: 'needs-signin', note: 'Its maker has no working sign-in stored. Sign in again, then run it.', log: '' });
  const locked = await runOn({ config: GITHUB, env: { ...ENV, GITHUB_TOKEN: '' } });
  assert.equal(locked.result.status, 'needs-project-access');
  for (const run of [none, locked]) {
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
