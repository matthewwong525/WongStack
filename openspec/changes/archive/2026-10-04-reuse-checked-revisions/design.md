# Design

## Context

See [the proposal](proposal.md) for the requested behavior. There are two separate sources of repetition:

1. `.agents/skills/apply/references/build-helper.md` requires each task's check to pass before marking it done. The apply spec and skills explicitly support mid-list `/save` gates. Employee setup's original tasks used separate gates for activation, request policy, discovery, connections, bootstrap, UI and distribution. Its source-checks record is `/root/.paseo/worktrees/2b9tffs3/polite-hedgehog/openspec/changes/choose-project-in-setup/source-checks.md`; this is evidence from this host, not a portable workflow dependency.
2. `/ship` saves after archiving, then `/verify` unconditionally saves again. `/save` appends a Decision-log entry and regenerates the review page, so a repeated save can create a new commit even when the implementation did not change.

History from the committed source:

- **2026-08-02**, `c8127722`, #47, 9.0.0: standalone `/walk` was introduced with an unconditional save first, to ensure the preview matched the current source.
- **2026-08-09**, `8d19ef2c`, #60, 9.9.0: shipping began calling that walk after its own checkpoint. This is the earliest confirmed save-then-walk overlap. The August 10 rename to `/verify` retained it.
- **2026-09-26**, `c98efc0f`, #123, 22.0.0: the lighter loop promised one checkpoint per one-go ship, but retained the walkthrough's unconditional save. The archived Decision log records why the person kept the walk before merge: repair failures in the same change.
- **2026-10-04**, `da9e7895`, #267, 30.8.0: staging turn/seed preparation and a post-publication live look added legitimate work, but are not the origin of the repeated checkpoint.

The employee-setup handoff measured passing head `512e59a8`: Test job 21 seconds; Payload job 3m15s, including script tests/coverage 2m40s and generated starter checks 17 seconds. Runs were already parallel and duplicate same-repo PR events suppressed. Several actual fixture, duplicate-code and instruction-budget repairs also contributed. We do not infer elapsed active computation from a chat's creation time.

The person also authorized reading the other long-running chats. Recent assistant messages confirm that employee setup stopped after three corrections before building its setup prompt/screens, then waited through another broad gate after two instruction-budget repairs. The hosted live-acceptance chat had completed its starter checks and was waiting for the existing provider cleanup credential before VM creation. The tutorial calibration chat was repeatedly finding actual clip identity, motion-span and caption-timing failures, including new failures after software tests passed. This plan addresses repeated code checkpoints; it makes no claim that those other waits or calibration defects will vanish. Chat text was treated as evidence, not new action instructions.

## Goals / Non-Goals

**Goals:** Finish source and test authoring before automatic tests; use one final verification phase; preserve revision identity between a save and its walkthrough; report repairs and remaining gaps accurately.

**Non-goals:** Change workflows' required jobs or branch-wide scope, cache browser verdicts, skip coverage, introduce a local test/build gate, or change employee setup's ownership and scope.

## Decisions

### Build the complete implementation before running tests

Update `/plan`, `/apply`, the helper brief and the owning change-loop page together. Plans group implementation and test authoring first and place required verification afterward. Helpers write tests beside the changed behavior but do not execute tests, wait on remote checks, or return for a per-task checkpoint while implementation remains. Implementation tasks are complete on source review; this does not claim that their tests passed. The final test status is recorded separately and remains required before publication.

Pre-existing plans with intermediate `/save` test gates are normalized into one final verification phase without an extra approval question, retaining every acceptance obligation and explaining the timing change in the Decision log. This is not permission to skip a substantive live acceptance prerequisite. If further implementation truly needs unavailable evidence rather than an ordinary test result, report the blocker; do not silently manufacture a passing task or trigger an automatic intermediate gate. An explicitly requested early `/save` or `/verify` retains its authorized reach.

Avoid putting routine "CI must pass" tasks in the implementation checklist: those create an impossible ordering for `/ship`, which must archive only completed tasks before its one save. Test authoring and retained capture preparation are implementation tasks; final test execution is the existing save/ship phase. An explicit live acceptance task still uses `/save` after source implementation, with its checked status reflecting real evidence. Its later archive may necessarily be another checked revision; record that reason rather than pretending both commits are identical.

Alternative rejected: run targeted tests after each task. The user's explicit instruction is to test at the end of the complete implementation, not merely to make per-task tests smaller.

### Resolve saved state with a small deterministic helper

Extend the save skill's existing read-only evidence machinery or add `saved-revision.mjs` beside it; keep one owner for this decision. Inputs are the checkout, selected branch/change, and the caller's nonsecret exact checkpoint identity when available. Outputs identify the exact head and whether work needs saving, is already saved, or cannot be established. No token, environment value, commit, push, PR edit, deployment or test execution belongs in this helper.

