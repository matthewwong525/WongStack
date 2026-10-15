#!/usr/bin/env node
// /daily's fixed parts: who the person is, which steps file is theirs, and which workspaces already opened today.
// Which steps are due stays with the assistant: it reads each line's day words against today's date.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { loadConfig, memoryOrigin, repoContext, signIn, signInHelp } from '../../memory/scripts/lib/store.mjs';
import { EXIT } from '../../schedule/scripts/lib/paseo.mjs';

const SKILL = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAUNCHER = join(SKILL, '..', 'schedule', 'scripts', 'workspace.mjs');
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const USAGE = `usage: daily.mjs who
       daily.mjs opened [--day <YYYY-MM-DD>] [--email <address>]
       daily.mjs open --step <text> --title <name> --brief <file> [--day <YYYY-MM-DD>] [--email <address>]`;

/** Today on this computer's clock, as YYYY-MM-DD. */
export function localDay(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const unquote = value => value.trim().replace(/^(['"])(.*)\1$/, '$2').trim().toLowerCase();

/** The `emails:` of a people file's frontmatter, lowercased: `[a, b]` or one `- a` line each. */
export function emailsOf(text) {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  const lines = front?.split(/\r?\n/) ?? [];
  const at = lines.findIndex(line => line.startsWith('emails:'));
  if (at < 0) return [];
  const inline = lines[at].replace(/^emails:/, '').trim();
  if (inline) return inline.replace(/^\[|\]$/g, '').split(',').map(unquote).filter(Boolean);
  const list = [];
  for (const line of lines.slice(at + 1)) {
    const item = line.match(/^\s*-\s*(.+)$/);
    if (!item) break;
    list.push(unquote(item[1]));
  }
  return list.filter(Boolean);
}

/** The people file whose `emails` holds this one, in any case, or null. */
export function personFile(dir, email) {
  if (!email || !existsSync(dir)) return null;
  const want = email.toLowerCase();
  const names = readdirSync(dir).filter(name => name.endsWith('.md')).sort();
  const name = names.find(file => emailsOf(readFileSync(join(dir, file), 'utf8')).includes(want));
  return name ? join(dir, name) : null;
}

function appOrigin(ctx) {
  try { return memoryOrigin(loadConfig(ctx)); } catch { return null; }
}

/** The person: the company sign-in when the install has the app, else the git email with `source: "git"`. */
export function who({ ctx, origin = appOrigin(ctx), signedIn = signIn, skillDir = SKILL } = {}) {
  let me;
  if (origin) {
    const found = signedIn(origin);
    const ok = found.state === 'valid' || found.state === 'near';
    me = { source: 'sign-in', state: found.state, email: found.email ?? null, origin, days: found.days ?? null, login: ok ? null : signInHelp(origin) };
  } else {
    const email = ctx.author || null;
    me = { source: 'git', state: email ? 'valid' : 'missing', email, origin: null, days: null, login: null };
  }
  const team = join(skillDir, 'team.md');
  return { ...me, team: existsSync(team) ? team : null, file: personFile(join(skillDir, 'people'), me.email) };
}

const dayFile = (stateDir, day) => join(stateDir, `${day}.json`);
const readDay = (stateDir, day) => { try { return JSON.parse(readFileSync(dayFile(stateDir, day), 'utf8')); } catch { return []; } };
const sameStep = step => step.trim().replace(/\s+/g, ' ');

/** The workspaces this person opened on `day`. */
export function opened({ stateDir, day, email }) {
  return readDay(stateDir, day).filter(entry => entry.email === email.toLowerCase());
}

/** Runs the workspace launcher and reads its JSON report. */
export function launchWorkspace({ title, brief, env }) {
  const run = spawnSync(process.execPath, [LAUNCHER, 'open', '--title', title, '--brief', brief], { env, encoding: 'utf8' });
  let report;
  try { report = JSON.parse(run.stdout); } catch { report = { ok: false, error: (run.stderr || run.stdout || '').trim() }; }
  return { ...report, code: run.status };
}

/** Opens one step's workspace once per person, step and day: `opened`, `already`, `unsupported` or `failed`. */
export function open({ stateDir, day, email, step, title, brief, env = process.env, launch = launchWorkspace, now = new Date() }) {
  const key = { email: email.toLowerCase(), step: sameStep(step) };
  const before = readDay(stateDir, day).find(entry => entry.email === key.email && entry.step === key.step);
  if (before) return { status: 'already', ...before };
  // Only a chat inside Paseo can open a workspace the person sees; elsewhere the step runs in the chat.
  if (!env.PASEO_AGENT_ID) return { status: 'unsupported', ...key, reason: 'This chat is not in Paseo.' };
  const result = launch({ title, brief, env });
  if (result.code === EXIT.noPaseo || result.code === EXIT.noDaemon) return { status: 'unsupported', ...key, reason: result.error };
  if (!result.ok) return { status: 'failed', ...key, error: result.error ?? 'The workspace did not open.' };
  const entry = { ...key, title, workspace: result.workspaceName ?? result.title ?? title, workspaceId: result.workspaceId ?? null, agentId: result.agentId ?? null, at: now.toISOString() };
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(dayFile(stateDir, day), `${JSON.stringify([...readDay(stateDir, day), entry], null, 2)}\n`);
  return { status: 'opened', ...entry };
}

/** The command line. Returns the exit code; `deps` stands in for the sign-in and the launcher in tests. */
export function main(argv = process.argv.slice(2), { env = process.env, signedIn, launch, print = console.log } = {}) {
  const [command, ...args] = argv;
  if (command === '--help') { print(USAGE); return 0; }
  const options = {
    who: {},
    opened: { day: { type: 'string' }, email: { type: 'string' } },
    open: { step: { type: 'string' }, title: { type: 'string' }, brief: { type: 'string' }, day: { type: 'string' }, email: { type: 'string' } },
  }[command];
  if (!options) usageError(USAGE, command ? `unknown command ${command}` : 'name a command');
  const { values } = parseCli({ usage: USAGE, options, args });
  const ctx = repoContext();
  if (command === 'who') { print(JSON.stringify(who({ ctx, signedIn }), null, 2)); return 0; }
  const day = values.day ?? localDay();
  if (!DAY.test(day)) usageError(USAGE, '--day takes YYYY-MM-DD');
  let email = values.email;
  if (!email) {
    const me = who({ ctx, signedIn });
    if (!me.email || !['valid', 'near'].includes(me.state)) {
      print(JSON.stringify({ ok: false, error: `Not signed in: ${me.login ?? 'set an email with git config user.email'}.` }, null, 2));
      return 1;
    }
    email = me.email;
  }
  const stateDir = join(ctx.commonDir, 'wong-daily');
  if (command === 'opened') { print(JSON.stringify(opened({ stateDir, day, email }), null, 2)); return 0; }
  for (const flag of ['step', 'title', 'brief']) if (!values[flag]?.trim()) usageError(USAGE, `open needs --${flag}`);
  const result = open({ stateDir, day, email, step: values.step, title: values.title, brief: values.brief, env, launch });
  print(JSON.stringify(result, null, 2));
  return result.status === 'failed' ? 1 : 0;
}

if (isMain(import.meta.url)) process.exitCode = main();
