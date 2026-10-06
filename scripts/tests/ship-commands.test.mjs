import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { entryOnTop, mainVerdict } from '../../.agents/skills/ship/scripts/ship.mjs';

const script = new URL('../../.agents/skills/ship/scripts/ship.mjs', import.meta.url).pathname;
const ARCHIVE = 'openspec/changes/archive/2026-10-04-demo';
const CHANGELOG = '# Changelog\n\nNewest first.\n\n## 1.0.0 — First\n\nThe first release.\n';
const withEntry = entry => CHANGELOG.replace('## 1.0.0', `${entry}\n\n## 1.0.0`);
const NEXT_ENTRY = '## Next (minor) — New thing\n\nA new thing.';
// An Artifacts install: origin is on Cloudflare's Git domain, and the install record names the route.
const REAL_GIT = execFileSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
const ARTIFACTS_REMOTE = `https://${'0123456789abcdef'.repeat(2)}.artifacts.cloudflare.net/git/wongstack/repo.git`;
const ARTIFACTS_RECORD = { components: { delivery: { route: 'artifacts', accountId: '0123456789abcdef'.repeat(2), remote: ARTIFACTS_REMOTE, workflow: 'repo-checks' } } };

// A fake gh that answers from $FAKE_DIR/gh.json and logs every call.
const FAKE_GH = `#!/usr/bin/env node
const { appendFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const dir = process.env.FAKE_DIR;
const line = process.argv.slice(2).join(' ');
appendFileSync(join(dir, 'calls'), 'gh ' + line + '\\n');
const s = JSON.parse(readFileSync(join(dir, 'gh.json'), 'utf8'));
const out = text => { process.stdout.write(text + '\\n'); process.exit(0); };
const fail = (text, code = 1) => { process.stderr.write(text + '\\n'); process.exit(code); };
if (line.startsWith('api repos/:owner/:repo/commits/main/check-runs')) { if (s.mainChecksError) fail(s.mainChecksError); out(s.mainChecks ?? 'test\tsuccess'); }
if (line.startsWith('repo view --json defaultBranchRef')) out('main');
if (line.startsWith('repo view --json nameWithOwner')) out('team/repo');
if (line.startsWith('pr view --json number --jq')) out('7');
if (line.startsWith('pr view --json title')) out('feat: a thing');
if (line.startsWith('pr merge')) process.exit(s.mergeRc ?? 0);
if (line.startsWith('pr view --json state')) out('MERGED');
if (line.startsWith('pr view --json number,url')) out('pr=7 url=https://github.com/team/repo/pull/7');
if (line.startsWith('pr view --json mergeable')) out(s.mergeable ?? 'MERGEABLE');
if (line.startsWith('pr view 7 --json mergeCommit')) out(s.mergeCommit ?? '${'d'.repeat(40)}');
if (line.startsWith('pr list')) out('');
if (line.startsWith('api repos/team/repo/deployments?')) out(s.deployment ? '55' : '');
if (line.startsWith('api repos/team/repo/deployments/55/statuses')) out(s.deployment);
if (line.startsWith('run list')) out('');
fail('unexpected gh call: ' + line, 97);
`;

// A fake OpenSpec CLI over the fixture's real folders: it lists, reads tasks, validates, and archives.
const FAKE_OPENSPEC = `#!/usr/bin/env node
const fs = require('node:fs');
const { join } = require('node:path');
const dir = process.env.FAKE_DIR;
const args = process.argv.slice(2);
const line = args.join(' ');
fs.appendFileSync(join(dir, 'calls'), 'openspec ' + line + '\\n');
const s = JSON.parse(fs.readFileSync(join(dir, 'openspec.json'), 'utf8'));
const changes = join(process.cwd(), 'openspec', 'changes');
const names = fs.existsSync(changes) ? fs.readdirSync(changes).filter(name => name !== 'archive' && fs.existsSync(join(changes, name, 'proposal.md'))).sort() : [];
const out = value => { console.log(JSON.stringify(value)); process.exit(0); };
const name = args[args.indexOf('--change') + 1];
if (line === 'list --json') out(s.noList ? {} : { changes: names.map(name => ({ name })), root: { path: process.cwd() } });
if (line.startsWith('instructions apply')) {
  const tasks = fs.readFileSync(join(changes, name, 'tasks.md'), 'utf8').split('\\n').flatMap(text => {
    const match = text.match(/^- \\[( |x)\\] (.*)$/);
    return match ? [{ id: match[2].split(' ')[0], description: match[2], done: match[1] === 'x' }] : [];
  });
  out({ changeName: name, tasks });
}
if (line.startsWith('status --change')) out({ changeRoot: join(changes, name), planningHome: { changesDir: changes }, artifacts: [{ id: 'proposal', status: 'done' }, { id: 'tasks', status: s.unfinished ? 'ready' : 'done' }] });
if (line.startsWith('validate')) {
  if (s.invalid) { console.error('proposal.md: missing ## Why'); process.exit(1); }
  console.log('valid');
  process.exit(0);
}
if (line.startsWith('archive')) {
  fs.mkdirSync(join(changes, 'archive'), { recursive: true });
  fs.renameSync(join(changes, args[1]), join(changes, 'archive', '2026-10-04-' + args[1]));
  process.exit(0);
}
console.error('unexpected openspec call: ' + line);
process.exit(97);
`;

// An Artifacts fixture's git is the real one against the bare origin, with every call logged; only
// the origin address is answered from $FAKE_REMOTE, so delivery-route.mjs reads a Cloudflare one.
const FAKE_GIT = `#!/usr/bin/env bash
echo "git $*" >> "$FAKE_DIR/calls"
case "$*" in
  *"remote get-url origin") echo "$FAKE_REMOTE"; exit 0 ;;
esac
exec "$REAL_GIT" "$@"
`;

