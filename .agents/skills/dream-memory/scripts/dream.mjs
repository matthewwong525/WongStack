#!/usr/bin/env node
// What /dream-memory needs that takes no judgment: when the last dream ran, which wiki pages are
// this install's own, and what has plainly drifted. Every command only reads.
//
//     node .claude/skills/dream-memory/scripts/dream.mjs since
//     node .claude/skills/dream-memory/scripts/dream.mjs pages
//     node .claude/skills/dream-memory/scripts/dream.mjs drift
//
// A dream ends by writing one `project` fact on slug `wiki-dream`, tagged `dream`:
//     Dream 2026-10-06: read facts up to #1234. Checked: wiki/people/README.md, wiki/people/a.md.
// `since` reads the newest live one back: its date, the highest fact id it read, the pages it
// checked. With none, the date is 30 days back, so a first dream is bounded.
//
// `pages` prints one line per wiki page and per spec, longest unchecked first:
//     own|shipped|spec <TAB> words <TAB> last checked (a date, or never) <TAB> path
// A page is shipped when payload-files.json lists it, by file or by folder; every other page is
// the install's own; `openspec/specs/*/spec.md` is a spec. Last checked is the newer of the file's
// last commit and its last mention in a dream fact. With the store unreachable, `pages` uses
// commit dates alone and says so on stderr.
//
// `drift` prints what a rule can find, one line each:
//     fact <TAB> #id <TAB> the repo paths its words name that are gone <TAB> its words
//     plan <TAB> name <TAB> done|idle <TAB> tasks ticked, or the date of its folder's last commit
// A fact drifts when it is live, does not itself say something is gone, and names a path this
// branch's history once held under one of the repo's top folders that no
// longer exists, is not git-ignored, and is not an archived plan's old folder. A plan drifts when
// every task is ticked, or its folder has had no commit for 30 days. With the store or OpenSpec
// unreachable, `drift` prints the list it can and names the other on stderr.
//
// All take --json. Exit codes: 0 ok, 1 the memory store could not be read (`since`), 2 bad input
// or not inside a git checkout. Node built-ins only.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { wikiPages } from '../../memory/scripts/lib/links.mjs';
import { pathWords } from '../../memory/scripts/lib/upkeep.mjs';

const USAGE = `usage: dream.mjs <command> [--json]
  since   the last dream: its date, the highest fact id it read, the pages it checked
  pages   each wiki page as own|shipped and each spec, its words, and when it was last checked, longest unchecked first
  drift   live facts naming a repo path that is gone, and plans that are finished or 30 days idle`;
const MEMORY = fileURLToPath(new URL('../../memory/scripts/memory.mjs', import.meta.url));
const SLUG = 'wiki-dream';
const TAG = 'dream';
const FIRST_DREAM_DAYS = 30;
const IDLE_PLAN_DAYS = 30;
const SPECS = 'openspec/specs';
const CHANGES = 'openspec/changes';
// Payload groups whose files reach an install from WongStack. `seededBySetup` is left out: setup
// makes those pages once and the install owns them from then on.
const SHIPPED_GROUPS = ['core', 'ui', 'pack', 'scaffold'];

// ---------------------------------------------------------------------------
// Pure helpers

