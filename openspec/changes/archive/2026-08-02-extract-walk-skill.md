<!-- openspec-archive v1 2026-08-02-extract-walk-skill -->
<!-- file proposal.md utf8 8522 -->
# extract-walk-skill

**Status:** ready-to-ship
**Open questions:** none

## Why

The staging walkthrough is welded into `/ship` as a merge gate, so the only way to see the app driven in a browser is to ship it. That's backwards for the thing people actually want it for — checking whether the work looks right *while it's still being worked on*. As a gate it also has to carry a whole safety apparatus (`UNKNOWN` never merges, a shared retry budget, the reset-before-retry rule) that exists solely because a merge hangs on the verdict.

Making it a verb you invoke — `/walk` — inverts both problems. You get the browser evidence whenever you want it, as many times as you want it, and the machinery it needed to be a gate falls away.

## What Changes

- **New `/walk` skill.** Runs `/save` first (push, wait for CI, resolve the per-commit preview URL), then walks the change's own OpenSpec scenarios against that preview, then posts the evidence as a PR comment. Scope is unchanged from today's walk: stack-pack repos, Playwright-detected, delta-scoped.
- **BREAKING — `/ship` no longer walks.** Step 4.5, the five-verdict table, the walkthrough hard rules, and the walkthrough line in the report are removed. `/ship` becomes CI-when-present → merge. A repo that adopted the walkthrough as a gate loses that gate and must invoke `/walk` deliberately.
- **BREAKING — the gate ladder loses a rung.** `CI-when-present → walkthrough-when-adopted → merge` becomes `CI-when-present → merge`, with PR review as the gate when CI is absent.
- **Evidence is posted on every verdict, not only on success.** With no merge to block, a failed walk's screenshots are the most useful thing that can land on the PR.
- **The verdicts stop gating and start reporting.** `UNKNOWN` and `TIMEOUT` no longer block anything — they are reported as unverified. The distinction they encoded (unverified ≠ absent) is preserved as *reporting* honesty rather than as a merge rule.
- **The capability is renamed** `ship-walkthrough` → `staging-walkthrough`, and the runbook `wiki/stack/ship-walkthrough.md` → `wiki/stack/staging-walkthrough.md`. The old names assert a coupling to `/ship` that this change removes.
- **Files move** from `ship/` to `walk/`: `references/walkthrough.md`, `scripts/walk-staging.sh`, `scripts/walk-runner.mjs`. The payload manifest is updated to match.
- **Release.** `VERSION` 8.5.0 → 9.0.0 and a newest-first `CHANGELOG.md` entry, per the payload-is-a-release rule. Major, because an adopted repo's `/ship` silently stops gating.

**Non-goals.** A general integration-test runner (this stays a staging-preview walk of OpenSpec scenarios); adopting `cloudflare/skills` or any Cloudflare MCP server; any `disable-model-invocation` work (spiked — it blocks the Skill tool and would break every skill-to-skill handoff); fixing `/save`'s description overrunning the 1,536-character skill-listing cap.

## Capabilities

### New Capabilities

- `staging-walkthrough`: the walk as a user-invoked verb — `/save`-then-walk ordering, scenario scouting, throwaway journeys, grading against the written `THEN`, verdicts as report rather than gate, unconditional evidence comment, and the adoption runbook. Replaces `ship-walkthrough` wholesale.

### Modified Capabilities

- `ship-walkthrough`: every requirement is REMOVED — the capability is renamed and rehomed to `staging-walkthrough`. Nothing survives under the old name, because the name asserts the `/ship` coupling being deleted.
- `delivery-gate`: the gate ladder drops the walkthrough rung; the "No local build fallback" requirement stops permitting the walk as a `/ship` gate and instead permits it as a user-invoked verb; `/ship`'s merge conditions no longer reference a walk verdict.

## Impact

**Payload skills**
- New `.agents/skills/walk/` — `SKILL.md`, `references/walkthrough.md`, `scripts/walk-staging.sh`, `scripts/walk-runner.mjs`.
- `.agents/skills/ship/SKILL.md` — remove Step 4.5 + verdict table + walkthrough hard rules + report line, rewrite the `description` frontmatter (it currently advertises the walk), renumber steps.
- `.agents/skills/wong-sync/references/payload-manifest.md` — add `walk` to the workflow-skills list, move the `ship/references/` + `ship/scripts/` entries, update the `wiki/stack/` file list for the renamed page.
- `.agents/skills/wong-setup/SKILL.md` — one sentence describing the walk as something `/ship` does; retarget to `/walk` and the renamed page.

