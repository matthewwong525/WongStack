#!/usr/bin/env node
/**
 * One /save checkpoint, after the agent has staged the files: review page, scan, commit, push,
 * pull request, check wait, failing logs, receipt, and preview, in one command. The save skill keeps the
 * judgment (which files, the handoff, the message and summary); this runs the rest, and every
 * step it runs is an existing save script or one git or gh call.
 *
 *     node .claude/skills/save/scripts/checkpoint.mjs --message-file <file> --summary-file <file> \
 *       [--change-root <path> --mode active|archive] [--scan-keys NAME,NAME] [--max-minutes 20] [--new-run]
 *     node .claude/skills/save/scripts/checkpoint.mjs --wait [--max-minutes 20]
 *
 * Both files sit outside the repo. The message's first line titles a new pull request.
 * `--wait` commits and pushes nothing: it reads the gate again for the pushed head, after a
 * TIMEOUT or a rerun of a check that failed outside the diff.
 *
 * Prints key=value lines (SAVE_HEAD, PR_URL, PREVIEW_URL, RECEIPT, ATTEMPT), each failing check
 * with the tail of its log, one NEXT: line saying what to do, and SAVE_GATE_RESULT= last.
 *
 * Exit codes:
 *   0  the checkpoint ran; SAVE_GATE_RESULT is the answer
 *   1  a git or gh step failed; its error is printed and nothing after it ran
 *   2  usage
 *   3  the pull request is CLOSED and not merged: ask, reopen or a fresh branch
 *   4  nothing to save, or HEAD is the default branch or detached
 *   5  a handled credential's value is in the staged files, the message, or the summary
 *   6  the three fix attempts of this /save run are spent
 *
 * The fix count is kept per branch beside the receipt, outside the repo. It starts again after a
 * SUCCESS or NONE, or with --new-run, which each /save run after a spent cap and each /verify
 * re-walk passes.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../../memory/scripts/lib/store.mjs';
import { buildReview } from '../../plan/scripts/build-review.mjs';
import { liveFiles } from '../../ship/scripts/worktree-secrets.mjs';
import { writePrBody } from './render-pr-body.mjs';

const USAGE = `usage: node checkpoint.mjs --message-file <file> --summary-file <file>
         [--change-root <path> --mode active|archive] [--scan-keys NAME,NAME]
         [--max-minutes 20] [--new-run]
       node checkpoint.mjs --wait [--max-minutes 20]

Rebuild the change's review page, commit the staged files, push, open or update
the pull request, wait for checks, and print the result, each failing check's
log tail, the receipt, and the preview.
--wait     read the gate again for the pushed head; commit and push nothing
--new-run  start the three-fix count again (a new /save run, or a /verify re-walk)`;

const here = dirname(fileURLToPath(import.meta.url));
const CAP = 3;
const LOG_LINES = 60;
const RERUN = 'node .claude/skills/save/scripts/checkpoint.mjs';
const NO_CHANGE_FOOTER = '\n\n---\n_No change record was needed for this edit. `/ship` publishes it._\n';

class Stop extends Error {
  constructor(code, lines) { super(lines[0]); this.code = code; this.lines = lines; }
}

const say = line => console.log(line);
export const firstLine = text => String(text ?? '').trim().split('\n')[0];

export function sh(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? result.error?.message ?? '' };
}

function must(command, args, what) {
  const result = sh(command, args);
  if (result.status !== 0) throw new Stop(1, [`error=${what}: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`}`]);
  return result.stdout.trim();
}

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

/** `main`, unless neither a local nor a remote `main` exists; then what GitHub names. */
export function defaultBranch() {
  for (const ref of ['refs/remotes/origin/main', 'refs/heads/main']) {
    if (sh('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0) return 'main';
  }
  const named = sh('gh', ['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name']);
  return named.status === 0 && named.stdout.trim() ? named.stdout.trim() : 'main';
}

/** A file the agent wrote outside the repo; the command deletes it when the run ends. */
function outsideFile(root, path, flag) {
  if (!existsSync(path)) usageError(USAGE, `${flag}: no such file`);
  const file = realpathSync(resolve(path));
  const inside = relative(realpathSync(root), file);
  if (!inside.startsWith('..') && !isAbsolute(inside)) usageError(USAGE, `${flag} must be a file outside the repo`);
  return file;
}

/** Nonempty live values of the named keys, from every live secrets file of both checkouts. */
function liveValues(root, keys) {
  let primary = root;
  try { primary = primaryRoot(root).primary; } catch { /* a bare repo's worktree: scan this checkout */ }
  const values = new Set();
  const found = new Set();
  for (const dir of new Set([primary, root])) {
    for (const rel of liveFiles(dir)) {
      const env = parseEnv(readFileSync(join(dir, rel), 'utf8'));
      for (const key of keys) {
        if (!env[key]) continue;
        found.add(key);
        values.add(env[key]);
      }
    }
  }
  return { values: [...values], missing: keys.filter(key => !found.has(key)) };
}

/** Stop when a handled value is staged, or sits in a text that is about to be published. */
function scanCredentials(root, keys, texts) {
  const { values, missing } = liveValues(root, keys);
  if (missing.length) say(`SCAN_NO_VALUE=${missing.join(',')}`);
  if (!values.length) return;
  const grep = sh('git', ['grep', '--cached', '-l', '-F', '-f', '-'], { input: `${values.join('\n')}\n` });
  if (grep.status > 1) throw new Stop(1, [`error=the credential scan could not run: ${firstLine(grep.stderr)}`]);
  const matches = grep.stdout.split('\n').filter(Boolean);
  for (const [name, file] of texts) {
    const text = readFileSync(file, 'utf8');
    if (values.some(value => text.includes(value))) matches.push(name);
  }
  if (!matches.length) return;
  throw new Stop(5, [...matches.map(path => `CREDENTIAL_MATCH=${path}`),
    'NEXT: a handled credential is in the paths above. Remove it from each, restage, and rerun this command; nothing was committed.']);
}

/** Rebuild the change's review page from its proposal and stage it. Bad inputs keep the old page. */
function refreshReview(root, changeRoot) {
  let rebuilt;
  try { rebuilt = buildReview(resolve(root, changeRoot)).kind !== 'no-page'; } catch (error) { say(`REVIEW=stale (${error.message})`); return; }
  if (rebuilt) must('git', ['add', '--', resolve(root, changeRoot, 'review.html')], 'git add of the review page');
}

function unpushed(base) {
  const upstream = sh('git', ['rev-list', '--count', '@{upstream}..HEAD']);
  if (upstream.status === 0) return Number(upstream.stdout.trim()) > 0;
  const ahead = sh('git', ['rev-list', '--count', `origin/${base}..HEAD`]);
  return ahead.status !== 0 || Number(ahead.stdout.trim()) > 0;
}

function readPr() {
  const view = sh('gh', ['pr', 'view', '--json', 'number,state,url']);
  if (view.status === 0) return JSON.parse(view.stdout);
  if (/no pull requests found/i.test(view.stderr)) return null;
  throw new Stop(1, [`error=gh pr view: ${firstLine(view.stderr) || `exit ${view.status}`}`,
    'NEXT: gh could not read the pull request. Fix it by .claude/skills/save/references/preconditions.md, then rerun this command.']);
}

/** Write the body file. With a change it mirrors the change; without one it is the summary and a footer. */
function renderBody({ root, branch, values, summaryFile, bodyFile, repoUrl, previewUrl }) {
  try {
    if (values['change-root']) {
      return writePrBody({ repoRoot: root, changeRoot: values['change-root'], mode: values.mode ?? 'active', repoUrl, branch, summaryFile, previewUrl }, bodyFile);
    }
    const summary = readFileSync(summaryFile, 'utf8').trim();
    if (!summary) throw new Error('summary must not be empty');
    writeFileSync(bodyFile, `${summary}${NO_CHANGE_FOOTER}`);
    return true;
  } catch (error) {
    throw new Stop(1, [`error=PR body: ${error.message}`, 'NEXT: the pull request body could not be rendered, so the old body is kept. Fix the input and rerun this command.']);
  }
}

function patchBody(number, bodyFile) {
  const patch = sh('gh', ['api', '-X', 'PATCH', `repos/{owner}/{repo}/pulls/${number}`, '-F', `body=@${bodyFile}`, '--silent']);
  if (patch.status !== 0) say(`PR_BODY=stale (${firstLine(patch.stderr) || `exit ${patch.status}`})`);
}

/** The names and links wait-for-checks.sh lists under RESULT: FAILURE. */
export function failingChecks(waiterOutput) {
  return waiterOutput.split('\n').flatMap(line => {
    const match = line.match(/^ {2}- (.+?) {2}(\S+)$/);
    return match ? [{ name: match[1], link: match[2] }] : [];
  });
}

/** Each failing check, its rerun command, and the tail of the log that shows its cause. */
function printFailures(checks) {
  for (const { name, link } of checks) {
    say(`FAILED_CHECK=${name}`);
    say(`LINK=${link}`);
    const ids = link.match(/\/actions\/runs\/(\d+)(?:\/job\/(\d+))?/);
    if (!ids) { say('CAUSE=no GitHub Actions log for this check; open LINK'); continue; }
    say(`RERUN=gh run rerun ${ids[1]} --failed`);
    const log = sh('gh', ['run', 'view', ...(ids[2] ? ['--job', ids[2]] : [ids[1]]), '--log-failed']);
    const lines = log.stdout.trimEnd().split('\n').filter(Boolean).slice(-LOG_LINES);
    if (log.status !== 0 || !lines.length) { say(`CAUSE=the log could not be read (${firstLine(log.stderr) || 'empty'}); open LINK`); continue; }
    say(`CAUSE: last ${lines.length} lines of the failed log`);
    for (const line of lines) say(`  | ${line}`);
  }
}

function writeReceipt(root, branch, result, receiptFile) {
  rmSync(receiptFile, { force: true });
  if (result === 'UNKNOWN') return 'none (the gate is unverified)';
  const saved = sh(process.execPath, [join(here, 'saved-revision.mjs'), '--repo', root, '--branch', branch]);
  let info;
  try { info = JSON.parse(saved.stdout); } catch { info = { state: 'UNKNOWN', reason: 'saved-revision.mjs printed no answer' }; }
  if (info.state !== 'SAVED') return `none (${info.reason ?? info.state})`;
  const { repository, headSha, gateIdentity } = info;
  writeFileSync(receiptFile, `${JSON.stringify({ repository, branch: info.branch, headSha, gateIdentity, gateResult: result })}\n`, { mode: 0o600 });
  return receiptFile;
}

function nextLine(result, fixes) {
  if (result === 'SUCCESS') return 'NEXT: checks passed. Report the save; inside a chain, hand RECEIPT on.';
  if (result === 'NONE') return 'NEXT: no checks are configured, so pull request review is the gate. Report the save.';
  if (result === 'TIMEOUT') return `NEXT: checks are still running. Report with PR_URL, or keep waiting with: ${RERUN} --wait`;
  if (result === 'UNKNOWN') return 'NEXT: the gate is unverified, which is never "no checks". Report it as unverified with the reason above.';
  if (fixes >= CAP) return `NEXT: the ${CAP} fix attempts are spent. Stop and report the failing checks above with PR_URL; change no more code.`;
  return `NEXT: fix every cause above in one push. Where this computer has the tools, rerun the failed check first (node .github/scripts/checks.mjs --worktree). Then stage and rerun this command: fix attempt ${fixes + 1} of ${CAP}. A failure outside the diff gets its RERUN command once, then: ${RERUN} --wait; still red: stop, with no code edit.`;
}

function checkpoint(values) {
  const root = must('git', ['rev-parse', '--show-toplevel'], 'not inside a git repository');
  const wait = Boolean(values.wait);
  const files = wait ? {} : { message: outsideFile(root, values['message-file'], '--message-file'), summary: outsideFile(root, values['summary-file'], '--summary-file') };
  // Every git call below sees the whole repo, whichever folder the command was started in.
  process.chdir(root);
  const branch = must('git', ['rev-parse', '--abbrev-ref', 'HEAD'], 'cannot read the current branch');
  const remote = sh('git', ['remote', 'get-url', 'origin']);
  if (remote.status !== 0) throw new Stop(1, ['error=no origin remote', 'NEXT: add the remote by .claude/skills/save/references/preconditions.md, then rerun this command.']);
  const base = defaultBranch();
  if (branch === 'HEAD' || branch === base) {
    throw new Stop(4, [`REFUSED=HEAD is ${branch === 'HEAD' ? 'detached' : `the default branch (${base})`}`, 'NEXT: cut the feature branch (git checkout -b <name>), then rerun this command.']);
  }

  const stateDir = process.env.WONG_SAVE_STATE_DIR || join(tmpdir(), 'wongstack-save');
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const key = createHash('sha256').update(`${root}\0${branch}`).digest('hex').slice(0, 16);
  const stateFile = join(stateDir, `run-${key}.json`);
  const bodyFile = join(stateDir, `body-${key}.md`);
  const receiptFile = join(stateDir, `receipt-${key}.json`);
  const state = (!values['new-run'] && readJson(stateFile)) || { fixes: 0, last: null };
  const fixing = !wait && state.last === 'FAILURE';
  if (fixing && state.fixes >= CAP) {
    throw new Stop(6, [`REFUSED=the ${CAP} fix attempts of this /save run are spent`, `ATTEMPT=${state.fixes}`,
      'NEXT: stop and report the failing checks with the pull request link. A later /save run starts a new count with --new-run.']);
  }

  if (!wait) {
    if (values['change-root']) refreshReview(root, values['change-root']);
    const staged = must('git', ['diff', '--cached', '--name-only'], 'cannot read the staged files').split('\n').filter(Boolean);
    if (!staged.length && !unpushed(base)) {
      throw new Stop(4, ['REFUSED=nothing is staged and nothing waits to be pushed', `NEXT: stage the intended files and rerun, or read the gate again with: ${RERUN} --wait`]);
    }
    const keys = (values['scan-keys'] ?? '').split(',').map(name => name.trim()).filter(Boolean);
    if (keys.length) scanCredentials(root, keys, [['the commit message', files.message], ['the summary', files.summary]]);
    if (staged.length) must('git', ['commit', '-F', files.message], 'git commit');
  }
  const head = must('git', ['rev-parse', 'HEAD'], 'cannot read HEAD');
  say(`SAVE_HEAD=${head}`);

  let pr = readPr();
  if (pr?.state === 'CLOSED') {
    throw new Stop(3, [`PR_URL=${pr.url}`, 'REFUSED=the pull request is closed and not merged; nothing was pushed',
      'NEXT: ask the person: reopen it (gh pr reopen, then rerun this command), or push to a fresh branch (git checkout -b <name>, then rerun).']);
  }
  if (pr?.state === 'MERGED') {
    say(`PR_URL=${pr.url}`);
    say('PREVIEW_URL=none');
    say('RECEIPT=none (the pull request already merged)');
    say(`ATTEMPT=${state.fixes}`);
    say('NEXT: this branch already shipped, so nothing was pushed, no checks were waited for, and there is no live preview. New work needs a fresh branch.');
    return 'UNKNOWN';
  }

  let repoUrl = '';
  if (!wait) {
    if (values['change-root']) repoUrl = must('gh', ['repo', 'view', '--json', 'url', '--jq', '.url'], 'gh repo view');
    renderBody({ root, branch, values, summaryFile: files.summary, bodyFile, repoUrl });
    must('git', pr ? ['push'] : ['push', '-u', 'origin', 'HEAD'], 'git push');
    if (fixing) state.fixes += 1;
    if (pr) patchBody(pr.number, bodyFile);
    else {
      const title = firstLine(readFileSync(files.message, 'utf8'));
      const created = must('gh', ['pr', 'create', '--title', title, '--body-file', bodyFile], 'gh pr create');
      const url = created.split('\n').findLast(line => /^https?:\/\//.test(line)) ?? '';
      pr = { state: 'OPEN', url, number: Number(url.match(/\/(\d+)$/)?.[1]) || null };
    }
  }
  say(`PR_URL=${pr?.url ?? 'none'}`);

  const minutes = values['max-minutes'] ?? '20';
  say(`WAITING=checks for ${head.slice(0, 7)}, up to ${minutes} minutes`);
  const waited = sh('bash', [join(here, 'wait-for-checks.sh'), minutes]);
  const waiterOutput = waited.stdout.trimEnd();
  if (waiterOutput) say(waiterOutput);
  const result = waiterOutput.match(/^RESULT: (SUCCESS|FAILURE|NONE|TIMEOUT|UNKNOWN)$/m)?.[1] ?? 'UNKNOWN';
  if (result === 'FAILURE') printFailures(failingChecks(waiterOutput));

  const receipt = writeReceipt(root, branch, result, receiptFile);
  const preview = result === 'UNKNOWN' ? '' : firstLine(sh('bash', [join(here, 'preview-url.sh')]).stdout);
  if (preview && !wait && values['change-root'] && pr?.number) {
    if (renderBody({ root, branch, values, summaryFile: files.summary, bodyFile, repoUrl, previewUrl: preview })) patchBody(pr.number, bodyFile);
  }
  say(`PREVIEW_URL=${preview || 'none'}`);
  say(`RECEIPT=${receipt}`);
  say(`ATTEMPT=${state.fixes}`);

  // The run ends on a pass; anything else keeps the count for the next call.
  if (result === 'SUCCESS' || result === 'NONE') rmSync(stateFile, { force: true });
  else writeFileSync(stateFile, JSON.stringify({ fixes: state.fixes, last: result }));
  rmSync(bodyFile, { force: true });
  if (files.message) rmSync(files.message, { force: true });
  // A failed gate with a fix left is rerun with the same summary; every other result is done with it.
  const rerun = result === 'FAILURE' && state.fixes < CAP;
  if (files.summary && rerun) say(`SUMMARY_FILE=${files.summary} (kept for the rerun)`);
  else if (files.summary) rmSync(files.summary, { force: true });
  say(nextLine(result, state.fixes));
  return result;
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: {
    'message-file': { type: 'string' }, 'summary-file': { type: 'string' }, 'change-root': { type: 'string' }, mode: { type: 'string' },
    'scan-keys': { type: 'string' }, 'max-minutes': { type: 'string' }, 'new-run': { type: 'boolean' }, wait: { type: 'boolean' },
  } });
  if (!values.wait && (!values['message-file'] || !values['summary-file'])) usageError(USAGE, 'give --message-file and --summary-file, or --wait');
  if (values.mode && !['active', 'archive'].includes(values.mode)) usageError(USAGE, '--mode is active or archive');
  if (values.mode && !values['change-root']) usageError(USAGE, '--mode needs --change-root');
  if (values['max-minutes'] && !/^\d+$/.test(values['max-minutes'])) usageError(USAGE, '--max-minutes is a whole number');
  try {
    say(`SAVE_GATE_RESULT=${checkpoint(values)}`);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    for (const line of error.lines) (line.startsWith('error=') ? console.error : console.log)(line);
    process.exitCode = error.code;
  }
}
