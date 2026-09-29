#!/usr/bin/env node
// /update-dependencies' one script: survey every tool and dependency, update what is behind,
// move the OpenSpec pins together, check the CLI contract, and report. Every stage compares
// against latest, so a rerun after a fix finds finished stages current. Meta-only; Node built-ins.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli } from '../../../../scripts/lib-cli.mjs';

const USAGE = `Usage: node .claude/skills/update-dependencies/scripts/update.mjs [--dry-run] [--hold <package>]...

Surveys and updates the OpenSpec and browser CLIs, the OpenSpec pins, and the app/ and
scripts/tests/ dependencies, then checks the OpenSpec contract and reports. Each stage
prints "== <stage>", a line per item, then "ok", or "FAIL <what> — <error>" and exits 1.
Run it again after a fix: finished stages report current.

  --dry-run  survey, and print what each later stage would change; write nothing
  --hold     keep this package at the range package.json names (repeatable)`;

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const NODE_INDEX = 'https://nodejs.org/dist/index.json';
const CONTRACT_TEST = 'scripts/tests/openspec-contract.test.mjs';
// Every place that names the OpenSpec version; CI's pin (the first) is the reference.
export const PIN_FILES = [
  '.github/workflows/payload.yml',
  'server/setup.sh',
  '.agents/skills/save/references/preconditions.md',
  '.github/CONTRIBUTING.md',
];
const PROSE_FILE = '.github/CONTRIBUTING.md';
const PACKAGE_STAGES = [['app', 'app'], ['test-tools', 'scripts/tests']];
const NPM_TOOLS = { openspec: '@fission-ai/openspec', 'agent-browser': 'agent-browser' };
const SECTIONS = ['dependencies', 'devDependencies'];
const LOOKUPS_AT_ONCE = 8;

class StageFailure extends Error {
  constructor(what, detail) { super(detail ? `${what} — ${detail}` : what); }
}

// ---- Pure helpers (exported for tests) ----

/** `[major, minor, patch]` from the first x.y.z in `text`, or null. */
export function parseVersion(text) {
  const match = String(text ?? '').match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1, 4).map(Number) : null;
}

/** The first x.y.z in `text` (a `--version` line), or null. */
export function versionOf(text) {
  return parseVersion(text)?.join('.') ?? null;
}

export function compareVersions(a, b) {
  const [x, y] = [parseVersion(a) ?? [0, 0, 0], parseVersion(b) ?? [0, 0, 0]];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return Math.sign(x[i] - y[i]);
  return 0;
}

/** A breaking jump: a new major, or a new minor below 1.0.0. */
export function isMajor(from, to) {
  const [a, b] = [parseVersion(from), parseVersion(to)];
  if (!a || !b) return false;
  return b[0] > a[0] || (a[0] === 0 && b[0] === 0 && b[1] > a[1]);
}

/** `range` moved to `latest`, keeping its `^` or `~`; unchanged when current; null for a range this can't bump. */
export function bumpRange(range, latest) {
  const match = String(range).match(/^([\^~]?)(\d+\.\d+\.\d+)$/);
  if (!match || !/^\d+\.\d+\.\d+$/.test(latest)) return null;
  return compareVersions(latest, match[2]) > 0 ? `${match[1]}${latest}` : range;
}

/** The newest stable version in `versions` whose major is `major`, or null. */
export function latestInMajor(versions, major) {
  return versions.filter(v => /^\d+\.\d+\.\d+$/.test(v) && parseVersion(v)[0] === major)
    .sort(compareVersions).at(-1) ?? null;
}

const PIN = /@fission-ai\/openspec@(\d+\.\d+\.\d+(?:-[\w.]+)?)/;
const PROSE = /\bOpenSpec (\d+\.\d+\.\d+)/;

export function readPin(text) {
  return text.match(PIN)?.[1] ?? null;
}

