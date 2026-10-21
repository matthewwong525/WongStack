// What one check run does (prepare, checks, deploy), with no Cloudflare import, so the script tests can run it.
// worker.mjs wires it to the pinned SDK; wiki/stack/artifacts-route.md owns the route.

/** One run at a time, 30 minutes of stages plus any an interruption repeats, snapshots kept a day. */
export const BOUNDS = {
  /** How many times in one run a stage the Sandbox cut off is started again, shared by its stages. */
  interruptions: 3,
  prepareMs: 3 * 60_000,
  checksMs: 17 * 60_000,
  deployMs: 10 * 60_000,
  snapshotSeconds: 24 * 60 * 60,
  /** A run waits its turn this long, then a stale turn (a run that never left) is passed over. */
  turnPolls: 140,
  turnSeconds: 15,
  turnTtlMs: 35 * 60_000,
  /** How much of a failed stage's output the result keeps for the person's agent to read. */
  reasonChars: 20_000,
};

const SHA = /^[0-9a-f]{40}$/;
const ZERO = '0'.repeat(40);
const ADDRESS = /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/;

/** A runner's SDK config: no blind retry, a hard stop, a short-lived snapshot. */
export const runnerConfig = (timeout) => ({
  retries: { limit: 0, delay: 1000 },
  timeout,
  commandTimeoutMs: timeout - 10_000,
  snapshotRetentionSeconds: BOUNDS.snapshotSeconds,
});

// The commands are fixed text. A branch name or commit id reaches them only as a quoted
// environment variable, never as part of the script.
const PREPARE = `set -eu
cd /workspace
rm -rf .git
git init -q .
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: Bearer $ARTIFACTS_TOKEN"
git fetch -q --no-tags "$ARTIFACTS_REMOTE" "$WONG_HEAD"
[ "$(git rev-parse FETCH_HEAD)" = "$WONG_HEAD" ]
git fetch -q --no-tags "$ARTIFACTS_REMOTE" "+refs/heads/main:refs/remotes/origin/main" || echo "WONG_PREPARE no main yet"
unset GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0
git checkout -q -f --detach "$WONG_HEAD"
base=""
if [ "$WONG_BRANCH" = main ]; then
  if [ -n "\${WONG_BEFORE:-}" ] && git cat-file -e "$WONG_BEFORE^{commit}" 2>/dev/null; then base=$WONG_BEFORE; fi
else
  base=$(git merge-base HEAD refs/remotes/origin/main 2>/dev/null || true)
fi
# The project's empty first commit is nothing to compare with: checks then run as on a new repository.
if [ -n "$base" ] && [ "$(git rev-parse "$base^{tree}")" = "$(git hash-object -t tree /dev/null)" ]; then base=""; fi
printf '%s' "$base" > .git/wong-base
echo "WONG_PREPARED $(git rev-parse HEAD)"
`;

const CHECKS = `set -eu
cd /workspace
[ "$(git rev-parse HEAD)" = "$WONG_HEAD" ]
if [ ! -f .github/scripts/checks.mjs ]; then echo "WONG_APP none"; exit 0; fi
base=$(cat .git/wong-base)
node .github/scripts/checks.mjs --repo . --base "$base" --head "$WONG_HEAD" --default-branch main --summary /tmp/wong-summary.md
scope=$(node .github/scripts/checks.mjs --repo . --base "$base" --head "$WONG_HEAD" --default-branch main --discover)
if [ "$(printf '%s' "$scope" | jq -r '.scope.untouched')" = true ]; then echo "WONG_APP untouched"; exit 0; fi
status=0
dir=$(bash scripts/cf-build.sh --app-dir) || status=$?
if [ "$status" -eq 3 ]; then echo "WONG_APP unconfigured"; exit 0; fi
[ "$status" -eq 0 ]
[ -d "$dir/node_modules" ] || (cd "$dir" && npm ci --no-audit --no-fund)
# A branch builds staging. cf-build.sh --build-only chooses it itself; the plain builds below, for a branch whose
# scripts predate it, read it from here.
if [ "$WONG_BRANCH" != main ]; then export CLOUDFLARE_ENV=staging; fi
if ! node -e "process.exit(require('$dir/package.json').scripts?.['build:app']?0:1)"; then (cd "$dir" && npm run build)
elif grep -q -- --build-only scripts/cf-build.sh; then CF_BRANCH="$WONG_BRANCH" CF_PRODUCTION_BRANCH=main bash scripts/cf-build.sh --build-only
else (cd "$dir" && npm run build:app); fi
echo "WONG_APP built"
`;

