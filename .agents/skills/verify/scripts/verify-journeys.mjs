#!/usr/bin/env node
// Kept checks: a passed browser journey or request probe, saved in the project so a later publish can
// repeat it with no model. The files live at .agents/verification/journeys/<capability>/<id>.json, in
// the format verify-journey-1: the steps, what the passing evidence showed, and a reference to the
// scenario. `thenDigest` is the hash of the scenario's THEN lines, so a changed promise shows without
// keeping a second copy of it.
//
//   check     classify each kept check against openspec/specs/: ok, stale, or unreadable
//   replay    repeat the kept checks against a preview through verify-runner.sh, inside a time limit
//   keep      build a candidate from a journey the walk just passed; --install copies the proven ones in
//
// A replay result is one of four words. `same`: what was recorded is still there, which is not a fresh
// grade of the THEN. `changed`: it is not, or the written promise changed; the walk looks again.
// `skipped`: the change rewrites that promise, so its own walk covers it. `not-run`: named with its
// reason, never a pass and never a failure.
//
// A candidate is proven by `replay --from <run-dir>/keep`: alone, on staging rebuilt from the seed.
// `keep --install` copies in only the candidates that proof called `same`.
//
// The runner stays the only thing that talks to the browser, so Access headers, the throwaway profile,
// and the login-wall exit apply to a replay unchanged. Needs git, bash, and Node; nothing is installed.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { findCredential, secretValues } from '../../memory/scripts/lib/scan.mjs';
import { loadEnv, repoContext } from '../../memory/scripts/lib/store.mjs';

const USAGE = `usage: verify-journeys.mjs check [--root <repo>]
       verify-journeys.mjs replay --run-dir <dir> --url <preview> [--change-root <path>] [--from <dir>] [--only <ids>] [--budget <seconds>] [--root <repo>]
       verify-journeys.mjs keep --run-dir <dir> --url <preview> --id <journey> --expect <json> [--writes] [--root <repo>]
       verify-journeys.mjs keep --install --run-dir <dir> [--root <repo>]`;

const FORMAT = 'verify-journey-1';
const JOURNEYS = '.agents/verification/journeys';
const RUNNER = join(dirname(fileURLToPath(import.meta.url)), 'verify-runner.sh');
const BUDGET_SECONDS = 120;
const CHECK_SECONDS = 30;
const EXPECT_WAIT_MS = 5000;
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const WALK_KEYS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET'];

