// knowledge-move.mjs on made-up installs: what moves and stays, the rewrites and hand steps, a held move, the move
// itself, and recopy's three cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { move, plan, READER_APP, recopy } from '../../.agents/skills/wong-sync/scripts/knowledge-move.mjs';
import { checkWiki } from '../../.agents/memory/lib/links.mjs';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/wong-sync/scripts/knowledge-move.mjs');

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function write(root, files) {
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
}

function repo(path, files) {
  mkdirSync(path, { recursive: true });
  git(path, 'init', '-q', '-b', 'main');
  git(path, 'config', 'user.email', 'fixture@example.test');
  git(path, 'config', 'user.name', 'Fixture');
  write(path, files);
  git(path, 'add', '-A');
  git(path, 'commit', '-q', '-m', 'start');
  return git(path, 'rev-parse', 'HEAD');
}

const MANIFEST = {
  core: { files: ['wiki/voice.md', 'wiki/development/the-change-loop.md', '.claude/skills/memory/SKILL.md'] },
  pack: { dirs: ['wiki/stack'] },
  seededBySetup: { files: ['wiki/README.md', 'wiki/development/README.md'] },
};
const page = (title, body = '') => `# ${title}\n\nThe ${title.toLowerCase()} page.\n${body}`;

// A source with the payload list, and an install of it holding the given files; `reader` ships the live reader.
function install(t, files, { components = {}, reader = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-move-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const commit = repo(source, {
    '.agents/skills/wong-sync/references/payload-files.json': JSON.stringify(MANIFEST),
    '.agents/skills/memory/SKILL.md': 'Pages live in wiki/ops/cash.md.\n',
    'wiki/voice.md': page('Voice'),
    'wiki/development/the-change-loop.md': page('Loop'),
    'wiki/stack/README.md': page('Stack', '- [Hosting](hosting.md)\n'),
    'wiki/stack/hosting.md': page('Hosting'),
    'VERSION': '1.0.0\n',
  });
  if (reader) {
    write(source, { [READER_APP]: 'export const App = () => null;\n' });
    git(source, 'add', '-A');
    git(source, 'commit', '-q', '-m', 'reader');
  }
  const target = join(root, 'target');
  repo(target, {
    '.agents/.wong-stack.json': JSON.stringify({ version: '1.0.0', commit, components: { skills: ['memory'], ...components } }),
    ...files,
  });
  return { target, source, options: { target, source, record: '.agents/.wong-stack.json' } };
}

// An install with its wiki in wiki/: own pages beside shipped ones, readers, built paths, and an archive.
const WIKI_INSTALL = {
  'wiki/README.md': page('Wiki', '- [Voice](voice.md)\n- [Stack](stack/README.md)\n- [Ops](ops/README.md)\n- [Prompts](prompts/script.md)\n- [Personas](personas/ana.md)\n- [Profile](profile.md)\n'),
  'wiki/voice.md': page('Voice'),
  'wiki/stack/README.md': page('Stack', '- [Hosting](hosting.md)\n- [Our database](our-db.md)\n'),
  'wiki/stack/hosting.md': page('Hosting'),
  'wiki/stack/our-db.md': page('Our database', 'Up: [Stack](README.md). Code: [schema](../../app/schema.sql).\n'),
  'wiki/ops/README.md': page('Ops', '- [Cash](cash.md)\n![chart](chart.png)\n'),
  'wiki/ops/cash.md': page('Cash', 'Read [voice](../voice.md#voice) and [the code](../../app/src/x.ts).\n'),
  'wiki/ops/chart.png': 'png',
  'wiki/ops/data.csv': 'a,b\n',
  'wiki/prompts/script.md': page('Script'),
  'wiki/personas/ana.md': page('Ana'),
  'wiki/profile.md': page('Profile'),
  'app/src/x.ts': "import p from '../../wiki/prompts/script.md?raw';\n// See wiki/ops/cash.md for the rule.\nexport const doc = 'wiki/ops/cash.md';\n",
  'app/schema.sql': '-- schema\n',
  'scripts/seed.mjs': "const read = slug => readFileSync(`wiki/personas/${slug}.md`, 'utf8');\nconst ref = `wiki/ops/${name}.md`;\nconst dir = join(root, 'wiki', 'ops');\n",
  '.agents/daily/me.json': '{ "profile": "wiki/profile.md" }\n',
  '.agents/skills/own/SKILL.md': 'Read `wiki/ops/cash.md`, and [cash](../../../wiki/ops/cash.md).\nSee ~/OtherRepo/docs/ops/plan.md and https://github.com/acme/repo/blob/main/wiki/ops/cash.md.\n',
  '.agents/skills/memory/SKILL.md': 'Pages live in wiki/ops/cash.md.\n',
  'openspec/changes/archive/2026-01-01-old/proposal.md': 'We wrote wiki/ops/cash.md.\n',
  'CHANGELOG.md': '## 1.0.0 — Old\n\nwiki/ops/cash.md\n',
};

test('plan lists own pages, stays with their readers, rewrites, and hand steps, and writes nothing', t => {
  const f = install(t, WIKI_INSTALL);
  const before = git(f.target, 'status', '--porcelain');
  const report = plan(f.options);
  assert.equal(git(f.target, 'status', '--porcelain'), before);
  assert.equal(report.status, 'ready');
  assert.deepEqual(report.moves, {
    'wiki/ops/README.md': 'knowledge/ops/README.md',
    'wiki/ops/cash.md': 'knowledge/ops/cash.md',
    'wiki/ops/chart.png': 'knowledge/ops/chart.png',
    'wiki/stack/our-db.md': 'knowledge/stack/our-db.md',
  });
  assert.deepEqual(report.stays.map(({ path, reason, reader, place }) => [path, reason, reader, place]), [
    ['wiki/ops/data.csv', 'not-a-page', null, null],
    ['wiki/personas/ana.md', 'pattern', 'scripts/seed.mjs:1', 'scripts/ana.md'],
    ['wiki/profile.md', 'config', '.agents/daily/me.json:1', '.agents/daily/profile.md'],
    ['wiki/prompts/script.md', 'read', 'app/src/x.ts:1', 'app/src/script.md'],
  ]);
  assert.deepEqual(report.counts, { moves: { ops: 3, stack: 1 }, stays: { ops: 1, personas: 1, '.': 1, prompts: 1 } });
  const rewrites = report.rewrites.map(({ file, line, old, new: now }) => `${file}:${line} ${old} -> ${now}`);
  assert.deepEqual(rewrites, [
    '.agents/skills/own/SKILL.md:1 ../../../wiki/ops/cash.md -> ../../../knowledge/ops/cash.md',
    '.agents/skills/own/SKILL.md:1 wiki/ops/cash.md -> knowledge/ops/cash.md',
    'app/src/x.ts:2 wiki/ops/cash.md -> knowledge/ops/cash.md',
    'wiki/README.md:6 ops/README.md -> ../knowledge/ops/README.md',
    'wiki/ops/cash.md:4 ../voice.md#voice -> ../../wiki/voice.md#voice',
    'wiki/stack/README.md:5 our-db.md -> ../../knowledge/stack/our-db.md',
    'wiki/stack/our-db.md:4 README.md -> ../../wiki/stack/README.md',
  ], 'a back-link to code, a string in code, a shipped skill, the archive and the changelog are left as they are');
  assert.deepEqual(report.hand.map(({ file, line, reason }) => `${file}:${line} ${reason}`), [
    '.agents/skills/own/SKILL.md:2 a link to a hosting site',
    'app/src/x.ts:3 a path in code; code may read it on another line',
    'scripts/seed.mjs:2 a page path built from parts as the code runs',
    'scripts/seed.mjs:3 a page path built from parts as the code runs',
  ]);
  assert.deepEqual(report.outside.map(({ file, line }) => `${file}:${line}`), ['.agents/skills/own/SKILL.md:2']);
  assert.deepEqual([report.replacedReaders, report.held, report.readerShipped], [[], false, false]);
});

test('a comment the longer path pushes past the lint width is a hand step, and is still rewritten', t => {
  const comment = `// The cash rule is on wiki/ops/cash.md ${'.'.repeat(78)}`;
  assert.equal(comment.length, 118);
  const f = install(t, { ...WIKI_INSTALL, 'app/src/y.ts': `${comment}\nexport const y = 1;\n` });
  const report = plan(f.options);
  assert.deepEqual(report.hand.filter(({ file }) => file === 'app/src/y.ts').map(({ line, reason }) => `${line} ${reason}`),
    ['1 the new path makes this comment longer than 120 characters']);
  assert.ok(report.rewrites.some(({ file, line }) => file === 'app/src/y.ts' && line === 1));
});

test('a path in a comment is prose: a whole-wiki pattern there holds nothing, and a quoted page there is rewritten', t => {
  const notes = '// import.meta.glob over wiki/**/*.md once served the docs.\n/** The rule in `wiki/ops/cash.md`. */\nexport {};\n';
  const f = install(t, { ...WIKI_INSTALL, 'app/src/notes.ts': notes });
  const report = plan(f.options);
  assert.deepEqual([report.replacedReaders, report.held, report.status], [[], false, 'ready']);
  assert.deepEqual(report.hand.filter(({ file }) => file === 'app/src/notes.ts').map(({ line, reason }) => `${line} ${reason}`),
    ['1 a pattern over the whole wiki']);
  assert.deepEqual(report.rewrites.filter(({ file }) => file === 'app/src/notes.ts').map(({ line, new: now }) => `${line} ${now}`),
    ['2 knowledge/ops/cash.md']);
});

test('move copies, relinks, lists the moves, and leaves both wikis whole', t => {
  const f = install(t, WIKI_INSTALL);
  mkdirSync(join(f.target, 'knowledge'));
  const result = move(f.options);
  assert.equal(result.status, 'moved');
  assert.equal(result.moved, 4);
  assert.deepEqual(result.save, ['knowledge/README.md', 'knowledge/ops/README.md', 'knowledge/ops/cash.md', 'knowledge/ops/chart.png', 'knowledge/stack/our-db.md']);
  assert.ok(!existsSync(join(f.target, 'wiki/ops/cash.md')) && !existsSync(join(f.target, 'wiki/stack/our-db.md')));
  assert.ok(existsSync(join(f.target, 'wiki/ops/data.csv')) && existsSync(join(f.target, 'wiki/profile.md')), 'what stays, stays');
  const read = path => readFileSync(join(f.target, path), 'utf8');
  assert.match(read('knowledge/ops/cash.md'), /\[voice\]\(\.\.\/\.\.\/wiki\/voice\.md#voice\) and \[the code\]\(\.\.\/\.\.\/app\/src\/x\.ts\)/);
  assert.match(read('knowledge/stack/our-db.md'), /\[schema\]\(\.\.\/\.\.\/app\/schema\.sql\)/);
  assert.match(read('knowledge/README.md'), /- \[Ops\]\(ops\/README\.md\)\n- \[Our database\]\(stack\/our-db\.md\)\n/);
  assert.equal(read('app/src/x.ts'), "import p from '../../wiki/prompts/script.md?raw';\n// See knowledge/ops/cash.md for the rule.\nexport const doc = 'wiki/ops/cash.md';\n");
  assert.equal(read('scripts/seed.mjs'), WIKI_INSTALL['scripts/seed.mjs'], 'hand items are never touched');
  assert.equal(read('openspec/changes/archive/2026-01-01-old/proposal.md'), 'We wrote wiki/ops/cash.md.\n');
  assert.equal(read('.agents/skills/memory/SKILL.md'), 'Pages live in wiki/ops/cash.md.\n');
  const list = JSON.parse(read('.agents/knowledge-moves.json'));
  assert.equal(list.base, git(f.target, 'rev-parse', 'HEAD'));
  assert.equal(list.moves['wiki/ops/cash.md'], 'knowledge/ops/cash.md');
  assert.deepEqual(result.problems, { wiki: [], knowledge: [] });
  assert.deepEqual(checkWiki(f.target, 'wiki'), []);
});

test('a moving page marked public arrives byte for byte, and the knowledge check passes it', t => {
  const hub = `---\npublic: true\n---\n${WIKI_INSTALL['wiki/ops/README.md']}`;
  const f = install(t, { ...WIKI_INSTALL, 'wiki/ops/README.md': hub });
  mkdirSync(join(f.target, 'knowledge'));
  assert.equal(move(f.options).status, 'moved');
  assert.equal(readFileSync(join(f.target, 'knowledge/ops/README.md'), 'utf8'), hub);
  assert.deepEqual(checkWiki(f.target, 'knowledge'), []);
});

test('a docs/ root with a docs-path folder maps shipped pages there, and a whole-wiki reader holds the move', t => {
  const files = {
    'docs/README.md': page('Docs', '- [Development](development/README.md)\n- [Ops](ops/plan.md)\n'),
    'docs/development/README.md': page('Development', '- [Voice](voice.md)\n- [Loop](the-change-loop.md)\n- [Architecture](architecture.md)\n'),
    'docs/development/voice.md': page('Voice'),
    'docs/development/the-change-loop.md': page('Loop'),
    'docs/development/architecture.md': page('Architecture'),
    'docs/ops/plan.md': page('Plan'),
    'packages/lib/docs-content.ts': "const modules = import.meta.glob('../../docs/**/*.md', { query: '?raw' });\n",
    'packages/spa/nav.tsx': "const items = [{ slug: 'ops/plan' }, { href: '/docs/ops/plan' }];\n",
  };
  const held = install(t, files, { components: { docsPath: 'docs/development' } });
  const report = plan(held.options);
  assert.equal(report.root, 'docs');
  assert.deepEqual(report.moves, {
    'docs/README.md': 'knowledge/README.md',
    'docs/development/architecture.md': 'knowledge/development/architecture.md',
    'docs/ops/plan.md': 'knowledge/ops/plan.md',
  });
  assert.deepEqual(report.replacedReaders.map(({ file, line }) => `${file}:${line}`), ['packages/lib/docs-content.ts:1']);
  assert.deepEqual([report.held, report.status], [true, 'held']);
  assert.deepEqual(report.hand.map(({ file, line, reason }) => `${file}:${line} ${reason}`), [
    'packages/spa/nav.tsx:1 an app docs route; the live reader replaces it',
  ], 'one step per line and reason');
  mkdirSync(join(held.target, 'knowledge'));
  assert.throws(() => move(held.options), { code: 'held' });
  assert.ok(existsSync(join(held.target, 'docs/ops/plan.md')) && !existsSync(join(held.target, '.agents/knowledge-moves.json')));

  const shipped = install(t, files, { components: { docsPath: 'docs/development' }, reader: true });
  assert.deepEqual([plan(shipped.options).held, plan(shipped.options).readerShipped], [false, true]);
});

test('a held record that kept its docsPath still finds its own pages in docs/', t => {
  const f = install(t, {
    'docs/README.md': page('Docs', '- [Ops](ops/plan.md)\n- [Voice](development/voice.md)\n'),
    'docs/development/voice.md': page('Voice'),
    'docs/ops/plan.md': page('Plan'),
  }, { components: { docsPath: 'docs/development', knowledgeMove: 'held' } });
  const report = plan(f.options);
  assert.equal(report.root, 'docs');
  assert.deepEqual(report.moves, { 'docs/README.md': 'knowledge/README.md', 'docs/ops/plan.md': 'knowledge/ops/plan.md' });
});

test('a page the knowledge copy holds with other text stops plan, and the CLI says so', t => {
  const f = install(t, { 'wiki/README.md': page('Wiki', '- [Cash](ops/cash.md)\n'), 'wiki/ops/cash.md': page('Cash') });
  write(f.target, { 'knowledge/ops/cash.md': page('Cash', 'Someone else\'s words.\n') });
  assert.throws(() => plan(f.options), { code: 'collision', message: /knowledge\/ops\/cash\.md/ });
  const cli = spawnSync(process.execPath, [SCRIPT, 'plan', '--target', f.target, '--source', f.source, '--record', '.agents/.wong-stack.json'], { encoding: 'utf8' });
  assert.equal(cli.status, 2);
  assert.equal(JSON.parse(cli.stdout).code, 'collision');
});

// Records a commit on `branch` from `parent` with one file changed, as a teammate's saved edit would.
function commitOn(target, parent, branch, path, body) {
  const env = { ...process.env, GIT_INDEX_FILE: join(target, '.git', 'teammate-index') };
  const run = args => spawnSync('git', args, { cwd: target, encoding: 'utf8', env, input: body }).stdout.trim();
  run(['read-tree', parent]);
  const blob = run(['hash-object', '-w', '--stdin']);
  run(['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`]);
  const commit = run(['commit-tree', run(['write-tree']), '-p', parent, '-m', 'teammate edit']);
  git(target, 'update-ref', `refs/heads/${branch}`, commit);
}

test('recopy carries a code-only edit, leaves a knowledge-only edit, and stops on a page changed in both', t => {
  const arrange = () => {
    const f = install(t, {
      'wiki/README.md': page('Wiki', '- [Cash](ops/cash.md)\n- [Voice](voice.md)\n'),
      'wiki/voice.md': page('Voice'),
      'wiki/ops/cash.md': page('Cash', 'Back to [voice](../voice.md).\n\nSome words.\n\nRule one.\n'),
    });
    mkdirSync(join(f.target, 'knowledge'));
    const base = git(f.target, 'rev-parse', 'HEAD');
    move(f.options);
    return { ...f, base };
  };
  const edited = page('Cash', 'Back to [voice](../voice.md).\n\nSome words.\n\nRule one, and two.\n');

  const code = arrange();
  commitOn(code.target, code.base, 'teammate', 'wiki/ops/cash.md', edited);
  assert.deepEqual(recopy({ target: code.target, main: 'teammate' }), { status: 'carried', carried: ['knowledge/ops/cash.md'], conflicts: [] });
  assert.match(readFileSync(join(code.target, 'knowledge/ops/cash.md'), 'utf8'), /\[voice\]\(\.\.\/\.\.\/wiki\/voice\.md\)\.\n\nSome words\.\n\nRule one, and two\.\n$/);
  assert.equal(recopy({ target: code.target, main: 'teammate' }).status, 'current', 'a second run carries nothing new');

  const mine = arrange();
  write(mine.target, { 'knowledge/ops/cash.md': `${readFileSync(join(mine.target, 'knowledge/ops/cash.md'), 'utf8')}Mine.\n` });
  assert.deepEqual(recopy({ target: mine.target, main: 'main' }), { status: 'current', carried: [], conflicts: [] });

  const both = arrange();
  commitOn(both.target, both.base, 'teammate', 'wiki/ops/cash.md', edited);
  const knowledge = `${readFileSync(join(both.target, 'knowledge/ops/cash.md'), 'utf8')}Mine.\n`;
  write(both.target, { 'knowledge/ops/cash.md': knowledge });
  const cli = spawnSync(process.execPath, [SCRIPT, 'recopy', '--target', both.target, '--main', 'teammate'], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  assert.deepEqual(JSON.parse(cli.stdout).conflicts, [{ page: 'knowledge/ops/cash.md', from: 'wiki/ops/cash.md', reason: 'changed in both places' }]);
  assert.equal(readFileSync(join(both.target, 'knowledge/ops/cash.md'), 'utf8'), knowledge, 'nothing written');
});
