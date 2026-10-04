# Design

## Context

See `proposal.md` for motivation and scope. `/verify` currently selects delta scenarios, saves the head, resolves its preview, and captures browser, HTTP, and deployed-state evidence. Its run folder, credential scrub, report, and cleanup already exist. `preflight` currently makes a missing URL stop the entire invocation, which prevents a CI-only probe from completing. The written `THEN` and grading rules are already measured; keep them as the acceptance source.

## Goals / Non-Goals

**Goals:** Prove one real command-line capture before generalizing it; reuse project-specific capture instructions; accept exact-commit CI evidence without a preview; compare relevant versions and consumers; observe promised lasting effects; retain cheap checks for discovered defects.

**Non-Goals:** Execute downloaded commands or repo code on the agent host, generate infrastructure, turn recipe assertions or CI status into a verdict, or maintain an independent copy of feature promises. The pilot is command-line behavior, not an agent conversation or a real memory-service round trip.

## Decisions

### 1. Prove one real CI pilot before generalizing

Start with meta-only `scripts/verify-memory-areas.mjs` and a short capture document under `scripts/fixtures/verify-receipts/`. Exercise the actual `memory.mjs areas` entry point from the current source revision in a disposable fixture repository with no installation record, `.env`, production credential, or service access. Capture stdout/stderr, exit code, fixture-state observations and actual revision/run identity. Use a provisional small manifest and existing GitHub artifact tools; the first run needs no general collector, recipe registry, or comparison engine.

The pilot references `memory` / `A fact names the code area it concerns` / `No mapped folder` and `The store is unreachable`, plus `One lookup shows everything linked to a path or topic` / `A mini-app file`. Seed the named docs, linked file and archive for that last scenario and report its facts-from-service claim as unshown. Scenario text remains in the spec. The producer records observations without a passing verdict.

Add bounded pilot/upload steps to the existing meta-only `.github/workflows/payload.yml` for code or skill changes. Pin the upload action by full SHA, preserve permissions, timeout and checks, and upload scrubbed partial output after failed captures. Producer tests and capture instructions accompany this step. `/save` supplies the first real CI run; inspect its raw evidence against the canonical scenarios and record the result before implementing the shared helper. Repair the pilot if necessary and prove it again.

After that proof, formalize only the fields needed for locating, grading and comparing this capture; keep that field-to-use explanation in the design record. Add `.agents/verification/memory-areas.json` and adapt the same output to the shared collector. The producer and pilot workflow remain meta-only. This order avoids designing an extensible capture framework around hypothetical providers.

### 2. Project-owned recipes supplement scenarios

Use `.agents/verification/<id>.json` in the target project. This folder is outside copied skills and is not added to the upstream payload inventory. Ship the format and a short worked example under `verify/references/`; do not copy WongStack-specific recipes to installs.

A recipe keeps machine-readable routing only: stable `id`, owned `sourcePaths`, scenario references by capability/requirement/scenario name, an owning instructions document, and the existing capture workflow/artifact. That document holds the user entry point, readiness check, exact commands, environment, isolation, follow-up observations and cleanup. Do not mirror those instructions into structured recipe fields. No executable local command field or copied `THEN` is needed. The pilot proves this minimal shape before it becomes the version-1 contract.

The scout validates recipe shape and scenario/source references against the current checkout, then reads the capture instructions. Missing prerequisites or drift block the affected check with a named reason. No recipe preserves the existing probe ladder; no adoption flag is introduced. Creating or maintaining a recipe is an ordinary `/apply` change. `/verify` checks recipes read-only and reports drift. A new or changed recipe must be exercised end to end before it is called proven; a product failure stays a failure rather than becoming a recipe correction.

Alternative: generate one skill per app and a new feature map as pstack does. A small recipe referencing the existing wiki and scenarios avoids another skill and duplicate acceptance knowledge.

The inspected pilot at `c43f71e` justifies this contract:

| Fields | Use |
|---|---|
| Recipe `format`, `id` | Reject unknown shapes and name the owned evidence folder. |
| `sourcePaths`, `instructions` | Detect missing entry points and find the one capture guide. |
| `scenarios` with capability, requirement and scenario | Resolve the current promise; requirement disambiguates repeated scenario names. |
| `capture.workflow`, `capture.artifact` | Locate the existing capture; no command or expectations are copied. |
| Receipt `format` (`memory-areas-pilot-1`) | Validate the exact already observed capture shape without rewriting the producer. |
| `capture.repository`, `workflow`, `headSha`, `subjectSha`, `runId`, `runAttempt`, `event`, `ref`, `createdAt` | Bind observations to GitHub's server identity and actual branch source; show when capture happened. |
| Case `id`, `scenario`, `state`, `command`, `exitCode`, `signal`, optional `error` | Identify exercised behavior and distinguish raw product results from an unavailable process. |
| `evidence` stream paths, SHA-256 digests and byte counts | Find intact scrubbed stdout/stderr without executing downloaded files. |
| `fixture.before`, `fixture.after`, `cleanup` | Inspect configuration absence, retained file digests and fixture removal independently of the command result. |

