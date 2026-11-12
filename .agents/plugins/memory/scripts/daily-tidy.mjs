#!/usr/bin/env node
// What the daily tidy needs that takes no judgment: when the last tidy ran, which pages are due, what has plainly
// drifted, the map of where memory is weak, and `keep`, which marks a finished part. wiki/development/wiki-dream.md

import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadAreas, topicNamer } from './lib/areas.mjs';
import { isMain, parseCli, usageError } from './lib/cli.mjs';
import { loadProfile, openStore, repoContext } from './lib/store.mjs';
import { pathWords } from './lib/upkeep.mjs';
import { usageSummary } from './lib/usage.mjs';

const USAGE = `usage: daily-tidy.mjs <command> [--json]
  since    the last tidy: its date, the highest fact ids it read and sorted, the pages it checked
  pages    your own pages with no check or change in 7 days, most used first, then longest unchecked;
           --all: every page as own|shipped, its words, and when it was last checked
  drift    live facts naming a repo path that is gone
  survey   the map: one line for each place memory is weak, with a count and names to pull, then how chats used memory
  keep [--read <fact-id>] [--sorted <fact-id>] [--checked <path|tag:name|topic:name>]… [--linked <text>]…
           inside the daily tidy only: stage every change as finished, and note what this part read, checked and linked`;
