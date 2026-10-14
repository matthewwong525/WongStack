// The install program, .agents/skills/wong-setup/scripts/install.mjs, run from this checkout into temporary folders.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import * as fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { INVENTORY, SEEDS, install, targetFiles } from '../../.agents/skills/wong-setup/scripts/install.mjs';
import { checkWiki } from '../../.agents/skills/memory/scripts/lib/links.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(repo, '.agents/skills/wong-setup/scripts/install.mjs');
const REPO = 'https://github.com/example/WongStack';
const manifest = JSON.parse(readFileSync(join(repo, INVENTORY), 'utf8'));
const noOpenspec = () => {};

function folder(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return join(root, 'project');
}

test('an install into an empty folder holds the payload, the links, the hubs, the ignore rules and the record', (t) => {
  const target = folder(t);
  execFileSync('git', ['init', '-q', '-b', 'main', target]);
  writeFileSync(join(target, '.env'), 'CLOUDFLARE_API_TOKEN=\n');
  const report = install({ source: repo, target, repo: REPO, today: '2026-10-14', openspec: noOpenspec });

  assert.equal(report.status, 'installed');
  for (const name of ['.claude', '.codex', 'CLAUDE.md']) assert.ok(lstatSync(join(target, name)).isSymbolicLink(), name);
  assert.equal(readlinkSync(join(target, '.claude')), '.agents');
  assert.equal(readlinkSync(join(target, 'CLAUDE.md')), 'AGENTS.md');
  assert.ok(lstatSync(join(target, '.agents')).isDirectory());
  assert.ok(existsSync(join(target, '.claude/skills/save/SKILL.md')), 'skills read through the link');
  assert.ok(existsSync(join(target, '.env.example')));
  assert.equal(readFileSync(join(target, '.env'), 'utf8'), 'CLOUDFLARE_API_TOKEN=\n', 'setup\'s own .env is kept');
  assert.ok(!existsSync(join(target, 'app/wrangler.jsonc')), 'the source config stays behind');
  assert.ok(!existsSync(join(target, '.agents/skills/wong-setup')), 'setup itself stays behind');

  const rules = readFileSync(join(target, 'CLAUDE.md'), 'utf8');
  assert.match(rules, /^# AGENTS\.md\n/);
  assert.match(rules, /<!-- WONG-STACK:BEGIN[\s\S]*WONG-STACK:END -->\n$/);
  assert.doesNotMatch(rules, /meta-repo/, 'only the block travels');

  const ignore = readFileSync(join(target, '.gitignore'), 'utf8');
  for (const rule of ['.env*', '!.env.example', '.dev.vars*', '!.dev.vars.example', '.scratch/']) assert.ok(ignore.split('\n').includes(rule), rule);
  assert.ok(Array.isArray(JSON.parse(readFileSync(join(target, 'paseo.json'), 'utf8')).worktree.setup));

  const record = JSON.parse(readFileSync(join(target, '.claude/.wong-stack.json'), 'utf8'));
  assert.equal(record.version, readFileSync(join(repo, 'VERSION'), 'utf8').trim());
  assert.equal(record.commit, execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  assert.deepEqual(record.upstream, { repo: REPO, clone: repo });
  assert.deepEqual(record.components.skills, manifest.core.skillDirs);
  assert.equal(record.installedAt, '2026-10-14');
  assert.ok(readFileSync(join(target, 'openspec/config.yaml'), 'utf8').startsWith('schema: spec-driven\n'));

  // Each seed hub links every shipped page under it, and the installed wiki passes its own check.
  assert.deepEqual(checkWiki(target), []);
});

test('the program writes every path the manifest says setup seeds, from a template of its own', () => {
  assert.deepEqual(Object.keys(SEEDS).sort(), [...manifest.seededBySetup.files].sort());
  for (const template of [...Object.values(SEEDS), 'openspec-config.yaml']) {
    assert.ok(existsSync(join(repo, '.agents/skills/wong-setup/references/seed', template)), template);
  }
  assert.deepEqual(targetFiles(Object.keys(SEEDS), manifest), [], 'a seeded file is not payload');
});

test('a folder with files, or with saved history, is refused and left as it was', (t) => {
  const target = folder(t);
  mkdirSync(target);
  writeFileSync(join(target, 'notes.txt'), 'mine\n');
  assert.throws(() => install({ source: repo, target, repo: REPO, openspec: noOpenspec }), /is not empty \(notes\.txt\)/);
  assert.deepEqual(readdirSync(target), ['notes.txt']);

  rmSync(join(target, 'notes.txt'));
  execFileSync('git', ['init', '-q', target]);
  execFileSync('git', ['-C', target, '-c', 'user.name=A', '-c', 'user.email=a@example.com', 'commit', '-q', '--allow-empty', '-m', 'first']);
  assert.throws(() => install({ source: repo, target, repo: REPO, openspec: noOpenspec }), /already has saved history/);
  assert.deepEqual(readdirSync(target), ['.git']);
});

test('it never writes over a file, and a stop removes everything it wrote', (t) => {
  // A source whose payload also ships a seeded hub: the hub would land on a copied file.
  const source = folder(t);
  mkdirSync(join(source, '.agents/skills/wong-sync/references'), { recursive: true });
  mkdirSync(join(source, 'wiki'));
  const inventory = { core: { files: ['paseo.json', 'wiki/README.md'] } };
  const files = { [INVENTORY]: JSON.stringify(inventory), 'paseo.json': '{}', 'wiki/README.md': '# Theirs\n', '.env.example': '', VERSION: '1.0.0\n',
    'AGENTS.md': '# A\n\n<!-- WONG-STACK:BEGIN -->\nrules\n<!-- WONG-STACK:END -->\n' };
  for (const [path, text] of Object.entries(files)) writeFileSync(join(source, path), text);
  execFileSync('git', ['init', '-q', source]);
  execFileSync('git', ['-C', source, 'add', '-A']);
  execFileSync('git', ['-C', source, '-c', 'user.name=A', '-c', 'user.email=a@example.com', 'commit', '-q', '-m', 'source']);

  const target = `${source}-target`;
  t.after(() => rmSync(target, { recursive: true, force: true }));
  assert.throws(() => install({ source, target, repo: REPO, openspec: noOpenspec }), /EEXIST/);
  assert.deepEqual(readdirSync(target), []);
  // Without the clash the same source installs.
  inventory.core.files.pop();
  writeFileSync(join(source, INVENTORY), JSON.stringify(inventory));
  assert.equal(install({ source, target, repo: REPO, openspec: noOpenspec }).status, 'installed');
  inventory.core.files.push('wiki/missing.md');
  writeFileSync(join(source, INVENTORY), JSON.stringify(inventory));
  assert.throws(() => install({ source, target: `${target}-2`, repo: REPO, openspec: noOpenspec }), /missing listed files: wiki\/missing\.md/);
  rmSync(`${target}-2`, { recursive: true, force: true });
});

test('a refused link stops before any file is copied, with the fix', (t) => {
  const target = folder(t);
  const real = fs.default.symlinkSync;
  fs.default.symlinkSync = () => { throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' }); };
  syncBuiltinESMExports();
  try {
    assert.throws(() => install({ source: repo, target, repo: REPO, openspec: noOpenspec }), /could not make the \.claude link \(EPERM\).*Developer Mode/);
  } finally {
    fs.default.symlinkSync = real;
    syncBuiltinESMExports();
  }
  assert.deepEqual(readdirSync(target), []);
});

test('the command prints one JSON report, and a stop exits 1 with the cause', (t) => {
  const target = folder(t);
  mkdirSync(target);
  writeFileSync(join(target, 'x'), '');
  const run = spawnSync(process.execPath, [SCRIPT, '--source', repo, '--target', target, '--repo', REPO], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(JSON.parse(run.stdout).cause, /is not empty/);
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--target', target], { encoding: 'utf8' }).status, 2);
});
