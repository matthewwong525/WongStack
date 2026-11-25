import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { checkArchive, filesOf, listArchived, migrate, pack, packBytes, parsePacked, readArchived, resolveArchivePath, unpack }
  from '../../.agents/loop/scripts/archive.mjs';

const script = new URL('../../.agents/loop/scripts/archive.mjs', import.meta.url).pathname;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x00]);
const FILES = {
  'proposal.md': '# Pack it\n\n<!-- end proposal.md -->\n<!-- file tasks.md utf8 3 -->\n```\nunclosed fence\n',
  'design.md': '',
  'tasks.md': '- [x] 1.1 done',
  'specs/b-cap/spec.md': '## ADDED Requirements\n',
  'specs/a-cap/spec.md': '## ADDED Requirements\n~~~~~\n',
  'review.html': '<html>\n~~~ ~~~~~~ tilde runs\n<!-- end review.html -->\n</html>\n',
  '.openspec.yaml': 'schema: spec-driven\n',
  'pictures/a.png': PNG,
  'evidence/.gitkeep': '',
  'notes/crlf.txt': 'one\r\ntwo\r\n',
};

function repo(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-archive-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function change(root, folder, files = FILES) {
  const dir = join(root, 'openspec/changes/archive', folder);
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
}
const read = dir => Object.fromEntries(readdirSync(dir, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile())
  .map(entry => [join(entry.parentPath, entry.name).slice(dir.length + 1), readFileSync(join(entry.parentPath, entry.name))]));

test('a packed change gives back every file byte for byte, in plan order', t => {
  const root = repo(t);
  const dir = change(root, '2026-11-01-pack-it');
  const before = read(dir);
  const file = pack(dir);
  assert.equal(existsSync(dir), false);
  assert.equal(file, `${dir}.md`);
  const out = join(root, 'out');
  unpack(file, out);
  assert.deepEqual(read(out), before);
  const order = parsePacked(readFileSync(file)).files.map(each => each.path);
  assert.deepEqual(order.slice(0, 5), ['proposal.md', 'design.md', 'tasks.md', 'specs/a-cap/spec.md', 'specs/b-cap/spec.md']);
  const text = readFileSync(file, 'utf8');
  assert.match(text, /^<!-- openspec-archive v1 2026-11-01-pack-it -->\n<!-- file proposal.md utf8 \d+ -->\n# Pack it/);
  assert.match(text, /<!-- file review\.html utf8 \d+ fence=~~~~~~~ -->\n~~~~~~~html\n/);
  assert.match(text, /<!-- file pictures\/a\.png base64 16 -->\n/);
  assert.match(text, /<!-- file notes\/crlf\.txt base64 /);
});

test('a byte count that misses its end line fails, naming the file', t => {
  const root = repo(t);
  const file = pack(change(root, '2026-11-01-pack-it'));
  writeFileSync(file, readFileSync(file, 'utf8').replace('<!-- file tasks.md utf8 14 -->', '<!-- file tasks.md utf8 13 -->'));
  assert.throws(() => parsePacked(readFileSync(file), file), /tasks\.md: the byte count/);
  assert.deepEqual(checkArchive(root).map(each => each.file), ['openspec/changes/archive/2026-11-01-pack-it.md']);
  const run = spawnSync(process.execPath, [script, 'check', '--root', root], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /corrupt=openspec\/changes\/archive\/2026-11-01-pack-it\.md/);
});

test('a reader skips the one corrupt packed file and reads the rest', t => {
  const root = repo(t);
  const bad = pack(change(root, '2026-11-01-bad'));
  pack(change(root, '2026-11-02-good'));
  writeFileSync(bad, readFileSync(bad, 'utf8').replace('<!-- file tasks.md utf8 14 -->', '<!-- file tasks.md utf8 13 -->'));
  assert.equal(listArchived(root).length, 2);
  assert.equal(readArchived(root, '2026-11-01-bad', 'proposal.md'), null);
  assert.equal(filesOf(root, '2026-11-01-bad'), null);
  assert.equal(resolveArchivePath(root, 'openspec/changes/archive/2026-11-01-bad/tasks.md'), null);
  assert.equal(readArchived(root, '2026-11-02-good', 'tasks.md'), '- [x] 1.1 done');
  assert.equal(checkArchive(root).length, 1);
});

test('reading one change opens its own path, never a listing of the whole archive', t => {
  const root = repo(t);
  for (let day = 1; day <= 20; day++) pack(change(root, `2026-11-${String(day).padStart(2, '0')}-pack-it`));
  change(root, '2026-12-01-folder');
  const readdir = fs.readdirSync;
  let listings = 0;
  fs.readdirSync = (...args) => { if (String(args[0]).endsWith('archive')) listings++; return readdir(...args); };
  syncBuiltinESMExports();
  try {
    for (let round = 0; round < 50; round++) {
      for (const folder of ['2026-11-05-pack-it', '2026-12-01-folder']) {
        assert.equal(readArchived(root, folder, 'tasks.md'), '- [x] 1.1 done');
        assert.equal(filesOf(root, folder).length, Object.keys(FILES).length);
      }
    }
    for (const folder of ['../archive', '2026-11-05-pack-it/..', '', 'missing']) assert.equal(readArchived(root, folder, 'tasks.md'), null);
  } finally {
    fs.readdirSync = readdir;
    syncBuiltinESMExports();
  }
  assert.equal(listings, 0);
});

test('migrate keeps a folder whose round trip differs, and packs the rest', t => {
  const root = repo(t);
  change(root, '2026-11-01-good');
  change(root, '2026-11-02-bad');
  const lossy = dir => (dir.endsWith('bad') ? packBytes(dir).subarray(0, 60) : packBytes(dir));
  const corrupt = dir => Buffer.from(packBytes(dir).toString('latin1').replace('# Pack it', '# Pack!it'), 'latin1');
  for (const encode of [lossy, dir => (dir.endsWith('bad') ? corrupt(dir) : packBytes(dir))]) {
    rmSync(join(root, 'openspec'), { recursive: true, force: true });
    change(root, '2026-11-01-good');
    change(root, '2026-11-02-bad');
    const { packed, kept } = migrate(root, { encode });
    assert.deepEqual(packed, ['openspec/changes/archive/2026-11-01-good.md']);
    assert.deepEqual(kept.map(each => each.folder), ['2026-11-02-bad']);
    assert.equal(existsSync(join(root, 'openspec/changes/archive/2026-11-02-bad/proposal.md')), true);
    assert.equal(existsSync(join(root, 'openspec/changes/archive/2026-11-02-bad.md')), false);
  }
  const run = spawnSync(process.execPath, [script, 'migrate', '--root', root], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /packed=1/);
});

test('both forms list together, newest first, and read by their old paths', t => {
  const root = repo(t);
  pack(change(root, '2026-11-01-packed'));
  change(root, '2026-11-02-folder');
  writeFileSync(join(root, 'openspec/changes/archive/.gitkeep'), '');
  assert.deepEqual(listArchived(root).map(({ folder, name, packed }) => [folder, name, packed]),
    [['2026-11-02-folder', 'folder', false], ['2026-11-01-packed', 'packed', true]]);
  for (const folder of ['2026-11-01-packed', '2026-11-02-folder']) {
    assert.equal(readArchived(root, folder, 'tasks.md'), '- [x] 1.1 done');
    assert.equal(readArchived(root, folder, 'missing.md'), null);
    assert.equal(filesOf(root, folder).length, Object.keys(FILES).length);
    assert.equal(resolveArchivePath(root, `openspec/changes/archive/${folder}/specs/a-cap/spec.md`).text, FILES['specs/a-cap/spec.md']);
  }
  assert.equal(filesOf(root, '2026-11-03-none'), null);
  assert.equal(resolveArchivePath(root, 'wiki/README.md'), null);
});

test('unpack writes a named change to the scratch folder', t => {
  const root = repo(t);
  pack(change(root, '2026-11-01-pack-it'));
  const run = spawnSync(process.execPath, [script, 'unpack', 'pack-it', '--root', root], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), `folder=${join(root, '.scratch/archive/2026-11-01-pack-it')}`);
  assert.deepEqual(readFileSync(join(root, '.scratch/archive/2026-11-01-pack-it/pictures/a.png')), PNG);
});

test('unpack --edit turns a packed change back into its archive folder', t => {
  const root = repo(t);
  const dir = change(root, '2026-11-01-pack-it');
  const before = read(dir);
  pack(dir);
  const run = spawnSync(process.execPath, [script, 'unpack', '2026-11-01-pack-it', '--edit', '--root', root], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), `folder=${dir}`);
  assert.deepEqual(read(dir), before);
  assert.equal(existsSync(`${dir}.md`), false);
  const missing = spawnSync(process.execPath, [script, 'unpack', 'none', '--root', root], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no archived change named none/);
});
