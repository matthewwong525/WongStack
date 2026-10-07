#!/usr/bin/env node
// Portable customer checks. The caller supplies repository context; GitHub
// and hosted runners use this same entry point without provider credentials.
//
// Both routes also run the skill check, `scripts/check-skill-actions.mjs`, on
// every change, docs-only included: it only reads files, and a skill's text is
// Markdown the suite skips. The script ships with the Cloudflare pack, so a repo
// without the pack, or one that has not synced it yet, has none and skips it.
//
// In CI, where the checkout is thrown away, the suite compiles against binding
// types regenerated from the wrangler config (`scripts/cf-build.sh --types`), as
// the deploy build does: a binding the config has and the committed types lack
// fails here, never first in the deploy. The `--worktree` run leaves the
// committed file alone.
//
// When the change touches a check's settings, the suite's packages, or the proof
// itself, it also runs the suite's `test:checks` script, which hands each check a
// bad sample and fails when one lets it through. Other changes skip that proof and
// say so; a change with no base to compare runs it.
//
// The WongStack source repo also tests its app as an install receives it
// (`scripts/check-target-app.mjs`), on both runs, when the change touches the
// suite's folder or the list of shipped files. No install has that script.
//
// With `--worktree`, it checks the uncommitted work on this computer before the
// first push: the same suite, proof, loosened-check guard, and wiki check, scoped by
// `app-untouched.sh --worktree`. It installs only when `node_modules` is missing
// or older than the lockfile, and takes turns with other chats through one lock
// file. This run is a pre-check, never the gate: CI still decides. Its last line
// is `LOCAL_CHECKS=pass`, `fail (<parts>)`, or `not run (<reason>)`; exit 0, 1,
// or 7 (no tools here, or the turn never came).
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../.agents/skills/memory/scripts/lib/cli.mjs';
import { changedFiles, isSettings } from './check-settings.mjs';

const USAGE = `usage: node .github/scripts/checks.mjs --repo <path> --base <sha-or-empty> --head <sha> --default-branch <name> [--discover] [--summary <path>]
       node .github/scripts/checks.mjs --worktree [--repo <path>] [--default-branch <name>] [--only <parts>] [--lock-wait <seconds>]

Supply the whole-change base and exact checked-out head, never only the latest
commit's parent. An empty/unavailable base runs checks conservatively.
The default branch labels caller context; it does not select the base.
--discover  print scope and test-suite location as JSON; run no checks
--summary   append quality reports and the final summary to this file
--worktree  check the uncommitted work here, before a push; never the gate
--only      with --worktree, rerun only these: suite, proof, target, loosened, wiki, skills, payload, payload:<step>
--lock-wait with --worktree, seconds to wait for another chat's run (default 600)`;
const scripts = dirname(fileURLToPath(import.meta.url));
const SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const PART = /^(suite|proof|target|loosened|wiki|skills|payload(:[a-z-]+)?)$/;
const NO_TOOLS = 7;
// The suite's script that proves each of its checks still fails on a bad sample, and the file behind it.
const PROOF = 'test:checks';
const PROOF_SCRIPT = 'scripts/check-app-checks.mjs';
const PROOF_NOTE = {
  success: 'Each check was handed a bad sample and still fails on it.',
  failure: 'A check let a bad sample through, so it has stopped checking; see the `test:checks` output above.',
  unchanged: "The bad-sample proof skipped, because no check's settings or tools changed.",
  none: 'The bad-sample proof skipped, because the suite has no `test:checks` script.',
};
// The source repo's check of its app as an install receives it, and the list of shipped files it builds from.
const TARGET_SCRIPT = 'scripts/check-target-app.mjs';
const INVENTORY = '.agents/skills/wong-sync/references/payload-files.json';
const TARGET_NOTE = {
  success: 'The app also passes its tests as an install receives it.',
  failure: 'The app fails its tests as an install receives it; see the target app output above.',
  unchanged: 'The install-shaped test of the app skipped, because neither the app nor the list of shipped files changed.',
};
const parseScope = text => Object.fromEntries(text.trim().split('\n').map(line => line.split('=')));

function context(values) {
  for (const key of ['repo', 'base', 'head', 'default-branch']) {
    if (values[key] === undefined) usageError(USAGE, `missing --${key}`);
  }
  if (!SHA.test(values.head) || (values.base && !SHA.test(values.base)) || !values['default-branch'].trim()) {
    usageError(USAGE, 'give full commit SHAs and a default branch');
  }
  const repo = realpathSync(resolve(values.repo));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  if (realpathSync(git('rev-parse', '--show-toplevel')) !== repo || git('rev-parse', 'HEAD') !== values.head) {
    throw new Error('repository root or checked-out head does not match the supplied context');
  }
  const scope = execFileSync('bash', [join(scripts, 'app-untouched.sh'), '--base', values.base, '--head', values.head], {
    cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  });
  return { repo, defaultBranch: values['default-branch'], scope: parseScope(scope) };
}