/** `text` with every OpenSpec pin, and with `prose` its "OpenSpec x.y.z" too, set to `version`. */
export function rewritePins(text, version, prose = false) {
  const out = text.replace(new RegExp(PIN.source, 'g'), `@fission-ai/openspec@${version}`);
  return prose ? out.replace(new RegExp(PROSE.source, 'g'), `OpenSpec ${version}`) : out;
}

/** What moving `pkg` to `latest` changes; `@types/node` goes to `typesNode` (the `.nvmrc` major's latest). */
export function planPackages(pkg, latest, typesNode = null) {
  const changes = [];
  const skipped = [];
  for (const section of SECTIONS) {
    for (const [name, range] of Object.entries(pkg[section] ?? {})) {
      const target = name === '@types/node' ? typesNode : latest[name];
      if (!target) continue;
      const to = bumpRange(range, target);
      if (to === null) skipped.push({ name, range });
      else if (to !== range) changes.push({ section, name, from: range, to, major: isMajor(range, to) });
    }
  }
  return { changes, skipped };
}

export function applyPlan(pkg, changes) {
  const out = structuredClone(pkg);
  for (const { section, name, to } of changes) out[section][name] = to;
  return out;
}

/** Every range that differs between two package.json objects. */
export function diffPackages(before, after) {
  const moves = [];
  for (const section of SECTIONS) {
    for (const [name, to] of Object.entries(after?.[section] ?? {})) {
      const from = before?.[section]?.[name];
      if (from && from !== to) moves.push({ name, from, to, major: isMajor(from, to) });
    }
  }
  return moves;
}

/** True when the lock's root entry names the same ranges as package.json. */
export function lockInSync(pkg, lock) {
  const root = lock?.packages?.[''];
  if (!root) return false;
  const same = (a = {}, b = {}) => Object.keys(a).length === Object.keys(b).length
    && Object.entries(a).every(([name, range]) => b[name] === range);
  return SECTIONS.every(section => same(pkg[section], root[section]));
}

function tail(text) {
  const lines = String(text).split('\n').map(line => line.trim())
    .filter(line => line && !/complete log of this run/i.test(line));
  return lines.slice(-3).join(' / ') || 'no output';
}

// ---- Running commands ----

function exec(ctx, cmd, args, cwd = ctx.root) {
  return new Promise(done => {
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, { cwd, env: ctx.env });
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => done({ status: null, stdout, stderr: error.message }));
    child.on('close', status => done({ status, stdout, stderr }));
  });
}

async function need(ctx, cmd, args, cwd) {
  const result = await exec(ctx, cmd, args, cwd);
  if (result.status !== 0) throw new StageFailure(`${cmd} ${args.join(' ')}`, tail(result.stderr || result.stdout));
  return result.stdout.trim();
}

