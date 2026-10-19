# Design

## Context

`/apply` already builds in a fresh helper ([build-helper.md](../../../.agents/skills/apply/references/build-helper.md)) that runs the local pre-check, then the parent uploads a preview. `/verify` § e fixes "in scope" failures (own scenario + touched files) at most twice and reports the rest. `/save`'s auto-fix loop fixes CI up to three attempts and stops on a failure outside the diff. Each rule is close to the new one but stated separately. The 2026-10-03 measurement (`sharpen-verify`) tested a second *judge of the walk*, not a code reviewer; the open guardrail gap (memory #1237) is "one agent writes and judges code and tests".

## Goals / Non-Goals

**Goals:** an independent read of the diff before anyone sees the preview; one fix-or-ask definition that every fixing step links.

**Non-Goals:** cross-model review, a review gate in CI, reviewing the live app, changing `/verify`'s walk or verdicts.

## Decisions

1. **The reviewer is a parent-started helper, not a sub-helper of the builder.** After the build helper reports *all done*, `/apply`'s parent starts a fresh helper (Agent `general-purpose` in Claude Code, a sub-agent in Codex) told to read `apply/references/review-helper.md`. A sub-helper would share the builder's framing; a parent-started one sees only the plan and the diff. Alternative: inside `/verify` — rejected, `/verify` runs after a save and gates nothing, so sending work back costs a save and a CI run.
2. **The reviewer reads, never edits.** Its brief: read the proposal, specs, tasks and `git diff $(git merge-base origin/main HEAD)` plus untracked files; return findings, each with file, what is wrong, why, and a proposed class `fix` or `ask` with the rule's reason number. The parent routes: `fix` findings go to a new build helper as its request (the builder may dispute one, with a reason); `ask` findings and disputes the parent cannot settle in one exchange go to the person as one question in [the ask format](../../../.agents/skills/explore/references/asking-the-user.md). Read-only keeps one writer per tree.
3. **Two fix rounds, then ask.** Matches `/verify`'s cap. A round = build helper fixes → reviewer rereads only the fixed findings and anything they touched.
4. **The rule's home is `wiki/development/the-change-loop.md`, a new `### Fix it or ask` section under *The steps*.** `/apply`, the review brief, `/verify` § e and `/save`'s auto-fix loop link it. § e's in-scope test stays as `/verify`'s application of the rule (own scenario = inside the plan; touched files = not unrelated code); a failure outside the diff in `/save` is already "stop, no code edit". So no verdict or cap changes there, only wording and a link, plus the new *ask before weakening a check* point, which `loosened-checks.mjs` already catches after the fact.
5. **The stop hook learns the reviewer.** `helper-stop-check.mjs` matches a helper by its brief; add `review-helper.md` with its own report line (`review:`), so a reviewer that stops without findings is sent back once, like a builder.
6. **Inside `/ship`, the review still runs** before `/apply` returns: `/ship` has no other code read before merge.

## Risks / Trade-offs

- [Reviewer nitpicks, lengthening every build] → its brief limits findings to bugs, weak or missing tests, and outside-the-plan work; style is out, and the report says *none* when clean.
- [A reviewer that agrees with everything adds cost and no value] → the reviewer sees no builder reasoning; the first few builds' findings are recorded as memory facts to judge it later.
- [Context budget: skill text sits at its baseline] → offsetting cuts in `apply/SKILL.md` and `verify/references/walkthrough.md` § e, whose scope prose shrinks to a link; `measure-context.mjs --check` must pass.
- [Extra time per build] → one helper run; it reads, so no checks run twice.

## Migration Plan

Ships as a minor release; installs get it with `/wong-sync`. No data or settings change. Rollback: revert the release.
