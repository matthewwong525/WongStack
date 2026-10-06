#!/usr/bin/env node
// What /dream needs that takes no judgment: when the last dream ran, and which wiki pages are
// this install's own. Both commands only read.
//
//     node .claude/skills/dream/scripts/dream.mjs since
//     node .claude/skills/dream/scripts/dream.mjs pages
//
// A dream ends by writing one `project` fact on slug `wiki-dream`, tagged `dream`:
//     Dream 2026-10-06: read facts up to #1234. Checked: wiki/people/README.md, wiki/people/a.md.
// `since` reads the newest live one back: its date, the highest fact id it read, the pages it
// checked. With none, the date is 30 days back, so a first dream is bounded.
//
// `pages` prints one line per wiki page, longest unchecked first:
//     own|shipped <TAB> words <TAB> last checked (a date, or never) <TAB> path
// A page is shipped when payload-files.json lists it, by file or by folder; every other page is
// the install's own. Last checked is the newer of the page's last commit and its last mention in
// a dream fact. With the store unreachable, `pages` uses commit dates alone and says so on stderr.
//
// Both take --json. Exit codes: 0 ok, 1 the memory store could not be read (`since`), 2 bad input
// or not inside a git checkout. Node built-ins only.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { wikiPages } from '../../memory/scripts/lib/links.mjs';

const USAGE = `usage: dream.mjs <command> [--json]
  since   the last dream: its date, the highest fact id it read, the pages it checked
  pages   each wiki page as own|shipped, its words, and when it was last checked, longest unchecked first`;
const MEMORY = fileURLToPath(new URL('../../memory/scripts/memory.mjs', import.meta.url));
const SLUG = 'wiki-dream';
const TAG = 'dream';
const FIRST_DREAM_DAYS = 30;
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

/** The wiki pages a dream fact's body names. */
export function pagesNamed(body) {
  return [...new Set(String(body).match(/wiki\/[\w./-]*\.md/g) || [])];
}

/** The last dream from its facts, or the first-dream default: 30 days before `today`. */
export function lastDream(facts, today = new Date()) {
  const fact = facts.filter(isDreamFact).sort(newestFirst)[0];
  if (!fact) {
    const start = new Date(today.getTime() - FIRST_DREAM_DAYS * 86_400_000);
    return { since: day(start.toISOString()), afterFact: 0, pages: [], dream: null };
  }
  const id = /#(\d+)/.exec(fact.body);
  return { since: day(fact.created_at), afterFact: id ? Number(id[1]) : 0, pages: pagesNamed(fact.body), dream: fact.id };
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
      kind: isShipped(path, shipped) ? 'shipped' : 'own',
      words: text.split(/\s+/).filter(Boolean).length,
      lastChecked: dates.at(-1) ?? null,
    };
  }).sort((a, b) => (a.lastChecked ?? '').localeCompare(b.lastChecked ?? '') || a.path.localeCompare(b.path));
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
  const found = wikiPages(root).map(path => ({ path, text: readFileSync(join(root, path), 'utf8'), committed: committed(root, path) }));
  const list = pageList(found, shippedPaths(payloadFiles(root)), checks);
  if (json) return console.log(JSON.stringify({ pages: list }));
  console.log(list.map(page => [page.kind, page.words, page.lastChecked ?? 'never', page.path].join('\t')).join('\n'));
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, options: { json: { type: 'boolean' } }, allowPositionals: true });
  const commands = { since, pages };
  const command = Object.hasOwn(commands, positionals[0] ?? '') ? commands[positionals[0]] : null;
  if (!command || positionals.length !== 1) usageError(USAGE, positionals[0] ? `unknown command: ${positionals.join(' ')}` : 'name a command');
  command(values);
}
