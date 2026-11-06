// Hides keys in a page reading before the chat sees it: wiki/stack/connect-your-tools.md
// Over-masking is safe; a key that slips through lands in memory, so the rules lean wide.

/** Runs that start the way a service's keys start. */
const PREFIX = /^(?:[srp]k_(?:live|test)_|[srp]k_|sk-|ntn_|secret_|figd_|gh[pousr]_|github_pat_|xox[abposr]-|glpat-|shpat_|shpss_|AKIA|ya29\.|re_)/;
/** A run of key characters long enough to be one. */
const RUN = /[A-Za-z0-9][A-Za-z0-9_.-]{19,}/g;
/** A snapshot line for a text box and the value typed or shown in it. */
const BOX = /^(\s*- (?:textbox|searchbox|combobox)\b.*?): (.+)$/gm;
/** A page whose address, title or headings are about keys. */
const KEY_PAGE = /key|token|secret|api|developer|integration/i;
const HEADING = /^\s*- heading "([^"]*)"/gm;
/** On a key page, a long hex run or a UUID, which a mix of cases can not tell from an id. */
const PLAIN_KEY = /(?<![A-Za-z0-9])(?:[0-9a-f]{32,}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?![A-Za-z0-9])/gi;

/** Shannon entropy in bits per character. */
function entropy(text) {
  const counts = new Map();
  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1);
  return [...counts.values()].reduce((sum, count) => sum - (count / text.length) * Math.log2(count / text.length), 0);
}

/** A run that reads as a key: a known prefix, or upper case, lower case and digits mixed at random. */
export const looksLikeKey = (run) => PREFIX.test(run) ||
  (/[A-Z]/.test(run) && /[a-z]/.test(run) && /\d/.test(run) && entropy(run) >= 3.5);

/** A run that starts the way a service's secret keys start; a publishable `pk_` key shows in full and is never one. */
export const knownKey = (run) => PREFIX.test(run) && !run.startsWith('pk_');

export const masked = (value) => `[key …${value.slice(-4)}]`;

/** Whether the page's address, title or a heading is about keys. */
const keyPage = (text, url, title) => KEY_PAGE.test([url, title, ...[...text.matchAll(HEADING)].map(([, heading]) => heading)].join(' '));

/** Every key the text shows, longest first. On a key page, every text box value over 20 characters, and every long
 *  hex run or UUID anywhere, counts too. */
export function findKeys(text, { url = '', title = '' } = {}) {
  const keys = new Set((text.match(RUN) ?? []).filter(looksLikeKey));
  if (keyPage(text, url, title)) {
    for (const [, , value] of text.matchAll(BOX)) if (value.trim().length > 20) keys.add(value.trim());
    for (const [value] of text.matchAll(PLAIN_KEY)) keys.add(value);
  }
  // Longest first, so a key inside a longer one is not half-replaced.
  return [...keys].sort((a, b) => b.length - a.length);
}

/** The page text with every key hidden as `[key …abcd]`, and how many different keys it hid. */
export function maskKeys(text, page = {}) {
  const keys = findKeys(text, page);
  return { text: keys.reduce((out, key) => out.split(key).join(masked(key)), text), found: keys.length };
}
