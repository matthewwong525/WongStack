## Context

See proposal.md for the problem and scope. Current `/wong-sync` refreshes a clean source checkout, reads source metadata and inventory, and hands a broad update request to `/explore`. The handoff says to read the target broadly, so a no-op and a one-file update both start another model-driven investigation. The install record already supplies the target component choices, local skill-name mapping, and installed source commit needed for a deterministic comparison.

The payload is not a flat file list. The machine inventory includes whole skill directories, ordinary directories, exclusions, conditional categories, and a marked block in `CLAUDE.md`. Local files can be absent, unchanged from the installed source, independently adapted, or already equal to the latest source. Any fast path must keep those distinctions and must not turn an incomplete comparison into a no-op.

## Goals / Non-Goals

**Goals:** Make a proven no-op end after source refresh and a real update enter exploration with a complete, compact delta. Keep source retrieval, manifest selection, local authorship evidence, and failure states explicit. Make classification repeatable and covered by fixtures.

**Non-Goals:** Make network fetch instantaneous; cache source or target content outside Git; decide how an adaptation should merge; edit target files; replace the normal planning workflow; optimize other verbs.

## Decisions

### 1. Run a helper from the latest clean source checkout

Add a dependency-free Node helper under `wong-sync/scripts/` and invoke the copy in the refreshed source checkout. Its explicit inputs are the target root, clean source root, and install-record path. It reads the current source inventory plus the installed commit from the record and emits versioned JSON on standard output. This lets an old installation use the latest classifier on its first run and avoids a self-update prerequisite.

The helper performs no fetch and no write. `/wong-sync` still owns source retrieval and validates that the helper comes from the clean checkout it just refreshed. The JSON has a top-level status (`current`, `update`, or `error`), source and installed revision facts, selected-category counts, a complete `changes` array, and diagnostics. Each change contains the logical source unit, mapped target path, upstream operation, and local state. It contains no file body or diff hunk. A safety limit fails with an explicit error instead of truncating a change set.

Alternative: encode shell and Git commands directly in `SKILL.md`. Rejected because directory expansion, mapping, block extraction, and failure handling are repeated testable logic.

### 2. Compare the union of installed and current payload selections

Resolve selected categories from the target record. Expand file, directory, skill-directory, exclusion, and block entries at both the installed commit and current source commit, then compare their union. This detects additions, modifications, removals, manifest selection changes, and renamed or remapped skills. Apply the recorded local skill names when producing target paths. Treat the marked `WONG-STACK` block as one logical payload unit, so unrelated `CLAUDE.md` text does not create drift.

For each upstream-changed logical unit, compare the target unit with the installed and latest source values and classify it as missing, installed-equivalent, latest-equivalent, or locally adapted. A locally adapted result is evidence for `/explore`, never permission to overwrite. Upstream paths outside the selected categories do not appear in the report. Manifest and mapping changes remain reportable inputs because they can change the selection itself.

Alternative: compare current source directly with the target. Rejected because it cannot distinguish local authorship from an old unmodified payload and makes every old file look like a conflict.

### 3. A current result stops before `/explore`

After a successful source refresh, `/wong-sync` runs the helper once. `current` reports the source version and commit plus selected-unit count, then stops. It does not update the install record: that remains a target write owned by implementation, and leaving an older record only repeats a cheap deterministic comparison on a later run. `update` passes the structured report, source facts, target choices, prior user decisions, and user intent to `/explore`. The prompt directs exploration to start from `changes` and expand only for a named dependency or target impact.

`error` reports the diagnostic and stops. Missing or non-ancestor installed commits, invalid inventory data, unsafe paths, unreadable inputs, missing block markers where comparison needs them, and Git failures cannot become `current` and cannot send a partial delta to `/explore`.

Alternative: always call `/explore` with the report. Rejected by the user's selected fast path because it preserves most no-op latency and asks a model to confirm a deterministic fact.

### 4. Measure the stable part and prove the removed work structurally

Add `node:test` fixtures that build small temporary Git repositories and cover no-op, one-file change, addition, removal, directory expansion, exclusion, component gating, local skill mapping, marked blocks, local adaptations, already-latest files, manifest evolution, invalid commits, unsafe paths, and read or Git failures. Assert that every error fails closed, the target worktree and index remain unchanged, output omits source content, and the documented `.claude` alias can run the helper.

Add a synthetic large-payload fixture and record elapsed preflight time separately from source refresh. Use a generous CI budget only to catch accidental full-content or quadratic work; record a short local benchmark in the change rather than claiming a stable end-to-end latency. The primary performance proof is structural: the current path has no `/explore` handoff, and the update path carries only changed-unit metadata instead of a full-payload comparison request.

Alternative: assert total `/wong-sync` wall time. Rejected because network and model latency are outside a deterministic CI budget.

## Risks / Trade-offs

- [The installed commit is absent from the refreshed clone] → Fail with the missing revision and recovery context; never widen silently to a current-source-versus-target guess.
- [Manifest evolution hides a removed or newly selected path] → Expand and compare the union of both commit inventories, with category and exclusion fixtures.
- [A mapped or marked unit is compared at the wrong target path] → Emit both logical source and target paths and cover renamed skills and the root block with fixtures.
- [The JSON report becomes large for a major release] → Include paths and classifications only; reject an unsafe size instead of truncating. A large legitimate delta still remains smaller than file bodies and full model rereads.
- [A narrow initial scope misses a target dependency] → `/explore` can inspect a named dependency when a changed unit or discovered reference makes it relevant; it does not repeat an unconditional broad scan.
- [Cold clone or fetch still feels slow] → Report source refresh separately from preflight. This change removes avoidable AI analysis but does not disguise network time.

## Migration Plan

Ship the helper, updated skill text, references, and tests in one payload release. Existing install records remain readable and no target data migration is required. An old installed skill fetches the new source and runs the current helper from that checkout. Update `VERSION` and `CHANGELOG.md`, run the payload link and OpenSpec config checks, and use `/save` for CI evidence. Rollback restores the old skill handoff and removes the helper; install records and target content remain valid.