// And its `node`, which the scripts call by name, stands in for artifacts-run.mjs alone: `result`
// prints MAIN_RESULT for main's run and RUN_RESULT for the branch's own, and `live` prints RUN_LIVE,
// what main's run of the published commit ended as. Every other script runs on the real node.
const FAKE_NODE = `#!/usr/bin/env bash
case "\${1:-}" in
  */artifacts-run.mjs)
    echo "node artifacts-run.mjs \${*:2}" >> "$FAKE_DIR/calls"
    case "\${2:-}" in
      result)
        if [ -n "\${RESULT_RC:-}" ]; then exit "$RESULT_RC"; fi
        if [ "\${4:-}" = refs/heads/main ]; then echo "\${MAIN_RESULT-SUCCESS}"; else echo "\${RUN_RESULT-SUCCESS}"; fi ;;
      live) echo "\${RUN_LIVE-none}" ;;
    esac
    exit 0 ;;
esac
exec "$REAL_NODE" "$@"
`;

// A fake local-checks script, committed at .github/scripts/checks.mjs: it logs its call and
// answers from $FAKE_DIR/checks.json with an exit code and a last line.
const FAKE_CHECKS = `import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.env.FAKE_DIR;
appendFileSync(join(dir, 'calls'), 'checks ' + process.argv.slice(2).join(' ') + '\\n');
const s = JSON.parse(readFileSync(join(dir, 'checks.json'), 'utf8'));
console.log('checks output');
for (const line of s.lines ?? ['LOCAL_CHECKS=pass']) console.log(line);
process.exit(s.code ?? 0);
`;

// A real repository with a bare origin: main holds a first release, and `work` is checked out.
// `checks` gives the repo a local-checks script that answers with those settings.
function fixture(t, { gh = {}, openspec = {}, artifacts = false, checks = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-ship-commands-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const work = join(dir, 'work');
  const origin = join(dir, 'origin.git');
  for (const name of ['bin', 'work']) mkdirSync(join(dir, name));
  for (const [name, body] of [['gh', FAKE_GH], ['openspec', FAKE_OPENSPEC], ...(artifacts ? [['git', FAKE_GIT], ['node', FAKE_NODE]] : [])]) {
    writeFileSync(join(dir, 'bin', name), body);
    chmodSync(join(dir, 'bin', name), 0o755);
  }
  writeFileSync(join(dir, 'calls'), '');
  writeFileSync(join(dir, 'gh.json'), JSON.stringify(gh));
  writeFileSync(join(dir, 'openspec.json'), JSON.stringify(openspec));
  writeFileSync(join(dir, 'checks.json'), JSON.stringify(checks ?? {}));
  const env = {
    ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, HOME: dir, FAKE_DIR: dir,
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test',
    ...(artifacts ? { FAKE_REMOTE: ARTIFACTS_REMOTE, REAL_GIT, REAL_NODE: process.execPath } : {}),
  };
  // The fixture's own git calls go to the real git, so only the command's calls are logged.
  const git = (...args) => execFileSync(REAL_GIT, args, { cwd: work, env, encoding: 'utf8' }).trim();
  const write = (path, text) => {
    mkdirSync(dirname(join(work, path)), { recursive: true });
    writeFileSync(join(work, path), text);
  };
  const commit = (files, message = 'fixture') => {
    for (const [path, text] of Object.entries(files)) write(path, text);
    git('add', '-A');
    git('commit', '-q', '-m', message);
  };
  execFileSync(REAL_GIT, ['init', '-q', '--bare', '-b', 'main', origin], { env });
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', origin);
  commit({ 'CHANGELOG.md': CHANGELOG, VERSION: '1.0.0\n', 'app.txt': 'one\n', ...(checks ? { '.github/scripts/checks.mjs': FAKE_CHECKS } : {}), ...(artifacts ? { '.claude/.wong-stack.json': `${JSON.stringify(ARTIFACTS_RECORD)}\n` } : {}) }, 'base');
  git('push', '-q', '-u', 'origin', 'main');
  git('checkout', '-q', '-b', 'work');
  // Another release, or another person's edit, lands on the default branch meanwhile.
  const advanceMain = files => {
    git('checkout', '-q', 'main');
    commit(files, 'main moved');
    git('push', '-q', 'origin', 'main');
    git('checkout', '-q', 'work');
  };
  const change = (name, tasks = '- [x] 1.1 Done\n') => ({
    [`openspec/changes/${name}/proposal.md`]: `# ${name}\n\n**Status:** in-progress\n**Branch:** work\n\n## Why\n\nBecause it helps.\n\n## What Changes\n\n- One thing changes.\n\n## Decision log\n\n- **2026-10-04** — Asked which way → this way.\n`,
    [`openspec/changes/${name}/tasks.md`]: tasks,
    [`openspec/changes/${name}/review.html`]: '<!-- wong-review:3 -->\nold page\n',
  });
  const run = (args, vars = {}) => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: work, env: { ...env, ...vars }, encoding: 'utf8' });
    return { ...result, value: key => result.stdout.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1] };
  };
  const read = path => readFileSync(join(work, path), 'utf8');
  const calls = () => readFileSync(join(dir, 'calls'), 'utf8');
  const set = (file, scenario) => writeFileSync(join(dir, `${file}.json`), JSON.stringify(scenario));
  return { dir, work, git, write, commit, advanceMain, change, run, read, calls, set, has: path => existsSync(join(work, path)) };
}

