#!/usr/bin/env node
// Switches this checkout to a saved branch, never past work this computer has never had: authors are ignored, as
// anyone can type any email. It runs only git, from this trusted copy, so nothing from the branch runs before the yes.

import { execFileSync } from 'node:child_process';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';

const USAGE = `usage: pickup.mjs <branch> [--reviewed <commit>] [--dry-run]
  Fetches the branch, then switches to it when every commit on it is known here. Otherwise it switches nothing
  and prints the new commits and the files they change, code first (exit 3); rerun with --reviewed <tip>
  once the person says yes. --dry-run fetches and reviews but switches nothing, even with unsaved edits.
  Exit 0 switched, 2 bad input, unsaved edits, or a branch missing or diverged, 3 needs review, 4 the branch
  is checked out in another worktree.`;

export const EXIT = { ok: 0, input: 2, review: 3, elsewhere: 4 };
const WORDS = /^(openspec|wiki)\//;

export class PickupError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
}).trimEnd();

function sha(cwd, ref) {
  try { return git(cwd, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`); } catch { return null; }
}

function isAncestor(cwd, older, newer) {
  try { git(cwd, 'merge-base', '--is-ancestor', older, newer); return true; } catch { return false; }
}

const lines = text => text.split('\n').filter(Boolean);

// The branch origin publishes, asked of origin first (a server rename leaves origin/HEAD stale), never a bare `main`,
// which anyone who saves can push. Null trusts no remote branch.
function defaultBranch(cwd, { fetch }) {
  if (fetch) {
    try {
      const named = /^ref: refs\/heads\/(\S+)\tHEAD$/m.exec(git(cwd, 'ls-remote', '--symref', 'origin', 'HEAD'))?.[1];
      if (named) return named;
    } catch { /* the saved copy below */ }
  }
  try {
    return git(cwd, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '') || null;
  } catch { return null; }
}

// Fetches one branch into its origin/ copy. A branch origin lacks is `missing`; any other failure is a warning,
// and the last fetched copy is reviewed instead.
function fetchBranch(cwd, branch) {
  try {
    git(cwd, 'fetch', '--quiet', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`);
    return { missing: false, warning: null };
  } catch (error) {
    const text = String(error.stderr ?? error.message).trim();
    if (/couldn't find remote ref/i.test(text)) return { missing: true, warning: null };
    return { missing: false, warning: `Could not fetch origin/${branch}, so the last fetched copy is used: ${text}` };
  }
}

/** Each changed file once, labelled `code`, or `words` for plans and wiki pages; code first. */
export function labelFiles(paths) {
  const files = [...new Set(paths)].map(path => ({ path, kind: WORDS.test(path) ? 'words' : 'code' }));
  return files.sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === 'code' ? -1 : 1));
}

/** The branch name, refused unless Git takes it as one. */
export function checkBranch(cwd, branch) {
  const name = String(branch ?? '').trim();
  if (!name || name.startsWith('-')) throw new PickupError(EXIT.input, 'Name the branch to pick up.');
  try { git(cwd, 'check-ref-format', '--branch', name); } catch {
    throw new PickupError(EXIT.input, `"${name}" is not a branch name.`);
  }
  return name;
}

/** A --reviewed value, as the full commit it names here, or null when this copy has no such commit. */
function reviewedCommit(cwd, value) {
  if (value === undefined || value === null) return null;
  if (!/^[0-9a-f]{7,40}$/i.test(value)) throw new PickupError(EXIT.input, `--reviewed takes a commit id, not "${value}".`);
  return sha(cwd, value);
}