// The deploy stage runs main's own scripts and tools from a fresh /tmp/trusted, never a file in /workspace, which
// the checks stage could change: the build is copied from there as data. No package's install script runs.
const DEPLOY = `set -eu
rm -rf /tmp/trusted
git init -q /tmp/trusted
cd /tmp/trusted
ref=refs/heads/main
if [ "$WONG_BRANCH" = main ]; then ref=$WONG_HEAD; fi
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: Bearer $ARTIFACTS_TOKEN" git fetch -q --no-tags "$ARTIFACTS_REMOTE" "$ref"
unset ARTIFACTS_TOKEN ARTIFACTS_REMOTE
if [ "$WONG_BRANCH" = main ]; then [ "$(git rev-parse FETCH_HEAD)" = "$WONG_HEAD" ]; fi
git checkout -q -f --detach FETCH_HEAD
status=0
dir=$(bash scripts/cf-build.sh --app-dir) || status=$?
if [ "$status" -eq 3 ] || ! grep -q -- --take-build scripts/cf-deploy.sh; then echo "WONG_DEPLOY after-publish"; exit 0; fi
[ "$status" -eq 0 ]
export CF_BRANCH="$WONG_BRANCH" CF_PRODUCTION_BRANCH=main GITHUB_OUTPUT=/tmp/wong-output WONG_WRANGLER="$dir/node_modules/.bin/wrangler"
: > "$GITHUB_OUTPUT"
(cd "$dir" && npm ci --ignore-scripts --no-audit --no-fund)
bash scripts/cf-deploy.sh --take-build /workspace
node scripts/cf-secrets.mjs check
bash scripts/cf-build.sh --migrate
bash scripts/cf-deploy.sh
sed 's/^/WONG_OUTPUT /' "$GITHUB_OUTPUT"
`;

// A push event as the run's parameters, or null for a push that starts nothing: another repository,
// a tag, or a deleted branch.
export function eventParams(event, config) {
  const { ref, after, before } = event?.payload ?? {};
  if (event?.type !== 'cf.artifacts.repo.pushed') return null;
  if (event.source?.namespace !== config.namespace || event.source?.repoName !== config.repo) return null;
  if (typeof ref !== 'string' || !ref.startsWith('refs/heads/') || !SHA.test(after ?? '') || after === ZERO) return null;
  return {
    provider: 'cloudflare-artifacts',
    providerData: { namespace: config.namespace },
    event: { type: 'push' },
    owner: config.namespace,
    repo: config.repo,
    sha: after,
    remote: 'cloudflare',
    trigger: 'push',
    ref,
    branch: ref.slice('refs/heads/'.length),
    ...(SHA.test(before ?? '') && before !== ZERO && { beforeSha: before }),
  };
}

/** Reads both of a runner's log streams to the end: the SDK frees the container only then. */
export async function readLogs(logs) {
  const read = (value) => (typeof value === 'string' ? value : new Response(value).text());
  const [stdout, stderr] = await Promise.all([read(logs.stdout), read(logs.stderr)]);
  return `${stdout}\n${stderr}`;
}

/** The one value a stage printed after `marker`, or null when it printed none or more than one. */
export function marked(logs, marker) {
  const lines = logs.split('\n').filter((line) => line.startsWith(`${marker} `));
  return lines.length === 1 ? lines[0].slice(marker.length + 1).trim() : null;
}

/** The address cf-deploy.sh wrote for `key`, read from the deploy stage's own output. */
export function deployedAddress(logs, key) {
  const lines = logs.split('\n').filter((line) => line.startsWith(`WONG_OUTPUT ${key}=`));
  const value = lines.at(-1)?.slice(`WONG_OUTPUT ${key}=`.length).trim() ?? '';
  return ADDRESS.test(value) ? value : null;
}

// True for a failure the Sandbox caused, not the commit: the container went away mid-command.
// A command's own non-zero exit and a timeout are never retried.
export function interrupted(error) {
  // The SDK keeps only the end of a long output, under `[diagnostic truncated]`, and drops the exit-code line.
  // So that mark, the output headings and the SDK's wrapped error also show a command ran to its end.
  const texts = [];
  for (let at = error, depth = 0; at !== undefined && at !== null && depth < 5; at = at.cause, depth++) texts.push(String(at?.message ?? at));
  const text = texts.join('\n');
  const exited = /failed with exit code \d+/.test(text) || text.includes('[diagnostic truncated]') || /^=== std(out|err) ===$/m.test(text);
  return !exited && !/time(d)? ?out/i.test(text);
}

const reasonOf = (error) => String(error?.message ?? error).slice(-BOUNDS.reasonChars);

/** A stage the Sandbox cut off after the run's tries were used up. */
class CutOff extends Error {}

