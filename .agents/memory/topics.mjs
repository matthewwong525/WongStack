// WongStack's topics: each code area in areas.json, then each company page in knowledge/. An area wins a name
// clash. The prompt hook reads them on every message, so each file is read once and git is never asked.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summaryOf } from '../skills/memory/scripts/lib/topics.mjs';
import { linksIn, wikiPages } from './lib/links.mjs';

const AREAS = new URL('./areas.json', import.meta.url);
const HUB = 'knowledge/README.md';

const tagOf = page => page.slice('knowledge/'.length).replace(/(?:^|\/)README\.md$/, '').replace(/\.md$/, '');

/** `[{ tag, kind, page, summary, aliases, paths, docs, hub }]`; `hub` is a company page's place in the hub's links. */
export function topics({ root }) {
  const code = Object.entries(JSON.parse(readFileSync(AREAS, 'utf8'))).map(([tag, { definition, paths = [], docs = [], aliases = [] }]) => ({
    tag, kind: 'code', page: docs.find(doc => existsSync(join(root, doc))) ?? null, summary: definition, aliases, paths, docs, hub: null,
  }));
  const taken = new Set(code.map(topic => topic.tag));
  const pages = wikiPages(root, 'knowledge').filter(page => page !== HUB);
  const known = new Set(pages);
  const linked = existsSync(join(root, HUB)) ? linksIn(root, HUB).map(({ rel, readme }) => (known.has(rel) ? rel : readme)) : [];
  const order = [...new Set(linked.filter(page => known.has(page)))];
  const company = pages.filter(page => !taken.has(tagOf(page))).map(page => ({
    tag: tagOf(page), kind: 'company', page, summary: summaryOf(readFileSync(join(root, page), 'utf8')),
    aliases: [], paths: [page], docs: [page], hub: order.includes(page) ? order.indexOf(page) : null,
  }));
  return [...code, ...company];
}
