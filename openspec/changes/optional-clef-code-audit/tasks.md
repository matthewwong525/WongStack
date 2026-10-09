# Tasks

All source, tests and docs are authored before executing checks. Implementation boxes can be ticked from source review; final execution evidence is recorded in section 4.

## 1. Audit helper and its tests

- [x] 1.1 Implement the saved-code manifest reader and private temporary records; review exact-revision selection, safe paths, line bounds, explicit limits and source hashes against the design.
- [x] 1.2 Implement larger-Clef requests and advisory outcomes; review credential discovery/redaction, response validation, timeout and total budget handling, head changes and unavailable paths.
- [x] 1.3 Author focused tests and add the helper to CLI conventions; review cases for saved versus dirty code, changed head, unsafe/secret sources and outputs, oversize context, unavailable credentials/API, malformed answers and bounded calls. Execute only after all source/docs are complete.

## 2. Verify skill

- [x] 2.1 Add the opt-in entry point and optional manifest/command guide; inspect that default and NONE paths make no audit call, and flags cannot change verdicts, authorize repairs or bypass scenario probes.

## 3. Documentation and release

- [x] 3.1 Update the walkthrough with code-audit use and limits, preserving the evidence-grading decisions; review links and keep the measured context within its existing ceiling through focused prose cuts.
- [x] 3.2 Add a minor Next changelog entry with any human steps stated; review that VERSION and dependencies are unchanged and helper/reference files ship through existing payload rules.

## 4. Final integration checks

- [x] 4.1 After implementation and test authoring, run the local pre-check once and fix only affected failures by its focused rerun command; record the result without claiming it is the delivery gate.
- [x] 4.2 Parent: run the completed helper against four fresh saved-code cases with real larger Clef (two violations, two healthy counterparts); record choices, revisions, latency, usage, all errors and false alarms, credential-removal checks and limitations in the change. This is exploratory integration acceptance, not proof of product behavior or an accuracy gate. See acceptance.md and acceptance.json.
- [x] 4.3 Parent: review the completed diff, strict plan validation, review link, context/payload checks and loosened-checks result; confirm no app screen changed, so no changed-screen screenshot is needed. The local scripts/tests classifier requires the apply preview; record its upload. Present the optional invocation and remaining publishing step. Final focused documentation checks returned LOCAL_CHECKS=pass; no check was loosened; strict validation and diff whitespace checks passed.

Local pre-check evidence: initial `checks.mjs --worktree` passed app tests (361, full coverage), payload links/config/retired names/specs and reported change-related lint, wiki size, context bytes and one deadline-test failure. Focused repair rerun passed wiki, the complete script suite and context budget. Final `--only payload:lint` passed: `LOCAL_CHECKS=pass`. No check was disabled or baseline raised; shellcheck is unavailable here and remains a CI check. These are local pre-checks, not the delivery gate. Parent acceptance is recorded in acceptance.md.
