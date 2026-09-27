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
  const globs = ['wiki/development/**', 'mini-apps/router*', '.claude/**'];
  const missing = uncovered(['wiki/development/a/b.md', 'mini-apps/router.d.mts', 'mini-apps/other.mjs', 'wiki/new.md', '.claude/skills/x/SKILL.md'], globs);
  assert.deepEqual(missing, ['mini-apps/other.mjs', 'wiki/new.md']);
  assert.match(message(missing), /miss mini-apps\/other\.mjs, wiki\/new\.md/);
});