const behindMain = f => f.git('merge-base', '--is-ancestor', 'origin/main', 'HEAD');
const SAVE_NEXT = `invoke ordinary /save once, with change demo and archive path ${ARCHIVE} (mode archive). Go on to /verify only on SUCCESS or NONE.`;
const checkCalls = f => f.calls().match(/^checks .*$/gm) ?? [];
const NO_SCRIPT = 'not run (this repo has no .github/scripts/checks.mjs)';

test('a prepare that merges nothing runs no local check, and prints the same lines as before', t => {
  const f = fixture(t, { checks: { code: 1, lines: ['LOCAL_CHECKS=fail (suite)'] } });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY), 'app.txt': 'two\n' });
  const r = f.run(['prepare']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(r.stdout, ['BRANCH=work', 'DIRTY=no', 'AHEAD=1', 'DEFAULT_CHECKS=ok', 'CHANGE=demo', `ARCHIVE=${ARCHIVE}`,
    'RELEASE=1.1.0 from 1.0.0', 'SYNC=none', 'REVIEW=rebuilt', `NEXT: ${SAVE_NEXT}`, ''].join('\n'));
  assert.deepEqual(checkCalls(f), []);
});

test('a merge of the default branch is checked here once, and a pass keeps the next step', t => {
  const f = fixture(t, { checks: {} });
  f.advanceMain({ 'other.txt': 'theirs\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.ok(r.stdout.endsWith(`SYNC=merged origin/main\nREVIEW=rebuilt\nLOCAL_CHECKS=pass\nNEXT: ${SAVE_NEXT}\n`), r.stdout);
  assert.deepEqual(checkCalls(f), ['checks --worktree --default-branch main']);
  // The checks' own output is on stderr; stdout keeps only the one line.
  assert.match(r.stderr, /^checks output\nLOCAL_CHECKS=pass$/m);
  assert.doesNotMatch(r.stdout, /checks output/);
  // The check saw the tree /save will commit: archived, numbered, and marked ready.
  assert.equal(f.has(ARCHIVE), true);
});

test('local checks that fail after a merge change only the next step, to a repair', t => {
  const f = fixture(t, { checks: { code: 1, lines: ['LOCAL_CHECKS=fail (suite, payload:links); not run (the install failed)', 'Repair, then rerun only what failed: node .github/scripts/checks.mjs --worktree --only suite,payload:links'] } });
  f.advanceMain({ 'other.txt': 'theirs\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(r.value('LOCAL_CHECKS'), 'fail (suite, payload:links); not run (the install failed)');
  assert.ok(r.stdout.endsWith(`\nNEXT: the local checks failed after main came in. Repair what fails and rerun only that: node .github/scripts/checks.mjs --worktree --only suite,payload:links, three rounds at most. Then ${SAVE_NEXT}\n`), r.stdout);
  assert.deepEqual(['ARCHIVE', 'RELEASE', 'SYNC', 'REVIEW'].map(r.value), [ARCHIVE, '1.1.0 from 1.0.0', 'merged origin/main', 'rebuilt']);
  assert.equal(checkCalls(f).length, 1);
  // With no change, the repair leads into the same plain save.
  const plain = fixture(t, { checks: { code: 1, lines: ['LOCAL_CHECKS=fail (wiki)'] } });
  plain.advanceMain({ 'other.txt': 'theirs\n' });
  plain.commit({ 'README.md': '# Project\n' });
  const synced = plain.run(['prepare', '--no-change', '--sync']);
  assert.equal(synced.status, 0, `${synced.stdout}${synced.stderr}`);
  assert.ok(synced.stdout.endsWith('SYNC=merged origin/main\nLOCAL_CHECKS=fail (wiki)\nNEXT: the local checks failed after main came in. Repair what fails and rerun only that: node .github/scripts/checks.mjs --worktree --only wiki, three rounds at most. Then invoke ordinary /save once, with no change. Go on to /verify only on SUCCESS or NONE.\n'), synced.stdout);
});

test('local checks that could not run after a merge say so in one line and keep the next step', t => {
  const f = fixture(t, { checks: { code: 7, lines: ['LOCAL_CHECKS=not run (npm is not installed)'] } });
  f.advanceMain({ 'other.txt': 'theirs\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.ok(r.stdout.endsWith(`LOCAL_CHECKS=not run (npm is not installed)\nNEXT: ${SAVE_NEXT}\n`), r.stdout);
  assert.equal(checkCalls(f).length, 1);
  // A script that ends with no result line is not a pass.
  const silent = fixture(t, { checks: { code: 2, lines: [] } });
  silent.advanceMain({ 'other.txt': 'theirs\n' });
  silent.commit({ ...silent.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  const none = silent.run(['prepare', '--change', 'demo']);
  assert.equal(none.status, 0, `${none.stdout}${none.stderr}`);
  assert.ok(none.stdout.endsWith(`LOCAL_CHECKS=not run (checks.mjs exited 2 with no LOCAL_CHECKS line)\nNEXT: ${SAVE_NEXT}\n`), none.stdout);
});

test('a merge resolved by hand is checked once, on the rerun that concludes it', t => {
  const f = fixture(t, { checks: {} });
  f.advanceMain({ 'app.txt': 'theirs\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY), 'app.txt': 'ours\n' });
  assert.equal(f.run(['prepare', '--change', 'demo']).status, 5);
  assert.deepEqual(checkCalls(f), [], 'a stopped merge is not checked');
  f.write('app.txt', 'ours and theirs\n');
  f.git('add', 'app.txt');
  const again = f.run(['prepare']);
  assert.equal(again.status, 0, `${again.stdout}${again.stderr}`);
  assert.deepEqual(['SYNC', 'LOCAL_CHECKS'].map(again.value), ['none', 'pass']);
  assert.ok(again.stdout.endsWith(`NEXT: ${SAVE_NEXT}\n`), again.stdout);
  assert.deepEqual(checkCalls(f), ['checks --worktree --default-branch main']);
});

test('a clean prepare leaves one archive folder, a numbered release, and a rebuilt review page', t => {
  const f = fixture(t);
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY), 'app.txt': 'two\n' });
  const r = f.run(['prepare']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.deepEqual(['BRANCH', 'DIRTY', 'AHEAD', 'DEFAULT_CHECKS', 'CHANGE', 'ARCHIVE', 'RELEASE', 'SYNC', 'REVIEW'].map(r.value),
    ['work', 'no', '1', 'ok', 'demo', ARCHIVE, '1.1.0 from 1.0.0', 'none', 'rebuilt']);
  assert.match(r.stdout, new RegExp(`^NEXT: invoke ordinary /save once, with change demo and archive path ${ARCHIVE} \\(mode archive\\)\\. Go on to /verify only on SUCCESS or NONE\\.$`, 'm'));
  assert.equal(f.has('openspec/changes/demo'), false);
  assert.equal(f.read('VERSION'), '1.1.0\n');
  assert.match(f.read('CHANGELOG.md'), /## 1\.1\.0 — New thing\n[\s\S]*## 1\.0\.0 — First/);
  assert.match(f.read(`${ARCHIVE}/proposal.md`), /^\*\*Status:\*\* ready-to-ship$/m);
  assert.match(f.read(`${ARCHIVE}/proposal.md`), /^\*\*Branch:\*\* work$/m);
  const page = f.read(`${ARCHIVE}/review.html`);
  assert.doesNotMatch(page, /old page/);
  assert.match(page, /Because it helps\./);
  // Tasks, artifacts, and validation are read before anything is archived.
  assert.match(f.calls(), /openspec instructions apply --change demo --json\n[\s\S]*openspec status --change demo --json\n[\s\S]*openspec validate demo --strict --no-interactive\n[\s\S]*openspec archive demo --yes\n/);
});

test('unchecked tasks stop before the archive and are listed', t => {
  const f = fixture(t);
  f.commit(f.change('demo', '- [x] 1.1 Done\n- [ ] 1.2 Not done\n- [ ] 2.1 Nor this\n'));
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 4);
  assert.match(r.stdout, /^UNCHECKED=1\.2 Not done\nUNCHECKED=2\.1 Nor this\nNEXT: invoke apply for demo inside \/ship/m);
  assert.equal(f.has('openspec/changes/demo/tasks.md'), true);
  assert.doesNotMatch(f.calls(), /openspec (validate|archive)/);
});

test('the default branch is judged by the project’s own checks, never Dependabot’s update job', () => {
  assert.equal(mainVerdict('test\tsuccess\nDependabot\tfailure\nDependabot\tsuccess\n'), 'ok');
  assert.equal(mainVerdict('Dependabot\tfailure\n'), 'ok');
  assert.equal(mainVerdict('test\tsuccess\nbuild\tcancelled\n'), 'failure');
  assert.equal(mainVerdict('test\tpending\n'), 'ok');
  assert.equal(mainVerdict(''), '');
});

test('a failing or unreadable default branch stops before any change is read', t => {
  const f = fixture(t, { gh: { mainChecks: 'test\tsuccess\nbuild\tfailure' } });
  f.commit(f.change('demo'));
  const failing = f.run(['prepare', '--change', 'demo']);
  assert.equal(failing.status, 6);
  assert.equal(failing.value('DEFAULT_CHECKS'), 'failure');
  assert.match(failing.stdout, /^NEXT: main's checks are failing\. Fix the default branch first/m);
  f.set('gh', { mainChecksError: 'HTTP 401: Bad credentials' });
  const unreadable = f.run(['prepare', '--change', 'demo']);
  assert.equal(unreadable.status, 6);
  assert.equal(unreadable.value('DEFAULT_CHECKS'), 'unknown');
  assert.match(unreadable.stderr, /^error=HTTP 401: Bad credentials$/m);
  f.set('gh', { mainChecks: '' });
  const empty = f.run(['prepare', '--change', 'demo']);
  assert.equal(empty.status, 6);
  assert.match(empty.stderr, /^error=gh returned no answer$/m);
  assert.doesNotMatch(f.calls(), /openspec/);
  assert.equal(f.has('openspec/changes/demo'), true);
});

test('a release behind the default branch merges it in cleanly and is numbered after', t => {
  const f = fixture(t);
  f.advanceMain({ 'other.txt': 'theirs\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(r.value('SYNC'), 'merged origin/main');
  assert.equal(r.value('RELEASE'), '1.1.0 from 1.0.0');
  assert.equal(r.value('LOCAL_CHECKS'), NO_SCRIPT);
  assert.equal(f.read('other.txt'), 'theirs\n');
  assert.doesNotThrow(() => behindMain(f));
  assert.equal(f.has(ARCHIVE), true);
});

test('a CHANGELOG.md-only conflict resolves with this branch\'s entry on top, then numbers again', t => {
  const f = fixture(t);
  f.advanceMain({ 'CHANGELOG.md': withEntry('## 1.0.1 — Other fix\n\nTheir fix.'), VERSION: '1.0.1\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(r.value('SYNC'), 'merged origin/main');
  assert.equal(r.value('RELEASE'), '1.1.0 from 1.0.1');
  assert.equal(r.value('LOCAL_CHECKS'), NO_SCRIPT);
  const changelog = f.read('CHANGELOG.md');
  assert.match(changelog, /## 1\.1\.0 — New thing\n\nA new thing\.\n\n## 1\.0\.1 — Other fix\n\nTheir fix\.\n\n## 1\.0\.0 — First/);
  assert.doesNotMatch(changelog, /<<<<<<<|=======|>>>>>>>/);
  assert.equal(f.read('VERSION'), '1.1.0\n');
  assert.doesNotThrow(() => behindMain(f));
});

test('a release numbered earlier is numbered again after another took its number', t => {
  const f = fixture(t);
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  assert.equal(f.run(['prepare', '--change', 'demo']).status, 0);
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'archive and number');
  f.advanceMain({ 'CHANGELOG.md': withEntry('## 1.0.1 — Other fix\n\nTheirs.'), VERSION: '1.0.1\n' });
  // The rerun finds the change already archived, and both release files resolve by rule.
  const r = f.run(['prepare', '--sync']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.deepEqual(['CHANGE', 'ARCHIVE', 'RELEASE', 'SYNC', 'REVIEW'].map(r.value), ['demo', ARCHIVE, '1.1.0 from 1.0.1', 'merged origin/main', 'unchanged']);
  assert.equal(r.value('LOCAL_CHECKS'), NO_SCRIPT);
  assert.match(f.read('CHANGELOG.md'), /## 1\.1\.0 — New thing\n[\s\S]*## 1\.0\.1 — Other fix\n[\s\S]*## 1\.0\.0 — First/);
  assert.doesNotMatch(f.read('CHANGELOG.md'), /<<<<<<<|>>>>>>>/);
  assert.equal(f.read('VERSION'), '1.1.0\n');
  assert.equal(f.calls().match(/openspec archive/g).length, 1, 'archived once');
});

test('another file\'s conflict stops with the files, and the rerun concludes the resolved merge', t => {
  const f = fixture(t);
  f.advanceMain({ 'app.txt': 'theirs\n' });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY), 'app.txt': 'ours\n' });
  const r = f.run(['prepare', '--change', 'demo']);
  assert.equal(r.status, 5);
  assert.match(r.stdout, /^CONFLICT=app\.txt\nNEXT: resolve each file above as the union of intent[^\n]*ship\.mjs prepare$/m);
  assert.doesNotMatch(r.stdout, /^ARCHIVE=/m);
  const unresolved = f.run(['prepare']);
  assert.equal(unresolved.status, 5);
  assert.match(unresolved.stdout, /^CONFLICT=app\.txt$/m);
  f.write('app.txt', 'ours and theirs\n');
  f.git('add', 'app.txt');
  const again = f.run(['prepare']);
  assert.equal(again.status, 0, `${again.stdout}${again.stderr}`);
  assert.deepEqual(['CHANGE', 'ARCHIVE', 'RELEASE', 'LOCAL_CHECKS'].map(again.value), ['demo', ARCHIVE, '1.1.0 from 1.0.0', NO_SCRIPT]);
  assert.doesNotThrow(() => behindMain(f));
  assert.equal(f.read('app.txt'), 'ours and theirs\n');
});

test('uncommitted work that the merge would overwrite stops with nothing changed', t => {
  const f = fixture(t);
  f.advanceMain({ 'app.txt': 'theirs\n' });
  f.commit({ 'CHANGELOG.md': withEntry(NEXT_ENTRY) });
  f.write('app.txt', 'unsaved\n');
  const r = f.run(['prepare', '--no-change']);
  assert.equal(r.status, 5);
  assert.match(r.stderr, /^error=git merge origin\/main: /m);
  assert.match(r.stdout, /^NEXT: git did not start the merge[^\n]*prepare --sync$/m);
  assert.equal(f.read('app.txt'), 'unsaved\n');
});

test('--sync merges the default branch in with no release, and --no-change archives nothing', t => {
  const f = fixture(t);
  f.advanceMain({ 'other.txt': 'theirs\n' });
  f.commit({ 'README.md': '# Project\n' });
  const plain = f.run(['prepare', '--no-change']);
  assert.equal(plain.status, 0, `${plain.stdout}${plain.stderr}`);
  assert.deepEqual(['CHANGE', 'ARCHIVE', 'RELEASE', 'SYNC'].map(plain.value), ['none', 'none', 'none', 'none']);
  assert.match(plain.stdout, /^NEXT: invoke ordinary \/save once, with no change\./m);
  assert.equal(plain.value('LOCAL_CHECKS'), undefined);
  assert.equal(f.has('other.txt'), false);
  const synced = f.run(['prepare', '--no-change', '--sync']);
  assert.equal(synced.status, 0, `${synced.stdout}${synced.stderr}`);
  assert.equal(synced.value('SYNC'), 'merged origin/main');
  assert.equal(synced.value('LOCAL_CHECKS'), NO_SCRIPT);
  assert.equal(f.has('other.txt'), true);
  assert.doesNotMatch(f.calls(), /openspec (instructions|status|validate|archive)/);
});

test('nothing to ship, an unselected change, and other active changes each stop for the skill', t => {
  const f = fixture(t);
  const nothing = f.run(['prepare']);
  assert.equal(nothing.status, 3);
  assert.match(nothing.stdout, /^NEXT: nothing to ship yet\. Take the pull-in/m);
  f.commit({ 'README.md': '# Project\n' });
  const unselected = f.run(['prepare']);
  assert.equal(unselected.status, 7);
  assert.match(unselected.stdout, /^CANDIDATES=none\nNEXT: no change is selected\./m);
  f.commit({ ...f.change('demo'), ...f.change('other') });
  const several = f.run(['prepare']);
  assert.equal(several.status, 7);
  assert.match(several.stdout, /^CANDIDATES=demo,other\nNEXT: ask which change to ship/m);
  const others = f.run(['prepare', '--change', 'demo']);
  assert.equal(others.status, 7);
  assert.match(others.stdout, /^OTHER_CHANGES=other\nNEXT: the merge would carry these active changes too\. Ask: move the others off the branch \(Recommended\)/m);
  assert.equal(f.has('openspec/changes/demo'), true);
  const onPurpose = f.run(['prepare', '--change', 'demo', '--allow-others', '--skip-specs']);
  assert.equal(onPurpose.status, 0, `${onPurpose.stdout}${onPurpose.stderr}`);
  assert.equal(onPurpose.value('ARCHIVE'), ARCHIVE);
  assert.match(f.calls(), /openspec archive demo --yes --skip-specs\n/);
  assert.equal(f.has('openspec/changes/other'), true);
});

test('a change that fails validation, has unfinished artifacts, or is unknown is not archived', t => {
  const f = fixture(t, { openspec: { invalid: true } });
  f.commit(f.change('demo'));
  const invalid = f.run(['prepare', '--change', 'demo']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /^error=openspec validate demo: proposal\.md: missing ## Why$/m);
  f.set('openspec', { unfinished: true });
  const unfinished = f.run(['prepare', '--change', 'demo']);
  assert.equal(unfinished.status, 1);
  assert.match(unfinished.stderr, /^error=demo has unfinished artifacts: tasks$/m);
  f.set('openspec', {});
  const unknown = f.run(['prepare', '--change', 'absent']);
  assert.equal(unknown.status, 7, 'the real change would ride along');
  const none = f.run(['prepare', '--change', 'absent', '--allow-others']);
  assert.equal(none.status, 1);
  assert.match(none.stderr, /^error=expected one archive folder for absent, found 0$/m);
  f.set('openspec', { noList: true });
  const contract = f.run(['prepare', '--change', 'demo']);
  assert.equal(contract.status, 1);
  assert.match(contract.stderr, /the CLI contract changed/);
  assert.equal(f.has('openspec/changes/demo'), true);
  assert.doesNotMatch(f.calls(), /openspec archive/);
});

test('finish prints merge.sh\'s lines unchanged, promotes secrets, and looks at the live app', t => {
  const f = fixture(t);
  f.commit({ 'app.txt': 'two\n' });
  f.git('push', '-q', '-u', 'origin', 'work');
  const r = f.run(['finish']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /^merged=yes\npr=7 url=https:\/\/github\.com\/team\/repo\/pull\/7\nretargeted=\nbranch=deleted\nsynced=ref\n/);
  assert.match(r.stdout, /^SECRETS=\{"primary":true,/m);
  assert.match(r.stdout, /^LIVE_LOOK=unknown\nREASON=this repo records no release to wait for\nNEXT: it merged\. Report it is live, with REASON as one line\.$/m);
  assert.match(f.calls(), new RegExp(`gh pr merge --squash --match-head-commit ${f.git('rev-parse', 'HEAD')} --subject feat: a thing \\(#7\\)\\n`));
  assert.equal(f.git('ls-remote', '--heads', 'origin', 'work'), '');
});

test('a number another release took passes merge.sh\'s code through, with the recovery', t => {
  const f = fixture(t);
  f.commit({ VERSION: '1.1.0\n', 'CHANGELOG.md': withEntry('## 1.1.0 — New thing\n\nA new thing.') });
  f.advanceMain({ VERSION: '1.0.1\n' });
  const r = f.run(['finish']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^merged=no\nstale_version=1\.0\.1\nNEXT: another release took this number\. Run: node \.claude\/skills\/ship\/scripts\/ship\.mjs prepare --sync,/);
  assert.match(r.stderr, /^error=main reached 1\.0\.1 while this branch carried 1\.1\.0/m);
  assert.doesNotMatch(r.stdout, /SECRETS=|LIVE_LOOK=/);
  assert.doesNotMatch(f.calls(), /pr merge/);
});

test('a refused merge says whether a conflict or something else stopped it', t => {
  const f = fixture(t, { gh: { mergeRc: 1, mergeable: 'CONFLICTING' } });
  f.commit({ 'app.txt': 'two\n' });
  const conflict = f.run(['finish']);
  assert.equal(conflict.status, 1);
  assert.match(conflict.stdout, /^merged=no\nNEXT: the branch conflicts with the default branch\. Run: [^\n]*prepare --sync/);
  f.set('gh', { mergeRc: 1 });
  const other = f.run(['finish']);
  assert.equal(other.status, 1);
  assert.match(other.stdout, /^merged=no\nNEXT: not merged, and nothing was deleted\. Report the error above and stop\.$/m);
});

test('a failed live look hands the reason to one more build, and never fails the ship', t => {
  const f = fixture(t, { gh: { deployment: 'failure\t' } });
  f.commit({ '.github/workflows/deploy.yml': 'on: push\n' });
  const r = f.run(['finish']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /^LIVE_LOOK=failed\nREASON=the release did not finish: its deploy failed\nNEXT: it merged, but the live app is not right\.[^\n]*invoke apply once with REASON and URL[^\n]*no retry and no revert\.$/m);
  f.set('gh', { mergeCommit: '' });
  assert.match(f.run(['finish']).stdout, /^LIVE_LOOK=unknown\nREASON=the merge commit could not be read$/m);
});

test('bad arguments are refused; a changelog conflict keeps this branch\'s entry on top', t => {
  const f = fixture(t);
  for (const args of [[], ['publish'], ['prepare', 'extra'], ['prepare', '--change', 'a', '--no-change'], ['finish', '--sync']]) {
    assert.equal(f.run(args).status, 2, args.join(' '));
  }
  assert.equal(entryOnTop('# Log\n\n## Next (patch) — Mine\n\nMy fix.\n\n## 1.0.0 — First\n', '# Log\n\n## 1.0.1 — Theirs\n\n## 1.0.0 — First\n'),
    '# Log\n\n## Next (patch) — Mine\n\nMy fix.\n\n## 1.0.1 — Theirs\n\n## 1.0.0 — First\n');
  assert.equal(entryOnTop('# Log\n\n## Next (patch) — Mine\n', '# Log\n'), '# Log\n\n## Next (patch) — Mine\n');
  // Two entries of its own, or none, is not a mechanical resolution.
  assert.equal(entryOnTop('## A\n\n## B\n', '# Log\n'), null);
  assert.equal(entryOnTop('# Log\n', '# Log\n\n## 1.0.1 — Theirs\n'), null);
});

// ---------------------------------------------------------------------------
// The Artifacts route: the same two commands, with no GitHub to ask

const noGh = f => assert.doesNotMatch(f.calls(), /^gh /m, 'gh is never asked on an Artifacts install');
const TO_MAIN = /^git push origin [0-9a-f]{40}:refs\/heads\/main$/gm;

test('an Artifacts install: prepare reads main\'s own check run, and asks gh nothing', t => {
  const f = fixture(t, { artifacts: true });
  f.commit({ ...f.change('demo'), 'CHANGELOG.md': withEntry(NEXT_ENTRY), 'app.txt': 'two\n' });
  const r = f.run(['prepare']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.deepEqual(['BRANCH', 'DIRTY', 'AHEAD', 'DEFAULT_CHECKS', 'CHANGE', 'ARCHIVE', 'RELEASE', 'SYNC', 'REVIEW'].map(r.value),
    ['work', 'no', '1', 'ok', 'demo', ARCHIVE, '1.1.0 from 1.0.0', 'none', 'rebuilt']);
  assert.match(f.calls(), new RegExp(`^node artifacts-run\\.mjs result ${f.git('rev-parse', 'origin/main')} refs/heads/main$`, 'm'));
  assert.equal(f.read('VERSION'), '1.1.0\n');
  noGh(f);
  // A main whose run found no checks is `ok` too.
  const plain = fixture(t, { artifacts: true });
  plain.commit({ 'README.md': '# Project\n' });
  const none = plain.run(['prepare', '--no-change'], { MAIN_RESULT: 'NONE' });
  assert.equal(none.status, 0, `${none.stdout}${none.stderr}`);
  assert.deepEqual(['DEFAULT_CHECKS', 'CHANGE', 'ARCHIVE', 'RELEASE', 'SYNC'].map(none.value), ['ok', 'none', 'none', 'none', 'none']);
  noGh(plain);
});

test('an Artifacts install: a red or unread main stops prepare before any change is read', t => {
  const f = fixture(t, { artifacts: true });
  f.commit(f.change('demo'));
  // Main moved on the remote, and this checkout has not fetched it yet.
  const stale = f.git('rev-parse', 'origin/main');
  f.advanceMain({ 'other.txt': 'theirs\n' });
  const moved = f.git('rev-parse', 'origin/main');
  f.git('update-ref', 'refs/remotes/origin/main', stale);
  const failing = f.run(['prepare', '--change', 'demo'], { MAIN_RESULT: 'FAILURE' });
  assert.equal(failing.status, 6);
  assert.equal(failing.value('DEFAULT_CHECKS'), 'failure');
  assert.match(failing.stdout, /^NEXT: main's checks are failing\. Fix the default branch first/m);
  assert.match(f.calls(), new RegExp(`^node artifacts-run\\.mjs result ${moved} refs/heads/main$`, 'm'), 'main is fetched first, so the run read is the newest commit\'s');
  assert.doesNotMatch(f.calls(), new RegExp(`result ${stale} `));
  // Still running, missing, unreadable, or no answer at all: unverified, never passed.
  for (const [vars, word] of [[{ MAIN_RESULT: 'UNKNOWN' }, 'UNKNOWN'], [{ MAIN_RESULT: 'PENDING' }, 'PENDING'], [{ MAIN_RESULT: '' }, 'nothing'], [{ RESULT_RC: '1' }, 'nothing']]) {
    const r = f.run(['prepare', '--change', 'demo'], vars);
    assert.equal(r.status, 6, JSON.stringify(vars));
    assert.equal(r.value('DEFAULT_CHECKS'), 'unknown');
    assert.match(r.stderr, new RegExp(`^error=main's check run for ${moved.slice(0, 7)} reads ${word}, so it is unverified$`, 'm'));
    assert.match(r.stdout, /^NEXT: main's checks could not be read\. Report the message above and stop\.$/m);
  }
  // A main that can not be fetched names no run to read.
  f.git('remote', 'set-url', 'origin', join(f.dir, 'missing.git'));
  const unfetched = f.run(['prepare', '--change', 'demo']);
  assert.equal(unfetched.status, 6);
  assert.equal(unfetched.value('DEFAULT_CHECKS'), 'unknown');
  assert.match(unfetched.stderr, /^error=origin\/main could not be fetched, so its check run can not be named$/m);
  assert.doesNotMatch(f.calls(), /^(gh|openspec) /m);
  assert.equal(f.has('openspec/changes/demo'), true);
});

test('an Artifacts install: finish publishes without gh, and looks at the commit merge.sh names', t => {
  const f = fixture(t, { artifacts: true });
  f.commit({ 'app.txt': 'two\n' }, 'feat: a thing');
  f.git('push', '-q', '-u', 'origin', 'work');
  const r = f.run(['finish']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /^merged=yes\ncommit=[0-9a-f]{40}\nmain=SUCCESS\nbranch=deleted\nsynced=ref\n/);
  const commit = r.value('commit');
  assert.equal(f.git('rev-parse', 'origin/main'), commit, 'main moved forward to the publish commit');
  assert.equal(f.git('log', '-1', '--format=%s', commit), 'feat: a thing');
  assert.equal(f.git('show', `${commit}:app.txt`), 'two');
  assert.match(r.stdout, /^SECRETS=\{"primary":true,/m);
  assert.match(r.stdout, /^LIVE_LOOK=unknown\nREASON=nothing was released\nNEXT: it merged\. Report it is live, with REASON as one line\.$/m);
  const calls = f.calls();
  assert.equal(calls.match(TO_MAIN).length, 1);
  // The publish and the live look both read main's run for the commit= value; no pull request names it.
  assert.equal(calls.match(new RegExp(`^node artifacts-run\\.mjs live ${commit}$`, 'gm')).length, 2);
  assert.doesNotMatch(calls, /^git push .*(--force|\s-f\b|\s\+)/m, 'nothing is forced');
  assert.equal(f.git('ls-remote', '--heads', 'origin', 'work'), '');
  noGh(f);
});

test('an Artifacts install: a main that moved is not published onto, and NEXT says to bring it in', t => {
  const f = fixture(t, { artifacts: true });
  f.commit({ 'app.txt': 'two\n' });
  f.git('push', '-q', '-u', 'origin', 'work');
  f.advanceMain({ 'other.txt': 'theirs\n' });
  const r = f.run(['finish']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^merged=no\nmoved=yes\nNEXT: main moved since this branch was checked, so nothing was published\. Bring main in: node \.claude\/skills\/ship\/scripts\/ship\.mjs prepare --sync,[^\n]*Then invoke ordinary \/save, and rerun finish only on SUCCESS or NONE\.$/m);
  assert.match(r.stderr, /^error=main moved since this branch was checked/m);
  assert.doesNotMatch(r.stdout, /SECRETS=|LIVE_LOOK=/);
  assert.equal(f.calls().match(TO_MAIN), null);
  assert.notEqual(f.git('ls-remote', '--heads', 'origin', 'work'), '', 'the branch is kept');
  noGh(f);
  // A branch whose own checks did not pass is not published either, and gets the plain stop.
  const unchecked = f.run(['finish'], { RUN_RESULT: 'FAILURE' });
  assert.equal(unchecked.status, 1);
  assert.match(unchecked.stdout, /^merged=no\nNEXT: not merged, and nothing was deleted\. Report the error above and stop\.$/m);
  assert.match(unchecked.stderr, /only a checked commit is published/);
  assert.equal(f.calls().match(TO_MAIN), null);
  noGh(f);
});

test('an Artifacts install: a red or unread main after the publish stops, and nothing is pushed again', t => {
  for (const [live, word, why] of [
    ['failed', 'FAILURE', 'main\'s checks or deploy failed, so this change is not live: production keeps the last passing commit'],
    ['unknown', 'UNKNOWN', 'main\'s check run could not be read, so what is live is unverified'],
  ]) {
    const f = fixture(t, { artifacts: true });
    f.commit({ 'app.txt': 'two\n' });
    f.git('push', '-q', '-u', 'origin', 'work');
    const r = f.run(['finish'], { RUN_LIVE: live });
    assert.equal(r.status, 3, `${live}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, new RegExp(`^merged=yes\\ncommit=[0-9a-f]{40}\\nmain=${word}\\n`));
    assert.match(r.stdout, /^SECRETS=\{"primary":true,/m);
    assert.ok(r.stdout.endsWith(`LIVE_LOOK=unknown\nREASON=${why}\nNEXT: it is on main, but not shown to be live. Report REASON and the error above, and stop. Never push again to make main pass.\n`), r.stdout);
    assert.doesNotMatch(r.stdout, /invoke apply|Report it is live/);
    const calls = f.calls();
    assert.equal(calls.match(TO_MAIN).length, 1, 'one push to main, never a second');
    assert.equal(calls.match(/^node artifacts-run\.mjs live /gm).length, 1, 'the live look is not run');
    noGh(f);
  }
});

test('a route that can not be told stops prepare and finish, and neither falls back to GitHub', t => {
  // The install record names Artifacts, but origin is on GitHub.
  const f = fixture(t, { artifacts: true });
  f.commit({ 'app.txt': 'two\n' });
  f.git('push', '-q', '-u', 'origin', 'work');
  for (const command of ['prepare', 'finish']) {
    const r = f.run([command], { FAKE_REMOTE: 'https://github.com/team/repo.git' });
    assert.equal(r.status, 1, command);
    assert.match(r.stderr, /^error=the delivery route could not be told: the install record says artifacts, but origin is on github\.com$/m);
    assert.match(r.stdout, /^NEXT: origin and the install record disagree, so nothing ran\./m);
    assert.doesNotMatch(r.stdout, /DEFAULT_CHECKS=|merged=/);
  }
  assert.doesNotMatch(f.calls(), /^(gh|openspec|git push|git merge|node artifacts-run) /m);
  assert.notEqual(f.git('ls-remote', '--heads', 'origin', 'work'), '');
});