**Wiki**
- `wiki/development/the-change-loop.md` — the gate ladder (§ The gate) loses a rung; `/walk` joins the verb list.
- `wiki/stack/ship-walkthrough.md` → `wiki/stack/staging-walkthrough.md` — rewritten around `/walk`; the "Not part of `/save`" declined-option is revisited (the walk now *begins* with `/save`); the verdict table stops describing merge outcomes.
- `wiki/stack/README.md`, `wiki/stack/d1-pipeline.md` — link and description updates.

**Repo root**
- `VERSION` → `9.0.0`; `CHANGELOG.md` newest-first entry.

**Note on paths:** `.claude` is a symlink to `.agents` — edits target `.agents/` per [repo layout](../../../wiki/development/repo-layout.md).

**Unchanged:** every safety property that isn't about merging — never write inside the repo, never install Playwright or a browser, reset staging only after a failed walk, "no exception thrown" is not a pass, stop and ask on genuinely ambiguous evidence, video is a link not an inline player.

## Decision log

- **2026-08-02** — Planned and implemented in one session; all 26 tasks landed. Three threads were explored, two were closed before planning: a `/cloudflare` docs skill (dropped at the user's call once `cloudflare/skills` turned out to be an Apache-2.0 upstream shipping 2.0 MB / 319 reference files — larger than all of WongStack — making the real question delivery, not authoring), and making most skills command-only to reclaim context. **The command-only thread was killed by a spike, not by opinion:** two probe skills (one with `disable-model-invocation: true`, one control) proved the flag blocks the *Skill tool*, not just autonomous triggering — `Skill spike-flagged cannot be used with Skill tool due to disable-model-invocation`. Since every WongStack verb is both a human entry point and a handoff target (`/apply` → `/save`, `/continue` → `/apply`, `/explore` → `openspec-explore`), setting it would sever the mandated handoffs. Measured cost of all 16 skill descriptions was ~2,307 tokens, ~1% of the window, so the thread was not worth a workaround.
- **2026-08-02** — Decided `/walk` goes in the payload manifest's **stack-pack** section, not the always-copied workflow-skills list: it walks a per-commit preview alias only the pack's pipeline publishes, so outside a stack-pack repo there is nothing to walk. This makes adoption two-level — the pack gates the skill, `playwright` in `devDependencies` gates the walk.
- **2026-08-02** — Kept the runbook's "Not part of `/save`" declined-option rather than deleting it, rewritten to distinguish two different things: `/walk` *invoking* `/save` as its first step (adopted — it's how the preview URL comes to exist) versus `/save` *automatically walking* (still declined — N runs per change with reseeds firing while the surface changes). Added the newly declined option: automatic walking on `/ship`.
- **2026-08-02** — Renamed the capability and the runbook page (`ship-walkthrough` → `staging-walkthrough`) rather than modifying in place. Nearly every requirement changed anyway, so the rename cost almost nothing and avoids a spec whose name contradicts its content. Six live references outside archives; archived changes deliberately untouched as historical record.
- **2026-08-02** — Chose full removal from `/ship` over the "one-line nudge when an adopted repo's PR has no walk evidence" middle ground. Recorded in design.md decision 2 as a clean later addition if walks turn out to be routinely forgotten.
- **2026-08-02** — Branch was created as `command-only-skills` before the spike killed that thread; renamed to `extract-walk-skill` (never pushed, 0 commits) to restore the branch-name = change-name tie.
- **2026-08-02** — Found in passing and **not** fixed here (out of scope): `/save`'s own `description` is 1,583 characters against the 1,536-character skill-listing cap, so its tail — `or get a shareable preview URL of in-progress work` — is silently truncated and can no longer match. Worth its own one-line change.

