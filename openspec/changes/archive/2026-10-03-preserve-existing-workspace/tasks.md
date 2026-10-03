# Tasks

## 1. Canonical preservation setup

- [x] 1.1 Add source-only `server/preservation.json` version 1 and explicit `server/setup.sh --preserve` dispatch to shared preservation helpers (review Change 1); verify fixture tests cover compatible tools, absent tools, root/OS/architecture/user/home validation and conflicts before mutation, while fresh setup contract tests stay unchanged.
- [x] 1.2 Implement compatible tool/service reuse and missing-only prerequisites for the selected workspace account (review Change 1); verify fixture tests retain files, global Node/tool versions, existing Paseo unit/ports and unrelated browser/AppArmor setup, and never reboot, upgrade OS, replace network policy or write host credential paths. Document exact commands and refusals in `server/README.md`.

## 2. Source agent and private projects

- [x] 2.1 Parameterize validated workspace user/home consistently across agent execution, Paseo, checkout and private result path/ownership checks and declare contract 4 (review Change 3); verify tests preserve default-user behavior, enforce non-default identity, reject invalid configuration and retain all existing secret/no-self-update boundaries. Document that contract 4 does not imply Artifacts capabilities.
- [x] 2.2 Implement preservation-aware GitHub login/clone with safe owned path/origin/worktree checks and no existing login/global config overwrite (review Change 2); verify tests cover private scoped auth, dirty/unpushed matching checkout, foreign folder/identity and duplicate-free reconnect.
- [x] 2.3 Implement `project-prepare` and generation-bound authenticated readiness delivery with frozen dependencies, explicit configuration completeness and idempotent Paseo registration (review Changes 2 and 3); verify source tests cover partial retry, changed manifests, dependency failures, unknown/missing config, no private output/host credentials and no root project scripts. Update all job/receipt docs and source-only boundary checks.

## 3. Release readiness

- [x] 3.1 Add the minor Next changelog entry and updater guidance without manually changing VERSION; verify the existing payload links, contract docs and review page remain current through the required checks.
- [x] 3.2 Run `/save` for the required remote CI gate; verify the exact source revision passes all existing thresholds and the reviewed compatible source is available for the cloud prerequisite. Leave this task pending on failed or unknown validation.


## 4. Pre-merge source safety

- [x] 4.1 Add an independent root-owned agent Node runtime and mutation-free runtime preflight to both setup paths; fixture tests cover compatible/absent binaries, wrong owner/mode/type/version, symlinks/hardlinks, system reuse, download fallback, checksum refusal and archive ownership. Preserve selected-user tools.
- [x] 4.2 Preserve normal exit on authenticated poll 401 using `WORKSPACE_MODE=preserve`, keep system PATH for root execution, and retain other poll retries without changing shared Paseo; focused fixtures pass. Document the exact host runtime/environment interface and update the archived review.

- [x] 4.3 Inventory memory and root/selected-home disk capacity without mutation or new eligibility floors; fixture tests cover low capacity, missing commands, failed/malformed reads, safe parent selection and rejection before inventory for an invalid home. Required exact-revision full gate stays pending in 3.2.
