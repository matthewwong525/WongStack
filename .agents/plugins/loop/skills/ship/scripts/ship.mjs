#!/usr/bin/env node
// /ship's two mechanical halves, `prepare` and `finish`, each one command. The ship skill keeps the decisions; these
// run the rest through the existing scripts and the OpenSpec CLI. Exit codes: each `Stop(code, …)` below.
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../../scripts/lib/cli.mjs';
import { runCommand, slot, SLOT } from '../../../scripts/slot.mjs';
import { buildReview } from '../../plan/scripts/build-review.mjs';
import { checkpointEvidence } from '../../save/scripts/checkpoint-evidence.mjs';
import { askRoute, defaultBranch, firstLine, sh } from '../../save/scripts/checkpoint.mjs';

const USAGE = `usage: node ship.mjs prepare [--change <name> | --no-change] [--allow-others | --move-others] [--skip-specs] [--sync] [--store <id>]
       node ship.mjs finish

prepare  preflight, tasks check, validate, archive, number the release, sync, mark ready
  --change <name>  the change to archive; without it, the one change this branch touches or records
  --no-change      the branch needs no change record
  --allow-others   ship other active changes on this branch on purpose
  --move-others    push each other active change this branch adds to its own branch, then remove it from this one
  --skip-specs     archive without a spec update (the deltas already equal the main specs)
  --sync           merge the default branch in even when no release is behind it
finish   merge the gated pull request, run the project's after-merge part, look at the live app;
         in an app copy, publish through the app; on a local route, run the pre-check and merge on this computer`;

const here = dirname(fileURLToPath(import.meta.url));
const SELF = 'node .claude/skills/ship/scripts/ship.mjs';
// A route the profile owns runs through delivery-route.mjs's `run`, `node` by name as the shell scripts call it.
const routeArgs = (route, args) => [join(here, '..', '..', 'save', 'scripts', 'delivery-route.mjs'), 'run', route, ...args];
const MAIN_CHECKS = '.check_runs[] | [.name, .conclusion // "pending"] | @tsv';
// Dependabot's own update job attaches to the default branch's commit, and fails when a security
// fix has no version to move to. It is not one of the project's checks.
const NOT_OUR_CHECKS = new Set(['Dependabot']);

/** `ok`, `failure`, or '' (nothing to read) from `name<TAB>conclusion` lines of the default branch's check runs. */
export function mainVerdict(text) {
  const runs = String(text).split('\n').filter(Boolean).map(line => line.split('\t'));
  if (!runs.length) return '';
  const ours = runs.filter(([name]) => !NOT_OUR_CHECKS.has(name));
  return ours.some(([, conclusion]) => conclusion === 'failure' || conclusion === 'cancelled') ? 'failure' : 'ok';
}
const MECHANICAL = new Set(['CHANGELOG.md', 'VERSION']);

class Stop extends Error {
  constructor(code, lines) { super(lines[0]); this.code = code; this.lines = lines; }
}

const say = line => console.log(line);
const lines = text => text.split('\n').filter(Boolean);