/** The step name of a stage's nth try: the stage's own name, then `-retry`, `-retry-2`, `-retry-3`. */
const tryName = (name, attempt) => (attempt === 0 ? name : attempt === 1 ? `${name}-retry` : `${name}-retry-${attempt}`);

// Runs one stage; a Sandbox interruption gets another try under its own step name. `retry` is the run's
// shared budget of tries; a stage still cut off when it is spent throws `CutOff`.
async function stage(start, options, retry) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await start(attempt === 0 ? options : { ...options, name: tryName(options.name, attempt) });
    } catch (error) {
      if (!interrupted(error)) throw error;
      if (retry.left < 1) throw new CutOff(String(error?.message ?? error));
      retry.left -= 1;
    }
  }
}

// One run for one pushed commit. Returns what the verbs read: commit, ref, the deploy's address, and
// `success`, `failure`, `interrupted` (cut off; not the commit's doing) or `none` (no checks to run).
export async function runPipeline(params, ci, config) {
  if (params?.owner !== config.namespace || params?.repo !== config.repo) throw new Error('this run is for another repository');
  if (!SHA.test(params.sha ?? '') || typeof params.ref !== 'string' || !params.ref.startsWith('refs/heads/')) throw new Error('this run names no branch commit');
  const branch = params.ref.slice('refs/heads/'.length);
  const outcome = { commit: params.sha, ref: params.ref };
  const env = { WONG_HEAD: params.sha, WONG_BRANCH: branch, ...(params.beforeSha && { WONG_BEFORE: params.beforeSha }) };
  const fail = (at, error) => ({ ...outcome, result: error instanceof CutOff ? 'interrupted' : 'failure', stage: at, reason: reasonOf(error) });
  const none = { cloudflareCredentials: false, sourceControlCredentials: false };
  const retry = { left: BOUNDS.interruptions };

  let prepared;
  try {
    prepared = await stage(ci.runner, { name: 'prepare', command: PREPARE, env, cloudflareCredentials: false, sourceControlCredentials: true, config: runnerConfig(BOUNDS.prepareMs) }, retry);
    if (marked(await readLogs(prepared.logs), 'WONG_PREPARED') !== params.sha) throw new Error('the prepared commit is not the pushed commit');
  } catch (error) {
    return fail('prepare', error);
  }

  let checked, app;
  try {
    checked = await stage(prepared.runner, { name: 'checks', command: CHECKS, env, ...none, config: runnerConfig(BOUNDS.checksMs) }, retry);
    app = marked(await readLogs(checked.logs), 'WONG_APP');
    if (!['none', 'untouched', 'unconfigured', 'built'].includes(app)) throw new Error('the checks ended without saying what they built');
  } catch (error) {
    return fail('checks', error);
  }
  if (app === 'none') return { ...outcome, result: 'none', deployed: false };
  if (app !== 'built') return { ...outcome, result: 'success', deployed: false, app };

  try {
    const deployed = await stage(checked.runner, { name: 'deploy', command: DEPLOY, env, cloudflareCredentials: { accountId: config.account }, sourceControlCredentials: true, config: runnerConfig(BOUNDS.deployMs) }, retry);
    const logs = await readLogs(deployed.logs);
    // Main's scripts predate taking a build, or main has no app yet: this commit previews once it is on main.
    if (marked(logs, 'WONG_DEPLOY') === 'after-publish') return { ...outcome, result: 'success', deployed: false, app, deploy: 'after-publish' };
    const key = branch === 'main' ? 'production' : 'preview';
    const address = deployedAddress(logs, `${key}-url`);
    if (!address) throw new Error(`the deploy reported no ${key} address`);
    return { ...outcome, result: 'success', deployed: true, app, [key]: address };
  } catch (error) {
    return fail('deploy', error);
  }
}

// The line of runs waiting their turn: returns the next line and whether `id` is at its head. A run's clock
// starts at the head, never while it waits; a head older than the turn's lifetime never left, and is dropped.
export function takeTurn(line, id, now) {
  const heading = (entries) => entries.map((entry, index) => (index === 0 && entry.startedAt === undefined ? { ...entry, startedAt: now } : entry));
  let next = heading(line.some((entry) => entry.id === id) ? line : [...line, { id, at: now }]);
  while (next.length && now - next[0].startedAt >= BOUNDS.turnTtlMs) next = heading(next.slice(1));
  if (!next.some((entry) => entry.id === id)) next = heading([...next, { id, at: now }]);
  return { line: next, mine: next[0].id === id };
}

/** The line without `id`. */
export const leaveTurn = (line, id) => line.filter((entry) => entry.id !== id);
