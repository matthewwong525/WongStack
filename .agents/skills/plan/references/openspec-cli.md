# OpenSpec CLI contract

WongStack's public verbs own workflow decisions. OpenSpec owns the planning root, schema, artifact instructions, validation, and archive. No generated agent skill or raw `/opsx:*` command is needed.

## Select one root

Run `openspec context --json` and `openspec list --json` from the working repo. If the user selected a registered store, resolve it with `openspec store list --json`, then pass `--store <id>` to every later command that accepts it. Keep the selected root for the whole change. Do not write under a guessed `openspec/changes` path when the CLI reports an artifact path.

## Create or read a change

- `openspec new change "<name>"` scaffolds a new change. Do not create its directory by hand.
- `openspec status --change "<name>" --json` supplies `changeRoot`, `artifactPaths`, `artifacts[].requires`, status, and `applyRequires`. Read `existingOutputPaths` for completed artifacts; write to `resolvedOutputPath` only for a concrete output. For a glob, select a concrete path named by the instruction.
- `openspec instructions <artifact-id> --change "<name>" --json` supplies the artifact's template, rules, condition, dependencies, and output path. Read completed dependencies from disk. Follow the current schema rather than assuming four artifact names.
- The planning set is `applyRequires` plus its transitive `requires` dependencies. A `done` tasks file does not prove its dependencies exist. Honor deliberate conditional skips and `skip_specs` only when their instructions allow them.
- `openspec instructions apply --change "<name>" --json` supplies the current task file and progress. Work that exact selected change.

## Validate and archive

`openspec validate "<name>" --strict --no-interactive` checks artifacts and delta specs before readiness or archive. `openspec instructions archive --change "<name>" --json` can provide advisory context. After task and gate preflight, `openspec archive "<name>" --yes` performs the archive and syncs unsynced deltas. Use `--skip-specs` only when the change's deltas are already confirmed equal to the main specs. Report a missing or changed CLI field; do not guess a replacement and claim success.

The CLI does not offer a standalone `sync` command in version 1.8.0. Save's semantic delta reconciliation remains in [its own reference](../../save/references/spec-sync.md). Git stays with `/save`, `/continue`, and `/ship`.
