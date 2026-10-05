// What one run of a routine does, with no Cloudflare import, so the script tests can run it.
// worker.mjs wires it to a Workflow and the pinned Sandbox SDK (wiki/stack/cloud-routines.md owns
// how a routine runs).
//
//   gate       no working sign-in, or no project access: nothing starts.
//   bootstrap  a fresh copy of the project's default branch, the pinned assistant and tools, the
//              maker as git author, and an .env holding the memory key and the routine's named keys.
//   agent      the assistant, with full permissions inside the computer, on a fixed notice and
//              then the routine's own prompt.
//   result     how it ended, how long it took, and the end of its output with every key's value
//              replaced by its name.
//
// A run's reach is fixed here, not by its prompt: holdings() is the whole list of what it is given.
import { lastLines, LIMITS } from './routines.mjs';

/** The tools a run installs, each at one exact version. */
export const PINS = {
  claude: '@anthropic-ai/claude-code@2.1.289',
  codex: '@openai/codex@0.160.0',
  openspec: '@fission-ai/openspec@1.13.2',
  gh: '2.102.0',
};

export const BOUNDS = {
  /** One run, from its computer starting to its assistant ending. */
  runMs: LIMITS.runMs,
  bootstrapMs: 8 * 60_000,
  pollSeconds: 20,
  /** A run waits this long for one of the computers to come free, then gives up. */
  slotPolls: 100,
  slotSeconds: 20,
  /** How long a run's key to an Artifacts repository lasts: the run, and room to spare. */
  tokenSeconds: 60 * 60,
};

export const NOTICE = 'This is a scheduled run and nobody can answer. Take the recommended option wherever you would ask, mark it assumed, and record anything left for the person as a memory thread.';

/** Each assistant's sign-ins: the name in the person's `.env`, and the name its CLI reads in a run. First set wins. */
export const SIGNINS = {
  claude: [
    { from: 'WONG_ROUTINE_CLAUDE_TOKEN', as: 'CLAUDE_CODE_OAUTH_TOKEN' },
    { from: 'WONG_ROUTINE_ANTHROPIC_KEY', as: 'ANTHROPIC_API_KEY' },
  ],
  codex: [{ from: 'WONG_ROUTINE_OPENAI_KEY', as: 'OPENAI_API_KEY' }],
};

const PROJECT = '/workspace/project';
const BOOTSTRAP_FILE = '/workspace/wong-bootstrap.sh';
const AGENT_FILE = '/workspace/wong-agent.sh';
const RUNNING = new Set(['starting', 'running']);
const NO_RETRY = { retries: { limit: 0, delay: '1 second' } };

/** The Worker secret that holds one person's sign-in for one assistant. */
export const signinSecret = (agent, makerId) => `SIGNIN_${String(agent).toUpperCase()}_${String(makerId).toUpperCase()}`;
/** The Worker secret that holds one of a routine's named keys. */
export const keySecret = (name) => `RUN_${name}`;
/** What a stored sign-in holds: the name its CLI reads, then the value. */
export const signinValue = (as, value) => `${as}=${value}`;

/** The maker's sign-in for this routine's assistant, as `{ name, value }`, or null when none is stored. */
export function signinOf(routine, env) {
  const stored = env[signinSecret(routine.agent, routine.maker?.id)];
  if (typeof stored !== 'string') return null;
  const cut = stored.indexOf('=');
  const name = stored.slice(0, cut);
  const value = stored.slice(cut + 1);
  return cut > 0 && value && SIGNINS[routine.agent]?.some((signin) => signin.as === name) ? { name, value } : null;
}

/** What stops a run before it starts: `signin`, `project-access`, or null. */
export function missing(routine, env, config) {
  if (!signinOf(routine, env)) return 'signin';
  if (config.route === 'github' && !env.GITHUB_TOKEN) return 'project-access';
  return null;
}

/** The fixed notice, then the routine's prompt exactly as written. */
export const promptOf = (routine) => `${NOTICE}\n\n${routine.prompt}`;

const MACHINE = /^machine:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

/**
 * The installation a memory key was issued to, or null. Memory answers a key only on its own
 * installation (wiki/development/memory-key.md), so a run takes that identity with the key.
 */
