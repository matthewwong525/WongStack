// Three guards for the landing page in site/. Meta-only, like the site itself.
//
// They live here, not in site/, because a change that edits only the README or
// only a script never runs the site's own workflow (.github/workflows/site.yml).
// wiki/maintaining/landing-page.md says what each one protects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { findWranglerConfigOrNull, parseConfig } from '../lib-wrangler-config.mjs';
// The page's own message, read from the file the page reads. Node strips the
// types, so this is the module itself, never a copy.
import { INSTALL_PROMPT } from '../../site/src/install.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(join(repo, path), 'utf8');

const README = 'README.md';
const INSTALL = 'site/src/install.ts';
const SITE_CONFIG = 'site/wrangler.site.jsonc';
const LOOKUP = 'scripts/lib-wrangler-config.mjs';
const PAYLOAD = '.agents/skills/wong-sync/references/payload-files.json';

// ---- Guard 1: the page's install message is the README's ----

// The text of every fenced block in a Markdown file, without its indent.
function fencedBlocks(markdown) {
  const blocks = [];
  let open = null;
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) {
      if (open) blocks.push(open.join('\n'));
      open = open ? null : [];
    } else if (open) {
      open.push(line.trim());
    }
  }
  return blocks;
}

// Why the README does not carry `prompt` as a fenced message, or null when it
// does. A whole block must equal it: a README message that only starts with the
// page's, or contains it, has changed.
function messageProblem(readme, prompt) {
  if (fencedBlocks(readme).includes(prompt)) return null;
  return `${README} has no fenced message equal to INSTALL_PROMPT in ${INSTALL}. `
    + `The landing page must show the README's install message, character for character: change both files in the same change.`;
}

test("the README's fenced install message is the landing page's, character for character", () => {
  assert.equal(typeof INSTALL_PROMPT, 'string');
  assert.ok(INSTALL_PROMPT.length > 20 && !INSTALL_PROMPT.includes('\n'), `${INSTALL} must export INSTALL_PROMPT as one line`);
  assert.equal(messageProblem(read(README), INSTALL_PROMPT), null);
});

test('a README whose message differs from the page is refused, naming both files', () => {
  const prompt = 'Install it for me. Follow https://example.com/setup.md';
  const readme = message => `# Tool\n\n1. Paste this:\n\n   \`\`\`\n   ${message}\n   \`\`\`\n\n2. Answer.\n`;

  assert.equal(messageProblem(readme(prompt), prompt), null);
  for (const [name, text] of [
    ['a reworded message', readme('Install it. Follow https://example.com/setup.md')],
    ['a longer message that starts the same', readme(`${prompt} Then tell me what you did.`)],
    ['the message in a sentence, not a fenced block', `# Tool\n\nPaste ${prompt} into a chat.\n`],
    ['no message at all', '# Tool\n\nAsk for a copy.\n'],
  ]) {
    const problem = messageProblem(text, prompt);
    assert.ok(problem, `${name} must be refused`);
    assert.match(problem, /README\.md/, name);
    assert.match(problem, /site\/src\/install\.ts/, name);
  }
});

// ---- Guard 2: the starter app's scripts find only the starter app's config ----

// The names the lookup searches each folder for, read from the lookup itself.
function lookupNames() {
  const list = read(LOOKUP).match(/const CONFIG_NAMES = (\[[^\]]*\]);/);
  assert.ok(list, `${LOOKUP} no longer declares CONFIG_NAMES as one array; teach this guard where the names are`);
  return JSON.parse(list[1]);
}

// Every place the lookup would find a config under `root`: '.' for the root
// itself, else the name of an immediate subfolder. The lookup takes the first
// in whatever order the file system lists them, so more than one is a coin toss.
function configHolders(root, names) {
  const holds = dir => names.some(name => existsSync(join(dir, name)));
  const folders = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .filter(name => holds(join(root, name)));
  return [...(holds(root) ? ['.'] : []), ...folders].sort();
}

// Why the starter app's lookup is no longer certain to find app/, or null.
function configProblem(holders) {
  if (holders.length === 1 && holders[0] === 'app') return null;
  return `the starter app's scripts must find a deploy config in app/ only, but one is findable in: ${holders.join(', ') || 'nowhere'}. `
    + `The landing page's config is ${SITE_CONFIG}, a name ${LOOKUP} never looks for; keep it, and pass --config to every wrangler call for the site.`;
}

// Every path the payload list names under site/. '$comment' is prose.
function sitePaths(inventory) {
  const strings = value => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(strings);
    if (value && typeof value === 'object') {
      return Object.entries(value).filter(([key]) => key !== '$comment').flatMap(([, inner]) => strings(inner));
    }
    return [];
  };
  return strings(inventory).filter(path => path === 'site' || path.startsWith('site/'));
}

