import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The meta-only release rule must load for every file a target receives. Rule frontmatter
// can not be generated, so this checks its static `paths:` globs against payload-files.json.
const read = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

const ruleGlobs = text => {
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)[1];
  return [...frontmatter.matchAll(/^\s+- "([^"]+)"$/gm)].map(match => match[1]);
};

// `**` spans folders, `*` stays inside one. Not path.matchesGlob: Node 22 still flags it experimental.
const toRegExp = glob =>
  new RegExp(`^${glob.split(/(\*\*|\*)/).map(part => (part === '**' ? '.*' : part === '*' ? '[^/]*' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`);

// Every path payload-files.json installs, in one sample file per folder, plus VERSION and CHANGELOG.md.
const payloadPaths = manifest => [
  ...Object.entries(manifest)
    .filter(([name, group]) => name !== 'seededBySetup' && typeof group === 'object' && !Array.isArray(group))
    .flatMap(([, group]) => [
      ...(group.files ?? []),
      ...(group.dirs ?? []).map(dir => `${dir}/x`),
      ...(group.skillDirs ?? []).map(name => `.claude/skills/${name}/SKILL.md`),
      ...(group.blocks ?? []).map(block => block.file),
    ]),
  'VERSION',
  'CHANGELOG.md',
];

const uncovered = (paths, globs) => {
  const patterns = globs.map(toRegExp);
  return paths.filter(path => !patterns.some(pattern => pattern.test(path)));
};

const message = missing => `the release rule's paths: miss ${missing.join(', ')}; add a glob to .agents/rules/payload.md`;

test('the release rule loads for every shipped path', () => {
  const globs = ruleGlobs(read('.agents/rules/payload.md'));
  const paths = payloadPaths(JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json')));
  assert.ok(paths.length > 40, `too few payload paths read: ${paths.length}`);
  const missing = uncovered(paths, globs);
  assert.deepEqual(missing, [], message(missing));
});

test('a path outside the rule is named in the failure', () => {
  const globs = ['wiki/development/**', 'server/router*', '.claude/**'];
  const missing = uncovered(['wiki/development/a/b.md', 'server/router.d.mts', 'server/other.mjs', 'wiki/new.md', '.claude/skills/x/SKILL.md'], globs);
  assert.deepEqual(missing, ['server/other.mjs', 'wiki/new.md']);
  assert.match(message(missing), /miss server\/other\.mjs, wiki\/new\.md/);
});

test('shipped workflows and their local action receive every static file dependency', () => {
  const manifest = JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json'));
  const groups = ['core', 'ui', 'pack', 'scaffold'].map(name => manifest[name]);
  const files = new Set(groups.flatMap(group => group.files ?? []));
  const dirs = groups.flatMap(group => group.dirs ?? []);
  const excluded = groups.flatMap(group => group.exclude ?? []);
  const shipped = path => !excluded.some(item => path === item || path.startsWith(`${item}/`)) &&
    (files.has(path) || dirs.some(dir => path.startsWith(`${dir}/`)));
  const workflows = [...files].filter(path => path.startsWith('.github/workflows/'));
  assert.deepEqual(workflows.sort(), ['.github/workflows/deploy.yml', '.github/workflows/test.yml']);
  const checked = new Set();
  const check = path => {
    assert.ok(shipped(path), `${path} is referenced by installed CI but absent from the full payload`);
    if (checked.has(path)) return;
    checked.add(path);
    const text = read(path).replace(/^\s*#.*$/gm, '');
    for (const match of text.matchAll(/node-version-file:\s*([^\s#]+)/g)) check(match[1]);
    for (const match of text.matchAll(/uses:\s*\.\/([^\s#]+)/g)) check(`${match[1]}/action.yml`);
    for (const match of text.matchAll(/(?:node|bash)\s+["']?(?:\$GITHUB_WORKSPACE\/)?((?:scripts|\.github)\/[\w./-]+\.(?:mjs|sh))/g)) check(match[1]);
    // The check entry point names each script it runs as a path from the repo root.
    for (const match of text.matchAll(/const [A-Z]+ = '((?:scripts|\.github)\/[\w./-]+\.(?:mjs|sh))';/g)) check(match[1]);
    // A script's own imports from its folder ship with it.
    for (const match of text.matchAll(/from\s+['"]\.\/([\w.-]+\.mjs)['"]/g)) check(`${path.slice(0, path.lastIndexOf('/'))}/${match[1]}`);
  };
  workflows.forEach(check);
  assert.ok(checked.has('.nvmrc'));
  assert.ok(checked.has('.github/scripts/app-untouched.sh'));
  assert.ok(checked.has('.github/scripts/test-file.mjs'));
  assert.ok(checked.has('.github/scripts/checks.mjs'));
  assert.ok(checked.has('scripts/cf-secrets.mjs'));
});