// The tip's commits no local branch and not origin's published branch hold; after a `reviewed` ancestor, only the newer
// ones. `newWork` says whether any were unknown at all. A merge lists only what its merger changed (`--cc`).
export function reviewBranch({ cwd, branch, reviewed = null, fetch = true }) {
  const name = checkBranch(cwd, branch);
  reviewedCommit(cwd, reviewed); // refuses a malformed value before any fetch
  const base = defaultBranch(cwd, { fetch });
  let missing = false;
  let warning = null;
  if (fetch) {
    ({ missing, warning } = fetchBranch(cwd, name));
    if (base && base !== name) {
      try {
        git(cwd, 'fetch', '--quiet', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`);
      } catch { /* the last fetched copy */ }
    }
  }
  const remote = missing ? null : sha(cwd, `refs/remotes/origin/${name}`);
  const local = sha(cwd, `refs/heads/${name}`);
  if (!remote && !local) {
    throw new PickupError(EXIT.input, `There is no branch "${name}" here or on origin.`, warning ? { warning } : {});
  }
  const tip = remote ?? local;
  const after = reviewedCommit(cwd, reviewed);
  const known = ['--branches', ...(base && sha(cwd, `refs/remotes/origin/${base}`) ? [`refs/remotes/origin/${base}`] : [])];
  const newWork = lines(git(cwd, 'rev-list', tip, '--not', ...known)).length > 0;
  const seen = after && newWork && isAncestor(cwd, after, tip) ? [after] : [];
  const range = [tip, '--not', ...known, ...seen];
  const commits = newWork ? lines(git(cwd, 'log', '--format=%H%x1f%an <%ae>%x1f%s', ...range)).map(line => {
    const [commit, author, subject] = line.split('\x1f');
    return { sha: commit, author, subject };
  }) : [];
  // `--root` and the settings keep a first commit's files, and both sides of a rename, whatever the owner's config.
  const list = ['-c', 'core.quotePath=true', '-c', 'log.showRoot=true', 'log', '--root', '--cc', '--no-renames', '--name-only', '--format='];
  const files = newWork ? labelFiles(lines(git(cwd, ...list, ...range))) : [];
  return { branch: name, tip, local, remote, defaultBranch: base, newWork, commits, files, ...(warning ? { warning } : {}) };
}

/** The worktree other than `here` that has the branch checked out, or null. */
export function checkedOutElsewhere(cwd, branch, here) {
  for (const block of git(cwd, 'worktree', 'list', '--porcelain').split(/\n\s*\n/)) {
    const dir = /^worktree (.+)$/m.exec(block)?.[1];
    if (dir && dir !== here && block.split('\n').includes(`branch refs/heads/${branch}`)) return dir;
  }
  return null;
}

// Creates or fast-forwards the local branch to `tip`, and returns the commit it then names; one already past the tip
// stays. A branch checked out in a worktree moves only when that worktree is `inPlace`.
export function pinBranch({ cwd, branch, tip, local, remote, inPlace = null }) {
  if (local === tip || (local && isAncestor(cwd, tip, local))) return local;
  if (local && !isAncestor(cwd, local, tip)) {
    throw new PickupError(EXIT.input, `The local branch "${branch}" and origin's copy have both moved on; neither contains the other, so nothing switched.`);
  }
  const holder = checkedOutElsewhere(cwd, branch, null);
  if (holder && holder !== inPlace) throw new PickupError(EXIT.elsewhere, `"${branch}" is checked out in ${holder}.`, { path: holder });
  if (holder) git(holder, 'merge', '--ff-only', '--quiet', tip);
  else if (local) git(cwd, 'update-ref', `refs/heads/${branch}`, tip, local);
  else {
    git(cwd, 'branch', '--no-track', branch, tip);
    if (remote) git(cwd, 'branch', '--quiet', `--set-upstream-to=origin/${branch}`, branch);
  }
  return tip;
}

export function pickup({ cwd, branch, reviewed = null, dryRun = false }) {
  const here = git(cwd, 'rev-parse', '--show-toplevel');
  const name = checkBranch(here, branch);
  if (!dryRun && git(here, 'status', '--porcelain')) {
    throw new PickupError(EXIT.input, 'This checkout has unsaved edits, so nothing switched.');
  }
  const review = reviewBranch({ cwd: here, branch: name, reviewed });
  const notes = review.warning ? { warning: review.warning } : {};
  const holder = checkedOutElsewhere(here, name, here);
  if (holder) throw new PickupError(EXIT.elsewhere, `"${name}" is checked out in ${holder}.`, { path: holder, ...notes });
  const { tip, commits, files } = review;
  if (commits.length) {
    throw new PickupError(EXIT.review, `"${name}" holds work this computer has never had. Show it and ask; on a yes, rerun with --reviewed ${tip}.`,
      { branch: name, tip, commits, files, ...notes });
  }
  if (dryRun) return { ok: true, dryRun: true, branch: name, tip, newWork: review.newWork, ...notes };
  const commit = pinBranch({ cwd: here, ...review, inPlace: here });
  if (git(here, 'branch', '--show-current') !== name) git(here, 'switch', '--quiet', '--no-guess', name);
  const head = git(here, 'rev-parse', 'HEAD');
  if (head !== commit) throw new PickupError(EXIT.input, `The switch landed on ${head}, not ${commit}.`);
  return { ok: true, switched: true, branch: name, commit, reviewed: review.newWork, ...notes };
}

function main() {
  const { values, positionals } = parseCli({
    usage: USAGE, allowPositionals: true,
    options: { reviewed: { type: 'string' }, 'dry-run': { type: 'boolean' } },
  });
  try {
    if (positionals.length !== 1) throw new PickupError(EXIT.input, `Name one branch.\n${USAGE}`);
    const result = pickup({ cwd: process.cwd(), branch: positionals[0], reviewed: values.reviewed, dryRun: values['dry-run'] });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof PickupError ? error.code : EXIT.input;
    const message = error instanceof PickupError ? error.message : String(error.stderr ?? error.message).trim();
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = main();