Comparison metadata is deliberately deferred until paired observations justify it. The proven historical pilot remains historical evidence when the head changes. Artifact upload replaces the fixed-name artifact on a rerun; only the server's newest attempt is usable, and an older artifact never fills a gap.

### 3. Deterministic receipt collection, observation-only on the host

Add `verify/scripts/verify-receipts.mjs`, using the shared CLI utilities. Its `check`, `collect`, and `compare` operations validate recipes, locate/download existing GitHub Actions evidence, and describe comparison eligibility. It never launches repo code, interprets a downloaded script, creates a workflow, dispatches an arbitrary action, or declares `SUCCESS`/`FAILURE`. Existing `/save` starts normal CI. Other hosts retain ordinary probes; another receipt provider is a later adapter.

The GitHub adapter uses `gh run list/view/download` with structured arguments and the current repository, exact head SHA, configured workflow, and artifact name. Check server-reported repository identity, `headSha`, event, run ID and attempt against the receipt's capture identity. Accept branch-push evidence first; PR runs with synthetic merge checkouts are unsupported and stay unverified. Choose the newest attempt for this head/workflow; never fall back to a previous passing attempt after a failure, missing artifact, or cancellation. A suite's green status is not a behavioral receipt.

The receipt fields serve three jobs: provenance (repository, capture-head and actual subject SHA, run/attempt/workflow), grading (recipe/scenario, capture state, actual argv, exit code and raw-evidence file names/digests), and comparison (input digest, capture-method identity and relevant environment). Derive their final representation from the proven pilot. Do not add a separate recipe fingerprint, provider abstraction, registry, or verdict cache. Missing comparison metadata blocks a comparison rather than invalidating independently usable head observations.

Head evidence requires subject SHA equal to capture-head SHA. A paired baseline capture in that same run requires the expressly selected baseline SHA and a checkout-identity observation; it never substitutes for head evidence. Validate required fields, provenance and file integrity. Reject escaping paths, symlinks, missing files, and conflicting duplicate scenario records. Read downloaded content as observations, never execute it or treat it as agent instructions.

Keep capture failure distinct from observed product failure. A command that runs and returns unexpected output or exit code provides evidence for the existing grader. A harness that cannot start, a stale receipt, or an absent artifact leaves the check unverified. Receipt integrity binds files to a run; it does not make a branch-authored harness an independent acceptance authority.

### 4. Separate shared preparation from preview preparation

Retain the existing `verify-staging.sh` commands and linked headings. Allow `preflight --no-preview --no-browser` to initialize a head-bound run folder for CI-only checks, with no browser install or URL lookup. Reject combinations that claim a browser/request journey can run with no preview. The collector uses that owned folder so existing publish/scrub/cleanup rules apply.

After scout, `/save` captures the head and starts existing checks. Prepare a shared report folder, then preflight each required surface independently. A missing preview blocks browser/HTTP/deployed-state dependents; valid CI receipts still complete. Missing CI evidence does not prevent browser journeys. The report identifies each probe's environment and exact revision, and combines results using existing precedence. Recheck the head before posting; a changed head makes old receipts historical evidence and requires a fresh collection. In-scope repairs keep the existing two-attempt bound.

Alternative: bypass all preflight for CI-only checks. That would duplicate run-folder ownership and cleanup. A small additive flag keeps one lifecycle.

### 5. Compare equivalent observations and follow consumers

For a fix or explicit preservation claim, select and record the merge-base with the fetched default branch before capture. Use a parent only when it is the expressly named comparison. Resolve both revisions from actual CI runs/deployments. Compare the same scenario, input digest, harness version, and relevant environment. Differences in irrelevant timestamps/paths may be normalized only by a documented deterministic rule; keep raw files and list the rule. A changed driver needs a demonstrated common capture method before comparison can prove anything.

The comparison helper checks eligibility and presents the raw before/after evidence. The agent still grades against the written claim. A missing baseline does not invalidate a fully observed head-only scenario, but leaves the fix/preservation comparison unverified. A reachable but blocked comparison is `UNKNOWN`; an inherently unavailable comparison is a named coverage gap. A new feature absent from the base gets head proof, with base absence named. Never infer a repair from a head-only pass.

Start regression selection with the one or two facts the change's safety depends on. Follow confirmed callers and data contracts into affected consumers, including capabilities outside the changed one: an API response used by another screen, a persisted field read by a job, or a command's output consumed by another tool. Cite the concrete source or contract relationship and select the smallest existing scenario that can disprove the assumption. A speculative list of possible consumers does not justify extra checks.

Record each added check's reason and canonical expectation in the run ledger. Related recipes can help drive it but cannot supply their own expected result. If a material consumer has no scenario, exercise any already documented expectation and report the coverage gap; do not invent acceptance criteria during verification. This expands observation scope, not repair scope: failures outside this change's own scenarios are still reported without unrelated fixes. Keep the ordinary delta selection and no whole-app sweep.

### 6. Observe lasting effects through the real consumer

