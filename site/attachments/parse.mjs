// One reader for site/attachments/<slug>.md, shared by the Attachments page and scripts/check-attachments.mjs,
// so the two never read a file differently. wiki/maintaining/attachments.md owns the file's shape.

export const REPO_URL = 'https://github.com/matthewwong525/WongStack';

/** Reads `text` into its frontmatter fields and its body. A field the file lacks is undefined; the check names it. */
export function parseAttachment(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  const fields = {};
  let list = null;
  for (const line of (match?.[1] ?? '').split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(item[1].trim());
      continue;
    }
    const pair = /^(\w+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    // Only `sources:` opens a list; any other empty value reads as missing.
    list = pair[1] === 'sources' && pair[2] === '' ? [] : null;
    fields[pair[1]] = list ?? (pair[2].trim() || undefined);
  }
  const order = fields.order === undefined ? undefined : Number(fields.order);
  return {
    title: fields.title,
    problem: fields.problem,
    fix: fields.fix,
    order,
    checked: fields.checked,
    sources: Array.isArray(fields.sources) ? fields.sources : undefined,
    body: (match?.[2] ?? text).trim(),
  };
}
