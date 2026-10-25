// Runs a GitHub Actions workflow's jobs on this machine, for the deploy tests: expressions, `if`s, env, `run` steps
// through bash, and stand-ins for the actions the workflows use. Also the fake tools and the demo app they deploy.
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { REPO } from './pack.mjs';

export const loadWorkflow = path => parse(readFileSync(path, 'utf8'));

// ── Expressions ───────────────────────────────────────────────────────────────

const TOKEN = /\s*('(?:[^']|'')*'|-?\d+(?:\.\d+)?|==|!=|&&|\|\||[!(),]|[A-Za-z_][\w-]*(?:\.[\w*-]+)*)/y;

function tokens(text) {
  const list = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.trimEnd().length) {
    const match = TOKEN.exec(text);
    if (!match) throw new Error(`cannot read the expression: ${text}`);
    list.push(match[1]);
  }
  return list;
}

const truthy = value => !(value === false || value === 0 || value === '' || value === null || value === undefined || Number.isNaN(value));
const asNumber = value => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'boolean') return Number(value);
  if (typeof value === 'string') return value.trim() === '' ? 0 : Number(value);
  return typeof value === 'number' ? value : NaN;
};
// GitHub compares strings without case, and anything else of two types as numbers.
const equal = (a, b) => {
  if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
  if (typeof a === typeof b && typeof a !== 'object') return a === b;
  return asNumber(a) === asNumber(b);
};

const FUNCTIONS = {
  always: () => true,
  cancelled: () => false,
  success: (_, context) => !context.failed,
  failure: (_, context) => Boolean(context.failed),
  format: ([text, ...args]) => String(text).replace(/\{(\d+)\}/g, (_, at) => String(args[Number(at)] ?? '')),
  contains: ([within, item]) => (Array.isArray(within) ? within.includes(item) : String(within ?? '').toLowerCase().includes(String(item).toLowerCase())),
  startsWith: ([text, start]) => String(text ?? '').toLowerCase().startsWith(String(start).toLowerCase()),
};

function lookup(path, context) {
  let at = context;
  for (const part of path.split('.')) at = at !== null && typeof at === 'object' && part in at ? at[part] : null;
  return at ?? null;
}

export function evaluate(text, context) {
  const list = tokens(text);
  let at = 0;
  const peek = () => list[at];
  const take = expected => {
    if (expected && list[at] !== expected) throw new Error(`expected ${expected} in: ${text}`);
    return list[at++];
  };
  const primary = () => {
    const token = take();
    if (token === '(') { const value = or(); take(')'); return value; }
    if (token === '!') return !truthy(primary());
    if (token.startsWith("'")) return token.slice(1, -1).replaceAll("''", "'");
    if (/^-?\d/.test(token)) return Number(token);
    if (token === 'true' || token === 'false') return token === 'true';
    if (token === 'null') return null;
    if (peek() === '(') {
      take('(');
      const args = [];
      while (peek() !== ')') { args.push(or()); if (peek() === ',') take(','); }
      take(')');
      if (!FUNCTIONS[token]) throw new Error(`no stand-in for ${token}()`);
      return FUNCTIONS[token](args, context);
    }
    return lookup(token, context);
  };
  const comparison = () => {
    let value = primary();
    while (peek() === '==' || peek() === '!=') {
      const negate = take() === '!=';
      value = equal(value, primary()) !== negate;
    }
    return value;
  };
  const and = () => { let value = comparison(); while (peek() === '&&') { take(); const right = comparison(); value = truthy(value) ? right : value; } return value; };
  function or() { let value = and(); while (peek() === '||') { take(); const right = and(); value = truthy(value) ? value : right; } return value; }
  const value = or();
  if (at !== list.length) throw new Error(`unread tokens in: ${text}`);
  return value;
}

const unwrap = text => String(text).trim().replace(/^\$\{\{([\s\S]*)\}\}$/, '$1');
const asText = value => (value === null || value === undefined ? '' : String(value));
export const interpolate = (text, context) => String(text).replace(/\$\{\{([\s\S]*?)\}\}/g, (_, inner) => asText(evaluate(inner, context)));
// A job's or step's `if`, with GitHub's implied success() when it calls no status function.
const condition = (text, context) => {
  const inner = unwrap(text ?? 'success()');
  return truthy(evaluate(/\b(success|failure|always|cancelled)\(/.test(inner) ? inner : `success() && (${inner})`, context));
};
const interpolateAll = (values, context) => Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, interpolate(value, context)]));

// ── Jobs ──────────────────────────────────────────────────────────────────────

