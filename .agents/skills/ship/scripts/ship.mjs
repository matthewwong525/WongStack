#!/usr/bin/env node
/**
 * /ship's two mechanical halves, each one command. The ship skill keeps the decisions (the
 * pull-in, which change, several changes on one branch, a failed walk); these run the rest
 * through the existing scripts and the OpenSpec CLI.
 *
 *     node .claude/skills/ship/scripts/ship.mjs prepare [--change <name> | --no-change] \
 *       [--allow-others] [--skip-specs] [--sync] [--store <id>] [--schedule-record <reference>]
 *     node .claude/skills/ship/scripts/ship.mjs finish
 *
 * prepare: preflight (branch, uncommitted work, commits ahead, the default branch's checks),
 * the tasks check, `openspec status`, `validate --strict`, and `archive --yes`, one archive
 * folder, `git fetch`, number-release.mjs, a merge of the default branch when the release is
 * behind it (or with --sync), `ready-to-ship` on the archived proposal, and its review page.
 * It is safe to run again: an already archived change skips to the fetch. A run that merged the
 * default branch in then runs the local checks once (.github/scripts/checks.mjs --worktree), their
 * output on stderr; a failure changes NEXT: to a repair and never the exit code.
 * Prints CHANGE=, ARCHIVE=, RELEASE=, SYNC=, REVIEW=, LOCAL_CHECKS= after a merge, and NEXT:.
 *
 * finish: merge.sh (its lines printed unchanged), then worktree-secrets.mjs promote, then
 * live-look.sh on the merge commit. Prints SECRETS=, the live look's lines, and NEXT:.
 *
 * An Artifacts install (wiki/stack/artifacts-route.md) has no GitHub: delivery-route.mjs is asked
 * once a command, and on `artifacts` no gh call is made. prepare reads main's own check run;
 * finish takes the merge commit from merge.sh's `commit=` line, and a main that moved, failed, or
 * could not be read gets its own NEXT:. So does a main whose check run was cut off: that is not a
 * failure, and NEXT: names the command that starts the run again. A route that can not be told
 * stops either command.
 *
 * Exit codes of prepare:
 *   0  ready for /save            1  a step failed; its message is printed
 *   2  usage                      3  nothing to ship yet: the pull-in
 *   4  unchecked tasks            5  the default branch could not be merged in cleanly
 *   6  the default branch's checks are failing, unreadable, or were cut off
 *   7  the change to ship needs a decision: none selected, or other active changes ride along
 * finish exits with merge.sh's code: 0 merged, 1 not merged, 2 merged but the branch is kept,
 * and on an Artifacts install 3: published, but main's run failed or could not be read.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { buildReview } from '../../plan/scripts/build-review.mjs';
import { checkpointEvidence } from '../../save/scripts/checkpoint-evidence.mjs';
import { assertTerminalGoal, assertRecordScope, assertCodeScope, operationalChange, publishedGoal, recordPath, scheduleRecord } from '../../save/scripts/schedule-record.mjs';
import { askRoute, defaultBranch, firstLine, sh } from '../../save/scripts/checkpoint.mjs';

const USAGE = `usage: node ship.mjs prepare [--change <name> | --no-change] [--allow-others] [--skip-specs] [--sync] [--store <id>] [--schedule-record <reference>]
       node ship.mjs finish [--schedule-record <reference> --store <id>]

prepare  preflight, tasks check, validate, archive, number the release, sync, mark ready
  --change <name>  the change to archive; without it, the one change this branch touches or records
  --no-change      the branch needs no change record
  --allow-others   ship other active changes on this branch on purpose
  --skip-specs     archive without a spec update (the deltas already equal the main specs)
  --sync           merge the default branch in even when no release is behind it
finish   merge the gated pull request, promote secret edits, look at the live app`;

const here = dirname(fileURLToPath(import.meta.url));
const SELF = 'node .claude/skills/ship/scripts/ship.mjs';
const ARTIFACTS_RUN = join(here, '..', '..', 'save', 'scripts', 'artifacts-run.mjs');
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

/** `github` or `artifacts`; a route that can not be told stops the command. */
function routeOf(cwd) {
  const asked = askRoute(cwd);
  if (asked.lines) throw new Stop(1, asked.lines);
  return asked.route;
}

