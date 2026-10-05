// What one run of a routine does, with no Cloudflare import, so the script tests can run it.
// worker.mjs wires it to a Workflow and the pinned Sandbox SDK (wiki/stack/cloud-routines.md owns
// how a routine runs).
//
//   gate       no model, no key for it, or no project access: nothing starts.
//   bootstrap  a fresh copy of the project's default branch, the assistant and tools from this
//              folder's own locked list, the maker as git author, and an .env holding the memory key
//              and the routine's named keys.
//   agent      Pi's command-line assistant on the install's model, with full permissions inside the
//              computer, on a fixed notice and then the routine's own prompt.
//   result     how it ended, how long it took to start and to run, and the end of its output with
//              every key's value replaced by its name.
//
// A run's reach is fixed here, not by its prompt: holdings() is the whole list of what it is given.
import { modelEnv } from './models.mjs';
import { lastLines, LIMITS, NEEDS } from './routines.mjs';

/** The tools a run installs, each at one exact version. The first two are what tools/package.json locks. */
export const PINS = {
  pi: '@earendil-works/pi-coding-agent@1.0.3',
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

export const NOTICE = 'This is a scheduled run and nobody can answer. Take the recommended option wherever you would ask, and mark it assumed. If that leaves something for the person, record it as a memory thread: when this project has `.agents/skills/memory/SKILL.md`, read it and write one fact tagged `routine` through its write gate; when it has none, end your reply with what is left. If nothing is left, do neither.';

const PROJECT = '/workspace/project';
const TOOLS = '/workspace/tools';
const BOOTSTRAP_FILE = '/workspace/wong-bootstrap.sh';
const AGENT_FILE = '/workspace/wong-agent.sh';
const TOOLS_PACKAGE = '/workspace/wong-tools-package.json';
const TOOLS_LOCK = '/workspace/wong-tools-package-lock.json';
const RUNNING = new Set(['starting', 'running']);
const NO_RETRY = { retries: { limit: 0, delay: '1 second' } };
const VERB = /^\/([a-z][a-z0-9-]{0,63})(?:\s+([\s\S]*))?$/;

/** The Worker secret that holds one of a routine's named keys. */
export const keySecret = (name) => `RUN_${name}`;

/** What the Worker holds to reach a model with: the pasted key, and the gateway's model-only token and ids. */
const modelHeld = (env, config) => ({ key: env.MODEL_KEY, token: env.AI_RUN_TOKEN, account: config.account, gateway: config.gateway });

/** What stops a run before it starts: `model`, `model-key`, `project-access`, or null. `choice` is the model in use. */
export function missing(env, config, choice) {
  if (!choice) return 'model';
  if (!modelEnv(choice, modelHeld(env, config))) return 'model-key';
  if (config.route === 'github' && !env.GITHUB_TOKEN) return 'project-access';
  return null;
}

/** The fixed notice, then the routine's prompt exactly as written. */
export const promptOf = (routine) => `${NOTICE}\n\n${routine.prompt}`;

/** A prompt that starts with `/<name>`, as `{ name, rest }`, or null. */
export function verbOf(prompt) {
  const match = VERB.exec(String(prompt ?? '').trim());
  return match ? { name: match[1], rest: (match[2] ?? '').trim() } : null;
}

/**
 * What a `/<name>` prompt becomes when the project holds that skill: the notice, the skill's file to
 * read and follow, then the rest of the prompt. Null for a prompt that names no verb.
 */
export function skillPromptOf(routine) {
  const verb = verbOf(routine.prompt);
  return verb && `${NOTICE}\n\nRead \`.agents/skills/${verb.name}/SKILL.md\` and follow it.${verb.rest ? `\n\n${verb.rest}` : ''}`;
}

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
 * Everything one run is given, and nothing else: the model's key under the name its service reads,
 * access to this one project, the memory key, and the keys the routine names. `access` is
 * `{ user, token }` for the project's git address, `choice` the model in use. Returns the bootstrap's
 * environment, the assistant's, and `secrets`: every value to hide in saved output, with the name
 * shown in its place.
 */
export function holdings({ routine, env, config, access, choice }) {
  const held = modelHeld(env, config);
  const model = modelEnv(choice, held);
  const modelSecret = choice.via === 'key' ? { name: Object.keys(model)[0], value: held.key } : { name: 'CLOUDFLARE_API_KEY', value: held.token };
  const header = btoa(`${access.user}:${access.token}`);
  const named = routine.keys.filter((name) => typeof env[keySecret(name)] === 'string').map((name) => ({ name, value: env[keySecret(name)] }));
  const file = [...(env.MEMORY_TOKEN ? [{ name: 'CLOUDFLARE_MEMORY_TOKEN', value: env.MEMORY_TOKEN }] : []), ...named];
  const verb = verbOf(routine.prompt);
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
      ...model,
      ...(config.route === 'github' ? { GH_TOKEN: access.token } : {}),
      WONG_PROVIDER: choice.provider,
      WONG_MODEL: choice.model,
      WONG_PROMPT: promptOf(routine),
      ...(verb ? { WONG_SKILL: verb.name, WONG_SKILL_PROMPT: skillPromptOf(routine) } : {}),
      // The assistant makes no call of its own beyond the model's.
      PI_SKIP_VERSION_CHECK: '1',
      PI_TELEMETRY: '0',
    },
    secrets: [modelSecret, { name: 'PROJECT_ACCESS', value: access.token }, { name: 'PROJECT_ACCESS', value: header }, ...file],
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

// A key or a pick the model's service refused, as the services say it.
const REFUSED = /401 unauthorized|authentication_error|invalid (x-)?api[- ]key|incorrect api key|invalid bearer token|oauth token (has )?(expired|been revoked)|no api key found|insufficient (credits?|balance|quota)/i;

/** True when a failed run's output says the model's service refused the key or the pick. */
export const modelRefused = (log) => REFUSED.test(String(log ?? ''));

// Every command below is fixed text. A name, an address, a key, or the prompt reaches it only as a
// quoted environment variable, never as part of the script.
const GH = `curl -fsSL "https://github.com/cli/cli/releases/download/v${PINS.gh}/gh_${PINS.gh}_linux_amd64.tar.gz" | tar -xz -C /tmp
install -m 0755 "/tmp/gh_${PINS.gh}_linux_amd64/bin/gh" /usr/local/bin/gh
`;

/**
 * The script that readies the computer, for one install route: the project, then the tools from the
 * runner's own locked list, which the run wrote beside this script. It prints how long each took.
 */
export function bootstrap(route) {
  if (!['artifacts', 'github'].includes(route)) throw new Error(`no bootstrap for ${route}`);
  return `set -eu
clock() { date +%s%3N; }
began=$(clock)
rm -rf ${PROJECT} ${TOOLS}
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
cloned=$(clock)
mkdir -p ${TOOLS}
cp ${TOOLS_PACKAGE} ${TOOLS}/package.json
cp ${TOOLS_LOCK} ${TOOLS}/package-lock.json
cd ${TOOLS}
npm ci --no-audit --no-fund --ignore-scripts
${route === 'github' ? GH : ''}echo "WONG_STARTUP clone=$((cloned - began)) tools=$(($(clock) - cloned))"
echo "WONG_BOOTSTRAPPED $(git -C ${PROJECT} rev-parse HEAD)"
`;
}

/**
 * The script that runs the assistant once, with full permissions and no questions. A prompt that
 * names a verb is swapped for its skill's file only when this copy of the project holds that file.
 */
export function agentCommand() {
  return `set -eu
cd ${PROJECT}
export PATH="${TOOLS}/node_modules/.bin:$PATH"
prompt="$WONG_PROMPT"
if [ -n "\${WONG_SKILL:-}" ] && [ -f ".agents/skills/$WONG_SKILL/SKILL.md" ]; then
  prompt="$WONG_SKILL_PROMPT"
fi
exec pi -p --approve --no-session --provider "$WONG_PROVIDER" --model "$WONG_MODEL" -- "$prompt"
`;
}

/** How long the bootstrap's pieces took, from the line it prints: `{ cloneMs, toolsMs }`, or null. */
export function startupOf(output) {
  const match = /^WONG_STARTUP clone=(\d+) tools=(\d+)$/m.exec(String(output ?? ''));
  return match ? { cloneMs: Number(match[1]), toolsMs: Number(match[2]) } : null;
}

/** The project's git login for a run. On Artifacts, `mint()` returns a fresh key for the one repository. */
export async function projectAccess(config, env, mint) {
  if (config.route === 'github') return { user: 'x-access-token', token: env.GITHUB_TOKEN };
  return { user: 'x', token: String(await mint()).split('?')[0] };
}

/**
 * Runs `routine` once and returns its result:
 * `{ status, startedAt, startupMs, startup, durationMs, exitCode, note, log }`. `startupMs` is from
 * the computer starting to the assistant starting; `startup` splits out the clone and the tools.
 *
 * `step` is the Workflow's: every piece of work is a named step, so a run that Cloudflare restarts
 * carries on where it stopped. A step's answer is stored by Cloudflare, so no step returns a key:
 * output is redacted inside the step that reads it. `choice` is the model in use, `tools` the
 * runner's own `{ manifest, lock }` as text, `sandbox()` the run's computer, `mint()` the Artifacts
 * key maker, `slots` the line for a free computer, `now()` the clock.
 */
export async function runRoutine({ routine, runId, env, config, choice, tools, step, sandbox, mint, slots, now = () => Date.now() }) {
  const need = missing(env, config, choice);
  if (need) return { ...NEEDS[need], log: '' };

  let mine = false;
  for (let poll = 0; poll < BOUNDS.slotPolls && !mine; poll++) {
    mine = await step.do(`slot-${poll}`, () => slots.take());
    if (!mine) await step.sleep(`slot-wait-${poll}`, `${BOUNDS.slotSeconds} seconds`);
  }
  if (!mine) return { status: 'failed', note: 'No cloud computer came free in time.', log: '' };

  const startedAt = await step.do('started', async () => now());
  let startup = { startupMs: null, startup: null };
  const ended = async (result) => ({ startedAt, ...startup, durationMs: (await step.do('ended', async () => now())) - startedAt, exitCode: null, ...result });
  const held = async () => holdings({ routine, env, config, choice, access: await projectAccess(config, env, mint) });
  try {
    const boot = await step.do('bootstrap', { ...NO_RETRY, timeout: `${BOUNDS.bootstrapMs / 60_000} minutes` }, async () => {
      const mineHeld = await held();
      const box = sandbox();
      try {
        await box.writeFile(BOOTSTRAP_FILE, bootstrap(config.route));
        await box.writeFile(AGENT_FILE, agentCommand());
        await box.writeFile(TOOLS_PACKAGE, tools.manifest);
        await box.writeFile(TOOLS_LOCK, tools.lock);
        const out = await box.exec(`bash ${BOOTSTRAP_FILE}`, { env: mineHeld.bootstrap, timeout: BOUNDS.bootstrapMs - 30_000 });
        return { exitCode: out.exitCode, log: saved(out, mineHeld.secrets), startup: startupOf(out.stdout) };
      } catch (error) {
        return { exitCode: null, log: lastLines(redact(String(error?.message ?? error), mineHeld.secrets)), startup: null };
      }
    });
    if (boot.exitCode !== 0) return await ended({ status: 'bootstrap-failed', exitCode: boot.exitCode, note: 'The cloud computer could not be made ready, so the assistant never started.', log: boot.log });

    const pid = await step.do('agent', NO_RETRY, async () => (await sandbox().startProcess(`bash ${AGENT_FILE}`, { env: (await held()).agent, cwd: PROJECT, processId: runId, autoCleanup: false })).id);
    startup = { startupMs: (await step.do('agent-started', async () => now())) - startedAt, startup: boot.startup };
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
    if (modelRefused(log)) return await ended({ status: 'model-refused', exitCode: state.exitCode, note: 'The model\'s service refused the request. Pick a model or paste a key again, then run the routine.', log });
    return await ended({ status: 'failed', exitCode: state.exitCode, note: 'The assistant ended with an error.', log });
  } finally {
    await step.do('destroy', () => sandbox().destroy().then(() => true, () => false));
    await step.do('leave', () => slots.leave());
  }
}
