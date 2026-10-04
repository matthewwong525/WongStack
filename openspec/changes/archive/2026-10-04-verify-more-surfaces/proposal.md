# Check more than the web preview

**Status:** ready-to-ship

**Branch:** heroic-eagle

**Open questions:** none

## Why

Today, a command-line tool or setup change can be left unchecked because its behavior is outside the web preview. We should be able to exercise those changes in the project's existing automated checks and show what happened, without setting up a development environment on your machine.

## What Changes

- **Start with one real check, then build from what it needs.** Exercise a command-line feature in our automated checks and inspect the result before building the reusable evidence collector. Keep the evidence format small and shaped by that working example.
  ```text
       One real command-line check
                    │
                    ▼
          Inspect captured evidence
                    │
                    ▼
          Reuse the parts that help
  ```
- **Keep a proven recipe for reaching each behavior.** A recipe records how to exercise a feature and capture its result. Future checks reuse it, check that it still matches the feature, and judge the result against the promise written in the plan.
  ```text
  Written promise + proven recipe
                  │
                  ▼
             Exercise it
                  │
                  ▼
        Evidence beside the promise
  ```
- **Check command-line behavior too.** Web checks keep using the preview. Command-line checks can use results captured by the project's automated checks, tied to the exact version being reviewed. A missing preview holds up only the checks that need it.
  ```text
                A change
                   │
          ┌────────┴────────┐
          ▼                 ▼
      Web preview     Command-line check
          │                 │
          └────────┬────────┘
                   ▼
             One clear report
  ```
- **Show what a fix changed and what still works.** Where a comparable earlier version is available, run the same relevant check before and after the change. Follow the affected behavior into the screens, tools, or services that use it, and check the few that could break. If the comparison cannot be made, the report says so.
  ```text
    Earlier version      Changed version
          │                    │
          ▼                    ▼
      Same input           Same input
          │                    │
          └─────────┬──────────┘
                    ▼
         Result and remaining gaps
  ```
- **Check that the promised result lasts.** A save is checked by opening the saved record again; an export by reading the written file. Test a misleading success message whose promised result disappears, alongside old and missing evidence. Measure the report before and after the instruction change.
  ```text
       Save or export says it worked
                    │
                    ▼
         Reopen the record or file
                    │
                    ▼
          Check the promised value
  ```
- **Keep a check that catches a discovered bug again.** When a bug has a small, practical automated check, keep that check with evidence that it failed before the fix and passed afterward. Where a lasting check would need expensive setup, keep the reproduction and explain the limit.
  ```text
      Bug found ──▶ Check fails
                        │
                        ▼
                      Fix it
                        │
                        ▼
                 Same check passes
                        │
                        ▼
                 Keep it for later
  ```

**Non-goals:** Local app builds or execution, new hosted infrastructure, a second judging agent, a whole-app regression sweep, new model or browser dependencies, and automatic verification on every save. Agent conversation behavior and full setup runs remain follow-up surfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: reusable project-owned recipes, exact-version CI evidence alongside deployed probes, comparable before/after checks, checks of affected consumers and lasting effects, and practical regression coverage for discovered bugs.

## Impact

Payload: `.agents/skills/verify/SKILL.md`, its references and scripts, `wiki/development/staging-walkthrough.md`, and a minor `CHANGELOG.md` entry. Project-owned recipes live under `.agents/verification/`, outside the copied skill directories. Meta-only: one command-line pilot and receipt-upload steps in `.github/workflows/payload.yml`, receipt/driver tests, and extensions to the existing verification measurement harness. No production app, memory implementation, provisioning, dependency, or installed-repo workflow changes.

## Decision log

