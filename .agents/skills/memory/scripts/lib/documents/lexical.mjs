import { scopedEntries } from './corpus.mjs';

const STOP = new Set('a an the how why what where when does do should can we i our this that is are be to of and or for in on with as it its use uses using before after through from once'.split(' '));
const stem = word => ({ publishing: 'publish', published: 'publish', saving: 'save', saved: 'save', waiting: 'wait', waited: 'wait', required: 'require', requiring: 'require' }[word]
  || (word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word));
const tokens = text => (text.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || []).filter(word => !STOP.has(word)).map(stem);
export function queryWords(query) {
  return [...new Set(tokens(query))].slice(0, 32);
}
export function passages(entry, query, idf = new Map(), deadline = Infinity) {
  const lines = entry.text.split(/\r?\n/), words = queryWords(query);
  const boundaries = lines.map((line, i) => /^#{1,6}\s/.test(line) ? i : -1).filter(i => i >= 0);
  if (boundaries[0] !== 0) boundaries.unshift(0);
  boundaries.push(lines.length);
  const hits = [];
  for (let section = 0; section < boundaries.length - 1; section++) {
    if (Date.now() >= deadline) break;
    const start = boundaries[section], end = boundaries[section + 1];
    const body = lines.slice(start, end).join('\n').toLowerCase(), bodyTokens = tokens(body), unique = new Set(bodyTokens);
    const matched = words.filter(word => unique.has(word));
    if (!matched.length) continue;
    const center = lines.findIndex((line, index) => index >= start && index < end && matched.some(word => tokens(line).includes(word)));
    const from = end - start <= 28 ? start : Math.max(start, center - 5);
    const to = Math.min(end, from + 28);
    const titleTokens = new Set(tokens(`${lines[0]} ${lines[start]}`));
    const score = matched.reduce((sum, word) => {
      const frequency = bodyTokens.filter(token => token === word).length;
      const weight = idf.get(word) || 1;
      return sum + weight * frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * bodyTokens.length / 100))
        + (titleTokens.has(word) ? weight * 0.6 : 0);
    }, 0) + matched.length / Math.max(1, words.length);
    hits.push({ path: entry.path, role: entry.role, hash: entry.hash, heading: lines[start].replace(/^#+\s*/, '').slice(0, 180),
      startLine: from + 1, endLine: to, text: lines.slice(from, to).join('\n'), truncated: from > start || to < end,
      score: score + (body.includes(query.toLowerCase()) ? 1 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 2);
}
export function lexicalSearch(corpus, query, options = {}) {
  const entries = scopedEntries(corpus, options), words = queryWords(query), counts = new Map(words.map(word => [word, 0]));
  const deadline = options.deadline || Infinity;
  let partial = false;
  for (const entry of entries) {
    if (Date.now() >= deadline) { partial = true; break; }
    const unique = new Set(tokens(entry.text));
    for (const word of words) if (unique.has(word)) counts.set(word, counts.get(word) + 1);
  }
  const idf = new Map(words.map(word => [word, Math.log(1 + (entries.length - counts.get(word) + 0.5) / (counts.get(word) + 0.5))]));
  const hits = [];
  for (const entry of entries) {
    if (Date.now() >= deadline) { partial = true; break; }
    hits.push(...passages(entry, query, idf, deadline));
  }
  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  Object.defineProperty(hits, 'partial', { value: partial });
  return hits;
}
export function interleaveSources(candidates, limit = 5) {
  const groups = ['wiki', 'specs', 'active', 'archive'].map(role => candidates.filter(item => item.role === role));
  const output = [], seen = new Set();
  while (groups.some(group => group.length) && output.length < limit) {
    for (const group of groups) {
      const item = group.shift();
      if (!item) continue;
      const key = `${item.path}:${item.startLine}:${item.endLine}`;
      if (!seen.has(key) && output.length < limit) { output.push(item); seen.add(key); }
    }
  }
  return output;
}
