// The command line of one headless agent run, for Claude Code or Codex. A narrow grant names the tools, folder and
// writable roots it may use, as the memory run does; `full` bypasses permissions, as a daily background run does.

/** `[command, args]` for `agent` ('claude' or 'codex'); `access` is `{ full: true }` or `{ tools, dir, writable }`. */
export function headlessCommand({ agent, prompt, model, access }) {
  if (agent === 'codex') {
    const sandbox = access.full ? ['--dangerously-bypass-approvals-and-sandbox']
      : ['--sandbox', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true',
        '-c', `sandbox_workspace_write.writable_roots=[${access.writable.map(root => JSON.stringify(root)).join(',')}]`];
    return ['codex', ['exec', '--ephemeral', '--skip-git-repo-check', ...(model ? ['-m', model] : []), ...sandbox, '-c', 'approval_policy="never"', prompt]];
  }
  const grant = access.full ? ['--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose']
    : ['--permission-mode', 'dontAsk', '--allowedTools', ...access.tools, '--add-dir', access.dir];
  return ['claude', ['-p', prompt, ...(model ? ['--model', model] : []), '--no-session-persistence', ...grant]];
}
