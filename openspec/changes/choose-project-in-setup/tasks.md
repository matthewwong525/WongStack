# Tasks

The user explicitly requests testing only after the full remaining implementation. Build 7.x–9.x together, author meaningful tests alongside the code but do not run tests, build, /save or intermediate preview checks between tasks. Keep those boxes unchecked until the single final gate 10.1 passes. Sections 1–6 record the first build, which passed its gate at `33762826`; sections 7–9 revise it so Access works without a private ceremony ([design](design.md)). Previous completed source checkpoints remain historical evidence in source-checks.md; withdrawn GitHub work is not remaining feature scope.

## 1. Retained completed backend baseline

- [x] 1.1 Trusted owner activation and additive membership migration passed the previous source checkpoint; preserve owner/session checks and customer data.
- [x] 1.2 Current app permissions, described/bare route guards and record-check composition passed the previous source checkpoint; preserve their guarantees.
- [x] 1.3 Discovery/cache filtering and finite authorized app readback passed the previous source checkpoint; preserve zero-app self-service and denied unknown policy.
- [x] 1.4 Cloudflare login-policy/session reconciliation passed the previous connection source checkpoint; retain durable generation/unknown-write handling and separate provider status.

## 2. Core app/API-only scope

- [x] 2.1 Remove unshipped GitHub registration, token issuance/renewal/revocation, protection inspection and project-editing runtime routes/modules/tests/config dependencies. Keep customer data/additive schema intact and existing personal GitHub workflows unchanged; no repository-provider mutations.
- [x] 2.2 Make trusted owner activation, private owner setup, roster forms and rollout independent of repository IDs/names or GitHub readiness. Reject owner takeover/service/foreign-session claims; preserve existing installation pins on repeated setup.
- [x] 2.3 Return API/current-app self-service status with manual repository and independent memory guidance. Keep finite owner roster/status/login/retry operations, current grant enforcement and production credential exclusions. Author regression coverage for denied removed employees, app deselection during a valid session and partial login removal.

## 3. Standalone company setup

- [x] 3.1 Trim the unfinished standalone bootstrap to app/API login, status, selective discovery and action calls from an empty folder without repo/memory imports. Keep private state, same-business browser approval, canonical target checks and refused redirects. Author expired/new-device/headless/removed/zero-app tests without executing them yet.
- [x] 3.2 Remove the unfinished private Git/PR adapter and git-fronting skill changes; repository access/authentication remains manual through its provider. Preserve installed company client compatibility and existing files/independent memory.
- [x] 3.3 Define the reviewed immutable commit/digest bootstrap distribution and prompt generation, with truthful unavailable state for missing pins. Author artifact pin/clipboard fallback/private-state tests and update actual copy/paste instructions.

## 4. Access and home screens

- [x] 4.1 Build owner Access people/add-edit/login/removal/retry/share-link states and employee own setup/status, with server-enforced owner operations and no editing checkbox or GitHub connection section. Author relevant form/identity/denial/retry tests.
- [x] 4.2 Home offers Copy setup prompt, allowed app list, safe pending/error/empty states and authorized direct navigation. Preserve branding and owner removable welcome; employees see setup guidance. Author clipboard/navigation/zero-app tests and ensure phone/keyboard accessibility.

## 5. Distribution and owning documentation

- [x] 5.1 Ship Access/bootstrap and additive migrations explicitly through payload inventory, remove withdrawn GitHub helper/secrets/dependency entries, and enforce production login-secret exclusions in staging tooling. Preserve customized installs; revise Next minor CHANGELOG and leave VERSION unchanged.
- [x] 5.2 Update employee/company API/mini-app/setup/sync guidance for API-only app login and manual repository authority; reconcile stale GitHub claims in implementation inventories/contracts. Keep source-check history exact. Validate the revised plan/review and instruction/payload requirements at the final gate.

## 6. First build's source gate

- [x] 6.1 After 2.x–5.x implementation is complete, run one /save checkpoint with all required remote app/build/script/generated-starter/distribution checks. No checks are weakened. Read all failures and repair together; repeat affected checks only when required by new fixes. Mark the corresponding implementation tasks complete only after this final source gate passes.

The first build's preview and live checks (formerly 6.2 and 6.3) are superseded by section 10: the preview refused Access by design, and the live app never received the change.

## 7. Access opens for the owner

