# Design — adapt by default in /wong-sync

## Context

`/wong-sync` Step 3 assigns one of five verdicts per capability (`references/adapt.md`). Three rules drain verdicts away from `adopt`: `divergent` accepts any difference as "legitimate," the concreteness bar demotes an undescribable graft to `not-applicable`, and `present` is never checked for currency. Step 1 computes the changelog entries since the manifest's `BASE` and explicitly does not use them for decisions. Step 2 copies only absent files; a stale-but-unmodified file costs a proposal round trip (`adopt` task → review → `/apply`).

The caution rhetoric protects against overwriting authored files. Verdicts do not overwrite anything — a wrong `adopt` costs the user seconds in review; a wrong `divergent` or `present` hides the gap indefinitely. The costs are asymmetric and the current bias points the wrong way.

## Goals / Non-Goals

**Goals:**

- The default posture becomes "justify *not* adopting": a user who runs `/wong-sync` with no extra instruction gets every worthwhile, non-breaking adaptation proposed.
- Coverage is verifiable: every upstream changelog entry since the last sync is visibly accounted for.
- Small mechanical updates to files nobody here authored stop costing a proposal round trip.
- Locally authored or customized content keeps the absolute never-overwrite guarantee, unchanged.

**Non-Goals:**

- No new verdict in the taxonomy; no change to `declined` semantics, tick-to-overrule, or the two-subagent structure.
- No auto-`/apply`: everything except provably-unmodified file updates still lands as a reviewable proposal, and even direct updates land uncommitted for `/save` review.
- No change to the opt-in gates (stack pack, app scaffold) or to what the manifest bounds.

## Decisions

### 1. Invert the verdict bias in prose, not structure

The taxonomy stays; the assignment rules change in `references/adapt.md`:

- **Tie-break rule, stated once**: when the evidence supports both `adopt` and another verdict, the verdict is `adopt`. Rationale: an `adopt` is reviewed downstream; every other verdict is effectively final until someone reads the record.
- **`divergent` requires a named, deliberate local alternative.** The reason line must name the local mechanism (file, convention, or tool) that covers the capability. A difference the skill cannot attribute to a local decision is `adopt`, not `divergent`.
- **The concreteness demotion is removed.** A graft the skill cannot describe concretely becomes an `adopt` whose task says to shape it with the repo's own `/plan`. Rationale: "the skill couldn't express it" was being stored as "doesn't fit this repo," which mislabels an effort failure as a fit failure. `not-applicable` narrows to its other leg: an `assumes` the repo does not meet.

Alternative considered: a sixth verdict (`adopt-unshaped`). Rejected — the distinction lives fine in the task text, same reasoning the spec already applies to stale files, and a new verdict would ripple through the record shape and promotion rules for no user-visible gain.

### 2. Changelog walk becomes a coverage check

Step 1 already computes the `CHANGELOG.md` entries between the manifest's recorded version (`BASE`) and `LATEST`. Step 3 gains an accountability pass: every entry must map to at least one accounting line, one of:

- **reflected here** — the entry's effect is already present locally (names the evidence);
- **adopt** — covered by a verdict/task in this run (names the capability id);
- **updated directly** — covered by a Step 2 copy or update-if-untouched (names the file);
- **outside payload scope** — the entry touches nothing the payload delivers to targets (e.g. `wong-setup`, source-repo tooling).

The report prints the per-entry accounting. An entry with no line is a visible gap in the run's own output — this is the mechanism that makes "the sync missed X" structurally impossible rather than a matter of trust. Seed manifests keep today's behavior (no `BASE`, no walk, no accounting).

Alternative considered: driving verdicts *from* the changelog instead of from the cartographer's map. Rejected — the map catches capabilities that predate the last sync; the changelog only catches deltas. The walk is a completeness check on the map, not a replacement for it.

### 3. Update-if-untouched: provability via blob hashes

Step 2 gains a third row. For a payload file that exists locally, compute its git blob hash and compare it against the blob hashes of every version of that path in the clone's default-branch history:

```bash
LOCAL=$(git hash-object "$ROOT/<path>")
git -C "$WS" rev-list "$DEFAULT" -- "<path>" |
  while read c; do git -C "$WS" rev-parse -q --verify "$c:<path>"; done
```

If `LOCAL` appears in that list and differs from the current upstream blob, the file is **provably unmodified and stale**: every byte of it was written by some upstream release, so no human authorship exists to protect. The sync replaces it with upstream's current version directly — a working-tree edit like any copy, awaiting `/save`. If `LOCAL` equals the current upstream blob, the file is current (nothing to do). If `LOCAL` matches no historical blob, someone changed it — it keeps the full never-overwrite guarantee and goes to the adapt step, exactly as today.

Consequences and scoping:

- **The guarantee's wording changes from "any existing file" to authorship**, which is the principle the Hard rules already claim ("scoped by authorship, not a list of exceptions"). A byte-for-byte upstream copy was generated by the installer/sync; updating it clobbers nobody's work.
- **Renamed skills**: history is looked up under the *upstream* path (from the manifest's skills mapping), the write happens at the local path.
- **The `CLAUDE.md` `WONG-STACK` block is excluded.** The unit is a block inside a user-owned file, not a path with its own blob history; block extraction plus historical comparison is fragile and the file is by definition co-authored. The block stays on the adapt path.
- **Stack-pack and app-scaffold files** participate only when their opt-in gates already put them in the file list — the rule adds no scope.
- **Reporting**: Step 5 gains an **Updated** list alongside **Copied** — one line per file with the version span (e.g. `9.2.0 → 9.7.0`), so every direct write is visible at review.
- **The adapt step's "stale unmodified file → adopt verbatim" case narrows** to files that are stale but *not* provably unmodified (e.g. installed from a fork or an edited lineage) — rare, and the round trip is then exactly right.

Risk acknowledged: a repo that *deliberately* pinned an old upstream version without editing it is indistinguishable from an unmodified stale file and will be updated. Accepted — the update is visible in the Updated list and in the `/save` diff, reverting is one `git checkout`, and pinning-by-inaction was never a supported contract. A repo that wants a frozen file can edit it (one byte suffices) or decline the capability.

## Risks / Trade-offs

- [More `adopt` verdicts → noisier proposals] → The proposal is grouped and one-task-per-capability; the user skims and skips. `declined` and ticked boxes work unchanged, so a wrong `adopt` is refused once and stays refused.
- [Blob-hash walk cost] → One `rev-list` per present payload file, in a local clone; tens of files, sub-second each. Bounded by the manifest.
- [`rev-list` misses pre-rename history for files upstream itself renamed] → Then the local blob simply fails the proof and falls back to the adapt path — the failure mode is the status quo, never a wrong overwrite.
- [Changelog accounting inflates the report] → One line per entry since last sync; a frequently-syncing repo sees a handful. The accounting lives in the report, not the verdict record, so the record's shape is unchanged except where verdicts themselves changed.

## Migration Plan

Prose-only payload edit; no data or schema migration. Target repos pick it up as an ordinary `wong-sync` capability update on their next sync (the skill updates itself via the adapt path — or, once this ships, via update-if-untouched where their copy is provably unmodified). Release ritual: minor `VERSION` bump, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` must pass.

## Open Questions

None — the three levers were settled in the `/explore` session and the provability rule above resolves the one open design point.