- **2026-10-04** — Asked whether to plan the recommended verification improvements or explore independent verification first → chose planning through `/plan`.
- **2026-10-04** — Assumed: keep recipes, broader checks, and comparisons in one change, because they form one path from a written promise to reusable evidence; the previous recommendation grouped them together.
- **2026-10-04** — Assumed: command-line code runs in existing CI, never on the agent's machine, because the repo's no-local-execution rule and the recommended approach already require that boundary.
- **2026-10-04** — Assumed: support GitHub Actions receipts first while preserving ordinary probes on every host, because the existing toolchain includes GitHub access and this repo already runs CI; no new hosting provider is needed.
- **2026-10-04** — Assumed: recipes are project-owned navigation and capture instructions, with expected behavior read from scenarios each time, because a second copy of a promise can drift and let the implementation define its own correctness.
- **2026-10-04** — Assumed: a recipe is created or updated through an implementation change, never silently during `/verify`, because a verification run must leave the working tree unchanged.
- **2026-10-04** — Assumed: implement deterministic receipt validation and comparison metadata in code, because matching commits, files, and inputs is repeated work; interpreting evidence against a promise remains judgment.
- **2026-10-04** — Assumed: the first real command-line pilot checks the local-document output of `memory.mjs areas` with no configured memory service, because it exercises a public command without credentials, shared data, or edits to the memory implementation. It does not prove a real memory-service connection.
- **2026-10-04** — Assumed: before/after proof applies to fix and preservation claims with a comparable baseline, because a new feature need not exist in the earlier version; baseline absence must be reported rather than invented.
- **2026-10-04** — Assumed: retain the existing grading rules, five verdicts, staging safeguards, and bounded repair policy, because the demonstrated gap is where checks can run, not evidence that those rules are wrong.
- **2026-10-04** — Assumed: defer independent reviewers, broad maintenance sweeps, conversation checks, and full setup checks, because they add distinct execution or cost decisions and are not required to prove the first broader check.
- **2026-10-04** — Assumed: Check: `.github/workflows/payload.yml` gains a bounded pilot and evidence upload without removing checks or rerunning the suite, because the broader verification path needs real CI evidence; no existing gate is weakened.
- **2026-10-04** — Asked whether to revise the draft with pilot-first delivery, consumer checks, lasting-result evidence, and practical regression tests or keep the current draft → chose revising through `/plan`.
- **2026-10-04** — Assumed: prove the command-line pilot before finalizing the reusable recipe and capture format, because a working example can show which metadata and helpers are necessary. This supersedes building the full collector first.
- **2026-10-04** — Assumed: consumer checks can cross capability boundaries when a concrete data or caller relationship connects them to the change, because limiting checks to the changed capability can miss a broken consumer. This supersedes the original same-capability restriction without authorizing unrelated repairs.
- **2026-10-04** — Assumed: durable-effect claims require a fresh observation of the result through the real consumer, because a success message can precede or conceal a failed write. The existing partial and blocked verdict rules still apply when that observation is unavailable.
- **2026-10-04** — Assumed: retain a focused regression check during an in-scope repair when the existing CI harness can cheaply exercise the defect, because a repeatable check prevents recurrence. Keep a reproduction with its limitation when no practical test path exists; no new test infrastructure is required.

- **2026-10-04** — User chose Build it now: implement and verify the revised plan before publishing. First checkpoint captures the actual command-line pilot; reusable contracts follow inspection of that artifact.

- **2026-10-04** — Check: `.github/workflows/payload.yml` adds bounded behavior capture and scrubbed artifact upload, because the command-line pilot needs real CI observations; no existing check, permission, timeout, coverage floor, or docs-only gate is relaxed.

- **2026-10-04** — The actual first capture passed identity, raw-output, digest and cleanup inspection. The collector now validates that observed shape and rejects stale, malformed or unsafe evidence; its fresh-head CI proof is the next gate.

- **2026-10-04** — Collector checkpoint CI caught a lint warning in the intentionally invalid recipe fixture (`then` assignment). The fixture now defines the same invalid field explicitly; its rejection assertion and all delivery checks remain enabled.

- **2026-10-04** — The intentionally invalid `then` field is loaded as JSON protocol data, preserving the rejection assertion without constructing a thenable. CI then found a shared test-fixture scenario object; receipt and recipe now have independent objects so the unknown-scenario test cannot mutate its own oracle.

- **2026-10-04** — Check: `.github/workflows/payload.yml` captures head and the selected default-branch merge-base with the same driver and fixture in separate roots, because comparison needs actual paired observations; the existing suite still runs once, and its permissions, timeout and docs-only gate remain intact.

- **2026-10-04** — CI-only preparation skips preview lookup and browser tools while retaining default behavior. Static review also repaired an existing READY/exit-1 mismatch when no installation was needed; the default-mode test retains that check. New conditional reference wording was trimmed to preserve the existing context ceiling before measured routing adoption.

- **2026-10-04** — Imported observations use the existing recursive credential scrub and owned cleanup. Synthetic integration tests capture the posting handoff locally without sending a test report; artifact expiry and report limits live in the short CI reference.