const readPairs = file => Object.fromEntries((existsSync(file) ? readFileSync(file, 'utf8') : '').split('\n').filter(line => line.includes('='))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

// Files under `dir`, as paths below it; hidden ones only when asked.
function filesIn(dir, hidden, prefix = '') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter(entry => hidden || !entry.name.startsWith('.')).flatMap(entry => (entry.isDirectory()
    ? filesIn(join(dir, entry.name), hidden, join(prefix, entry.name)) : [join(prefix, entry.name)]));
}

// The stand-in for each action the workflows use. `world` holds the trees, the artifacts and the event.
const ACTIONS = {
  'actions/checkout': (step, job, world) => {
    const ref = step.with.ref ?? '';
    const tree = !ref ? world.headTree : (ref === world.github.event.repository.default_branch || ref === world.mainSha ? world.trees.main : null);
    if (!tree) throw new Error(`no tree for checkout ref '${ref}'`);
    cpSync(tree, join(job.workspace, step.with.path ?? ''), { recursive: true });
    return {};
  },
  './.github/actions/change-scope': () => ({ untouched: 'false', base: '' }),
  'actions/setup-node': () => ({}),
  'actions/upload-artifact': (step, job, world) => {
    const from = isAbsolute(step.with.path) ? step.with.path : join(job.workspace, step.with.path);
    const files = filesIn(from, step.with['include-hidden-files'] === 'true');
    if (!files.length && step.with['if-no-files-found'] === 'error') throw new Error(`no files to upload at ${step.with.path}`);
    const store = mkdtempSync(join(world.root, 'artifact-'));
    for (const file of files) { mkdirSync(dirname(join(store, file)), { recursive: true }); copyFileSync(join(from, file), join(store, file)); }
    world.artifacts[step.with.name] = store;
    return {};
  },
  'actions/download-artifact': (step, job, world) => {
    const store = world.artifacts[step.with.name];
    if (!store) throw new Error(`no artifact named ${step.with.name}`);
    cpSync(store, isAbsolute(step.with.path) ? step.with.path : join(job.workspace, step.with.path), { recursive: true });
    return {};
  },
};

function runStep(step, job, context, world) {
  const env = { ...context.env, ...interpolateAll(step.env, context) };
  if (step.uses) {
    const action = ACTIONS[step.uses.split('@')[0]];
    if (!action) throw new Error(`no stand-in for ${step.uses}`);
    try {
      return { ok: true, outputs: action({ ...step, with: interpolateAll(step.with, context) }, job, world) };
    } catch (error) {
      world.log.push(`[${job.name}] ${step.uses}: ${error.message}`);
      return { ok: false, outputs: {} };
    }
  }
  const output = join(job.dir, `output-${job.count++}`);
  const script = join(job.dir, 'step.sh');
  writeFileSync(script, interpolate(step.run, context));
  const cwd = resolve(job.workspace, step['working-directory'] ? interpolate(step['working-directory'], context) : '');
  // GitHub's bash with no `shell:` is `bash -e`, without pipefail; `shell: bash` adds it.
  const flags = step.shell === 'bash' ? ['--noprofile', '--norc', '-eo', 'pipefail'] : ['-e'];
  const result = spawnSync('bash', [...flags, script], { cwd, encoding: 'utf8', env: {
    ...world.baseEnv, HOME: job.dir, GITHUB_WORKSPACE: job.workspace, RUNNER_TEMP: job.temp, GITHUB_OUTPUT: output,
    GITHUB_ENV: job.envFile, GITHUB_STEP_SUMMARY: job.summary, ...env,
  } });
  world.log.push(`[${job.name}] ${step.name ?? step.run.split('\n')[0]}\n${result.error ? `${result.error.message} in ${cwd}\n` : ''}${result.stdout ?? ''}${result.stderr ?? ''}`);
  return { ok: result.status === 0, outputs: readPairs(output) };
}

function runJob(name, spec, needs, world) {
  const dir = mkdtempSync(join(world.root, `${name}-`));
  const job = { name, dir, workspace: join(dir, 'work'), temp: join(dir, 'temp'), envFile: join(dir, 'env'), summary: join(dir, 'summary'), count: 0 };
  mkdirSync(job.workspace);
  mkdirSync(job.temp);
  const base = { github: world.github, secrets: world.secrets, needs, runner: { temp: job.temp }, steps: {}, job: { status: 'success' }, failed: false };
  const jobEnv = interpolateAll(spec.env, base);
  for (const step of spec.steps) {
    const context = { ...base, env: { ...jobEnv, ...readPairs(job.envFile) }, job: { status: base.failed ? 'failure' : 'success' } };
    if (!condition(step.if, context)) {
      if (step.id) base.steps[step.id] = { outcome: 'skipped', conclusion: 'skipped', outputs: {} };
      continue;
    }
    const { ok, outputs } = runStep(step, job, context, world);
    if (step.id) base.steps[step.id] = { outcome: ok ? 'success' : 'failure', conclusion: ok || step['continue-on-error'] ? 'success' : 'failure', outputs };
    if (!ok && !step['continue-on-error']) base.failed = true;
  }
  const outputs = interpolateAll(spec.outputs, { ...base, env: jobEnv });
  return { result: base.failed ? 'failure' : 'success', outputs, workspace: job.workspace, summary: existsSync(job.summary) ? readFileSync(job.summary, 'utf8') : '' };
}

