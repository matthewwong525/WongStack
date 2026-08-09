# Adapt by default in /wong-sync

**Status:** ready-to-ship
**Open questions:** none

## Why

Users cannot trust `/wong-sync` to propose everything worth adopting: they must ask it to "adapt as much as possible" on each run. The conservatism is coded into the skill — `divergent` needs no evidence of intent, a graft the skill cannot describe is demoted to `not-applicable`, `present` claims currency that nothing verifies, and the changelog walk computes the list of small upstream improvements and then discards it. The caution is calibrated for overwriting files, but verdicts only write a proposal the user reviews — the safety gate already exists downstream, so the bias should invert.

## What Changes

- **Invert the verdict bias** in `.claude/skills/wong-sync/references/adapt.md`:
  - When in doubt between `adopt` and any other verdict, the verdict is `adopt` — a proposal is reviewable; a suppressed gap is not.
  - `divergent` requires naming a deliberate local alternative. A difference with no evidence of intent is `adopt`.
  - Remove the concreteness demotion: a graft that cannot yet be described concretely is an `adopt` whose task is to shape it with `/plan`, not `not-applicable`.
- **Make the changelog walk load-bearing**: every `CHANGELOG.md` entry between the manifest's `BASE` and the clone's `LATEST` must map to at least one verdict line — "reflected here" or `adopt` — and the report accounts for each entry, so "the sync missed X" becomes structurally impossible.
- **Update-if-untouched** in Step 2 of `.claude/skills/wong-sync/SKILL.md`: a local payload file byte-identical to any historical upstream version of that path (verified against the clone's git history) is provably unmodified — the sync updates it to upstream's current version directly, with no proposal round trip. This narrows the "never overwrite" guarantee from "any existing file" to "any file a human or another tool authored," which is the authorship principle the guarantee already claims to be scoped by.
- **Release ritual**: `VERSION` bump (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs`.

**Non-goals**: no new verdicts in the taxonomy, no auto-`/apply` of proposed adoptions, no change to the review flow (everything beyond provably-unmodified files still lands as a proposal the user reviews), no change to `declined` semantics or tick-to-overrule.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `wong-sync`: the "never overwrite an existing file" guarantee is re-scoped by authorship — Step 2 gains update-if-untouched for payload files byte-identical to a historical upstream version; everything human-authored keeps the absolute guarantee.
- `wong-sync-adapt`: verdict assignment gains an adopt-when-in-doubt default; `divergent` requires a named deliberate local alternative; the concreteness demotion to `not-applicable` is replaced by an `adopt` task to shape the graft; the changelog walk becomes a per-entry coverage check feeding verdicts and the report.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — Step 1 (changelog walk wording), Step 2 (update-if-untouched), Step 5 (report), Hard rules.
- `.claude/skills/wong-sync/references/adapt.md` — gap-analysis rules, concreteness bar, report format.
- `VERSION`, `CHANGELOG.md` — payload release.
- Target repos: on next sync, more capabilities land as `adopt` proposals and provably-unmodified stale files update without a round trip; locally customized files are untouched, exactly as before.

## Decision log

- **2026-08-09** — Explored, planned, and implemented in one session. The `/explore` diagnosis located the conservatism in three spec rules (an unearned `divergent`, the concreteness demotion to `not-applicable`, an unverified `present`) plus the discarded changelog walk; the reframe that settled the direction: verdicts only write a reviewable proposal, so overwrite-level caution there is misallocated — a wrong `adopt` costs seconds, a wrong `divergent` hides the gap indefinitely. All three levers approved by the user and implemented: adopt-when-in-doubt bias in `references/adapt.md`, per-entry changelog accounting, and update-if-untouched in Step 2 proven by blob-hash match against the clone's default-branch history (any one-byte difference defeats the proof; `WONG-STACK` block excluded; renamed skills proven under the upstream path). A sixth verdict (`adopt-unshaped`) was ruled out — the distinction lives in task text. Accepted trade named in design.md: a deliberately pinned-but-unedited old file is indistinguishable from an unmodified stale one and will be updated, visibly, revertable at `/save` review. Released as 9.8.0; `check-payload-links.mjs` green. 13/13 tasks complete.
- **2026-08-09** — Shipped. Delta specs already folded into `openspec/specs/wong-sync/` and `openspec/specs/wong-sync-adapt/` at the pre-ship `/save`; change archived to `openspec/changes/archive/2026-08-09-wong-sync-adapt-by-default/` and checkpointed for the squash-merge of PR #61.
- **2026-08-09** — Merge conflict with `main`: releases 9.8.0 (walk scouting) and 9.9.0 (ship walks for evidence) landed upstream while this change was in flight, both touching only `VERSION`/`CHANGELOG.md` against us. Resolved by renumbering this release **9.8.0 → 9.10.0**; the changelog entry now sits above 9.9.0 and no payload content conflicted.
