#!/usr/bin/env node
// Runs the practice errands: each errand's plain request goes to a fresh agent in a throwaway
// checkout, the stand-in (person.mjs) answers as the person, the grader (grade.mjs) scores the run,
// and a short report compares it with the last run. Meta-repo only; costs model money, so it runs only
// when a maintainer asks. See wiki/maintaining/practice-errands.md.
//
//     node scripts/practice/run.mjs [--only <errand>[,<errand>]] [--budget <usd>] [--minutes <n>] [--model <id>]
//
// Per errand: a practice shop with its own order log; a `git worktree` at HEAD carrying this checkout's
// uncommitted changes, minus the practice files (HIDDEN), which would hand the agent the answers; an
// agent-browser namespace, session, and temp profile of its own, so the personal browser is never
// touched; a temp folder of its own (`TMPDIR`); `WONG_MEMORY_RUN=1` and no `PASEO_*`, so neither the memory hook
// nor the hand-over's wake-up reaches the maintainer's chats; the practice login saved as
// `practice-shop-<run>-<errand>`; a cost cap and a time cap, which interrupts the turn so its cost still
// arrives. Everything is undone in a `finally`, and
// only the run's own sessions are closed: never `close --all`, because sessions are machine-wide. The
// profile is deleted once Chrome lets go of it, and files the agent left in the temp folder by name are
// removed and listed. The transcript's last line names the repo files the
// agent changed (`{ type: 'checkout', changed }`).
//
// Results: one line per errand in ~/.wong-stack/practice/results.jsonl; transcripts and order logs in
// a dated folder beside it.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, hostname, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { grade, readLines } from './grade.mjs';
import { answerQuestion, replyTo, workHandOver } from './person.mjs';
import { startShop } from './shop.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
export const HOME_DIR = () => join(homedir(), '.wong-stack', 'practice');
/** A package from scripts/tests/package.json, where the practice run's dependencies are installed. */
const fromTests = name => import(createRequire(join(ROOT, 'scripts', 'tests', 'package.json')).resolve(name));
const LINK = /https?:\/\/[^\s)>\]"'`]+\/#key=[a-f0-9]+/;
const MAX_REPLIES = 12;
/** The practice files, hidden from the agent's checkout: they would hand it the answers. */
export const HIDDEN = ['scripts/practice', 'wiki/maintaining/practice-errands.md', 'openspec/changes/practice-errands'];
const hidden = file => HIDDEN.some(path => file === path || file.startsWith(`${path}/`)) || /^scripts\/tests\/practice-[^/]*\.test\.mjs$/.test(file);
const sleep = ms => new Promise(done => setTimeout(done, ms));
/** Commands the practice agent may never run: they reach past the practice run. */
const FORBIDDEN = /\bclose\s+--all\b|\bgit\s+push\b|\bgh\s+(pr|api|release)\b|\bwrangler\s+deploy\b|\/(save|ship)\b/;

/** The errands with the shared test card folded into each brief. */
export function loadErrands(file = join(HERE, 'errands.json')) {
  const { card, errands } = JSON.parse(readFileSync(file, 'utf8'));
  return errands.map(errand => ({ ...errand, brief: { card, ...errand.brief } }));
}

/** Runs a command; resolves to `{ code, stdout, stderr }`, never rejects. */
export function sh(command, args, { cwd, env, input, timeoutMs = 60_000 } = {}) {
  return new Promise(done => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timer); done({ code: -1, stdout, stderr: error.message }); });
    child.on('close', code => { clearTimeout(timer); done({ code, stdout, stderr }); });
    // A child that exits before reading its input closes the pipe; that must not crash the run.
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}