function must(command, args, what) {
  const result = sh(command, args);
  if (result.status !== 0) throw new Stop(1, [`error=${what}: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`}`]);
  return result.stdout.trim();
}

const APP_NEXT = 'NEXT: this copy saves through the app and never publishes. Save the change with /save, then say the owner or an Admin publishes it; publish nothing, and never offer to.';

// `github`, `artifacts` or `app`; a route that can not be told stops the command. So does `app`, with `appCode`,
// for a person without the publish tick: their copy, installed through Connect, has nothing to prepare or merge.
async function routeOf(cwd, appCode) {
  const asked = await askRoute(cwd);
  if (asked.lines) throw new Stop(1, asked.lines);
  if (asked.route === 'app' && sh('node', routeArgs('app', ['can-publish'])).stdout.trim() !== 'yes') throw new Stop(appCode, [APP_NEXT]);
  return asked.route;
}

// What NEXT: prints for a check run that was cut off: start that same run again, then wait for it.
const RUN_AGAIN = 'node .claude/skills/save/scripts/delivery-route.mjs run artifacts';
const restartSteps = (sha, base) => `Start it again with \`${RUN_AGAIN} restart ${sha} refs/heads/${base}\`, then wait for it with \`${RUN_AGAIN} live ${sha}\`.`;

// The default branch's checks on an Artifacts install, in the shape of the gh answer prepare reads: `ok`, `failure`,
// `interrupted`, or nothing with the reason. The branch is fetched first, so an older commit's run never answers.
function artifactsDefaultChecks(base) {
  const fetch = sh('git', ['fetch', 'origin', base]);
  const sha = fetch.status === 0 ? sh('git', ['rev-parse', `origin/${base}`]).stdout.trim() : '';
  if (!sha) return { status: 1, stdout: '', stderr: `origin/${base} could not be fetched, so its check run can not be named` };
  // `node` by name, as the shell scripts beside this one call it.
  const read = sh('node', routeArgs('artifacts', ['result', sha, `refs/heads/${base}`]));
  const word = read.status === 0 ? read.stdout.trim() : '';
  const answer = { SUCCESS: 'ok', NONE: 'ok', FAILURE: 'failure', INTERRUPTED: 'interrupted' }[word] ?? '';
  return { status: 0, sha, stdout: answer, stderr: `${base}'s check run for ${sha.slice(0, 7)} reads ${word || 'nothing'}, so it is unverified` };
}

/** One OpenSpec CLI answer as JSON; a missing field is reported by the caller, never guessed. */
function openspecJson(args, store) {
  const text = must('openspec', [...args, '--json', ...(store ? ['--store', store] : [])], `openspec ${args.join(' ')}`);
  try { return JSON.parse(text); } catch { throw new Stop(1, [`error=openspec ${args.join(' ')} printed no JSON`]); }
}

// CHANGELOG.md with this branch's entry on top of the default branch's entries: the default branch's file, plus
// the one `## ` entry of `ours` it lacks. Null when that is not one entry.
export function entryOnTop(ours, theirs) {
  const mine = ours.split('\n');
  const base = theirs.split('\n');
  const known = new Set(base);
  const own = mine.flatMap((line, i) => (line.startsWith('## ') && !known.has(line) ? [i] : []));
  if (own.length !== 1) return null;
  const end = mine.findIndex((line, i) => i > own[0] && line.startsWith('## '));
  const block = mine.slice(own[0], end === -1 ? mine.length : end);
  while (block.at(-1) === '') block.pop();
  const top = base.findIndex(line => line.startsWith('## '));
  const at = top === -1 ? base.length : top;
  return [...base.slice(0, at), ...block, '', ...base.slice(at)].join('\n');
}

const unmerged = () => lines(must('git', ['diff', '--name-only', '--diff-filter=U'], 'cannot read the merge state'));

function conflictStop(files) {
  return new Stop(5, [...files.map(file => `CONFLICT=${file}`),
    `NEXT: resolve each file above as the union of intent (a merge, never a rebase), git add them, and rerun: ${SELF} prepare`]);
}

/** Merge the default branch in, `origin/<base>` or a local route's own. CHANGELOG.md and VERSION resolve by rule. */
function mergeDefault(root, ref) {
  const merge = sh('git', ['merge', '--no-edit', ref]);
  if (merge.status === 0) return;
  const files = unmerged();
  if (!files.length) {
    throw new Stop(5, [`error=git merge ${ref}: ${firstLine(merge.stderr) || firstLine(merge.stdout)}`,
      `NEXT: git did not start the merge, so nothing changed. Stage the intended files and commit them here, without pushing, then rerun: ${SELF} prepare --sync`]);
  }
  if (!files.every(file => MECHANICAL.has(file))) throw conflictStop(files);
  // Stage 2 is this branch's side and stage 3 the default branch's. VERSION takes the default
  // branch's, since numbering starts from it; CHANGELOG.md keeps this branch's entry on top.
  const side = (stage, file) => sh('git', ['show', `:${stage}:${file}`]).stdout;
  const resolved = files.map(file => [file, file === 'VERSION' ? side(3, file) : entryOnTop(side(2, file), side(3, file))]);
  if (resolved.some(([, text]) => !text)) throw conflictStop(files);
  for (const [file, text] of resolved) {
    writeFileSync(join(root, file), text);
    must('git', ['add', '--', file], 'git add');
  }
  must('git', ['commit', '--no-edit'], 'git commit of the merge');
}

/** number-release.mjs: its line on a pass, `behind` when the default branch must be merged first. */
function numberRelease(base) {
  const result = sh(process.execPath, [join(here, 'number-release.mjs'), ...(base ? ['--base', base] : [])]);
  if (result.status === 3) return { behind: true };
  if (result.status !== 0) throw new Stop(1, [`error=${firstLine(result.stderr) || `number-release.mjs exit ${result.status}`}`, 'NEXT: report this message and stop before /save.']);
  const line = firstLine(result.stdout);
  return { release: line === 'release=none' ? 'none' : line.replace(/^release=/, '').replace(' from=', ' from ') };
}

function archiveFolders(changesDir, name) {
  const dir = join(changesDir, 'archive');
  const dated = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  return existsSync(dir) ? readdirSync(dir).filter(entry => dated.test(entry)).map(entry => join(dir, entry)) : [];
}

/** The change to archive: the flag's, else the one this branch touches, records, or already archived. */
function selectChange(values, root, active) {
  if (values['no-change']) return null;
  if (values.change) return values.change;
  let evidence;
  try { evidence = checkpointEvidence({ repo: root }); } catch (error) { throw new Stop(1, [`error=${error.message}`]); }
  for (const candidates of [evidence.active, evidence.recorded]) {
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      throw new Stop(7, [`CANDIDATES=${candidates.join(',')}`, 'NEXT: ask which change to ship, with these as the options, then rerun with --change <name>.']);
    }
  }
  // A change an earlier run already archived on this branch: the rerun picks it up again.
  if (evidence.archive.length === 1) return evidence.archive[0].replace(/^\d{4}-\d{2}-\d{2}-/, '');
  throw new Stop(7, [`CANDIDATES=${active.join(',') || 'none'}`,
    'NEXT: no change is selected. Decide by /save\'s route table: code or a plan for code gets a change (rerun with --change <name>); anything else reruns with --no-change.']);
}

// Stages the change folder as it goes on `target`, its Branch line set, in the temporary worktree; returns its tree.
function stageMove(dir, root, changesDir, name, target) {
  const folder = join(dir, changesDir, name);
  rmSync(folder, { recursive: true, force: true });
  cpSync(join(root, changesDir, name), folder, { recursive: true });
  const proposal = join(folder, 'proposal.md');
  if (existsSync(proposal)) writeFileSync(proposal, readFileSync(proposal, 'utf8').replace(/^\*\*Branch:\*\*[^\r\n]*/m, `**Branch:** ${target}`));
  must('git', ['-C', dir, 'add', '-A', '--', join(changesDir, name)], `git add ${name}`);
  return must('git', ['-C', dir, 'write-tree', `--prefix=${join(changesDir, name)}/`], `git write-tree ${name}`);
}

// The change's own branch name, else with `-plan` added: a free one gets a push; one on origin whose head already
// holds exactly this folder is an earlier run's push, reused as it is, so a rerun never pushes a second copy.
function placeChange(dir, root, changesDir, name) {
  for (const target of [name, `${name}-plan`]) {
    if (sh('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${target}`]).status === 0) continue;
    const tree = stageMove(dir, root, changesDir, name, target);
    if (sh('git', ['ls-remote', '--exit-code', '--heads', 'origin', target]).status === 2) {
      must('git', ['-C', dir, 'commit', '-q', '-m', `plan: keep ${name} on its own branch`], `git commit ${name}`);
      must('git', ['-C', dir, 'push', '-q', 'origin', `HEAD:refs/heads/${target}`], `git push ${target}`);
      return target;
    }
    if (sh('git', ['-C', dir, 'fetch', '-q', 'origin', `refs/heads/${target}`]).status === 0
      && sh('git', ['-C', dir, 'rev-parse', `FETCH_HEAD:${join(changesDir, name)}`]).stdout.trim() === tree) return target;
  }
  throw new Stop(1, [`error=branches ${name} and ${name}-plan are both taken; move ${name} by hand`]);
}

// Each other change goes to its own pushed branch, made from the default branch in a temporary worktree so this
// checkout never switches. Only when every push worked are the folders put back to the default branch's state.
function moveOthers(root, base, changesDir, others) {
  must('git', ['fetch', 'origin', base], `git fetch origin ${base}`);
  for (const name of others) {
    const dir = mkdtempSync(join(tmpdir(), 'wong-move-'));
    try {
      must('git', ['worktree', 'add', '--quiet', '--detach', dir, `origin/${base}`], 'git worktree add');
      // Said at once, so a later push that fails still names this branch.
      say(`MOVED=${name}:${placeChange(dir, root, changesDir, name)}`);
    } finally {
      sh('git', ['worktree', 'remove', '--force', dir]);
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const folders = others.map(name => join(changesDir, name));
  for (const folder of folders) {
    rmSync(join(root, folder), { recursive: true, force: true });
    if (sh('git', ['cat-file', '-e', `origin/${base}:${folder}`]).status === 0) must('git', ['checkout', `origin/${base}`, '--', folder], `git checkout ${folder}`);
    must('git', ['add', '-A', '--', folder], `git add ${folder}`);
  }
  if (sh('git', ['diff', '--cached', '--quiet', '--', ...folders]).status !== 0) {
    must('git', ['commit', '-q', '-m', `plan: move ${others.join(', ')} to their own branches`, '--', ...folders], 'git commit of the moved plans');
  }
}

/** Tasks, artifacts, validation, then the archive itself. */
function archiveChange(name, values) {
  const store = values.store;
  const progress = openspecJson(['instructions', 'apply', '--change', name], store);
  if (!Array.isArray(progress.tasks)) throw new Stop(1, ['error=openspec instructions apply returned no tasks list; the CLI contract changed']);
  const open = progress.tasks.filter(task => !task.done);
  if (open.length) {
    throw new Stop(4, [...open.map(task => `UNCHECKED=${String(task.description).slice(0, 120)}`),
      `NEXT: invoke apply for ${name} inside /ship, then rerun this command. Still unchecked after that: report and stop.`]);
  }
  const status = openspecJson(['status', '--change', name], store);
  if (!status.planningHome?.changesDir || !Array.isArray(status.artifacts)) throw new Stop(1, ['error=openspec status returned no changesDir or artifacts; the CLI contract changed']);
  const unfinished = status.artifacts.filter(artifact => !['done', 'skipped'].includes(artifact.status)).map(artifact => artifact.id);
  if (unfinished.length) throw new Stop(1, [`error=${name} has unfinished artifacts: ${unfinished.join(', ')}`]);
  const storeArgs = store ? ['--store', store] : [];
  must('openspec', ['validate', name, '--type', 'change', '--strict', '--no-interactive', ...storeArgs], `openspec validate ${name}`);
  must('openspec', ['archive', name, '--yes', ...(values['skip-specs'] ? ['--skip-specs'] : []), ...storeArgs], `openspec archive ${name}`);
  return status.planningHome.changesDir;
}

/** `ready-to-ship` on the archived proposal, then its review page from that proposal. */
function markReady(archive) {
  const proposal = join(archive, 'proposal.md');
  if (existsSync(proposal)) {
    const text = readFileSync(proposal, 'utf8');
    const next = text.replace(/^\*\*Status:\*\*[^\r\n]*/m, '**Status:** ready-to-ship');
    if (next !== text) writeFileSync(proposal, next);
  }
  try {
    const result = buildReview(archive);
    return result.kind === 'no-page' ? 'no page' : result.changed ? 'rebuilt' : 'unchanged';
  } catch (error) {
    return `stale (${error.message})`;
  }
}

/** The project's pre-check command, from its profile's `precheck`; null when it names none. */
async function precheckOf(root, base) {
  const found = await slot('precheck', { base }, root);
  return found.empty ? null : found.value || null;
}

// The local pre-check on a tree the default branch was just merged into: the value of its last `LOCAL_CHECKS=`
// line, else pass or not run by its exit. Its output goes to stderr. It decides nothing, so it never stops prepare.
async function recheck(root, base) {
  const command = await precheckOf(root, base);
  if (!command) return 'not run (the project names no pre-check)';
  const run = sh('sh', ['-c', command], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  process.stderr.write(run.stdout);
  return run.stdout.match(/^LOCAL_CHECKS=(.*)$/gm)?.at(-1).slice('LOCAL_CHECKS='.length)
    ?? (run.status === 0 ? 'pass' : `not run (the pre-check exited ${run.status} with no LOCAL_CHECKS line)`);
}

/** A red or unreadable default branch stops every ship, a new intent included, before any build. */
function defaultChecks(artifacts, base, again = true) {
  const checks = artifacts ? artifactsDefaultChecks(base) : sh('gh', ['api', `repos/:owner/:repo/commits/${base}/check-runs`, '--jq', MAIN_CHECKS]);
  // An empty jq listing alone is ambiguous. Confirm a successful API read of
  // zero checks before using PR review, the existing gate for repos without CI.
  const emptyCount = !artifacts && checks.status === 0 && !checks.stdout.trim()
    ? sh('gh', ['api', `repos/:owner/:repo/commits/${base}/check-runs`, '--jq', '.total_count']) : null;
  const answer = checks.status !== 0 ? '' : artifacts ? checks.stdout.trim()
    : emptyCount?.status === 0 && emptyCount.stdout.trim() === '0' ? 'ok' : mainVerdict(checks.stdout);
  // A cut-off run is not a failure: start that same run once and wait for it, so the person has no step to take.
  if (answer === 'interrupted' && again) {
    say('DEFAULT_CHECKS=restarted');
    sh('node', routeArgs('artifacts', ['restart', checks.sha, `refs/heads/${base}`]));
    sh('node', routeArgs('artifacts', ['live', checks.sha]));
    return defaultChecks(artifacts, base, false);
  }
  say(`DEFAULT_CHECKS=${answer || 'unknown'}`);
  if (answer === 'failure') throw new Stop(6, [`NEXT: ${base}'s checks are failing. Fix the default branch first; ship nothing onto it.`]);
  // Cut off is not failing: nothing is wrong with the commit, and the same run can be started again.
  if (answer === 'interrupted') throw new Stop(6, [`NEXT: ${base}'s check run was cut off, not failed. ${restartSteps(checks.sha, base)} Rerun this command when that prints an address or none; on anything else, report it and stop.`]);
  if (answer !== 'ok' && artifacts) throw new Stop(6, [`error=${checks.stderr}`, `NEXT: ${base}'s checks could not be read. Report the message above and stop.`]);
  if (answer !== 'ok') throw new Stop(6, [`error=${firstLine(checks.stderr) || 'gh returned no answer'}`, `NEXT: ${base}'s checks could not be read. Report gh's message and stop.`]);
}

async function prepare(values) {
  const root = must('git', ['rev-parse', '--show-toplevel'], 'not inside a git repository');
  // Every git and OpenSpec call below sees the whole repo, whichever folder the command was started in.
  process.chdir(root);
  const branch = must('git', ['rev-parse', '--abbrev-ref', 'HEAD'], 'cannot read the current branch');
  const route = await routeOf(root, 8);
  const artifacts = route === 'artifacts';
  // A local route has no origin: the default branch is this computer's own.
  const local = route === 'local';
  const base = defaultBranch(route);
  const ref = local ? base : `origin/${base}`;

  // A merge an earlier run left for the agent to resolve is concluded here.
  let broughtIn = false;
  if (sh('git', ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD']).status === 0) {
    const files = unmerged();
    if (files.length) throw conflictStop(files);
    must('git', ['commit', '--no-edit'], 'git commit of the merge');
    broughtIn = true;
  }

  const dirty = must('git', ['status', '--porcelain'], 'git status') !== '';
  const ahead = Number(must('git', ['rev-list', '--count', `${ref}..HEAD`], `cannot compare with ${ref}`));
  say(`BRANCH=${branch}`);
  say(`DIRTY=${dirty ? 'yes' : 'no'}`);
  say(`AHEAD=${ahead}`);
  // The app reads this change's own checks before it publishes; a teammate's copy can not read main's.
  if (route === 'app') say('DEFAULT_CHECKS=not read (the app checks this change before it publishes)');
  else if (local) say('DEFAULT_CHECKS=not read (a local route has no checks; finish runs the pre-check)');
  else defaultChecks(artifacts, base);
  if (!dirty && (branch === base || ahead === 0)) {
    throw new Stop(3, ['NEXT: nothing to ship yet. Take the pull-in in the ship skill: invoke apply inside /ship, or say there is nothing to continue.']);
  }

  const active = openspecJson(['list'], values.store);
  if (!Array.isArray(active.changes) || !active.root?.path) throw new Stop(1, ['error=openspec list returned no changes or root; the CLI contract changed']);
  const names = active.changes.map(change => change.name);
  let evidence;
  try { evidence = checkpointEvidence({ repo: root, base: ref }); } catch (error) { throw new Stop(1, [`error=${error.message}`]); }
  const name = selectChange(values, root, names);
  // Only a change this branch adds or edits rides along; one the default branch already holds is not this merge's.
  const others = names.filter(other => other !== name && evidence.active.includes(other));
  if (others.length && values['move-others']) moveOthers(root, base, evidence.changesDir, others);
  else if (others.length && !values['allow-others']) {
    throw new Stop(7, [`OTHER_CHANGES=${others.join(',')}`,
      'NEXT: the merge would carry these active changes too. Rerun with --move-others to keep each on its own branch, unless the person asked to ship them all: then rerun with --allow-others.']);
  }

  let archive = null;
  if (name) {
    const changesDir = names.includes(name) ? archiveChange(name, values) : join(active.root.path, 'openspec', 'changes');
    const folders = archiveFolders(changesDir, name);
    if (folders.length !== 1) throw new Stop(1, [`error=expected one archive folder for ${name}, found ${folders.length}`]);
    [archive] = folders;
  }

  if (!local) must('git', ['fetch', 'origin', base], `git fetch origin ${base}`);
  let numbered = numberRelease(local && base);
  let synced = 'none';
  if (numbered.behind || (values.sync && sh('git', ['merge-base', '--is-ancestor', ref, 'HEAD']).status !== 0)) {
    mergeDefault(root, ref);
    broughtIn = true;
    synced = `merged ${ref}`;
    numbered = numberRelease(local && base);
    if (numbered.behind) throw new Stop(5, [`error=still behind ${ref} after the merge`]);
  }

  say(`CHANGE=${name ?? 'none'}`);
  say(`ARCHIVE=${archive ? relative(root, archive) : 'none'}`);
  say(`RELEASE=${numbered.release}`);
  say(`SYNC=${synced}`);
  if (archive) say(`REVIEW=${markReady(archive)}`);
  // What came in was checked by nobody here; the tree /save will commit is checked once, now.
  const checked = broughtIn ? await recheck(root, base) : '';
  if (broughtIn) say(`LOCAL_CHECKS=${checked}`);
  const failed = checked.match(/^fail \(([^)]*)\)/)?.[1].split(', ').join(',');
  const repair = failed ? `the local checks failed after ${base} came in. Repair what fails and rerun only that: node .github/scripts/checks.mjs --worktree --only ${failed}, three rounds at most. Then ` : '';
  const save = archive ? `with change ${name} and archive path ${relative(root, archive)} (mode archive)` : 'with no change';
  // A local save prints LOCAL and leaves no receipt to verify; finish reruns the pre-check before it merges.
  const then = local ? 'On LOCAL, skip /verify and run finish.' : 'Go on to /verify only on SUCCESS or NONE.';
  say(`NEXT: ${repair}invoke ordinary /save once, ${save}. ${then}`);
  return 0;
}

/** The merged pull request's commit, as GitHub names it. */
const mergeCommit = prNumber => (prNumber ? sh('gh', ['pr', 'view', prNumber, '--json', 'mergeCommit', '--jq', '.mergeCommit.oid']).stdout.trim() : '');

// The project's `liveLook` part, as its own process: the lines it prints.
function liveLook(commit) {
  if (!/^[0-9a-f]{40,64}$/.test(commit)) return 'LIVE_LOOK=unknown\nREASON=the merge commit could not be read';
  const look = sh(process.execPath, [SLOT, 'liveLook', commit]).stdout.trim();
  if (look === 'SLOT=liveLook empty') return 'LIVE_LOOK=skipped\nREASON=this project names no live look';
  return look || 'LIVE_LOOK=unknown\nREASON=the live look printed nothing';
}

// The app publishes the saved change once its checks passed; it refuses anything else and says why.
function publishThroughApp() {
  const sent = sh('node', routeArgs('app', ['publish']));
  process.stdout.write(sent.stdout);
  process.stderr.write(sent.stderr);
  if (sent.status !== 0) {
    say('NEXT: not published, and nothing changed. Report the line above and stop.');
    return 1;
  }
  say('NEXT: it is published. Report it goes live once the published version passes its checks.');
  return 0;
}

/** The change this branch archived, or null. Read before the merge, which may move this folder to main. */
function shippedChange(root, route) {
  try {
    const base = defaultBranch(route);
    const { archive } = checkpointEvidence({ repo: root, base: route === 'local' ? base : `origin/${base}` });
    return archive.length === 1 ? archive[0].replace(/^\d{4}-\d{2}-\d{2}-/, '') : null;
  } catch { return null; }
}

/** The project's `afterMerge` part, such as WongStack's secret edits and Inbox pages; never a failed ship. */
async function afterMerge(root, change) {
  try {
    const found = await slot('afterMerge', { change }, root);
    if (!found.empty && found.value) say(String(found.value));
  } catch (error) { say(`AFTER_MERGE=skipped (${firstLine(error.message) || 'it failed'})`); }
}

/** The worktree that has `branch` checked out, or null. */
function checkoutOf(branch) {
  const list = must('git', ['worktree', 'list', '--porcelain'], 'git worktree list').split('\n\n');
  const found = list.find(block => block.split('\n').includes(`branch refs/heads/${branch}`));
  return found ? found.split('\n')[0].replace(/^worktree /, '') : null;
}

// A local route: the pre-check on the saved branch, then one squash commit on the default branch, on this computer.
// The checkout that has the default branch takes it; with none, this one switches to it. Nothing is pushed.
async function finishLocal(root) {
  const branch = must('git', ['rev-parse', '--abbrev-ref', 'HEAD'], 'cannot read the current branch');
  const base = defaultBranch('local');
  if (branch === 'HEAD' || branch === base) throw new Stop(1, ['merged=no', `error=on ${branch === 'HEAD' ? 'a detached HEAD' : base}; nothing to merge`]);
  if (must('git', ['status', '--porcelain'], 'git status')) throw new Stop(1, ['merged=no', 'error=this checkout has unsaved work', 'NEXT: save it with /save, then rerun finish.']);
  const command = await precheckOf(root, base);
  const status = command ? runCommand(command, [], { cwd: root, stdio: ['ignore', 2, 2] }) : 0;
  say(`PRECHECK=${command ? (status === 0 ? 'pass' : `fail (exit ${status})`) : 'none (the project names no pre-check)'}`);
  if (status !== 0) throw new Stop(6, ['merged=no', 'NEXT: the pre-check failed, so nothing was merged. Fix what it shows, /save, then rerun finish.']);
  const shipped = shippedChange(root, 'local');
  const subject = must('git', ['log', '-1', '--format=%s'], 'cannot read the newest commit');
  const at = checkoutOf(base);
  if (at && must('git', ['-C', at, 'status', '--porcelain'], `git status in ${at}`)) {
    throw new Stop(1, ['merged=no', `error=the checkout of ${base} at ${at} has unsaved work`, 'NEXT: ask the person to save or put it aside there, then rerun finish.']);
  }
  const dir = at ?? root;
  if (!at) must('git', ['switch', '--quiet', base], `git switch ${base}`);
  const merge = sh('git', ['-C', dir, 'merge', '--squash', branch]);
  if (merge.status !== 0) {
    sh('git', ['-C', dir, 'reset', '--merge']);
    throw new Stop(5, ['merged=no', `error=git merge --squash ${branch}: ${firstLine(merge.stderr) || firstLine(merge.stdout)}`,
      `NEXT: ${base} moved and conflicts with this branch. Run: ${SELF} prepare --sync, /save, then finish again.`]);
  }
  must('git', ['-C', dir, 'commit', '--quiet', '-m', subject], 'git commit of the merge');
  say('merged=yes');
  say(`commit=${must('git', ['-C', dir, 'rev-parse', 'HEAD'], 'cannot read the merge commit')}`);
  await afterMerge(root, shipped);
  say(`NEXT: it merged into ${base} on this computer, and nothing was pushed. Report it, then ask before any push.`);
  return 0;
}

async function finish() {
  const root = must('git', ['rev-parse', '--show-toplevel'], 'not inside a git repository');
  const route = await routeOf(root, 1);
  if (route === 'app') return publishThroughApp();
  if (route === 'local') return finishLocal(root);
  const artifacts = route === 'artifacts';
  const shipped = shippedChange(root, route);
  const merge = sh('bash', [join(here, 'merge.sh')]);
  process.stdout.write(merge.stdout);
  process.stderr.write(merge.stderr);
  if (!/^merged=yes$/m.test(merge.stdout)) {
    const recover = `${SELF} prepare --sync, with the same --change or --no-change. Then invoke ordinary /save, and rerun finish only on SUCCESS or NONE.`;
    if (/^stale_version=/m.test(merge.stdout)) say(`NEXT: another release took this number. Run: ${recover}`);
    else if (artifacts && /^moved=yes$/m.test(merge.stdout)) say(`NEXT: main moved since this branch was checked, so nothing was published. Bring main in: ${recover}`);
    else if (!artifacts && sh('gh', ['pr', 'view', '--json', 'mergeable', '--jq', '.mergeable']).stdout.trim() === 'CONFLICTING') say(`NEXT: the branch conflicts with the default branch. Run: ${recover}`);
    else say('NEXT: not merged, and nothing was deleted. Report the error above and stop.');
    return merge.status || 1;
  }

  // Nothing below can fail the ship: the pull request is merged.
  await afterMerge(root, shipped);
  // An Artifacts publish that main's own run did not pass is not shown to be live: there is
  // nothing to look at, and another push would not make that run pass.
  if (artifacts && merge.status === 3) {
    const cutOff = /^main=INTERRUPTED$/m.test(merge.stdout);
    const why = /^main=FAILURE$/m.test(merge.stdout)
      ? 'main\'s checks or deploy failed, so this change is not live: production keeps the last passing commit'
      : cutOff ? 'main\'s check run was cut off, so this change is on main but not live yet'
        : 'main\'s check run could not be read, so what is live is unverified';
    say(`LIVE_LOOK=unknown\nREASON=${why}`);
    if (cutOff) say(`NEXT: it is on main, and its check run was cut off, not failed. ${restartSteps(merge.stdout.match(/^commit=([0-9a-f]+)$/m)?.[1] ?? '<commit>', 'main')} Report it live at the address that prints; on anything else, report REASON and stop. Never push again to make main pass.`);
    else say('NEXT: it is on main, but not shown to be live. Report REASON and the error above, and stop. Never push again to make main pass.');
    return merge.status;
  }
  const look = liveLook(artifacts ? merge.stdout.match(/^commit=([0-9a-f]+)$/m)?.[1] ?? '' : mergeCommit(merge.stdout.match(/^pr=(\d+)/m)?.[1]));
  say(look);
  const stays = artifacts ? 'The branch stays' : 'The branch and its stacked pull requests stay';
  const kept = merge.status === 2 ? ` ${stays}; report the error above.` : '';
  if (/^LIVE_LOOK=failed$/m.test(look)) say(`NEXT: it merged, but the live app is not right. Say what is not working, then invoke apply once with REASON and URL as the request; no retry and no revert.${kept}`);
  else say(`NEXT: it merged. Report it is live, with REASON as one line.${kept}`);
  return merge.status;
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, options: {
    change: { type: 'string' }, 'no-change': { type: 'boolean' }, 'allow-others': { type: 'boolean' }, 'move-others': { type: 'boolean' },
    'skip-specs': { type: 'boolean' }, sync: { type: 'boolean' }, store: { type: 'string' },
  } });
  const [command, ...extra] = positionals;
  if (!['prepare', 'finish'].includes(command) || extra.length) usageError(USAGE, 'give prepare or finish');
  if (values.change && values['no-change']) usageError(USAGE, '--change and --no-change exclude each other');
  if (values['allow-others'] && values['move-others']) usageError(USAGE, '--allow-others and --move-others exclude each other');
  if (command === 'finish' && Object.keys(values).length) usageError(USAGE, 'finish takes no options');
  try {
    process.exitCode = command === 'prepare' ? await prepare(values) : await finish();
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    for (const line of error.lines) (line.startsWith('error=') ? console.error : console.log)(line);
    process.exitCode = error.code;
  }
}
