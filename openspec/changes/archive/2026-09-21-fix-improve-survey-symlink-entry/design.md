## Context

The survey module exports functions and also runs as a CLI when `process.argv[1]` identifies the module. Node resolves the module URL through symlinks, but `process.argv[1]` keeps the path that the caller typed. WongStack documents the `.claude/...` alias, while this source repository stores the file under `.agents/...`.

## Goals / Non-Goals

**Goals:**

- Identify direct execution by file identity after path resolution.
- Test the documented alias and the canonical path as real CLI processes.
- Preserve the current import-only behavior, JSON schema, and exit codes.

**Non-Goals:**

- Change how the survey resolves a user-supplied area.
- Change survey findings or filter historical changelog links.
- Add a dependency or a platform-specific command.

## Decisions

### Compare real paths at the CLI boundary

Resolve `process.argv[1]` with Node's file-system path API before comparing it with the module path. The helper already resolves repository aliases and imports the required API, so this uses the same path-identity rule without a new dependency.

Alternative: change the skill to invoke `.agents/...`. Rejected because target repositories use `.claude/...` as the public payload path, and the source repository must dogfood that command.

Alternative: run the CLI block for every import. Rejected because tests and other callers import the survey functions without authorizing a scan or process exit code.

### Test both public and canonical entry paths

Spawn the helper once through `.claude/...` and once through `.agents/...` against the same fixture, then compare parsed reports and successful exit states. This verifies observable behavior and closes the current gap where scope alias handling is tested but script-path alias handling is not.

## Risks / Trade-offs

- [The invoked script path becomes unavailable before the comparison] → Treat that as not being a direct CLI entry; normal execution keeps the script file present for the process lifetime.
- [Platform path spelling differs] → `realpathSync` normalizes the existing file through the host file system before comparison.

## Migration Plan

Publish a patch release. Existing callers need no change. Rollback restores the previous entry comparison and its known silent failure through aliased paths.
