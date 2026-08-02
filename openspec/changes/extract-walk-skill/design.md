## Context

The walkthrough shipped as `/ship` Step 4.5 and is already well-factored: `ship/SKILL.md` owns *when* it runs and what each verdict does to the merge, `ship/references/walkthrough.md` owns *how* a walk is performed, and `ship/scripts/{walk-staging.sh,walk-runner.mjs}` own the mechanics. Roughly 25 lines of `SKILL.md` are the only part welded to `/ship`.

That coupling forced two things the walk didn't otherwise need. First, it can only run at merge time, which is the *last* moment you'd want your first look at the app in a browser. Second, because a merge hung on the verdict, the design had to grow a safety apparatus: `UNKNOWN` must never be mistaken for `NONE`, retries must share `/ship`'s cap of 3 rather than open a second budget, and staging must be reset before each retry. Every one of those rules is downstream of "a merge is waiting on this."

Decoupling removes the reason for that apparatus while keeping every rule that was about *evidence quality* rather than about merging.

Two constraints frame the work. `.claude` is a symlink to `.agents`, so edits target `.agents/` ([repo layout](../../../wiki/development/repo-layout.md)). And editing the payload is a release — `VERSION` plus a newest-first `CHANGELOG.md` entry in the same change.

## Goals / Non-Goals

**Goals:**
- A `/walk` verb that produces browser evidence on demand, at any point in a change's life, as many times as wanted.
- `/ship` returns to being purely merge + archive.
- Preserve every property that makes the evidence trustworthy, independent of gating.
- Leave a repo that never adopted the walk completely unaffected.

**Non-Goals:**
- A general integration-test runner. `/walk` stays a staging-preview walk of OpenSpec scenarios, stack-pack-gated and Playwright-detected.
- Saved tests or accumulated regression coverage — still explicitly declined.
- Replacing PR review or CI.
- Any Cloudflare docs/skills adoption, `disable-model-invocation` work, or the `/save` description-truncation fix.

## Decisions

### 1. `/walk` begins by invoking `/save`

The walk targets the per-commit preview alias, which only exists once CI has published *this* commit. `references/walkthrough.md` already warns against constructing that URL by hand — a self-built URL can point at a commit that was never deployed and still answer `200`. `/save` already does exactly the needed prelude: commit, push, wait for CI, return the per-commit preview URL.

*Alternative considered:* require the user to run `/save` first and have `/walk` fail if the tree is dirty or CI hasn't run. Rejected — it makes the common path a two-step ritual and puts the burden of a subtle ordering constraint on the user.

This does not violate "the git skills own all git." `/walk` implements no git; it delegates, exactly as `/apply` hands completed work to `/save`. The rule is about *ownership*, not about who may call whom.

Note this partially reverses the runbook's recorded "Not part of `/save`" decision, whose reasoning was that walking on every push means N runs per change with reseeds firing while the surface is still changing. That reasoning held against *automatic* walking. It doesn't apply to a walk the user asks for — and the ability to walk mid-change is the point of the extraction. The runbook entry is rewritten rather than deleted, so the distinction is recorded rather than silently dropped.

### 2. `/ship` drops the walk entirely rather than delegating to it

*Alternatives considered:* (a) `/ship` calls `/walk` and still gates on the verdict — keeps today's safety but isn't a decoupling, just a refactor; (b) `/ship` keeps the millisecond preflight and emits a one-line nudge when an adopted repo's PR has no walk evidence — preserves discoverability without gating.

Chosen: full removal. The gate ladder stays a genuinely simple statement (`CI-when-present → merge`), and `/ship` keeps one job. The cost is real and accepted: the walk no longer happens unless someone remembers it. Option (b) remains available later as a pure addition if forgetting turns out to be the common failure.

### 3. Verdicts report; they no longer gate

The five verdicts survive as vocabulary — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — but none of them decides a merge, because there is no merge in scope. What must survive is the *reporting* honesty they encoded: an adopted repo's un-runnable walk is **unverified**, not **absent**, and `/walk` must say so plainly rather than shrugging. The Access-challenge case is the one that matters most — screenshotting a login form and calling it "a page rendered" is exactly the failure the distinction exists to prevent.

