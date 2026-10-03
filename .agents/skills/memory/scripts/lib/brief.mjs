// A fresh view of selected facts, in their own words; never reads or writes the store.
export const BRIEF_MAX_BYTES = 6144;
export const BRIEF_LIMIT = 20;
export const SCOPE_FILTERS = ['tag', 'type', 'slug', 'since', 'until', 'author', 'branch', 'change', 'state'];
const GROUPS = [['thread', 'Open threads'], ['feedback', 'Feedback'], ['project', 'Project decisions'], ['user', 'User facts'], ['reference', 'References']];

function scopeLine(filters) {
  const scope = JSON.stringify(filters);
  if (Buffer.byteLength(scope) <= 1024) return scope;
  let shortened = '';
  for (const char of scope) {
    if (Buffer.byteLength(shortened + char) > 1000) break;
    shortened += char;
  }
  return `${shortened}… [scope display shortened]`;
}

export function renderBrief({ facts, filters }, generatedAt = new Date().toISOString()) {
  const header = `# Memory brief\nGenerated: ${generatedAt}\nScope: ${scopeLine(filters)}\n`;
  const footer = shown => `\nSelected at most ${BRIEF_LIMIT} live facts (request limit ${filters.limit}); ${facts.length} selected, ${facts.length - shown} selected entries omitted to fit. Other matching facts may exist.\n`;
  let body = facts.length ? '' : '\nNo matching live facts.\n';
  let shown = 0;
  for (const [type, heading] of GROUPS) {
    let groupShown = false;
    for (const fact of facts.filter(fact => fact.type === type)) {
      const entry = `${groupShown ? '' : `\n## ${heading}\n`}\nFact #${fact.id} · ${fact.created_at} · author: ${fact.author || '(not recorded)'}\n${fact.body}\nSource session: ${fact.session_id || '(not recorded)'}; follow up: source ${fact.id}\n`;
      if (Buffer.byteLength(header + body + entry + footer(shown + 1)) > BRIEF_MAX_BYTES) continue;
      body += entry;
      shown += 1;
      groupShown = true;
    }
  }
  return header + body + footer(shown);
}