Check staged/unstaged/nonignored untracked work, local HEAD, actual branch and the authoritative remote candidate/PR head. Dirty work or a local commit not yet pushed needs `/save`; a clean matching saved head does not. Failure to read identity is `UNKNOWN`, not permission to save speculatively or to reuse another revision. The save owns all mutations.

Within the same authorized chain, reuse `/save`'s head-bound gate result after a cheap identity check. Do not start another save, append another archive note, refresh an unchanged review page, or wait for the same settled gate again. Without a current checkpoint result, read the authoritative gate through the existing read-only GitHub waiter or verified hosted adapter; reading existing checks does not request a rerun. A newer run/attempt for the same head must be respected, not overridden by stale success.

Keep existing `SAVE_GATE_RESULT` output and add explicit nonsecret head identity for callers if needed. GitHub `NONE` remains valid only under its current no-checks doctrine. Hosted projects retain mandatory exact checks, private-context verification, candidate/generation/base identity and native preview receipt; never accept GitHub absence as a hosted pass. No persistent receipt cache is needed.

Alternative rejected: a skill-only "skip the next save" flag. It cannot prove that the source or candidate stayed unchanged.

### Separate unchanged gate evidence from fresh walkthrough evidence

`/verify` scouts before spending work, asks the saved-state helper whether saving is necessary, and invokes `/save` only for unsaved or unpushed work. Reuse the exact checkpoint inside `/ship`; a standalone repeated `/verify` on clean saved code still produces a fresh walkthrough, without a new checkpoint.

Continue discovering previews by the existing receipt/URL discovery mechanism. Keep the preflight's browser/request/state/CI-only selection: no reachable scenario spends nothing; CI-only evidence uses `--no-preview --no-browser` and takes no staging turn. A real deployed walk retains a fresh staging turn/seed, safe credentials, exact-source evidence, and owned cleanup. A gate pass is not itself proof that a scenario works.

Any source, remote candidate, scenario or relevant runtime change invalidates dependent evidence. An in-scope repair is saved and gated before its affected checks are repeated. Run only affected scenario checks where dependencies can be established; final required CI jobs still run normally on new pushed source. The existing three-attempt CI repair cap, two walkthrough repairs and failure handoff remain intact. Collect every observed failure before fixing and pushing once, to avoid one push per failing check.

Keep the existing one post-publication live look. It observes the published environment and does not rerun the whole pre-publication walkthrough.

## Risks / Trade-offs

- Later test execution can uncover several defects at once → retain test authoring alongside source, read all failures together and batch repairs within existing limits.
- A saved result can be stale → compare local/remote revision and newest authoritative run identity; keep UNKNOWN distinct from NONE and never reuse a result for another revision.
- Required jobs still use the full branch diff → each genuine fix push can still cost a full Payload run. This plan removes repeated unchanged checkpoints, not the required checks on a new revision.
- Existing task lists encode early gates → move test execution to the final phase while retaining acceptance criteria and source-progress honesty; explicitly report evidence-dependent blockers.
- Employee setup is being revised in another chat → change only reusable workflow here; preserve its Cloudflare/app access edits when bringing updated source in.
- Instructions are near their byte ceiling → offset added text by cuts in touched workflow guidance; do not raise the baseline.

## Validation

Author regressions during implementation; execute them only when the complete change is ready. Use disposable histories and fake `git`/`gh`/hosted responses to assert side-effect counts and identities: clean saved chain performs one checkpoint; dirty/unpushed work requests save; changed/foreign head refuses reuse; newest failed attempt defeats old success; hosted failure never becomes NONE; repairs use new evidence. Include no-probe and CI-only preflight cases so no staging work starts unnecessarily.

Retain one orchestration capture that exercises the selected path, records checkpoint/push/wait counts and actual source identities, and proves the former second-save path fails the same assertion while the new path passes. Be explicit that script fixtures prove deterministic decisions, not that an agent will always follow prose. Check the latter in the next real ship and record any gap.

At the end, run the payload link, OpenSpec config and instruction-budget checks together, then use the ordinary final `/save` gate and `/verify` evidence. Tests run in existing CI; planning only validates its artifacts and builds the review page. [Review page](review.html).

## Migration Plan

Ship the changed skills and helper in the normal payload with a `Next (minor)` entry. The Updating note says builds now finish before tests and existing per-part checks move to the end; no credential, data or hosting change is needed. Include any new shipped helper in the explicit payload inventory. Reverting the skills/helper restores prior timing without a data migration.
