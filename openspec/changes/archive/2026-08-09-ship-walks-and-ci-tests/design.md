# Design — ship-walks-and-ci-tests

## Context

`/ship` today: preflight → archive → delegate `/save` once → merge on `SUCCESS`/`NONE`. It never tests and never walks, and both stances are restated several times in its SKILL.md. The pack's `deploy.yml` has a single `deploy` job: build wrapper + deploy wrapper, with the double-fire collapse (`push`/`pull_request` dedup) and the "unprovisioned repo exits green with a reason" behavior. The walk-gate-on-ship design existed once and was removed for three recorded reasons: a walk that couldn't run had to block; retries shared `/ship`'s budget; the only walk moment was the last moment. The companion change `walk-self-healing` gives `/walk` a scout-first cheap `NONE`, self-healing access, and a bounded in-scope fix loop — this change builds on those.

## Goals / Non-Goals

**Goals:**
- Walk evidence lands on the PR at ship time without re-creating the walk-gate's failure modes.
- CI runs the app's vitest suite on every push, in parallel, at zero cost to deploy latency.
- Test coverage grows as a by-product of `/apply`, enforced thereafter by the existing gate.
- `/ship` SKILL.md gets shorter, not longer.

**Non-Goals:**
- No walk gate: no verdict mechanically blocks a merge. No change to the gate ladder's definition (CI when present → merge).
- `/save` neither walks nor writes tests. Prose-only saves are untouched.
- No second workflow file; no test-framework installation in target apps.

## Decisions

**D1 — Evidence step, not gate; FAILURE pauses for the user.** `/ship` order becomes: preflight → archive → `/save` → `/walk` → merge. `NONE`/`UNKNOWN`/`TIMEOUT`: report the verdict in `/ship`'s summary and merge on the existing `SUCCESS`/`NONE` save-gate result — identical merge conditions to today. `FAILURE` (after `/walk`'s own bounded fix loop has run out): stop, show the evidence link and what contradicted its `THEN`, and ask the user — fix (stay on branch) or merge anyway (their call, recorded in the report). Rationale: the removed walk-gate blocked when the walk *couldn't run*; here unrunnable walks (`UNKNOWN`) never block, which was the sharpest recorded pain. Alternative — merge blind on FAILURE and just report: rejected; watching a change fail end-to-end and merging anyway silently is the one outcome the user explicitly asked to prevent.

**D2 — `/ship`'s inner walk skips nothing structurally; the double-save dissolves.** `/walk` begins with `/save`, which `/ship` just ran. With `walk-self-healing`'s scout-first order, the inner `/save` sees a clean, pushed, CI-green tree and is a fast no-op; if the walk's fix loop pushes a fix, that same inner `/save` is exactly the checkpoint the fix needs. So no special flag or walk variant is introduced. `/ship` merges the commit that CI last gated — if the walk's fix loop moved HEAD, the delegated save inside the loop already re-gated it, and `/ship` re-checks the save-gate result before merging.

**D3 — Parallel `test` job in `deploy.yml`, not a second workflow.** Jobs in one workflow run in parallel by default, and the existing workflow already owns the double-fire collapse; a second file would duplicate that logic or fire twice per commit. The `test` job: setup Node from the app's version, `npm ci`, then run the app's `test` script with vitest's CI reporter; when `package.json` has no `test` script, print why and exit 0 — the same honest-green pattern as the unprovisioned deploy. `deploy` does **not** `needs: test`: staging deploys of red code are harmless (staging is a fixture, the walk catches it) and red code cannot reach production because merges require green CI. Alternative — gate production deploy on tests: redundant with the merge gate and slows the main-branch deploy.

**D4 — The gate grows a rung with zero new skill logic.** `/save` waits for all checks and auto-fixes failures; the moment the `test` job exists, every save enforces green tests. No skill text needs to enumerate the job — the ladder is already "CI when present."

**D5 — Test growth is a `/plan` convention, executed by `/apply`.** `/plan`'s tasks authoring gains a standing rule: when the change's diff touches behavior, tasks.md includes "add or extend vitest coverage for the changed behavior." Written at implementation time, when context is richest. `/save` stays a pure checkpoint. Alternative — `/save` authors tests at checkpoint time: rejected (checkpoint verb mutating code, rubber-stamp tests, every save slows).

**D6 — Concise `/ship` rewrite.** The walk step replaces the "never walk / don't nudge" rules; "never test locally" collapses to one line pointing at the gate owner (`the-change-loop.md#the-gate`), per the payload-single-source convention. Target length: meaningfully shorter than today despite the added step.

**D7 — Wiki honesty.** `the-change-loop.md`: `/ship` description gains the evidence step; the gate section states explicitly that the walk still gates nothing and that a `FAILURE` pause is a surfaced user decision, not a rung. `staging-walkthrough.md`'s recorded-decisions list: the "not automatic on `/ship`" entry is revised (not deleted) — it records why the *gate* stays dead and what changed instead, so the decision isn't re-litigated from scratch next time.

## Risks / Trade-offs

- [Ship gets slower — every ship now walks] → The scout-first `NONE` exit keeps backend-only changes near-free; browser minutes are spent only when there is something to see, which at ship time is the moment the user most wants evidence.
- [FAILURE-pause is a gate in disguise] → It is a pause for a *decision*, with "merge anyway" as a first-class answer; unrunnable walks never pause. The wiki text draws this line explicitly.
- [Existing pack repos keep their old deploy.yml] → By design (copy-if-absent); `/wong-sync`'s adapt step offers the test job as a proposal. Called out in the changelog entry.
- [A target app without vitest] → The job keys on the `test` script, not on vitest specifically; no script → honest green. The convention task says "vitest" for pack-scaffolded apps but any runner behind `npm test` satisfies the job.
- [Free-plan browser budget spent at ship time] → An exhausted budget is `UNKNOWN`, which reports and merges — never blocks a ship.

## Migration Plan

Ship `walk-self-healing` first (its fix loop and scout-first order are load-bearing here), then this change as its own release: `VERSION` minor bump, `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs`. Target repos: new files arrive via `/wong-sync` copy-if-absent; the deploy.yml test job reaches existing repos through the adapt proposal.

## Open Questions

(none)