export const SLUG = 'wiki-dream';
export const TAG = 'dream';
const FIRST_DREAM_DAYS = 30;
const DUE_DAYS = 7;
const LARGE_TOPIC = 100;
const DAY_MS = 86_400_000;
const MAX_BODY = 400;
const ITEM = 200;
const NAMES = 5;
const USED = 10;
const TROUBLE = ['improve', TAG];
const CHANGES = 'openspec/changes';
// The store's own date format: a record dated any other way was not stamped by the store.
const PLAIN_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const day = stamp => String(stamp).slice(0, 10);
const daysBefore = (now, days) => day(new Date(now.getTime() - days * DAY_MS).toISOString());
// A daily tidy's record (`Daily tidy <date>: …`), or an older version's dream or small wiki tidy.
const RECORD = /^(?:Dream|Daily tidy|Wiki tidy) \d{4}-\d{2}-\d{2}:/;
// Read only at the record's start, so a link's words can not set it; a record from an older version has none.
const SORTED = /^[^.]*\. Sorted facts up to #(\d+)\./;
const newestFirst = (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id;
const sortedOf = body => Number(SORTED.exec(String(body))?.[1] ?? 0);
// Each fact of a record whose run stopped at its limit ends with this: that run did not reach every missed question.
const STOPPED = ' Stopped at its time limit.';
const cutShort = fact => String(fact.body).endsWith(STOPPED);

// A tidy's record: upkeep tags `dream` any fact naming this folder, so the tag alone is not enough. A date ahead or
// not plain UTC, or a `#N` at or above its own id, marks a forgery. One argument: `facts.filter` passes an index.
export function isDreamFact(fact) {
  if (!RECORD.test(String(fact.body))) return false;
  // Format first, so a date that parses as past can't sort first; then `!(<=)`, so an impossible day fails too.
  if (!PLAIN_UTC.test(String(fact.created_at)) || !(Date.parse(fact.created_at) <= Date.now())) return false;
  const read = /#(\d+)/.exec(String(fact.body))?.[1];
  return read === undefined || fact.id == null || Math.max(Number(read), sortedOf(fact.body)) < Number(fact.id);
}

/** The wiki pages and specs a record's body names. */
export function pagesNamed(body) {
  return [...new Set(String(body).match(/(?:(?:wiki|knowledge)\/[\w./-]*\.md|openspec\/specs\/[\w-]+\/spec\.md)/g) || [])];
}

/** The tags and topics a record's body names as checked: `tag:<name>` and `topic:<name>`. */
export function namesChecked(body) {
  return [...new Set((String(body).match(/\b(?:tag|topic):[^\s,;]+/g) || []).map(name => name.replace(/\.$/, '')))];
}

/** The last tidy from its records, or the first tidy's default: 30 days before `today`. */
export function lastDream(facts, today = new Date()) {
  const fact = facts.filter(isDreamFact).sort(newestFirst)[0];
  if (!fact) return { since: daysBefore(today, FIRST_DREAM_DAYS), afterFact: 0, sorted: 0, pages: [], dream: null };
  // A long record is split over several facts that start the same way.
  const start = RECORD.exec(fact.body)?.[0];
  const parts = facts.filter(isDreamFact).filter(part => start && part.body.startsWith(start));
  const ids = parts.map(part => Number(/#(\d+)/.exec(part.body)?.[1] ?? 0));
  return { since: day(fact.created_at), afterFact: Math.max(0, ...ids), sorted: Math.max(0, ...parts.map(part => sortedOf(part.body))),
    pages: [...new Set(parts.flatMap(part => pagesNamed(part.body)))].sort(), dream: fact.id };
}

/** Each page's, tag's and topic's newest mention across the records: Map name → date. */
export function dreamChecks(facts) {
  const checks = new Map();
  for (const fact of facts.filter(isDreamFact)) {
    for (const name of [...pagesNamed(fact.body), ...namesChecked(fact.body)]) {
      if (!checks.has(name) || checks.get(name) < day(fact.created_at)) checks.set(name, day(fact.created_at));
    }
  }
  return checks;
}

// The page list. `pages` is [{ path, kind, text, committed }], `committed` a date or null.
// Sorted longest unchecked first: never checked, then oldest; ties by path.
export function pageList(pages, checks = new Map()) {
  return pages.map(({ path, kind = 'own', text, committed }) => {
    const dates = [committed, checks.get(path)].filter(Boolean).map(day).sort();
    return {
      path,
      kind,
      words: text.split(/\s+/).filter(Boolean).length,
      lastChecked: dates.at(-1) ?? null,
    };
  }).sort((a, b) => (a.lastChecked ?? '').localeCompare(b.lastChecked ?? '') || a.path.localeCompare(b.path));
}

/** The own pages of a page list with no check or change in 7 days, or with `all` every page but a spec; the pages
 *  chats used most come first (`uses`: Map path → count), then the list's own order. */
export function duePages(list, { uses = new Map(), now = new Date(), all = false } = {}) {
  const cutoff = daysBefore(now, DUE_DAYS);
  return list.filter(page => page.kind !== 'spec' && (all || (page.kind === 'own' && (page.lastChecked ?? '') <= cutoff)))
    .sort((a, b) => (uses.get(b.path) || 0) - (uses.get(a.path) || 0));
}

// The repo paths a fact's words name that are gone: each starts in one of `tops` and fails `exists`.
// `once(path)` says this branch ever held it, so a path-like word or another branch's work is no drift.
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

const oneLine = (text, max = ITEM) => String(text).replace(/\s+/g, ' ').trim().slice(0, max);

/** One tidy's record as fact bodies of 400 characters at most, each starting the same way. `units` are `keep`'s lines,
 *  `last` the record before, `map` the changed numbers as `<name> <before> to <after>`, `cut` a stop at the limit. */
export function recordBodies({ day: date, units = [], last, map = [], cut = false }) {
  const tail = cut ? STOPPED : '';
  const max = MAX_BODY - tail.length;
  const highest = (key, floor) => Math.max(Number(floor) || 0, ...units.map(unit => Number(unit[key]) || 0));
  const head = `Daily tidy ${date}: read facts up to #${highest('read', last?.afterFact)}. Sorted facts up to #${highest('sorted', last?.sorted)}.`;
  const named = key => [...new Set(units.flatMap(unit => unit[key] || []).map(text => oneLine(text)).filter(Boolean))];
  const sections = [['Checked', named('checked').filter(name => !/\s/.test(name)), ', ', 'none'], ['Linked', named('linked'), '; ', 'none'], ['Map', map, ', ', 'no change']];
  const bodies = [];
  let body = head;
  for (const [label, items, joiner, empty] of sections) {
    let started = false;
    for (const item of items.length ? items : [empty]) {
      let piece = started ? `${joiner}${item}` : ` ${label}: ${item}`;
      if (body !== head && body.length + piece.length + 1 > max) {
        bodies.push(started ? `${body}.` : body);
        body = head;
        piece = ` ${label}: ${item}`;
      }
      body += piece;
      started = true;
    }
    body += '.';
  }
  return [...bodies, body].map(each => `${each}${tail}`);
}

const byCount = (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]));

/** The map: `{ last, lines: [{ name, count, names }], questions: [{ command, words }], newFacts }`. `facts` are the
 *  live facts with tags, `records` the tidy's records, `pages` and `gone` what `pages` and `drift` compute. */
export function mapLines({ facts = [], records = [], topicOf = () => null, steps = [], usage = {}, pages = [], pageUses = new Map(), gone = [], checked = [], now = new Date() }) {
  const last = lastDream(records.filter(fact => !fact.superseded_by), now);
  const checks = dreamChecks(records);
  for (const name of checked) checks.set(name, day(now.toISOString()));
  const cutoff = daysBefore(now, DUE_DAYS);
  const left = name => (checks.get(name) ?? '') > cutoff;
  // A run cut short did not reach every question, so the misses are read since the newest record of a full run.
  const full = records.filter(fact => !fact.superseded_by && isDreamFact(fact) && !cutShort(fact)).sort(newestFirst)[0];
  const missedSince = full?.created_at ?? daysBefore(now, FIRST_DREAM_DAYS);
  const own = facts.filter(fact => !isDreamFact(fact)).sort((a, b) => a.id - b.id);
  const topicsOf = fact => [...new Set((fact.tags || []).map(topicOf).filter(Boolean))];
  const ids = list => list.map(fact => `#${fact.id}`);

  const fresh = own.filter(fact => (last.dream ? fact.id > last.afterFact : day(fact.created_at) >= last.since));
  const trouble = own.filter(fact => fact.type === 'thread' && (fact.tags || []).some(tag => TROUBLE.includes(tag)));
  const missed = (usage.misses || []).filter(miss => miss.at >= missedSince);
  const loose = own.filter(fact => !topicsOf(fact).length);
  const pageless = new Map(), byTopic = new Map();
  for (const fact of own) {
    for (const tag of fact.tags || []) if (!topicOf(tag) && !steps.includes(tag)) pageless.set(tag, (pageless.get(tag) || 0) + 1);
    for (const topic of topicsOf(fact)) byTopic.set(topic, [...(byTopic.get(topic) ?? []), fact.id]);
  }
  const noPage = [...pageless].sort(byCount);
  const returned = new Set((usage.facts || []).map(row => row.id));
  const large = [...byTopic].map(([topic, list]) => [topic, list.length, list.filter(id => returned.has(id)).length])
    .filter(([, size]) => size > LARGE_TOPIC).sort(byCount);
  const due = duePages(pageList(pages, checks), { uses: pageUses, now });
  const line = (name, list, names = list, shown = NAMES) => ({ name, count: list.length, names: names.slice(0, shown) });
  // A count is the true total, so a thing a tidy looked at and left never reads as fixed; only its name goes.
  const open = (kind, list) => list.filter(([name]) => !left(`${kind}:${name}`));
  return { last, questions: missed.map(({ command, words }) => ({ command, words })), newFacts: fresh.map(fact => fact.id), lines: [
    line('new facts', fresh, ids(fresh)),
    line('trouble notes', trouble, ids(trouble)),
    line('missed questions', missed, missed.map(miss => JSON.stringify(miss.words))),
    line('no topic', loose, ids(loose.filter(fact => fact.id > last.sorted))),
    line('tags with no page', noPage, open('tag', noPage).map(([tag, n]) => `${tag} (${n})`)),
    line('large topics', large, open('topic', large).map(([topic, size, used]) => `${topic} (${size} facts, ${Math.round(100 * used / size)}% used)`)),
    line('gone files', gone, ids(gone)),
    line('due pages', due, due.map(page => page.path)),
    line('most used', (usage.topics || []).slice(0, USED), (usage.topics || []).map(row => `${row.topic} (${row.uses})`), USED),
    line('often returned', (usage.facts || []).slice(0, USED), (usage.facts || []).map(row => `#${row.id} (${row.uses})`), USED),
    line('used together', usage.pairs || [], (usage.pairs || []).map(pair => `${pair.topics.join(' + ')} (${pair.days} days)`), USED),
  ] };
}

/** The map as text: one line for each weakness, its count, then its names. */
export const mapText = map => map.lines.map(({ name, count, names }) => `${name}: ${count}${names.length ? `; ${names.join(' · ')}` : ''}`).join('\n');

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    console.error('daily-tidy.mjs: run it inside a git checkout');
    process.exit(2);
  }
}