// What NEXT: prints for a check run that was cut off: start that same run again, then wait for it.
const RUN_AGAIN = 'node .claude/skills/save/scripts/artifacts-run.mjs';
const restartSteps = (sha, base) => `Start it again with \`${RUN_AGAIN} restart ${sha} refs/heads/${base}\`, then wait for it with \`${RUN_AGAIN} live ${sha}\`.`;

/**
 * The default branch's checks on an Artifacts install, in the shape of the gh answer prepare reads:
 * `ok` for a run that passed or found no checks, `failure` for a red one, `interrupted` for one
 * that was cut off, and nothing, with the reason, for a run that is still going, missing, or unreadable. The branch is fetched first, so
 * an older commit's run never answers for the one a publish would land on.
 */
function artifactsDefaultChecks(base) {
  const fetch = sh('git', ['fetch', 'origin', base]);
  const sha = fetch.status === 0 ? sh('git', ['rev-parse', `origin/${base}`]).stdout.trim() : '';
  if (!sha) return { status: 1, stdout: '', stderr: `origin/${base} could not be fetched, so its check run can not be named` };
  // `node` by name, as the shell scripts beside this one call it.
  const read = sh('node', [ARTIFACTS_RUN, 'result', sha, `refs/heads/${base}`]);
  const word = read.status === 0 ? read.stdout.trim() : '';
  const answer = { SUCCESS: 'ok', NONE: 'ok', FAILURE: 'failure', INTERRUPTED: 'interrupted' }[word] ?? '';
  return { status: 0, sha, stdout: answer, stderr: `${base}'s check run for ${sha.slice(0, 7)} reads ${word || 'nothing'}, so it is unverified` };
}

/** One OpenSpec CLI answer as JSON; a missing field is reported by the caller, never guessed. */
function openspecJson(args, store) {
  const text = must('openspec', [...args, '--json', ...(store ? ['--store', store] : [])], `openspec ${args.join(' ')}`);
  try { return JSON.parse(text); } catch { throw new Stop(1, [`error=openspec ${args.join(' ')} printed no JSON`]); }
}

/**
 * CHANGELOG.md with this branch's entry on top of the default branch's entries: the default
 * branch's file, plus the one `## ` entry of `ours` it lacks. Null when that is not one entry.
 */
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

