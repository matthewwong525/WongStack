import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const helper = join(repo, '.agents/skills/wong-sync/scripts/merge-check.mjs');

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) assert.fail(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const manifest = {
  core: { files: ['wiki/page.md'], blocks: [{ file: 'CLAUDE.md', markers: ['WONG-STACK:BEGIN', 'WONG-STACK:END'] }] },
};
const basePage = '# Page\n\nIntro.\n\n## Old section\n\nOld text.\n';
const latestPage = '# Page\n\nIntro.\n\n## New section\n\nNew text, added upstream.\n\n## Old section\n\nOld text.\n';
const baseRules = 'head\n<!-- WONG-STACK:BEGIN -->\n- rule one\n<!-- WONG-STACK:END -->\nfoot\n';
const latestRules = 'head\nupstream prose outside the block\n<!-- WONG-STACK:BEGIN -->\n- rule one\n- rule two\n<!-- WONG-STACK:END -->\nfoot\n';

// A source with a base and a latest commit, and a target whose two units are locally adapted.
function fixture(t, { page, rules, inventoryAtBase = true }) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-merge-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const target = join(root, 'target');
  mkdirSync(source);
  mkdirSync(target);
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.email', 'fixture@example.test');
  git(source, 'config', 'user.name', 'Fixture');
  if (inventoryAtBase) write(source, '.agents/skills/wong-sync/references/payload-files.json', JSON.stringify(manifest));
  write(source, 'wiki/page.md', basePage);
  write(source, 'CLAUDE.md', baseRules);
  git(source, 'add', '.');
  git(source, 'commit', '-m', 'base');
  const base = git(source, 'rev-parse', 'HEAD');
  write(source, '.agents/skills/wong-sync/references/payload-files.json', JSON.stringify(manifest));
  write(source, 'wiki/page.md', latestPage);
  write(source, 'CLAUDE.md', latestRules);
  git(source, 'add', '.');
  git(source, 'commit', '-m', 'latest');

  write(target, '.claude/.wong-stack.json', JSON.stringify({ version: '1.0.0', commit: base }));
  write(target, 'wiki/page.md', page);
  write(target, 'CLAUDE.md', rules);
  const run = () => {
    const result = spawnSync(process.execPath, [helper, '--target', target, '--source', source, '--from', base], { encoding: 'utf8' });
    return { status: result.status, report: JSON.parse(result.stdout) };
  };
  return { run };
}

// Local edits to the intro and rule one, with every upstream addition taken.
const mergedPage = '# Page\n\nIntro, in our own words.\n\n## New section\n\nNew text, added upstream.\n\n## Old section\n\nOld text.\n';
const mergedRules = 'our head\n<!-- WONG-STACK:BEGIN -->\n- rule one, our way\n- rule two\n<!-- WONG-STACK:END -->\n';

test('an adapted file that kept every upstream addition exits 0', t => {
  const { status, report } = fixture(t, { page: mergedPage, rules: mergedRules }).run();
  assert.equal(status, 0);
  assert.deepEqual(report, { schemaVersion: 1, status: 'clean', checked: 2, files: [] });
});

test('an adapted file missing an added section exits 1 and names the file, lines, and first line', t => {
  const dropped = mergedPage.replace('## New section\n\nNew text, added upstream.\n\n', '');
  const { status, report } = fixture(t, { page: dropped, rules: mergedRules }).run();
  assert.equal(status, 1);
  assert.equal(report.status, 'missing');
  assert.deepEqual(report.files, [{
    targetPath: 'wiki/page.md',
    sourcePath: 'wiki/page.md',
    missing: [{ sourceLines: '5-8', count: 2, first: '## New section' }],
  }]);
});

test('a block unit checks only inside its markers', t => {
  const { status, report } = fixture(t, { page: mergedPage, rules: mergedRules.replace('- rule two\n', '') }).run();
  assert.equal(status, 1);
  assert.deepEqual(report.files.map(file => [file.targetPath, file.missing.map(row => row.first)]), [['CLAUDE.md', ['- rule two']]]);
});

test('an install from before the inventory is skipped', t => {
  const { status, report } = fixture(t, { page: 'anything\n', rules: 'anything\n', inventoryAtBase: false }).run();
  assert.equal(status, 0);
  assert.equal(report.skipped, 'no-baseline');
  assert.deepEqual(report.files, []);
});
