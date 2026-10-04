// A fresh view of selected facts, in their own words; never reads or writes the store.
export const BRIEF_MAX_BYTES = 6144;
export const BRIEF_LIMIT = 20;
export const BRIEF_DEFAULT_LIMIT = 8;
export const SCOPE_FILTERS = ['tag', 'type', 'slug', 'since', 'until', 'author', 'branch', 'change', 'state'];
const GROUPS = [['thread', 'Open threads'], ['feedback', 'Feedback'], ['project', 'Project decisions'], ['user', 'User facts'], ['reference', 'References']];

function scopeLine(filters) {
  const scope = JSON.stringify(Object.fromEntries(Object.entries(filters)
    .filter(([key, value]) => key !== 'all' && key !== 'limit' && Boolean(value))));
  if (Buffer.byteLength(scope) <= 1024) return scope;
  let shortened = '';
  for (const char of scope) {
    if (Buffer.byteLength(shortened + char) > 1000) break;
    shortened += char;
  }
  return `${shortened}… [scope display shortened]`;
}

export function renderBrief({ facts, filters }, generatedAt = new Date().toISOString()) {
  const header = `# Memory brief\nGenerated: ${generatedAt}\nScope: ${scopeLine(filters)}\nSource: source <fact-id>\n`;
  const footer = shown => `\nLimit ${filters.limit} live facts; ${facts.length} selected, ${facts.length - shown} selected entries omitted to fit. Other matching facts may exist.\n`;
  const groups = new Map(GROUPS.map(([type, heading]) => [type, { heading, entries: [] }]));
  let bytes = Buffer.byteLength(header);
  let shown = 0;
  // Admit entries in retrieval order; display order must not spend the budget first.
  for (const fact of facts) {
    const group = groups.get(fact.type);
    const entry = `\nFact #${fact.id} · ${fact.created_at} · author: ${fact.author || '(not recorded)'} · session: ${fact.session_id || '(not recorded)'}\n${fact.body}\n`;
    const entryBytes = Buffer.byteLength(entry + (group.entries.length ? '' : `\n## ${group.heading}\n`));
    if (bytes + entryBytes + Buffer.byteLength(footer(shown + 1)) > BRIEF_MAX_BYTES) continue;
    group.entries.push(entry);
    bytes += entryBytes;
    shown += 1;
  }
  const body = facts.length ? [...groups.values()].filter(group => group.entries.length)
    .map(group => `\n## ${group.heading}\n${group.entries.join('')}`).join('') : '\nNo matching live facts.\n';
  return header + body + footer(shown);
}