export function memoryMachine(token) {
  const payload = /^wongm_([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]{43}$/.exec(String(token ?? ''))?.[1];
  if (!payload) return null;
  try {
    return MACHINE.exec(atob(payload.replaceAll('-', '+').replaceAll('_', '/')))?.[1] ?? null;
  } catch {
    return null;
  }
}

/** One `.env` line, quoted the way dotenv reads back. */
function envLine(name, value) {
  const text = String(value);
  if (/^[A-Za-z0-9_\-.:/+=@]*$/.test(text)) return `${name}=${text}`;
  if (text.includes('\n') || text.includes("'")) return `${name}="${text.replaceAll('\n', '\\n')}"`;
  return `${name}='${text}'`;
}

/**
 * Everything one run is given, and nothing else: the maker's sign-in, access to this one project,
 * the memory key, and the keys the routine names. `access` is `{ user, token }` for the project's
 * git address. Returns the bootstrap's environment, the assistant's, and `secrets`: every value to
 * hide in saved output, with the name shown in its place.
 */
export function holdings({ routine, env, config, access }) {
  const signin = signinOf(routine, env);
  const header = btoa(`${access.user}:${access.token}`);
  const named = routine.keys.filter((name) => typeof env[keySecret(name)] === 'string').map((name) => ({ name, value: env[keySecret(name)] }));
  const file = [...(env.MEMORY_TOKEN ? [{ name: 'CLOUDFLARE_MEMORY_TOKEN', value: env.MEMORY_TOKEN }] : []), ...named];
  // Git sends the project's key only to the project's own address.
  const git = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `http.${config.remote}.extraHeader`, GIT_CONFIG_VALUE_0: `Authorization: Basic ${header}`, GIT_TERMINAL_PROMPT: '0' };
  return {
    bootstrap: {
      ...git,
      WONG_REMOTE: config.remote,
      WONG_AUTHOR_NAME: routine.maker.name,
      WONG_AUTHOR_EMAIL: routine.maker.email,
      WONG_ENV_FILE: file.map(({ name, value }) => `${envLine(name, value)}\n`).join(''),
      WONG_MACHINE_ID: memoryMachine(env.MEMORY_TOKEN) ?? '',
    },
    agent: {
      ...git,
      [signin.name]: signin.value,
      ...(config.route === 'github' ? { GH_TOKEN: access.token } : {}),
      WONG_PROMPT: promptOf(routine),
      ...(routine.model ? { WONG_MODEL: routine.model } : {}),
      // The assistant runs as the computer's only user, and is told so: the computer is the fence.
      IS_SANDBOX: '1',
    },
    secrets: [{ name: signin.name, value: signin.value }, { name: 'PROJECT_ACCESS', value: access.token }, { name: 'PROJECT_ACCESS', value: header }, ...file],
  };
}

/** `text` with every held value replaced by its name, longest first so no part of one is left. */
export function redact(text, secrets) {
  let out = String(text ?? '');
  for (const { name, value } of [...secrets].filter((secret) => secret.value).sort((a, b) => b.value.length - a.value.length)) out = out.replaceAll(value, `[${name}]`);
  return out;
}

/** The end of a command's output, both streams, as it is saved: redacted first. */
const saved = ({ stdout, stderr }, secrets) => lastLines(redact([stdout, stderr].filter(Boolean).join('\n'), secrets));

// A sign-in the provider refused, as each CLI says it.
const REFUSED = /401 unauthorized|authentication_error|invalid (x-)?api[- ]key|invalid bearer token|oauth token (has )?(expired|been revoked)|please run \/login|not logged in/i;

/** True when a failed run's output says the provider refused the sign-in. */
export const signinRefused = (log) => REFUSED.test(String(log ?? ''));

// Every command below is fixed text. A name, an address, a key, or the prompt reaches it only as a
// quoted environment variable, never as part of the script.
const GH = `curl -fsSL "https://github.com/cli/cli/releases/download/v${PINS.gh}/gh_${PINS.gh}_linux_amd64.tar.gz" | tar -xz -C /tmp
install -m 0755 "/tmp/gh_${PINS.gh}_linux_amd64/bin/gh" /usr/local/bin/gh
`;

/** The script that readies the computer, for one install route and one assistant. */
export function bootstrap(route, agent) {
  if (!PINS[agent] || !['artifacts', 'github'].includes(route)) throw new Error(`no bootstrap for ${agent} on ${route}`);
  return `set -eu
rm -rf ${PROJECT}
git clone -q "$WONG_REMOTE" ${PROJECT}
cd ${PROJECT}
git config user.name "$WONG_AUTHOR_NAME"
git config user.email "$WONG_AUTHOR_EMAIL"
umask 077
printf '%s' "$WONG_ENV_FILE" > .env
if [ -n "$WONG_MACHINE_ID" ]; then
  mkdir -p "$HOME/.local/share/wongstack"
  printf '%s\\n' "$WONG_MACHINE_ID" > "$HOME/.local/share/wongstack/machine-id"
fi
npm install -g --no-audit --no-fund ${PINS[agent]} ${PINS.openspec}
${route === 'github' ? GH : ''}echo "WONG_BOOTSTRAPPED $(git rev-parse HEAD)"
`;
}

const AGENTS = {
  claude: `set -eu
cd ${PROJECT}
exec claude -p "$WONG_PROMPT" --permission-mode bypassPermissions \${WONG_MODEL:+--model "$WONG_MODEL"}
`,
  codex: `set -eu
cd ${PROJECT}
printenv OPENAI_API_KEY | codex login --with-api-key >/dev/null 2>&1 || true
exec codex exec --dangerously-bypass-approvals-and-sandbox \${WONG_MODEL:+--model "$WONG_MODEL"} "$WONG_PROMPT"
`,
};

