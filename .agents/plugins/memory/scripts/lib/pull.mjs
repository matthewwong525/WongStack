// The pull: what a memory node (a topic, a repo path, a change, or a fact) is and each name it connects to, and the
// topics a topic shares facts and changes with. Read fresh on each call; nothing is stored.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { areaDocs, loadAreas, pathAreas } from './areas.mjs';
import { formatFact } from './digest.mjs';
import { filesBehind } from './files.mjs';
import { matchTopics, pageLinks } from './topics.mjs';
import { loadProfile, openStore, StoreError } from './store.mjs';

export const MAX_LINES = 60;
export const MAX_BYTES = 6 * 1024;
export const ITEMS = 3;
export const MORE_ITEMS = 30;
const RELATED = 8;
const TOPIC_FACTS = 200;
const TOP_SLUGS = 10;
const SLUG_FACTS = 50;
const PER_CHANGE = 10;
const SAMPLE = 80;
const BODY = 160;
const READ_LIMIT = 1000;
const NEAREST = 3;
const FILES_MS = 1500;
const FILES_TITLE = 'Files (a place to start, not a full list)';

const cut = (text, max) => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
// A fact as one item line, its body cut so twelve of them stay inside the byte cap; whole with `full`.
const factItem = (fact, full) => formatFact(full ? fact : { ...fact, body: cut(fact.body, BODY) });
const byCount = (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]));

// The tag an alias names, through the areas' own alias lists; a tag that is no alias is itself.
function canonical(areas) {
  const map = new Map();
  for (const [tag, area] of Object.entries(areas)) for (const alias of area.aliases || []) map.set(alias, tag);
  return tag => map.get(tag) ?? tag;
}

// Only a tag with a page is a topic: a tag with no page is no node.
const isTopic = (areas, tag) => Boolean(areas[tag]?.page);

/** Up to eight topics related to `tag`, in two reads: 3 a shared live fact, 1 a fact of a shared change (10 at most
 *  from one change), each with its counts, a sample fact, and whether a page links the two. */
export async function related(store, areas, tag, { root } = {}) {
  const name = canonical(areas)(tag);
  const [own] = await store.facts([{ tags: [name], withTags: true, limit: TOPIC_FACTS }]);
  return relatedFrom(store, areas, name, own, { root });
}

async function relatedFrom(store, areas, tag, own, { root }) {
  const canon = canonical(areas);
  const tagsOf = fact => [...new Set((fact.tags || []).map(canon))];
  const others = fact => tagsOf(fact).filter(other => other !== tag && isTopic(areas, other));
  const found = new Map();
  const entry = other => found.get(other) ?? found.set(other, { tag: other, score: 0, facts: 0, changes: new Set(), sample: null, perChange: new Map() }).get(other);
  const ownIds = new Set(own.map(fact => fact.id));
  for (const fact of own) {
    for (const other of others(fact)) {
      const row = entry(other);
      row.facts += 1;
      row.sample ??= fact.body;
    }
  }
  const slugs = [...own.reduce((counts, fact) => (fact.slug ? counts.set(fact.slug, (counts.get(fact.slug) || 0) + 1) : counts), new Map())]
    .sort(byCount).slice(0, TOP_SLUGS).map(([slug]) => slug);
  const results = slugs.length ? await store.facts(slugs.map(slug => ({ slug, withTags: true, limit: SLUG_FACTS }))) : [];
  results.forEach((facts, index) => {
    for (const fact of facts) {
      const shared = others(fact);
      for (const other of shared) entry(other).changes.add(slugs[index]);
      if (ownIds.has(fact.id)) continue;
      for (const other of shared) {
        const row = entry(other);
        row.perChange.set(slugs[index], (row.perChange.get(slugs[index]) || 0) + 1);
        row.sample ??= fact.body;
      }
    }
  });
  const page = areas[tag]?.page;
  return [...found.values()].map(row => {
    const fromChanges = [...row.perChange.values()].reduce((sum, n) => sum + Math.min(PER_CHANGE, n), 0);
    const links = page && root ? pageLinks(root, page, [areas[row.tag].page]) : { out: [], in: [] };
    return { tag: row.tag, score: 3 * row.facts + fromChanges, facts: row.facts, changes: row.changes.size,
      sample: cut(row.sample, SAMPLE), linked: links.out.length > 0 || links.in.length > 0 };
  }).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag)).slice(0, RELATED);
}