function suiteDir(repo) {
  const dirs = ['', ...readdirSync(repo)
    .filter(name => name !== 'node_modules' && !name.startsWith('.')).sort()];
  for (const dir of dirs) {
    try {
      if (JSON.parse(readFileSync(join(repo, dir, 'package.json'), 'utf8')).scripts?.test) return join(repo, dir);
    } catch {
      // An absent or malformed package has no discoverable test script.
    }
  }
  return null;
}

/**
 * Whether this change calls for the proof: 'run' when it touches a check's settings, the
 * suite's packages, or the proof itself, and when there is no base to compare; 'unchanged'
 * when it touches none of them; 'none' when the suite has no `test:checks` script.
 */
function proofWanted(repo, dir, base, worktree) {
  if (!JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts[PROOF]) return 'none';
  if (!base) return 'run';
  const suite = relative(repo, dir);
  // A weekly dependency update moves a tool through these two files.
  const tools = [join(suite, 'package.json'), join(suite, 'package-lock.json'), PROOF_SCRIPT];
  const touched = changedFiles(worktree ? [base] : [base, 'HEAD'], worktree, repo)
    .some(({ path, from }) => [path, from].some(name => name && (isSettings(name) || tools.includes(name))));
  return touched ? 'run' : 'unchanged';
}

/**
 * Whether this change calls for the install-shaped test of the app: 'none' in any repo but the
 * WongStack source, 'run' when it touches the suite's folder, the list of shipped files, or the
 * check itself, and when there is no base to compare; else 'unchanged'.
 */
function targetWanted(repo, dir, base, worktree) {
  if (!existsSync(join(repo, TARGET_SCRIPT))) return 'none';
  if (!base) return 'run';
  const suite = `${relative(repo, dir)}/`;
  const touched = changedFiles(worktree ? [base] : [base, 'HEAD'], worktree, repo)
    .some(({ path, from }) => [path, from].some(name => name && (name.startsWith(suite) || name === INVENTORY || name === TARGET_SCRIPT)));
  return touched ? 'run' : 'unchanged';
}

