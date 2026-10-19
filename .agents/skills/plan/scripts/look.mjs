// The app's look as plain CSS for pages that can't run the app: the review page, the private pages, a closed link.
// The colours come from app/src/index.css, so a rebranded app carries them everywhere; look.css holds the parts.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOK = resolve(HERE, '../references/look.css');
/** The checkout these scripts sit in: .agents/skills/plan/scripts → its top. */
export const ROOT = resolve(HERE, '../../../..');
const START = '/* tokens:start */';
const END = '/* tokens:end */';

/** The top-level blocks of `css` as `{ prelude, body }`, comments dropped. */
function blocks(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  let depth = 0, from = 0, open = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (text[i] === '}' && depth > 0 && --depth === 0) {
      found.push({ prelude: text.slice(from, open).replace(/^[\s\S]*;/, '').trim(), body: text.slice(open + 1, i) });
      from = i + 1;
    }
  }
  return found;
}

/** The custom properties a block sets, in order, less any value that could load a file or break out of a page. */
function props(body) {
  const out = new Map();
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
    if (!/url\(|@import|[<>\\]/i.test(value)) out.set(name, value.trim());
  }
  return out;
}

/** A colour set: the custom properties of the first plain `<prelude> { … }`, or null when there is none. */
function colourSet(css, prelude = ':root') {
  const found = blocks(css).find(block => block.prelude === prelude);
  return found ? props(found.body) : null;
}

const read = file => { try { return readFileSync(file, 'utf8'); } catch { return null; } };

/** The app's colours under `root`, light (`colours`) and dark (`dark`), each laid over look.css's copy; `missing` is
 * true when the app's file has no light set. */
export function lookColours(root = ROOT) {
  const app = read(join(root, 'app/src/index.css')) ?? '';
  const look = read(LOOK);
  const over = prelude => new Map([...colourSet(look, prelude), ...(colourSet(app, prelude) ?? [])]);
  return { colours: over(':root'), dark: over('.dark'), missing: !colourSet(app)?.size };
}

/** The finished stylesheet: the app's light colours, its dark ones under `.dark`, then look.css's parts. */
export function lookCss(root = ROOT) {
  const look = read(LOOK);
  const at = look.indexOf(START), to = look.indexOf(END);
  if (at < 0 || to < at) throw new Error(`${LOOK}: expected ${START} … ${END}`);
  const { colours, dark } = lookColours(root);
  const set = (prelude, map) => `${prelude} {\n${[...map].map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`;
  return `${look.slice(0, at)}${set(':root', colours)}\n${set('.dark', dark)}${look.slice(to + END.length)}`;
}