/** Merge the default branch in. CHANGELOG.md and VERSION resolve by rule; any other conflict stops. */
function mergeDefault(root, base) {
  const merge = sh('git', ['merge', '--no-edit', `origin/${base}`]);
  if (merge.status === 0) return;
  const files = unmerged();
  if (!files.length) {
    throw new Stop(5, [`error=git merge origin/${base}: ${firstLine(merge.stderr) || firstLine(merge.stdout)}`,
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
function numberRelease() {
  const result = sh(process.execPath, [join(here, 'number-release.mjs')]);
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
  if ((values.change ?? '').startsWith('schedules/')) throw new Stop(1, ['error=routine definitions require --schedule-record, never --change']);
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

/** Tasks, artifacts, validation, then the archive itself. */
function archiveChange(name, values) {
  const store = values.store;
  if (name.startsWith('schedules/')) throw new Stop(1, ['error=routine definitions require --schedule-record, never --change']);
  const progress = openspecJson(['instructions', 'apply', '--change', name], store);
  if (!Array.isArray(progress.tasks)) throw new Stop(1, ['error=openspec instructions apply returned no tasks list; the CLI contract changed']);
  const open = progress.tasks.filter(task => !task.done);
  if (open.length) {
    throw new Stop(4, [...open.map(task => `UNCHECKED=${String(task.description).slice(0, 120)}`),
      `NEXT: invoke apply for ${name} inside /ship, then rerun this command. Still unchecked after that: report and stop.`]);
  }
  const status = openspecJson(['status', '--change', name], store);
  if (status.schemaName === 'scheduled-work') throw new Stop(1, ['error=scheduled goals require --schedule-record; ordinary archive refused']);
  if (!status.planningHome?.changesDir || !Array.isArray(status.artifacts)) throw new Stop(1, ['error=openspec status returned no changesDir or artifacts; the CLI contract changed']);
  const unfinished = status.artifacts.filter(artifact => !['done', 'skipped'].includes(artifact.status)).map(artifact => artifact.id);
  if (unfinished.length) throw new Stop(1, [`error=${name} has unfinished artifacts: ${unfinished.join(', ')}`]);
  const storeArgs = store ? ['--store', store] : [];
  must('openspec', ['validate', name, '--strict', '--no-interactive', ...storeArgs], `openspec validate ${name}`);
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

/**
 * The local pre-check on a tree the default branch was just merged into: the value of its last
 * `LOCAL_CHECKS=` line. Its output goes to stderr. It decides nothing, so it never stops prepare.
 */
function recheck(root, base) {
  const script = join(root, '.github', 'scripts', 'checks.mjs');
  if (!existsSync(script)) return 'not run (this repo has no .github/scripts/checks.mjs)';
  const run = sh(process.execPath, [script, '--worktree', '--default-branch', base], { stdio: ['ignore', 'pipe', 'inherit'] });
  process.stderr.write(run.stdout);
  return run.stdout.match(/^LOCAL_CHECKS=(.*)$/gm)?.at(-1).slice('LOCAL_CHECKS='.length)
    ?? `not run (checks.mjs exited ${run.status} with no LOCAL_CHECKS line)`;
}

async function prepare(values) {
  const root = must('git', ['rev-parse', '--show-toplevel'], 'not inside a git repository');
  // Every git and OpenSpec call below sees the whole repo, whichever folder the command was started in.
  process.chdir(root);
  const branch = must('git', ['rev-parse', '--abbrev-ref', 'HEAD'], 'cannot read the current branch');
  const route = routeOf(root);
  const artifacts = route === 'artifacts';
  const base = defaultBranch(route);

  // A merge an earlier run left for the agent to resolve is concluded here.
  let broughtIn = false;
  if (sh('git', ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD']).status === 0) {
    const files = unmerged();
    if (files.length) throw conflictStop(files);
    must('git', ['commit', '--no-edit'], 'git commit of the merge');
    broughtIn = true;
  }

  const dirty = must('git', ['status', '--porcelain'], 'git status') !== '';
  const ahead = Number(must('git', ['rev-list', '--count', `origin/${base}..HEAD`], `cannot compare with origin/${base}`));
  say(`BRANCH=${branch}`);
  say(`DIRTY=${dirty ? 'yes' : 'no'}`);
  say(`AHEAD=${ahead}`);
  // A red or unreadable default branch stops every ship, a new intent included, before any build.
  const checks = artifacts ? artifactsDefaultChecks(base) : sh('gh', ['api', `repos/:owner/:repo/commits/${base}/check-runs`, '--jq', MAIN_CHECKS]);
  // An empty jq listing alone is ambiguous. Confirm a successful API read of
  // zero checks before using PR review, the existing gate for repos without CI.
  const emptyCount = !artifacts && checks.status === 0 && !checks.stdout.trim()
    ? sh('gh', ['api', `repos/:owner/:repo/commits/${base}/check-runs`, '--jq', '.total_count']) : null;
  const answer = checks.status !== 0 ? '' : artifacts ? checks.stdout.trim()
    : emptyCount?.status === 0 && emptyCount.stdout.trim() === '0' ? 'ok' : mainVerdict(checks.stdout);
  say(`DEFAULT_CHECKS=${answer || 'unknown'}`);
  if (answer === 'failure') throw new Stop(6, [`NEXT: ${base}'s checks are failing. Fix the default branch first; ship nothing onto it.`]);
  // Cut off is not failing: nothing is wrong with the commit, and the same run can be started again.
  if (answer === 'interrupted') throw new Stop(6, [`NEXT: ${base}'s check run was cut off, not failed. ${restartSteps(checks.sha, base)} Rerun this command when that prints an address or none; on anything else, report it and stop.`]);
  if (answer !== 'ok' && artifacts) throw new Stop(6, [`error=${checks.stderr}`, `NEXT: ${base}'s checks could not be read. Report the message above and stop.`]);
  if (answer !== 'ok') throw new Stop(6, [`error=${firstLine(checks.stderr) || 'gh returned no answer'}`, `NEXT: ${base}'s checks could not be read. Report gh's message and stop.`]);
  if (!dirty && (branch === base || ahead === 0)) {
    throw new Stop(3, ['NEXT: nothing to ship yet. Take the pull-in in the ship skill: invoke apply inside /ship, or say there is nothing to continue.']);
  }

  let selectedRecord = null;
  const recordReference = values['schedule-record'] ?? values['archive-record'];
  if (recordReference) {
    try { selectedRecord = await scheduleRecord({ root, reference: recordReference, store: values.store, base: `origin/${base}` });
      if (values['archive-record']) {
        assertTerminalGoal(selectedRecord);
        if (selectedRecord.archived) throw new Error('select the active goal for --archive-record; publish an existing archive with --schedule-record');
        const archived = openspecJson(['archive', selectedRecord.name, '--yes', '--skip-specs'], values.store);
        if (!archived.archive?.path || archived.archive.change !== selectedRecord.name || archived.archive.specsUpdated !== false) throw new Error('OpenSpec returned no exact archive path or unexpectedly updated capability specs');
        values['schedule-record'] = recordPath(root, archived.archive.path);
        const loader = (await import('../../schedule/scripts/lib/records.mjs')).loadRecord;
        const terminal = await loader(root, values['schedule-record'], { store: values.store });
        if (!terminal.archived || terminal.binding.record !== selectedRecord.reference) throw new Error('archive identity does not match the selected goal');
        const files = [...terminal.files, ...selectedRecord.files];
        assertRecordScope({ ...terminal, files }, checkpointEvidence({ repo: root, base: `origin/${base}` }));
        must('git', ['add', '--', ...files], 'stage only the selected archived goal and removals');
        selectedRecord = await scheduleRecord({ root, reference: values['schedule-record'], store: values.store, base: `origin/${base}` });
      }
    } catch (error) { throw new Stop(1, [`error=schedule record: ${error.message}`]); }
  }
  const active = selectedRecord ? null : openspecJson(['list'], values.store);
  if (active && (!Array.isArray(active.changes) || !active.root?.path)) throw new Stop(1, ['error=openspec list returned no changes or root; the CLI contract changed']);
  const names = [];
  const goalRoots = [];
  for (const change of active?.changes ?? []) {
    const status = openspecJson(['status', '--change', change.name], values.store);
    const operational = status.schemaName === 'scheduled-work';
    if (operational && status.changeRoot) goalRoots.push(recordPath(root, status.changeRoot));
    if (operational && values.change === change.name) throw new Stop(1, ['error=scheduled goals require --schedule-record; ordinary code ship refused']);
    if (operational && status.changeRoot && publishedGoal(root, status.changeRoot)) continue;
    names.push(change.name);
  }
  if (!selectedRecord) {
    try {
      const evidence = checkpointEvidence({ repo: root, base: `origin/${base}` });
      assertCodeScope(evidence, [...goalRoots, ...evidence.operationalRoots]);
    }
    catch (error) { throw new Stop(1, [`error=${error.message}`]); }
  }
  const name = selectedRecord ? null : selectChange(values, root, names);
  const others = names.filter(other => other !== name);
  if (others.length && !values['allow-others']) {
    throw new Stop(7, [`OTHER_CHANGES=${others.join(',')}`,
      'NEXT: the merge would carry these active changes too. Ask: move the others off the branch (Recommended), or ship all on purpose (rerun with --allow-others).']);
  }

  let archive = null;
  if (name) {
    const changesDir = names.includes(name) ? archiveChange(name, values) : join(active.root.path, 'openspec', 'changes');
    const folders = archiveFolders(changesDir, name);
    if (folders.length !== 1) throw new Stop(1, [`error=expected one archive folder for ${name}, found ${folders.length}`]);
    [archive] = folders;
    if (operationalChange(root, archive)) throw new Stop(1, ['error=scheduled goal archives require --schedule-record; ordinary code ship refused']);
  }

  must('git', ['fetch', 'origin', base], `git fetch origin ${base}`);
  let numbered = selectedRecord ? { release: 'none' } : numberRelease();
  let synced = 'none';
  if (numbered.behind || (values.sync && sh('git', ['merge-base', '--is-ancestor', `origin/${base}`, 'HEAD']).status !== 0)) {
    mergeDefault(root, base);
    broughtIn = true;
    synced = `merged origin/${base}`;
    numbered = selectedRecord ? { release: 'none' } : numberRelease();
    if (numbered.behind) throw new Stop(5, [`error=still behind origin/${base} after the merge`]);
  }

  if (selectedRecord) {
    try { await scheduleRecord({ root, reference: values['schedule-record'], store: values.store, base: `origin/${base}` }); }
    catch (error) { throw new Stop(1, [`error=schedule record after sync: ${error.message}`]); }
    say(`SCHEDULE_RECORD=${selectedRecord.reference}`);
  }
  say(`CHANGE=${name ?? 'none'}`);
  say(`ARCHIVE=${selectedRecord?.archived ? selectedRecord.reference : archive ? relative(root, archive) : 'none'}`);
  say(`RELEASE=${numbered.release}`);
  say(`SYNC=${synced}`);
  if (archive) say(`REVIEW=${markReady(archive)}`);
  // What came in was checked by nobody here; the tree /save will commit is checked once, now.
  const local = broughtIn ? recheck(root, base) : '';
  if (broughtIn) say(`LOCAL_CHECKS=${local}`);
  const failed = local.match(/^fail \(([^)]*)\)/)?.[1].split(', ').join(',');
  const repair = failed ? `the local checks failed after ${base} came in. Repair what fails and rerun only that: node .github/scripts/checks.mjs --worktree --only ${failed}, three rounds at most. Then ` : '';
  const save = selectedRecord ? `with --schedule-record ${selectedRecord.reference}${values.store ? ` --store ${values.store}` : ''}, preserving its lifecycle` : archive ? `with change ${name} and archive path ${relative(root, archive)} (mode archive)` : 'with no change';
  say(`NEXT: ${repair}invoke ordinary /save once, ${save}. Go on to /verify only on SUCCESS or NONE.`);
  return 0;
}

/** The merged pull request's commit, as GitHub names it. */
const mergeCommit = prNumber => (prNumber ? sh('gh', ['pr', 'view', prNumber, '--json', 'mergeCommit', '--jq', '.mergeCommit.oid']).stdout.trim() : '');

function liveLook(commit) {
  if (!/^[0-9a-f]{40,64}$/.test(commit)) return 'LIVE_LOOK=unknown\nREASON=the merge commit could not be read';
  const look = sh('bash', [join(here, 'live-look.sh'), commit]);
  return look.stdout.trim() || 'LIVE_LOOK=unknown\nREASON=the live look printed nothing';
}

async function finish(values) {
  const root = must('git', ['rev-parse', '--show-toplevel'], 'not inside a git repository');
  const route = routeOf(root);
  if (values['schedule-record']) {
    try { await scheduleRecord({ root, reference: values['schedule-record'], store: values.store, base: `origin/${defaultBranch(route)}` }); }
    catch (error) { throw new Stop(1, [`error=schedule record before merge: ${error.message}`]); }
  } else {
    try {
      const evidence = checkpointEvidence({ repo: root, base: `origin/${defaultBranch(route)}` });
      assertCodeScope(evidence, evidence.operationalRoots);
    } catch (error) { throw new Stop(1, [`error=${error.message}`]); }
  }
  const artifacts = route === 'artifacts';
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
  const secrets = sh(process.execPath, [join(here, 'worktree-secrets.mjs'), 'promote']);
  let promoted;
  try { promoted = JSON.stringify(JSON.parse(secrets.stdout)); } catch { promoted = `error (${firstLine(secrets.stderr) || `exit ${secrets.status}`})`; }
  say(`SECRETS=${promoted}`);
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
    change: { type: 'string' }, 'no-change': { type: 'boolean' }, 'allow-others': { type: 'boolean' },
    'skip-specs': { type: 'boolean' }, sync: { type: 'boolean' }, store: { type: 'string' }, 'schedule-record': { type: 'string' }, 'archive-record': { type: 'string' },
  } });
  const [command, ...extra] = positionals;
  if (!['prepare', 'finish'].includes(command) || extra.length) usageError(USAGE, 'give prepare or finish');
  if (values.change && values['no-change']) usageError(USAGE, '--change and --no-change exclude each other');
  if (values['schedule-record'] && values['archive-record']) usageError(USAGE, '--schedule-record and --archive-record exclude each other');
  if ((values['schedule-record'] || values['archive-record']) && ['change', 'no-change', 'allow-others', 'skip-specs'].some(key => values[key])) usageError(USAGE, 'record delivery excludes ordinary code selection flags');
  if (command === 'finish' && Object.keys(values).some(key => !['schedule-record', 'store'].includes(key))) usageError(USAGE, 'finish only takes --schedule-record and --store');
  if (command === 'finish' && values.store && !values['schedule-record']) usageError(USAGE, '--store needs --schedule-record');
  try {
    process.exitCode = command === 'prepare' ? await prepare(values) : await finish(values);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    for (const line of error.lines) (line.startsWith('error=') ? console.error : console.log)(line);
    process.exitCode = error.code;
  }
}