class Refusal extends Error {}
const refuse = reason => { throw new Refusal(reason); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const git = (root, ...args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const writes = journey => journey.writes !== false;

// ── The written promises ──────────────────────────────────────────────────────

// A spec or delta file as its requirements: the `## ` section each sits under, its scenarios, and each
// scenario's `promise`: its lines from THEN to the end.
function readSpec(source) {
  const requirements = [];
  let section = '';
  let requirement = null;
  let scenario = null;
  for (const line of source.split(/\r?\n/)) {
    const [, level, title] = /^(#{1,4}) +(.*?)\s*$/.exec(line) ?? [];
    if (!level) {
      if (scenario && line.trim() && (scenario.promise.length || /^\s*[-*]\s*\*\*THEN\*\*/.test(line))) scenario.promise.push(line.trim());
      continue;
    }
    scenario = null;
    if (level.length < 3) { section = title; requirement = null; }
    else if (level.length === 3) {
      requirement = title.startsWith('Requirement: ') ? { section, name: title.slice('Requirement: '.length).trim(), scenarios: [] } : null;
      if (requirement) requirements.push(requirement);
    } else if (requirement && title.startsWith('Scenario: ')) {
      scenario = { name: title.slice('Scenario: '.length).trim(), promise: [] };
      requirement.scenarios.push(scenario);
    }
  }
  return requirements;
}

const capabilitySpec = (root, capability) => {
  const file = join(root, 'openspec/specs', capability, 'spec.md');
  return existsSync(file) ? readSpec(readFileSync(file, 'utf8')) : [];
};

// The hash of a scenario's THEN lines as openspec/specs/ holds them now; null when it is not there.
function promiseDigest(root, { capability, requirement, scenario }) {
  const found = capabilitySpec(root, capability).find(entry => entry.name === requirement)?.scenarios.find(entry => entry.name === scenario);
  return found ? digest(found.promise.join('\n')) : null;
}

// What a change rewrites: each requirement its delta specs list as MODIFIED or REMOVED.
function ownRequirements(changeRoot) {
  const specs = join(changeRoot, 'specs');
  const own = new Set();
  for (const capability of existsSync(specs) ? readdirSync(specs) : []) {
    const delta = join(specs, capability, 'spec.md');
    if (!existsSync(delta)) continue;
    for (const requirement of readSpec(readFileSync(delta, 'utf8'))) {
      if (/^(MODIFIED|REMOVED)\b/.test(requirement.section)) own.add(JSON.stringify([capability, requirement.name]));
    }
  }
  return own;
}

// ── The file format ───────────────────────────────────────────────────────────

const FIELDS = ['format', 'id', 'scenario', 'thenDigest', 'probe', 'writes', 'sourcePaths', 'recordedAt', 'steps', 'expect'];
const within = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const oneOf = (row, keys) => within(row, keys) && Object.keys(row).length === 1 && text(Object.values(row)[0]);

// What each probe's steps and expectations may be. The expectations are a closed set, not a language.
const PROBES = {
  browser: {
    step: step => strings(step) && text(step[0]) && !step.some(arg => /https?:\/\//.test(arg)),
    expect: row => oneOf(row, ['text', 'gone', 'path']),
  },
  request: {
    step: step => strings(step) && [2, 3].includes(step.length) && /^[A-Z]+$/.test(step[0]) && step[1].startsWith('/') && !step.some(part => /[\t\r\n]/.test(part)),
    expect: (row, steps) => within(row, ['step', 'status', 'includes']) && Number.isInteger(row.step) && row.step >= 1 && row.step <= steps.length
      && (row.status !== undefined || row.includes !== undefined)
      && (row.status === undefined || Number.isInteger(row.status)) && (row.includes === undefined || text(row.includes)),
  },
};

const RULES = [
  [journey => journey.format === FORMAT, `it is not a ${FORMAT} file`],
  [journey => Object.keys(journey).every(key => FIELDS.includes(key)), 'it holds a field the format does not have'],
  [journey => text(journey.id) && NAME.test(journey.id), 'its id is malformed'],
  [({ scenario }) => within(scenario, ['capability', 'requirement', 'scenario']) && text(scenario.capability) && NAME.test(scenario.capability)
    && text(scenario.requirement) && text(scenario.scenario), 'its scenario reference is malformed'],
  [journey => /^[a-f0-9]{64}$/.test(journey.thenDigest), 'its thenDigest is malformed'],
  [journey => Object.hasOwn(PROBES, journey.probe), 'its probe is neither browser nor request'],
  [journey => ['undefined', 'boolean'].includes(typeof journey.writes), 'its writes is neither true nor false'],
  [journey => strings(journey.sourcePaths) && /^[a-f0-9]{7,40}$/.test(journey.recordedAt), 'its sourcePaths or recordedAt is malformed'],
  [({ probe, steps }) => Array.isArray(steps) && steps.length > 0 && steps.every(PROBES[probe].step),
    'a step is malformed or names a site: a browser step opens {url}, a request step is [METHOD, /path, body?]'],
  [({ probe, steps, expect }) => Array.isArray(expect) && expect.length > 0 && expect.every(row => PROBES[probe].expect(row, steps)),
    'it has no expectation, or one outside the set: text, gone, path for a browser; step with status or includes for a request'],
];

function validate(journey) {
  if (!object(journey)) refuse('it is not a JSON object');
  const broken = RULES.find(([holds]) => !holds(journey));
  if (broken) refuse(broken[1]);
  return journey;
}

// One kept check, read and classified. `key` is <capability>/<id>, the file's place under `dir`.
function classifyFile(root, dir, name) {
  const file = join(dir, name);
  const entry = { file, key: name.split(/[\\/]/).join('/').slice(0, -'.json'.length), state: 'unreadable' };
  try {
    const bytes = readFileSync(file);
    entry.sha256 = digest(bytes);
    let journey;
    try { journey = JSON.parse(bytes.toString('utf8')); } catch { refuse('it is not valid JSON'); }
    validate(journey);
    if (`${journey.scenario.capability}/${journey.id}` !== entry.key) refuse('it is not at <capability>/<id>.json');
    entry.journey = journey;
    const now = promiseDigest(root, journey.scenario);
    entry.state = now === journey.thenDigest ? 'ok' : 'stale';
    entry.gone = now === null;
    if (entry.gone) entry.reason = 'its scenario is no longer in openspec/specs/';
    else if (entry.state === 'stale') entry.reason = 'its written promise changed since it was recorded';
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    entry.reason = error.message;
  }
  return entry;
}

/** Every kept check under `dir`, in id order, each `ok`, `stale`, or `unreadable` against openspec/specs/. */
export function classify(root, dir = join(root, JOURNEYS)) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .filter(name => name.endsWith('.json') && basename(name) !== 'replay.json').sort()
    .map(name => classifyFile(root, dir, name));
}

// ── Replay ────────────────────────────────────────────────────────────────────

// The head commit, and the files this branch changed since it left the default branch.
function branchChanges(root) {
  const base = [git(root, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'), 'origin/main', 'main']
    .filter(Boolean).map(ref => git(root, 'merge-base', ref, 'HEAD')).find(Boolean);
  return {
    head: git(root, 'rev-parse', 'HEAD'),
    changed: base ? git(root, 'diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean) : [],
  };
}

// Files that tie a check to no area: plans and docs, the release notes and lockfile nearly every
// change touches, and tests, which change what no page shows. Left out when a check is recorded, and
// ignored when one is matched, so a kept file written before this rule orders the same way.
const SHARED = /^(openspec|wiki|\.agents\/verification)\/|(^|\/)(CHANGELOG\.md|VERSION|package-lock\.json)$|(^|\/)(tests?|__tests__|fixtures)\/|\.(test|spec)\.[a-z]+$/;

// Checks recorded against files the branch changed go first. The rest follow in id order, rotated by
// the head commit's hash, so every check is reached over several publishes with no stored state.
// Within each group the read-only checks go before the ones that write.
function replayOrder(entries, { head, changed }) {
  const touched = entry => entry.journey.sourcePaths.some(path => !SHARED.test(path) && changed.includes(path));
  const rest = entries.filter(entry => !touched(entry));
  const offset = rest.length ? parseInt(head.slice(0, 8) || '0', 16) % rest.length : 0;
  const readOnlyFirst = list => [...list.filter(entry => !writes(entry.journey)), ...list.filter(entry => writes(entry.journey))];
  return [...readOnlyFirst(entries.filter(touched)), ...readOnlyFirst([...rest.slice(offset), ...rest.slice(0, offset)])];
}

// What preflight recorded about staging for this walk: SEEDED and PLAYGROUND.
function stagingFacts(runDir) {
  const file = join(runDir, 'staging-facts');
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split('\n').filter(line => line.includes('=')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

// Exported values win; missing ones come from the primary worktree's .env, as in verify-staging.sh.
function dotenv(root) {
  try { return loadEnv(repoContext(root)); } catch { return {}; }
}
function walkEnv(root) {
  const stored = dotenv(root);
  const env = { ...process.env };
  for (const key of WALK_KEYS) if (!env[key] && stored[key]) env[key] = stored[key];
  return env;
}

// Run a command to its end or to its limit. Past the limit, it and everything it started are asked to
// stop, so the runner removes its browser profile, and are killed two seconds later if they have not.
// Output goes to a file, not a pipe, so a browser left running can not hold this open.
function run(command, args, { cwd, env, limitMs, log }) {
  return new Promise(done => {
    const out = openSync(log, 'a');
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', out, out] });
    const signal = name => { try { process.kill(-child.pid, name); } catch { /* it ended on its own */ } };
    let timedOut = false;
    let killer;
    const timer = setTimeout(() => {
      timedOut = true;
      signal('SIGTERM');
      killer = setTimeout(signal, 2000, 'SIGKILL');
    }, Math.max(limitMs, 0));
    let finished = false;
    const finish = status => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(killer);
      closeSync(out);
      done({ status, timedOut });
    };
    child.once('error', () => finish(127));
    child.once('exit', finish);
  });
}

const lastLine = log => readFileSync(log, 'utf8').trim().split('\n').at(-1) || 'it said nothing';

// The steps as the runner's batch file, then one closing wait per expectation, so --bail stops at the
// first thing that is no longer there. `path` is read afterwards from the landed address.
function browserBatch(journey, url) {
  const waits = journey.expect.flatMap(row => {
    if (row.text) return [{ command: ['wait', '--text', row.text], says: `the page no longer shows "${row.text}"` }];
    if (row.gone) return [{ command: ['wait', '--fn', `!document.body.innerText.includes(${JSON.stringify(row.gone)})`], says: `the page still shows "${row.gone}"` }];
    return [];
  });
  return {
    waits,
    commands: [...journey.steps.map(step => step.map(arg => arg.replaceAll('{url}', url))), ...waits.map(wait => [...wait.command, '--timeout', String(EXPECT_WAIT_MS)])],
  };
}

const changed = reason => ({ result: 'changed', reason });
const SAME = { result: 'same' };

function readBrowser(journey, { commands, waits }, evidence, stem) {
  const outcome = readJson(join(evidence, `${stem}.result.json`));
  if (!Array.isArray(outcome)) return changed('the browser returned no result');
  const failed = outcome.findIndex(step => step?.success !== true);
  const at = failed >= 0 ? failed : outcome.length < commands.length ? outcome.length : -1;
  if (at >= journey.steps.length) return changed(waits[at - journey.steps.length].says);
  if (at >= 0) return changed(`step ${at + 1} no longer works (${journey.steps[at].join(' ').slice(0, 80)})`);
  const landed = readFileSync(join(evidence, `${stem}.url`), 'utf8').trim();
  const path = URL.canParse(landed) ? new URL(landed).pathname : landed;
  const wrong = journey.expect.find(row => row.path && row.path !== path);
  return wrong ? changed(`it landed on ${path || 'no page'}, not ${wrong.path}`) : SAME;
}

// A captured response starts after the runner's `---` line. Any 1xx status comes before the real one.
function readRequests(journey, evidence, stem) {
  for (const row of journey.expect) {
    const file = join(evidence, stem, `${String(row.step).padStart(2, '0')}-response.txt`);
    const captured = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const response = captured.slice(captured.indexOf('\n---\n') + '\n---\n'.length);
    const status = [...response.matchAll(/^HTTP\/\S+ (\d{3})/gm)].map(match => Number(match[1])).find(code => code >= 200) ?? 0;
    if (row.status !== undefined && row.status !== status) return changed(`request ${row.step} answered ${status || 'nothing'}, not ${row.status}`);
    if (row.includes !== undefined && !response.includes(row.includes)) return changed(`request ${row.step}'s answer no longer holds "${row.includes}"`);
  }
  return SAME;
}

// One check through the runner. `stop` on a result means no later check can run either.
async function runCheck({ journey, stem, runnerDir, url, env, deadline, checkSeconds, budgetSeconds }) {
  const browser = journey.probe === 'browser' ? browserBatch(journey, url) : null;
  const input = join(runnerDir, 'journeys', `${stem}.${browser ? 'batch.json' : 'requests.txt'}`);
  writeFileSync(input, browser ? JSON.stringify(browser.commands) : `${journey.steps.map(step => step.join('\t')).join('\n')}\n`);
  const left = deadline - Date.now();
  const capped = checkSeconds * 1000 <= left;
  const log = join(runnerDir, `${stem}.log`);
  const ran = await run('bash', [RUNNER, runnerDir], { env, limitMs: capped ? checkSeconds * 1000 : left, log });
  rmSync(input);
  if (ran.timedOut) {
    // The stopped journey's browser session outlives it; close it so no browser is left running.
    if (browser) await run('agent-browser', ['--session', `verify-${basename(runnerDir)}-${stem}`, 'close'], { env, limitMs: 5000, log });
    return capped ? changed(`it took longer than ${checkSeconds} seconds`)
      : { result: 'not-run', reason: `the ${budgetSeconds}-second limit was reached`, stop: true };
  }
  if (ran.status === 3) return { result: 'not-run', reason: 'the preview answered with a login wall', stop: true };
  if (ran.status !== 0) return { result: 'not-run', reason: `the driver could not run it (${lastLine(log)})` };
  const evidence = join(runnerDir, 'evidence');
  return browser ? readBrowser(journey, browser, evidence, stem) : readRequests(journey, evidence, stem);
}

// Why a check is settled before anything runs, or null when it should run.
function settledEarly(entry, { own, facts }) {
  if (entry.state === 'unreadable') return ['not-run', `unreadable: ${entry.reason}`];
  const { scenario } = entry.journey;
  if (own.has(JSON.stringify([scenario.capability, scenario.requirement]))) return ['skipped', 'this change rewrites its promise, so the change\'s own check covers it'];
  if (entry.gone) return ['not-run', entry.reason];
  if (entry.state === 'stale') return ['changed', entry.reason];
  if (facts.SEEDED !== 'yes') return ['not-run', `staging was not rebuilt from the sample data (${facts.SEEDED?.replace(/^no ?/, '') || 'this check made no rebuild'})`];
  if (writes(entry.journey) && facts.PLAYGROUND !== 'yes') return ['not-run', 'it writes, and staging is not a safe place to write'];
  return null;
}

/**
 * Replay the kept checks under `from` (default: the project's) against `url`, and write replay.json
 * beside them when `from` is given, else into the run folder. With `from`, every check is a proof:
 * it starts from a rebuilt staging, read-only or not.
 */
export async function replay({ root, runDir, url, changeRoot, from, ids, budgetSeconds = BUDGET_SECONDS, checkSeconds = CHECK_SECONDS }) {
  const started = Date.now();
  const deadline = started + budgetSeconds * 1000;
  const context = { own: changeRoot ? ownRequirements(changeRoot) : new Set(), facts: stagingFacts(runDir) };
  const branch = branchChanges(root);
  const results = [];
  const settle = (entry, result, reason, more = {}) => results.push({ key: entry.key, sha256: entry.sha256, result, ...(reason ? { reason } : {}), ...more });
  const runnable = [];
  for (const entry of classify(root, from)) {
    if (ids && !ids.includes(entry.key) && !ids.includes(basename(entry.key))) continue;
    const early = settledEarly(entry, context);
    if (early) settle(entry, ...early);
    else runnable.push(entry);
  }

  const runnerDir = mkdtempSync(join(runDir, 'replay-'));
  mkdirSync(join(runnerDir, 'journeys'));
  const env = { ...walkEnv(root), VERIFY_URL: url.replace(/\/+$/, '') };
  let stop = null;
  let dirty = false; // a kept check wrote since the last rebuild
  for (const [index, entry] of replayOrder(runnable, branch).entries()) {
    if (!stop && Date.now() >= deadline) stop = `the ${budgetSeconds}-second limit was reached`;
    if (stop) { settle(entry, 'not-run', stop); continue; }
    const stem = String(index + 1).padStart(2, '0');
    const before = Date.now();
    if (from || dirty || writes(entry.journey)) {
      const rebuilt = await run(process.execPath, [join(root, 'scripts/reset-staging-d1.mjs')], { cwd: root, env, limitMs: deadline - Date.now(), log: join(runnerDir, 'rebuild.log') });
      dirty = false;
      if (rebuilt.status !== 0) {
        stop = rebuilt.timedOut ? `the ${budgetSeconds}-second limit was reached` : 'a staging rebuild failed (rebuild.log in the replay folder says why)';
        settle(entry, 'not-run', stop);
        continue;
      }
    }
    const outcome = await runCheck({ journey: entry.journey, stem, runnerDir, url: env.VERIFY_URL, env, deadline, checkSeconds, budgetSeconds });
    dirty = writes(entry.journey);
    if (outcome.stop) stop = outcome.reason;
    settle(entry, outcome.result, outcome.reason, { evidence: join(basename(runnerDir), 'evidence', stem), seconds: Math.round((Date.now() - before) / 100) / 10 });
  }

  const count = word => results.filter(entry => entry.result === word).length;
  const seconds = Math.round((Date.now() - started) / 1000);
  const summary = `REPLAY=same ${count('same')}, changed ${count('changed')}, skipped ${count('skipped')}, not-run ${count('not-run')}; ${seconds}s`;
  writeFileSync(join(from ?? runDir, 'replay.json'), `${JSON.stringify({ format: 'verify-replay-1', head: branch.head, url: env.VERIFY_URL, seconds, results }, null, 2)}\n`);
  return { results, summary };
}

// ── Keep ──────────────────────────────────────────────────────────────────────

const slug = words => words.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

// The preview's address at the start of a step becomes {url}, so no kept file holds a host name.
function swapHost(arg, origin) {
  const rest = arg.startsWith(origin) ? arg.slice(origin.length) : null;
  return rest !== null && /^([/?#]|$)/.test(rest) ? `{url}${rest}` : arg;
}

// A walked journey's steps in the kept shape: no screenshots, no preview host.
function keptSteps(journeys, id, origin) {
  const batch = join(journeys, `${id}.batch.json`);
  const requests = join(journeys, `${id}.requests.txt`);
  if (existsSync(batch) === existsSync(requests)) refuse('it needs one browser journey or one request probe, and has neither or both');
  if (existsSync(batch)) {
    const commands = readJson(batch);
    if (!Array.isArray(commands) || !commands.every(strings)) refuse('its batch file is not a list of commands');
    return { probe: 'browser', steps: commands.filter(step => step[0] !== 'screenshot').map(step => step.map(arg => swapHost(arg, origin))) };
  }
  const rows = readFileSync(requests, 'utf8').split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => line.split('\t'));
  return { probe: 'request', steps: rows.map(([method, target = '', body]) => [method, swapHost(target, origin).replace(/^\{url\}/, '') || '/', ...(body ? [body] : [])]) };
}

// Where the scenario is written, and the name its kept check gets: the scenario's own, or with its
// requirement in front when two requirements of one capability share a scenario name.
function locate(root, meta) {
  if (!object(meta) || !text(meta.requirement) || !text(meta.scenario)) refuse('its meta file names no requirement and scenario');
  const specs = join(root, 'openspec/specs');
  const candidates = text(meta.capability) ? [meta.capability] : existsSync(specs) ? readdirSync(specs) : [];
  const scenario = { requirement: meta.requirement, scenario: meta.scenario };
  const homes = candidates.filter(capability => promiseDigest(root, { capability, ...scenario }) !== null);
  if (homes.length > 1) refuse('its scenario is in more than one capability; name one as `capability` in its meta file');
  if (!homes.length) refuse('its scenario is not in openspec/specs/');
  const shared = capabilitySpec(root, homes[0]).filter(entry => entry.scenarios.some(other => other.name === meta.scenario)).length > 1;
  const named = shared ? `${meta.requirement} ${meta.scenario}` : meta.scenario;
  return { scenario: { capability: homes[0], ...scenario }, id: slug(named) || `scenario-${digest(named).slice(0, 12)}` };
}

// What is never kept, as far as the steps can show it. The walk rules out the rest: a private link, an
// outside service, a manual job trigger.
const NEVER_KEPT = [
  [({ steps }) => steps.some(step => ['auth', 'state'].includes(step[0])), 'a step uses a saved login'],
  [({ steps }) => steps.flat().some(arg => /^@e\d+$/.test(arg)), 'a step uses a snapshot reference, which dies with the page'],
  [({ steps, runDir }) => steps.flat().some(arg => arg.includes(runDir)), 'a step saves a file into the run folder'],
  [({ steps, expect, secrets }) => findCredential(JSON.stringify([steps, expect]), secrets), 'a step holds a credential'],
  [({ expect }) => !Array.isArray(expect) || !expect.length, 'it has no expectation the passing evidence showed'],
];

/** Build a candidate from the walked journey `id` and write it under <run-dir>/keep/. Throws a Refusal naming why not. */
export function keep({ root, runDir, url, id, expect, writing = false }) {
  const journeys = join(runDir, 'journeys');
  const { probe, steps } = keptSteps(journeys, id, url.replace(/\/+$/, ''));
  // Each value also as JSON writes it, the way the walk's scrub matches them.
  const known = [...Object.values(dotenv(root)), ...WALK_KEYS.map(key => process.env[key])].filter(text);
  const secrets = secretValues(known.flatMap(value => [value, JSON.stringify(value).slice(1, -1)]));
  const never = NEVER_KEPT.find(([holds]) => holds({ steps, expect, secrets, runDir }));
  if (never) refuse(never[1]);
  const { scenario, id: name } = locate(root, readJson(join(journeys, `${id}.meta.json`)));
  const branch = branchChanges(root);
  const candidate = validate({
    format: FORMAT,
    id: name,
    scenario,
    thenDigest: promiseDigest(root, scenario),
    probe,
    writes: writing || steps.some(step => probe === 'request' && !['GET', 'HEAD'].includes(step[0])),
    sourcePaths: branch.changed.filter(path => !SHARED.test(path)),
    recordedAt: branch.head,
    steps,
    expect,
  });
  const file = join(runDir, 'keep', scenario.capability, `${name}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(candidate, null, 2)}\n`);
  return `${scenario.capability}/${name}`;
}

/**
 * Copy each candidate its own proof called `same` into the project, and remove the kept checks whose
 * scenario no longer exists. Returns one line per file it kept, left out, or removed.
 */
export function install({ root, runDir }) {
  const keepDir = join(runDir, 'keep');
  const proof = readJson(join(keepDir, 'replay.json'))?.results ?? [];
  const lines = [];
  for (const entry of classify(root, keepDir)) {
    const proven = proof.find(result => result.key === entry.key && result.sha256 === entry.sha256);
    if (proven?.result !== 'same') {
      lines.push(`left out ${entry.key} — ${proven ? proven.reason ?? proven.result : 'it was not replayed alone first'}`);
      continue;
    }
    const target = join(root, JOURNEYS, `${entry.key}.json`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(entry.file, target);
    lines.push(`kept ${entry.key}`);
  }
  for (const entry of classify(root).filter(kept => kept.gone)) {
    rmSync(entry.file);
    lines.push(`removed ${entry.key} — ${entry.reason}`);
  }
  return lines;
}

// ── The command line ──────────────────────────────────────────────────────────

const line = entry => `${entry.result ?? entry.state} ${entry.key}${entry.reason ? ` — ${entry.reason}` : ''}`;

async function main() {
  const { values, positionals } = parseCli({
    usage: USAGE,
    allowPositionals: true,
    options: {
      root: { type: 'string' }, 'run-dir': { type: 'string' }, url: { type: 'string' }, 'change-root': { type: 'string' }, from: { type: 'string' },
      only: { type: 'string' }, budget: { type: 'string' }, id: { type: 'string' }, expect: { type: 'string' }, writes: { type: 'boolean' }, install: { type: 'boolean' },
    },
  });
  const [command, ...extra] = positionals;
  const need = (...names) => names.forEach(name => values[name] || usageError(USAGE, `${command} needs --${name}`));
  if (extra.length || !['check', 'replay', 'keep'].includes(command)) usageError(USAGE);
  const root = resolve(values.root ?? (git(process.cwd(), 'rev-parse', '--show-toplevel') || usageError(USAGE, 'not inside a git repository; pass --root')));
  const runDir = values['run-dir'] && resolve(values['run-dir']);
  if (runDir && !existsSync(runDir)) usageError(USAGE, `no run folder at ${runDir}`);

  if (command === 'check') {
    const entries = classify(root);
    const count = state => entries.filter(entry => entry.state === state).length;
    for (const entry of entries) console.log(line(entry));
    console.log(`JOURNEYS=ok ${count('ok')}, stale ${count('stale')}, unreadable ${count('unreadable')}`);
    process.exitCode = count('unreadable') ? 1 : 0;
  } else if (command === 'replay') {
    need('run-dir', 'url');
    const budgetSeconds = Number(values.budget ?? BUDGET_SECONDS);
    if (!(budgetSeconds > 0)) usageError(USAGE, '--budget is a number of seconds');
    const { results, summary } = await replay({
      root, runDir, url: values.url, budgetSeconds, ids: values.only?.split(',').filter(Boolean),
      changeRoot: values['change-root'] && resolve(values['change-root']), from: values.from && resolve(values.from),
    });
    for (const entry of results) console.log(line(entry));
    console.log(summary);
  } else if (values.install) {
    need('run-dir');
    const lines = install({ root, runDir });
    for (const entry of lines) console.log(entry);
    const count = word => lines.filter(entry => entry.startsWith(`${word} `)).length;
    console.log(`KEEP=kept ${count('kept')}, left out ${count('left out')}, removed ${count('removed')}`);
  } else {
    need('run-dir', 'url', 'id', 'expect');
    try {
      console.log(`KEEP=candidate ${keep({ root, runDir, url: values.url, id: values.id, expect: readExpect(values.expect), writing: values.writes })}`);
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      console.log(`KEEP=refused ${values.id} — ${error.message}`);
      process.exitCode = 1;
    }
  }
}

function readExpect(source) {
  try { return JSON.parse(source); } catch { return usageError(USAGE, '--expect is not valid JSON'); }
}

if (isMain(import.meta.url)) await main();