test("the starter app's scripts find app/wrangler.jsonc, never the landing page's config, and no install receives site/", () => {
  const names = lookupNames();
  assert.ok(names.length > 0 && names.every(name => name.startsWith('wrangler.')), `unexpected config names in ${LOOKUP}`);
  assert.ok(existsSync(join(repo, SITE_CONFIG)), `${SITE_CONFIG} is the landing page's deploy config`);
  assert.ok(!names.includes('wrangler.site.jsonc'), `${LOOKUP} now looks for the landing page's config name; rename ${SITE_CONFIG}`);

  assert.equal(configProblem(configHolders(repo, names)), null);
  assert.equal(findWranglerConfigOrNull(), join(repo, 'app/wrangler.jsonc'), 'the lookup itself must return the starter app config');
  assert.deepEqual(sitePaths(JSON.parse(read(PAYLOAD))), [], `${PAYLOAD} must name nothing under site/: the landing page is meta-only`);
});

test('a second findable config is refused, and so is a payload list that names site/', t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-landing-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const names = lookupNames();
  const write = path => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), '{}\n');
  };

  write('app/wrangler.jsonc');
  write('site/wrangler.site.jsonc');
  write('site/package.json');
  write('.hidden/wrangler.jsonc');
  write('node_modules/wrangler.jsonc');
  assert.deepEqual(configHolders(root, names), ['app']);
  assert.equal(configProblem(configHolders(root, names)), null);

  for (const name of names) {
    write(`site/${name}`);
    assert.deepEqual(configHolders(root, names), ['app', 'site'], name);
    assert.match(configProblem(configHolders(root, names)), /app, site/, name);
    assert.match(configProblem(configHolders(root, names)), /wrangler\.site\.jsonc/, name);
    rmSync(join(root, 'site', name));
  }
  write('wrangler.jsonc');
  assert.match(configProblem(configHolders(root, names)), /\., app/);
  assert.match(configProblem([]), /nowhere/);
  assert.match(configProblem(['site']), /findable in: site/);

  assert.deepEqual(sitePaths({ $comment: ['site/ is meta-only'], core: { files: ['app/index.html'], dirs: ['wiki/stack'] } }), []);
  assert.deepEqual(
    sitePaths({ core: { files: ['site/index.html', 'sitemap.xml'] }, pack: { dirs: ['site'], exclude: ['site/dist'] } }),
    ['site/index.html', 'site', 'site/dist'],
  );
});

// ---- Guard 3: a publish attaches wongstack.com, and a preview never does ----

const DOMAINS = ['wongstack.com', 'www.wongstack.com'];

// Why deploying `config` would not leave wongstack.com on the live site alone,
// or null. A wrangler environment inherits the top-level `routes`, so one with
// no empty list of its own takes the domain on a branch deploy.
function domainProblem(config) {
  const routes = DOMAINS.map(pattern => ({ pattern, custom_domain: true }));
  if (!isDeepStrictEqual(config.routes, routes)) {
    return `${SITE_CONFIG} must list exactly ${DOMAINS.join(' and ')} as its top-level \`routes\`, each with \`custom_domain: true\`: a publish attaches what the list names.`;
  }
  if (config.workers_dev !== true) {
    return `${SITE_CONFIG} must keep \`"workers_dev": true\`: with \`routes\` declared and that key absent, wrangler turns the site's own address off.`;
  }
  const taker = Object.entries(config.env ?? {}).find(([, block]) => !isDeepStrictEqual(block?.routes, []));
  if (!taker) return null;
  return `env.${taker[0]} in ${SITE_CONFIG} must declare \`"routes": []\`: an environment inherits the top-level routes, so a preview would take ${DOMAINS[0]} from the live site.`;
}

test('the live site answers at wongstack.com and www.wongstack.com, and no environment takes either name', () => {
  const config = parseConfig(join(repo, SITE_CONFIG));
  assert.ok(config.env?.staging, `${SITE_CONFIG} must keep env.staging: the preview deploys it`);
  assert.equal(domainProblem(config), null);
});

test('a config whose staging block has no routes is refused, naming the environment', () => {
  // The real config with one thing changed, and why it is refused.
  const broken = change => {
    const config = parseConfig(join(repo, SITE_CONFIG));
    change(config);
    return domainProblem(config);
  };

  for (const [name, change] of [
    ['staging with no routes', config => { delete config.env.staging.routes; }],
    ['staging with a domain of its own', config => { config.env.staging.routes = [{ pattern: 'wongstack.com', custom_domain: true }]; }],
  ]) {
    assert.match(broken(change), /env\.staging/, name);
    assert.match(broken(change), /"routes": \[\]/, name);
  }
  assert.match(broken(config => { config.env.trial = { name: 'wongstack-site-trial' }; }), /env\.trial/);

  for (const [name, change] of [
    ['no routes at all', config => { delete config.routes; }],
    ['www left out', config => { config.routes.pop(); }],
    ['a third name', config => { config.routes.push({ pattern: 'app.wongstack.com', custom_domain: true }); }],
    ['a route that is not a custom domain', config => { config.routes[0] = { pattern: 'wongstack.com' }; }],
  ]) {
    assert.match(broken(change), /top-level `routes`/, name);
  }
  assert.match(broken(config => { delete config.workers_dev; }), /workers_dev/);
});
