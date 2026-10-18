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

/** The light and dark blocks of a finished stylesheet. */
function halves(css) {
  const dark = /@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/.exec(css)[1];
  const light = /^:root \{([^}]*)\}/m.exec(css)[1];
  return { light, dark };
}

test('the colour reader finds both colour sets in the app\'s shipped stylesheet', () => {
  const { light, dark, missing } = lookColours(repo);
  assert.deepEqual(missing, [], `app/src/index.css: the reader can't find the ${missing.join(' and ')} colour set; keep each a plain :root block`);
  assert.equal(light.get('--primary'), /\n:root \{[^}]*--primary:\s*([^;]+);/.exec(shipped)[1]);
  assert.equal(dark.get('--background'), /prefers-color-scheme: dark\) \{\s*:root \{[^}]*--background:\s*([^;]+);/.exec(shipped)[1]);
  assert.match(light.get('--radius'), /rem$/);
});

test('a rebranded app colours the look in light and dark', t => {
  const css = shipped.replace(/(\n:root \{[^}]*--primary:)[^;]+;/, '$1 oklch(0.5 0.2 260);')
    .replace(/(prefers-color-scheme: dark\) \{\s*:root \{[^}]*--primary:)[^;]+;/, '$1 oklch(0.7 0.15 260);');
  const { light, dark } = halves(lookCss(checkout(t, css)));
  assert.match(light, /--primary: oklch\(0\.5 0\.2 260\);/);
  assert.match(dark, /--primary: oklch\(0\.7 0\.15 260\);/);
  assert.equal((light + dark).match(/--primary:/g).length, 2, 'one primary a set: the app\'s replaces the fallback');
});

test('a missing stylesheet or colour set falls back to shadcn\'s neutral colours and names the set', t => {
  const none = lookColours(checkout(t, null));
  assert.deepEqual(none.missing, ['light', 'dark']);
  assert.equal(none.light.get('--primary'), 'oklch(0.205 0 0)');
  assert.equal(none.dark.get('--primary'), 'oklch(0.922 0 0)');
  const lightOnly = shipped.replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\n\}\n/, '');
  const half = lookColours(checkout(t, lightOnly));
  assert.deepEqual(half.missing, ['dark']);
  assert.equal(half.dark.get('--background'), 'oklch(0.145 0 0)');
  assert.match(halves(lookCss(checkout(t, lightOnly))).dark, /--background: oklch\(0\.145 0 0\);/);
});

test('the look loads nothing and lets no value break out of a page', t => {
  const css = shipped.replace(/(\n:root \{)/, '$1\n  --logo: url(https://example.test/x.png);\n  --sneak: red</style><script>;');
  const out = lookCss(checkout(t, css));
  assert.doesNotMatch(out, /url\(|@import|<\/?(?:style|script)/i);
  assert.doesNotMatch(lookCss(repo), /url\(|@import|<|>/);
  for (const part of [':where(button, .btn)', ':where(.card)', ':where(.tag)', 'color-scheme: light dark']) assert.ok(out.includes(part), part);
});