// Runs `workflow` (parsed) for one event. `trees.main` is the default branch's files, `trees.head` the event's own
// (the main tree when absent). Returns each job's result and the whole log. Removed when the test ends.
export function runWorkflow(t, workflow, { github, secrets = {}, trees, tools, mainSha }) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-workflow-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const world = { root, github, secrets, trees, mainSha, headTree: trees.head ?? trees.main, artifacts: {}, log: [], baseEnv: {
    PATH: `${tools.bin}:${process.env.PATH}`, CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: github.repository, GITHUB_SHA: github.sha,
    GITHUB_REF_NAME: github.ref_name, GITHUB_EVENT_NAME: github.event_name, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', ...tools.env,
  } };
  const jobs = {};
  for (const [name, spec] of Object.entries(workflow.jobs)) {
    const needs = Object.fromEntries([spec.needs ?? []].flat().map(need => [need, jobs[need]]));
    const blocked = Object.values(needs).some(need => need.result !== 'success');
    const runs = condition(spec.if, { github, needs, failed: blocked });
    jobs[name] = runs ? runJob(name, spec, needs, world) : { result: 'skipped', outputs: {} };
  }
  return { jobs, log: world.log.join('\n') };
}

// Why a job that holds the deploy key could run something other than the default branch's own files, as a list.
export function trustedJobProblems(name, job) {
  const problems = [];
  for (const step of job.steps) {
    const label = `${name} › ${step.name ?? step.uses}`;
    if (step.uses && !/^actions\/[\w-]+@[0-9a-f]{40}$/.test(step.uses)) problems.push(`${label}: uses an action that is not pinned by commit`);
    if (step.uses?.startsWith('actions/checkout@')) {
      if (step.with?.path !== 'trusted' || step.with?.['persist-credentials'] !== false) problems.push(`${label}: checks out outside trusted/ or keeps git credentials`);
      if (!/github\.event\.repository\.default_branch/.test(step.with?.ref ?? '')) problems.push(`${label}: checks out the pushed branch, not the default branch`);
    }
    if (step.uses?.startsWith('actions/setup-node@') && step.with?.cache) problems.push(`${label}: restores an npm cache a branch job could have written`);
    const dir = step['working-directory'];
    if (dir && !/^(trusted\/|\$\{\{ steps\.)/.test(dir)) problems.push(`${label}: runs in ${dir}, outside trusted/`);
    const run = step.run ?? '';
    if (/(^|[^/\w])(\.\/)?scripts\//m.test(run.replaceAll('trusted/scripts/', ''))) problems.push(`${label}: runs a script outside trusted/`);
    if (/\bnpx\b|\bnpm (run|test|start|exec|install|i)\b/.test(run)) problems.push(`${label}: runs a package's own command`);
    for (const install of run.match(/npm ci[^\n]*/g) ?? []) if (!install.includes('--ignore-scripts')) problems.push(`${label}: installs with install scripts on`);
  }
  return problems;
}

// Every place a workflow names a secret outside a step's own env, or anywhere in `buildJobs`.
export function secretProblems(workflow, buildJobs) {
  const problems = [];
  for (const [name, job] of Object.entries(workflow.jobs)) {
    for (const [key, value] of Object.entries(job.env ?? {})) {
      if (/secrets\./.test(value) && !/^\$\{\{ secrets\.[A-Z_]+ != '' \}\}$/.test(value)) problems.push(`${name}: job-level env ${key} holds a secret`);
    }
    if (buildJobs.includes(name) && JSON.stringify(job).includes('secrets.')) problems.push(`${name}: runs the branch's code and names a secret`);
  }
  return problems;
}

// ── Fake tools ────────────────────────────────────────────────────────────────

const LIB = join(REPO, 'scripts/lib-wrangler-config.mjs');

// wrangler: logs one JSON line per call with the Worker and routes it would use, like the real one reads them: a
// --config skips the build's redirect. A dry run writes its bundle; FAKE_FAIL_WORKER names a Worker whose deploy fails.
const FAKE_WRANGLER = `import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { parseConfig, redirectedConfig, routesOf, workerName } from ${JSON.stringify(LIB)};
const args = process.argv.slice(2);
const flag = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const cwd = process.cwd();
const config = resolve(cwd, flag('--config') ?? (['wrangler.jsonc', 'wrangler.json'].find(name => existsSync(join(cwd, name))) ?? 'wrangler.jsonc'));
let target = {};
try {
  const generated = !flag('--config') && ['deploy', 'versions'].includes(args[0]) && redirectedConfig(config);
  const read = generated ? parseConfig(generated) : parseConfig(config);
  const env = generated ? undefined : flag('--env');
  target = { worker: workerName(read, env), routes: routesOf(read, env) };
  if (args.includes('--dry-run')) {
    mkdirSync(resolve(cwd, flag('--outdir')), { recursive: true });
    writeFileSync(join(resolve(cwd, flag('--outdir')), basename(read.main, extname(read.main)) + '.js'), 'export default {};\\n');
  }
} catch {}
appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'wrangler', args, cwd, ...target, keyed: Boolean(process.env.CLOUDFLARE_API_TOKEN) }) + '\\n');
if (args[0] === 'deploy' && !args.includes('--dry-run') && target.worker === process.env.FAKE_FAIL_WORKER) {
  console.error('fake wrangler: the deploy of ' + target.worker + ' failed');
  process.exit(1);
}
if (args[0] === 'deploy') console.log('Deployed ' + target.worker + '\\n  https://' + target.worker + '.example.workers.dev');
if (args[0] === 'versions') console.log('Version Preview Alias URL: https://' + flag('--preview-alias') + '-' + target.worker + '.example.workers.dev');
if (args[0] === 'secret') console.log('[]');
`;

// npm: `ci` runs install scripts unless --ignore-scripts and installs the fake wrangler; `run` and `test` run scripts.
const FAKE_NPM = `import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, copyFileSync, mkdirSync, readFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_LOG, JSON.stringify({ tool: 'npm', args, cwd: process.cwd() }) + '\\n');
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {};
const run = name => {
  if (!scripts[name]) return;
  const result = spawnSync('bash', ['-c', scripts[name]], { stdio: 'inherit', env: { ...process.env, PATH: process.cwd() + '/node_modules/.bin:' + process.env.PATH } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
if (args[0] === 'ci') {
  const hooks = !args.includes('--ignore-scripts');
  if (hooks) run('preinstall');
  mkdirSync('node_modules/.bin', { recursive: true });
  copyFileSync(process.env.FAKE_WRANGLER, 'node_modules/.bin/wrangler');
  chmodSync('node_modules/.bin/wrangler', 0o755);
  if (hooks) for (const name of ['install', 'postinstall', 'prepare']) run(name);
} else if (args[0] === 'run' || args[0] === 'test') {
  const name = args[0] === 'test' ? 'test' : args[1];
  if (!scripts[name]) { console.error('npm: no script ' + name); process.exit(1); }
  run(name);
} else process.exit(1);
`;

// Fake npm, npx (wrangler through it), gh and wrangler on a PATH; `calls()` reads and clears what they logged.
export function fakeTools(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-tools-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin');
  const log = join(dir, 'calls.log');
  mkdirSync(bin);
  writeFileSync(join(dir, 'wrangler.mjs'), FAKE_WRANGLER);
  writeFileSync(join(dir, 'npm.mjs'), FAKE_NPM);
  const tool = (name, text) => { writeFileSync(join(bin, name), text); chmodSync(join(bin, name), 0o755); };
  tool('wrangler', `#!/usr/bin/env bash\nexec node ${JSON.stringify(join(dir, 'wrangler.mjs'))} "$@"\n`);
  tool('npm', `#!/usr/bin/env bash\nexec node ${JSON.stringify(join(dir, 'npm.mjs'))} "$@"\n`);
  tool('npx', `#!/usr/bin/env bash\necho "{\\"tool\\":\\"npx\\",\\"args\\":\\"$*\\"}" >> "$FAKE_LOG"\n[ "$1" = wrangler ] && { shift; exec ${JSON.stringify(join(bin, 'wrangler'))} "$@"; }\nexit 0\n`);
  tool('gh', '#!/usr/bin/env bash\necho "{\\"tool\\":\\"gh\\",\\"args\\":\\"$*\\"}" >> "$FAKE_LOG"\necho 1\n');
  const calls = () => {
    const lines = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
    rmSync(log, { force: true });
    return lines;
  };
  return { bin, env: { FAKE_LOG: log, FAKE_WRANGLER: join(bin, 'wrangler') }, calls, log };
}

// ── The demo app ──────────────────────────────────────────────────────────────

export const KEY = 'dummy-deploy-key-7f3a9c';
// A package script that prints whether it can see the key.
export const PRINTS_KEY = 'echo "KEY-SEEN:${CLOUDFLARE_API_TOKEN:-none}"';
// A package script that looks for the key in every process's environment, as a lifecycle script could.
export const HUNTS_KEY = `for f in /proc/[0-9]*/environ; do tr '\\0' '\\n' 2>/dev/null < "$f" | grep -qx 'CLOUDFLARE_API_TOKEN=${KEY}' && echo KEY-FOUND-IN-$f; done; true`;

export const DEMO_CONFIG = {
  name: 'demo',
  main: 'worker/index.ts',
  compatibility_date: '2026-09-25',
  d1_databases: [{ binding: 'DB', database_name: 'demo-db', database_id: 'prod-id', migrations_dir: '../schema/migrations' }],
  env: {
    staging: {
      name: 'demo-staging',
      d1_databases: [{ binding: 'DB', database_name: 'demo-db-staging', database_id: 'staging-id', migrations_dir: '../schema/migrations' }],
    },
  },
};

// What @cloudflare/vite-plugin leaves: the chosen environment flattened into dist/<name>/wrangler.json, and a redirect.
// As in wrangler, an environment inherits no Durable Object binding.
const BUILD = `import { mkdirSync, writeFileSync } from 'node:fs';
import { parseConfig } from ${JSON.stringify(LIB)};
const source = parseConfig('wrangler.jsonc');
const env = process.env.CLOUDFLARE_ENV;
const { env: _, ...flat } = { ...source, ...(env ? { durable_objects: undefined, ...source.env[env] } : {}) };
const out = 'dist/' + source.name;
mkdirSync(out, { recursive: true });
mkdirSync('dist/client', { recursive: true });
mkdirSync('.wrangler/deploy', { recursive: true });
writeFileSync(out + '/wrangler.json', JSON.stringify({ configPath: process.cwd() + '/wrangler.jsonc', ...flat, main: 'index.js', assets: { directory: '../client' }, ...JSON.parse(process.env.BUILD_EXTRA ?? '{}') }));
writeFileSync(out + '/index.js', 'export default {};\\n');
writeFileSync('dist/client/index.html', '<h1>demo</h1>\\n');
writeFileSync('.wrangler/deploy/config.json', JSON.stringify({ configPath: '../../' + out + '/wrangler.json', auxiliaryWorkers: [] }));
`;

const SCRIPTS = ['cf-build.sh', 'cf-deploy.sh', 'cf-secrets.mjs', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs', 'lib-staging-secrets.mjs'];

// A repo with the pack's deploy scripts, the demo app and one migration, at `root`. `config` and `scripts` replace
// the app's wrangler config and package scripts. The access check is a no-op: it has its own tests.
export function demoRepo(root, { config = DEMO_CONFIG, scripts = {} } = {}) {
  const write = (path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  for (const name of SCRIPTS) write(`scripts/${name}`, readFileSync(join(REPO, 'scripts', name), 'utf8'));
  for (const shared of ['primary-root.mjs', 'cli.mjs']) write(`.claude/skills/memory/scripts/lib/${shared}`, readFileSync(join(REPO, '.claude/skills/memory/scripts/lib', shared), 'utf8'));
  write('scripts/check-private-access.mjs', '// The access check has its own tests.\n');
  write('.nvmrc', readFileSync(join(REPO, '.nvmrc'), 'utf8'));
  write('app/wrangler.jsonc', `${JSON.stringify(config, null, 2)}\n`);
  write('app/package.json', `${JSON.stringify({ name: 'demo', private: true, scripts: { 'build:app': 'node build.mjs', ...scripts } }, null, 2)}\n`);
  write('app/build.mjs', BUILD);
  write('schema/migrations/0001_init.sql', 'CREATE TABLE notes (id INTEGER PRIMARY KEY);\n');
  return { root, write };
}

// Adds `line` to a copied script right after its `set -euo pipefail`, as a branch could.
export function plant(root, script, line) {
  const path = join(root, 'scripts', script);
  writeFileSync(path, readFileSync(path, 'utf8').replace('set -euo pipefail\n', `set -euo pipefail\n${line}\n`));
}

export const wranglerCalls = calls => calls.filter(call => call.tool === 'wrangler');
