// The pack's path to the one CLI convention (`isMain`, `usageError`, `parseCli`).
// It lives in the memory skill, which every install carries, so skills, the pack, CI, and the server share one copy.
export * from '../.claude/skills/memory/scripts/lib/cli.mjs';
