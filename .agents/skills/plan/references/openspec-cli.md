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

Two delta shapes the CLI refuses or ignores by default:

- **Dropping a scenario.** A MODIFIED block must keep every scenario the main spec has. To drop one, REMOVE the requirement and ADD it under a new name.
- **Retiring a capability.** A delta that removes every requirement leaves an empty spec. Set `retire_capabilities: true` in the change's `.openspec.yaml`, and archive deletes the spec. Archive must run with validation on.

OpenSpec never runs git; [the change loop](../../../../wiki/development/the-change-loop.md) owns that boundary.

## Reconcile deltas

The CLI has no standalone `sync` command in version 1.13.2, so `/save` reconciles deltas at each checkpoint. The selected change's `artifactPaths.specs.existingOutputPaths`, from `openspec status`, lists them; none means no sync. Use the same root and store for every lookup.

For each delta, read the main spec and `openspec instructions specs --change "<name>" --json`. Apply only its ADDED, MODIFIED, REMOVED, or RENAMED requirements to the main capability path, and keep unrelated requirements and the purpose.

- A MODIFIED block replaces the whole named requirement, scenarios included.
- A REMOVED block removes only the named requirement; its reason and migration stay in the change.
- A main spec that already equals the result needs nothing.
- A missing base requirement, or one changed in a way the delta does not explain, stops the save with the conflict. Never append a duplicate or invent a merge.

Then run `openspec validate "<name>" --strict --no-interactive`. Archive later confirms the main specs equal the deltas before it uses `--skip-specs`; otherwise the CLI archive syncs the rest.