async function mapLimit(items, limit, fn) {
  const out = Array.from({ length: items.length });
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function installed(ctx, tool) {
  const result = await exec(ctx, tool, ['--version']);
  return result.status === 0 ? versionOf(result.stdout) : null;
}

async function defaultFetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const readText = (ctx, file) => readFileSync(join(ctx.root, file), 'utf8');
const readJson = (ctx, file) => JSON.parse(readText(ctx, file));
const behind = tool => !tool.installed || (tool.latest && compareVersions(tool.latest, tool.installed) > 0);

function needsYou(ctx, text) {
  ctx.needsYou.push(text);
  ctx.log(`needs you: ${text}`);
}

// Each file as HEAD has it (else as the run found it), so a rerun still reports what moved.
function baseline(ctx, file) {
  const shown = spawnSync('git', ['show', `HEAD:./${file}`], { cwd: ctx.root, env: ctx.env, encoding: 'utf8' });
  if (shown.status === 0) return shown.stdout;
  return existsSync(join(ctx.root, file)) ? readText(ctx, file) : null;
}

// ---- Stages ----

async function survey(ctx) {
  ctx.nodeMajor = parseVersion(`${readText(ctx, '.nvmrc').trim().replace(/^v/, '')}.0.0`)[0];
  const tools = {};
  await Promise.all([
    ...Object.entries(NPM_TOOLS).map(async ([name, pkg]) => {
      const [now, latest] = await Promise.all([installed(ctx, name), need(ctx, 'npm', ['view', pkg, 'version'])]);
      tools[name] = { pkg, installed: now, latest: versionOf(latest) };
    }),
    (async () => {
      const now = await installed(ctx, 'gh');
      tools.gh = { installed: now, latest: now && versionOf(await need(ctx, 'gh', ['api', 'repos/cli/cli/releases/latest', '--jq', '.tag_name'])) };
    })(),
    (async () => {
      let index;
      try { index = await ctx.fetchJson(NODE_INDEX); } catch (error) { throw new StageFailure(`fetch ${NODE_INDEX}`, error.message); }
      tools.node = { installed: await installed(ctx, 'node'), latest: latestInMajor(index.map(row => row.version.replace(/^v/, '')), ctx.nodeMajor) };
    })(),
    (async () => { tools.git = { installed: await installed(ctx, 'git') }; })(),
  ]);
  ctx.tools = tools;
  for (const name of [...Object.keys(NPM_TOOLS), 'gh', 'node', 'git']) {
    const tool = tools[name];
    if (!('latest' in tool)) ctx.log(`${name} ${tool.installed ?? 'missing'} installed`);
    else ctx.log(behind(tool) ? `${name} ${tool.installed ?? 'missing'} -> ${tool.latest}` : `${name} ${tool.installed} current`);
  }

  ctx.plans = {};
  for (const [label, dir] of PACKAGE_STAGES) {
    if (!existsSync(join(ctx.root, dir, 'package.json'))) continue;
    const pkg = readJson(ctx, `${dir}/package.json`);
    const names = [...new Set(SECTIONS.flatMap(section => Object.keys(pkg[section] ?? {})))];
    const open = names.filter(name => !ctx.hold.includes(name));
    const versions = await mapLimit(open, LOOKUPS_AT_ONCE, name => need(ctx, 'npm', ['view', name, 'version']));
    const latest = Object.fromEntries(open.map((name, i) => [name, versionOf(versions[i])]));
    let typesNode = null;
    if (open.includes('@types/node')) {
      const all = JSON.parse(await need(ctx, 'npm', ['view', '@types/node', 'versions', '--json']));
      typesNode = latestInMajor(all, ctx.nodeMajor);
    }
    const plan = planPackages(pkg, latest, typesNode);
    ctx.plans[label] = { dir, pkg, ...plan };
    for (const name of names) {
      const change = plan.changes.find(c => c.name === name);
      const skip = plan.skipped.find(s => s.name === name);
      if (change) ctx.log(`${dir}/${name} ${change.from} -> ${change.to}${change.major ? ' [major]' : ''}`);
      else if (skip) ctx.log(`${dir}/${name} ${skip.range} skipped: not a plain version range`);
      else if (ctx.hold.includes(name)) ctx.log(`${dir}/${name} held`);
      else ctx.log(`${dir}/${name} current`);
    }
  }
}

async function updateTools(ctx) {
  for (const name of Object.keys(NPM_TOOLS)) {
    const tool = ctx.tools[name];
    if (!behind(tool)) { ctx.log(`${name} current`); continue; }
    const spec = `${tool.pkg}@${tool.latest}`;
    if (ctx.dryRun) { ctx.log(`would run npm install -g ${spec}`); continue; }
    const result = await exec(ctx, 'npm', ['install', '-g', spec]);
    if (result.status !== 0) {
      if (/EACCES|EPERM|permission denied/i.test(result.stderr)) needsYou(ctx, `npm install -g ${spec} needs admin rights`);
      throw new StageFailure(`npm install -g ${spec}`, tail(result.stderr || result.stdout));
    }
    const now = await installed(ctx, name);
    if (now !== tool.latest) throw new StageFailure(`${name} --version`, `says ${now ?? 'nothing'} after installing ${tool.latest}`);
    ctx.log(`${name} ${tool.installed ?? 'missing'} -> ${now}`);
    ctx.updatedTools.push(`${name} ${now}`);
  }
  for (const name of ['gh', 'node']) {
    const tool = ctx.tools[name];
    if (behind(tool)) needsYou(ctx, `${name} ${tool.installed ?? 'missing'} -> ${tool.latest ?? 'latest'}: update it with the system package manager`);
    else ctx.log(`${name} current`);
  }
  if (!ctx.tools.git.installed) needsYou(ctx, 'git is missing: install it with the system package manager');
  else ctx.log('git installed');
}

async function movePins(ctx) {
  const target = ctx.tools.openspec.latest;
  const files = PIN_FILES.map(file => {
    const text = readText(ctx, file);
    const pin = readPin(text);
    if (!pin) throw new StageFailure(file, 'names no pinned OpenSpec version');
    const prose = file === PROSE_FILE ? text.match(PROSE)?.[1] ?? target : target;
    return { file, text, pin, stale: pin !== target || prose !== target };
  });
  const stale = files.filter(f => f.stale);
  if (!stale.length) { ctx.log(`openspec pins current (${target})`); return; }
  for (const { file, text, pin } of stale) {
    ctx.log(`${ctx.dryRun ? 'would move ' : ''}${file} ${pin} -> ${target}`);
    if (!ctx.dryRun) writeFileSync(join(ctx.root, file), rewritePins(text, target, file === PROSE_FILE));
  }
  if (ctx.dryRun) return;
  for (const file of PIN_FILES) {
    const pin = readPin(readText(ctx, file));
    if (pin !== target) throw new StageFailure(file, `still pins OpenSpec ${pin}, not ${target}`);
  }
}

function updatePackages(label) {
  return async ctx => {
    const plan = ctx.plans[label];
    if (!plan) { ctx.log('no package.json; skipped'); return; }
    const { dir, changes } = plan;
    for (const c of changes) ctx.log(`${ctx.dryRun ? 'would move ' : ''}${c.name} ${c.from} -> ${c.to}${c.major ? ' [major]' : ''}`);
    const lockFile = `${dir}/package-lock.json`;
    const lock = () => existsSync(join(ctx.root, lockFile)) ? readJson(ctx, lockFile) : null;
    if (ctx.dryRun) {
      if (changes.length || !lockInSync(plan.pkg, lock())) ctx.log(`would run npm install in ${dir}`);
      else ctx.log(`${dir} current`);
      return;
    }
    if (changes.length) writeFileSync(join(ctx.root, dir, 'package.json'), `${JSON.stringify(applyPlan(plan.pkg, changes), null, 2)}\n`);
    const pkg = readJson(ctx, `${dir}/package.json`);
    if (!changes.length && lockInSync(pkg, lock())) { ctx.log(`${dir} current`); return; }
    const result = await exec(ctx, 'npm', ['install', '--no-audit', '--no-fund'], join(ctx.root, dir));
    if (result.status !== 0) throw new StageFailure(`npm install in ${dir}`, tail(result.stderr || result.stdout));
    if (!lockInSync(pkg, lock())) throw new StageFailure(lockFile, 'still disagrees with package.json after npm install');
    ctx.log(`${lockFile} refreshed`);
  };
}

function openspecMove(ctx) {
  const from = readPin(ctx.base[PIN_FILES[0]] ?? '');
  const to = ctx.dryRun ? ctx.tools.openspec.latest : readPin(readText(ctx, PIN_FILES[0]));
  return from && to && from !== to ? { from, to } : null;
}

async function checkContract(ctx) {
  const move = openspecMove(ctx);
  if (!move) { ctx.log('openspec did not move; skipped'); return; }
  if (ctx.dryRun) { ctx.log(`would run node --test ${CONTRACT_TEST} against openspec ${move.to}`); return; }
  const result = await exec(ctx, process.execPath, ['--test', CONTRACT_TEST]);
  if (result.status !== 0) throw new StageFailure(`node --test ${CONTRACT_TEST}`, tail(`${result.stdout}\n${result.stderr}`));
  ctx.log(`openspec ${move.to} passes ${CONTRACT_TEST}`);
}

async function changelogUrl(ctx, name) {
  const result = await exec(ctx, 'npm', ['view', name, 'repository.url']);
  const url = result.status === 0 ? result.stdout.trim() : '';
  const github = url.match(/github\.com[/:]([^/]+\/[^/#]+?)(?:\.git)?(?:#.*)?$/);
  if (github) return `https://github.com/${github[1]}/releases`;
  return url.replace(/^git\+/, '') || `https://www.npmjs.com/package/${name}`;
}

async function report(ctx) {
  const moves = [];
  for (const [label, dir] of PACKAGE_STAGES) {
    const plan = ctx.plans[label];
    if (!plan) continue;
    const before = ctx.base[`${dir}/package.json`];
    const after = ctx.dryRun ? applyPlan(plan.pkg, plan.changes) : readJson(ctx, `${dir}/package.json`);
    moves.push(...diffPackages(before && JSON.parse(before), after).map(move => ({ ...move, name: `${dir}/${move.name}`, bare: move.name })));
  }
  const openspec = openspecMove(ctx);
  const toolsBehind = ctx.dryRun && Object.keys(NPM_TOOLS).some(name => behind(ctx.tools[name]));
  const majors = moves.filter(move => move.major);
  const status = majors.length || openspec || ctx.needsYou.length ? 'needs-agent'
    : moves.length || ctx.updatedTools.length || toolsBehind ? 'updated' : 'current';
  ctx.log(`status: ${status}`);
  if (ctx.dryRun) ctx.log('dry run: nothing written');
  for (const tool of ctx.updatedTools) ctx.log(`installed: ${tool}`);
  if (openspec) ctx.log(`openspec: ${openspec.from} -> ${openspec.to}`);
  const urls = await mapLimit(majors, LOOKUPS_AT_ONCE, move => changelogUrl(ctx, move.bare));
  majors.forEach((move, i) => ctx.log(`major: ${move.name} ${move.from} -> ${move.to} ${urls[i]}`));
  for (const move of moves.filter(m => !m.major)) ctx.log(`moved: ${move.name} ${move.from} -> ${move.to}`);
  for (const text of ctx.needsYou) ctx.log(`needs you: ${text}`);
}

const STAGES = [
  ['survey', survey],
  ['tools', updateTools],
  ['openspec-pins', movePins],
  ...PACKAGE_STAGES.map(([label]) => [label, updatePackages(label)]),
  ['contract', checkContract],
  ['report', report],
];

/** Run every stage in order; returns the exit code (0 done, 1 a stage failed). */
export async function run({ root = REPO, dryRun = false, hold = [], env = process.env, fetchJson = defaultFetchJson, log = console.log } = {}) {
  const ctx = { root, dryRun, hold, env, fetchJson, log, needsYou: [], updatedTools: [] };
  ctx.base = Object.fromEntries([PIN_FILES[0], ...PACKAGE_STAGES.map(([, dir]) => `${dir}/package.json`)]
    .map(file => [file, baseline(ctx, file)]));
  for (const [name, stage] of STAGES) {
    log(`== ${name}`);
    try {
      await stage(ctx);
    } catch (error) {
      log(`FAIL ${error instanceof StageFailure ? error.message : `${name} — ${error.message}`}`);
      return 1;
    }
    log('ok');
  }
  return 0;
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { 'dry-run': { type: 'boolean' }, hold: { type: 'string', multiple: true } } });
  process.exitCode = await run({ dryRun: values['dry-run'], hold: values.hold ?? [] });
}
