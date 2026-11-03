// The page as text with refs, built from Playwright's ariaSnapshot() by the rules of camofox-browser
// (github.com/jo-inc/camofox-browser, MIT): which roles get a ref, which names get none, how many, and the paging.

/** Roles that get a ref (camofox lib/interactive-roles.js). */
export const INTERACTIVE_ROLES = ['button', 'link', 'textbox', 'checkbox', 'radio', 'menuitem', 'listitem', 'combobox', 'tab', 'searchbox', 'slider', 'spinbutton', 'switch'];
/** Names that get no ref: date pickers (camofox server.js SKIP_PATTERNS). */
export const SKIP_PATTERNS = [/datepicker/i, /date.?picker/i, /calendar/i, /^date$/i];
export const MAX_REFS = 500;
/** Frames left out of the page text: tracking, bot checks, frames that come and go (camofox IFRAME_SKIP_PATTERNS). */
export const FRAME_SKIP = [/web-pixel/i, /analytics/i, /tracking/i, /gtm/i, /facebook/i, /doubleclick/i, /google.*tag/i, /hotjar/i, /segment/i, /sentry/i,
  /recaptcha/i, /gstatic/i, /app-bridge/i, /extensions\.shopifycdn/i, /px-iframe/i, /px-captcha/i, /perimeterx/i, /\bcaptcha\b/i, /hcaptcha/i,
  /arkose/i, /funcaptcha/i, /datadome/i];
export const MAX_FRAMES = 8;
const MAX_CHARS = 80_000;
const TAIL_CHARS = 5000;
const LINE_START = /^(\s*-\s+)('?)(\w+)/;

/** A frame block's label, as camofox writes it: its name, else its host, without Shopify's random ends. */
export function frameLabel(name, url) {
  let label = name || '';
  if (!label) try { label = new URL(url).hostname; } catch { label = 'iframe'; }
  return label.replace(/card-fields-/, '').replace(/-[a-z0-9]{10,}$/, '');
}

/** True for a frame the page text leaves out unread: no real address, or a skip pattern. */
export const frameSkipped = (url, name) => !url || url === 'about:blank' || url === 'about:srcdoc' || FRAME_SKIP.some(skip => skip.test(url) || skip.test(name));

/** True when a frame's text holds a box, so the page text shows the frame. */
export const frameHasBoxes = yaml => Boolean(yaml && yaml.trim().length >= 10 && INTERACTIVE_ROLES.some(role => new RegExp(`^\\s*-\\s+${role}`, 'im').test(yaml)));

/** A line's box: its role, its name as `getByRole` reads it, and where its ref goes, or null for no box. Playwright
 * writes the name as JSON and puts a key that holds `: ` in YAML single quotes, with `''` for `'`. */
export function parseLine(line) {
  const start = LINE_START.exec(line);
  if (!start) return null;
  const quoted = start[2] === "'";
  let at = start[0].length;
  let name = '';
  if (line.startsWith(' "', at)) {
    let text = '';
    let end = at + 2;
    for (; end < line.length && line[end] !== '"'; end++) {
      if (line[end] === '\\') text += line[end++];
      else if (quoted && line[end] === "'") end++;
      text += line[end];
    }
    try { name = JSON.parse(`"${text}"`); } catch { name = text; }
    at = end + 1;
  }
  return { role: start[3].toLowerCase(), name, at };
}

/** The page text with a ref on each box, main page first, frames last, and each ref's `{role, name, nth, frame}`.
 * A named box's nth counts its exact name; an unnamed one counts every box of its role, as `getByRole(role)` does. */
export function buildSnapshot(mainYaml, frames = []) {
  const refs = new Map();
  const mark = (yaml, frame) => {
    const named = new Map();
    const any = new Map();
    return yaml.split('\n').map(line => {
      const box = parseLine(line);
      if (!box || !INTERACTIVE_ROLES.includes(box.role)) return line;
      const { role, name, at } = box;
      // `getByRole(role)` finds a date picker too, so it counts before the skip.
      const nth = name ? named.get(`${role}:${name}`) ?? 0 : any.get(role) ?? 0;
      named.set(`${role}:${name}`, (named.get(`${role}:${name}`) ?? 0) + 1);
      any.set(role, (any.get(role) ?? 0) + 1);
      if ((name && SKIP_PATTERNS.some(skip => skip.test(name))) || refs.size >= MAX_REFS) return line;
      const ref = `e${refs.size + 1}`;
      refs.set(ref, { role, name, nth, frame });
      return `${line.slice(0, at)} [${ref}]${line.slice(at)}`;
    }).join('\n');
  };
  const blocks = [mark(mainYaml ?? '', null)];
  for (const frame of frames) blocks.push(`- iframe "${frame.label}":\n${mark(frame.yaml, frame.frame).split('\n').map(line => `  ${line}`).join('\n')}`);
  return { snapshot: blocks.join('\n'), refs };
}

/** One window of a long page text, as camofox sends it: past 80,000 characters, a part, a marker, and the
 * page's last 5,000 characters, which `joinPieces` in browse.mjs puts back together. */
export function windowSnapshot(text, offset = 0) {
  const total = text.length;
  if (total <= MAX_CHARS) return { snapshot: text, truncated: false, totalChars: total, hasMore: false, nextOffset: null };
  const budget = MAX_CHARS - TAIL_CHARS - 200;
  const start = Math.min(Math.max(0, offset), total - TAIL_CHARS);
  const end = start + budget;
  const hasMore = end < total - TAIL_CHARS;
  const marker = hasMore ? `\n[... truncated at char ${end} of ${total}. Call snapshot with offset=${end} to see more. Pagination links below. ...]\n` : '\n';
  return { snapshot: text.slice(start, end) + marker + text.slice(-TAIL_CHARS), truncated: true, totalChars: total, hasMore, nextOffset: hasMore ? end : null };
}
