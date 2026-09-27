# OpenSpec CLI contract

OpenSpec owns the planning root, schema, artifact instructions, validation, and archive; WongStack's verbs own the workflow, with no generated agent skill or `/opsx:*` command.

## Select one root

Run `openspec context --json` and `openspec list --json` from the working repo. For a store the user selected, resolve it with `openspec store list --json` and pass `--store <id>` to every later command that takes it. Keep that root for the whole change; never write under a guessed `openspec/changes` path.

## Create or read a change

- `openspec new change "<name>"` scaffolds a missing change; never hand-create its directory.
- `openspec status --change "<name>" --json` supplies `changeRoot`, `artifactPaths`, `artifacts[].requires`, status, and `applyRequires`. Read completed artifacts from `existingOutputPaths`; write to `resolvedOutputPath` when concrete, else to the path the instruction names.
- `openspec instructions <artifact-id> --change "<name>" --json` supplies the artifact's template, rules, condition, dependencies, and output path. Read completed dependencies from disk. Follow the current schema; never assume artifact names.
- The planning set is `applyRequires` plus its transitive `requires`. Write each ready artifact by its instructions, then recheck status. A `done` tasks file does not prove its dependencies exist: never mark one ready while they are absent. Honor conditional skips and `skip_specs` only where their instructions allow.
- `openspec instructions apply --change "<name>" --json` supplies the task file and progress for that exact change.

## Validate and archive

Run `openspec validate "<name>" --strict --no-interactive` before readiness or archive. `openspec instructions archive --change "<name>" --json` is advisory. After task and gate preflight, `openspec archive "<name>" --yes` archives, syncing unsynced deltas; add `--skip-specs` only when the deltas already equal the main specs. Report a missing or changed CLI field; never guess a replacement and claim success.

Two delta shapes need a workaround:

- **Dropping a scenario.** A MODIFIED block must keep every main-spec scenario, so REMOVE the requirement and ADD it under a new name.
- **Retiring a capability.** Set `retire_capabilities: true` in the change's `.openspec.yaml`; archiving with validation on then deletes the emptied spec.

OpenSpec never runs git; see [the change loop](../../../../wiki/development/the-change-loop.md).

## Reconcile deltas

CLI 1.13.2 has no `sync` command, so `/save` reconciles deltas at each checkpoint, in the same root and store. `openspec status` lists them in `artifactPaths.specs.existingOutputPaths`; none means no sync.

For each delta, read the main spec and `openspec instructions specs --change "<name>" --json`. Apply only its ADDED, MODIFIED, REMOVED, or RENAMED requirements to the main capability path; keep the rest.

- A MODIFIED block replaces the whole named requirement, scenarios included.
- A REMOVED block removes only the named requirement; its reason and migration stay in the change.
- A main spec already equal to the result needs nothing.
- A base requirement missing, or changed beyond what the delta explains, stops the save with the conflict; never append a duplicate or invent a merge.

Then validate.
