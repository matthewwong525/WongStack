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
const DARK = /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/;

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

/** The light set: the first plain `:root { … }`. The dark set: the `:root` inside the dark media block. */
function sets(css) {
  const top = blocks(css);
  const light = top.find(block => block.prelude === ':root');
  const media = top.find(block => DARK.test(block.prelude.replace(/\s+/g, ' ')));
  const dark = media && blocks(media.body).find(block => block.prelude === ':root');
  return { light: light ? props(light.body) : null, dark: dark ? props(dark.body) : null };
}

const read = file => { try { return readFileSync(file, 'utf8'); } catch { return null; } };

/** The app's colour sets under `root`, each laid over look.css's copy; `missing` names a set the app's file lacks. */
export function lookColours(root = ROOT) {
  const fallback = sets(read(LOOK));
  const app = sets(read(join(root, 'app/src/index.css')) ?? '');
  const missing = ['light', 'dark'].filter(name => !app[name]?.size);
  const merged = name => new Map([...fallback[name], ...(app[name] ?? [])]);
  return { light: merged('light'), dark: merged('dark'), missing };
}

const declarations = set => [...set].map(([name, value]) => `  ${name}: ${value};`).join('\n');

/** The finished stylesheet: the app's light and dark colours, then look.css's parts. */
export function lookCss(root = ROOT) {
  const look = read(LOOK);
  const at = look.indexOf(START), to = look.indexOf(END);
  if (at < 0 || to < at) throw new Error(`${LOOK}: expected ${START} … ${END}`);
  const { light, dark } = lookColours(root);
  return `${look.slice(0, at)}:root {\n${declarations(light)}\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n${declarations(dark).replace(/^/gm, '  ')}\n  }\n}${look.slice(to + END.length)}`;
}
