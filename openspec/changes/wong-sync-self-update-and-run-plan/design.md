# Design — self-update first, and one plan per run

## Context

v9.10.0 gave the sync two things this change builds on: a **blob-hash proof** that a payload file carries no local authorship, and an **authorship-scoped** never-overwrite guarantee. With those in place, updating the `wong-sync` skill itself is mechanically identical to updating any other untouched payload file — the only open question is *when* in the run it happens.

Today it happens in the general Step 2 loop, which is too late to matter: the instructions for the run were read before Step 2 executed, so the improvement sits on disk unused until the next invocation. A repo that syncs monthly is always one release behind in *behavior* even when its files are current.

Separately, the run's output is split across surfaces with different durabilities. The change folder (written only on `adopt`) is reviewable and permanent; the copied/updated file list is chat output that scrolls away; the verdict record covers judgments but not file actions. There is no one document that answers "what did this run do to my repo."

## Goals / Non-Goals

**Goals:**

- A sync executes upstream's current logic, not the logic that happened to be installed — without a second invocation.
- Every run that changes anything leaves exactly one reviewable plan enumerating the whole changeset.
- Both hold without weakening the authorship guarantee: a customized `wong-sync` is never overwritten and never silently bypassed.

**Non-Goals:**

- No change to the verdict taxonomy, the adopt-by-default bias, or the verdict record's role as the single store of verdicts.
- No git in the target, no implementing of grafts, no manifest widening.
- No migration of existing `adopt-wongstack-*` folders in target repos.

## Decisions

### 1. The self-update is a labeled pass at the top of Step 2, not a new step

The mechanism is exactly update-if-untouched, so it belongs where that mechanism is defined rather than duplicated into a Step 1.5. Step 2 becomes: **self-update pass first, then the general file loop over the rest of the manifest.** Files under `.claude/skills/wong-sync/` are removed from the general loop's scope once the pass has handled them, so no file is considered twice.

Alternative considered: a separate step between clone refresh and copy. Rejected — it would restate the proof and the exclusions, and the two would drift.

### 2. Re-read means re-run Step 0, keep Step 1's clone

The honest reading of "follow the new instructions" is that the *instructions* are replaced, not the *environment*. So after the pass writes new files:

- **Re-read** `SKILL.md` and `references/**` from disk and discard the in-memory copy. Everything from here follows the new text, including any step this version doesn't have.
- **Re-run Step 0** against the new instructions. It is a manifest read — cheap — and the new version may read a key the old one never looked at. Carrying forward the old Step 0's variables would silently run the new logic on an incomplete reading.
- **Keep Step 1's refreshed clone**, `LATEST`, `WS_HEAD`, and the changelog list. Those are facts about the clone, established under either version's instructions, and re-fetching would cost a network round trip to learn nothing.

**Loop guard: the pass runs at most once per run**, stated as a hard rule rather than left to the proof. After the write the local files equal upstream's current blob, so a second pass would find nothing stale anyway — but a version-skew bug that made the proof disagree with itself must not be able to spin.

### 3. Version skew is reported, never hidden

When the pass fires, Steps 0–1 ran under the old version and everything after ran under the new one. The report says so explicitly — `self-updated 9.8.0 → 9.11.0; the rest of this run followed 9.11.0` — because a run that behaves like two versions is exactly the situation where a surprised reader needs to know which text to consult.

### 4. A customized wong-sync fails the proof loudly, not quietly

One edited byte and the pass cannot fire. The run then states plainly that it is continuing on the installed version and names it, and Step 3 proposes the adaptation through the ordinary adopt path. This is the same trade the whole skill makes — customization is safe, and the cost of safety is that the improvement arrives as a proposal instead of a write. Saying nothing would be the failure mode: the user would believe they were running current logic.

### 5. The change folder is renamed and written whenever the run did anything

`adopt-wongstack-<date>` → `sync-wongstack-<date>`. The old name described the folder's *only* trigger; the new one describes the run. The `-2`/`-3` same-day collision rule carries over unchanged.

**Written when:** the run copied a file, updated a file, self-updated, or has at least one `adopt`. **Not written when:** none of those happened — an empty change is noise, and the verdict record already says "current," which is the whole message.

**Existing `adopt-wongstack-*` folders are left alone.** They are historical changes, often already archived; a rename migration would rewrite shipped records to no benefit.

### 6. Landed edits go in the proposal; remaining work goes in the tasks

The copies and updates are already in the working tree when the plan is written, so they are not tasks — they are what the proposal *describes*. Tasks stay for work that remains: one per `adopt`, preceded by a single review task when any file changed, so a no-adopt run still hands the reader something to do (`review the N files this sync landed, then /save`).

This does put already-applied edits inside a forward-looking artifact. It is justified because the edits are **uncommitted**: review still precedes anything durable, and `/ship` then archives the folder as the record of that sync — which is exactly the repo's doctrine that the archived change is the record of what shipped.

Alternative considered: a separate non-OpenSpec run report (`.claude/wong-sync-last-run.md`). Rejected — it recreates the problem in file form, giving the user two documents to reconcile when the ask was for one reviewable plan.

## Risks / Trade-offs

- [Self-update executes newly fetched instructions in the same run, so a bad upstream release takes effect immediately rather than after a review] → The blast radius is bounded by everything else the skill already guarantees: no git in the target, read-only clone, proposes-never-implements, and authorship-scoped writes. Every file it touches is uncommitted and visible in the `/save` diff. A repo that wants the old behavior can pin by editing its copy, which defeats the proof by design.
- [A folder per run creates churn in repos that sync often] → Only runs that actually changed something write one, the same-day collision rule already exists, and `/ship` archives them. A no-op sync stays silent.
- [Re-running Step 0 mid-run could produce different values than the first pass] → That is the point, and it is reported: the manifest is re-read under the instructions that will actually use it.
- [The proposal describes edits the reader can also see in the diff] → Deliberate duplication; the diff shows *what* bytes changed, the proposal says *why* each file was in scope and what it buys the repo.

## Migration Plan

Prose-only payload edit; no data or schema migration, and no target-repo migration. A target picks this up on its next sync — through the ordinary adapt path if its `wong-sync` is customized, or as a direct update if it is untouched. The first run after adoption is the last one that will not have self-updated first. Release ritual: minor `VERSION` bump from 9.10.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` must pass.

## Open Questions

None — the folder rename, the write-when rule, and the landed-edits-in-proposal placement are settled above and visible for review.