- [x] 7.1 Decide the owner from committed `WONG_OWNER_EMAIL` plus the verified human Access assertion in `app/worker/employee-access/core.ts`; allow production and staging; create the installation row on the first owner request; audit the first-seen subject. Add the var to production and staging in `app/wrangler.jsonc`. Remove `activation.ts`, `/api/access/activate`, origin/subject pins, `scripts/employee-owner-setup.mjs`, its tests and the client `ownerSetup` operations. Author tests: owner email matches, other email denied, service identity denied, var absent keeps existing behavior, open site unavailable.
- [x] 7.2 Use the built catalogue: remove `rollout.ts`, `WONG_ACCESS_ROLLOUT`, `WONG_ACCESS_POLICY`, and the `prepare`/`rollout` operations; insert missing `wong_access_apps` rows on owner reads and saves; ignore grants for apps no longer built; keep `mainRouteInventory()` denial of unmapped routes. Author tests: a new app is listed unticked, a removed app's grant is ignored.
- [x] 7.3 Start permissions safely in `policy.ts`/`members.ts`: while `policy_enabled` is 0 every signed-in person keeps every app; the first owner read on production with the key imports the recorded policy's emails as people with every built app and sets the switch in one batch; staging sets it with no import; a failed import changes nothing; an unavailable database denies once started. Author tests for each branch and for a repeated first read.
- [x] 7.4 Admit in one save: `POST /api/access/people` commits then reconciles under the lease and returns one status per kind; read `WONG_ACCESS_LOGIN_MANAGEMENT` version 2 from the environment; change only the policy's email list from a live read; keep generation, lease, unknown-write and shared-policy refusals; no provider call outside production. Remove `seal.ts`, `WONG_ACCESS_SEAL_KEY`, the sealed copy and `login/connect`. Author tests: add, failed add then retry, removal with session step, missing key saves choices, staging makes no call.
- [x] 7.5 Serve the prompt to every signed-in human from `/api/access/setup`, before and after permissions start; keep bootstrap `status`, `list`, `describe` and `call` working in both states; drop identity-only owner readback. Author tests for owner, employee, zero apps and not-started states.
- [x] 7.6 Rebuild the screens in `app/src/apps/access/` and `app/src/components/AssistantSetup.tsx`: people first with *Add person*, one status line per person, *Try again* only on failure, first-open note, one-step-left notice with a copyable request, practice banner on previews, removal confirm that says everyone signs in again; delete the operator panel and private-instructions copy. Show the setup box on Home for every signed-in person. Author tests for each sketched state, phone width and keyboard use.

## 8. Setup supplies the key

- [x] 8.1 In `.agents/skills/wong-setup/scripts/provision.mjs` and `private-access.mjs`, write `WONG_OWNER_EMAIL` to both Workers' `vars`, mint the Access-write key, store the production-only `WONG_ACCESS_LOGIN_MANAGEMENT` secret with account and human-policy ids, record the key id, reuse it on rerun, and never touch staging. Keep the deploy key unchanged. Author fake-Cloudflare tests: fresh, rerun, token unable to create keys.
- [x] 8.2 Give `/wong-sync` the same step for existing installs, with the missing-key report and private key link. Cut as many skill-instruction bytes as the step adds; the context check has almost no headroom.
- [x] 8.3 Reduce the production-only names in `scripts/cf-secrets.mjs`, `.env.example`, `app/.dev.vars.example` and `scripts/retired-names.json` to the one login-management secret; keep the staging refusal and its tests. Update `schema/seed.sql` so staging starts with practice people and permissions started.

## 9. Documentation and distribution

- [x] 9.1 Rewrite `wiki/stack/employee-access.md` around how the owner is known, the key, the first open and the practice list; update `wiki/stack/employee-project.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/mini-apps.md` and `wiki/stack/staging-bindings.md` where they name the removed settings. Reconcile `cloudflare-contract.md` and `implementation-inventory.md` in this change.
- [x] 9.2 Update the payload inventory for removed and changed files, revise the Next minor CHANGELOG entry, leave VERSION unchanged, and pin the changed bootstrap bytes to a new immutable commit and digest in `app/worker/employee-access/bootstrap-release.json`.

## 10. One final gate, the preview, then the live app

- [x] 10.1 After 7.x–9.x are built, run one `/save` checkpoint with all required remote checks. Weaken no check. Read every failure and repair together. Mark 7.x–9.x complete only when this gate passes.
- [ ] 10.2 On the deployed preview, signed in as the owner: open Access, see the practice list, add a person with one app, edit and remove them, copy the setup prompt, and confirm a non-owner identity is refused management. Check phone width and keyboard use. Record the evidence and return the preview for review.
- [ ] 10.3 After publishing, with the owner's confirm for each outward action: run the key step for this repo's live app, open Access as the owner, add a real second email with one app, have that person sign in and connect an assistant from an empty folder, untick the app, then remove them. Report each real outcome; anything not observed stays unverified.
