// The app's look as plain CSS for pages that can't run the app: the review page, the private pages, a closed link.
// The colours come from app/src/index.css, so a rebranded app carries them everywhere; look.css holds the parts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../../scripts/lib/cli.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOK = resolve(HERE, '../references/look.css');
/** The checkout these scripts sit in: the nearest folder up from here with a `.git`, by any folder depth. */
const top = dir => existsSync(join(dir, '.git')) || dirname(dir) === dir ? dir : top(dirname(dir));
export const ROOT = top(HERE);
const START = '/* tokens:start */';
const END = '/* tokens:end */';
const USAGE = `usage: look.mjs page <file.html>
  write <file>.css beside the page: the app's look, and the Tailwind classes the page's class attributes name`;

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

/** The file an `exports` value names: a plain path, else its `style` condition, else its `default`. */
const entry = value => typeof value === 'string' ? value : value && (entry(value.style) ?? entry(value.default));

/** A stylesheet Tailwind imports: a relative path, or a package's file by its `exports`, its `style`, or the path. */
export function sheet(id, base, modules) {
  if (/^\.\.?\//.test(id)) return resolve(base, id);
  const parts = id.split('/'), size = id.startsWith('@') ? 2 : 1;
  const dir = join(modules, ...parts.slice(0, size)), sub = parts.slice(size).join('/');
  const meta = JSON.parse(read(join(dir, 'package.json')) ?? '{}');
  // An `exports` that is a path or a set of conditions, not a map of `./` keys, is the package's `.` entry.
  const keyed = typeof meta.exports === 'object' && Object.keys(meta.exports ?? {}).some(key => key.startsWith('.'));
  const found = entry((keyed ? meta.exports : { '.': meta.exports })[sub ? `./${sub}` : '.']);
  return join(dir, found ?? (sub || (meta.style ?? 'index.css')));
}

/** The rules for `classes`, built by the app's own Tailwind from its stylesheet; null when the app has no Tailwind. */
async function tailwind(classes, root) {
  let compile;
  try { ({ compile } = createRequire(join(root, 'app/package.json'))('tailwindcss')); } catch { return null; }
  const modules = join(root, 'app/node_modules'), app = join(root, 'app/src');
  const loadStylesheet = async (id, base) => {
    const path = sheet(id, base, modules);
    return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
  };
  const loadModule = async id => { throw new Error(`the page's look can not load ${id}`); };
  const built = await compile(readFileSync(join(app, 'index.css'), 'utf8'), { base: app, from: join(app, 'index.css'), loadStylesheet, loadModule });
  return built.build(classes);
}

/** `<file>.css` beside the page: the look, then the page's Tailwind rules, which the look's parts must not outrank. */
export async function pageCss(file, root = ROOT) {
  const html = readFileSync(file, 'utf8');
  const classes = [...new Set([...html.matchAll(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].flatMap(m => (m[1] ?? m[2]).split(/\s+/)).filter(Boolean))];
  let rules, warning;
  try { rules = await tailwind(classes, root); } catch (error) {
    rules = null;
    warning = `the app's Tailwind failed (${error.message}), so only the look's colors and parts`;
  }
  const out = file.replace(/\.html?$/i, '') + '.css';
  writeFileSync(out, rules === null ? lookCss(root) : `${rules}\n@layer components {\n${lookCss(root)}\n}\n`);
  return { out, tailwind: rules !== null, warning };
}

if (isMain(import.meta.url)) {
  const { positionals } = parseCli({ usage: USAGE, allowPositionals: true });
  if (positionals.length !== 2 || positionals[0] !== 'page' || !/\.html?$/i.test(positionals[1])) usageError(USAGE);
  try {
    const { out, tailwind: built, warning } = await pageCss(resolve(positionals[1]));
    console.log(out);
    if (warning) console.error(`look: ${warning}`);
    else if (!built) console.error('look: no Tailwind in app/node_modules, so only the look\'s colors and parts; run `npm ci` in app/, then run this again');
  } catch (error) { console.error(`look: ${error.message}`); process.exitCode = 1; }
}
