import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { labelFiles, reviewBranch } from '../../.agents/skills/continue/scripts/pickup.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(root, '.agents/skills/continue/scripts/pickup.mjs');
const OWNER = 'owner@example.invalid';

function tmp(t, prefix) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `wong-test-${prefix}`)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function commit(cwd, file, ...flags) {
  mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  writeFileSync(path.join(cwd, file), `${file} ${Date.now()}\n`);
  git(cwd, 'add', '--all');
  git(cwd, ...flags, 'commit', '-q', '-m', file);
  return git(cwd, 'rev-parse', 'HEAD');
}

function clone(origin, dir, email) {
  execFileSync('git', ['clone', '-q', origin, dir]);
  git(dir, 'config', 'user.email', email);
  git(dir, 'config', 'user.name', email.split('@')[0]);
  return dir;
}

// A bare origin, the owner's clone on main, and a teammate's clone that saves branches to origin. `seed` fills the
// first commit, so the regression fixture can start from a copy of the agent tools.
function repo(t, seed = dir => commit(dir, 'README.md')) {
  const base = tmp(t, 'pickup-repo-');
  const origin = path.join(base, 'origin.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  const owner = clone(origin, path.join(base, 'owner'), OWNER);
  seed(owner);
  git(owner, 'push', '-q', 'origin', 'HEAD:main');
  const teammate = clone(origin, path.join(base, 'teammate'), 'teammate@example.invalid');
  // The teammate saves `files` as one commit each on `branch`, and returns the last commit.
  const save = (branch, files, ...flags) => {
    git(teammate, 'switch', '-q', ...(hasBranch(teammate, branch) ? [branch] : ['-c', branch, 'main']));
    let sha;
    for (const file of files) sha = commit(teammate, file, ...flags);
    git(teammate, 'push', '-q', 'origin', branch);
    return sha;
  };
  return { base, origin, owner, teammate, save };
}

function runCli(cwd, args) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
  return { status: r.status, json: r.stdout.startsWith('{') ? JSON.parse(r.stdout) : r.stdout, stderr: r.stderr };
}