function run(command, args, cwd, capture = false, env = process.env) {
  const result = spawnSync(command, args, {
    cwd, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) console.error(result.error.message);
  if (capture) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
  return { ok: result.status === 0, status: result.status, text: result.stdout ?? '', missing: result.error?.code === 'ENOENT' };
}

/** Install only when `node_modules` is missing or older than the lockfile: 'ok', 'no-npm', or 'failed'. */
export function ensureInstalled(dir) {
  const lock = join(dir, 'package-lock.json');
  const modules = join(dir, 'node_modules');
  const marker = existsSync(join(modules, '.package-lock.json')) ? join(modules, '.package-lock.json') : modules;
  if (existsSync(marker) && (!existsSync(lock) || statSync(marker).mtimeMs >= statSync(lock).mtimeMs)) return 'ok';
  const install = run('npm', ['ci', '--no-audit', '--no-fund'], dir);
  if (install.missing) return 'no-npm';
  return install.ok ? 'ok' : 'failed';
}

const alive = pid => {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
};

/** One run at a time on this computer. False when the turn has not come within `seconds`. */
function takeTurn(file, seconds) {
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    try {
      writeFileSync(file, `${process.pid}\n`, { flag: 'wx' });
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    let holder = '';
    try { holder = readFileSync(file, 'utf8').trim(); } catch { continue; }
    // A run that died left its file behind; a live one keeps its turn.
    if (!/^\d+$/.test(holder) || !alive(Number(holder))) {
      try { if (readFileSync(file, 'utf8').trim() === holder) rmSync(file, { force: true }); } catch { /* another run took it */ }
      continue;
    }
    if (Date.now() >= deadline) return false;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
}

/** The skill check, where the repo has it: a pass prints its one line, a failure its report under a heading. */
function skillCheck(repo) {
  const script = join(repo, 'scripts', 'check-skill-actions.mjs');
  if (!existsSync(script)) return { ok: true, text: '' };
  const result = spawnSync(process.execPath, [script, '--root', repo], { cwd: repo, encoding: 'utf8' });
  const ok = result.status === 0;
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  const text = ok ? `${output}\n` : `### Skill checks\n\n\`\`\`text\n${output}\n\`\`\`\n`;
  process.stdout.write(text);
  return { ok, text };
}

/**
 * Regenerate the binding types where the repo's pack can: the one function the deploy build calls.
 * A repo without the pack, or with one from before `--types`, skips it; the script itself skips a
 * repo with no wrangler config. Never fails the checks: the suite's own compile is the judge.
 */
function regenerateTypes(repo) {
  const script = join(repo, 'scripts', 'cf-build.sh');
  if (existsSync(script) && readFileSync(script, 'utf8').includes('"--types"')) run('bash', [script, '--types'], repo);
}

function checks({ repo, scope, dir }, summary) {
  const report = text => {
    console.log(text);
    if (summary) appendFileSync(summary, `${text}\n`);
  };
  let suite = 'skipped';
  let install = true;
  let proof = null;
  let target = 'none';
  if (dir) {
    install = run('npm', ['ci', '--no-audit', '--no-fund'], dir).ok;
    if (install) regenerateTypes(repo);
    if (install) suite = run('npm', ['test'], dir).ok ? 'success' : 'failure';
    if (install) proof = proofWanted(repo, dir, scope.base, false);
    if (proof === 'run') proof = run('npm', ['run', PROOF], dir).ok ? 'success' : 'failure';
    if (install) target = targetWanted(repo, dir, scope.base, false);
    if (target === 'run') target = run(process.execPath, [join(repo, TARGET_SCRIPT)], repo).ok ? 'success' : 'failure';
  } else if (scope.untouched !== 'true') {
    report('### No test suite yet\n\nNo `package.json` in this repo declares a `test` script, so there is nothing to run.\n\nAdd one — `/plan` includes a test task for any change that touches behavior — and this check runs it on every push.');
  }
  // Quality checks still run after install/test failure, including docs-only
  // changes. A red app suite must not hide a second actionable failure.
  const loosened = run(process.execPath, [join(scripts, 'loosened-checks.mjs'), '--base', scope.base], repo, true);
  if (summary) appendFileSync(summary, loosened.text);
  let wiki = { ok: true, text: '' };
  if (scope.wiki_affected !== 'false') {
    wiki = run(process.execPath, [join(scripts, 'wiki-links.mjs'), repo], repo, true);
    if (summary) appendFileSync(summary, wiki.text);
  }
  const skills = skillCheck(repo);
  if (summary) appendFileSync(summary, skills.text);
  let line = scope.untouched === 'true'
    ? 'The main app is untouched (only docs changed), so its suite did not run.'
    : dir ? `The main app changed, so its suite ran: ${suite}.` : 'The main app changed, but no test suite is declared.';
  if (!install) line = 'The main app changed, but installation failed, so its suite did not run.';
  if (proof) line += ` ${PROOF_NOTE[proof]}`;
  if (target !== 'none') line += ` ${TARGET_NOTE[target]}`;
  if (!loosened.ok) line += ' A check was loosened with no written reason; see Loosened checks above.';
  if (!wiki.ok) line += ' A wiki page has a broken link, is linked from nowhere, is too long, or lacks its title; see Wiki checks above.';
  if (scope.wiki_affected === 'false') line += ' The wiki check skipped, because no page or linked file changed.';
  if (!skills.ok) line += ' A skill reads a saved key or calls an action it does not list; see Skill checks above.';
  report(line);
  return install && suite !== 'failure' && proof !== 'failure' && target !== 'failure' && loosened.ok && wiki.ok && skills.ok;
}

/** The pre-check on this computer. Returns the exit code; prints one LOCAL_CHECKS line last. */
function localChecks(values) {
  for (const key of ['base', 'head', 'summary', 'discover']) {
    if (values[key] !== undefined) usageError(USAGE, `--worktree does not take --${key}`);
  }
  const parts = values.only?.split(',').map(part => part.trim()).filter(Boolean);
  if (parts && (!parts.length || parts.some(part => !PART.test(part)))) usageError(USAGE, '--only takes suite, proof, target, loosened, wiki, skills, payload, or payload:<step>');
  const wait = Number(values['lock-wait'] ?? 600);
  if (!Number.isFinite(wait) || wait < 0) usageError(USAGE, '--lock-wait is a number of seconds');
  const repo = realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: resolve(values.repo ?? '.'), encoding: 'utf8' }).trim());
  const env = { ...process.env, DEFAULT_BRANCH: values['default-branch']?.trim() || 'main' };
  const scope = parseScope(execFileSync('bash', [join(scripts, 'app-untouched.sh'), '--worktree'], {
    cwd: repo, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  }));
  const wants = name => !parts || parts.includes(name);
  const lock = process.env.WONG_CHECKS_LOCK || join(tmpdir(), 'wongstack-local-checks.lock');
  if (!takeTurn(lock, wait)) {
    console.log(`LOCAL_CHECKS=not run (another chat's checks held the turn for over ${wait} seconds)`);
    return NO_TOOLS;
  }
  process.on('exit', () => rmSync(lock, { force: true }));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130));

  const failed = [];
  const notRun = [];
  const dir = scope.untouched === 'true' ? null : suiteDir(repo);
  const proof = dir && wants('proof') ? proofWanted(repo, dir, scope.base, true) : null;
  const target = dir && wants('target') ? targetWanted(repo, dir, scope.base, true) : 'none';
  if (dir && (wants('suite') || proof === 'run' || target === 'run')) {
    const installed = ensureInstalled(dir);
    const test = installed === 'ok' && wants('suite') ? run('npm', ['test'], dir) : null;
    const proved = installed === 'ok' && proof === 'run' ? run('npm', ['run', PROOF], dir) : null;
    const shaped = installed === 'ok' && target === 'run' ? run(process.execPath, [join(repo, TARGET_SCRIPT)], repo) : null;
    const ran = result => result && !result.missing;
    if (installed === 'no-npm' || test?.missing || proved?.missing) notRun.push('npm is not installed');
    else if (installed === 'failed') notRun.push('the install failed');
    if (ran(test) && !test.ok) failed.push('suite');
    if (ran(proved) && !proved.ok) failed.push('proof');
    if (ran(proved)) console.log(PROOF_NOTE[proved.ok ? 'success' : 'failure']);
    // The check says so itself when it could not run here; that is not a failure of the change.
    if (shaped?.status === NO_TOOLS) notRun.push('the install-shaped test of the app could not run');
    else if (shaped) {
      if (!shaped.ok) failed.push('target');
      console.log(TARGET_NOTE[shaped.ok ? 'success' : 'failure']);
    }
  }
  if (proof === 'unchanged' || proof === 'none') console.log(PROOF_NOTE[proof]);
  if (target === 'unchanged') console.log(TARGET_NOTE.unchanged);
  if (wants('loosened') && !run(process.execPath, [join(scripts, 'loosened-checks.mjs'), '--worktree'], repo, true, env).ok) failed.push('loosened');
  if (wants('wiki') && scope.wiki_affected !== 'false' && !run(process.execPath, [join(scripts, 'wiki-links.mjs'), repo], repo, true).ok) failed.push('wiki');
  if (wants('skills') && !skillCheck(repo).ok) failed.push('skills');

  // The WongStack source repo lists its own static checks in one more script; no install has it.
  const extra = join(repo, 'scripts', 'payload-checks.mjs');
  const steps = parts?.filter(part => part.startsWith('payload:')).map(part => part.slice(8)) ?? [];
  if (existsSync(extra) && (wants('payload') || steps.length)) {
    const args = [extra, ...(scope.docs_only === 'true' ? ['--docs-only'] : []), ...(steps.length && !wants('payload') ? ['--only', steps.join(',')] : [])];
    const result = run(process.execPath, args, repo, true);
    const line = result.text.match(/^PAYLOAD_CHECKS=(.*)$/m)?.[1] ?? '';
    const names = line.match(/^fail \(([^)]*)\)/)?.[1].split(', ') ?? [];
    const reason = line.match(/not run \(([^)]*)\)/)?.[1];
    failed.push(...names.map(name => `payload:${name}`));
    if (reason) notRun.push(reason);
    if (!result.ok && !names.length && !reason) failed.push('payload');
  }

  const skipped = notRun.length ? `not run (${notRun.join('; ')})` : '';
  if (failed.length) {
    console.log(`LOCAL_CHECKS=fail (${failed.join(', ')})${skipped ? `; ${skipped}` : ''}`);
    console.log(`Repair, then rerun only what failed: node .github/scripts/checks.mjs --worktree --only ${failed.join(',')}`);
    return 1;
  }
  console.log(`LOCAL_CHECKS=${skipped || 'pass'}`);
  return skipped ? NO_TOOLS : 0;
}

function main() {
  const { values } = parseCli({ usage: USAGE, options: {
    repo: { type: 'string' }, base: { type: 'string' }, head: { type: 'string' },
    'default-branch': { type: 'string' }, discover: { type: 'boolean' }, summary: { type: 'string' },
    worktree: { type: 'boolean' }, only: { type: 'string' }, 'lock-wait': { type: 'string' },
  } });
  if (values.worktree) {
    process.exitCode = localChecks(values);
    return;
  }
  if (values.only !== undefined || values['lock-wait'] !== undefined) usageError(USAGE, '--only and --lock-wait need --worktree');
  const data = context(values);
  data.dir = data.scope.untouched === 'true' ? null : suiteDir(data.repo);
  if (values.discover) console.log(JSON.stringify(data));
  else if (!checks(data, values.summary)) process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  try { main(); } catch (error) { console.error(`Checks unavailable: ${error.message}`); process.exitCode = 1; }
}