<!-- end proposal.md -->
<!-- file design.md utf8 9211 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 7586 -->
> **Paths:** `.claude` is a symlink to `.agents` — every edit below targets `.agents/`, per [repo layout](../../../wiki/development/repo-layout.md). A repo-wide `grep` under-counts because it does not follow symlinks; search `.agents/`.

## 1. The /walk skill

- [x] 1.1 `git mv .agents/skills/ship/references/walkthrough.md .agents/skills/walk/references/walkthrough.md` and `git mv .agents/skills/ship/scripts/{walk-staging.sh,walk-runner.mjs} .agents/skills/walk/scripts/` — move, don't copy, so history follows. Verify `.agents/skills/ship/scripts/` is empty afterwards and remove it if so.
- [x] 1.2 Write `.agents/skills/walk/SKILL.md` frontmatter per [adding a skill](../../../wiki/development/adding-a-skill.md): `name: walk`, `user-invocable: true`, and a trigger-rich `description` packed with the phrasings that should fire it (walk the app, see it working in a browser, screenshot the change, staging walkthrough, check it looks right, browser evidence on the PR). Keep it under 1,536 characters — the skill-listing cap truncates silently past that.
- [x] 1.3 Write the `SKILL.md` runbook body: Step 1 invoke `/save` (per design.md decision 1 — state *why* the ordering exists, that a hand-built URL can answer 200 for a commit that was never deployed); Step 2 `walk-staging.sh preflight`; Step 3 follow `references/walkthrough.md`; Step 4 post evidence on every verdict; Step 5 reset staging on `FAILURE` only, then stop; Step 6 report. Open with the loop position and what `/walk` is *not* (not a gate, not a test suite).
- [x] 1.4 Write the verdict table as **report outcomes, not merge outcomes** — five verdicts, none of which blocks anything (per `staging-walkthrough` → "Verdicts report, and gate nothing"). Keep the `UNKNOWN` ≠ `NONE` paragraph, reframed as reporting honesty with the Access-challenge case named.
- [x] 1.5 Carry the surviving hard rules into `SKILL.md`: never write inside the repo, never install Playwright or a browser, reset staging only after a failed walk, cleanup on every exit path including `UNKNOWN` and when asking the user. Drop the merge-related rules entirely.
- [x] 1.6 Fix the moved `references/walkthrough.md` for its new home: retarget `$ROOT/.claude/skills/ship/scripts/…` → `…/walk/scripts/…` (three occurrences: run, publish, cleanup), the `SKILL.md` anchor link in section d, and the "Step 4/4.5/5" references in the § f prose and the "why the walk sits after CI" note. Rewrite § e (recover from a failure) as reset-then-stop with no retry budget.
- [x] 1.7 Change § f to post the comment unconditionally and title it by verdict, and update the comment template so a `FAILURE`/`UNKNOWN` comment reads correctly (not just the ✅ example). Note that repeated invocations append rather than replace.
- [x] 1.8 Confirm `scripts/walk-staging.sh` and `walk-runner.mjs` need no content change — they take `RUN_DIR`/`APP_DIR`/`URL` as arguments and hold no path back to `ship/`. Grep both for `ship` and fix anything found (e.g. a usage string or comment).

## 2. Strip the walkthrough from /ship

- [x] 2.1 Delete Step 4.5 in `.agents/skills/ship/SKILL.md` — the preflight block, the `### Verdicts` table, the `UNKNOWN` ≠ `NONE` paragraph, and the on-FAILURE/on-SUCCESS paragraphs.
- [x] 2.2 Rewrite the `description` frontmatter: it currently advertises walking scenarios with Playwright, screenshots, video, and a PR comment. Remove all of it; `/ship` is PR + CI + squash-merge + archive.
- [x] 2.3 Update the intro: the gate-ladder sentence (line ~13) loses the walkthrough rung and its link; Step 4's hand-off "→ Step 4.5" becomes "→ Step 5".
- [x] 2.4 Remove the walkthrough bullet from Step 6 (report) and the three walkthrough entries from `## Hard rules` (the opt-in-is-detected rule, the never-merge-on-UNKNOWN/TIMEOUT rule, the never-install/never-write rule, and the reset-staging rule). Keep the merge-safety and never-build-locally rules.
- [x] 2.5 Renumber remaining steps so they run 1–5 with no gap, and check every internal cross-reference and anchor link still resolves.