const day = stamp => String(stamp).slice(0, 10);
const newestFirst = (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id;

/**
 * True for the fact a dream wrote. Upkeep also tags `dream` any fact whose words name this
 * skill's folder, so the tag alone does not mark one.
 */
export const isDreamFact = fact => /^Dream \d{4}-\d{2}-\d{2}:/.test(String(fact.body));

/** The wiki pages and specs a dream fact's body names. */
export function pagesNamed(body) {
  return [...new Set(String(body).match(/(?:wiki\/[\w./-]*\.md|openspec\/specs\/[\w-]+\/spec\.md)/g) || [])];
}

/** The last dream from its facts, or the first-dream default: 30 days before `today`. */
export function lastDream(facts, today = new Date()) {
  const fact = facts.filter(isDreamFact).sort(newestFirst)[0];
  if (!fact) {
    const start = new Date(today.getTime() - FIRST_DREAM_DAYS * 86_400_000);
    return { since: day(start.toISOString()), afterFact: 0, pages: [], dream: null };
  }
  // A long list of checked pages is split over several facts that start the same way.
  const start = /^Dream \S+/.exec(fact.body)?.[0];
  const parts = facts.filter(isDreamFact).filter(part => start && part.body.startsWith(start));
  const ids = parts.map(part => Number(/#(\d+)/.exec(part.body)?.[1] ?? 0));
  return { since: day(fact.created_at), afterFact: Math.max(0, ...ids), pages: [...new Set(parts.flatMap(part => pagesNamed(part.body)))].sort(), dream: fact.id };
}

/** The shipped wiki paths of a payload file list: `{ files: Set, dirs: [] }`. */
export function shippedPaths(payload) {
  const groups = SHIPPED_GROUPS.map(name => payload?.[name] || {});
  return {
    files: new Set(groups.flatMap(group => group.files || [])),
    dirs: groups.flatMap(group => group.dirs || []).map(dir => dir.replace(/\/+$/, '')),
  };
}

/** True when the payload ships `path`, by file or by folder. */
export function isShipped(path, { files, dirs }) {
  return files.has(path) || dirs.some(dir => path.startsWith(`${dir}/`));
}

/** Each page's newest mention across dream facts: Map path → date. */
export function dreamChecks(facts) {
  const checks = new Map();
  for (const fact of facts.filter(isDreamFact)) {
    for (const page of pagesNamed(fact.body)) {
      if (!checks.has(page) || checks.get(page) < day(fact.created_at)) checks.set(page, day(fact.created_at));
    }
  }
  return checks;
}

/**
 * The page list. `pages` is [{ path, text, committed }], `committed` a date or null.
 * Sorted longest unchecked first: never checked, then oldest; ties by path.
 */
export function pageList(pages, shipped, checks = new Map()) {
  return pages.map(({ path, text, committed }) => {
    const dates = [committed, checks.get(path)].filter(Boolean).map(day).sort();
    return {
      path,
      kind: path.startsWith(`${SPECS}/`) ? 'spec' : isShipped(path, shipped) ? 'shipped' : 'own',
      words: text.split(/\s+/).filter(Boolean).length,
      lastChecked: dates.at(-1) ?? null,
    };
  }).sort((a, b) => (a.lastChecked ?? '').localeCompare(b.lastChecked ?? '') || a.path.localeCompare(b.path));
}

/**
 * The repo paths a fact's words name that are gone. `tops` is the repo's top-level names, so a
 * word counts only when it starts in one; `exists(path)` answers for the checkout; `once(path)`
 * says the branch's history ever held it, so a word that only looks like a path, or names work
 * on another branch, is no drift.
 */
export function stalePaths(body, { tops, exists, once = () => true }) {
  const gone = new Set();
  for (const word of pathWords(String(body))) {
    const path = word.replace(/^\.\//, '').replace(/[#?].*$/, '').replace(/:\d+(?:-\d+)?$/, '').replace(/\/+$/, '');
    if (!path.includes('/') || /[*$|~\\…]|\.\.|:\/\//.test(path) || !tops.has(path.split('/')[0])) continue;
    if (!exists(path) && once(path)) gone.add(path);
  }
  return [...gone];
}

/** True when a fact's own words already say something is gone, so its missing path is history, not drift. */
export const saysGone = body => /\b(removed|deleted|retired|gone|no longer|renamed|moved|replaced)\b/i.test(String(body).replace(/\S*\/\S*/g, ' '));

/**
 * The plans that drifted. `changes` is `openspec list --json`'s list; `committed(name)` is the
 * date of the last commit to the plan's folder, or null for one never committed.
 */
export function planDrift(changes, committed, now = new Date()) {
  const cutoff = day(new Date(now.getTime() - IDLE_PLAN_DAYS * 86_400_000).toISOString());
  return changes.flatMap(({ name, completedTasks = 0, totalTasks = 0 }) => {
    const tasks = `${completedTasks}/${totalTasks}`;
    const last = committed(name) ? day(committed(name)) : null;
    if (totalTasks > 0 && completedTasks >= totalTasks) return [{ name, reason: 'done', tasks, lastCommit: last }];
    return last && last <= cutoff ? [{ name, reason: 'idle', tasks, lastCommit: last }] : [];
  });
}

// ---------------------------------------------------------------------------
// Reads

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    console.error('dream.mjs: run it inside a git checkout');
    process.exit(2);
  }
}

/** Dream facts from the memory store; `all` adds superseded ones. Throws when the store can not be read. */
function dreamFacts(root, { all = false } = {}) {
  const args = [MEMORY, 'search', '--slug', SLUG, '--tag', TAG, '--type', 'project', '--limit', '200', '--json', ...(all ? ['--all'] : [])];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'memory.mjs search failed').trim());
  return JSON.parse(result.stdout).facts || [];
}

/** Every live fact the key may read. Throws when the store can not be read. */
function liveFacts(root) {
  const result = spawnSync(process.execPath, [MEMORY, 'search', '--limit', '5000', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'memory.mjs search failed').trim());
  return JSON.parse(result.stdout).facts || [];
}

/** Active plans from OpenSpec. Throws when it can not be asked. */
function activePlans(root) {
  const result = spawnSync('openspec', ['list', '--json'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error((result.error?.message || result.stderr || result.stdout || 'openspec list failed').trim());
  return JSON.parse(result.stdout).changes || [];
}

const dirsIn = path => (existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort() : []);
const specPages = root => dirsIn(join(root, SPECS)).map(name => `${SPECS}/${name}/spec.md`).filter(path => existsSync(join(root, path)));

/** True when the checkout has `path`, git ignores it, or it is the old folder of a plan since archived. */
function existsIn(root) {
  const archived = new Set(dirsIn(join(root, CHANGES, 'archive')).map(name => name.replace(/^\d{4}-\d{2}-\d{2}-/, '')));
  return path => {
    if (existsSync(join(root, path))) return true;
    const plan = new RegExp(`^${CHANGES}/([^/]+)`).exec(path)?.[1];
    if (plan && archived.has(plan)) return true;
    return spawnSync('git', ['-C', root, 'check-ignore', '-q', '--', path]).status === 0;
  };
}

function payloadFiles(root) {
  const file = ['.claude', '.agents'].map(dir => join(root, dir, 'skills/wong-sync/references/payload-files.json')).find(existsSync);
  return file ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

function committed(root, path) {
  try {
    return execFileSync('git', ['-C', root, 'log', '-1', '--format=%cI', '--', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function since({ json }) {
  let last;
  try {
    last = lastDream(dreamFacts(repoRoot()));
  } catch (error) {
    console.error(`dream.mjs: the memory store could not be read: ${error.message}`);
    process.exit(1);
  }
  if (json) return console.log(JSON.stringify(last));
  console.log([
    last.dream ? `last dream: ${last.since} (fact #${last.dream})` : `last dream: none; reading from ${last.since}`,
    `since: ${last.since}`,
    `after fact: #${last.afterFact}`,
    `pages checked: ${last.pages.join(', ') || 'none'}`,
  ].join('\n'));
}

function pages({ json }) {
  const root = repoRoot();
  let checks = new Map();
  try {
    checks = dreamChecks(dreamFacts(root, { all: true }));
  } catch (error) {
    console.error(`dream.mjs: the memory store could not be read, so commit dates alone are used: ${error.message}`);
  }
  const found = [...wikiPages(root), ...specPages(root)].map(path => ({ path, text: readFileSync(join(root, path), 'utf8'), committed: committed(root, path) }));
  const list = pageList(found, shippedPaths(payloadFiles(root)), checks);
  if (json) return console.log(JSON.stringify({ pages: list }));
  console.log(list.map(page => [page.kind, page.words, page.lastChecked ?? 'never', page.path].join('\t')).join('\n'));
}

function drift({ json }) {
  const root = repoRoot();
  const skipped = [];
  let facts = [];
  let plans = [];
  try {
    const check = { tops: new Set(readdirSync(root).filter(name => name !== '.git')), exists: existsIn(root), once: path => Boolean(committed(root, path)) };
    facts = liveFacts(root).map(fact => ({ id: fact.id, slug: fact.slug, type: fact.type, paths: stalePaths(fact.body, check), body: fact.body }))
      .filter(fact => fact.paths.length && !isDreamFact(fact) && !saysGone(fact.body)).sort((a, b) => a.id - b.id);
  } catch (error) {
    skipped.push('fact');
    console.error(`dream.mjs: the memory store could not be read, so no fact was checked: ${error.message}`);
  }
  try {
    plans = planDrift(activePlans(root), name => committed(root, `${CHANGES}/${name}`));
  } catch (error) {
    skipped.push('plan');
    console.error(`dream.mjs: OpenSpec could not list plans, so no plan was checked: ${error.message}`);
  }
  if (json) return console.log(JSON.stringify({ facts, plans, skipped }));
  const lines = [
    ...facts.map(fact => ['fact', `#${fact.id}`, fact.paths.join(', '), fact.body.replace(/\s+/g, ' ')].join('\t')),
    ...plans.map(plan => ['plan', plan.name, plan.reason, plan.reason === 'done' ? `${plan.tasks} tasks` : `last commit ${plan.lastCommit}`].join('\t')),
  ];
  if (lines.length) console.log(lines.join('\n'));
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, options: { json: { type: 'boolean' } }, allowPositionals: true });
  const commands = { since, pages, drift };
  const command = Object.hasOwn(commands, positionals[0] ?? '') ? commands[positionals[0]] : null;
  if (!command || positionals.length !== 1) usageError(USAGE, positionals[0] ? `unknown command: ${positionals.join(' ')}` : 'name a command');
  command(values);
}
