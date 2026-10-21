import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lookColours, lookCss } from '../../.agents/skills/plan/scripts/look.mjs';

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