## 3. Wiki

- [x] 3.1 `git mv wiki/stack/ship-walkthrough.md wiki/stack/staging-walkthrough.md`, then rewrite it around `/walk`: the opener stops calling it "an opt-in gate on `/ship`"; the "What actually happens" diagram drops the Step 4/4.5/5 frame; the five-verdict table's third column becomes what each verdict *reports* rather than what it does to the merge; "When a walk fails" becomes reset-then-stop with no shared cap.
- [x] 3.2 In the same page's "What this deliberately isn't", rewrite the **"Not part of `/save`"** entry — the walk now *begins* with `/save`. Per design.md decision 1, record the distinction rather than deleting it: walking *automatically* on every push is still declined (N runs per change, reseeds firing while the surface changes); `/walk` invoking `/save` as its first step is a different thing. Add the newly declined option: automatic walking on `/ship`.
- [x] 3.3 Update `wiki/development/the-change-loop.md` § The gate: the ladder becomes CI-when-present → merge, the walkthrough paragraph goes, and the "unverifiable gate" paragraph keeps only its CI meaning. This file is the **owner** of the doctrine (`delivery-gate`), so it must state the new ladder exactly once and every other surface links here.
- [x] 3.4 Add `/walk` to the change-loop page's verb list, positioned as an on-demand verb outside the `/explore → … → /ship` line rather than a step in it.
- [x] 3.5 Update `wiki/stack/README.md` (the hub entry: new filename, new description — no longer "`/ship` walks", no longer a gate) and `wiki/stack/d1-pipeline.md` line ~94 (`/ship`'s staging walkthrough → `/walk`, and the renamed link target).
- [x] 3.6 Grep `wiki/` and `.agents/` for `ship-walkthrough`, `Step 4.5`, and "walkthrough" and fix every live reference. Leave `openspec/changes/archive/**` and existing `CHANGELOG.md` entries alone — they are historical record.

## 4. Payload plumbing

- [x] 4.1 Update `.agents/skills/wong-sync/references/payload-manifest.md`: the workflow-skills line lists `ship/references/walkthrough.md and ship/scripts/` — move those to `walk/`. Decide and state which list `walk` belongs in — it is **stack-pack-gated**, so it goes in the opt-in stack pack section next to `wong-cloudflare`, not the always-copied workflow-skills list.
- [x] 4.2 In the same file, update the `wiki/stack/` section file list for the renamed `staging-walkthrough.md`.
- [x] 4.3 Update `.agents/skills/wong-setup/SKILL.md` (~line 101): the sentence describing what to tell a fresh repo says "`/ship` can walk through the app in a browser before it merges". Retarget to `/walk` and the renamed page, and keep the guidance not to offer it during fresh setup.
- [x] 4.4 Check `CLAUDE.md`'s `WONG-STACK` block for any walkthrough or gate-ladder line needing the same edit, and add `/walk` to its verb list if the block enumerates verbs.

## 5. Release

- [x] 5.1 Bump `VERSION` 8.5.0 → **9.0.0** (major — an adopted repo's `/ship` silently stops gating, per design.md decision 7).
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry, leading with the breaking removal in the terms an affected reader needs: `/ship` no longer walks, the gate ladder lost a rung, and the walk is now `/walk`. Cover the rename of both the capability and the runbook page, and the every-verdict comment.
- [x] 5.3 Verify the whole change: `openspec validate --changes extract-walk-skill`, then re-grep for `Step 4.5` and `ship-walkthrough` outside archives to confirm nothing was missed.

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 5376 -->
## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → merge, a skipped rung never being a failure), the scope of the direct-to-default-branch carve-out, and the prose allowlist (`notes/**` + `wiki/**`) with its rationale. Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability.

Two bounded exceptions, each because the reader must act without leaving the page:

- `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.
- `.claude/skills/save/SKILL.md` SHALL state the allowlist's two path prefixes inline **once**, as the operational routing test the skill performs. Its other sections SHALL link to that single statement rather than repeat it.

No payload surface SHALL assert CI as the sole or required gate, state the carve-out as `notes/*.md` alone, or say that wiki edits require a pull request. No payload surface SHALL describe the staging walkthrough as a rung of the gate ladder or as a condition on the merge. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: No surface describes the walkthrough as a gate

- **WHEN** a reader reviews `wiki/development/the-change-loop.md`, the `ship` skill, or the stack section
- **THEN** no surface presents the staging walkthrough as a rung of the ladder or as a condition on the merge
- **AND** the walkthrough is described as something `/walk` produces on request

#### Scenario: The carve-out has one owner

- **WHEN** a reader reviews `CLAUDE.md`, `notes/README.md`, and the `save` and `dream` skills
- **THEN** each either links to `wiki/development/the-change-loop.md` or carries one summarizing line naming it
- **AND** no surface other than `save/SKILL.md`'s single operational statement reproduces the allowlist's scope, exceptions, or rationale

#### Scenario: The save skill can route without leaving its runbook

- **WHEN** `/save` reaches the point of deciding a save's route
- **THEN** the two path prefixes are stated inline at that point
- **AND** the skill's later sections link back to that statement rather than restating the prefixes

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate or the carve-out in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping.

**The boundary is building versus exercising.** Driving a browser against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It SHALL NOT gate `/save` or `/ship`: it is reached only by invoking `/walk`, and its verdict conditions no merge.

The gate ladder is: **CI when present → merge.** A rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo runs `/walk`
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: The walkthrough does not gate the merge

- **WHEN** an adopted repo runs `/ship` without having run `/walk`, or after a `/walk` that returned `FAILURE`
- **THEN** `/ship` merges on green CI alone
- **AND** the walk verdict is neither consulted nor reported

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI configured
- **THEN** `/ship` merges on green CI alone, reporting no gap

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/ship-walkthrough/spec.md utf8 4161 -->
## REMOVED Requirements

The `ship-walkthrough` capability is removed in full. Its name asserts the coupling to `/ship` that this change deletes, and nearly every requirement it holds is stated in terms of a merge that `/walk` does not perform. It is replaced by `staging-walkthrough`, which carries forward every property that was about the trustworthiness of the evidence and drops every property that existed only because a merge was waiting on the verdict.

**Reason** (applies to all requirements below): the walkthrough is no longer a step of `/ship` or a gate on the merge. It is reached only by invoking `/walk`.

**Migration** (applies to all requirements below): see the `staging-walkthrough` capability. Repos that adopted the walkthrough keep the same `playwright` opt-in signal, the same scouting and grading discipline, and the same evidence comment; they must now invoke `/walk` rather than receive the walk as part of `/ship`.

### Requirement: Adoption is detected from state, never configured

**Reason**: Restated under `staging-walkthrough` with `/ship` replaced by `/walk` and the stack-pack gate made explicit.
**Migration**: `playwright` in the app's `devDependencies` remains the entire opt-in; no repo action is required.

### Requirement: The walkthrough runs on /ship only, between CI-green and the merge

**Reason**: The positioning this requirement fixes no longer exists — there is no `/ship` step to sit between CI-green and the merge.
**Migration**: Replaced by "The walkthrough is a user-invoked verb" and "/walk begins by invoking /save", which preserve the load-bearing part of the ordering (the preview URL must exist for this commit) while removing the merge-time positioning.

### Requirement: Scenarios become journeys, scoped to the change

**Reason**: Carried over unchanged in substance under the new capability name.
**Migration**: None — behavior is identical.

### Requirement: The walk is throwaway and saves nothing

**Reason**: Carried over unchanged in substance, with the cleanup-on-every-exit-path rule promoted from the skill's hard rules into the requirement.
**Migration**: None — behavior is identical.

### Requirement: The verdict is graded against the written expectation

**Reason**: Carried over unchanged in substance under the new capability name.
**Migration**: None — behavior is identical.

### Requirement: The walkthrough gates the merge, with five verdicts

**Reason**: No verdict gates anything now. `/walk` performs no merge and no other skill consults its result.
**Migration**: Replaced by "Verdicts report, and gate nothing". The five verdict names survive, and the `UNKNOWN` ≠ `NONE` distinction survives as a rule about honest reporting rather than about merging.

### Requirement: Failure resets staging, then re-walks under the existing cap

**Reason**: The shared cap of 3 existed to bound an automatic fix-and-repush loop inside a merge gate. A user-invoked verb has no such loop to bound.
**Migration**: Replaced by "A failed walk resets staging, then stops". The reset survives with its rationale; it now runs at the end of a failed walk rather than before an automatic retry, giving the same guarantee that a walk begins from the seeded fixture. The user re-invokes `/walk` after fixing.

### Requirement: Evidence is reported as a PR comment that degrades honestly

**Reason**: The comment was posted only on `SUCCESS`, because a failure blocked the merge and was fixed before anything was published.
**Migration**: Replaced by "Evidence is posted on every verdict and degrades honestly", which posts on every verdict and appends one comment per invocation. The honest-degradation rules for missing media hosts and for video links are unchanged.

### Requirement: Adoption is recommended and documented, never forced

**Reason**: The runbook it mandates is rewritten around `/walk` and renamed from `wiki/stack/ship-walkthrough.md` to `wiki/stack/staging-walkthrough.md`.
**Migration**: Restated under `staging-walkthrough` with the declined-options list extended to record why the walk is not automatic, and to distinguish that from `/walk`'s own `/save`-first step.

<!-- end specs/ship-walkthrough/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 16273 -->
## ADDED Requirements

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached only by invoking `/walk`. No other skill SHALL run it: `/ship`, `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/walk` SHALL be invocable at any point in a change's life and any number of times, rather than only at merge time. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error.

`/walk` SHALL be part of the opt-in stack pack, gated the same way `/wong-cloudflare` is: a repo whose `.claude/.wong-stack.json` does not have `components.stackPack: true` SHALL never receive the skill.

#### Scenario: Shipping does not walk

- **WHEN** `/ship` runs in a repo that adopted the walkthrough
- **THEN** no walk runs, no walk verdict is produced, and the merge proceeds on CI-green alone
- **AND** no warning or nudge about the absent walk is emitted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/walk` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/walk` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

### Requirement: /walk begins by invoking /save

`/walk` SHALL invoke `/save` before walking, so the commit under test is pushed, CI has run, and the per-commit preview URL exists. `/walk` SHALL NOT implement any git action itself — it delegates, as `/apply` does when it hands completed work to `/save`.

The walk SHALL target the per-commit preview alias discovered by the existing preview-URL helper for the current head SHA. It SHALL NOT ask the user for a URL, and SHALL NOT construct one from a worker-name convention: a hand-built URL can address a commit that was never deployed and still answer `200`.

When `/save` reports that CI is absent (`NONE`), `/walk` SHALL still proceed if a preview URL can be discovered, and SHALL treat an undiscoverable URL as a condition to report rather than a URL to guess.

#### Scenario: Save runs first

- **WHEN** `/walk` is invoked on a branch with uncommitted work
- **THEN** `/save` runs first — committing, pushing, waiting for CI, and resolving the preview URL
- **AND** the walk targets the URL that `/save` resolved

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walk needs a URL
- **THEN** it uses the per-commit preview URL produced by the preview-URL helper for the current head SHA
- **AND** it neither prompts for a URL nor derives one from a naming convention

#### Scenario: No discoverable preview URL

- **WHEN** the repo's CI does not deploy, so no preview URL exists for this commit
- **THEN** the verdict is `UNKNOWN` and the report names the missing deployment as the cause
- **AND** no URL is guessed

### Requirement: Adoption is detected from state, never configured

Within a stack-pack repo the walk SHALL be opt-in, and consent SHALL be inferred from observable repo state rather than from a flag: `playwright` present in the app's `devDependencies` means this repo adopted the walkthrough. There SHALL be no manifest field, no config file, and no skill argument that enables or disables it.

The walkthrough SHALL NEVER install `playwright`, a browser, or any other dependency — not as a convenience, not on a prompt, not "while we're here." A missing dependency is a statement that the repo did not opt in, or (once it has) a condition to report, never a condition to fix.

#### Scenario: A repo that never opted in

- **WHEN** `/walk` is invoked in a repo whose app has no `playwright` devDependency
- **THEN** the verdict is `NONE` and the skill reports that the repo has not adopted the walkthrough
- **AND** nothing is installed and no other skill's behavior changes

#### Scenario: Installing playwright is the whole opt-in

- **WHEN** a repo adds `playwright` to its app's `devDependencies` and installs a browser
- **THEN** the next `/walk` walks with nothing else configured

#### Scenario: The walkthrough never installs its own dependency

- **WHEN** the walk finds `playwright` declared but its browser binary missing
- **THEN** it does not download or install the browser
- **AND** it reports the condition as a verdict rather than repairing it

### Requirement: Scenarios become journeys, scoped to the change

A scout SHALL derive the journeys from the change's own OpenSpec scenarios rather than from the application's routes or components. Its inputs SHALL be the delta specs under `openspec/changes/<slug>/specs/**`, plus the scenarios of any capability in `openspec/specs/` that the branch diff touches. The full synced spec surface SHALL NOT be walked — the walk is acceptance for this change, not a regression suite whose cost grows with the app.

The scout SHALL keep only scenarios observable through a browser against an HTTP-serving preview. Scenarios whose behavior lives outside the request path — queue consumers, cron triggers, alarms — SHALL be excluded, because a version alias serves HTTP only.

Each journey SHALL carry the scenario's `WHEN` as its steps and the scenario's `THEN`, verbatim, as its pass criterion.

#### Scenario: Scope is the change plus what the diff touches

- **WHEN** the scout runs on a change with delta specs for one capability, whose diff also edits files covered by a second capability's spec
- **THEN** the journeys cover the delta scenarios and the second capability's scenarios
- **AND** capabilities unrelated to both are not walked

#### Scenario: Non-browser scenarios are excluded

- **WHEN** a change's scenarios describe a queue consumer's behavior
- **THEN** the scout excludes them from the journeys and records why

#### Scenario: The pass criterion is the scenario's own words

- **WHEN** a journey is built from a scenario
- **THEN** its expected outcome is the scenario's `THEN` text, not a restatement invented by the scout

#### Scenario: Destructive journeys are walked

- **WHEN** a scenario describes deleting a record
- **THEN** the scout includes it as a journey rather than skipping it as unsafe

### Requirement: The walk is throwaway and saves nothing

Each journey SHALL be driven by a Playwright script generated for that run, written outside the repository working tree, and deleted when the run ends. The walk SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, or any other artifact inside the repo, and SHALL leave the working tree unchanged.

The run SHALL capture a screenshot after each step and a video for each journey. The generated scripts SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no generated script, screenshot, or video remains under the repository root

#### Scenario: Evidence is captured per step and per journey

- **WHEN** a journey of four steps is walked
- **THEN** four screenshots and one video exist for that journey in the run's temporary directory

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

### Requirement: The verdict is graded against the written expectation

The pass or fail call for each journey SHALL be made by reading the captured evidence against the scenario's `THEN`. The judgement SHALL NOT rest on the absence of an exception, an HTTP status alone, or the agent's impression that the page "looks fine": a journey whose script completed without error but whose screenshots do not show what the `THEN` describes SHALL fail.

No second judging subagent is required. The external check is that the expectation was written by `/plan`, before the walk existed, for reasons unrelated to passing it.

Where the evidence is genuinely ambiguous, the walk SHALL stop and ask the user, presenting the screenshot and the `THEN` side by side, rather than resolving the ambiguity in either direction on its own.

#### Scenario: A silent wrong result fails

- **WHEN** a journey's script completes with no error, but the screenshot shows no validation message where the scenario's `THEN` requires one
- **THEN** the journey fails

#### Scenario: Ambiguity is escalated, not resolved

- **WHEN** the captured evidence neither clearly satisfies nor clearly contradicts the scenario's `THEN`
- **THEN** the walk stops and asks the user, showing the screenshot and the expectation
- **AND** it does not resolve the ambiguity on its own judgement

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/walk` performs no merge and no other skill consults its result.

- **NONE** — not adopted, or adopted with no browser-observable scenarios. Report which, in one line.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted: the browser is missing, the preview URL is undiscoverable, staging is unreachable, or the walk landed on a Cloudflare Access challenge page.
- **TIMEOUT** — the walk did not finish in its budget.

`UNKNOWN` SHALL NOT be reported as `NONE`. Once a repo has adopted the walkthrough, a walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms. This distinction SHALL survive as reporting honesty even though it no longer gates anything: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted, and the skill stops
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Adopted but nothing to walk

- **WHEN** the scout finds no browser-observable scenarios in an adopted repo
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk

#### Scenario: An Access challenge is not a page

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the missing service-token credentials as the likely cause

#### Scenario: Unverified is reported as unverified

- **WHEN** an adopted repo's walk cannot run because the browser binary is missing
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: A failed walk resets staging, then stops

On `FAILURE`, `/walk` SHALL reset the staging database using the stack pack's existing staging reset command, then stop. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one.

The reset guarantees that the next walk begins from the seeded fixture rather than from the partial state a failed walk left behind, because a retry against half-mutated data produces a different failure and sends the reader after leftovers instead of the bug.

`/walk` SHALL NOT fix, re-push, or re-walk automatically, and SHALL NOT carry a retry budget. The user fixes and invokes `/walk` again.

#### Scenario: Reset follows a failure

- **WHEN** a journey fails
- **THEN** the staging reset command runs before the skill stops

#### Scenario: A passing walk leaves its data

- **WHEN** a walk returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: No automatic retry

- **WHEN** a walk returns `FAILURE`
- **THEN** the skill does not attempt a fix, a re-push, or a second walk
- **AND** it reports what failed and what the user should look at

### Requirement: Evidence is posted on every verdict and degrades honestly

`/walk` SHALL post its result as a comment on the pull request on **every** verdict, including `FAILURE`, `UNKNOWN`, and `TIMEOUT` — not only on success. A failed walk's screenshots are the most useful evidence the walk can produce, and there is no merge being blocked that would otherwise carry the news.

Each comment SHALL cover each journey, its steps, its verdict, and the scenario's `THEN` it was judged against. The written record SHALL be complete on its own, independent of whether any media renders.

One comment SHALL be posted per `/walk` invocation. Repeated invocations SHALL post additional comments rather than editing or replacing earlier ones, so the pull request carries a truthful log of attempts.

Media SHALL be linked when a public object-storage host is configured and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run. The report SHALL NOT claim inline video playback — only GitHub's browser-upload attachment path renders video inline and it is unreachable from the command line, so a hosted video SHALL be presented as a link.

#### Scenario: A failed walk still posts

- **WHEN** a walk returns `FAILURE`
- **THEN** a PR comment is posted containing the failing journey, its steps, its `THEN`, and its screenshots

#### Scenario: An un-runnable walk still posts

- **WHEN** a walk returns `UNKNOWN` because the preview URL could not be discovered
- **THEN** a PR comment is posted stating that the walk was not verified and why

#### Scenario: Repeated walks append

- **WHEN** `/walk` is invoked twice on the same pull request
- **THEN** two comments exist, in invocation order
- **AND** the first is not edited or deleted

#### Scenario: Comment without a media host

- **WHEN** an adopted repo with no configured media host completes a walk
- **THEN** the comment contains the journeys, steps, and verdicts in full
- **AND** media is referenced by local path, with no failure reported for the missing host

#### Scenario: Comment with a media host

- **WHEN** a public bucket is configured
- **THEN** screenshots render inline in the comment and each journey's video appears as a link

### Requirement: Adoption is recommended and documented, never forced

A runbook SHALL ship in the payload's stack section covering what the walk needs, in rungs that each degrade to the one below: the `playwright` install; the Access service-token headers when the repo is Access-protected; and the optional public bucket for inline media. It SHALL state the prerequisite that `schema/seed.sql` hold enough rows for the app to be exercisable.

The runbook SHALL record the deliberately declined options so they are not re-litigated: a saved test suite, a second judging agent, walking the full spec surface, and walking automatically on every push. It SHALL state that `/walk` invokes `/save` as its first step and why, distinguishing that from the declined option of walking automatically whenever `/save` runs.

Onboarding and sync SHALL be able to offer the capability the way the stack pack itself is offered, and declining SHALL leave every other skill unchanged.

#### Scenario: Declining changes nothing

- **WHEN** a repo is offered the walkthrough and declines
- **THEN** no file is written and no other skill's behavior changes

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walk does not run automatically on every `/save`
- **THEN** the runbook states the decision and its reason
- **AND** distinguishes it from `/walk`'s own `/save`-first step

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
