# Thinner specs: keep the promises, cut the how

**Status:** planned
**Branch:** explore/thinner-specs
**Open questions:** none

## Why

The specs in `openspec/specs/` are meant to be the record of what WongStack promises. Today they come to about 84,000 words — nearly three times the 31,000 words of instructions they describe — because most of each spec retells *how* a skill works, step by step. That makes them slow to read and quick to go stale. Every time a skill changes, the spec has to be updated to match, or it quietly goes wrong.

## What Changes

- **Each spec keeps only its promises.** A rule stays when a person or an installed repo relies on it: what they see, what must never happen, and what an update delivers. The steps, script names, file names, and exact wording go, because the skills already hold them. Each rule keeps one or two examples, not five.
  ```text
  a rule today
  ─────────────────────────────
  promise          ── keeps
  which script     ── cut
  which file       ── cut
  exact wording    ── cut
  5 examples       ── 1 or 2
  ```
- **Overlapping specs merge.** Specs that cover one topic from several sides become one spec. For example, the three about updates become one, and so do the three about memory. That takes 48 files down to about 25.
  ```text
  before (48)              after (~25)
  ───────────              ───────────
  wong-sync           ┐
  wong-sync-adapt     ├──▶ wong-sync
  wong-sync-after-    │
    picture           ┘
  memory-store        ┐
  memory-recall       ├──▶ memory
  memory-capture      ┘
  … and the rest
  ```
- **The specs stay short.** Planning gets a standing rule: a new or changed spec states the promise and leaves the steps to the skill. This also holds in every repo that installs WongStack, so their specs stay short too.
- **What you'll notice:** the spec files get shorter and there are fewer of them. `/verify` checks a preview against these examples, so it has fewer to walk. Nothing else about how WongStack works changes.

**Non-goals:** dropping `openspec/specs/`, changing what any skill does, and rewriting archived changes. The archive keeps the old wording as the record.

## Capabilities

### New Capabilities

None as deltas. The merged capabilities (`memory`, `apply`, `knowledge-center`, and the others in the design's merge map) are written straight into `openspec/specs/` by the tasks.

### Modified Capabilities

None as deltas. This change sets `skip_specs: true` and rewrites `openspec/specs/` directly. The new spec bar is written as a requirement of the merged `openspec-workflow` capability during that rewrite.

## Impact

- `openspec/specs/**`: every spec is rewritten; 31 capability folders fold into 8 new ones, for 25 in all. Target: under 28,000 words in total and at most two scenarios per requirement.
- Payload: `.agents/rules/openspec.md` gains the spec bar; `openspec/config.yaml` (meta-only) gains a `specs` rule that points to it.
- `scripts/retired-names.json`: `allow` paths and replacement texts that name moved or merged specs; new entries for the retired capability names that no live file should still cite.
- `VERSION` 25.13.0 → 25.14.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-26** — Asked which way to take the spec files → chose keep them, but thinner (memory #233, confirmed in the 2026-09-27 queue, memory #292).
- **2026-09-27** — Asked what a spec should keep after the cut → chose promises only: each rule a person or another repo relies on, with one or two examples, and none of the how.
- **2026-09-27** — Asked whether overlapping specs should merge into fewer files → chose merge overlaps.
- **2026-09-27** — Asked whether future changes should follow the same bar → chose yes, add the rule.
- **2026-09-27** — Assumed: the change rewrites `openspec/specs/` directly with `skip_specs: true`, not through delta specs, because OpenSpec 1.13.2 can't drop a scenario inside a MODIFIED block (memory #232). Each of 330 requirements would need a REMOVED plus an ADDED under a new name, which would bury the change. The archive keeps the old wording.
- **2026-09-27** — Assumed: a promise stays in its spec even when a skill also states it, because the spec is the record of what shipped and the skill is how it runs.
- **2026-09-27** — Assumed: the spec bar lives in `.agents/rules/openspec.md`, which ships and loads whenever someone edits `openspec/`, and `openspec/config.yaml` gets a one-line pointer, because the config does not ship to installed repos and the rule should hold there too.
- **2026-09-27** — Assumed: no script counts scenarios or words, because the bar is a judgment about promise versus how, and a count check would push authors to cram examples together rather than cut the how. The totals are checked once, in the tasks.
- **2026-09-27** — Assumed: the merge map in the design lands on 25 capabilities, the low end of the "about 25–30" given in explore, because `downstream-contract` is about tests and fits `ci-tests`, and the other small specs each hold one topic with no overlap. The builder may split a merged spec back out if it reads as two topics.
- **2026-09-27** — Assumed: distinctive retired capability names go into `scripts/retired-names.json`, and names that are also test files or ordinary words stay out, because the check would otherwise flag files that use those names legitimately.
- **2026-09-27** — Assumed: where a spec disagrees with its skill, the rewritten spec follows the skill, because this change thins the record and changes no behavior.
- **2026-09-27** — Assumed: a minor release, 25.14.0, because the rule file that ships to installed repos gains a new planning rule.
- **2026-09-27** — Assumed: the rewrite meets the bar as built — 25 capabilities, 25,487 words, 265 requirements, 344 scenarios, and no requirement with more than two scenarios — so no merged spec was split back out.
- **2026-09-27** — Assumed: the planning-config check requirement moves from `ux-wireframes` to `payload-checks`, because it guards the payload rather than the review page.
