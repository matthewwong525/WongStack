# Check more than the web preview

**Status:** in-progress

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

## Research

The design draws on pstack's [project verification recipes](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md), [consumer-risk analysis](https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md), [focused regression checks](https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md), and [small solutions](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md). These are design references; this change does not vendor their text or tooling. WongStack's recent measured grading work remains the starting point: `openspec/changes/archive/2026-10-03-sharpen-verify/`.
