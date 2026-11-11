// Topics: a tag that has a page. Their one-line summaries, the digest's topic lines, the topics a message names,
// and the pages one step from a topic's page. The profile lists the topics; nothing here reads the store.
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const SUMMARY_CHARS = 120;
const COMPANY_LINES = 8;
const MAX_BYTES = 1024;
const MAX_MATCHES = 3;
const NEAR_LETTERS = 4;

const FRONT = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const LINK = /\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g;

const cut = (text, max) => {
  if (text.length <= max) return text;
  const space = text.lastIndexOf(' ', max);
  return `${text.slice(0, space > 0 ? space : max).replace(/[\s,;:]+$/, '')}…`;
};

/** A page's first sentence after its frontmatter and title, links read as their words, cut on a word. */
export function summaryOf(text) {
  const body = String(text).replace(FRONT, '').replace(/^\s*# .*$/m, '');
  const para = body.split(/\n\s*\n/).map(block => block.trim()).find(block => block && !/^(#|```|~~~|<!--)/.test(block)) ?? '';
  const plain = para.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*|__/g, '').replace(/\s+/g, ' ');
  return cut(/^.+?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain, SUMMARY_CHARS - 1);
}

const fits = lines => Buffer.byteLength(lines.join('\n')) <= MAX_BYTES;

// The digest's topic block: the company topics the hub links, in its order, then the code topics' names, then how
// to pull one. Company lines go while room is left; the code line drops names from its end to fit.
export function topicLines(topics, script) {
  if (!topics.length) return [];
  const company = topics.filter(topic => topic.kind === 'company' && topic.hub != null).sort((a, b) => a.hub - b.hub);
  const names = topics.filter(topic => topic.kind === 'code').map(topic => topic.tag);
  const pull = `Pull a topic: \`${script} pull <topic>\``;
  const lines = ['## Topics'];
  for (const topic of company.slice(0, COMPANY_LINES)) {
    const line = `${topic.tag}  ${topic.summary}`;
    if (!fits([...lines, line, names.length ? `Code: ${names.slice(0, 3).join(', ')}, …` : '', pull])) break;
    lines.push(line);
  }
  if (names.length) {
    let shown = names.length;
    const codeLine = () => `Code: ${names.slice(0, shown).join(', ')}${shown < names.length ? ', …' : ''}`;
    while (shown > 1 && !fits([...lines, codeLine(), pull])) shown--;
    lines.push(codeLine());
  }
  return [...lines, pull];
}

// Lowercase words, with `/` and `-` read as spaces, so `people/ada` and `people-ada` both read `people ada`.
const words = text => String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const has = (said, phrase) => phrase.length > 0 && said.includes(` ${phrase.join(' ')} `);

// The topics a message names, clear matches first, three at most: `[{ topic, clear }]`. Clear: the whole tag, an
// alias, or a company tag's last part, as whole words. Near: a word of 4+ letters that starts a word of the tag.
export function matchTopics(message, topics, { skip = [], skills = [] } = {}) {
  const left = new Set([...skip, ...skills]);
  const msg = words(message);
  const said = ` ${msg.join(' ')} `;
  const stems = msg.filter(word => word.length >= NEAR_LETTERS);
  const clear = [];
  const near = [];
  for (const topic of topics) {
    if (left.has(topic.tag)) continue;
    const names = [topic.tag, ...(topic.aliases || []), ...(topic.kind === 'company' ? [topic.tag.split('/').at(-1)] : [])];
    if (names.some(name => has(said, words(name)))) clear.push({ topic, clear: true });
    else if (words(topic.tag).some(part => stems.some(stem => part.startsWith(stem)))) near.push({ topic, clear: false });
  }
  return [...clear, ...near].slice(0, MAX_MATCHES);
}

// The pages a page links to, as repo paths; a folder link lands on its README.md.
function linksOf(root, page) {
  let text;
  try { text = readFileSync(join(root, page), 'utf8'); } catch { return []; }
  return [...text.matchAll(LINK)].map(([, written]) => written.replace(/[#?].*$/, ''))
    .filter(target => target && !/^[a-z][a-z0-9+.-]*:/i.test(target))
    .map(target => posix.normalize(target.startsWith('/') ? target.slice(1) : posix.join(posix.dirname(page), target)))
    .map(target => (target.endsWith('.md') ? target : posix.join(target, 'README.md')));
}

/** The pages among `pages` one step from `page`: those it links to (`out`) and those that link to it (`in`). */
export function pageLinks(root, page, pages) {
  const known = new Set(pages);
  return {
    out: [...new Set(linksOf(root, page))].filter(path => path !== page && known.has(path)),
    in: pages.filter(path => path !== page && linksOf(root, path).includes(page)),
  };
}
