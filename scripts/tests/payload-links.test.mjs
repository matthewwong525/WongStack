import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const checker = resolve(dirname(fileURLToPath(import.meta.url)), '../check-payload-links.mjs');

const manifest = {
  core: { skillDirs: ['save'], files: ['wiki/shipped.md'] },
  seededBySetup: { files: [] },
};

// A repo with the source layout: a real .agents/ folder, .claude and .codex
// links to it, and CLAUDE.md linked to AGENTS.md. `pages` maps a path to its text.
function fixture(t, pages, { commit = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'payload-links-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write('.agents/skills/wong-sync/references/payload-files.json', JSON.stringify(manifest));
  write('.agents/skills/save/SKILL.md', '# save\n');
  write('AGENTS.md', '# Agents\n\n<!-- WONG-STACK:BEGIN -->\n<!-- WONG-STACK:END -->\n');
  write('wiki/shipped.md', '# Shipped\n');
  for (const [path, text] of Object.entries(pages)) write(path, text);
  symlinkSync('.agents', join(root, '.claude'));
  symlinkSync('.agents', join(root, '.codex'));
  symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  if (commit) {
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'fixture');
  }
  return root;
}

const check = root => spawnSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' });

test('a link through .claude/ fails and names the real path', t => {
  const root = fixture(t, { 'wiki/page.md': '# Page\n\nRead [save](../.claude/skills/save/SKILL.md#step-1).\n' });
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /wiki\/page\.md:3 -> \.\.\/\.claude\/skills\/save\/SKILL\.md#step-1/);
  assert.match(result.stderr, /real path: \.agents\/skills\/save\/SKILL\.md/);
  assert.match(result.stderr, /link: \.\.\/\.agents\/skills\/save\/SKILL\.md#step-1/);
});

test('a link through .codex/ and a GitHub URL through .claude/ fail', t => {
  const root = fixture(t, {
    'README.md': '[a](.codex/skills/save/SKILL.md)\n\n<https://github.com/someone/WongStack/blob/main/.claude/skills/save/SKILL.md>\n',
  });
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /README\.md:1 -> \.codex\/skills\/save\/SKILL\.md/);
  assert.match(result.stderr, /link: https:\/\/github\.com\/someone\/WongStack\/blob\/main\/\.agents\/skills\/save\/SKILL\.md/);
});

test('commands and code in backticks keep .claude/ and pass', t => {
  const root = fixture(t, {
    'wiki/page.md': [
      '# Page',
      '',
      'Run `node .claude/skills/memory/scripts/memory.mjs search x`, or cite `[save](../.claude/skills/save/SKILL.md)`.',
      '',
      '```md',
      '[save](../.claude/skills/save/SKILL.md)',
      '```',
      '',
    ].join('\n'),
  });
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});

test('an .agents/ link passes and resolves against the logical .claude/ inventory', t => {
  const root = fixture(t, { 'wiki/shipped.md': '# Shipped\n\n[save](../.agents/skills/save/SKILL.md)\n' });
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});

test('an .agents/ link from a shipped page to a file no target receives is dead', t => {
  const root = fixture(t, {
    '.agents/skills/other/SKILL.md': '# other\n',
    'wiki/shipped.md': '# Shipped\n\n[other](../.agents/skills/other/SKILL.md)\n',
  });
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /dead link.*\n\s+wiki\/shipped\.md -> \.\.\/\.agents\/skills\/other\/SKILL\.md/);
});

test('CLAUDE.md: a shipped page may link it, a repo page must link AGENTS.md', t => {
  const root = fixture(t, {
    'wiki/shipped.md': '# Shipped\n\n[rules](../CLAUDE.md#rules)\n',
    'wiki/local.md': '# Local\n\n[rules](../CLAUDE.md#rules)\n',
  });
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /wiki\/local\.md:3 -> \.\.\/CLAUDE\.md#rules\n\s+real path: AGENTS\.md\s+link: \.\.\/AGENTS\.md#rules/);
  assert.doesNotMatch(result.stderr, /wiki\/shipped\.md/);
});

test('the git tree names the link when the working tree holds it as a text file', t => {
  const root = fixture(t, { 'wiki/page.md': '# Page\n\n[save](../.claude/skills/save/SKILL.md)\n' }, { commit: true });
  // What a Windows checkout without core.symlinks writes.
  rmSync(join(root, '.claude'));
  writeFileSync(join(root, '.claude'), '.agents');
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /real path: \.agents\/skills\/save\/SKILL\.md/);
});

test('only the newest CHANGELOG entry is checked', t => {
  const root = fixture(t, {
    'CHANGELOG.md': '# Changelog\n\n## 2.0.0\n\n- [ok](.agents/skills/save/SKILL.md)\n\n## 1.0.0\n\n- [old](.claude/skills/save/SKILL.md)\n',
  });
  assert.equal(check(root).status, 0);
  writeFileSync(join(root, 'CHANGELOG.md'), '# Changelog\n\n## 2.0.0\n\n- [new](.claude/skills/save/SKILL.md)\n');
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /CHANGELOG\.md:5 -> \.claude\/skills\/save\/SKILL\.md/);
});