Consequently the retry budget shrinks to nothing special: `/walk` reports a `FAILURE` and stops. The user fixes and runs `/walk` again. The shared cap of 3 existed to bound an automatic fix-and-repush loop inside a gate; a user-invoked verb doesn't need a budget, because the user is the loop.

### 4. Evidence is posted on every verdict

Today the comment lands only on `SUCCESS`, because a failure blocked the merge and got fixed before anything was published. Standalone, that's backwards — a failed walk's screenshots are the single most useful artifact the walk can produce. One comment per `/walk` invocation, on every verdict including `FAILURE`, `UNKNOWN`, and `TIMEOUT`. Repeated invocations post repeated comments; that's a truthful log of attempts, and PR comment history is the right place for it.

### 5. Reset staging after a failed walk, not before a retry

The reset rule survives with its rationale intact — a retry against the half-mutated database a failed walk left behind produces a *different* failure and you end up debugging leftovers. But there is no automatic retry now, so the reset moves to the end of a failed walk rather than the start of the next one. Same guarantee (a walk always begins from the seeded fixture), fewer moving parts. A passing walk's data is still left alone.

### 6. Rename the capability and the runbook page

`ship-walkthrough` → `staging-walkthrough`, and `wiki/stack/ship-walkthrough.md` → `wiki/stack/staging-walkthrough.md`. The old names assert precisely the coupling being deleted, and this repo's convention is that names track reality (v8.5.0 was itself a "stop the drift" release).

Nearly every requirement in the existing capability changes — the `/ship`-only positioning, the gating verdicts, the shared cap, the merge outcomes, the reporting trigger. A rename is therefore barely more work than an in-place modification and yields a spec that reads correctly rather than one carrying a contradicted name. Expressed as: all `ship-walkthrough` requirements REMOVED, `staging-walkthrough` ADDED.

*Alternative considered:* keep the name to preserve archive continuity. Rejected — the archive already records the history, and `openspec/specs/` is meant to describe what is true now.

### 7. Version 9.0.0

An adopted repo's `/ship` silently stops gating on the walk. Silence is exactly what makes it breaking: nothing errors, nothing warns, a rung just disappears. Major.

## Risks / Trade-offs

- **A repo that adopted the walk as a gate loses it without noticing** → the `CHANGELOG` entry leads with the removal in those terms, and the rewritten runbook opens by stating the walk is now invoked. Considered and deliberately not mitigated in code (that's decision 2's option (b), available later).
- **`/walk` is forgotten and never run** → accepted. The counterweight is that it's now cheap enough to run repeatedly and early, which is where its value actually is.
- **`/walk` invoking `/save` surprises someone who wanted only a walk** → `/save` is a checkpoint, not a merge; its effects (commit, push, PR) are ones a branch is heading toward anyway. The skill states the ordering and its reason up front.
- **Repeated invocations clutter the PR with comments** → accepted; an honest log of attempts beats a single overwritten verdict, and it mirrors how CI reports.
- **Docs drift across the rename** → six live references outside archives and the changelog (`the-change-loop.md`, `stack/README.md`, `stack/d1-pipeline.md`, `wong-setup/SKILL.md`, `payload-manifest.md`, plus the page itself). Small enough to fix exhaustively in one task, and archived changes are deliberately left alone as historical record.

## Migration Plan

No data or runtime migration — the payload is prose. For a repo syncing to 9.0.0:

1. `/wong-sync` copies `.claude/skills/walk/` in as a file it doesn't have yet.
2. The updated `ship/SKILL.md` and the renamed wiki page are *present* files, so they surface through the adapt step as proposals rather than being overwritten — consistent with the never-overwrite rule.
3. A repo that never adopted the walk sees no behavioral difference at all.

**Rollback:** revert the release commit. The scripts are unchanged in content, so nothing outside the payload is affected.

## Open Questions

None blocking. Deferred by decision, not by uncertainty: whether `/ship` should later gain the one-line "no walk evidence on this PR" nudge (decision 2, option (b)) — revisit if walks turn out to be routinely forgotten.
