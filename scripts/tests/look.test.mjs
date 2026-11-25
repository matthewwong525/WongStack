import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildReview } from '../../.agents/skills/plan/scripts/build-review.mjs';
import { lookColours, lookCss, pageCss, sheet } from '../../.agents/skills/plan/scripts/look.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const shipped = readFileSync(join(repo, 'app/src/index.css'), 'utf8');

/** A checkout whose app stylesheet is `css`, or none when `css` is null. */
function checkout(t, css) {
  const root = mkdtempSync(join(tmpdir(), 'wong-look-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (css !== null) {
    mkdirSync(join(root, 'app/src'), { recursive: true });
    writeFileSync(join(root, 'app/src/index.css'), css);
  }
  return root;
}

/** The light, or with `.dark` the dark, colour block of a finished stylesheet. */
const colours = (css, prelude = ':root') => new RegExp(`^${prelude.replace('.', '\\.')} \\{([^}]*)\\}`, 'm').exec(css)[1];
const darkOf = css => /\n\.dark \{([^}]*)\}/.exec(css)[1];

test('the colour reader finds both colour sets in the app\'s shipped stylesheet', () => {
  const { colours: set, dark, missing } = lookColours(repo);
  assert.equal(missing, false, 'app/src/index.css: the reader can\'t find the colour set; keep it a plain :root block');
  assert.equal(set.get('--primary'), /\n:root \{[^}]*--primary:\s*([^;]+);/.exec(shipped)[1]);
  assert.match(set.get('--radius'), /rem$/);
  assert.equal(dark.get('--background'), darkOf(shipped).match(/--background:\s*([^;]+);/)[1], 'keep the dark set one plain .dark block');
  assert.notEqual(dark.get('--background'), set.get('--background'));
});

test('a rebranded dark set reaches the look under .dark', t => {
  const css = shipped.replace(/(\n\.dark \{[^}]*--background:)[^;]+;/, '$1 oklch(0.2 0.05 260);');
  const out = lookCss(checkout(t, css));
  assert.match(colours(out, '.dark'), /--background: oklch\(0\.2 0\.05 260\);/);
  assert.match(colours(out), /--background: oklch\(1 0 0\);/, 'light stays light');
  assert.ok(out.indexOf(':root {') < out.indexOf('.dark {'), 'light first, then dark');
});

test('a rebranded app colours the look', t => {
  const css = shipped.replace(/(\n:root \{[^}]*--primary:)[^;]+;/, '$1 oklch(0.5 0.2 260);');
  const out = lookCss(checkout(t, css));
  assert.match(colours(out), /--primary: oklch\(0\.5 0\.2 260\);/);
  assert.equal(colours(out).match(/--primary:/g).length, 1, 'one light primary: the app\'s replaces the fallback');
});

test('every page starts light: dark only under .dark, and no rule that follows the device', t => {
  const out = lookCss(repo);
  assert.doesNotMatch(out, /prefers-color-scheme/);
  assert.match(out, /color-scheme: light;/);
  assert.match(out, /\.dark \{ color-scheme: dark; \}/);
  assert.doesNotMatch(out, /color-scheme: light dark/);
  assert.equal(out.match(/--background:/g).length, 2, 'one light and one dark background');
  // An install that kept its old device-following block gets no device rule: the reader takes plain blocks alone.
  const old = shipped.replace(/\n\.dark \{[^}]*\}\n/, '\n@media (prefers-color-scheme: dark) {\n  :root {\n    --background: oklch(0.3 0 0);\n  }\n}\n');
  const kept = lookCss(checkout(t, old));
  assert.doesNotMatch(kept, /prefers-color-scheme|--background: oklch\(0\.3/);
  assert.match(colours(kept), /--background: oklch\(1 0 0\);/);
  assert.match(colours(kept, '.dark'), /--background: oklch\(0\.145 0 0\);/, 'no dark set: shadcn\'s neutral dark');
});

test('a missing stylesheet or colour set falls back to shadcn\'s neutral colours', t => {
  const none = lookColours(checkout(t, null));
  assert.equal(none.missing, true);
  assert.equal(none.colours.get('--primary'), 'oklch(0.205 0 0)');
  assert.equal(none.dark.get('--primary'), 'oklch(0.922 0 0)');
  const empty = lookColours(checkout(t, '@import "tailwindcss";\n'));
  assert.equal(empty.missing, true);
  assert.match(colours(lookCss(checkout(t, '@import "tailwindcss";\n'))), /--background: oklch\(1 0 0\);/);
});