- **2026-10-04** — Latest main adds 959 instruction bytes; its trial merge exceeded the unchanged ceiling. Integration is deferred until measured candidate adoption can replace redundant preview-only instructions. The merge was aborted without changing either feature.

- **2026-10-04** — The additive mixed exercise preserves the original browser exercise. Its hidden-key scorer requires real submitted/stored observations, actual producer/consumer values and final report rows. A neutral overall-line format is identical for both references and fixed before measurements; design §8 remains the keep rule.

- **2026-10-04** — The frozen candidate passed the observed design §8 conditions in three valid Codex practice sessions. Fixed report scores retain lexical/parser misses; baseline's third report misassociated scenarios. This small sample shows report reliability limits, not a broad detection/cost gain. Adopt the measured walkthrough unchanged; actual CI-only 9f collection is separate current-source evidence.

- **2026-10-04** — Saved-instruction checkpoint integrates main `932439bf1109066faaf2aec85cf653db3941ff4b`, retaining both upstream releases and this Next entry. The measured walkthrough stays unchanged; combined instructions are 190,238/190,845 bytes and startup is 2,190/2,200 words. Links, configuration, retired names, strict change validation and the explained-check inspection passed. The changed head still requires the full automated gate.

- **2026-10-04** — Practical regression demonstration will reuse the real default-preflight READY/exit-1 defect already repaired in task 3.1, rather than introduce another bug. The disposable existing CI fixture and the same retained focused default-preflight check will observe exact earlier source `ab27e29989bbf4074b8949210d1c7cae2f64ae25` and repaired head. Keep source revision distinct from the fixture's temporary Git head, capture the intended assertion failure and passing result, and label mocked preview/browser inputs as practice. No new framework or deliberately red checkpoint is needed.

- **2026-10-04** — Check: `.github/workflows/payload.yml` adds bounded scrubbed diagnostic capture for the same retained default-preflight assertion on exact earlier source and repaired head, because task 5.2 needs real failing-before and passing-after observations. The complete repaired-head suite remains required, runs once, and preserves existing permissions, timeout, coverage and docs-only gates.

- **2026-10-04** — Parent review found that squash merge can remove unpublished branch ancestors needed by the first regression capture and tests. Routine implementation correction: capture actual `ab27e29989bbf4074b8949210d1c7cae2f64ae25` proof for this checkpoint, but future missing history is a named diagnostic gap while the repaired-head focused check always runs and must pass. Producer tests now seed self-contained disposable history with provenance-labelled immutable earlier script bytes, and prove that a missing baseline cannot hide a head failure. No check, coverage floor or assertion is skipped or weakened.

- **2026-10-04** — Final implementation checkpoint saves the updated owning guide and release note naming GitHub Actions as the supported capture host. Packaging confirms one Next minor entry, inherited VERSION, unchanged installed workflow, copied collector/reference and source-only recipes/pilots/fixtures. Strict validation, payload checks and the unchanged context ceiling precede its required automated gate; final verification will use that exact saved revision.

## Research

The design draws on pstack's [project verification recipes](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md), [consumer-risk analysis](https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md), [focused regression checks](https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md), and [small solutions](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md). These are design references; this change does not vendor their text or tooling. WongStack's recent measured grading work remains the starting point: `openspec/changes/archive/2026-10-03-sharpen-verify/`.

- **2026-10-04** — Final saved implementation 9f87a05 passed the complete required gate and fresh CI/preview verification. The current walkthrough caught all eight planted practice defects with no false passes; raw report inspection records the frozen parser limits separately. Same-check exact-source red/green evidence is retained. Configured memory facts/network outage, full setup and assistant conversations remain unproved. All build tasks are complete; publication awaits the person’s decision. Completion records added after verification do not change the verified implementation or claim a new saved head.

- **2026-10-04** — Assumed: package the one-time experiment’s raw evidence as a single byte-verified archive while retaining readable results, because the person wants a manageable change rather than hundreds of loose logs/screenshots. Test and runtime behavior are unchanged; publication still awaits approval.

- **2026-10-04** — Asked whether to publish → the person invoked `/ship`, authorizing archive, checkpoint, fresh verification and merge. Archive checkpoint keeps all tasks complete, the compact raw-evidence bundle and the actual branch. Integrated main 1a7e238 (v30.5.0) by union of intent; numbered this release 30.6.0. No existing checks were weakened.