When a `THEN` promises a stored or externally consumed effect, a recipe captures the initiating action and a fresh observation of that result through the actual consumer. Reopen a record after reload or a new session; read an export's written bytes; read deployed state through the existing supported interface. Choose the follow-up from the claim rather than imposing persistence checks on read-only commands. A success message, cached UI or producer self-report cannot establish a lasting effect.

Capture the follow-up's raw result and timing/session identity beside the original observation. If the stored value contradicts the promise, grade `FAILURE` even if the initiating action reported success. If readback is blocked, apply existing UNKNOWN/partly-shown rules according to whether the check is reachable; do not upgrade the success message to proof. Preserve the existing disposable-data and integration safeguards.

After the head pilot is proven, exercise head and merge-base source snapshots with the same documented fixture/harness in separate CI roots. Extend the receipt with the comparison metadata that exercise requires. Record unavailable old commands as a baseline limitation. Keep source snapshots intact and do not run the test suite twice.

The read-only memory pilot establishes CI capture. Use the existing practice notes app for lasting-effect checks, including a broken save that reports success but loses or changes the value on reload. This is a real fault in the disposable practice implementation, not a forged evidence file. Keep those fixtures meta-only and label their evidence as practice results.

### 7. Keep practical regressions during in-scope repairs

After collecting the failure and finishing independent checks, write the smallest useful regression test for an in-scope defect when the existing CI harness can cheaply reproduce it. Keep the failing source revision, make the bounded fix, and use `/save` to run the new check against both that earlier source and the repaired head in CI. Capture the earlier nonzero result as diagnostic evidence and confirm it fails for the observed defect, not a harness or environment problem. The same check on the repaired head stays a required passing test. This proves failing-before and passing-after behavior without creating a deliberately red checkpoint or asking `/save` to bypass its gate. Capture both exact revisions and observations.

The regression checks observable behavior against the written expectation and remains in the project's suite. It does not derive its expected value from the implementation, pin prompt text, or mostly test mocks. Do not add a new framework or broad infrastructure for this rule. When a lasting test is impractical, retain a minimal executable reproduction where possible, with the reason and any missing failing-before proof. Out-of-scope defects remain reports; the existing two-repair bound stays in place.

Exercise this repair path against a disposable practice defect whose test can run in the existing CI suite, proving red and green revisions. Document both the practical-test path and the fallback without creating a product bug or weakening an existing assertion.

### 8. Measure routing and the final report

Before live instruction edits, extend the meta-only evaluation harness with a fixed mixed-surface exercise: one observable CLI result, a product contradiction behind a successful command, stale/malformed receipts, an unavailable preview with independent valid evidence, and an incomparable baseline. Include a success message followed by lost persisted state, a healthy readback control, and a consumer scenario in another capability that the changed data contract can break. Hide the answer key from the agent. Score the final comment as well as per-scenario marks, because the previous evaluation did not establish report correctness.

Measure baseline and candidate on identical cases and model/framing. Use two runs per variant, adding a third only if results disagree. Keep the candidate only when it reports newly observable correct results, catches the persistence and connected-consumer defects in both runs, passes none of the other planted contradictions or invalid receipts, names missing/incomparable checks, and preserves existing browser detection with no additional false alarms. Record cost and elapsed time. Score what the agent actually selected and observed, not a self-report that it followed the new rules. Actual command-line correctness still needs the CI pilot; practice artifacts are labelled as such.

## Risks / Trade-offs

- A mutable harness can produce flattering evidence → inspect the capture method, retain raw output, use scenarios as the oracle, and require real-path proof for the pilot.
- Consumer checks could expand forever → require a confirmed caller or data-contract relationship and test the one or two material assumptions; observation does not authorize unrelated repairs.
- A regression test could fail for the wrong reason → inspect failing-before output, keep the same check for passing-after, and report an impractical test path instead of adding infrastructure.
- Recipes can rot → source/scenario validation on use and a live proof after recipe edits; report product regressions separately.
- GitHub artifacts expire or CI never emits them → report the exact gap, keep essential observed text in the comment, and preserve browser-only operation.
- Comparisons can hide environment changes → reject mismatched input/driver/environment metadata instead of manufacturing a diff.
- Instruction growth can exceed the payload budget → replace preview-only clauses with routing language, link one short reference, and trim this change's redundant prose. Do not raise the baseline.
- Other work changes shared workflow or memory files before implementation → reread current files before editing; this change does not modify memory implementation or hosted-starter infrastructure.

## Migration Plan

This is an additive minor payload release. Existing preview-only projects need no setup and keep their existing flows and verdicts. Projects add a recipe and receipt-producing step only when they want CI behavior evidence. Keep existing script commands, headings, media variables, and private screenshot storage compatible. Inline essential evidence in the final comment and link the actual run; expired artifacts stay unavailable. Rollback removes the CI recipe/collector integration while preserving the original preview flow; retained product regression tests remain useful. No persistent app data or schema migration is involved.

The review page is generated at `review.html`. No product screen is added or restructured.