test('the look loads nothing and lets no value break out of a page', t => {
  const css = shipped.replace(/(\n:root \{)/, '$1\n  --logo: url(https://example.test/x.png);\n  --sneak: red</style><script>;');
  const out = lookCss(checkout(t, css));
  assert.doesNotMatch(out, /url\(|@import|<\/?(?:style|script)/i);
  assert.doesNotMatch(lookCss(repo), /url\(|@import|<|>/);
  for (const part of [':where(button, .btn)', ':where(.card)', ':where(.tag)', 'color-scheme: light;', '.theme-toggle {']) assert.ok(out.includes(part), part);
});

test('a rebranded corner, font and shadow reach the look, light and dark', t => {
  const css = shipped
    .replace(/(\n:root \{[^}]*--radius:)[^;]+;/, '$1 0.25rem;')
    .replace(/(\n:root \{[^}]*--font:)[^;]+;/, '$1 "Brand Sans", sans-serif;')
    .replace(/(\n:root \{[^}]*--shadow-card:)[^;]+;/, '$1 0 2px 0 rgb(0 0 0 / 0.2);')
    .replace(/(\n\.dark \{[^}]*--shadow-card:)[^;]+;/, '$1 0 2px 0 rgb(0 0 0 / 0.6);');
  const out = lookCss(checkout(t, css));
  for (const value of ['--radius: 0.25rem;', '--font: "Brand Sans", sans-serif;', '--shadow-card: 0 2px 0 rgb(0 0 0 / 0.2);']) {
    assert.ok(colours(out).includes(value), `the light set carries ${value}`);
  }
  assert.ok(colours(out, '.dark').includes('--shadow-card: 0 2px 0 rgb(0 0 0 / 0.6);'), 'the dark set carries its own shadow');
  // The parts read the app's values first: the body its font, a control, a card and a layer their shadow.
  assert.match(out, /:where\(body\) \{[^}]*font-family: var\(--font, /);
  for (const [look, brand] of [['xs', 'low'], ['sm', 'card'], ['lg', 'raised']]) {
    assert.ok(out.includes(`--look-shadow-${look}: var(--shadow-${brand}, `), `--look-shadow-${look} reads --shadow-${brand}`);
  }
  assert.match(out, /:where\(\.card\) \{[^}]*border-radius: calc\(var\(--radius\) \+ 4px\);[^}]*box-shadow: var\(--look-shadow-sm\);/);
});

test('the starter\'s own font, corner and shadows reach the look', () => {
  // The starter ships the device's own font. An install sets its own: the app's check takes any font.
  assert.match(shipped, /\n:root \{[^}]*--font:\s*system-ui, sans-serif;/);
  const out = lookCss(repo);
  for (const name of ['--font', '--radius', '--shadow-low', '--shadow-card', '--shadow-raised']) {
    const value = new RegExp(`\\n:root \\{[^}]*${name}:\\s*([^;]+);`).exec(shipped)[1];
    assert.ok(colours(out).includes(`${name}: ${value};`), `the look carries the app's ${name}`);
  }
});

test('a repo with no app keeps the look\'s own font, corner and shadows', t => {
  const out = lookCss(checkout(t, null));
  assert.doesNotMatch(out, /--font:|--shadow-(?:low|card|raised):/, 'no app, so no brand font or shadow is set');
  assert.match(colours(out), /--radius: 0\.625rem;/);
  for (const line of [
    'font-family: var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);',
    '--look-shadow-xs: var(--shadow-low, 0 1px 2px 0 rgb(0 0 0 / 0.05));',
    '--look-shadow-sm: var(--shadow-card, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1));',
    '--look-shadow-lg: var(--shadow-raised, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1));',
  ]) assert.ok(out.includes(line), line);
});

// The builder reads the look of the checkout it sits in, so a rebranded checkout gets its own copy of the builder.
async function rebrandedBuilder(t, css) {
  const root = checkout(t, css);
  mkdirSync(join(root, '.git'));
  for (const dir of ['.agents/skills/plan', '.agents/loop/scripts']) cpSync(join(repo, dir), join(root, dir), { recursive: true });
  const { buildReview } = await import(pathToFileURL(join(root, '.agents/skills/plan/scripts/build-review.mjs')).href);
  return kind => {
    const dir = join(root, `sample-${kind}`);
    mkdirSync(dir);
    writeFileSync(join(dir, 'proposal.md'), '# Sample\n\n## Why\n\nA reason.\n\n## What Changes\n\n- **One thing** changes.\n');
    buildReview(dir, { requireCurrent: true, kind });
    return /<style>([\s\S]*?)<\/style>/.exec(readFileSync(join(dir, 'review.html'), 'utf8'))[1];
  };
}

/** Each `font`, `font-family` and diagram font the built page's stylesheet sets, as `{ rule, value }`. */
const fontRules = style => [...style.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selector, body]) =>
  [...body.matchAll(/(?:^|[;\s])(?:font|font-family|--pele-font)\s*:\s*([^;]+)/g)].map(([, value]) => ({ rule: selector.trim(), value: value.trim() })));

test('a rebranded font reaches a built review page and a built preview page: no rule of the page beats it', async t => {
  const build = await rebrandedBuilder(t, shipped.replace(/(\n:root \{[^}]*--font:)[^;]+;/, '$1 "Brand Sans", sans-serif;'));
  // The plan's review page, and the page /apply builds from the same kit to show a finished build.
  for (const kind of ['plan', 'preview']) {
    const style = build(kind);
    assert.ok(colours(style).includes('--font: "Brand Sans", sans-serif;'), `${kind}: the page carries the app's font`);
    const fonts = fontRules(style);
    // A rule that named its own font would win over the look's `:where(body)`, which has no weight: the page's
    // body, a sketch, a diagram, a pin and the note box each read --font first, with a stack for a repo with no app.
    const page = fonts.filter(({ rule }) => /(?:^|\s)body$/.test(rule));
    assert.ok(page.length, `${kind}: the page's own body rule sets a font`);
    for (const rule of ['.art.sketch svg', '.art.pic', '.pin', '#editor textarea']) assert.ok(fonts.some(found => found.rule === rule), `${kind}: ${rule} sets a font`);
    for (const { rule, value } of fonts) {
      if (value === 'inherit' || value.endsWith('monospace')) continue;
      assert.match(value, /var\(--font, [^()]*sans-serif\)$/, `${kind}: ${rule} reads the app's font first, not "${value}"`);
    }
  }
});

// ── `look.mjs page`: a plan's screen page gets the look, and the app's Tailwind for the classes it names ──
const tailwindMissing = !existsSync(join(repo, 'app/node_modules/tailwindcss')) && 'no app/node_modules: run npm ci in app/';

/** A change folder with a screen page in `pages/`, its stylesheet written by `look.mjs page` from `root`'s app. */
async function screenPage(t, root) {
  const change = mkdtempSync(join(tmpdir(), 'wong-look-page-'));
  t.after(() => rmSync(change, { recursive: true, force: true }));
  mkdirSync(join(change, 'pages'));
  writeFileSync(join(change, 'pages/inbox.html'), '<!doctype html><html><head><link rel="stylesheet" href="inbox.css"></head>'
    + '<body><div class="rounded-lg bg-card p-4"><b>Inbox</b></div><button class="btn-primary">Send</button></body></html>');
  writeFileSync(join(change, 'proposal.md'), '# Sample\n\n## Why\n\nA reason.\n\n## What Changes\n\n- **The Inbox** changes.\n'
    + '  ```page\n  After: pages/inbox.html\n  ```\n');
  const written = await pageCss(join(change, 'pages/inbox.html'), root);
  assert.equal(written.out, join(change, 'pages/inbox.css'));
  return { change, written, css: readFileSync(written.out, 'utf8') };
}

test('look.mjs page writes the app\'s Tailwind rules for the classes a page names, and the review page carries them', { skip: tailwindMissing }, async t => {
  const { change, written, css } = await screenPage(t, repo);
  assert.equal(written.tailwind, true);
  assert.match(css, /\.rounded-lg \{\s*border-radius: var\(--radius\);/);
  assert.match(css, /\.bg-card \{\s*background-color: var\(--card\);/);
  assert.match(css, /\.p-4 \{\s*padding: calc\(var\(--spacing\) \* 4\);/);
  assert.ok(css.includes(lookCss(repo)), 'the look\'s colors and parts come too');
  assert.ok(css.indexOf('@layer theme, base, components, utilities;') < css.indexOf('@layer components {\n'), 'the parts sit under the classes');
  assert.deepEqual(buildReview(change, { requireCurrent: true }).warnings, []);
  assert.match(readFileSync(join(change, 'review.html'), 'utf8'), /\.bg-card \{/);
});

test('look.mjs page with no Tailwind installed writes the look\'s colors and parts, and the CLI says to run npm ci', async t => {
  const root = checkout(t, shipped);
  const { change, written, css } = await screenPage(t, root);
  assert.equal(written.tailwind, false);
  assert.equal(css, lookCss(root));
  assert.deepEqual(buildReview(change, { requireCurrent: true }).warnings, []);
  mkdirSync(join(root, '.git'));
  for (const dir of ['.agents/skills/plan', '.agents/loop/scripts']) cpSync(join(repo, dir), join(root, dir), { recursive: true });
  const run = spawnSync(process.execPath, [join(root, '.agents/skills/plan/scripts/look.mjs'), 'page', join(change, 'pages/inbox.html')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, `${join(change, 'pages/inbox.css')}\n`);
  assert.match(run.stderr, /run `npm ci` in app\//);
});

/** Writes each `path: text` pair under `dir`, making folders as needed. */
function files(dir, tree) {
  for (const [path, text] of Object.entries(tree)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), typeof text === 'string' ? text : JSON.stringify(text));
  }
}

/** Packages an app stylesheet may import: a scoped one, one with a subpath in its `exports`, and plain ones. */
const packages = {
  '@fontsource-variable/inter/package.json': { style: 'index.css' },
  '@fontsource-variable/inter/index.css': '.font-inter { font-family: "Inter Variable"; }\n',
  'tw-animate-css/package.json': { exports: { '.': { style: './dist/tw-animate.css' }, './prefix': { style: './dist/tw-animate-prefix.css' } } },
  'tw-animate-css/dist/tw-animate.css': '',
  'tw-animate-css/dist/tw-animate-prefix.css': '.tw-prefix-made { color: red; }\n',
  'plain/package.json': { exports: './main.css' },
  'plain/main.css': '',
  'loose/package.json': {},
  'loose/extra/more.css': '',
};

test('look.mjs finds a scoped package\'s sheet and a subpath through the package\'s exports map', t => {
  const modules = mkdtempSync(join(tmpdir(), 'wong-look-modules-'));
  t.after(() => rmSync(modules, { recursive: true, force: true }));
  files(modules, packages);
  const at = path => join(modules, path);
  assert.equal(sheet('@fontsource-variable/inter', '/x', modules), at('@fontsource-variable/inter/index.css'));
  assert.equal(sheet('tw-animate-css', '/x', modules), at('tw-animate-css/dist/tw-animate.css'));
  assert.equal(sheet('tw-animate-css/prefix', '/x', modules), at('tw-animate-css/dist/tw-animate-prefix.css'));
  assert.equal(sheet('plain', '/x', modules), at('plain/main.css'), 'a string exports is the package\'s own entry');
  assert.equal(sheet('loose', '/x', modules), at('loose/index.css'), 'no exports and no style: index.css');
  assert.equal(sheet('loose/extra/more.css', '/x', modules), at('loose/extra/more.css'), 'no exports: the path itself');
  assert.equal(sheet('./own.css', '/x/src', modules), '/x/src/own.css');
});

test('look.mjs page builds an app stylesheet that imports a scoped package and a subpath', { skip: tailwindMissing }, async t => {
  const root = checkout(t, `@import "tailwindcss";\n@import "@fontsource-variable/inter";\n@import "tw-animate-css/prefix";\n${shipped.replace(/@import[^\n]*\n/g, '')}`);
  writeFileSync(join(root, 'app/package.json'), '{}');
  files(join(root, 'app/node_modules'), packages);
  symlinkSync(join(repo, 'app/node_modules/tailwindcss'), join(root, 'app/node_modules/tailwindcss'), 'dir');
  const { written, css } = await screenPage(t, root);
  assert.equal(written.tailwind, true, written.warning);
  assert.match(css, /\.bg-card \{\s*background-color: var\(--card\);/);
  assert.match(css, /\.font-inter \{/, 'the scoped package\'s rules come in');
  assert.match(css, /\.tw-prefix-made \{/, 'the subpath\'s rules come in');
});

test('look.mjs page still writes the look\'s colors and parts, with a warning, when the app\'s Tailwind fails', async t => {
  const root = checkout(t, shipped);
  files(join(root, 'app'), {
    'package.json': {},
    'node_modules/tailwindcss/package.json': { main: 'index.js' },
    'node_modules/tailwindcss/index.js': 'exports.compile = async () => { throw new Error("cannot read the sheet"); };\n',
  });
  const { written, css } = await screenPage(t, root);
  assert.equal(written.tailwind, false);
  assert.match(written.warning, /Tailwind failed \(cannot read the sheet\)/);
  assert.equal(css, lookCss(root));
});