const head = cwd => git(cwd, 'rev-parse', 'HEAD');
const hasBranch = (cwd, branch) => spawnSync('git', ['-C', cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0;

test('labels plans and wiki pages as words, and lists code first', () => {
  assert.deepEqual(labelFiles(['wiki/a.md', 'paseo.json', 'openspec/changes/x/tasks.md', '.agents/x.mjs', 'paseo.json']), [
    { path: '.agents/x.mjs', kind: 'code' }, { path: 'paseo.json', kind: 'code' },
    { path: 'openspec/changes/x/tasks.md', kind: 'words' }, { path: 'wiki/a.md', kind: 'words' },
  ]);
});

test('the owner\'s own branch switches with no review', t => {
  const { owner } = repo(t);
  git(owner, 'switch', '-q', '-c', 'owner-work');
  const tip = commit(owner, 'mine.mjs');
  git(owner, 'push', '-q', '-u', 'origin', 'owner-work');
  git(owner, 'switch', '-q', 'main');
  const r = runCli(owner, ['owner-work']);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.deepEqual(r.json, { ok: true, switched: true, branch: 'owner-work', commit: tip, reviewed: false });
  assert.equal(git(owner, 'branch', '--show-current'), 'owner-work');
});

test('a teammate\'s branch switches nothing and lists its commits and files, code first', t => {
  const { owner, save } = repo(t);
  const before = head(owner);
  const tip = save('teammate-work', ['wiki/note.md', 'app/tool.mjs']);
  const r = runCli(owner, ['teammate-work']);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.equal(r.json.tip, tip);
  assert.deepEqual(r.json.files, [{ path: 'app/tool.mjs', kind: 'code' }, { path: 'wiki/note.md', kind: 'words' }]);
  assert.deepEqual(r.json.commits.map(c => [c.author, c.subject]),
    [['teammate <teammate@example.invalid>', 'app/tool.mjs'], ['teammate <teammate@example.invalid>', 'wiki/note.md']]);
  assert.match(r.json.error, new RegExp(`--reviewed ${tip}`));
  assert.equal(head(owner), before);
  assert.equal(git(owner, 'branch', '--show-current'), 'main');
  assert.ok(!hasBranch(owner, 'teammate-work'));
});

test('a teammate commit carrying the owner\'s email still needs review', t => {
  const { owner, save } = repo(t);
  save('looks-like-mine', ['hook.mjs'], '-c', `user.email=${OWNER}`, '-c', 'user.name=owner');
  const r = runCli(owner, ['looks-like-mine']);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.equal(r.json.commits[0].author, `owner <${OWNER}>`);
  assert.deepEqual(r.json.files, [{ path: 'hook.mjs', kind: 'code' }]);
});

test('--reviewed at the tip switches to exactly that commit, tracking origin', t => {
  const { owner, save } = repo(t);
  const tip = save('teammate-work', ['tool.mjs']);
  const r = runCli(owner, ['teammate-work', '--reviewed', tip]);
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.deepEqual(r.json, { ok: true, switched: true, branch: 'teammate-work', commit: tip, reviewed: true });
  assert.equal(head(owner), tip);
  assert.equal(git(owner, 'rev-parse', '--abbrev-ref', 'teammate-work@{upstream}'), 'origin/teammate-work');
  git(owner, 'switch', '-q', 'main');
  assert.equal(runCli(owner, ['teammate-work']).status, 0, 'a reviewed branch is known from then on');
});

test('a teammate save after the review asks again about only the new commit', t => {
  const { owner, save } = repo(t);
  const before = head(owner);
  const seen = save('teammate-work', ['first.mjs']);
  assert.equal(runCli(owner, ['teammate-work']).json.tip, seen);
  const later = save('teammate-work', ['second.mjs']);
  const r = runCli(owner, ['teammate-work', '--reviewed', seen]);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.equal(r.json.tip, later);
  assert.deepEqual(r.json.commits.map(c => c.sha), [later]);
  assert.deepEqual(r.json.files, [{ path: 'second.mjs', kind: 'code' }]);
  assert.equal(head(owner), before);
  assert.ok(!hasBranch(owner, 'teammate-work'));
});

test('a merge of main lists only what the merger changed', t => {
  const { owner, teammate, save } = repo(t);
  save('teammate-work', ['teammate.mjs']);
  commit(owner, 'published.mjs');
  git(owner, 'push', '-q', 'origin', 'main');
  git(teammate, 'fetch', '-q', 'origin');
  git(teammate, 'merge', '-q', '--no-commit', '--no-ff', 'origin/main');
  writeFileSync(path.join(teammate, 'merger.mjs'), 'in the merge\n');
  git(teammate, 'add', '--all');
  git(teammate, 'commit', '-q', '-m', 'merge main');
  git(teammate, 'push', '-q', 'origin', 'teammate-work');
  const r = runCli(owner, ['teammate-work']);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.deepEqual(r.json.files.map(f => f.path), ['merger.mjs', 'teammate.mjs']);
});

test('a teammate\'s orphan commit merged in lists its files, even with log.showRoot off', t => {
  const { owner, teammate, save } = repo(t);
  git(owner, 'config', 'log.showRoot', 'false');
  git(owner, 'config', 'diff.renames', 'copies');
  save('teammate-work', ['first.mjs']);
  git(teammate, 'switch', '-q', '--orphan', 'loose');
  commit(teammate, 'orphan.mjs');
  git(teammate, 'switch', '-q', 'teammate-work');
  git(teammate, 'merge', '-q', '--allow-unrelated-histories', '-m', 'join', 'loose');
  git(teammate, 'mv', 'first.mjs', 'renamed.mjs');
  git(teammate, 'commit', '-q', '-m', 'rename');
  git(teammate, 'push', '-q', 'origin', 'teammate-work');
  const r = runCli(owner, ['teammate-work']);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.deepEqual(r.json.files.map(f => f.path), ['first.mjs', 'orphan.mjs', 'renamed.mjs']);
});

// Origin publishes `master`, and a teammate pushes a branch named `main`: it is their work, not published work.
test('a teammate\'s `main` on an origin that publishes `master` needs review', t => {
  const base = tmp(t, 'pickup-master-');
  const origin = path.join(base, 'origin.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
  const seed = clone(origin, path.join(base, 'seed'), OWNER);
  commit(seed, 'README.md');
  git(seed, 'push', '-q', 'origin', 'HEAD:master');
  const owner = clone(origin, path.join(base, 'owner'), OWNER);
  assert.equal(git(owner, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'), 'origin/master');
  const teammate = clone(origin, path.join(base, 'teammate'), 'teammate@example.invalid');
  git(teammate, 'switch', '-q', '-c', 'main');
  const hidden = commit(teammate, 'hook.mjs');
  git(teammate, 'push', '-q', 'origin', 'main');
  git(teammate, 'switch', '-q', '-c', 'feature');
  const tip = commit(teammate, 'feature.md');
  git(teammate, 'push', '-q', 'origin', 'feature');
  git(owner, 'fetch', '-q', 'origin');
  const before = head(owner);

  const feature = runCli(owner, ['feature']);
  assert.equal(feature.status, 3, JSON.stringify(feature.json));
  assert.equal(feature.json.tip, tip);
  assert.deepEqual(feature.json.files, [{ path: 'feature.md', kind: 'code' }, { path: 'hook.mjs', kind: 'code' }]);
  const main = runCli(owner, ['main']);
  assert.equal(main.status, 3, JSON.stringify(main.json));
  assert.deepEqual(main.json.commits.map(c => c.sha), [hidden]);
  assert.equal(head(owner), before);
  assert.ok(!hasBranch(owner, 'main'));
  assert.equal(runCli(owner, ['master', '--dry-run']).json.newWork, false, 'the published branch is known');

  // With no origin/HEAD and no asking origin, no remote branch is trusted.
  git(owner, 'remote', 'set-head', 'origin', '--delete');
  const blind = reviewBranch({ cwd: owner, branch: 'main', fetch: false });
  assert.equal(blind.defaultBranch, null);
  assert.deepEqual(blind.commits.map(c => c.sha), [hidden]);
  // Asked when fetching, origin names `master` again.
  assert.equal(reviewBranch({ cwd: owner, branch: 'main' }).defaultBranch, 'master');
});

// The server renames the published branch after the owner cloned: the owner's saved origin/HEAD still names `main`.
test('a teammate\'s `main` after origin renamed its published branch to `trunk` needs review', t => {
  const { origin, owner, teammate } = repo(t);
  git(owner, 'remote', 'set-head', 'origin', 'main');
  git(owner, 'config', 'remote.origin.followRemoteHEAD', 'never');
  git(teammate, 'push', '-q', 'origin', 'main:trunk');
  execFileSync('git', ['-C', origin, 'symbolic-ref', 'HEAD', 'refs/heads/trunk']);
  git(teammate, 'push', '-q', 'origin', ':main');
  git(owner, 'fetch', '-q', 'origin');
  assert.equal(git(owner, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'), 'origin/main');
  git(teammate, 'switch', '-q', '-c', 'new-main');
  const hidden = commit(teammate, 'hook.mjs');
  git(teammate, 'push', '-q', 'origin', 'new-main:main');
  const r = runCli(owner, ['main']);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.deepEqual(r.json.commits.map(c => c.sha), [hidden]);
});

test('unsaved edits are exit 2 and switch nothing; a dry run still reviews', t => {
  const { owner, save } = repo(t);
  const tip = save('teammate-work', ['tool.mjs']);
  writeFileSync(path.join(owner, 'draft.md'), 'unsaved\n');
  const r = runCli(owner, ['teammate-work', '--reviewed', tip]);
  assert.equal(r.status, 2, JSON.stringify(r.json));
  assert.match(r.json.error, /unsaved edits/);
  assert.equal(git(owner, 'branch', '--show-current'), 'main');
  const dry = runCli(owner, ['teammate-work', '--dry-run']);
  assert.equal(dry.status, 3, JSON.stringify(dry.json));
  assert.equal(dry.json.tip, tip);
});

test('a branch checked out in another worktree is exit 4 with its path', t => {
  const { base, owner } = repo(t);
  const other = path.join(base, 'other');
  git(owner, 'worktree', 'add', '-q', '-b', 'held', other);
  const r = runCli(owner, ['held']);
  assert.equal(r.status, 4, JSON.stringify(r.json));
  assert.equal(r.json.path, other);
  assert.equal(git(owner, 'branch', '--show-current'), 'main');
});

test('a dry run switches nothing, and bad input is exit 2', t => {
  const { owner, save } = repo(t);
  git(owner, 'branch', 'owner-work');
  const dry = runCli(owner, ['owner-work', '--dry-run']);
  assert.equal(dry.status, 0, JSON.stringify(dry.json));
  assert.deepEqual(dry.json, { ok: true, dryRun: true, branch: 'owner-work', tip: head(owner), newWork: false });
  const tip = save('teammate-work', ['tool.mjs']);
  assert.equal(runCli(owner, ['teammate-work', '--reviewed', tip, '--dry-run']).status, 0);
  assert.ok(!hasBranch(owner, 'teammate-work'));
  assert.equal(git(owner, 'branch', '--show-current'), 'main');
  for (const args of [[], ['nowhere'], ['-x'], ['a..b'], ['teammate-work', '--reviewed', 'HEAD'], ['a', 'b']]) {
    assert.equal(runCli(owner, args).status, 2, args.join(' '));
  }
});

test('a local branch that diverged from origin\'s copy is exit 2', t => {
  const { owner, save } = repo(t);
  const tip = save('teammate-work', ['tool.mjs']);
  assert.equal(runCli(owner, ['teammate-work', '--reviewed', tip]).status, 0);
  commit(owner, 'local.mjs');
  git(owner, 'switch', '-q', 'main');
  const later = save('teammate-work', ['more.mjs']);
  const r = runCli(owner, ['teammate-work', '--reviewed', later]);
  assert.equal(r.status, 2, JSON.stringify(r.json));
  assert.match(r.json.error, /neither contains the other/);
  assert.equal(git(owner, 'branch', '--show-current'), 'main');
});

// The security check's fixture: the branch edits only the library every hook script imports, so the hook commands
// stay the same. After the pickup no hook runs its code; after a plain checkout every node hook does.
test('a teammate branch that edits the hooks\' shared library runs nothing on pickup', t => {
  const { base, owner, teammate } = repo(t, dir => {
    cpSync(path.join(root, '.agents'), path.join(dir, '.agents'), {
      recursive: true, filter: src => !['.wong-stack.json', 'settings.local.json'].includes(path.basename(src)),
    });
    symlinkSync('.agents', path.join(dir, '.claude'));
    symlinkSync('.agents', path.join(dir, '.codex'));
    commit(dir, 'README.md');
  });
  const marker = path.join(base, 'branch-code-ran');
  const library = '.agents/skills/memory/scripts/lib/cli.mjs';
  git(teammate, 'switch', '-q', '-c', 'teammate-change');
  appendFileSync(path.join(teammate, library),
    `\nimport { appendFileSync as markBranchCode } from 'node:fs';\nmarkBranchCode(${JSON.stringify(marker)}, \`\${process.argv[1]}\\n\`);\n`);
  git(teammate, 'commit', '-q', '-am', 'tidy the CLI helper');
  git(teammate, 'push', '-q', 'origin', 'teammate-change');
  const before = head(owner);

  const r = runCli(owner, ['teammate-change']);
  assert.equal(r.status, 3, JSON.stringify(r.json));
  assert.equal(head(owner), before);
  assert.deepEqual(r.json.files, [{ path: library, kind: 'code' }]);

  const commands = ['settings.json', 'hooks.json'].flatMap(file => Object.values(JSON.parse(readFileSync(path.join(owner, '.agents', file), 'utf8')).hooks)
    .flat().flatMap(group => group.hooks).map(hook => hook.command));
  const home = tmp(t, 'pickup-home-');
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(CLAUDE|CODEX|PASEO|WONG)_/.test(name)));
  Object.assign(env, { CLAUDE_PROJECT_DIR: owner, WONG_MEMORY_RUN: '1', WONG_MEMORY_STATE_DIR: path.join(home, 'state'), HOME: home });
  const event = JSON.stringify({ session_id: 'pickup-test', cwd: owner, hook_event_name: 'PreToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(owner, 'README.md') }, transcript_path: path.join(home, 'none.jsonl') });
  const size = () => existsSync(marker) ? statSync(marker).size : 0;
  // Runs each hook command as the host would; returns the commands after which the marker grew.
  const runHooks = () => commands.filter(command => {
    const start = size();
    spawnSync('sh', ['-c', command], { cwd: owner, env, input: event, encoding: 'utf8', timeout: 30_000 });
    return size() > start;
  });
  const node = commands.filter(command => /\bnode "/.test(command));
  assert.equal(node.length, 14);
  assert.deepEqual(runHooks(), []);
  assert.ok(!existsSync(marker), 'branch code ran after the pickup');

  git(owner, 'checkout', '-q', 'teammate-change');
  assert.deepEqual(runHooks(), node, 'the plain checkout is the control: every node hook runs the branch\'s code');
});

test('/continue switches only through pickup.mjs', () => {
  const switching = [/\bgit\s+(?:-\S+(?:\s+[^-\s]\S*)?\s+)*(?:checkout|switch)\b/, /\bgh\s+pr\s+checkout\b/];
  const caught = text => switching.some(pattern => pattern.test(text));
  for (const text of ['git checkout "$BRANCH"', 'git -C "$dir" checkout "$BRANCH"', 'git -c a.b=c switch -q x', 'gh pr checkout 12']) {
    assert.ok(caught(text), text);
  }
  assert.ok(!caught('git cat-file -e "$ref:x", checking out nothing'));
  const skill = readFileSync(path.join(root, '.agents/skills/continue/SKILL.md'), 'utf8');
  assert.match(skill, /continue\/scripts\/pickup\.mjs/);
  assert.ok(!caught(skill), 'the skill switches a branch outside pickup.mjs');
  // Reviewed work builds nothing unasked, here or in the new workspace its brief opens.
  assert.match(skill, /told \*ask before building\*/);
  const brief = readFileSync(path.join(root, '.agents/skills/plan/references/new-workspace.md'), 'utf8');
  assert.match(brief, /the brief adds \*ask before building\*/);
});