/** The agent's environment: the caller's, minus Paseo's, agent-browser's, and the calling Claude Code session's, plus the practice isolation. */
export function practiceEnv(base, { namespace, session, profile }) {
  const env = Object.fromEntries(Object.entries(base).filter(([key]) => !/^(PASEO_|AGENT_BROWSER_|CLAUDE_CODE_|CLAUDECODE$|CLAUDE_PID$|CLAUDE_EFFORT$)/.test(key)));
  return { ...env, AGENT_BROWSER_NAMESPACE: namespace, AGENT_BROWSER_SESSION: session, AGENT_BROWSER_PROFILE: profile, WONG_MEMORY_RUN: '1' };
}

/**
 * A throwaway worktree at HEAD with this checkout's uncommitted and untracked files laid on top, the
 * practice files removed, and a baseline tree of it all, so `changedFiles` can name what the agent edits.
 */
async function makeWorktree(run, root) {
  const dir = mkdtempSync(join(tmpdir(), 'practice-wt-'));
  const added = await run('git', ['-C', root, 'worktree', 'add', '--detach', dir, 'HEAD']);
  if (added.code !== 0) throw new Error(`git worktree add failed: ${added.stderr.trim()}`);
  const diff = await run('git', ['-C', root, 'diff', 'HEAD', '--binary']);
  if (diff.stdout.trim()) {
    const applied = await run('git', ['-C', dir, 'apply', '--whitespace=nowarn'], { input: diff.stdout });
    if (applied.code !== 0) throw new Error(`could not carry uncommitted changes: ${applied.stderr.trim()}`);
  }
  const untracked = await run('git', ['-C', root, 'ls-files', '--others', '--exclude-standard', '-z']);
  for (const file of untracked.stdout.split('\0').filter(file => file && !hidden(file))) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(join(root, file), join(dir, file));
  }
  for (const path of HIDDEN) rmSync(join(dir, path), { recursive: true, force: true });
  const hub = join(dir, 'wiki', 'maintaining', 'README.md');
  if (existsSync(hub)) writeFileSync(hub, readFileSync(hub, 'utf8').split('\n').filter(line => !line.includes('(practice-errands.md)')).join('\n'));
  const tests = join(dir, 'scripts', 'tests');
  if (existsSync(tests)) for (const name of readdirSync(tests).filter(name => hidden(`scripts/tests/${name}`))) rmSync(join(tests, name));
  await run('git', ['-C', dir, 'add', '-A']);
  const tree = (await run('git', ['-C', dir, 'write-tree'])).stdout.trim();
  return { dir, tree };
}

/** The repo files the agent changed since the baseline tree, or null when there is no baseline. */
async function changedFiles(run, { dir, tree }) {
  if (!tree) return null;
  await run('git', ['-C', dir, 'add', '-A']);
  return (await run('git', ['-C', dir, 'diff', '--cached', '--name-only', tree])).stdout.split('\n').filter(Boolean);
}

/**
 * Whether a Chrome profile's SingletonLock (a link to `<host>-<pid>`) names a live process on this
 * computer. A lock Chrome left behind names a dead one, so there is nothing to wait for.
 */
