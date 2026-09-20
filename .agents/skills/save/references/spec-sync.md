# Sync delta specs at a checkpoint

The CLI has no standalone sync command in version 1.8.0. Use `openspec status --change "<name>" --json` to get the selected change's concrete `artifactPaths.specs.existingOutputPaths`. No files there means no sync. Use the same selected planning root and store for all lookups.

For each delta, read the corresponding main spec and the CLI's `openspec instructions specs --change "<name>" --json` output. Apply only its declared ADDED, MODIFIED, REMOVED, or RENAMED requirements to the main capability path. Preserve unrelated requirements and purpose. A MODIFIED block replaces the complete named requirement, including scenarios. A REMOVED block carries its reason and migration in the change record; remove only the named main requirement. If the main spec already equals the intended result, do nothing. If an expected base requirement is missing or changed in a way the delta does not explain, stop and report the conflict; do not append a duplicate or invent a merge.

Run `openspec validate "<name>" --strict --no-interactive` after reconciliation. Keep all git actions in save. Archive later confirms the main specs equal the deltas before it uses `--skip-specs`; otherwise let the CLI archive perform the remaining sync.
