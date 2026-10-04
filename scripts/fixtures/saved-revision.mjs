// Nonsecret mock read-only Git/GitHub responses; no credentials or mutations.
export const HEAD = 'a'.repeat(40);
export const OLD = 'b'.repeat(40);
export function githubFixture(overrides = {}) {
  const calls = [];
  const checks = overrides.checks ?? [{ __typename: 'CheckRun', name: 'payload', detailsUrl: 'https://github.com/team/repo/actions/runs/10/job/1', status: 'COMPLETED', conclusion: 'SUCCESS' }];
  const runs = overrides.runs ?? [{ id: 10, run_attempt: 1, workflow_id: 2, event: 'push', status: 'completed', conclusion: 'success', head_sha: HEAD, repository: { full_name: 'team/repo' } }];
  const run = (command, args) => {
    const key = args.filter(value => value !== '--no-optional-locks').join(' ');
    calls.push([command, key]);
    if (overrides.fail === key) throw Error('unavailable');
    if (command === 'git') {
      if (key === 'rev-parse HEAD') return HEAD;
      if (key === 'branch --show-current') return overrides.branch ?? 'work';
      if (key.startsWith('status ')) return overrides.dirty ?? '';
      if (key === 'remote get-url origin') return overrides.remote ?? 'git@github.com:team/repo.git';
      if (key.startsWith('ls-remote ')) return overrides.refs ?? `${HEAD}\trefs/heads/work`;
    }
    if (key === 'repo view --json nameWithOwner') return JSON.stringify({ nameWithOwner: overrides.repository ?? 'team/repo' });
    if (key.startsWith('pr view ')) return JSON.stringify({ number: 5, headRefOid: overrides.rollupHead ?? HEAD, headRefName: 'work', statusCheckRollup: checks });
    if (key === 'api repos/team/repo/pulls/5') return JSON.stringify(overrides.pr ?? { state: 'open', head: { sha: HEAD, ref: 'work', repo: { full_name: 'team/repo' } } });
    if (key.startsWith('api repos/team/repo/actions/runs?')) return JSON.stringify({ total_count: runs.length, workflow_runs: runs });
    throw Error(`Unexpected read: ${command} ${key}`);
  };
  return { run, calls };
}