export function lockHeld(profile) {
  let target;
  try { target = readlinkSync(join(profile, 'SingletonLock')); } catch { return false; }
  const [, host, pid] = /^(.*)-(\d+)$/.exec(target) ?? [];
  if (!pid || host !== hostname()) return false;
  try { process.kill(Number(pid), 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

/** Waits until Chrome lets go of a profile, up to `ms`; true when it did. */
async function released(profile, ms = 15_000) {
  const until = Date.now() + ms;
  while (lockHeld(profile)) {
    if (Date.now() > until) return false;
    await sleep(250);
  }
  return true;
}

/** The top-level temp entries made since `before` whose path the agent's tool inputs name: files it left by name. */
export function agentTempFiles(before, transcriptFile, dir = tmpdir()) {
  const named = readLines(transcriptFile).filter(line => line.type === 'assistant')
    .flatMap(line => (line.message?.content ?? []).filter(part => part.type === 'tool_use').map(part => JSON.stringify(part.input))).join('\n');
  return readdirSync(dir).filter(name => !before.has(name) && (named.includes(`${dir}/${name}`) || named.includes(`/tmp/${name}`)));
}

/** The names of the cloud browser sessions open now. */
const cloudSessions = () => {
  const dir = join(homedir(), '.wong-stack', 'cloud-browser');
  return existsSync(dir) ? readdirSync(dir).filter(name => /^cloud-\d+\.json$/.test(name)).map(name => name.slice(0, -5)) : [];
};

/** The hand-over link open now, if any: `{ cwd }` from its state file. */
const openHandOver = () => {
  try { return JSON.parse(readFileSync(join(homedir(), '.wong-stack', 'hand-over', 'state.json'), 'utf8')); } catch { return null; }
};

/**
 * Undoes one errand's setup, each step on its own so one failure never skips the rest: the hand-over
 * and cloud sessions this errand opened, the namespace's own browser sessions (by name, never
 * `--all`), the practice login, the shop, the worktree, and the temp profile.
 */
async function cleanUp({ run, env, worktree, profile, agentTmp, loginName, shop, cloudBefore, root, tmpBefore, transcript }) {
  const notes = [];
  const attempt = async (what, fn) => { try { await fn(); } catch (error) { notes.push(`${what}: ${error.message}`); } };
  if (worktree) {
    await attempt('hand-over', async () => {
      if (openHandOver()?.cwd?.startsWith(worktree)) await run('node', [join(worktree, '.claude/skills/hand-over/scripts/hand-over.mjs'), 'close'], { cwd: worktree, env });
    });
    await attempt('cloud browser', async () => {
      for (const name of cloudSessions().filter(name => !cloudBefore.includes(name))) {
        await run('node', [join(worktree, '.claude/skills/browser/scripts/cloud-browser.mjs'), 'close', '--session', name], { cwd: worktree, env });
      }
    });
  }
  // Any auth command starts a browser, so the login goes first and the session close catches it.
  if (env && loginName) await attempt('login', () => run('agent-browser', ['auth', 'delete', loginName], { env }));
  if (env) await attempt('browser sessions', async () => {
    const listed = await run('agent-browser', ['session', 'list', '--json'], { env });
    let names = [];
    try { names = (JSON.parse(listed.stdout).data?.sessions ?? []).map(item => item.name ?? item); } catch { names = []; }
    for (const name of new Set([env.AGENT_BROWSER_SESSION, ...names])) await run('agent-browser', ['--session', name, 'close'], { env });
  });
  if (shop) await attempt('shop', () => shop.close());
  if (worktree) await attempt('worktree', async () => {
    await run('git', ['-C', root, 'worktree', 'remove', '--force', worktree]);
    rmSync(worktree, { recursive: true, force: true });
  });
  if (profile) await attempt('profile', async () => {
    if (!(await released(profile))) notes.push('profile: the browser still held it after 15 seconds');
    rmSync(profile, { recursive: true, force: true });
  });
  if (agentTmp) await attempt('temp folder', () => rmSync(agentTmp, { recursive: true, force: true }));
  if (tmpBefore) await attempt('temp files', () => {
    for (const name of agentTempFiles(tmpBefore, transcript)) {
      rmSync(join(tmpdir(), name), { recursive: true, force: true });
      notes.push(`left ${join(tmpdir(), name)} (removed)`);
    }
  });
  return notes;
}

/** A user turn for the SDK's streaming input. */
const userTurn = text => ({ type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null, session_id: '' });

/**
 * Runs one errand. `deps` carries `query` (the Agent SDK's), `run` (the command runner), and `launch`
 * (the stand-in's browser). Resolves to `{ errand, transcript, orders, costUsd, ms, stopped, secrets,
 * cleanup }`, where `stopped` is `done`, `timeout`, `budget`, or `error: <line>`.
 */
export async function runErrand(errand, { runId, outDir, root = ROOT, budgetUsd = 3, minutes = 15, graceMs = 20_000, model, deps }) {
  const { query, run = sh, launch } = deps;
  const started = Date.now();
  const transcript = join(outDir, `${errand.name}.transcript.jsonl`);
  const ordersLog = join(outDir, `${errand.name}.orders.jsonl`);
  writeFileSync(transcript, '');
  const keep = entry => appendFileSync(transcript, `${JSON.stringify(entry)}\n`);
  const namespace = `practice-${runId}`;
  const setup = { run, root, transcript, cloudBefore: cloudSessions(), tmpBefore: new Set(readdirSync(tmpdir())) };
  let shop = null;
  let stopped = 'done';
  let costUsd = 0;
  let stream = null;
  let timedOut = false;
  let grace = null;
  // At the time cap, interrupt the turn so its result, and the cost so far, still arrive; abort if it
  // doesn't within graceMs.
  const abort = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    if (!stream?.interrupt) return abort.abort();
    stream.interrupt().catch(() => {});
    grace = setTimeout(() => abort.abort(), graceMs);
  }, minutes * 60_000);
  try {
    shop = setup.shop = await startShop({ log: ordersLog, loginCode: errand.shop.loginCode });
    setup.profile = mkdtempSync(join(tmpdir(), 'practice-profile-'));
    setup.agentTmp = mkdtempSync(join(tmpdir(), 'practice-tmp-'));
    setup.env = { ...practiceEnv(process.env, { namespace, session: `practice-${runId}-${errand.name}`, profile: setup.profile }), TMPDIR: setup.agentTmp, CLAUDE_CODE_TMPDIR: setup.agentTmp };
    const checkout = await makeWorktree(run, root);
    setup.worktree = checkout.dir;
    setup.baseline = checkout;
    if (errand.shop.savedLogin) {
      setup.loginName = `practice-shop-${runId}-${errand.name}`;
      const saved = await run('agent-browser', ['auth', 'save', setup.loginName, '--url', `${shop.shopUrl}/login`, '--username', shop.account.email, '--password-stdin'], { env: setup.env, input: shop.password });
      if (saved.code !== 0) throw new Error(`auth save failed: ${(saved.stderr || saved.stdout).trim().split('\n')[0]}`);
    }
    const request = errand.request.replaceAll('{shop}', shop.shopUrl);
    keep({ type: 'person', via: 'request', text: request });

    // The stand-in: answers multiple-choice questions as they come, works any link the agent sends,
    // and replies once each turn ends.
    let handOver = null;
    let lastLink = null;
    let turnText = '';
    let replies = 0;
    const queued = [];
    let waiting = null;
    const send = text => { if (waiting) { waiting(text); waiting = null; } else queued.push(text); };
    const nextTurn = () => (queued.length ? Promise.resolve(queued.shift()) : new Promise(done => { waiting = done; }));
    const person = (text, via) => { keep({ type: 'person', via, text }); return text; };
    async function* input() {
      yield userTurn(request);
      for (;;) {
        const text = await nextTurn();
        if (text === null) return;
        yield userTurn(text);
      }
    }
    const canUseTool = async (name, toolInput) => {
      if (name === 'AskUserQuestion') {
        const answers = {};
        for (const question of toolInput.questions ?? []) {
          const picked = answerQuestion(errand.brief, question);
          answers[question.question] = person(picked.answer, `question: ${question.question}`);
        }
        return { behavior: 'allow', updatedInput: { ...toolInput, answers } };
      }
      if (name === 'Bash' && FORBIDDEN.test(String(toolInput.command ?? ''))) {
        keep({ type: 'denied', name, input: toolInput });
        return { behavior: 'deny', message: 'Not allowed in a practice run.' };
      }
      return { behavior: 'allow', updatedInput: toolInput };
    };
    const startHandOver = link => {
      keep({ type: 'person', via: 'hand-over', text: `opened ${link.replace(/#key=.*/, '#key=…')}` });
      return workHandOver(link, { brief: errand.brief, shop, env: setup.env, launch, onStep: step => keep({ type: 'person', via: 'hand-over', text: `${step.at}: ${step.did}` }) })
        .then(result => { keep({ type: 'person', via: 'hand-over', text: `hand-over ${result.result}${result.reason ? `: ${result.reason}` : ''}` }); return result; });
    };

    stream = query({
      prompt: input(),
      options: {
        cwd: setup.worktree,
        env: setup.env,
        settingSources: ['project'],
        persistSession: false,
        permissionMode: 'default',
        maxBudgetUsd: budgetUsd,
        abortController: abort,
        canUseTool,
        ...(model ? { model } : {}),
      },
    });
    for await (const message of stream) {
      keep(message);
      if (message.type === 'assistant') {
        for (const part of message.message?.content ?? []) {
          if (part.type !== 'text') continue;
          turnText += `${part.text}\n`;
          // Each new link is worked once the one before it has finished, as a person would.
          const link = LINK.exec(part.text)?.[0];
          if (link && link !== lastLink) {
            lastLink = link;
            handOver = (handOver ?? Promise.resolve()).then(() => startHandOver(link));
          }
        }
      }
      if (message.type !== 'result') continue;
      costUsd = message.total_cost_usd ?? costUsd;
      if (message.subtype === 'error_max_budget_usd') stopped = 'budget';
      if (timedOut) stopped = 'timeout';
      let reply = null;
      if (stopped === 'done' && replies < MAX_REPLIES) {
        const worked = handOver ? await handOver : null;
        handOver = null;
        reply = replyTo(errand.brief, turnText, { handOver: worked });
      }
      turnText = '';
      replies++;
      send(reply ? person(reply.text, 'chat') : null);
    }
  } catch (error) {
    stopped = timedOut || abort.signal.aborted ? 'timeout' : `error: ${String(error.message).split('\n')[0]}`;
  } finally {
    clearTimeout(timer);
    clearTimeout(grace);
    abort.abort();
    if (setup.baseline) keep({ type: 'checkout', changed: await changedFiles(run, setup.baseline).catch(() => null) });
    setup.cleanup = await cleanUp(setup);
  }
  return { errand: errand.name, transcript, orders: ordersLog, costUsd, ms: Date.now() - started, stopped, secrets: shop ? [shop.password] : [], cleanup: setup.cleanup };
}

/** The previous result line per errand, from earlier runs. */
export function previousResults(lines, runId) {
  const last = new Map();
  for (const line of lines) if (line.run !== runId) last.set(line.errand, line);
  return last;
}

/**
 * better, worse, same, or new: worse when any check that passed last time fails now. Only checks both
 * runs graded count, so a check added since is not *better*.
 */
export function compare(now, before) {
  if (!before) return 'new';
  const shared = new Set(before.checks.map(check => check.name).filter(name => now.checks.some(check => check.name === name)));
  const passed = line => new Set(line.checks.filter(check => check.pass && shared.has(check.name)).map(check => check.name));
  const passedBefore = passed(before);
  const passedNow = passed(now);
  if ([...passedBefore].some(name => !passedNow.has(name))) return 'worse';
  if ([...passedNow].some(name => !passedBefore.has(name))) return 'better';
  return 'same';
}

/** The printed report for one run's result lines. */
export function report(lines, previous, { at = new Date() } = {}) {
  const rule = '─'.repeat(60);
  const out = [`PRACTICE RUN  ${at.toISOString().slice(0, 16).replace('T', ' ')}`, rule];
  for (const line of lines) {
    out.push(`${line.title.padEnd(22)}${`${line.passed}/${line.total}`.padStart(5)}  ${compare(line, previous.get(line.errand))}${line.stopped === 'done' ? '' : `  (stopped: ${line.stopped})`}`);
    for (const check of line.checks.filter(item => !item.pass)) out.push(`  ✗ ${check.name}: ${check.evidence}`);
    for (const note of [...(line.notes ?? []), ...(line.cleanup ?? [])]) out.push(`  · ${note}`);
    if (line.checks.some(item => !item.pass) || line.notes?.length || line.cleanup?.length || line.stopped !== 'done') out.push(`    transcript: ${line.transcript}`);
  }
  const passed = lines.reduce((sum, line) => sum + line.passed, 0);
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  const cost = lines.reduce((sum, line) => sum + (line.costUsd ?? 0), 0);
  const minutes = Math.round(lines.reduce((sum, line) => sum + (line.ms ?? 0), 0) / 60_000);
  out.push(rule, `${passed}/${total} · cost $${cost.toFixed(2)} · ${minutes} min`);
  return out.join('\n');
}

/** The stand-in's phone browser: CHROME_PATH, else Playwright's Chromium, else agent-browser's Chrome, else Google Chrome. */
export async function phoneBrowser() {
  const playwright = await fromTests('playwright-core');
  const chromium = playwright.chromium ?? playwright.default.chromium;
  const newest = (dir, pick) => (existsSync(dir) ? readdirSync(dir).filter(pick).sort().reverse().map(name => join(dir, name)) : []);
  const found = [process.env.CHROME_PATH,
    ...newest(join(homedir(), '.cache', 'ms-playwright'), name => /^chromium-\d+$/.test(name)).map(dir => join(dir, 'chrome-linux64', 'chrome')),
    ...newest(join(homedir(), '.agent-browser', 'browsers'), name => name.startsWith('chrome-')).map(dir => join(dir, 'chrome'))].find(path => path && existsSync(path));
  return chromium.launch({ headless: true, ...(found ? { executablePath: found } : { channel: 'chrome' }) });
}

/**
 * Runs the chosen errands one after another, keeps each result, and returns the report. `deps` as for
 * runErrand; `home` is where results live.
 */
export async function runAll({ only, budgetUsd, minutes, model, home = HOME_DIR(), deps, errands = loadErrands(), now = new Date() }) {
  const chosen = only?.length ? errands.filter(errand => only.includes(errand.name)) : errands;
  const unknown = (only ?? []).filter(name => !errands.some(errand => errand.name === name));
  if (unknown.length) throw new Error(`no such errand: ${unknown.join(', ')} (have ${errands.map(errand => errand.name).join(', ')})`);
  const open = openHandOver();
  if (open) throw new Error('a hand-over link is open on this computer; finish or close it before a practice run');
  const runId = randomBytes(3).toString('hex');
  const outDir = join(home, `${now.toISOString().slice(0, 16).replace(/[:T]/g, '-')}-${runId}`);
  mkdirSync(outDir, { recursive: true });
  const resultsFile = join(home, 'results.jsonl');
  const previous = previousResults(readLines(resultsFile), runId);
  const lines = [];
  try {
    for (const errand of chosen) {
      const ran = await runErrand(errand, { runId, outDir, budgetUsd, minutes, model, deps });
      const graded = grade(errand, readLines(ran.orders), readLines(ran.transcript), { secrets: ran.secrets });
      const line = { run: runId, at: now.toISOString(), errand: errand.name, title: errand.title, ...graded, costUsd: ran.costUsd, ms: ran.ms, stopped: ran.stopped, transcript: ran.transcript, orders: ran.orders, cleanup: ran.cleanup };
      appendFileSync(resultsFile, `${JSON.stringify(line)}\n`);
      lines.push(line);
    }
  } finally {
    rmSync(join(homedir(), '.agent-browser', 'namespaces', `practice-${runId}`), { recursive: true, force: true });
  }
  return { lines, text: report(lines, previous, { at: now }) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { only: { type: 'string' }, budget: { type: 'string' }, minutes: { type: 'string' }, model: { type: 'string' } } });
  const { query } = await fromTests('@anthropic-ai/claude-agent-sdk');
  const { text } = await runAll({
    only: values.only?.split(',').map(name => name.trim()).filter(Boolean),
    budgetUsd: Number(values.budget ?? 3),
    minutes: Number(values.minutes ?? 15),
    model: values.model,
    deps: { query, run: sh, launch: phoneBrowser },
  });
  console.log(text);
}
