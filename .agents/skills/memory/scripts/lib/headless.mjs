// The command line of one headless agent run, for Claude Code or Codex. A narrow grant names the tools, folder and
// writable roots it may use, as the memory run does; `full` bypasses permissions, as a daily background run does.

/** `[command, args]` for `agent` ('claude' or 'codex'); `access` is `{ full: true }` or `{ tools, dir, writable }`;
 * `readOnly` with `tools` and `dir` lets Codex write nothing; `deny` lists tool patterns a full Claude run refuses. */
export function headlessCommand({ agent, prompt, model, access, deny = [] }) {
  if (agent === 'codex') {
    const sandbox = access.full ? ['--dangerously-bypass-approvals-and-sandbox'] : access.readOnly ? ['--sandbox', 'read-only']
      : ['--sandbox', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true',
        '-c', `sandbox_workspace_write.writable_roots=[${access.writable.map(root => JSON.stringify(root)).join(',')}]`];
    return ['codex', ['exec', '--ephemeral', '--skip-git-repo-check', ...(model ? ['-m', model] : []), ...sandbox, '-c', 'approval_policy="never"', prompt]];
  }
  // --disallowedTools takes many values, so it goes last, where it can swallow no later option.
  const grant = access.full ? ['--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose',
    ...(deny.length ? ['--disallowedTools', ...deny] : [])]
    : ['--permission-mode', 'dontAsk', '--allowedTools', ...access.tools, '--add-dir', access.dir];
  return ['claude', ['-p', prompt, ...(model ? ['--model', model] : []), '--no-session-persistence', ...grant]];
}