/** The script that runs the assistant once, with full permissions and no questions. */
export function agentCommand(agent) {
  if (!AGENTS[agent]) throw new Error(`no command for ${agent}`);
  return AGENTS[agent];
}

/** The project's git login for a run. On Artifacts, `mint()` returns a fresh key for the one repository. */
export async function projectAccess(config, env, mint) {
  if (config.route === 'github') return { user: 'x-access-token', token: env.GITHUB_TOKEN };
  return { user: 'x', token: String(await mint()).split('?')[0] };
}

const NEEDS = {
  signin: { status: 'needs-signin', note: 'Its maker has no working sign-in stored. Sign in again, then run it.' },
  'project-access': { status: 'needs-project-access', note: 'The runner has no access to the project. Give it the project key, then run it.' },
};

/**
 * Runs `routine` once and returns its result: `{ status, startedAt, durationMs, exitCode, note, log }`.
 *
 * `step` is the Workflow's: every piece of work is a named step, so a run that Cloudflare restarts
 * carries on where it stopped. A step's answer is stored by Cloudflare, so no step returns a key:
 * output is redacted inside the step that reads it. `sandbox()` is the run's computer, `mint()` the
 * Artifacts key maker, `slots` the line for a free computer, `now()` the clock.
 */
export async function runRoutine({ routine, runId, env, config, step, sandbox, mint, slots, now = () => Date.now() }) {
  const need = missing(routine, env, config);
  if (need) return { ...NEEDS[need], log: '' };

  let mine = false;
  for (let poll = 0; poll < BOUNDS.slotPolls && !mine; poll++) {
    mine = await step.do(`slot-${poll}`, () => slots.take());
    if (!mine) await step.sleep(`slot-wait-${poll}`, `${BOUNDS.slotSeconds} seconds`);
  }
  if (!mine) return { status: 'failed', note: 'No cloud computer came free in time.', log: '' };

  const startedAt = await step.do('started', async () => now());
  const ended = async (result) => ({ startedAt, durationMs: (await step.do('ended', async () => now())) - startedAt, exitCode: null, ...result });
  const held = async () => holdings({ routine, env, config, access: await projectAccess(config, env, mint) });
  try {
    const boot = await step.do('bootstrap', { ...NO_RETRY, timeout: `${BOUNDS.bootstrapMs / 60_000} minutes` }, async () => {
      const mineHeld = await held();
      const box = sandbox();
      try {
        await box.writeFile(BOOTSTRAP_FILE, bootstrap(config.route, routine.agent));
        await box.writeFile(AGENT_FILE, agentCommand(routine.agent));
        const out = await box.exec(`bash ${BOOTSTRAP_FILE}`, { env: mineHeld.bootstrap, timeout: BOUNDS.bootstrapMs - 30_000 });
        return { exitCode: out.exitCode, log: saved(out, mineHeld.secrets) };
      } catch (error) {
        return { exitCode: null, log: lastLines(redact(String(error?.message ?? error), mineHeld.secrets)) };
      }
    });
    if (boot.exitCode !== 0) return await ended({ status: 'bootstrap-failed', exitCode: boot.exitCode, note: 'The cloud computer could not be made ready, so the assistant never started.', log: boot.log });

    const pid = await step.do('agent', NO_RETRY, async () => (await sandbox().startProcess(`bash ${AGENT_FILE}`, { env: (await held()).agent, cwd: PROJECT, processId: runId, autoCleanup: false })).id);
    let state = { status: 'running', exitCode: null, at: startedAt };
    for (let poll = 0; RUNNING.has(state.status) && state.at - startedAt < BOUNDS.runMs; poll++) {
      await step.sleep(`wait-${poll}`, `${BOUNDS.pollSeconds} seconds`);
      state = await step.do(`poll-${poll}`, async () => {
        const process = await sandbox().getProcess(pid);
        return { status: process?.status ?? 'gone', exitCode: process?.exitCode ?? null, at: now() };
      });
    }
    const timedOut = RUNNING.has(state.status);
    if (timedOut) await step.do('stop', () => sandbox().killProcess(pid).then(() => true, () => false));
    const log = await step.do('log', async () => {
      const { secrets } = await held();
      const logs = await sandbox().getProcessLogs(pid).catch(() => ({ stdout: '', stderr: '' }));
      return saved(logs, secrets);
    });
    if (timedOut) return await ended({ status: 'timed-out', note: `The run was stopped at ${BOUNDS.runMs / 60_000} minutes.`, log });
    if (state.exitCode === 0) return await ended({ status: 'ok', exitCode: 0, log });
    if (signinRefused(log)) return await ended({ status: 'needs-signin', exitCode: state.exitCode, note: 'The sign-in was refused. Renew it, then run the routine.', log });
    return await ended({ status: 'failed', exitCode: state.exitCode, note: 'The assistant ended with an error.', log });
  } finally {
    await step.do('destroy', () => sandbox().destroy().then(() => true, () => false));
    await step.do('leave', () => slots.leave());
  }
}