// The tidy's records, superseded ones too; with `live`, also every live fact with its tags and the tag rows.
// One store read. Throws when the store can not be read.
async function readStore(ctx, { live = false } = {}) {
  const store = await openStore(ctx);
  const [[records, facts = []], tagRows] = await Promise.all([
    store.facts([{ slug: SLUG, tags: [TAG], type: 'project', all: true }, ...(live ? [{ withTags: true }] : [])]), live ? store.tags() : []]);
  return { records, facts, tagRows };
}

const dirsIn = path => (existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort() : []);

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

function committed(root, path) {
  try {
    const [at, rel] = path.startsWith('knowledge/') ? [join(root, 'knowledge'), path.slice(10)] : [root, path];
    return execFileSync('git', ['-C', at, 'log', '-1', '--format=%cI', '--', rel], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

// The live facts whose words name a repo path that is gone, lowest id first; a tidy's own record is no drift.
function goneFacts(root, facts) {
  const check = { tops: new Set(readdirSync(root).filter(name => name !== '.git')), exists: existsIn(root), once: path => Boolean(committed(root, path)) };
  return facts.filter(fact => !isDreamFact(fact) && !saysGone(fact.body))
    .map(fact => ({ id: fact.id, slug: fact.slug, type: fact.type, paths: stalePaths(fact.body, check), body: fact.body }))
    .filter(fact => fact.paths.length).sort((a, b) => a.id - b.id);
}

// Each topic's page is the repo's own; the profile's tidy pages add more and say which are shipped. A spec is no
// page the tidy checks. `only` keeps one kind, so no other page costs a git read.
async function repoPages(ctx, profile, { only } = {}) {
  const topics = ((await profile?.topics?.(ctx)) ?? []).filter(topic => topic.page);
  const kinds = new Map(topics.map(topic => [topic.page, 'own']));
  for (const { path, kind } of (await profile?.tidy?.pages?.(ctx)) ?? []) kinds.set(path, kind);
  const found = [...kinds].filter(([path, kind]) => kind !== 'spec' && (!only || kind === only) && existsSync(join(ctx.root, path)))
    .map(([path, kind]) => ({ path, kind, text: readFileSync(join(ctx.root, path), 'utf8'), committed: committed(ctx.root, path) }));
  return { found, topics };
}

// How often chats used each topic's page: Map path → count.
const pageUses = (topics, usage) => {
  const uses = new Map(usage.topics.map(row => [row.topic, row.uses]));
  return new Map(topics.map(topic => [topic.page, uses.get(topic.tag) || 0]));
};

/** The map for `ctx`'s store and counts, with the files of `root`: the run reads its copy of the default branch.
 *  `checked` are names a tidy checked today that no record holds yet. Throws when the store can not be read. */
export async function surveyMap(ctx, { root = ctx.root, checked = [], now = new Date() } = {}) {
  const files = { ...ctx, root };
  const profile = await loadProfile(ctx);
  const [{ records, facts, tagRows }, areas] = await Promise.all([readStore(ctx, { live: true }), loadAreas(files, profile)]);
  const topicOf = topicNamer(areas, tagRows);
  const usage = usageSummary(ctx, { now: now.getTime(), topicOf });
  const { found, topics } = await repoPages(files, profile, { only: 'own' });
  return mapLines({ facts, records, topicOf, steps: Object.keys(profile?.steps || {}), usage, pages: found, pageUses: pageUses(topics, usage),
    gone: goneFacts(root, facts), checked, now });
}

/** `keep`'s lines in `file`, one for each part the tidy finished; a line a kill cut short is dropped. */
export const progressLines = file => (file && existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [])
  .flatMap(line => { try { return line ? [JSON.parse(line)] : []; } catch { return []; } });
// Inside a run, what `keep` marked as checked: no record holds it yet, so the tidy's own map would still list it.
const keptToday = () => progressLines(process.env.WONG_MEMORY_TIDY_PROGRESS).flatMap(unit => unit.checked || []);

const storeFailed = (error, then) => console.error(`daily-tidy.mjs: the memory store could not be read${then}: ${error.message}`);

async function since({ json }) {
  let last;
  try {
    last = lastDream((await readStore(repoContext(repoRoot()))).records.filter(fact => !fact.superseded_by));
  } catch (error) {
    storeFailed(error, '');
    process.exitCode = 1;
    return;
  }
  if (json) return console.log(JSON.stringify(last));
  console.log([
    last.dream ? `last tidy: ${last.since} (fact #${last.dream})` : `last tidy: none; reading from ${last.since}`,
    `since: ${last.since}`,
    `after fact: #${last.afterFact}`,
    `sorted up to: #${last.sorted}`,
    `pages checked: ${last.pages.join(', ') || 'none'}`,
  ].join('\n'));
}

async function pages({ json, all }) {
  const ctx = repoContext(repoRoot());
  const profile = await loadProfile(ctx);
  let checks = new Map();
  try {
    checks = dreamChecks((await readStore(ctx)).records);
  } catch (error) {
    storeFailed(error, ', so commit dates alone are used');
  }
  for (const name of keptToday()) checks.set(name, day(new Date().toISOString()));
  const { found, topics } = await repoPages(ctx, profile, all ? {} : { only: 'own' });
  const usage = usageSummary(ctx, { topicOf: topicNamer(await loadAreas(ctx, profile)) });
  const list = duePages(pageList(found, checks), { uses: pageUses(topics, usage), all });
  const publish = profile?.tidy?.publish ?? null;
  if (json) return console.log(JSON.stringify({ pages: list, ...(publish ? { publish } : {}) }));
  const lines = [...list.map(page => [page.kind, page.words, page.lastChecked ?? 'never', page.path].join('\t')), ...(publish ? [`publish: ${publish}`] : [])];
  if (lines.length) console.log(lines.join('\n'));
}

async function drift({ json }) {
  const root = repoRoot();
  const skipped = [];
  let facts = [];
  try {
    facts = goneFacts(root, (await (await openStore(repoContext(root))).facts([{}]))[0]);
  } catch (error) {
    skipped.push('fact');
    storeFailed(error, ', so no fact was checked');
  }
  if (json) return console.log(JSON.stringify({ facts, skipped }));
  if (facts.length) console.log(facts.map(fact => ['fact', `#${fact.id}`, fact.paths.join(', '), fact.body.replace(/\s+/g, ' ')].join('\t')).join('\n'));
}

async function survey({ json }) {
  let map;
  try {
    map = await surveyMap(repoContext(repoRoot()), { checked: keptToday() });
  } catch (error) {
    storeFailed(error, ', so no map was made');
    process.exitCode = 1;
    return;
  }
  const { newFacts: _, ...shown } = map;
  console.log(json ? JSON.stringify({ version: 1, ...shown }) : mapText(map));
}

// Staged means finished: at its time limit the run publishes what is staged and drops the rest.
function keep({ read, sorted, checked = [], linked = [] }) {
  const file = process.env.WONG_MEMORY_TIDY_PROGRESS;
  if (!file) usageError(USAGE, 'keep works only inside the daily tidy, which names its progress file in WONG_MEMORY_TIDY_PROGRESS');
  const ids = Object.entries({ read, sorted }).filter(([, value]) => value !== undefined);
  const bad = ids.find(([, value]) => !/^#?\d+$/.test(value));
  if (bad) usageError(USAGE, `--${bad[0]} takes a fact id`);
  execFileSync('git', ['-C', repoRoot(), 'add', '--all']);
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...Object.fromEntries(ids.map(([key, value]) => [key, Number(value.replace('#', ''))])), checked, linked })}\n`);
  console.log('kept');
}

if (isMain(import.meta.url)) {
  const many = { type: 'string', multiple: true };
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true,
    options: { json: { type: 'boolean' }, all: { type: 'boolean' }, read: { type: 'string' }, sorted: { type: 'string' }, checked: many, linked: many } });
  const commands = { since, pages, drift, survey, keep };
  const command = Object.hasOwn(commands, positionals[0] ?? '') ? commands[positionals[0]] : null;
  if (!command || positionals.length !== 1) usageError(USAGE, positionals[0] ? `unknown command: ${positionals.join(' ')}` : 'name a command');
  await command(values);
  // Exit once the output is flushed, so the store's open socket cannot keep the process alive.
  process.stdout.write('', () => process.exit());
}
