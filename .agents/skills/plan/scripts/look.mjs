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

/** The colour set: the custom properties of the first plain `:root { … }`, or null when there is none. */
function colourSet(css) {
  const root = blocks(css).find(block => block.prelude === ':root');
  return root ? props(root.body) : null;
}

const read = file => { try { return readFileSync(file, 'utf8'); } catch { return null; } };

/** The app's colours under `root`, laid over look.css's copy; `missing` is true when the app's file has no set. */
export function lookColours(root = ROOT) {
  const app = colourSet(read(join(root, 'app/src/index.css')) ?? '');
  return { colours: new Map([...colourSet(read(LOOK)), ...(app ?? [])]), missing: !app?.size };
}

/** The finished stylesheet: the app's light colours, then look.css's parts. */
export function lookCss(root = ROOT) {
  const look = read(LOOK);
  const at = look.indexOf(START), to = look.indexOf(END);
  if (at < 0 || to < at) throw new Error(`${LOOK}: expected ${START} … ${END}`);
  const declarations = [...lookColours(root).colours].map(([name, value]) => `  ${name}: ${value};`).join('\n');
  return `${look.slice(0, at)}:root {\n${declarations}\n}${look.slice(to + END.length)}`;
}