// Edit distance, for the nearest topic names to a word that is no node.
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** Up to three topic names nearest to `word`: those a message would name, then those a few letters away. */
export function nearestTopics(word, topicList) {
  const named = matchTopics(word, topicList).map(({ topic }) => topic.tag);
  const lower = String(word).toLowerCase();
  const close = topicList.map(topic => {
    const names = [topic.tag, ...(topic.aliases || []), topic.tag.split('/').at(-1)];
    return [topic.tag, Math.min(...names.map(name => distance(lower, name.toLowerCase())))];
  }).filter(([, d]) => d <= Math.max(2, Math.floor(lower.length / 3))).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
  return [...new Set([...named, ...close])].slice(0, NEAREST);
}

const changeDir = (root, name) => join(root, 'openspec', 'changes', name);
function archivedFolder(root, name) {
  const archive = join(root, 'openspec', 'changes', 'archive');
  if (!existsSync(archive)) return null;
  return readdirSync(archive).sort().reverse().find(folder => folder.replace(/^\d{4}-\d{2}-\d{2}-/, '') === name) ?? null;
}
// The proposal of an active or archived change, with its `#` title, or null.
function proposalOf(root, name) {
  const folder = existsSync(join(changeDir(root, name), 'proposal.md')) ? `openspec/changes/${name}` : (() => {
    const archived = archivedFolder(root, name);
    return archived ? `openspec/changes/archive/${archived}` : null;
  })();
  if (!folder || !existsSync(join(root, folder, 'proposal.md'))) return null;
  const title = readFileSync(join(root, folder, 'proposal.md'), 'utf8').match(/^# (.+)$/m)?.[1];
  return { path: `${folder}/proposal.md`, title: title || name };
}

/** What `name` is: a fact, a path, a topic, a change, or null. In order: `#N`, a topic tag with no `/` (`wiki` is the
 *  topic, not the folder), a path in the repo, a topic tag or alias, a change folder or a slug the store knows. */
export async function resolveNode(ctx, name, { areas, store }) {
  const word = String(name ?? '').trim();
  if (/^#?\d+$/.test(word)) return { kind: 'fact', id: Number(word.replace('#', '')) };
  if (!word.includes('/') && isTopic(areas, word)) return { kind: 'topic', tag: word };
  if (word && existsSync(join(ctx.root, word))) return { kind: 'path', name: word };
  const tag = canonical(areas)(word);
  if (isTopic(areas, tag)) return { kind: 'topic', tag };
  if (word && (existsSync(changeDir(ctx.root, word)) || archivedFolder(ctx.root, word))) return { kind: 'change', name: word };
  if (word && store) {
    try {
      const [[fact]] = await (await store()).facts([{ slug: word, all: true, limit: 1 }]);
      if (fact) return { kind: 'change', name: word };
    } catch (error) { if (!(error instanceof StoreError)) throw error; }
  }
  return null;
}

// A section: `inline` puts its items on one line joined by ` · `; else a `## title` heading and one item a line.
const section = (key, title, items, { inline = false, total = items.length } = {}) => ({ key, title, items, inline, total });

// The `##` headings of a page, as its parts.
function pageParts(root, page) {
  try { return [...readFileSync(join(root, page), 'utf8').matchAll(/^## (.+)$/gm)].map(([, heading]) => heading.trim()); } catch { return []; }
}

// The live facts grouped as a topic's or a path's fact sections: open threads, likes, decided, references.
function factSections(facts) {
  const of = (...types) => facts.filter(fact => types.includes(fact.type));
  return [
    section('open', 'Open threads', of('thread')),
    section('likes', 'Likes', of('feedback', 'user')),
    section('decided', 'Decided', of('project')),
    section('references', 'References', of('reference')),
  ].filter(each => each.items.length);
}

// The changes on these facts, most facts first, each with its state and count.
function changeItems(facts, state) {
  const counts = [...facts.reduce((map, fact) => (fact.slug ? map.set(fact.slug, (map.get(fact.slug) || 0) + 1) : map), new Map())].sort(byCount);
  return counts.map(([slug, n]) => ({ slug, text: `${slug} (${[state(slug), plural(n, 'fact')].filter(Boolean).join(', ')})` }));
}

// The archived changes the profile's lookup names for these tags, as change names.
async function archivedChanges(ctx, profile, tags, areas) {
  try {
    const lines = (await profile?.lookup?.after?.(ctx, { paths: [], named: [], tags, change: null, areas })) ?? [];
    return [...lines.join('\n').matchAll(/^- \[(\d{4}-\d{2}-\d{2}-[^\]]+)\]/gm)].map(([, folder]) => folder.replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  } catch { return []; }
}

const missingLine = error => `Memory was not loaded (${error.reason}); go on without it.`;

// One topic's answer: summary, page and parts, links one step, related, changes, the fact sections, the count.
async function topicAnswer(ctx, { tag, areas, profile, store, everyone }) {
  const area = areas[tag];
  const pages = Object.entries(areas).filter(([, each]) => each.page).map(([name, each]) => [each.page, name]);
  const tagOfPage = new Map(pages);
  const links = pageLinks(ctx.root, area.page, pages.map(([page]) => page));
  const linked = [...new Set([...links.out, ...links.in].map(page => tagOfPage.get(page) ?? page))].filter(name => name !== tag);
  const head = [`# ${tag} (topic)`, ...(area.definition ? [cut(area.definition, 200)] : []), `Page: ${area.page}`];
  const local = [
    section('parts', 'Parts', pageParts(ctx.root, area.page), { inline: true }),
    section('links', 'Links', linked, { inline: true }),
  ];
  const archived = await archivedChanges(ctx, profile, [tag], areas);
  let facts;
  let near;
  try {
    const opened = await store();
    const [found] = await opened.facts([{ tags: [tag], withTags: true, everyone, limit: READ_LIMIT }]);
    facts = found;
    near = await relatedFrom(opened, areas, tag, found.slice(0, TOPIC_FACTS), { root: ctx.root });
  } catch (error) {
    if (!(error instanceof StoreError)) throw error;
    const changes = section('changes', 'Changes', archived.map(name => `${name} (shipped)`), { inline: true });
    return { kind: 'topic', name: tag, head, sections: [...local, changes], tail: [missingLine(error)] };
  }
  const state = (await profile?.slugState?.(ctx)) ?? (() => undefined);
  const onFacts = changeItems(facts, state);
  const seen = new Set(onFacts.map(item => item.slug));
  const changes = [...onFacts.map(item => item.text), ...archived.filter(name => !seen.has(name)).map(name => `${name} (shipped)`)];
  const relatedItems = near.map(row => `${row.tag} (${plural(row.facts, 'shared fact')}, ${plural(row.changes, 'shared change')}${row.linked ? ', linked' : ''})`);
  const count = facts.length >= READ_LIMIT ? `${READ_LIMIT}+` : facts.length;
  return { kind: 'topic', name: tag, head, related: near,
    sections: [...local, section('related', 'Related', relatedItems, { inline: true }), section('changes', 'Changes', changes, { inline: true }), ...factSections(facts)],
    tail: [`${count} live facts. Pull a name or a number above to go deeper; \`--more <group>\` shows one group whole.`] };
}

/** The answer for paths, topics, or a change's named paths, as `areas` printed it: the profile's lookups, areas,
 *  docs, code folders, past changes, backlinks, and code users, then the areas' changes and fact sections. */
export async function pathAnswer(ctx, { names, change, areas, profile, store, everyone }) {
  const isTopicWord = word => Object.hasOwn(areas, word) && !existsSync(join(ctx.root, word));
  const paths = names.filter(word => !isTopicWord(word));
  const named = change ? (await profile?.lookup?.named?.(ctx, change)) ?? [] : [];
  const found = new Map(names.filter(isTopicWord).map(tag => [tag, 'topic']));
  for (const [tag, path] of pathAreas([...paths, ...named], areas, ctx.root)) if (!found.has(tag)) found.set(tag, path);
  const tags = [...found.keys()];
  const docs = areaDocs(tags, areas, ctx.root);
  const folders = [...new Set(tags.flatMap(tag => (areas[tag]?.paths || []).filter(prefix => prefix.endsWith('/'))))];
  const head = [
    ...((await profile?.lookup?.before?.(ctx, paths)) ?? []),
    found.size ? `Areas: ${[...found].map(([tag, path]) => `${tag} (${path})`).join(', ')}` : 'No mapped area for these paths.',
    ...tags.filter(tag => areas[tag].kind === 'company').flatMap(tag => companyLines(ctx, tag, areas)),
    ...(docs.length ? [`Docs: ${docs.join(', ')}`] : []),
    ...(folders.length ? [`Code: ${folders.join(', ')}`] : []),
    ...((await profile?.lookup?.after?.(ctx, { paths, named, tags, change, areas })) ?? []),
  ].flatMap(line => line.split('\n'));
  const answer = { kind: 'path', name: names.join(' ') || change, head, sections: [], tail: [] };
  if (!found.size) return answer;
  try {
    const [facts] = await (await store()).facts([{ tags, everyone, withTags: true, limit: READ_LIMIT }]);
    const state = (await profile?.slugState?.(ctx)) ?? (() => undefined);
    answer.sections = [section('changes', 'Changes', changeItems(facts, state).map(item => item.text), { inline: true }), ...factSections(facts)].filter(each => each.items.length);
    answer.tail = [facts.length ? `${facts.length} live facts in these areas. Pull a topic, a change, or a number above to go deeper.` : 'No live facts in these areas.'];
  } catch (error) {
    if (!(error instanceof StoreError)) throw error;
    answer.tail = [missingLine(error)];
  }
  return answer;
}

// A company topic's page, its summary, and the topic pages one link away.
function companyLines(ctx, tag, list) {
  const pages = Object.values(list).filter(topic => topic.kind === 'company').map(topic => topic.page);
  const { out, in: back } = pageLinks(ctx.root, list[tag].page, pages);
  return [`${tag}: ${list[tag].definition} (${list[tag].page})`, ...(out.length ? [`Links to: ${out.join(', ')}`] : []), ...(back.length ? [`Linked from: ${back.join(', ')}`] : [])];
}

// The files a change touched, from the profile's lookup; none when it has no such part or the read fails.
async function changeFiles(ctx, profile, name) {
  try {
    return ((await profile?.lookup?.files?.(ctx, [name], { deadline: Date.now() + FILES_MS }))?.get(name) ?? []).map(file => file.path);
  } catch { return []; }
}

// A change's answer: title, state, proposal; its topics; the files it touched; threads; newest facts; its chats.
async function changeAnswer(ctx, { name, areas, profile, store, all, everyone }) {
  const proposal = proposalOf(ctx.root, name);
  const state = ((await profile?.slugState?.(ctx)) ?? (() => undefined))(name);
  const extra = proposal ? [`Proposal: ${proposal.path} — ${proposal.title}`] : [];
  const files = section('files', FILES_TITLE, await changeFiles(ctx, profile, name));
  let facts;
  try {
    [facts] = await (await store()).facts([{ slug: name, all, everyone, withTags: true, limit: READ_LIMIT }]);
  } catch (error) {
    if (!(error instanceof StoreError)) throw error;
    return { kind: 'change', name, head: [`# ${name}${state ? ` (${state})` : ''}`, ...extra], sections: [files].filter(each => each.items.length), tail: [missingLine(error)] };
  }
  const canon = canonical(areas);
  const live = facts.filter(fact => !fact.superseded_by);
  const topics = [...live.reduce((map, fact) => {
    for (const tag of new Set((fact.tags || []).map(canon))) if (isTopic(areas, tag)) map.set(tag, (map.get(tag) || 0) + 1);
    return map;
  }, new Map())].sort(byCount).map(([tag, n]) => `${tag} (${n})`);
  const threads = live.filter(fact => fact.type === 'thread');
  const rest = facts.filter(fact => !threads.includes(fact));
  const chats = [...facts.reduce((map, fact) => {
    if (!fact.session_id) return map;
    const chat = map.get(fact.session_id) ?? { id: fact.session_id, day: String(fact.created_at).slice(0, 10), n: 0, first: fact.id };
    chat.n += 1;
    chat.first = Math.min(chat.first, fact.id);
    if (String(fact.created_at).slice(0, 10) < chat.day) chat.day = String(fact.created_at).slice(0, 10);
    return map.set(fact.session_id, chat);
  }, new Map()).values()].sort((a, b) => b.day.localeCompare(a.day)).map(chat => `${chat.id} ${chat.day} (${plural(chat.n, 'fact')}, first #${chat.first})`);
  return { kind: 'change', name,
    head: [`# ${name}${state ? ` (${state})` : ''}: ${live.length} live facts`, ...extra],
    sections: [
      section('topics', 'Topics', topics, { inline: true }),
      files,
      { ...section('open', 'Open threads', threads), facts: true },
      { ...section('facts', 'Facts, newest first', rest), facts: true },
      section('chats', 'Chats', chats),
    ].filter(each => each.items.length),
    tail: live.length ? ['Pull a topic or a number above to go deeper; `--more <group>` shows one group whole.'] : [] };
}

// A fact's answer: its whole body and metadata, its topics and change, what replaced it and what it replaced, the
// other facts from its chat, and how to read the chat.
async function factAnswer(ctx, { id, areas, profile, store, everyone, script }) {
  const opened = await store();
  const [[fact]] = await opened.facts([{ ids: [id], all: true, everyone, withTags: true }]);
  if (!fact) return null;
  const state = ((await profile?.slugState?.(ctx)) ?? (() => undefined))(fact.slug);
  const reads = [
    fact.superseded_by ? { ids: [fact.superseded_by], all: true, everyone } : { ids: [], limit: 0 },
    fact.slug ? { slug: fact.slug, all: true, everyone, limit: READ_LIMIT } : { ids: [], limit: 0 },
    fact.session_id ? { session: fact.session_id, all: true, everyone, limit: READ_LIMIT } : { ids: [], limit: 0 },
  ];
  const [replacedBy, sameSlug, sameChat] = await opened.facts(reads);
  const replaced = [...new Map([...sameSlug, ...sameChat].filter(each => each.superseded_by === fact.id).map(each => [each.id, each])).values()];
  const canon = canonical(areas);
  const tags = [...new Set((fact.tags || []).map(canon))];
  const sources = fact.sources?.length ? fact.sources.join(', ') : 'none';
  const { files } = await filesBehind(ctx, [fact], { profile, areas, limit: MORE_ITEMS, deadline: Date.now() + FILES_MS });
  return { kind: 'fact', name: `#${id}`, fact,
    head: [`# Fact #${fact.id} (${fact.type}${fact.superseded_by ? `, superseded by #${fact.superseded_by}` : ', live'})`,
      String(fact.body).replace(/\s+/g, ' ').trim(),
      `Written ${String(fact.created_at).slice(0, 10)} by ${fact.author || 'unknown'}; sources: ${sources}`],
    sections: [
      section('topics', 'Topics', tags, { inline: true }),
      section('change', 'Change', fact.slug ? [`${fact.slug}${state ? ` (${state})` : ''}`] : [], { inline: true }),
      section('files', FILES_TITLE, files.map(file => file.path)),
      { ...section('replaced-by', 'Replaced by', replacedBy), facts: true },
      { ...section('replaced', 'Replaced', replaced), facts: true },
      { ...section('chat', 'From the same chat', sameChat.filter(each => each.id !== fact.id)), facts: true },
    ].filter(each => each.items.length),
    tail: [fact.session_id ? `Read the chat: \`${script} source ${fact.id}\`.` : 'No chat is stored for this fact.'] };
}

// Fact sections hold fact rows; a topic's or a path's fact sections are marked by their key.
const FACT_KEYS = new Set(['open', 'likes', 'decided', 'references']);
const holdsFacts = each => each.facts || FACT_KEYS.has(each.key);

/** The answer as lines within MAX_LINES and MAX_BYTES: each section shows `limit` items and how many it left out;
 *  with `more`, that one section whole, up to MORE_ITEMS. */
export function renderAnswer(answer, { more, limit = ITEMS } = {}) {
  const asText = (each, item, full) => (holdsFacts(each) ? factItem(item, full) : String(item));
  if (more) {
    const wanted = String(more).toLowerCase();
    const each = answer.sections.find(one => one.key === wanted || one.title.toLowerCase().startsWith(wanted));
    if (!each) return { lines: [`No group ${more} in ${answer.name}. Its groups: ${answer.sections.map(one => one.key).join(', ') || 'none'}.`], code: 1 };
    const shown = each.items.slice(0, MORE_ITEMS);
    return { lines: [`## ${each.title} (${answer.name})`, ...shown.map(item => (holdsFacts(each) ? factItem(item, true) : `- ${item}`)),
      ...(each.items.length > shown.length ? [`· ${each.items.length - shown.length} more`] : [])], code: 0 };
  }
  const lines = [...answer.head];
  const size = list => list.reduce((sum, line) => sum + Buffer.byteLength(line) + 1, 0);
  let bytes = size(lines);
  const room = (next, held) => lines.length + next.length + held.length <= MAX_LINES && bytes + size(next) + size(held) <= MAX_BYTES;
  const push = next => { lines.push(...next); bytes += size(next); };
  for (const each of answer.sections) {
    const take = each.items.slice(0, limit).map(item => asText(each, item, false));
    const left = each.items.length - take.length;
    const next = each.inline ? [`${each.title}: ${take.join(' · ')}${left ? ` · ${left} more` : ''}`]
      : [`## ${each.title}`, ...take, ...(left ? [`· ${left} more`] : [])];
    if (room(next, answer.tail)) push(next);
    else if (room([`${each.title}: ${each.items.length} left out at the cap; \`--more ${each.key}\``], answer.tail)) push([`${each.title}: ${each.items.length} left out at the cap; \`--more ${each.key}\``]);
  }
  push(answer.tail);
  return { lines, code: 0 };
}

// The answer as JSON: the same data, fact sections as facts.
const jsonOf = answer => ({ version: 1, kind: answer.kind, name: answer.name, head: answer.head, ...(answer.related ? { related: answer.related } : {}),
  ...(answer.fact ? { fact: answer.fact } : {}),
  sections: answer.sections.map(({ key, title, items }) => ({ key, title, total: items.length, items })), tail: answer.tail });

// The shared parts of a pull: the profile, the areas, and the store opened at most once, on first use.
async function context(ctx) {
  const profile = await loadProfile(ctx);
  const areas = await loadAreas(ctx, profile);
  let opened;
  const store = () => (opened ??= openStore(ctx));
  return { profile, areas, store };
}

/** `pull <node> [--more <group>] [--json]`: what `node` is and each thing it connects to. Exit 1 for no node. */
export async function pull(ctx, { values = {}, positionals = [] }, { script = 'memory.mjs' } = {}) {
  const name = positionals.join(' ').trim();
  if (!name) throw new StoreError('usage: memory.mjs pull <topic|path|change|#fact> [--more <group>] [--json]');
  const { profile, areas, store } = await context(ctx);
  const node = await resolveNode(ctx, name, { areas, store });
  const options = { areas, profile, store, everyone: values.everyone, all: values.all, script };
  let answer = null;
  if (node?.kind === 'fact') answer = await factAnswer(ctx, { ...options, id: node.id });
  else if (node?.kind === 'path') answer = await pathAnswer(ctx, { ...options, names: [node.name] });
  else if (node?.kind === 'topic') answer = await topicAnswer(ctx, { ...options, tag: node.tag });
  else if (node?.kind === 'change') answer = await changeAnswer(ctx, { ...options, name: node.name });
  if (!answer) {
    const topicList = Object.entries(areas).filter(([, area]) => area.page).map(([tag, area]) => ({ tag, aliases: area.aliases, kind: area.kind }));
    const near = nearestTopics(name, topicList);
    if (values.json) console.log(JSON.stringify({ version: 1, kind: null, name, nearest: near }));
    else console.log(`No memory node named ${name}.${near.length ? ` Nearest topics: ${near.join(' · ')}.` : ''}`);
    process.exitCode = 1;
    return 1;
  }
  return printAnswer(answer, values);
}

function printAnswer(answer, values) {
  if (values.json) { console.log(JSON.stringify(jsonOf(answer))); return 0; }
  const { lines, code } = renderAnswer(answer, { more: values.more, limit: Number(values.limit) || ITEMS });
  console.log(lines.join('\n'));
  if (code) process.exitCode = code;
  return code;
}

/** `areas [paths|topics…] [--change name]`: the path answer for many names at once. */
export async function areasCommand(ctx, { values = {}, positionals = [] }) {
  const { profile, areas, store } = await context(ctx);
  const answer = await pathAnswer(ctx, { names: positionals, change: values.change, areas, profile, store, everyone: values.everyone });
  return printAnswer(answer, values);
}

/** `show <slug> [--all] [--everyone]`: the change answer for one slug. */
export async function showCommand(ctx, { values = {}, positionals: [slug] }) {
  if (!slug) throw new StoreError('usage: memory.mjs show <slug> [--all] [--everyone]');
  const { profile, areas, store } = await context(ctx);
  return printAnswer(await changeAnswer(ctx, { name: slug, areas, profile, store, all: values.all, everyone: values.everyone }), values);
}

/** `related <topic> [--json]`: the related topics, with their counts and whether a page links them. */
export async function relatedCommand(ctx, { values = {}, positionals = [] }) {
  const word = positionals.join(' ').trim();
  if (!word) throw new StoreError('usage: memory.mjs related <topic> [--json]');
  const { areas, store } = await context(ctx);
  const tag = canonical(areas)(word);
  if (!isTopic(areas, tag)) throw new StoreError(`${word} is not a topic: only a tag with a page is one`);
  const rows = await related(await store(), areas, tag, { root: ctx.root });
  if (values.json) { console.log(JSON.stringify({ version: 1, tag, related: rows })); return 0; }
  console.log(rows.length ? [`# Related to ${tag}`, ...rows.map(row => `- ${row.tag}: score ${row.score}; ${plural(row.facts, 'shared fact')}, ${plural(row.changes, 'shared change')}; ${row.linked ? 'linked' : 'not linked'}. ${row.sample}`)].join('\n')
    : `No topic shares live facts or changes with ${tag}.`);
  return 0;
}
