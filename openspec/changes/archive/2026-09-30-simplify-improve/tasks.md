# Tasks

## 1. Skill and its owning guide

- [x] 1.1 Rewrite `/improve` as the outcome brief in design.md, retaining focus, invocation authorization, audit-only, evidence, verification, and no-change; verify it delegates delivery to `/ship` and has no prescribed investigation sequence or compulsory candidate menu.
- [x] 1.2 Update repository-improvement.md, the development hub, README, and the payload manifest to match; verify existing cadence/delivery-owner anchors and area invocations remain usable, with no compulsory scan or separate delivery workflow advertised.

## 2. Retire the survey machinery

- [x] 2.1 Inspect callers, remove the survey and its two references, delete survey-only tests, and remove its CLI-suite registration; verify no live caller remains and remaining CLI checks still register all shipped executables.
- [x] 2.2 Register removed resource names in scripts/retired-names.json; verify `node scripts/check-retired-names.mjs` passes without changing historical archives.

## 3. Release and contract

- [x] 3.1 Update the main repository-improvement spec Purpose only, keeping requirement changes in the supplied delta for `/ship` to reconcile; verify the delta covers all changed promises and strict OpenSpec validation passes.
- [x] 3.2 Add one `## Next (minor)` changelog entry with an Updating note; verify VERSION stays untouched and no schedule migration is required.

## 4. Integration checks

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/measure-context.mjs --check`, and strict change validation; verify the release is distributable and below the context baseline, recording outcomes in the handoff.
