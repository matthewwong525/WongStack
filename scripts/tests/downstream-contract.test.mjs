import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(join(repo, path), 'utf8');
const setup = '.agents/skills/wong-setup';

// The live smoke run confirmed this set is enough to migrate and deploy, and
// hosted setups rely on it when they mint the CI deploy token.
const DEPLOY_TOKEN_ALWAYS = ['Workers Scripts Write', 'D1 Write', 'Account Settings Read'];

// Every index entry, path → mode. The index holds staged work too.
function indexModes() {
  const modes = new Map();
  for (const line of execFileSync('git', ['ls-files', '-s'], { cwd: repo, encoding: 'utf8' }).split('\n')) {
    if (!line) continue;
    const [meta, path] = line.split('\t');
    modes.set(path, meta.split(' ')[0]);
  }
  return modes;
}

// raw.githubusercontent.com returns 404 through a directory link, so no
// prefix of the path may be a tracked link.
function linkPrefix(modes, path) {
  const parts = path.split('/');
  for (let i = 1; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('/');
    if (modes.get(prefix) === '120000') return prefix;
  }
  return null;
}

test('every raw setup URL in the README names a real tracked file', () => {
  const surface = 'hosted setups and the README setup prompt fetch this URL';
  const base = 'https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/';
  const paths = [...read('README.md').matchAll(/https:\/\/raw\.githubusercontent\.com\/matthewwong525\/WongStack\/refs\/heads\/main\/([^\s)"'`<>]+)/g)]
    .map(match => match[1]);
  assert.ok(paths.length > 0, `README.md has no ${base}<path> URL — ${surface}`);
  const modes = indexModes();
  for (const path of paths) {
    assert.doesNotMatch(path, /^\.(claude|codex)\//, `${path} goes through a link folder — ${surface}`);
    assert.equal(linkPrefix(modes, path), null, `${path} goes through a tracked link — ${surface}`);
    assert.ok(['100644', '100755'].includes(modes.get(path)),
      `${path} is not a tracked regular file (mode ${modes.get(path) ?? 'untracked'}) — ${surface}`);
  }
});

test('.env.example declares the Cloudflare variables', () => {
  const env = read('.env.example');
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_MEMORY_TOKEN']) {
    assert.match(env, new RegExp(`^${name}=`, 'm'),
      `.env.example must declare ${name}= — /wong-setup, the memory scripts, and hosted setups read this name from the host .env`);
  }
});

test('deploy.yml reads only the two Cloudflare deploy secrets', () => {
  const surface = 'installed repos and hosted setups set exactly these GitHub secrets';
  const names = new Set([...read('.github/workflows/deploy.yml').matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map(match => match[1]));
  const cloudflare = [...names].filter(name => /^CLOUDFLARE_/.test(name)).sort();
  assert.deepEqual(cloudflare, ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'], surface);
  for (const file of readdirSync(join(repo, '.github/workflows')).filter(name => name.endsWith('.yml'))) {
    assert.doesNotMatch(read(`.github/workflows/${file}`), /CLOUDFLARE_MEMORY_TOKEN/,
      `${file} must not read CLOUDFLARE_MEMORY_TOKEN — the memory token stays on the host, never in CI`);
  }
});

test('/wong-setup owns the Cloudflare runbook', () => {
  const surface = 'hosted setups and the README setup prompt run /wong-setup and its provisioning runbook';
  assert.ok(existsSync(join(repo, `${setup}/references/cloudflare.md`)), `${setup}/references/cloudflare.md is missing — ${surface}`);
  assert.ok(existsSync(join(repo, `${setup}/references/permission-groups.md`)), `${setup}/references/permission-groups.md is missing — ${surface}`);
  assert.ok(!existsSync(join(repo, '.agents/skills/wong-cloudflare')), `.agents/skills/wong-cloudflare must be gone — ${surface}`);
  const payload = JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json'));
  assert.ok(!payload.core.skillDirs.includes('wong-cloudflare'),
    'payload-files.json core.skillDirs must not ship wong-cloudflare — /wong-sync installs this list into every repo');
});

// Reads the rows of the table under `### The CI deploy token`.
function deployTokenRows() {
  const lines = read(`${setup}/references/permission-groups.md`).split('\n');
  const start = lines.findIndex(line => line.trim() === '### The CI deploy token');
  assert.ok(start >= 0, 'permission-groups.md needs a "### The CI deploy token" section — hosted setups mint the deploy token from it');
  const end = lines.findIndex((line, i) => i > start && /^#/.test(line));
  const rows = [];
  for (const line of lines.slice(start + 1, end < 0 ? undefined : end)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
    const name = cells[0].match(/^`(.+)`$/);
    if (!name || cells.length !== 4) continue;
    rows.push({ name: name[1], scope: cells[1], when: cells[2], id: cells[3] });
  }
  return rows;
}

test('the deploy token permission list is pinned', () => {
  const surface = 'hosted setups and /wong-setup mint the CI deploy token from this table';
  const rows = deployTokenRows();
  assert.ok(rows.length > 0, `the CI deploy token table has no rows — ${surface}`);
  for (const row of rows) assert.match(row.id, /^`[0-9a-f]{32}`$/, `${row.name} needs a backticked id — ${surface}`);
  const always = rows.filter(row => row.when === 'always').map(row => row.name).sort();
  assert.deepEqual(always, [...DEPLOY_TOKEN_ALWAYS].sort(), surface);
  for (const name of ['Workers R2 Storage Write', 'Workers Routes Write']) {
    const row = rows.find(r => r.name === name);
    assert.ok(row, `the CI deploy token table needs a conditional ${name} row — ${surface}`);
    assert.notEqual(row.when, 'always', `${name} is granted only when the config needs it — ${surface}`);
  }
  for (const row of rows) {
    assert.doesNotMatch(row.name, /API Tokens|Access|Zero Trust|User Details/,
      `the deploy token must never mint tokens or touch Access (${row.name}) — ${surface}`);
  }
});

test('setup creates the repository and origin before its first gh secret set', () => {
  const surface = 'a new folder has no GitHub repository until setup makes one, and gh secret set needs it';
  const runbook = read(`${setup}/references/cloudflare.md`);
  const at = needle => {
    const index = runbook.indexOf(needle);
    assert.ok(index >= 0, `${setup}/references/cloudflare.md must run \`${needle}\` — ${surface}`);
    return index;
  };
  const secret = at('gh secret set');
  assert.ok(at('gh auth status') < at('api.cloudflare.com'), `gh auth status must come before the first Cloudflare call — ${surface}`);
  assert.ok(at('git init') < secret, `git init must come before the first gh secret set — ${surface}`);
  assert.ok(at('gh repo create') < secret, `gh repo create must come before the first gh secret set — ${surface}`);
  assert.match(runbook.slice(at('gh repo create'), secret), /^gh repo create .*--private --source \. --remote origin$/m, surface);
});
