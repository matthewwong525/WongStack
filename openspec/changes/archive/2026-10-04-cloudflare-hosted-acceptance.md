<!-- openspec-archive v1 2026-10-04-cloudflare-hosted-acceptance -->
<!-- file proposal.md utf8 11610 -->
# Run one internal managed-app functionality trial

**Status:** ready-to-ship — preparation and partial live records publish as they stand; the app journey did not run
**Branch:** evil-dodo
**Open questions:** none for this change. Left open after it: provider confirmation of the22 retained registry blobs, the empty ha-83ec40bf namespace, and the unrun app journey.

Latest outcome: the approved live attempt published and verified the exact starter and image, then stopped before VM creation when existing provider cleanup access was unavailable. Staging is restored and account/repo grants are revoked;22 registry blobs remain unresolved. See [live-results.md](live-results.md) and [live-receipts.json](live-receipts.json). No app acceptance or general enablement is claimed.

## Why

We need to learn whether the existing managed-app setup, AI editing, private preview and publication work on the real platform. There are no customers. Test one owner-controlled disposable app first, without making a complete customer-isolation implementation a prerequisite for that learning.

## What Changes

- **Run one restricted staging trial.** Only the named owner and disposable workspace can use the test. Keep normal app creation disabled. Prepare its exact resources and cleanup within the proposed $10 and two-hour limits, then obtain the concrete live-run authorization.
  ```text
  prepare exact inputs
           │
           ▼
   one authorized staging app
           │
           ▼
     test and fix the flow
  ```
- **Use the existing build runner.** Run the ordinary tests and build for reviewed tiny edits. Keep platform deployment credentials in separate deployment stages. Defer the extra container and hostile-code isolation work; passing this test proves functionality only.
  ```text
  owner-controlled app ──▶ tests + build
                                │
                                ▼
                      separate deployment
  ```
- **Exercise the real journey and clean up.** Test setup, an AI edit, a failing check, private preview, exact approved publication and a second edit. Confirm publication and recovery with separate receipts, then remove the exact owned resources and report leftovers.
  ```text
  setup ──▶ edit ──▶ check ──▶ preview
                                │
                                ▼
                       approve + publish
                                │
                                ▼
                         change 2 + cleanup
  ```

**Non-goals:** general customer enablement, hostile-code isolation claims, nested Docker/offline cache, a new runner service, extra app features, GitHub migrations, enrollment, Memory/Devices or billing changes. Original full live acceptance and isolation obligations remain unfinished; this trial does not waive them. Existing maintenance publication permission is retained. No live resource, credential, sign-in or spend is authorized until the complete exact request is approved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-hosted-projects`: distinguish restricted internal functionality evidence from full hosted acceptance; preserve disabled general creation.

## Impact

Source owns the trial procedure, prepared manifest, resource ledger, deterministic evidence checks and the final live request. Cloud owns the small staging admission patch and ordinary SDK runner recipe. Source retains its active trial branch; Cloud completes its preparation archive and normal maintenance merge before the separate live request. Configuration remains review-only until fresh authorization. The original archive and unrelated work remain intact.

## Decision log

- **2026-10-04** — Asked whether to keep the implementation workspace or open this fresh follow-up workspace → chose this fresh workspace and closing the previous one, as explicitly supplied by the user. Do not repeat the question.
- **2026-10-04** — Asked what this turn authorizes → chose planning only, as explicitly supplied by the user; prepare the live authorization request and stop at review.
- **2026-10-04** — Assumed: retain the proposed name `cloudflare-hosted-acceptance`, because both fresh roots have no active change and the checked work has no competing acceptance plan. The old implementation workspace lists no active change and is left alone.
- **2026-10-04** — Assumed: use the existing starter page for two tiny visible AI changes, because the acceptance concerns delivery rather than extra features or screens.
- **2026-10-04** — Assumed: use deterministic inventory, receipt comparison, fault control and cleanup checks, because these are fixed identity and bounds checks; AI is needed only for the real editing steps.
- **2026-10-04** — Assumed: propose $10 incremental spend and two hours including cleanup, because one serial app should fit a small bounded run; these are reviewable proposed ceilings, not approved spending.
- **2026-10-04** — Assumed: keep the pinned SDK and Wrangler versions for initial compatibility review, because an unrequested upgrade would change the tested contract. Missing real capabilities stop activation rather than imply compatibility.

- **2026-10-04** — Asked where the one disposable acceptance app should run → chose Cloud staging with one restricted owner/workspace. Production creation stays disabled; configuring or executing the run still requires fresh authorization.

- **2026-10-04** — Asked what to do after plan review → chose “Ok ready to publish /ship.” This authorizes preparing the implementation and its ordinary maintenance gates/publication; the plan’s explicit fresh live-authorization and exact-candidate approval stops remain in force.


- **2026-10-04** — Asked whether to include one disposable staging VM after readback found no ready workspace → chose inclusion in the later exact request only; no creation, sign-in, credential, trial or live authority.
- **2026-10-04** — Asked how to obtain its contract5 Source while retaining the shared contract4 default → chose preparation of a staging-only immutable Source pin for exactly one named owner/VM through existing provisioning, with real paid-owner/access requirements intact. No global source pin, enrollment/billing change or live mutation is authorized.
- **2026-10-04** — Observed: official Sandbox security docs and the pinned0.12.1/CI0.2.0 interfaces do not establish an immutable trusted-check boundary against root-equivalent customer commands. Image permissions/USER/runuser cannot close that proof; stop runner preparation for a focused revised trust-boundary decision.

- **2026-10-04** — Prepared pin coverage reports150 targeted cases and100% guard/provisioning coverage with touched-file lint; full maintenance CI and live acceptance remain unverified. Both plans are blocked on the supported runner trust-boundary choice; no archive, commit, push, deployment or live authorization occurred. The compatibility proof field stays boolean false while its preparation status is recorded separately.

- **2026-10-04** — Asked to prepare the focused runner isolation revision and return its concrete plan → chose “Go do it just finish this.” Complete that revised planning work autonomously; this does not approve unknown live resources, credentials, spend or customer candidates.
- **2026-10-04** — Assumed: select one fixed offline Docker guest inside the existing SDK runner, with a separate working copy and trusted outer checks/receipts, because documented nested Docker and ordinary network/mount/capability controls provide a concrete correction without a new service or SDK fork. Exact pinned-platform support, offline ordinary commands and adversarial denial must pass CI and later real probes; no permissive fallback or successful-isolation claim.

- **2026-10-04** — Asked whether to simplify to a restricted live functionality trial and continue here after pausing the other agent → chose “adjust the plan and go with live test.” Use the existing SDK runner for one owner-controlled app, defer nested Docker and adversarial isolation proof, retain disabled general creation and original full-acceptance obligations. Prepare autonomously; the exact resource/cost request and candidate-specific approvals remain separate.

- **2026-10-04** — Asked how to test when the staging subscription is canceled → chose preparation of a staging-only exception for the one disposable VM, without restarting a subscription or changing billing records. Live activation remains part of the final exact resource/cost request; all other paid access remains unchanged.

- **2026-10-04** — Check: `scripts/tests/.c8rc.json` adds nested acceptance helpers to the measured coverage set; numeric thresholds and existing checks remain unchanged. No verification is removed.

- **2026-10-04** — Assumed: use a strictly read-only mode of the existing staging provisioning Workflow to obtain the firewall and VM/IP quote with its existing private Hetzner secret. The final exact request binds the preflight and conditional creation together; no secret export, new service or additional planning approval is needed.

- **2026-10-04** — Checkpoint preparation onto fresh main v30.7.0 (`1c5c65fe391a1db3ce2b3f7a43b39ff53dd71585`), preserving its unrelated memory, verification and workflow updates. The deliberate contract5 agent/starter input remains c22d448; ordinary maintenance checks and live trial evidence stay separate.

- **2026-10-04** — The manual image publisher is platform maintenance only. Complete and archive the Cloud preparation change through ordinary authorized publication, then bind its successful exact main CI image/starter artifact for one later explicit live dispatch. Source keeps the live trial tasks active and does not archive or claim acceptance from that maintenance merge.

- **2026-10-04** — Cloud preparation shipped viaPR72 at8de0f017df64f1ff62507954e132b6bb981fa7a1; its three main gates pass, exact CI starter/image artifact is11311021774, and normal production deployment applied additive migrations0022–0023. Staging readback confirms no trial controls/bindings. The final conditional request bundles the prepared targets and finite cost/capability readbacks; all actual live/provider/isolation outcomes remain unfinished.

- **2026-10-04** — The user approved the frozen bounded live request and selected existing ChatGPT/Codex included quota. Actual publication and cleanup observations are recorded in live-results.md/live-receipts.json. No VM/app journey ran because the existing Hetzner key handover timed out; exact registry storage absence remains unresolved after supported GC and refused scoped blob deletion. Keep live tasks and cleanup5.3 unfinished; preserve frozen inputs and disabled general creation.

- **2026-10-04** — Asked whether to rerun the bounded live trial or set up a staging workspace for hand testing → chose “Can we just merge now? Let’s quickly wrap it up so i can test elsewhere.” Publish the preparation, helpers and partial live records as they stand. Tasks4.1–4.6 and5.3 move to deferred work unrun; no acceptance, isolation or enablement claim follows, and the registry-blob and namespace leftovers stay open.

- **2026-10-04** — Archive checkpoint: archived as `openspec/changes/archive/2026-10-04-cloudflare-hosted-acceptance` with `--skip-specs`, because all three delta requirements already equal the main spec. No payload file changed, so no release number.

<!-- end proposal.md -->
<!-- file design.md utf8 9913 -->
# Design

## Context

See proposal.md for scope. Source main baseline is c22d448bfd8204994ba92f65b5f722762ce6f052 (v30.4.0); Cloud baseline is 122b4d554296b5c0c1cd93603de1f6582f435e8f. Prior gates/deployments are maintenance evidence only. Owning docs are Source wiki/stack/hosted-projects.md and Cloud wiki/stack/hosted-ci.md, hosted-project-setup.md, hosted-project-records.md and hosted-publication.md. The archived cloudflare-hosted-starter/live-acceptance-follow-up.md tasks6.1–6.3 remain frozen and unfinished.

## Goals / Non-Goals

**Goals:** prepare and run one separately authorized owner-controlled functional trial through the shipped Artifacts/SDK path; test two tiny changes, refusals, exact private preview, publication, acknowledgment recovery and owned cleanup; retain factual evidence for fixes.

**Non-goals:** complete customer isolation, nested Docker/guest dispatcher/offline cache, multi-customer launch, new services, global Source pin changes, GitHub runtime builds, enrollment/billing/Memory/Devices changes. General creation stays disabled. No customer-acceptance claim follows from this trial.

## Decisions

### One staging owner and workspace

Use wongstack-cloud-staging and existing D1 1029a8e7-be64-42c0-bf9a-de49f87a2322 in account040f88e2bf4f25fb0b91b7cb24f3d442. Historical readback found all seven workspaces deleted and Artifacts inventory401; recheck before live mutation. Include the already selected single disposable EUCPX22 VM/IPv4 with the prepared staging-only contract5 Source override. Preserve the shared contract4 default, ordinary paid-owner entitlement outside the exact internal exception and existing firewall; never fabricate readiness/access rows or start a trial.

Add a small staging-only guard shared by setup/status and delivery/Workflow admission. Bind exact run, owner/workspace, project/account/namespace/starter/source/image, issue/expiry, admission cutoff and finite operation quotas. Deny mismatched or malformed inputs before provider calls. Ordinary HOSTED_CREATION_ENABLED remains off. Existing customer/GitHub behavior and same-operation readback/acknowledgment must remain intact. Keep uncertain mutations locked; no replacement resources/tokens or repeated create/deploy after a lost response.

### Existing runner for controlled functional evidence

Use pinned CI0.2.0, Sandbox0.12.1, Cloud Wrangler4.142.0 and starter Wrangler4.144.0 with the ordinary Dockerfile/commands. Build the recipe and generated starter in maintenance CI; no local builds, runtime GitHub source fetch, serialized functions or custom packer. No nested guest, Docker-in-Docker, offline cache or new runner adapter is needed for this scope. runner-containment-design.md is deferred research, not an execution prerequisite.

The entire check/build sandbox is one trust domain. Only reviewed starter dependencies and the owner's two tiny edits are admitted; freeze the dependency lock. Do not exercise hostile code or admit other users. Check/build gets no platform-management/Access/publication/cross-project credentials. Audit the actual SDK environment/checkout before live use; any repository read grant remaining there is a disclosed run-repo exposure, not evidence of isolated credentials. Do not introduce a new arbitrary-script runner with account authority. Separate deployment runners execute only fixed trusted deploy entries and independently validated regular compiled files, without customer hooks. Stop on platform-credential exposure, unsafe output, uncertain target or unresolved cleanup/cost.

A same-sandbox passing receipt is functional evidence from controlled code, not tamper-resistant evidence against arbitrary code. Keep runner.isolationVerified=false and fullAcceptance.complete=false. Do not weaken the existing general customer isolation promises or enable general creation. The stronger unshipped containment spec delta is removed; the baseline customer requirement is unchanged.

### Minimal preparation and real feedback

Reuse ordinary setup, hosted delivery and existing provider SDK entry points. Add only exact staging admission, normal pinned recipe/CI verification, small receipt comparison/probe tools and a review-only configuration/restore diff. Use existing provider inventory APIs for complete bounded readbacks rather than building a new cleanup service. Canonical ownership receipts, full pagination and exact absence checks remain required; unknown inventory401 is not absence. Stop for genuinely unsupported provider interfaces rather than silently upgrading.

The first real trial checks actual image/startup/provider APIs before the user journey. Functional failures are recorded at the exact stage; fix through normal maintenance gates and rerun only with remaining time/cost and approved unchanged targets. A changed input/target or required extra resource revises the exact request. Do not turn failures into isolation success or completed original acceptance.

### Limits, publication and cleanup

Retain $10 total incremental/$8 admission stop and two-hour window including30 minutes cleanup; stop new admission at90 minutes. At most one VM/IPv4, one namespace/two repos, one app Worker/Access protection/observer, one SDK container app/DO namespace/image/R2 bucket/Workflow/subscription; at most8 check Workflows,2 publications,40 serial runners,50 read grants,90 aggregate runner minutes,5GiB storage,2GiB egress. These proposed ceilings require execution-day rates and exact affordable inputs before live approval. No billable trial/subscription change.

Approval binds ledger/manifest digests and prospective starter/image/VM inputs; actual immutable creation receipts append after approved creation and before use. Each candidate separately binds project/change/branch/base/head/private preview after all tracked archive/spec edits. Confirm provider deployment, authenticated compiled project/SHA/assets and exact Git main independently. Inject acknowledgment loss only for this app and recover the same operation without redeployment or replacement grants.

Stop admissions and reconcile uncertainty before exact owned deletion. Keep Access until all app endpoints stop serving, revoke owned grants/context, delete owned repos/storage/SDK resources and VM/IPv4, restore only approved configuration, and record canonical absence or named retained tombstones/migration tags/other leftovers. Preserve existing service/DB/user/billing/enrollment/firewall/secrets and unrelated work. Ledger.md and live-request.md own the full exact inventory and request.

## Risks / Trade-offs

- [Controlled code is not hostile-code proof] → functional evidence only; isolation and general enablement remain deferred.
- [Dependency or AI edit changes authority assumptions] → review the tiny diffs and frozen lock; refuse additional dependencies/secret-bearing check environments.
- [Pinned SDK/provider method is unsupported] → test the real interface within the exact authorized bounds; record failure and retain disabled creation.
- [Provider inventory/owner/access/cost remains unresolved] → complete read-only preflight; do not mutate on a placeholder.
- [Lost mutation response] → preserve operation/claims/tokens and perform bounded exact readback, no second creation/deployment.

## Migration Plan

Complete scoped code and CI first; bundle one exact request. Only its approval permits staging configuration, starter/image publication, VM creation and the functionality run. Cleanup restores the approved staging diff. Normal production creation remains disabled. Full acceptance/isolation/general availability require separate later work and evidence.

## Exact internal test access

The user explicitly approved preparing a finite staging-only one-owner/one-workspace exception because their staging subscription is canceled. Bind it to the same immutable pin, authority digest and two-hour window. It must work through existing provisioning/owner workspace/AI/pairing paths with no fake readiness, subscription, trial or billing rows. Preserve normal paid requirements for other users/workspaces; on expiry refuse fresh access/admission and use the approved cleanup. Actual activation belongs in the final exact live request. Audit suspension/cron so they neither prematurely remove the authorized trial nor silently extend it.

## Provider quote before VM creation

The host cannot read the staging runtime Hetzner secret. Prepare one exact staging-only read-only mode on the existing provisioning Workflow to return the existing deny-inbound firewall ID and CPX22/location/primaryIPv4 prices. It creates no VM, token, firewall, readiness or billing record and returns no credentials. The final bounded request may authorize invoking that mode, then creation only if its canonical readbacks match the reviewed type/location/firewall policy and gross cost cap; a failed or incomplete quote stops creation within the same approved run. No new public endpoint or provider service is introduced.

## Final prepared publication and trial boundary

Cloud preparation is a completed separately scoped archive/main publication; Source retains the trial. The [final request](live-request.md) binds the exact successful main image/starter artifact, current staging baseline, owner/targets and review-only configuration. [live-inputs.json](live-inputs.json) hashes those prepared records and implementation inputs; newly issued IDs belong in separate live-receipts.json without replacing the approved identities. Capability/absence/cleanup/current-gross-price checks are conditional actions within one batch request and cannot authorize a substitute target or paid plan. Image publication uses the existing manual platform workflow after the normal Cloud merge, never the customer path. Ordinary artifact aliases are restored from the exact CI receipt before publication and the complete tree hash must still agree.

<!-- end design.md -->
<!-- file tasks.md utf8 14758 -->
# Tasks

The user invoked `/ship` after plan review: code preparation and ordinary maintenance saves/publication are authorized. Live resource creation/configuration, credentials, starter/image publication, sign-in, spend and general enablement retain the explicit fresh-authorization stop at3.5. The selected target is restricted Cloud staging; production creation stays disabled. Original archived tasks6.1–6.3 remain frozen/unfinished until their corresponding fresh evidence is recorded here. Prepared manifests may name missing actual receipts as blocking live execution; do not fabricate those receipts to complete preparation.

## 1. Source acceptance records and authorization preparation

- [x] 1.1 Record the user’s choice of Cloud staging restricted to one named owner/workspace, update the proposal/decision log/design/review page, and verify production creation remains disabled with no configuration or live-run authorization transferred. Exact owner/workspace identifiers remain ledger preflight under1.3.
- [x] 1.2 Re-fetch Source and companion Cloud main through the owning workflow, confirm active/overlapping work and preserve unrelated changes; record exact heads and actual implementation branches, verifying no canceled branch/code/private Workflow record or old scratch clone is used.
- [x] 1.3 Prepare the nonsecret compatibility manifest and exact target/grant ledger described in design.md, including the proposed one disposable VM/planned workspace UUID and prospective actual ready workspace/recipient generation, contract5 source/runtime/guard, starter prepared tree/lock, image recipe/inputs, SDK/tools/provider interfaces and separate prepared versus published receipts; verify every missing prerequisite has a stop condition and no credential value is collected into evidence.
- [x] 1.4 Prepare the bounded live-request document with all known exact ledger targets and explicit unresolved readback fields, scopes, owner AI/Access participation, publication approvals, $10/two-hour limits, run quotas, recovery and cleanup; verify it is non-actionable until task3.5 supplies the exact prepared inputs and conditional readback/creation boundaries, and that implementation permission cannot authorize live actions.
- [x] 1.5 Document the acceptance procedure and evidence schema inside this change, linking the owning docs/frozen original6.1–6.3; verify strict OpenSpec validation and generated current review page, without altering archived evidence.

## 2. Cloud companion admission, image recipe and coverage

- [x] 2.1 In a later authorized implementation checkout from freshly fetched Cloud main, create its companion plan through that root's CLI with the Source design as the linked boundary; verify owning docs/path rules and an exact companion branch before editing code. Do not reuse the departing clone or expand into VM transfer/enrollment/billing/memory work.
- [x] 2.2 Prepare the user-approved staging-only immutable contract5 Source override for one exact named owner/VM through existing provisioning with ordinary paid-owner/access requirements unchanged outside the exact user-approved internal exception, then narrowly restricted, expiring acceptance admission in the existing setup/status/delivery/Workflow path, while normal creation stays disabled; add meaningful owner/workspace/target/pin/expiry/quota denial coverage and docs, verifying refusal occurs before provider calls and existing customer recovery/GitHub behavior remains intact.
- [x] 2.3 Prepare the ordinary pinned SDK runner recipe and CI-owned starter/image check from existing shared commands; audit check/build credentials and separate fixed deployment stages, add meaningful verification/docs, and defer all nested Docker/offline-cache/adversarial-isolation work.
- [x] 2.4 Prepare supported bounded existing-API inventory and exact owned cleanup instructions; verify complete pagination/correlation, destroy failures and unknown/absence distinction without adding a cleanup service.
- [x] 2.5 Prepare the exact trial-only configuration and restoration diff outside current configuration; verify no global pin/production enablement or live resource mutation and name retained migration/audit leftovers.

## 3. Source deterministic helpers and final prepared verification

- [x] 3.1 Prepare minimal deterministic helpers under scripts/acceptance/cloudflare-hosted for whitelisted receipt comparisons, run ledger/limits, anonymous/authenticated identity/assets probes and scoped acknowledgment transport faults; add meaningful forged/stale/incomplete/partial publication tests and documentation, verifying no helper provisions or deploys without fresh bound authority.
- [x] 3.2 Prepare the two tiny real-AI starter edits and red/whole-change/docs-only test scenarios using existing ordinary checks/build commands; verify planned diffs add no extra screen/storage/binding and keep archive/spec/metadata edits before each final checked candidate.
- [x] 3.3 If payload/owning wiki edits become necessary, read matching payload/wiki rules and add the required CHANGELOG Next entry with no VERSION edit; verify payload inventory and wiki checks through the later maintenance gate. Leave this conditional task documented as inapplicable if no payload changes are needed.
- [x] 3.4 Use the user’s fresh `/ship` authorization for the required normal maintenance checkpoint, then run `/save` in both touched repos for complete exact-head gates and CI-owned starter/image verification; inspect final diffs for canceled-code reuse, hidden provider enablement, runtime GitHub dependency, memory/billing/enrollment changes and loosened checks. Record historical maintenance receipts separately; this fulfills only the maintenance portion of original6.1.
- [x] 3.5 Bundle the prepared implementation, compatibility/ledger proof and concrete live request for one review; verify reviewed prospective contract5 VM preparation inputs, supported pinned interfaces, starter/image immutable inputs and permissions/cost feasibility, then STOP for fresh live authorization. Missing prepared pins/supported prospective VM preparation/platform-credential separation/cleanup support blocks the dependent mutation; actual VM/runtime/recipient receipts append only after fresh approved provisioning and before hosted use. Missing prerequisites never authorize upgrades, additional VMs or global pin moves.

## 4. One authorized app's internal functionality trial (not run)

None of these steps ran. On 2026-10-04 the user chose to publish the preparation and partial records now and test a hosted app by hand elsewhere. The steps stay here as the unrun procedure; they are deferred work, not completed tasks.

- Not run, moved out of this change: 4.1 Only after the exact request is explicitly approved, record approval/bounds/expiry and create/configure only the approved inventory; verify immutable starter/image publication readbacks, exact contract5 runtime, SDK bindings/subscription, R2 lifecycle and private Worker/Access protection before customer content. Run bounded real SDK startup/Artifacts/credential-separation/cleanup checks within the approved caps before the owner-controlled journey. Nested Docker/adversarial probes are deferred; failures stop the affected step. Keep ordinary public/production creation disabled. This records functionality evidence only; original6.2 cannot close without the separately deferred full-acceptance proof.
- Not run, moved out of this change: 4.2 Run account-free ordinary setup through the selected service owner/workspace path and exercise known-failure retry plus lost-response same-operation readback; verify exact resources/grants/bootstrap acknowledgment, one checkout/Paseo project, sentinel preservation, other-owner denial and truthful unavailable memory.
- Not run, moved out of this change: 4.3 With separately authorized owner AI participation, perform the first real AI edit and deliberately red candidate, whole-change code-under-docs checks and docs-only handling; record actual candidate branch/base/head/Workflow and real runner functionality/lifecycle observations. Verify red cannot publish, no hosted GitHub dependency and no authority leakage; stop privileged stages on platform-credential exposure or unresolved target/output/lifecycle, and leave hostile-code isolation explicitly unproved.
- Not run, moved out of this change: 4.4 Correct the candidate, complete archive/spec/metadata changes, use hosted `/save` for the exact final passing head and inspect native private preview with owner Access; verify immutable provider URL/ID, expected HTML/JS/CSS/assets and stateless identity API, anonymous/forged denial on each surface and stale/foreign/missing approval refusal. Request the owner's exact final candidate approval; no trial approval pre-approves its SHA.
- Not run, moved out of this change: 4.5 Publish the first exact approved candidate through the existing release ref/SDK path, inject before-ack and lost-after-success acknowledgment responses only on the disposable workspace, and recover the same operation by bounded readback/guarded ordinary fast-forward; verify independent provider version/deployment, authenticated compiled identity/manifest/HTML/assets and exact main acknowledgment agree with no redeploy, new grant, force push or discarded lock/ref. Record any deadline subcase not observed as pending.
- Not run, moved out of this change: 4.6 Start the second real AI change from independently confirmed main, finish its plan/branch/final archive/save/check/private preview, obtain its separate exact approval and complete publication; verify a new SHA/publication ID with all three independent facts and no reuse of first approval. Stop new admission at90 minutes or earlier cost/quota boundary; report unfinished matrix rows rather than expand automatically.

## 5. Owned resources, scoped grants and cleanup evidence

- [x] 5.1 Under the exact approved teardown, stop admission and reconcile uncertain same-operation mutations while retaining protection/recovery refs and locks; capture complete sanitized receipt bundles and canonical Workflow/container/DO/R2/token inventories, verifying no suppressed destroy error or expiry is treated as absence.
- [x] 5.2 Delete exact owned previews/versions/deployments/Worker and verify content stops serving plus canonical absence before removing Access; revoke/read back the exact observer and repository/SDK/starter grants and private context, verifying denied old access, complete inventories and no replacement credentials.
- Not finished, moved out of this change: 5.3 Remove only owned repos/new namespace, SDK subscription/Workflow/container/DO/image/storage objects/versions/bucket/credentials, acceptance checkout/Paseo registration and appropriate owned hosted_starter records; restore authorized configuration and verify pre-existing service/DB/VM/namespace/secrets/unrelated work intact. Record every nondeletable migration/audit record, serving resource, grant, orphan runner or unpaid/uncertain leftover explicitly with its recovery/cost/protection implications.
- [x] 5.4 Record the fresh matrix and cleanup/absence outcomes in this change with immutable manifests/receipts and independent maintenance-vs-hosted status; verify every required row has exact evidence or remains unfinished. Original6.1 closes only with compatible actual published/deployed identities,6.2 only with the full two-change matrix,6.3 only with cleanup and its separate decision evidence; never edit the frozen archived checkboxes.

## Deferred work outside this trial

Hostile-code/trusted-check containment, unproved original archived6.1–6.3 acceptance obligations and customer enablement/rollback are later work. They remain unfinished in their owning archived follow-up and retained containment research; they are not implementation tasks of this deliberately smaller trial. A completed functional trial may be recorded/archived with these limitations explicit, and cannot enable general creation or claim full customer readiness.

## Internal staging test access preparation

- [x] 8.1 Prepare the user-approved finite one-owner/one-workspace staging exception through existing provisioning and required owner workspace/AI/pairing/cron paths, without changing billing/subscription/trial/readiness records; test foreign/expired/malformed authority denial and unchanged ordinary paid behavior. Activation and VM creation still await final exact live authority.

Preparation notes: task3.1's exported read-only receipt/limits/probe/fault helpers pass five targeted cases and lint; actual calls/faults remain live evidence. Task3.2's exact tiny-edit/red/whole-change recipe is in functionality-scenarios.md; no live AI edit has run. Task3.3 is inapplicable because this Source patch changes only meta acceptance scripts/tests/plans and the optional host test-token declaration, no distributed payload/wiki file; no release/version edit is needed. Coverage configuration adds these nested scripts without changing any numeric floor.

Prepared review boundary: Cloud preparation merged at8de0f017df64f1ff62507954e132b6bb981fa7a1 with all three main gates passing; CI artifact11311021774 supplies the verified245-entry starter and exact image archive. Source helper code atef9c70e0dd057b7245f2ea5277019922b01f96a6 passed its normal gates; the final review-only checkpoint receives its own gate before the request is presented. Tasks1.3/2.4/3.5 are complete preparation, not real provider/absence/cost/runtime proof: the request permits only finite readbacks and conditionally bound mutations, refusing each dependent action until current capability, absence, prices and owned cleanup are established. Actual IDs go in separate live-receipts.json after approval, preserving the frozen prepared inputs. This statement describes the prepared checkpoint only; actual authorization, unfinished journey and cleanup progress are in live-results.md and live-receipts.json.

Live attempt:4.1–4.6 remain unfinished.5.1/5.2/5.4 record the actual bounded partial attempt, including targets never created and verified grant revocation;5.3 remains unfinished because22 exact registry blobs still respond after GC. No archival, merge, complete acceptance or general enablement follows from these partial results.

Scope decision 2026-10-04: the user chose to publish this change with4.1–4.6 not run and5.3 not finished, and to test by hand elsewhere. Those seven items are deferred work with no completion claim. The22 registry blobs and the empty ha-83ec40bf namespace remain named leftovers in live-results.md. General creation stays disabled; original archived6.1–6.3, hostile-code isolation and customer enablement remain unproved.

<!-- end tasks.md -->
<!-- file specs/cloudflare-hosted-projects/spec.md utf8 3578 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Managed creation stays disabled pending live acceptance

The prepared implementation SHALL keep general new managed project creation disabled and its production provider execution bindings unconfigured until a separately authorized complete live acceptance and enablement decision. A separately authorized acceptance environment SHALL admit only its exact approved owner, workspace, project inventory, immutable identities and finite execution bounds; absent, expired or mismatched acceptance authority SHALL refuse before provider mutation. Shipping the implementation or completing a restricted acceptance run SHALL NOT activate general customer provisioning or imply that an unobserved live journey passed.

#### Scenario: Managed creation is disabled

- **WHEN** the managed route has not completed live acceptance and remains disabled
- **THEN** starting a workspace creates no managed repository, hosting resource or provider credential, while the existing GitHub route remains available

#### Scenario: One restricted acceptance run is authorized

- **WHEN** fresh approval names one acceptance owner/workspace, exact inventory, immutable identities, cost/time limits and cleanup
- **THEN** only that bounded run can exercise managed setup and delivery, while other owners/workspaces and ordinary production creation remain unavailable

## ADDED Requirements

### Requirement: Internal functionality trials do not establish customer readiness

A separately authorized internal trial SHALL be restricted to its named staging owner, workspace and exact bounded inventory. Its results SHALL distinguish functional observations from unverified hostile-code isolation and full acceptance. General creation SHALL remain disabled and existing customer authority-isolation promises SHALL remain unchanged. Missing platform-credential separation, exact target, finite cost or supported cleanup SHALL prevent trial execution.

#### Scenario: Controlled app completes its journey

- **WHEN** the reviewed owner-controlled app completes setup, private preview and exact publication under the bounded request
- **THEN** the records show those functional observations while hostile-code isolation, full customer acceptance and general enablement remain pending

#### Scenario: Trial prerequisite is absent

- **WHEN** exact owner/target authority, platform-credential separation, cost or cleanup is unresolved
- **THEN** the affected live action refuses without expanding resources, credentials or general creation


### Requirement: Internal staging access does not change billing

A separately approved internal staging VM exception SHALL grant only the named owner/workspace temporary test access within its bound expiry. It SHALL preserve ordinary paid-access checks for all other users/workspaces and SHALL NOT create or change subscription, billing, trial or fake readiness records. Missing, malformed, foreign or expired internal authority SHALL refuse fresh test provisioning/access.

#### Scenario: One internal test workspace is prepared

- **WHEN** exact live authority permits the named owner/workspace's finite staging exception
- **THEN** only that test workspace can use the existing provisioning and owner journey within the bounds, with unchanged billing records

#### Scenario: Internal authority is unavailable

- **WHEN** authority is absent, foreign, expired or used for a different workspace
- **THEN** no internal provisioning or access exemption is granted and ordinary paid-access behavior is preserved

<!-- end specs/cloudflare-hosted-projects/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file acceptance-procedure.md utf8 3639 -->
# Internal functionality trial procedure

State: preparation; no live authority. design.md and live-request.md define current bounds. The original archived follow-up tasks6.1–6.3 remain immutable and unfinished. runner-containment-design.md is deferred research.

## Prepare

1. Read exact approved owner/targets and ordinary starter/image/Source/Cloud inputs from compatibility.json and ledger.md; complete normal maintenance checks before live request. Distinguish prepared artifacts from deployed receipts.
2. Verify priced $10/two-hour feasibility, existing paid-owner access, one VM/IP/firewall plan, provider inventory/grant scopes, configuration/restore diff and supported exact cleanup. Do not change general creation or issue credentials during preparation.
3. Present one concrete bound live request. After approval append all actual immutable creation receipts and verify ordinary SDK/provider startup, contract5 runtime, check/build credential separation and protected Worker before content. Reviewed dependencies/lock and owner-controlled edits only; no hostile-code probes or isolation claim.

## Exercise functionality

1. Ordinary setup/retry: same project/job/checkouts, preserve sentinel edits and private handoff. Lost responses keep original claims/locks; use exact readback rather than recreate resources/tokens.
2. Owner signs into their AI via private handoff; make a tiny visible edit to the existing starter. Exercise a red candidate and show publication refusal, plus whole-change/docs scope checks.
3. Fix the candidate and finish archive/spec/metadata before final save. Record project/change/actual branch/base/head/candidate/Workflow and exact passing private native preview.
4. Verify expected HTML/assets and stateless identity API with owner authentication; anonymous/forged/foreign/stale access refuses. Collect exact candidate approval only after these checks.
5. Publish via existing release ref/SDK path. Record independent provider deployment, authenticated compiled project/SHA/assets/HTML and exact main acknowledgment. Inject only the approved same-workspace acknowledgment faults; recover same operation with guarded ordinary fast-forward/readback, no redeploy/replacement grant/force push.
6. Start a second tiny AI change from confirmed main and repeat final save/private preview/exact approval/publication. Stop new admission at90 minutes/$8 estimate or earlier quota/time limit.

## Evidence and cleanup

Each observation records UTC, project/change/branch/base/head, operation/candidate/Workflow IDs, image/starter/source identities, provider deployment ID, exact private URL and authenticated/anonymous findings. Never persist credentials, user content, secret-derived hashes or raw provider logs. Label check results as controlled-code functionality, not protected hostile-code proof. runner.isolationVerified and fullAcceptanceComplete stay false.

Stop admission, reconcile uncertainty and retain immutable receipts. Enumerate exact owned resources/grants with complete pagination. Stop serving app content before removing Access. Revoke owned grants/context; delete owned Worker/repos/SDK storage/Workflow/container/image and VM/IP; restore the approved diff. Canonical readback proves absence; SDK completion, TTL or destroy logs do not. Record named leftovers and costs/protection/recovery. Preserve all pre-existing resources and unrelated work.

Outcome: observed functionality passed/failed/pending per step, cleanup absent/retained/unresolved per exact ID, and full customer readiness deferred. Never mark original full acceptance or general enablement complete from this trial.

<!-- end acceptance-procedure.md -->
<!-- file compatibility.json utf8 11571 fence=~~~ -->
~~~json
{
  "schemaVersion": 1,
  "state": "prepared-ready-for-conditional-live-approval",
  "authorized": false,
  "observedAt": "2026-10-04",
  "source": {
    "baselineSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
    "baselineRelease": "30.4.0",
    "finalMaintenanceSha": "ef9c70e0dd057b7245f2ea5277019922b01f96a6",
    "manifestSha256": "41bb79ea07ef1d17215064924424f7affd7171536c7190e5bca32bbd8f838b62",
    "payloadTreeSha256": "07cce5cdacf4fe211b39f0bc55529c9e54374667c6da45ce23328b7be73c6f72",
    "maintenanceBaseSha": "1c5c65fe391a1db3ce2b3f7a43b39ff53dd71585",
    "preparedAgentSourceRetained": "c22d448 is a deliberate compatible immutable contract5 trial input; later unrelated Source releases remain intact",
    "finalMaintenanceScope": "Verified unchanged acceptance helper implementation; the final review-only checkpoint is identified externally by PR266 exact-head gate, avoiding a self-referential commit hash.",
    "payloadTreeScope": "Complete CI-generated installed starter payload, including ordinary aliases; original Source repository is bound by immutable c22d448 commit."
  },
  "cloud": {
    "baselineSha": "122b4d554296b5c0c1cd93603de1f6582f435e8f",
    "branch": "cloudflare-hosted-acceptance",
    "finalMaintenanceSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
    "configuredStagingWorker": "wongstack-cloud-staging",
    "stagingVersionId": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
    "stagingDbId": "1029a8e7-be64-42c0-bf9a-de49f87a2322",
    "configSha256": "1f30ee90a219a921b2b2baeaecf1e141208188203e4ecffe2a141515063f9d03",
    "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
    "stagingDeploymentId": "0aef7f42-a347-4891-9d77-db20ba48b588",
    "preflightReference": "provider-preflight.json",
    "stagingCodeSha": "e633bbcc568d8cd9a8cba5e765d1f01d018911e2",
    "codeTree": "713805a7672c591e05dd5c41ac50d00ea4a61c33",
    "stagingCodeTreeMatchesMain": true,
    "archive": "openspec/changes/archive/2026-10-04-cloudflare-hosted-acceptance",
    "accessTeamDomain": "startuptemplate.cloudflareaccess.com"
  },
  "agent": {
    "defaultSourceSha": "78022828c37f6cf5be01f246c5c653ef2954322a",
    "defaultContract": 4,
    "requiredContract": 5,
    "preparedSourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
    "actualSourceSha": null,
    "actualRuntimeVersion": null,
    "guard": {
      "path": "/opt/wongstack/source/.agents/skills/save/scripts/hosted-main-pre-push.mjs",
      "preparedSha256": "42c436fba76a7f29c32af309d94275ba0c845fa6d0cb455bbdf68f24b90477aa",
      "actualSha256": null
    },
    "recipientGeneration": null,
    "recipientMatches": false,
    "rootOwnedRuntimeVerified": false
  },
  "starter": {
    "preparerSha256": "cac921da3e8345100ed2f21426785b009d439c0dcdaa36c267fed862cb446d6c",
    "sourceLockSha256": "f6ce167c77bd81537896e3a366ef45627677eb837b07cbb07ff8716d89eb53ca",
    "preparedTreeSha256": "07cce5cdacf4fe211b39f0bc55529c9e54374667c6da45ce23328b7be73c6f72",
    "preparedLockSha256": "5803f71f7c12a6fed81fcac8c697fb283a5866c7d69cece1bb75c11a40c0c21a",
    "installRecordSha256": "119d9de05329fbf4f6a00c39b7a68cd7d682992dbd930d25305b131415961840",
    "publishedRemote": null,
    "publishedMainSha": null,
    "publishedTreeVerified": false,
    "wrangler": "4.144.0",
    "preparedTreeVerified": true,
    "artifactAliasRestoration": {
      ".claude": ".agents",
      ".codex": ".agents",
      "CLAUDE.md": "AGENTS.md"
    }
  },
  "runner": {
    "base": "cloudflare/sandbox:0.12.1@sha256:ea9b35e61c800eddbc4450fad333e5dd26033a06f7d36624388b0711bef9f8c5",
    "recipeSha256": "d3081752ac6bd26559bfb1f294b79d801e03fae3b553338b1ad55f4072c50aaa",
    "sourceInputsSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
    "cloudInputsSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
    "trustedEntries": [
      {
        "path": "check-build.mjs",
        "sha256": "36614eed7c060b0ca4b9f4e81073502b65545ca98273dc91ef25d7c5a8681e55"
      },
      {
        "path": "context.mjs",
        "sha256": "e71e1acc7f0015ea5ad087dd83f9dbc99c4481bd3c8546ff83e06116e7e8029b"
      },
      {
        "path": "deploy-output.mjs",
        "sha256": "7c21ae1f09ccd1d950c40bc8da519d81818278a8bf0e162c757670016d2430c8"
      },
      {
        "path": "deploy-production.mjs",
        "sha256": "3fd9bd52c923e08990f3f1965b776ded21e5d07275c2e146caecad53563b50f7"
      },
      {
        "path": "inspect-output.mjs",
        "sha256": "c519d2f9e6d0bcfb834fd19a15ae0279afcfa4e5fb8a889121665b6d10e793b3"
      },
      {
        "path": "prepare-history.mjs",
        "sha256": "548566de4f68f6424ba6c0d518ad771600c8588ca6b81e46304a2b2689e69328"
      },
      {
        "path": "wrangler.fragment.jsonc",
        "sha256": "9e349098caec29ecb8a4079e601830635722907180691aa45f454506f2765b29"
      }
    ],
    "toolLockSha256": "f4d5bdcb64173dcd6d0796877c2f028364179205198498b261b940d065dd57da",
    "sdk": {
      "version": "0.2.0",
      "integrity": "sha512-uAr54YhZy4sYHaJM2fYMPg2BtmS2btemBMtED59XDdYQhw08lGr29IS+njNKSWnrBGpbJuQGRWc/jWWiMgg3vg=="
    },
    "sandbox": {
      "version": "0.12.1",
      "integrity": "sha512-P1ZmNDLYtuEY1ZUcAx0OgTol98VqS617LGd4nf1RTOjSV2yHLDAp59NI36/gg3/pxkHPgmAEyFIjH/ie8FoA7g=="
    },
    "wrangler": {
      "version": "4.142.0",
      "integrity": "sha512-oqquqqtHOevn17hzI7qRzU+MiOaCU2UZRLPIZStjGlhwYbxe3hk4Stq3knfcIlGfMSfgM4iycZKeb1fEF5mRTQ=="
    },
    "nodeMajor": 22,
    "nodeVersion": "22.22.2",
    "npmVersion": "10.9.7",
    "gitVersion": "2.34.1",
    "architecture": "linux/amd64",
    "registry": null,
    "publishedDigest": null,
    "isolationVerified": false,
    "isolationBlocker": {
      "state": "deferred-not-a-functionality-gate",
      "reference": "runner-containment-design.md",
      "reason": "Internal reviewed-app functionality trial only; hostile-code isolation remains unverified and general customer creation disabled."
    },
    "containment": {
      "design": "runner-containment-design.md",
      "network": "none",
      "separateGuestWorktree": true,
      "sdkVersionChanged": false,
      "preparedRecipeVerified": false,
      "preOverlayTreeInterfaceVerifiedLive": false,
      "guestImageDigest": null,
      "dockerInputsSha256": null,
      "offlineCacheSha256": null,
      "resourceLimits": null,
      "ciAdversarialEvidence": null,
      "realRuntimeEvidence": null,
      "state": "deferred"
    },
    "planningCliVersion": "1.13.2",
    "ciImageId": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
    "ciImageArchiveSha256": "b125822b7a344520715698cc8b93b5295a5de7c1456b1a6e5db6a91ee9c6ec93",
    "ciImageArchiveBytes": 1587673600,
    "preparedRecipeVerified": true
  },
  "provider": {
    "artifactsSchema": "filter.repo_name / targets / workflow_name",
    "documentedArtifactsMinWrangler": "4.145.0",
    "pinnedInterfaceVerifiedLive": false,
    "inventoryReadbackComplete": false,
    "cleanupMethodsVerified": false,
    "artifactsNamespaceInventoryStatus": 401,
    "preparedPinnedInterfaceVerified": true,
    "preparedCleanupProcedures": "Cloud archive cleanup-procedure.md; actual canonical access/absence remains a conditional execution preflight."
  },
  "missingPrerequisites": [
    "fresh explicit approval of the frozen prepared inputs and bounded conditional batch",
    "current paid platform/registry/Access capability, complete target absence and exact owned cleanup readbacks under that approval",
    "GET-only runtime preflight with unique existing firewall and gross nbg1/cpx22/IPv4 quote within cap",
    "live-issued matching starter/registry/VM/recipient/runtime/guard receipts before customer use",
    "owner Access/AI sign-in on an already held plan/included quota",
    "separate exact final candidate approvals after final checks"
  ],
  "publishedReceipts": [],
  "stop": "Only the conditional preflight/resource batch may be approved. Stop each dependent mutation on missing paid capability, inventory/cleanup support, exact targets/input provenance or affordable bounds. Actual provider facts remain separate and unverified; general creation and full acceptance remain disabled/unfinished.",
  "workspace": {
    "existingEligible": [],
    "proposedDisposableVmCount": 1,
    "vmCreationAuthorized": false,
    "requiredReadyReadbackBeforeHostedUse": true,
    "sourcePreparationSupported": true,
    "blocker": "Exact reviewed one-VM internal staging exemption may be prepared without billing changes; actual firewall/location/price/provider/runtime and execution authority remain pending.",
    "sourcePreparationStatus": "Prepared and exact-head maintenance tested; actual runtime/guard and live authority pending",
    "plannedId": "83ec40bf-8873-4b75-a1b5-49151f2b1b8d",
    "ownerId": "5c5eca98-d495-45d3-9f7a-4da7b9d1b17a",
    "ownerEmail": "operations@claymoo.com",
    "activePaid": false,
    "internalEntitlementExceptionPreparationAuthorized": true,
    "internalEntitlementExceptionLiveAuthorized": false,
    "selectedLocation": "nbg1",
    "serverType": "cpx22",
    "existingFirewallName": "wongstack-deny-inbound"
  },
  "preparedChecks": {
    "scope": "Maintenance only: exact reviewed Source helpers and Cloud trial/pin/preflight/entitlement/publisher paths; no real provider behavior, hostile-code isolation or customer publication proof.",
    "targetedCasesPassed": 2693,
    "newGuardAndProvisionCoverage": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    },
    "targetedLint": "passed",
    "ciGate": "passed",
    "live": "untouched",
    "workingDirectory": "companion Cloud app/",
    "commands": [
      [
        "node_modules/.bin/vitest",
        "run",
        "--coverage"
      ],
      [
        "node_modules/.bin/oxlint",
        "--deny-warnings",
        "worker",
        "src"
      ],
      [
        "node_modules/.bin/knip"
      ],
      [
        "node_modules/.bin/jscpd",
        "--config",
        ".jscpd.json"
      ]
    ],
    "preparedInputSha256": {
      "scripts/hosted/Dockerfile.runner": "d3081752ac6bd26559bfb1f294b79d801e03fae3b553338b1ad55f4072c50aaa",
      "app/worker/hosted-acceptance.ts": "1cbc33053fc8c6bb847b3a92731c080b1922dc00459f83b19116aeb0669755ba",
      "app/worker/hosted-acceptance-source.ts": "2a2bca1eec31ffdbfcc0026bdeac6ac4d1026f68e8338e46676d1173d052620f"
    },
    "coverageReportSha256": "e1f00a400b3aa6d9484771f3d9d19766b203763ef916267f3acbb07b06c90406",
    "fullAppCasesPassed": 2755,
    "appFilesPassed": 99,
    "vmCasesPassed": 30,
    "scriptCasesPassed": 67
  },
  "trial": {
    "mode": "internal-functionality",
    "ownerControlledOnly": true,
    "liveAuthorized": false,
    "fullAcceptanceComplete": false,
    "deferred": [
      "hostile-code isolation",
      "nested Docker",
      "general enablement"
    ],
    "projectId": "hp_d3fd2bfec810475cd45de5bf97eced82",
    "repoName": "ws-d3fd2bfec810475cd45de5bf97eced82",
    "workerName": "ws-d3fd2bfec810475cd45de5bf97eced82",
    "namespace": "ha-83ec40bf",
    "starterName": "starter",
    "backupBucket": "ha-83ec40bf-backup",
    "workflowName": "ha-83ec40bf-ci"
  },
  "ciInputArtifact": {
    "repository": "matthewwong525/wongstack-cloud",
    "headSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
    "runId": 37222779808,
    "artifactId": 11311021774,
    "name": "hosted-inputs-8de0f017df64f1ff62507954e132b6bb981fa7a1",
    "digest": "sha256:5c8bac31bf9b5790c1c70867de4f34857fe75ba4d760f9c00f92a260fad0156c",
    "expiresAt": "2026-10-07T18:03:38Z",
    "sourceBranch": "main",
    "passed": true
  }
}

~~~
<!-- end compatibility.json -->
<!-- file cost-preflight.md utf8 6933 -->
# Functionality trial cost preflight

State: partial read-only pricing; not a live spending approval or complete feasibility proof. Final exact request retains $10 incremental total, $8 admission stop and two hours including cleanup. Do not subscribe to a plan, restart billing, buy AI credits or assume unused included quotas.

| Item | Observed public pricing / proposed bound | Remaining execution check |
| --- | --- | --- |
| Existing Workers paid account | Artifacts requires Workers Paid; current account subscription query403 cannot prove status | Verify existing suitable paid platform account; no plan purchase/change |
| SDK standard-2 runner | 1vCPU/6GiB memory/12GB provisioned disk;90min cap. At marginal rates CPU0.000020/vCPU-second + memory0.0000025/GiB-second + disk0.00000007/GB-second, provisioned fullCPU bound is USD0.193536 | Exact deployed type/max_instances1,90min durable reservation and stop/readback |
| Container egress | Up to2GB at highest listed0.05/GB is USD0.10 | Keep bounded workload/dependencies; no assumed free allocation |
| Artifacts operations/storage | Docs announce billing starts2026-10-14; today2026-10-04. Later rate0.15/1000 operations +0.50/GB-month after included allowances | Recheck execution-day rate and exact paid availability; inventory401 remains unresolved |
| R2 Standard |0.015/GB-month,4.50/million ClassA,0.36/million ClassB; billed usage rounds up units | Complete operation/storage estimate and existing usage. Small marginal additions can incur a full4.50 ClassA unit; do not price only the unrounded tiny fraction. No Infrequent Access |
| Container registry, Workers/Workflow/DO/logs/D1/Access | Existing service and one bounded controlled job; all applicable incremental charges count | Freeze exact input/image/retention and applicable current rates before claiming total feasibility |
| VM + primaryIPv4 | Exactly one CPX22 for at most2h; proposed gross total allocationUSD0.30 | Actual Hetzner account/location/server/IP tax/currency/price readback unavailable on host; runtime token exists but is not exposed. Freeze supported existing firewall ID and quoted costs before creation; refuse if incompatible |
| AI | Proposed zero additional AI spend: owner signs into an already held plan and uses included quota only | Verify actual owner plan/quota; refuse API/pay-as-you-go usage, top-up, new plan or trial; no credentials transferred |
| Cleanup reserve |USD2 within total; stop new admissions atUSD8 estimate /90min | Deletion/absence readbacks rather than power-off/TTL; name unresolved cost/resource leftovers |

Sources rechecked2026-10-04: [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/), [Artifacts pricing](https://developers.cloudflare.com/artifacts/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Hetzner billing FAQ](https://docs.hetzner.com/cloud/billing/faq/). These public rates are inputs, not actual provider or invoice receipts. Root credentials were used only for authenticated read-only scope/status checks; no new token, resource, payment or subscription was created.

## Observed account allowance

The authenticated read-only account aggregate for2026-09-04 through2026-10-04 returned546.156606976GB-s duration,1084 rows read and1103 rows written. GraphQL schema confirms duration units GB*s. This is far below the documented400,000GB-s,25billion reads and50million writes monthly allowances; recheck the complete current window before launch and reserve room for the bounded trial, unrelated concurrent use and ingestion lag. This is usage evidence, not subscription/invoice proof. If duration headroom cannot be established, its documented rounded USD12.50/million overage unit alone exceeds the proposed USD10 cap and prevents execution. Never infer tiny fractional DO cost from runtime alone. [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [official usage interface](https://developers.cloudflare.com/durable-objects/observability/metrics-and-analytics/).

Other current rates to include conservatively are Workers0.30/million requests and0.02/million CPUms; Workflow storage0.20/GB-month and steps0.80/100,000; Workers Logs0.60/million events; D1 writes1.00/million, reads0.001/million and storage0.75/GB-month. A reviewed conditional estimate must include applicable rounding, account allocation headroom and cleanup retention. No quota availability or free new plan is presumed. [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Workflows](https://developers.cloudflare.com/workflows/reference/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/).

## Conditional priced envelope

The final batch request permits only cost/capability readbacks until the existing paid account, registry/Access entitlement and Hetzner gross quote are established. No new plan or recurring seat may be purchased. With verified DO allowance headroom, the following additional operator limits give a conservative admission estimate: R2 at most100,000 ClassA and100,000 ClassB operations plus5GiB Standard storage (reserve one rounded4.50 and0.36 operation unit and0.09 storage); Workers/Workflow at most100,000 requests and50million CPUms (1.03); Workflow at most10,000 steps and1GB-day retained state (0.087); logs at most100,000 billable events (0.06); D1 at most1million reads,100,000 writes and1GB-day additive state (0.126); runner/egress0.294; VM/IP at most0.30 gross. This sums to about6.847 USD before any separately verified registry/Access charge. The account must have at least20,000GB-s of DO duration headroom and sufficient request/read/write allowance for these bounded operations after concurrent-use margin. Recheck current billing-window usage, not only the historical observation.

These are admission/monitoring limits for a frozen controlled workload, not a provider-enforced spending cap. Confirm applicable rounding/current rates and remaining provider usage before first container or VM admission. Aggregate runner reservations remain a durable limit. Refuse admission if the complete priced estimate exceeds8 USD, any unpriced recurring charge applies, any named cap cannot be monitored, or an existing platform entitlement cannot be established. Reserve the remaining2 USD and30 minutes for teardown; never extend spending/time automatically. The one batch approval covers readback followed by conditional creation, avoiding a second VM approval request.

The official managed-image guide states the Cloudflare container registry is backed by R2. Include the new image layers and backing operations in the same5GiB/operation cap and rounded R2 reserves; do not assume a second free storage pool. No external private registry/Secrets Store is created. [Image management](https://developers.cloudflare.com/containers/guides/image-management/#push-images-during-wrangler-deploy).

<!-- end cost-preflight.md -->
<!-- file functionality-scenarios.md utf8 2802 -->
# Two tiny owner-controlled AI edits

Prepared recipe only; no AI sign-in, edit, candidate or deployment has occurred. Run on the one exact authorized Artifacts app using its existing workspace/Paseo and owner-signed-in AI. Dependencies and lock stay frozen. No new screen, storage, runtime binding, service or app feature.

## First change

Ask the real owner-connected AI to change one existing heading on app/src/pages/home/Home.tsx to “Live test one” and update the corresponding ordinary test. Do not change dependencies, command definitions, security settings or coverage thresholds. Create the active change and actual branch through the normal verbs, retaining the confirmed starter main SHA as exact base.

For the deliberate red candidate, add one false visible-text expectation in the existing home test with an exact scope note explaining this temporary test fault. Follow that code edit with a small tracked plan/doc edit before saving; the shared whole-change checks must still find the earlier app change. Record the actual red outcome and publication refusal without inventing a private passing preview. Remove the deliberate fault and retain a meaningful passing text check; finish archive/spec/metadata edits before final save/check/private preview/exact approval. Observe the changed heading, assets and stateless compiled identity API, then publish and test the approved acknowledgment losses with same-operation recovery.

## Second change

Start from independently confirmed main after first publication. Ask the real owner-connected AI to change the same heading to “Live test two” and update its meaningful ordinary text test. Use a new change/actual branch/SHA/publication ID, complete final archive/save/check/private preview and request its separate exact approval. Verify all three publication facts again.

## Scope checks and budget

The existing shared checks and maintenance fixtures cover docs-only scope; this internal trial does not spend another live candidate on a separate docs-only journey. Preserve the original full-acceptance obligation as pending if it needs additional live evidence. Typical minimum is16 SDK runners (red2, first preview3, first publication4, second preview3, second publication4); five-minute reservations total80 minutes under the90-minute aggregate runner cap, with two spare reservations. Actual supported startup/command times must fit each reservation and the90-minute admission cutoff. Failures retain exact operation/candidate receipts; do not add work or retries beyond remaining approved quota/time/cost.

The operator reviews each tiny AI diff before sending it to the one-trust-domain check/build runner. This controls the functionality experiment and does not prove isolation from arbitrary customer or dependency code.

<!-- end functionality-scenarios.md -->
<!-- file ledger.md utf8 13329 -->
# Acceptance target and grant ledger

**State:** preparation only; not authority. Null or unresolved fields block live use.

The machine-readable [compatibility manifest](compatibility.json) keeps prepared identities separate from actual publication receipts. This ledger names targets, scopes and ownership; it contains no token values, private context, recipient token hash or secret-derived hash. The parent may append sanitized read-only preflight observations. Every created ID requires its own operation receipt before use or deletion. A matching name never establishes ownership.

## Existing resources to preserve

| Field | Prepared value | Required readback |
| --- | --- | --- |
| Environment | Cloud staging | Exact deployed service version and code SHA |
| Service Worker | `wongstack-cloud-staging`; current version `838648ff-8449-4c41-afd7-6cdbdc5e3a38` | [Observation-at-time](provider-preflight.json); current staging deployment `0aef7f42-a347-4891-9d77-db20ba48b588` is maintenance only; acceptance configuration remains pending |
| Existing DB | `1029a8e7-be64-42c0-bf9a-de49f87a2322` | Binding and current migration inventory |
| Account | `040f88e2bf4f25fb0b91b7cb24f3d442` | [Read-only preflight](provider-preflight.json); Artifacts inventory401 is unknown, not absence |
| Owner ID/email | `5c5eca98-d495-45d3-9f7a-4da7b9d1b17a` / `operations@claymoo.com` | Fresh select-only owner readback; subscription canceled; sign-in still separate |
| Workspace/VM ID | No eligible ready workspace; exactly one disposable VM proposed, planned UUID `83ec40bf-8873-4b75-a1b5-49151f2b1b8d` | The final conditional batch approval binds exact owner/UUID/source/type/location; append actual ready/runtime/recipient receipts before hosted use |
| Recipient/generation | Unresolved | Nonsecret recipient identity/generation and boolean match; never store token hash |
| Agent | Contract5 required; default remains contract4 | Actual source/runtime/guard and root ownership readback |
| Existing production/VM/secrets | Preserve all | Before/after configuration hashes and exact IDs; secret presence booleans only |

## Proposed disposable inventory

Prospective target names are listed below; actual provider identities and absence readbacks remain pending. Record expected-absence readbacks before creation; never adopt a pre-existing name. For each row append exact target, kind, owner/project, create operation ID, immutable returned resource ID, authoritative readback reference and approved teardown method.

| Kind | Bound/scope | Removal and proof |
| --- | --- | --- |
| Disposable staging VM/IPv4 | Exactly one EUCPX22 4GB VM at `nbg1`, at most2h; one primaryIPv4; no backups/snapshots/volumes/new shared firewall | Exact provider server/IP IDs and canonical absence after deletion; preserve existing service/user/DB/shared firewall, revoke run-issued agent/pairing authority, name any owned tombstone. Power-off continues billing |
| Artifacts namespace | One new uniquely named namespace | Delete only if a supported method is verified; otherwise retain the named empty namespace as an approved leftover after both owned repos are absent |
| Starter repo | One, frozen main at exact prepared tree | Repo-specific publishing grant revoked immediately after freeze; exact repo deletion after handoff/evidence |
| Customer repo | One deterministic `ws-<owner/workspace digest>` | Exact refs/repo removed after same-operation recovery and evidence; canonical absence |
| Customer Worker | One immutable Worker ID; initial503 only | Exact owned preview/version/deployment and script removal; canonical absence and URLs cease serving |
| Access app/policies | One Worker destination; one exact owner Allow plus one observer non_identity policy | Preserve until all serving endpoints cease; then delete exact IDs and inventory |
| Observer token | One project token, at most24h | Revoke exact token ID; inventory absence and old authentication denied |
| Workspace Git grant/context | One customer-repo write grant, at most24h; original context/retry generations | Preserve for uncertain recovery; revoke exact grant/context, deny old authority |
| SDK read grants | At most50 total, exact customer repo, at most1h | Complete before/after inventory each Workflow, exact token-ID correlation and revocation; no unidentified grant allowed |
| Starter publish grant | One starter-repo write grant, at most1h | Revoke after freezing, canonical absence and old access denied |
| Runner resources | One container app/DO class+namespace/image digest; at most40 serial instances | Consume/cancel logs; supported exact stop/destroy and full inventory including failed/orphan instances; image/app/namespace cleanup |
| Backup bucket | One dedicated R2 bucket; no cache, at most5GiB | Read back at most24h deletion lifecycle on backups/ and cache/; enumerate/delete objects/versions, prove empty and remove exact bucket |
| Workflow/subscription | One binding/subscription filtered to exact customer repo; at most8 check+2 release Workflows | Stop admission, reconcile uncertain runs, supported terminate/delete/readback; preserve existing provision channel |
| R2 credential | At most one pair, exact backup bucket, only if SDK requires it | Record owning token/key IDs only; revoke and prove absence; customer process gets neither key |
| Platform authority | Preserve existing suitable secret; otherwise at most one specifically approved account token | Disclose necessary account scope; guard exact targets; revoke only run-issued authority |
| Temporary platform publisher secret/job | One repository-scoped execution secret in `matthewwong525/wongstack-cloud`, solely for one explicit manual dispatch publishing the exact CI image; no customer GitHub route | Confirm secret name absent before setting it; remove after the job and read back absence; preserve the pre-existing deploy credential and all other secrets |
| Workspace/service artifacts | One checkout/Paseo registration and acceptance-owned hosted_starter rows | Preserve evidence/recovery first; remove exact owned checkout/registration/ciphertext; preserve unrelated user/VM/enrollment/billing rows |

Every unsupported deletion method, pagination permission/error, unidentified grant, retained migration tag or namespace is a prerequisite/leftover with exact ID, reason, cost, protection and next readback. Expiry, snapshot TTL, SDK success or destroy logs do not establish absence. No wildcard deletion, replacement credential, VM creation, subscription or trial is authorized by preparation. The user chose preparing one exact staging owner/VM contract5 Source override through existing provisioning; ordinary paid access remains required outside the separately approved preparation of this exact internal staging exception. No ready workspace, unavailable Artifacts inventory and missing actual runtime/owned cleanup/current cost readbacks block the dependent live step. Nested Docker is deferred and adds no inventory for this functionality trial. No customer-isolation or full-acceptance claim is permitted.

## Prepared internal owner and target names

These names/IDs are prospective and create nothing. The owner selected preparation of a one-VM staging-only access exception without changing subscription/billing records. Live activation remains a separately explicit item of the final bound request. Preserve all normal paid access and deny foreign/expired authority.

- Owner: `5c5eca98-d495-45d3-9f7a-4da7b9d1b17a` / `operations@claymoo.com`; current subscription canceled.
- Planned workspace UUID: `83ec40bf-8873-4b75-a1b5-49151f2b1b8d`; planned project `hp_d3fd2bfec810475cd45de5bf97eced82`.
- Planned namespace: `ha-83ec40bf`; starter repo `starter`; app repo/Worker `ws-d3fd2bfec810475cd45de5bf97eced82`.
- Planned backup bucket: `ha-83ec40bf-backup`; Workflow `ha-83ec40bf-ci`.
- Actual resource absence/inventory, immutable server/IP/image/worker/Access IDs, existing firewall ID and execution-day gross pricing are conditional execution preflight; the selected location is `nbg1`, with no location/type substitution. Name selection is not ownership or creation authority.
- The REST namespace guide documents create/get/list but no delete route. If no supported deletion is verified, the exact empty namespace is a proposed retained leftover for the final request; never invent DELETE or report it absent.

## Proposed run-only platform credential

Read-only permission discovery found the existing host token active, with API Tokens Write, but lacking Artifacts and Workers Containers permission groups. Do not widen it, transfer it to check/build or treat401 as namespace absence. The final exact request may approve minting at most one separate finite platform execution token for account040f88e2bf4f25fb0b91b7cb24f3d442, solely for the reviewed trial management/deploy/cleanup paths. Its account-wide provider scope must be disclosed and enforced by exact target guards. Record only returned token ID and configured expiry; store plaintext as `HOSTED_ACCEPTANCE_EXECUTION_TOKEN` in the primary ignored `.env` and only the approved staging runtime secret, never evidence. Actual issuance capability/scopes must be read back under that approval; discovery is not issuance.

Candidate necessary account-scoped groups from authenticated permission discovery:

| Group | ID | Intended use |
| --- | --- | --- |
| Artifacts Read |71b0df4c5b6c4d3196f4428d7a6580ea | Complete namespace/repo/grant inventory |
| Artifacts Write |f9e1ba803b8d4d52b4d4184825b07a28 | Exact two repos, starter freeze, grant revoke/cleanup |
| Workers Scripts Write |e086da7e2179491d91ee5f35b3ca210a | Named app and reviewed staging configuration only |
| Workers Containers Read/Write |cfd39eebc07c4e3ea849e4b3d2644637 / bdbcd690c763475a985e8641dddc09f7 | Exact trial container/image inventory/lifecycle |
| Workers CI Write |2e095cf436e2455fa62c9a9c2e18c478 | Exact Workflow/customer-only subscription |
| Workers R2 Storage Write |bf7481a1826f439697cb59a20b22293e | Exact disposable backup bucket/lifecycle/cleanup |
| Access: Apps and Policies Write |1e13c5124ca64b72b1969a67e8829049 | Account-scoped exact Worker protection |
| Access: Service Tokens Write |a1c0fec57cf94af79479a6d827fa518c | Exact app observer token and revocation |

This is a candidate permission set, not configured authority. Remove any unnecessary group when the actual CLI/API path is verified; no API-token-management, Memory, billing or unrelated account scope enters the run token. R2 object credential, if the pinned SDK requires it, is a separately listed bucket-scoped pair in the same final request. Cost-preflight.md records partial current rates and unresolved feasibility.

## Exact tested image publication

The existing platform maintenance workflow prepares the runner archive without pushing it. The host has no Docker engine; the final request therefore includes one explicit manual publisher job in that existing workflow, using the already-built exact successful same-repository CI artifact. No rebuild or customer runtime GitHub fetch is introduced. Bind the run ID, artifact ID/digest, Cloud head, immutable local image ID and archive SHA256 in the authority; the job verifies them and finite expiry before load and push. Publish only to account `040f88e2bf4f25fb0b91b7cb24f3d442`, image tag `ha-83ec40bf-runner`; append the returned registry digest before runtime configuration. A temporary repository execution secret is supplied only after final approval and removed immediately afterward, including failure cleanup. The run-only provider token itself is retained only for bounded approved teardown, then revoked. No automatic push, PR or main workflow can publish this trial image.

The one existing shared firewall must be the uniquely enumerated deny-inbound firewall returned by the GET-only runtime preflight. Bind its canonical ID before provider creation; do not modify/create a firewall or pick another location/type if the selected target is unavailable.

The existing host management credential may perform only the approved exact D1 queued-VM/audit setup and readbacks in database `1029a8e7-be64-42c0-bf9a-de49f87a2322`; it never enters a customer or image command. Runtime setup owns project records. No billing, subscription, readiness or unrelated user/VM row may be fabricated or changed. The new execution token needs no D1 or token-management authority.

## Final prepared receipts

Cloud preparation is published at `8de0f017df64f1ff62507954e132b6bb981fa7a1`; its archive is `openspec/changes/archive/2026-10-04-cloudflare-hosted-acceptance`. The exact successful main CI run37222779808/artifact11311021774 supplies the tested input archive and manifest identities. The staged e633bbcc568d8cd9a8cba5e765d1f01d018911e2 tree equals that main tree (`713805a7672c591e05dd5c41ac50d00ea4a61c33`). Existing Access organization is `startuptemplate.cloudflareaccess.com`; no organization/seat change is included. The reviewed Source helper implementation is ef9c70e0dd057b7245f2ea5277019922b01f96a6; the final saved review checkpoint/gate is recorded externally by PR266. Freeze [live-inputs.json](live-inputs.json) at approval, then append newly returned exact provider/resource/grant facts in `live-receipts.json`, retaining those original prepared bytes.

<!-- end ledger.md -->
<!-- file live-inputs.json utf8 4949 fence=~~~ -->
~~~json
{
  "schemaVersion": 1,
  "runId": "ha-83ec40bf",
  "mode": "internal-functionality",
  "authorized": false,
  "cloudHead": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
  "sourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
  "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
  "stagingWorker": "wongstack-cloud-staging",
  "stagingVersion": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
  "stagingDeployment": "0aef7f42-a347-4891-9d77-db20ba48b588",
  "stagingDatabase": "1029a8e7-be64-42c0-bf9a-de49f87a2322",
  "ownerId": "5c5eca98-d495-45d3-9f7a-4da7b9d1b17a",
  "ownerEmail": "operations@claymoo.com",
  "workspaceId": "83ec40bf-8873-4b75-a1b5-49151f2b1b8d",
  "location": "nbg1",
  "serverType": "cpx22",
  "existingFirewallName": "wongstack-deny-inbound",
  "targets": {
    "projectId": "hp_d3fd2bfec810475cd45de5bf97eced82",
    "repoName": "ws-d3fd2bfec810475cd45de5bf97eced82",
    "workerName": "ws-d3fd2bfec810475cd45de5bf97eced82",
    "namespace": "ha-83ec40bf",
    "starterName": "starter",
    "backupBucket": "ha-83ec40bf-backup",
    "workflowName": "ha-83ec40bf-ci"
  },
  "registryTag": "ha-83ec40bf-runner",
  "accessTeamDomain": "startuptemplate.cloudflareaccess.com",
  "ciArtifact": {
    "repository": "matthewwong525/wongstack-cloud",
    "headSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
    "runId": 37222779808,
    "artifactId": 11311021774,
    "name": "hosted-inputs-8de0f017df64f1ff62507954e132b6bb981fa7a1",
    "digest": "sha256:5c8bac31bf9b5790c1c70867de4f34857fe75ba4d760f9c00f92a260fad0156c",
    "expiresAt": "2026-10-07T18:03:38Z",
    "sourceBranch": "main",
    "passed": true
  },
  "imageId": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
  "imageArchiveSha256": "b125822b7a344520715698cc8b93b5295a5de7c1456b1a6e5db6a91ee9c6ec93",
  "starterTreeSha256": "07cce5cdacf4fe211b39f0bc55529c9e54374667c6da45ce23328b7be73c6f72",
  "limits": {
    "usdTotal": 10,
    "usdAdmissionStop": 8,
    "usdVmAndIpGross": 0.3,
    "windowSeconds": 7200,
    "admissionSeconds": 5400,
    "cleanupReserveSeconds": 1800,
    "checkWorkflows": 8,
    "publications": 2,
    "serialRunners": 40,
    "sdkReadGrants": 50,
    "aggregateRunnerMinutes": 90,
    "runnerMinutes": 5,
    "maxInstances": 1,
    "storageGiB": 5,
    "egressGiB": 2,
    "automaticSideEffectRetries": 0
  },
  "preparedDocumentsSha256": {
    "live-request.md": "b9e82c1368245b2d3c7b796a054d2702721f7dcb3379d3f18014c6e38a35afd3",
    "compatibility.json": "e010f78f63bac2a8b950309fded7e25fceee23ee980f80a309a6a53e6902b81e",
    "ledger.md": "df9423da99907272d623b185b95a275499ec0a47dfd0fb88c948d2a23ed5ce51",
    "cost-preflight.md": "78e4a1271027733e7deabefd7dfd9093bb0f5b02f72fb124a1301f2eb5e74501",
    "acceptance-procedure.md": "58944acbe21124bfe7142a9e04fec963edd1ada1a2b67e92048a024e15f47029",
    "functionality-scenarios.md": "8fe517c42cf52ae441c14f9ef5407b9269b1b52420fc474686a06fd386657dc6",
    "maintenance-evidence.md": "a91211de728ce4a39312b6356020851cb0a0b25edf252b6f8b0ed737d46c832c"
  },
  "sourceHelperSha256": {
    "evidence.mjs": "89823b88cf223442eb02ffe3861f69b6b66e66b43dbd13ad8ab95bc017f36863",
    "probe.mjs": "8bef3a8fa0a6f89555df0970c597c05dde7c5a3504fe1d51d3299269aadcc730",
    "acknowledgment-fault.mjs": "9d772dddf1a1c20b27ddd6050c275fc7b1e925d70c73f2dcbc090bd4688d7438"
  },
  "cloudPreparedFilesSha256": {
    "scripts/hosted/acceptance.fragment.jsonc": "efb98ed10ac562f76bd08f4122abe0ae4ed2fce5d168888d83ed6a434e400a1e",
    "scripts/hosted/Dockerfile.runner": "d3081752ac6bd26559bfb1f294b79d801e03fae3b553338b1ad55f4072c50aaa",
    "scripts/hosted/publish-image.mjs": "7b3054de7179a28312e4d18f5dcdf99ec916f7d2861826a91480e9b0fbf42fc2",
    ".github/workflows/hosted-runner.yml": "092d27ba3f44ec2f6bcfcdf94aab36eaed3a5a663c1c6b3fdbdf12ed0b3fb805",
    "openspec/changes/archive/2026-10-04-cloudflare-hosted-acceptance/cleanup-procedure.md": "0c31b0283c32f954d185860cd46ef60fae4297e4dc8dc7c220a4b508519e9cc9",
    "openspec/changes/archive/2026-10-04-cloudflare-hosted-acceptance/image-publication.md": "febe3e5b0cf804fa30895180e2df61e647cf3d10fafc1379667f2573f8f3cbcc"
  },
  "hostTokenDeclarationSha256": "48a3ba900e0e8e6c59d32ffa1e8b7850d8d5d5bbb554b0795537272f0b4353c4",
  "actualReceipts": "live-receipts.json (not created before approval)",
  "permittedRetained": [
    "empty ha-83ec40bf namespace if provider lacks supported deletion",
    "nonserving exact DO/D1 migration tags",
    "exact audit/deleted-VM tombstones"
  ],
  "requires": [
    "explicit user approval of this frozen batch",
    "conditional current paid/capability/price/headroom/absence/cleanup readbacks before dependent resource creation",
    "matching actual starter/registry/runtime receipts before app use",
    "owner Access/AI participation and separate exact final app approvals"
  ],
  "notClaims": [
    "hostile-code isolation",
    "full customer acceptance",
    "general enablement"
  ]
}

~~~
<!-- end live-inputs.json -->
<!-- file live-receipts.json utf8 66468 fence=~~~ -->
~~~json
{
  "schemaVersion": 1,
  "runId": "ha-83ec40bf",
  "approval": {
    "userResponse": "Approve",
    "sourceCheckpoint": "be2f662ee6a33a67d034f36023f0e7810a9ac5de",
    "inputsSha256": "275aee51f5ec60eb26677972c4a77bde4c90aa80a1eb75ade9731a8c5c90fb3d",
    "requestSha256": "b9e82c1368245b2d3c7b796a054d2702721f7dcb3379d3f18014c6e38a35afd3"
  },
  "observations": [
    {
      "name": "authority-start",
      "at": "2026-10-04T18:47:19.043011+00:00",
      "firstMutationAt": "2026-10-04T18:47:19+00:00",
      "expiresAt": "2026-10-04T20:47:19+00:00",
      "stopAdmissionAt": "2026-10-04T20:17:19+00:00",
      "usdTotal": 10,
      "usdAdmissionStop": 8
    },
    {
      "name": "ha-83ec40bf-execution",
      "at": "2026-10-04T18:47:19.792320+00:00",
      "tokenId": "fd6b408cf837422073f64692e2c383a5",
      "expiresAt": "2026-10-04T20:47:19Z",
      "permissionGroups": [
        "71b0df4c5b6c4d3196f4428d7a6580ea",
        "f9e1ba803b8d4d52b4d4184825b07a28",
        "e086da7e2179491d91ee5f35b3ca210a",
        "cfd39eebc07c4e3ea849e4b3d2644637",
        "bdbcd690c763475a985e8641dddc09f7",
        "2e095cf436e2455fa62c9a9c2e18c478",
        "bf7481a1826f439697cb59a20b22293e",
        "1e13c5124ca64b72b1969a67e8829049",
        "a1c0fec57cf94af79479a6d827fa518c"
      ],
      "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442"
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:49.112156+00:00",
      "path": "/artifacts/namespaces?per_page=100",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 100,
        "total_pages": 1,
        "count": 1,
        "total_count": 1
      },
      "shape": "list",
      "count": 1,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:49.491984+00:00",
      "path": "/containers/applications",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {},
      "shape": "list",
      "count": 0,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:50.108258+00:00",
      "path": "/containers/registries",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "shape": "list",
      "count": 1,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:50.737850+00:00",
      "path": "/r2/buckets?per_page=100",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "shape": [
        "buckets"
      ],
      "count": 13,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:51.365935+00:00",
      "path": "/workflows?per_page=100",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "count": 3,
        "page": 1,
        "per_page": 100,
        "total_count": 3,
        "total_pages": 1
      },
      "shape": "list",
      "count": 3,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:52.206042+00:00",
      "path": "/access/apps?per_page=100",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 100,
        "count": 4,
        "total_count": 4,
        "total_pages": 1
      },
      "shape": "list",
      "count": 4,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:52.908675+00:00",
      "path": "/access/service_tokens?per_page=100",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 100,
        "count": 7,
        "total_count": 7,
        "total_pages": 1
      },
      "shape": "list",
      "count": 7,
      "targets": []
    },
    {
      "name": "capability-and-target-inventory",
      "at": "2026-10-04T18:47:53.662799+00:00",
      "path": "/workers/scripts/ws-d3fd2bfec810475cd45de5bf97eced82/settings",
      "status": 404,
      "success": false,
      "errors": [
        {
          "code": 10007,
          "message": "This Worker does not exist on your account."
        }
      ],
      "result_info": null,
      "shape": "NoneType"
    },
    {
      "name": "duration-headroom",
      "at": "2026-10-04T18:49:16.064032+00:00",
      "status": 200,
      "durationGbSeconds": 550.6183815679998,
      "periodStart": "2026-09-04T00:00:00Z",
      "periodEnd": "2026-10-04T18:51:00Z",
      "windowExplanation": "Full preceding month includes the entire current monthly cycle irrespective of billing day",
      "allowanceGbSeconds": 400000,
      "reservedTrialGbSeconds": 20000,
      "sufficient": true
    },
    {
      "name": "existing-paid-capability",
      "at": "2026-10-04T18:49:16.064387+00:00",
      "usageModel": "standard",
      "artifactsNamespaceGetStatus": 200,
      "containersEnabled": true,
      "r2Enabled": true,
      "accessMaxApps": 500,
      "observedApps": 4,
      "newSubscriptionOrSeat": false,
      "evidence": "Existing standard Workers and successful Artifacts API; official pricing limits Artifacts to Workers Paid"
    },
    {
      "name": "preflight-configuration-attempt",
      "at": "2026-10-04T18:49:54.579954+00:00",
      "keys": [
        "HOSTED_CREATION_ENABLED",
        "HOSTED_ACCEPTANCE_PREFLIGHT"
      ],
      "baselineVersion": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "operation": "one settings PATCH"
    },
    {
      "name": "preflight-configuration-response",
      "at": "2026-10-04T18:49:56.052808+00:00",
      "status": 400,
      "success": false,
      "errors": [
        {
          "code": 10214,
          "message": "Script edit failed. You attempted to deploy the latest version with modified settings, but the latest version isn't currently deployed. Either upload a new version to edit the version settings, or use the script-level settings API (/workers/scripts/{script_name}/script-settings) to modify the \"logpush\" and \"tail_consumers\" settings."
        }
      ],
      "result_info": null
    },
    {
      "name": "preflight-compiled-upload-attempt",
      "at": "2026-10-04T18:52:50.155297+00:00",
      "codeEtag": "2a236e584da3f8fd6caef8118b6fdbb06eae5a0468b2c4607615fbd0c16c4404",
      "moduleSha256": "9f5969e93d9dd516da971fd4f720432d6b94d9c9c64697f884bf1e30ef4a3f00",
      "existingBindingsVersion": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "keepExistingAssets": true,
      "newVariables": [
        "HOSTED_CREATION_ENABLED",
        "HOSTED_ACCEPTANCE_PREFLIGHT"
      ],
      "reason": "Settings endpoint cannot edit an older deployed version; supported same-byte upload"
    },
    {
      "name": "image-target-absence",
      "at": "2026-10-04T18:53:23.501715+00:00",
      "status": 200,
      "complete": true,
      "repositories": {},
      "targetPresent": false
    },
    {
      "name": "compiled-upload-readback",
      "at": "2026-10-04T18:53:38.367018+00:00",
      "path": "/workers/scripts/wongstack-cloud-staging/deployments",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 10,
        "count": 10,
        "total_count": 259,
        "total_pages": 26
      },
      "latest": {
        "id": "0aef7f42-a347-4891-9d77-db20ba48b588",
        "source": "wrangler",
        "strategy": "percentage",
        "annotations": {
          "workers/triggered_by": "deployment"
        },
        "versions": [
          {
            "version_id": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
            "percentage": 100
          }
        ],
        "created_on": "2026-10-04T17:56:57.582445Z"
      }
    },
    {
      "name": "compiled-upload-readback",
      "at": "2026-10-04T18:53:39.196614+00:00",
      "path": "/workers/scripts/wongstack-cloud-staging/settings",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "newVars": [],
      "secretNames": [
        "DATA_KEY",
        "GITHUB_CLIENT_SECRET",
        "HETZNER_API_TOKEN",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET"
      ]
    },
    {
      "name": "preflight-upload-version-absence",
      "at": "2026-10-04T18:54:45.342697+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 5,
        "count": 5,
        "total_count": 521
      },
      "latestVersion": "7d76671f-988d-4b26-8574-7d7d28743a49",
      "noNewVersion": true
    },
    {
      "name": "preflight-version-upload-attempt",
      "at": "2026-10-04T18:55:34.000936+00:00",
      "sameCompiledCode": true,
      "priorAttemptsNoNewVersionOrBindings": true,
      "correction": "Official version upload, JSON file metadata, concrete existing nonsecret bindings; secret inheritance only",
      "operation": "one version POST"
    },
    {
      "name": "operator-http-response",
      "at": "2026-10-04T18:55:36.253079+00:00",
      "status": 400,
      "success": false,
      "errors": [
        {
          "code": 10057,
          "message": "inherit binding 'DATA_KEY' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'GITHUB_CLIENT_SECRET' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'HETZNER_API_TOKEN' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'STRIPE_SECRET_KEY' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'STRIPE_WEBHOOK_SECRET' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        }
      ],
      "result_info": null
    },
    {
      "name": "preflight-version-upload-response",
      "at": "2026-10-04T18:55:36.253882+00:00",
      "status": 400,
      "success": false,
      "errors": [
        {
          "code": 10057,
          "message": "inherit binding 'DATA_KEY' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'GITHUB_CLIENT_SECRET' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'HETZNER_API_TOKEN' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'STRIPE_SECRET_KEY' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        },
        {
          "code": 10057,
          "message": "inherit binding 'STRIPE_WEBHOOK_SECRET' is invalid: 'version_id' value '838648ff-8449-4c41-afd7-6cdbdc5e3a38' is invalid, only the literal 'latest' is supported by this API"
        }
      ],
      "result_info": null,
      "versionId": null
    },
    {
      "name": "preflight-corrected-inherit-upload-attempt",
      "at": "2026-10-04T18:56:36.089033+00:00",
      "sameCompiledCode": true,
      "latestVersionBindingsMatchBaseline": true,
      "correction": "Provider accepts latest only despite documentation permitting version IDs; earlier400 has no side effect",
      "inheritedSecretsOnly": true
    },
    {
      "name": "operator-http-response",
      "at": "2026-10-04T18:56:39.103242+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "preflight-corrected-version-response",
      "at": "2026-10-04T18:56:39.104291+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "versionId": "ee4058f4-47ab-4d4e-a9e8-e685b26e5327"
    },
    {
      "name": "preflight-deployment-attempt",
      "at": "2026-10-04T18:56:39.826902+00:00",
      "versionId": "ee4058f4-47ab-4d4e-a9e8-e685b26e5327",
      "codeExact": true
    },
    {
      "name": "preflight-deployment-response",
      "at": "2026-10-04T18:56:40.949585+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "result": {
        "id": "719af664-54eb-46c7-afa7-58cbf9eb3978"
      }
    },
    {
      "name": "preflight-configuration-readback",
      "at": "2026-10-04T18:56:41.688885+00:00",
      "exact": true,
      "creationDisabled": true,
      "existingSecretsPreserved": true
    },
    {
      "name": "preflight-workflow-attempt",
      "at": "2026-10-04T18:56:41.689300+00:00",
      "workflowName": "wongstack-provision-staging",
      "instanceId": "ha-83ec40bf-preflight",
      "mode": "GET-only"
    },
    {
      "name": "preflight-workflow-response",
      "at": "2026-10-04T18:56:42.712303+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "result": {
        "id": "ha-83ec40bf-preflight",
        "workflow_id": "9f25d4de-fbd6-435d-aa7a-8da92469ce34",
        "version_id": "d96ee3d7-3715-4164-bc6d-78891042f701",
        "status": "queued"
      }
    },
    {
      "name": "preflight-workflow-readback",
      "at": "2026-10-04T18:57:09.271857+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "result": {
        "params": {
          "mode": "hosted-preflight",
          "vmId": "83ec40bf-8873-4b75-a1b5-49151f2b1b8d",
          "ownerId": "5c5eca98-d495-45d3-9f7a-4da7b9d1b17a",
          "sourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
          "runId": "ha-83ec40bf",
          "authorityDigest": "275aee51f5ec60eb26677972c4a77bde4c90aa80a1eb75ade9731a8c5c90fb3d"
        },
        "trigger": {
          "source": "api"
        },
        "versionId": "d96ee3d7-3715-4164-bc6d-78891042f701",
        "queued": "2026-10-04T18:56:42.617Z",
        "start": "2026-10-04T18:56:46.478Z",
        "end": "2026-10-04T18:56:47.684Z",
        "success": true,
        "error": null,
        "output": {
          "runId": "ha-83ec40bf",
          "authorityDigest": "275aee51f5ec60eb26677972c4a77bde4c90aa80a1eb75ade9731a8c5c90fb3d",
          "ownerId": "5c5eca98-d495-45d3-9f7a-4da7b9d1b17a",
          "workspaceId": "83ec40bf-8873-4b75-a1b5-49151f2b1b8d",
          "sourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
          "firewallId": 11682249,
          "serverType": "cpx22",
          "location": "nbg1",
          "currency": "USD",
          "vatRate": "0.000000",
          "serverHourly": {
            "net": "0.0368000000",
            "gross": "0.0368000000000000"
          },
          "ipv4Hourly": {
            "net": "0.0010000000",
            "gross": "0.0010000000000000"
          }
        },
        "rollback": null,
        "status": "complete",
        "step_count": 1,
        "steps": [
          {
            "name": "read-only-acceptance-quote-1",
            "start": "2026-10-04T18:56:46.509Z",
            "end": "2026-10-04T18:56:47.651Z",
            "attempts": [
              {
                "start": "2026-10-04T18:56:46.509Z",
                "end": "2026-10-04T18:56:47.651Z",
                "success": true,
                "error": null
              }
            ],
            "config": {
              "retries": {
                "limit": 0,
                "delay": 1,
                "backoff": "exponential"
              },
              "timeout": 60000
            },
            "output": "{\"firewallId\":11682249,\"serverType\":\"cpx22\",\"location\":\"nbg1\",\"currency\":\"USD\",\"vatRate\":\"0.000000\",\"serverHourly\":{\"net\":\"0.0368000000\",\"gross\":\"0.0368000000000000\"},\"ipv4Hourly\":{\"net\":\"0.0010000000\",\"gross\":\"0.0010000000000000\"}}",
            "success": true,
            "type": "step"
          }
        ]
      }
    },
    {
      "name": "temporary-image-secret-attempt",
      "at": "2026-10-04T18:58:15.834282+00:00",
      "repository": "matthewwong525/wongstack-cloud",
      "secretName": "HOSTED_ACCEPTANCE_IMAGE_PUBLICATION_TOKEN",
      "previouslyAbsent": true
    },
    {
      "name": "temporary-image-secret-installed",
      "at": "2026-10-04T18:58:16.985741+00:00",
      "repository": "matthewwong525/wongstack-cloud",
      "secretName": "HOSTED_ACCEPTANCE_IMAGE_PUBLICATION_TOKEN",
      "valueNotInEvidence": true
    },
    {
      "name": "image-publication-dispatch-attempt",
      "at": "2026-10-04T18:58:16.986222+00:00",
      "repository": "matthewwong525/wongstack-cloud",
      "workflow": "hosted-runner.yml",
      "ref": "main",
      "headSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
      "authoritySha256": "1e6278ad5cb5e07fa55a1e81870eefd013e800b189b0fa7c92d36d183763742b",
      "authority": {
        "schemaVersion": 1,
        "runId": "ha-83ec40bf",
        "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
        "tag": "ha-83ec40bf-runner",
        "sourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
        "approvalDigest": "275aee51f5ec60eb26677972c4a77bde4c90aa80a1eb75ade9731a8c5c90fb3d",
        "cloudHead": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
        "ciRunId": 37222779808,
        "artifactId": 11311021774,
        "artifactDigest": "sha256:5c8bac31bf9b5790c1c70867de4f34857fe75ba4d760f9c00f92a260fad0156c",
        "imageId": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
        "archiveSha256": "b125822b7a344520715698cc8b93b5295a5de7c1456b1a6e5db6a91ee9c6ec93",
        "approvedAt": "2026-10-04T18:47:19+00:00",
        "expiresAt": "2026-10-04T20:47:19+00:00"
      },
      "automaticRetry": false
    },
    {
      "name": "image-publication-dispatch-response",
      "at": "2026-10-04T18:58:18.930427+00:00",
      "accepted": true,
      "dispatchedOnce": true
    },
    {
      "name": "conditional-cost-admission",
      "at": "2026-10-04T18:58:18.931089+00:00",
      "vmAndIpGrossTwoHoursUsd": 0.0756,
      "quotedFirewallId": 11682249,
      "serverType": "cpx22",
      "location": "nbg1",
      "conservativeEnvelopeUsd": 6.847,
      "registryIncludedInR2Reserve": true,
      "currentArtifactsBillingStarts": "2026-10-14",
      "existingPaidCapabilityAndDurationHeadroom": true,
      "limitUsd": 10,
      "admissionLimitUsd": 8,
      "newRecurringPurchase": false
    },
    {
      "name": "image-publication-run-correlated",
      "at": "2026-10-04T19:00:38.438530+00:00",
      "runId": 37226460966,
      "headSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
      "event": "workflow_dispatch",
      "attempt": 1,
      "url": "https://github.com/matthewwong525/wongstack-cloud/actions/runs/37226460966",
      "priorDispatchAccepted": true
    },
    {
      "name": "starter-absence",
      "at": "2026-10-04T19:00:39.429568+00:00",
      "status": 404,
      "success": false,
      "errors": [
        {
          "code": 10200,
          "message": "Repository not found"
        }
      ],
      "result_info": null
    },
    {
      "name": "image-publication-job-complete",
      "at": "2026-10-04T19:03:47.552135+00:00",
      "attempt": 1,
      "conclusion": "success",
      "event": "workflow_dispatch",
      "headSha": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
      "status": "completed"
    },
    {
      "name": "temporary-image-secret-removal-attempt",
      "at": "2026-10-04T19:03:47.552839+00:00",
      "repository": "matthewwong525/wongstack-cloud",
      "secretName": "HOSTED_ACCEPTANCE_IMAGE_PUBLICATION_TOKEN"
    },
    {
      "name": "temporary-image-secret-absence",
      "at": "2026-10-04T19:03:48.369865+00:00",
      "repository": "matthewwong525/wongstack-cloud",
      "absent": true,
      "existingSecretsPreserved": true
    },
    {
      "name": "image-publication-output-artifact",
      "at": "2026-10-04T19:04:07.703981+00:00",
      "artifactId": 11311429542,
      "digest": "sha256:0c7e4a84a2bcf1497b1b906bdb120d80f6f237b9d39543f310248f5a2e7948c3",
      "archiveVerified": true,
      "imageUris": [
        "registry.cloudflare.com/040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner]",
        "registry.cloudflare.com/040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner"
      ],
      "reportedDigests": [
        "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654"
      ]
    },
    {
      "name": "image-registry-readback",
      "at": "2026-10-04T19:06:09.598195+00:00",
      "registry": "registry.cloudflare.com",
      "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
      "repository": "ha-83ec40bf-runner",
      "tag": "latest",
      "manifestDigest": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
      "imageConfigDigest": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
      "sourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
      "cloudHead": "8de0f017df64f1ff62507954e132b6bb981fa7a1",
      "compressedLayerBytes": 636277685,
      "status": 200,
      "manifestAndConfigHashVerified": true,
      "ciImageMatches": true
    },
    {
      "name": "starter-git-delivery-prepared",
      "at": "2026-10-04T19:08:35.742621+00:00",
      "gitHead": "48cc56daf2e702a2989ca6ec53240673223578eb",
      "gitTree": "602baff4e0b8f468cc1edf318eb7c851806ebec1",
      "preparedEntries": 245,
      "testedTreeSha256": "07cce5cdacf4fe211b39f0bc55529c9e54374667c6da45ce23328b7be73c6f72",
      "newLocalBuild": false,
      "delivery": "ordinary read-only Git HTTP transport for supported read-only Artifacts import",
      "receivePackDisabled": true,
      "publicTemplateFilesOnly": true
    },
    {
      "name": "starter-read-only-delivery-available",
      "at": "2026-10-04T19:10:35.548165+00:00",
      "transport": "temporary ordinary Git HTTPS import source",
      "testedHead": "48cc56daf2e702a2989ca6ec53240673223578eb",
      "clientReceivePackDisabled": true,
      "deliveryNoCredentials": true
    },
    {
      "name": "starter-namespace-create-attempt",
      "at": "2026-10-04T19:13:57.547172+00:00",
      "namespace": "ha-83ec40bf",
      "expectedAbsent": true
    },
    {
      "name": "starter-namespace-create-response",
      "at": "2026-10-04T19:13:59.040530+00:00",
      "status": 201,
      "success": true,
      "errors": [],
      "result_info": null,
      "result": {
        "namespace": "ha-83ec40bf",
        "jurisdiction": "unrestricted",
        "repo_count": 0,
        "created_at": "2026-10-04T19:13:57.602Z",
        "updated_at": "2026-10-04T19:13:57.915Z"
      }
    },
    {
      "name": "starter-read-only-import-attempt",
      "at": "2026-10-04T19:13:59.041091+00:00",
      "namespace": "ha-83ec40bf",
      "repoName": "starter",
      "readOnly": true,
      "gitHead": "48cc56daf2e702a2989ca6ec53240673223578eb",
      "gitTree": "602baff4e0b8f468cc1edf318eb7c851806ebec1",
      "delivery": "temporary standard Git HTTPS endpoint; same tested public input",
      "automaticRetry": false
    },
    {
      "name": "starter-read-only-import-response",
      "at": "2026-10-04T19:13:59.336785+00:00",
      "status": 400,
      "success": false,
      "errors": [
        {
          "code": 10104,
          "message": "url must be an HTTPS git remote URL (e.g. https://github.com/owner/repo)"
        }
      ],
      "result_info": null,
      "result": {
        "id": null,
        "name": null,
        "remote": null,
        "default_branch": null,
        "objects": null
      }
    },
    {
      "name": "starter-corrected-import-attempt",
      "at": "2026-10-04T19:16:28.156432+00:00",
      "namespace": "ha-83ec40bf",
      "repoName": "starter",
      "readOnly": true,
      "gitHead": "48cc56daf2e702a2989ca6ec53240673223578eb",
      "priorImportKnownRefused": 400,
      "correctedTransport": "Normal two-component owner/repository Git URL; same tested head and content",
      "automaticRetry": false
    },
    {
      "name": "starter-corrected-import-response",
      "at": "2026-10-04T19:16:31.572617+00:00",
      "status": 201,
      "success": true,
      "errors": [],
      "result_info": null,
      "result": {
        "id": "8l4hn95gddn0bbl6",
        "name": "starter",
        "remote": "https://040f88e2bf4f25fb0b91b7cb24f3d442.artifacts.cloudflare.net/git/ha-83ec40bf/starter.git",
        "default_branch": "main",
        "objects": null
      }
    },
    {
      "name": "starter-initial-token-returned",
      "at": "2026-10-04T19:16:31.573632+00:00",
      "providerExpiresAt": "2026-10-05T19:16:30+00:00",
      "ttlSecondsAtReturn": 86399,
      "plaintextPersisted": false,
      "tokenUse": "none; revoke immediately",
      "withinOneHourProviderTtl": false
    },
    {
      "name": "starter-initial-grant-correlated",
      "at": "2026-10-04T19:16:31.724376+00:00",
      "tokenId": "mkzpe3i0mvncl0ly",
      "scope": "write",
      "state": "active",
      "expiresAt": "2026-10-05T19:16:30.351Z",
      "repoId": "8l4hn95gddn0bbl6",
      "repoName": "starter"
    },
    {
      "name": "starter-initial-grant-revoke-attempt",
      "at": "2026-10-04T19:16:31.724983+00:00",
      "tokenId": "mkzpe3i0mvncl0ly",
      "reason": "No Git write token is needed for read-only import; revoke original automatic grant immediately"
    },
    {
      "name": "starter-initial-grant-revoke-response",
      "at": "2026-10-04T19:16:31.928606+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "tokenId": "mkzpe3i0mvncl0ly"
    },
    {
      "name": "starter-active-grant-absence",
      "at": "2026-10-04T19:16:32.052012+00:00",
      "complete": true,
      "activeCount": 0,
      "tokenId": "mkzpe3i0mvncl0ly",
      "providerInitialTtlSeconds": 86399,
      "actualActiveLifetimeSecondsMax": 2
    },
    {
      "name": "starter-revoked-credential-denied",
      "at": "2026-10-04T19:16:32.144565+00:00",
      "status": 403,
      "denied": true
    },
    {
      "name": "starter-repository-readback",
      "at": "2026-10-04T19:22:35.904109+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "repo": {
        "id": "8l4hn95gddn0bbl6",
        "name": "starter",
        "read_only": true,
        "default_branch": "main",
        "remote": "https://040f88e2bf4f25fb0b91b7cb24f3d442.artifacts.cloudflare.net/git/ha-83ec40bf/starter.git",
        "created_at": "2026-10-04T19:16:28.246Z"
      }
    },
    {
      "name": "starter-main-readback",
      "at": "2026-10-04T19:22:36.101011+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "commits": [
        {
          "hash": "48cc56daf2e702a2989ca6ec53240673223578eb",
          "parents": [],
          "tree": null
        }
      ]
    },
    {
      "name": "starter-source-install-readback",
      "at": "2026-10-04T19:22:36.197434+00:00",
      "status": 200,
      "sourceCommit": "c22d448bfd8204994ba92f65b5f722762ce6f052"
    },
    {
      "name": "starter-delivery-stopped",
      "at": "2026-10-04T19:22:36.198114+00:00",
      "loopbackPortAbsent": true,
      "gitGrantRevoked": true,
      "tunnelSessionStopped": true
    },
    {
      "name": "starter-complete-provider-tree-verified",
      "at": "2026-10-04T19:25:34.746560+00:00",
      "repoId": "8l4hn95gddn0bbl6",
      "readOnly": true,
      "main": "48cc56daf2e702a2989ca6ec53240673223578eb",
      "gitTree": "602baff4e0b8f468cc1edf318eb7c851806ebec1",
      "treeSha256": "07cce5cdacf4fe211b39f0bc55529c9e54374667c6da45ce23328b7be73c6f72",
      "verifiedFileCount": 245,
      "verifiedSubtreeCount": 69,
      "complete": true,
      "sourceSha": "c22d448bfd8204994ba92f65b5f722762ce6f052",
      "newGitGrants": 0
    },
    {
      "name": "owner-ai-plan-selected",
      "at": "2026-10-04T19:25:39.517825+00:00",
      "userResponse": "Existing ChatGPT/Codex plan",
      "includedQuotaOnly": true,
      "signInVerified": false,
      "extraPurchaseAuthorized": false
    },
    {
      "name": "preflight-instance-delete-attempt",
      "at": "2026-10-04T19:25:58.672548+00:00",
      "workflow": "wongstack-provision-staging",
      "instance": "ha-83ec40bf-preflight",
      "completed": true,
      "existingWorkflowPreserved": true
    },
    {
      "name": "preflight-instance-delete-response",
      "at": "2026-10-04T19:25:59.949406+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "deleted": [
        "ha-83ec40bf-preflight"
      ],
      "errorsCount": 0
    },
    {
      "name": "preflight-instance-absence",
      "at": "2026-10-04T19:26:00.308832+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null,
      "instance": "ha-83ec40bf-preflight",
      "canonicalAbsent": false
    },
    {
      "name": "preflight-delete-same-instance-readback",
      "at": "2026-10-04T19:26:57.874905+00:00",
      "status": 404,
      "success": false,
      "errors": [
        {
          "code": 10400,
          "message": "workflows.api.error.instance.not_found"
        }
      ],
      "result_info": null,
      "statusValue": null,
      "id": null,
      "keys": []
    },
    {
      "name": "preflight-instance-canonical-absence",
      "at": "2026-10-04T19:29:01.587785+00:00",
      "status": 404,
      "code": 10400,
      "instance": "ha-83ec40bf-preflight",
      "existingWorkflowPreserved": true
    },
    {
      "name": "preflight-preserved-settings-audit",
      "at": "2026-10-04T19:30:19.838454+00:00",
      "differentExistingSettingKeys": [
        "annotations"
      ],
      "currentValues": {
        "annotations": {
          "workers/commit_sha": "e633bbcc568d8cd9a8cba5e765d1f01d018911e2",
          "workers/message": "ha-83ec40bf exact approved compiled code: GET-only preflight",
          "workers/triggered_by": "version_upload"
        }
      },
      "baselineValues": {
        "annotations": {
          "workers/alias": "cloudflare-hosted-acceptance",
          "workers/triggered_by": "version_upload"
        }
      }
    },
    {
      "name": "existing-access-seat-inventory",
      "at": "2026-10-04T19:31:59.272011+00:00",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 100,
        "count": 5,
        "total_count": 5,
        "total_pages": 1
      },
      "userCount": 5,
      "accessSeats": 5,
      "gatewaySeats": 0,
      "ownerAlreadyPresent": false,
      "capacityReadbackComplete": false
    },
    {
      "name": "live-dependent-admission-stopped",
      "at": "2026-10-04T19:37:36.729171+00:00",
      "reason": "Existing Hetzner credential not available on the operator host; private key handover expired without a saved key, so exact server and primaryIPv4 deletion/absence cannot be established before provisioning",
      "handoverCompletion": "6570db5316d391db2f2e98f4d667192c",
      "handoverResult": "timeout",
      "newVmRows": 0,
      "newServers": 0,
      "newPrimaryIpv4": 0,
      "newProviderTokensRequested": false,
      "ownerAiPlan": "Existing ChatGPT/Codex plan",
      "aiSignInVerified": false,
      "generalCreationEnabled": false,
      "fullAcceptanceComplete": false,
      "nextAction": "Owned teardown inside original authority window"
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:37:38.107665+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/ws-d3fd2bfec810475cd45de5bf97eced82/settings",
      "method": "GET",
      "status": 404,
      "success": false,
      "errors": [
        {
          "code": 10007,
          "message": "This Worker does not exist on your account."
        }
      ],
      "result_info": null
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:37:38.763492+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/deployments",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 10,
        "count": 10,
        "total_count": 260,
        "total_pages": 26
      }
    },
    {
      "name": "staging-baseline-restore-attempt",
      "at": "2026-10-04T19:37:38.764161+00:00",
      "versionId": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "currentVersion": "ee4058f4-47ab-4d4e-a9e8-e685b26e5327"
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:37:39.753725+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/deployments",
      "method": "POST",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "staging-baseline-restore-response",
      "at": "2026-10-04T19:37:39.754455+00:00",
      "deploymentId": "c8fed444-8aa5-4b29-b4ae-3a9db7aa01a7",
      "versionId": "838648ff-8449-4c41-afd7-6cdbdc5e3a38"
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:37:40.478271+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/settings",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:39:39.454742+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/deployments",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 10,
        "count": 10,
        "total_count": 261,
        "total_pages": 27
      }
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:39:40.151880+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/versions/838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "staging-baseline-active-version-restored",
      "at": "2026-10-04T19:39:40.152702+00:00",
      "deploymentId": "c8fed444-8aa5-4b29-b4ae-3a9db7aa01a7",
      "versionId": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "allOriginalBindingsMatch": true,
      "compiledEtagMatches": true,
      "activeTemporaryControlsAbsent": true,
      "latestUploadedVersionDiffersFromActive": true,
      "nonservingConfigurationVersionRetained": "ee4058f4-47ab-4d4e-a9e8-e685b26e5327",
      "existingSecretsPreserved": true,
      "productionUntouched": true
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:39:40.792049+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:39:40.945101+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter/tokens?state=active&per_page=100&page=1",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 100,
        "total_pages": 0,
        "count": 0,
        "total_count": 0
      }
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:39.907937+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/deployments",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 10,
        "count": 10,
        "total_count": 261,
        "total_pages": 27
      }
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:40.651786+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/wongstack-cloud-staging/versions/838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "staging-baseline-active-version-restored",
      "at": "2026-10-04T19:40:40.655060+00:00",
      "deploymentId": "c8fed444-8aa5-4b29-b4ae-3a9db7aa01a7",
      "versionId": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
      "allOriginalBindingsMatch": true,
      "compiledEtagMatches": true,
      "activeTemporaryControlsAbsent": true,
      "latestUploadedVersionDiffersFromActive": true,
      "nonservingConfigurationVersionRetained": "ee4058f4-47ab-4d4e-a9e8-e685b26e5327",
      "existingSecretsPreserved": true,
      "productionUntouched": true
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:40.859709+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:40.970132+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter/tokens?state=active&per_page=100&page=1",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 100,
        "total_pages": 0,
        "count": 0,
        "total_count": 0
      }
    },
    {
      "name": "starter-owned-delete-attempt",
      "at": "2026-10-04T19:40:40.971343+00:00",
      "repoId": "8l4hn95gddn0bbl6",
      "namespace": "ha-83ec40bf",
      "repoName": "starter",
      "activeGrants": 0
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:43.334732+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter",
      "method": "DELETE",
      "status": 202,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:43.438825+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter",
      "method": "GET",
      "status": 404,
      "success": false,
      "errors": [
        {
          "code": 10200,
          "message": "Repository not found"
        }
      ],
      "result_info": null
    },
    {
      "name": "starter-canonical-absence",
      "at": "2026-10-04T19:40:43.439568+00:00",
      "status": 404,
      "repoId": "8l4hn95gddn0bbl6",
      "attempts": 1
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:44.055637+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos?limit=200",
      "method": "GET",
      "status": 200,
      "success": true,
      "errors": [],
      "result_info": {
        "page": 1,
        "per_page": 200,
        "total_pages": 0,
        "count": 0,
        "total_count": 0
      }
    },
    {
      "name": "namespace-retained-empty",
      "at": "2026-10-04T19:40:44.058934+00:00",
      "namespace": "ha-83ec40bf",
      "complete": true,
      "repoCount": 0,
      "reason": "No documented namespace-delete route"
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:40:45.056296+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/containers/registries/registry.cloudflare.com/credentials",
      "method": "POST",
      "status": 201,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "registry-cleanup-response-handling-correction",
      "at": "2026-10-04T19:42:54.588515+00:00",
      "priorCredentialResponseStatus": 201,
      "priorCredentialPlaintextPersisted": false,
      "priorProtocolCredentialUnused": true,
      "priorProtocolCredentialConfiguredTtlMinutes": 5,
      "correction": "Handle ordinary201 credential response; same finite parent authority and exact image, no new account API token or repository grant"
    },
    {
      "name": "cleanup-http-response",
      "at": "2026-10-04T19:42:54.933014+00:00",
      "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/containers/registries/registry.cloudflare.com/credentials",
      "method": "POST",
      "status": 201,
      "success": true,
      "errors": [],
      "result_info": null
    },
    {
      "name": "registry-cleanup-protocol-credential",
      "at": "2026-10-04T19:44:09.129389+00:00",
      "status": 201,
      "configuredTtlMinutes": 5,
      "expiresAtEpochSeconds": 1791143349,
      "sameExecutionToken": true,
      "plaintextPersisted": false
    },
    {
      "name": "registry-exact-owned-image-delete-attempt",
      "at": "2026-10-04T19:44:28.296594+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "tags": [
        "latest",
        "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654"
      ],
      "everyTagMatchesApprovedManifest": true,
      "manifestDigest": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
      "ownedBlobCount": 22,
      "completeCatalogContainsOnlyOwnedImage": true
    },
    {
      "name": "registry-owned-tag-delete-response",
      "at": "2026-10-04T19:44:30.483260+00:00",
      "status": 204,
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "tag": "latest"
    },
    {
      "name": "final-canonical-target-absences",
      "at": "2026-10-04T19:45:16.001606+00:00",
      "targets": [
        {
          "target": "worker",
          "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workers/scripts/ws-d3fd2bfec810475cd45de5bf97eced82/settings",
          "status": 404,
          "canonicalAbsent": true,
          "codes": [
            10007
          ]
        },
        {
          "target": "sdk-workflow",
          "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workflows/ha-83ec40bf-ci",
          "status": 404,
          "canonicalAbsent": true,
          "codes": [
            10200
          ]
        },
        {
          "target": "bucket",
          "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/r2/buckets/ha-83ec40bf-backup",
          "status": 404,
          "canonicalAbsent": true,
          "codes": [
            10006
          ]
        },
        {
          "target": "starter",
          "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/starter",
          "status": 404,
          "canonicalAbsent": true,
          "codes": [
            10200
          ]
        },
        {
          "target": "customer-repo",
          "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/artifacts/namespaces/ha-83ec40bf/repos/ws-d3fd2bfec810475cd45de5bf97eced82",
          "status": 404,
          "canonicalAbsent": true,
          "codes": [
            10200
          ]
        },
        {
          "target": "preflight-instance",
          "path": "/accounts/040f88e2bf4f25fb0b91b7cb24f3d442/workflows/wongstack-provision-staging/instances/ha-83ec40bf-preflight",
          "status": 404,
          "canonicalAbsent": true,
          "codes": [
            10400
          ]
        }
      ],
      "complete": true
    },
    {
      "name": "final-existing-resource-inventory",
      "at": "2026-10-04T19:45:16.768070+00:00",
      "resource": "access-apps",
      "count": 4,
      "complete": true,
      "matchesInitialCount": true,
      "ownedNewResourceCount": 0
    },
    {
      "name": "final-existing-resource-inventory",
      "at": "2026-10-04T19:45:17.525349+00:00",
      "resource": "observer-grants",
      "count": 7,
      "complete": true,
      "matchesInitialCount": true,
      "ownedNewResourceCount": 0
    },
    {
      "name": "final-existing-resource-inventory",
      "at": "2026-10-04T19:45:17.730002+00:00",
      "resource": "workflows",
      "count": 3,
      "complete": true,
      "matchesInitialCount": true,
      "ownedNewResourceCount": 0
    },
    {
      "name": "final-existing-resource-inventory",
      "at": "2026-10-04T19:45:17.924484+00:00",
      "resource": "container-apps",
      "count": 0,
      "complete": true,
      "matchesInitialCount": true,
      "ownedNewResourceCount": 0
    },
    {
      "name": "owned-vm-row-never-created",
      "at": "2026-10-04T19:45:18.346084+00:00",
      "workspaceId": "83ec40bf-8873-4b75-a1b5-49151f2b1b8d",
      "rows": 0,
      "serverCreateCalls": 0,
      "primaryIpv4CreateCalls": 0
    },
    {
      "name": "owner-subscription-remains-canceled",
      "at": "2026-10-04T19:45:18.464392+00:00",
      "plan": "cheap",
      "status": "canceled",
      "updated_at": 1791055177598
    },
    {
      "name": "registry-cleanup-protocol-credential",
      "at": "2026-10-04T19:46:07.968506+00:00",
      "status": 201,
      "configuredTtlMinutes": 5,
      "expiresAtEpochSeconds": 1791143467,
      "sameExecutionToken": true,
      "plaintextPersisted": false
    },
    {
      "name": "registry-reconciliation-protocol-auth",
      "at": "2026-10-04T19:47:19.170584+00:00",
      "status": 201,
      "expiresAtEpochSeconds": 1791143539,
      "plaintextPersisted": false,
      "sameFiniteAccountAuthority": true
    },
    {
      "name": "registry-same-operation-readback",
      "at": "2026-10-04T19:47:25.469160+00:00",
      "command": "catalog",
      "status": 200,
      "headerKeys": [
        "Date",
        "Content-Type",
        "Content-Length",
        "Connection",
        "Vary",
        "Docker-Distribution-Api-Version",
        "Server-Timing",
        "Server",
        "CF-RAY"
      ],
      "cacheStatus": null,
      "age": null,
      "catalog": {},
      "paginationLinkPresent": false
    },
    {
      "name": "registry-same-operation-readback",
      "at": "2026-10-04T19:47:25.518825+00:00",
      "command": "latest",
      "status": 200,
      "headerKeys": [
        "Date",
        "Content-Type",
        "Content-Length",
        "Connection",
        "CF-Cache-Status",
        "Accept-Ranges",
        "Age",
        "Cache-Control",
        "Vary",
        "Docker-Content-Digest",
        "Docker-Distribution-Api-Version",
        "Server-Timing",
        "Server",
        "CF-RAY"
      ],
      "cacheStatus": "HIT",
      "age": "2476",
      "manifestDigest": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
      "ownedBlobCount": 22
    },
    {
      "name": "registry-same-operation-readback",
      "at": "2026-10-04T19:47:25.791932+00:00",
      "command": "head-latest",
      "status": 404,
      "headerKeys": [
        "Date",
        "Content-Type",
        "Connection",
        "Vary",
        "Docker-Distribution-Api-Version",
        "Server-Timing",
        "Server",
        "CF-RAY"
      ],
      "cacheStatus": null,
      "age": null
    },
    {
      "name": "registry-same-operation-readback",
      "at": "2026-10-04T19:47:25.832798+00:00",
      "command": "digest",
      "status": 200,
      "headerKeys": [
        "Date",
        "Content-Type",
        "Content-Length",
        "Connection",
        "CF-Cache-Status",
        "Accept-Ranges",
        "Age",
        "Cache-Control",
        "Vary",
        "Docker-Content-Digest",
        "Docker-Distribution-Api-Version",
        "Server-Timing",
        "Server",
        "CF-RAY"
      ],
      "cacheStatus": "HIT",
      "age": "177",
      "manifestDigest": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
      "ownedBlobCount": 22
    },
    {
      "name": "registry-same-operation-readback",
      "at": "2026-10-04T19:48:06.392281+00:00",
      "command": "garbage-collect-owned-image",
      "status": 200
    },
    {
      "name": "registry-same-operation-readback",
      "at": "2026-10-04T19:48:14.783531+00:00",
      "command": "owned-blobs",
      "statuses": [
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200
      ],
      "allAbsent": false,
      "ownedBlobCount": 22
    },
    {
      "name": "registry-anonymous-cached-content-denial",
      "at": "2026-10-04T19:48:48.239109+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "status": 401,
      "denied": true
    },
    {
      "name": "last-registry-read-protocol-authority",
      "at": "2026-10-04T19:50:25.999705+00:00",
      "expiresAtEpochSeconds": 1791143725,
      "permission": "pull",
      "plaintextPersisted": false,
      "sameAccountExecutionToken": true
    },
    {
      "name": "registry-cache-independent-manifest-readbacks",
      "at": "2026-10-04T19:50:26.199326+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "readbacks": [
        {
          "ref": "latest",
          "status": 200,
          "cacheStatus": "HIT",
          "age": "2657"
        },
        {
          "ref": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
          "status": 200,
          "cacheStatus": "HIT",
          "age": "357"
        }
      ],
      "queryPurpose": "Fresh cache key for read-only same-path object readback; no provider mutation"
    },
    {
      "name": "registry-cache-independent-owned-storage-readbacks",
      "at": "2026-10-04T19:50:28.597144+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "manifestDigest": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
      "ownedBlobCount": 22,
      "readbacks": [
        {
          "digest": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:97e1ee089ace823bfcc55ca9c81fa3be34d7aaf8fed7ba91c29464bdfddb9973",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:ca958c61974bbaa116032878000f35f9067e3db7f5dd00c5570247e0a23cfcf6",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:5dd715e0b6fa049eaf51987971e00250e3778f49168bf768852aa8083211bd0b",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:619f7d62429d2d8bba0ab4efab4d74893b61a4e5636ed1566e8b938ed7099ca3",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:a0d1f78f4139ed59e6d79a2345c4ddb1f81a983b17eb7135ba63487883c312d8",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:53e2addc7b947177db41a7988c7661ca2d4f05c24e5768ea5b5ccc670c038bea",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:bbed857b0e57cfaf6ce35192e9aaf580f66d5647aaed3175430dc41e3279640e",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:d383e5fd6cd16df51eaebb48b77bcc2f1ce3348be75f9acb22a6290648b05da2",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:bd0fedd5a2baf2d374f750262fdb4f4a44ada750581a488b13d6a943a90a5e11",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:865152834532d89d8b732404d068c09bfc08ce24003183a8780a54c93fbe63a9",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:cf5640f11e856c9f87d7c5acc5d454423cfc77ba8c709e4f63d6282a8deada7e",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:b140cba67037c300f2d1bb40bcc6cd79d4bf09a4e97b7f1d7f97758cf12a0daf",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:2e6424df48986e896f9cbb831ae4a2efc694f3ff3baa4035aa55ce0096c4e383",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:675edc258d39bfc36f11523e7fe016a798ea72c6e48edd13de75b5c26dcd909a",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:68df62ee45b33cc8011e322af5c645c7614b70a9b428752ebde8f77fe7ab40bd",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:486475a32ae1367b53a7e9e2c8e7871816cde91749f00ba6475165255dd5f933",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:cfd1a9d23f9855d773ae339f7a2bd814bae784ef93a3bdbeb048a95a6230ceec",
          "status": 200,
          "cacheStatus": null,
          "age": null
        },
        {
          "digest": "sha256:2574c4611d163d14e2c38a4f505841fc4713bd7ea8d010af91050394e54deb8f",
          "status": 200,
          "cacheStatus": null,
          "age": null
        }
      ],
      "allOwnedBlobsAbsent": false
    },
    {
      "name": "final-blob-get-protocol-authority",
      "at": "2026-10-04T19:53:13.986829+00:00",
      "permission": "pull",
      "expiresAtEpochSeconds": 1791143893,
      "plaintextPersisted": false,
      "sameFiniteParent": true
    },
    {
      "name": "owned-registry-blob-get-absence-readbacks",
      "at": "2026-10-04T19:53:20.626829+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "readbacks": [
        {
          "digest": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
          "status": 206,
          "contentRange": "bytes 0-0/9410",
          "cacheStatus": "HIT"
        },
        {
          "digest": "sha256:97e1ee089ace823bfcc55ca9c81fa3be34d7aaf8fed7ba91c29464bdfddb9973",
          "status": 206,
          "contentRange": "bytes 0-0/30649271",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:ca958c61974bbaa116032878000f35f9067e3db7f5dd00c5570247e0a23cfcf6",
          "status": 206,
          "contentRange": "bytes 0-0/47641781",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:5dd715e0b6fa049eaf51987971e00250e3778f49168bf768852aa8083211bd0b",
          "status": 206,
          "contentRange": "bytes 0-0/491",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:619f7d62429d2d8bba0ab4efab4d74893b61a4e5636ed1566e8b938ed7099ca3",
          "status": 206,
          "contentRange": "bytes 0-0/130",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:a0d1f78f4139ed59e6d79a2345c4ddb1f81a983b17eb7135ba63487883c312d8",
          "status": 206,
          "contentRange": "bytes 0-0/45210148",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:53e2addc7b947177db41a7988c7661ca2d4f05c24e5768ea5b5ccc670c038bea",
          "status": 206,
          "contentRange": "bytes 0-0/2988193",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:bbed857b0e57cfaf6ce35192e9aaf580f66d5647aaed3175430dc41e3279640e",
          "status": 206,
          "contentRange": "bytes 0-0/202",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:d383e5fd6cd16df51eaebb48b77bcc2f1ce3348be75f9acb22a6290648b05da2",
          "status": 206,
          "contentRange": "bytes 0-0/39446592",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:bd0fedd5a2baf2d374f750262fdb4f4a44ada750581a488b13d6a943a90a5e11",
          "status": 206,
          "contentRange": "bytes 0-0/39517385",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
          "status": 206,
          "contentRange": "bytes 0-0/32",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:865152834532d89d8b732404d068c09bfc08ce24003183a8780a54c93fbe63a9",
          "status": 206,
          "contentRange": "bytes 0-0/37179",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:cf5640f11e856c9f87d7c5acc5d454423cfc77ba8c709e4f63d6282a8deada7e",
          "status": 206,
          "contentRange": "bytes 0-0/68882",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:b140cba67037c300f2d1bb40bcc6cd79d4bf09a4e97b7f1d7f97758cf12a0daf",
          "status": 206,
          "contentRange": "bytes 0-0/19560642",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
          "status": 206,
          "contentRange": "bytes 0-0/32",
          "cacheStatus": "HIT"
        },
        {
          "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
          "status": 206,
          "contentRange": "bytes 0-0/32",
          "cacheStatus": "HIT"
        },
        {
          "digest": "sha256:2e6424df48986e896f9cbb831ae4a2efc694f3ff3baa4035aa55ce0096c4e383",
          "status": 206,
          "contentRange": "bytes 0-0/99",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:675edc258d39bfc36f11523e7fe016a798ea72c6e48edd13de75b5c26dcd909a",
          "status": 206,
          "contentRange": "bytes 0-0/60855137",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:68df62ee45b33cc8011e322af5c645c7614b70a9b428752ebde8f77fe7ab40bd",
          "status": 206,
          "contentRange": "bytes 0-0/5047105",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:486475a32ae1367b53a7e9e2c8e7871816cde91749f00ba6475165255dd5f933",
          "status": 206,
          "contentRange": "bytes 0-0/13323",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:cfd1a9d23f9855d773ae339f7a2bd814bae784ef93a3bdbeb048a95a6230ceec",
          "status": 206,
          "contentRange": "bytes 0-0/39508",
          "cacheStatus": "MISS"
        },
        {
          "digest": "sha256:2574c4611d163d14e2c38a4f505841fc4713bd7ea8d010af91050394e54deb8f",
          "status": 206,
          "contentRange": "bytes 0-0/345201521",
          "cacheStatus": "MISS"
        }
      ],
      "allOwnedBlobsAbsent": false,
      "rangeRequested": "bytes=0-0",
      "headCannotEstablishAbsence": true
    },
    {
      "name": "scoped-blob-cleanup-protocol-authority",
      "at": "2026-10-04T19:54:25.574468+00:00",
      "expiresAtEpochSeconds": 1791143965,
      "plaintextPersisted": false,
      "sameFiniteParent": true,
      "purpose": "Exact owned OCI blob deletion only"
    },
    {
      "name": "scoped-owned-blob-delete-response",
      "at": "2026-10-04T19:54:25.669882+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "digest": "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
      "status": 405,
      "errorCodes": [],
      "supportedStandard": "OCI Distribution Spec blob-delete endpoint",
      "automaticRetry": false
    },
    {
      "name": "owned-registry-storage-retained-unconfirmed",
      "at": "2026-10-04T19:54:25.672987+00:00",
      "image": "040f88e2bf4f25fb0b91b7cb24f3d442/ha-83ec40bf-runner",
      "manifestDigest": "sha256:9ac8254e10d043d5cdb3899e62121a76355a64ef84a1ef28da819ac95df8f654",
      "compressedImageBytes": 636277685,
      "ownedBlobCount": 22,
      "digests": [
        "sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a",
        "sha256:97e1ee089ace823bfcc55ca9c81fa3be34d7aaf8fed7ba91c29464bdfddb9973",
        "sha256:ca958c61974bbaa116032878000f35f9067e3db7f5dd00c5570247e0a23cfcf6",
        "sha256:5dd715e0b6fa049eaf51987971e00250e3778f49168bf768852aa8083211bd0b",
        "sha256:619f7d62429d2d8bba0ab4efab4d74893b61a4e5636ed1566e8b938ed7099ca3",
        "sha256:a0d1f78f4139ed59e6d79a2345c4ddb1f81a983b17eb7135ba63487883c312d8",
        "sha256:53e2addc7b947177db41a7988c7661ca2d4f05c24e5768ea5b5ccc670c038bea",
        "sha256:bbed857b0e57cfaf6ce35192e9aaf580f66d5647aaed3175430dc41e3279640e",
        "sha256:d383e5fd6cd16df51eaebb48b77bcc2f1ce3348be75f9acb22a6290648b05da2",
        "sha256:bd0fedd5a2baf2d374f750262fdb4f4a44ada750581a488b13d6a943a90a5e11",
        "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
        "sha256:865152834532d89d8b732404d068c09bfc08ce24003183a8780a54c93fbe63a9",
        "sha256:cf5640f11e856c9f87d7c5acc5d454423cfc77ba8c709e4f63d6282a8deada7e",
        "sha256:b140cba67037c300f2d1bb40bcc6cd79d4bf09a4e97b7f1d7f97758cf12a0daf",
        "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
        "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1",
        "sha256:2e6424df48986e896f9cbb831ae4a2efc694f3ff3baa4035aa55ce0096c4e383",
        "sha256:675edc258d39bfc36f11523e7fe016a798ea72c6e48edd13de75b5c26dcd909a",
        "sha256:68df62ee45b33cc8011e322af5c645c7614b70a9b428752ebde8f77fe7ab40bd",
        "sha256:486475a32ae1367b53a7e9e2c8e7871816cde91749f00ba6475165255dd5f933",
        "sha256:cfd1a9d23f9855d773ae339f7a2bd814bae784ef93a3bdbeb048a95a6230ceec",
        "sha256:2574c4611d163d14e2c38a4f505841fc4713bd7ea8d010af91050394e54deb8f"
      ],
      "lastBlobGetStatuses": [
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206,
        206
      ],
      "standardGcStatus": 200,
      "scopedBlobDeleteStatus": 405,
      "canonicalStorageAbsenceVerified": false,
      "costUsdPerMonthUpperEstimateAtStandardR2Rate": 0.01,
      "protection": "No image tags, container apps, runners or anonymous access; revoke run authority",
      "nextSupportedAction": "Provider confirmation of registry garbage collection/storage removal; no automatic grant or time extension"
    },
    {
      "name": "execution-token-revoked",
      "at": "2026-10-04T19:54:54.523217+00:00",
      "tokenId": "fd6b408cf837422073f64692e2c383a5",
      "status": 200
    },
    {
      "name": "execution-token-canonical-absence",
      "at": "2026-10-04T19:54:54.847948+00:00",
      "tokenId": "fd6b408cf837422073f64692e2c383a5",
      "status": 404
    },
    {
      "name": "revoked-execution-credential-denied",
      "at": "2026-10-04T19:54:55.092723+00:00",
      "tokenId": "fd6b408cf837422073f64692e2c383a5",
      "status": 401
    },
    {
      "name": "execution-token-local-value-removed",
      "at": "2026-10-04T19:54:55.094628+00:00",
      "keyName": "HOSTED_ACCEPTANCE_EXECUTION_TOKEN",
      "primaryIgnoredFile": true,
      "preexistingLinesPreserved": true
    },
    {
      "name": "last-registry-credential-after-parent-revocation",
      "at": "2026-10-04T19:54:55.353357+00:00",
      "status": 200,
      "denied": false,
      "expiresAtEpochSeconds": 1791143725
    },
    {
      "name": "latest-registry-protocol-authority-denial",
      "at": "2026-10-04T19:55:28.021148+00:00",
      "status": 401,
      "denied": true,
      "expiresAtEpochSeconds": 1791143725,
      "observedAfterExpiry": true,
      "earlierProtocolCredentialsHaveEarlierConfiguredExpiries": true
    },
    {
      "name": "final-read-protocol-after-parent-revocation",
      "at": "2026-10-04T19:55:34.127775+00:00",
      "status": 200,
      "denied": false,
      "expiresAtEpochSeconds": 1791143893
    },
    {
      "name": "cleanup-storage-estimate-rounding-correction",
      "at": "2026-10-04T19:57:15.752168+00:00",
      "previousMonthlyEstimateUsd": 0.01,
      "conservativeRoundedMonthlyStorageReserveUsd": 0.015,
      "ownedCompressedLayerBytes": 636277685,
      "billingReceiptAvailable": false
    },
    {
      "name": "final-read-protocol-after-expiry",
      "at": "2026-10-04T19:58:16.028133+00:00",
      "status": 401,
      "denied": true,
      "expiresAtEpochSeconds": 1791143893,
      "earlierSessionsExpireNoLater": true
    }
  ]
}

~~~
<!-- end live-receipts.json -->
<!-- file live-request.md utf8 11241 -->
# One private staging functionality test — final bounded request

**State:** Ready for the user's conditional batch decision. Not approved; no live trial mutation has occurred. Code preparation and ordinary maintenance publication were already authorized. The user's one-VM test exception choice expressly reserved VM creation for this final request.

Approve the single batch below, bound to [live-inputs.json](live-inputs.json), [compatibility.json](compatibility.json), the [ledger](ledger.md), [cost conditions](cost-preflight.md) and [procedure](acceptance-procedure.md). Freeze their approved bytes and digest at the final saved Source checkpoint. The approval stamp supplies the actual UTC start/expiry; it cannot change targets, tested inputs or limits. Store newly returned provider/credential/runtime receipts separately in `live-receipts.json`, retaining the immutable prepared inputs. Unknown future IDs and app SHAs are not prefilled as verified.

## Exact existing service and tested inputs

| Input | Frozen value |
| --- | --- |
| Cloudflare account | `040f88e2bf4f25fb0b91b7cb24f3d442` |
| Service / staging DB | `wongstack-cloud-staging` / `1029a8e7-be64-42c0-bf9a-de49f87a2322` |
| Deployed staging baseline | Deployment `0aef7f42-a347-4891-9d77-db20ba48b588`, version `838648ff-8449-4c41-afd7-6cdbdc5e3a38`, code `e633bbcc568d8cd9a8cba5e765d1f01d018911e2` |
| Published Cloud preparation | Main `8de0f017df64f1ff62507954e132b6bb981fa7a1`; full code tree equals the staged baseline |
| Agent / starter Source | `c22d448bfd8204994ba92f65b5f722762ce6f052`, contract5; global contract4 default unchanged |
| CI input run / artifact | `37222779808` / `11311021774`; artifact SHA256 `5c8bac31bf9b5790c1c70867de4f34857fe75ba4d760f9c00f92a260fad0156c`, expires2026-10-07T18:03:38Z |
| Tested local image | `sha256:fbfe31b59b0d909d76b24b5e003f217572adc978e145cb299ead94fe12ef491a`; Linux/amd64 |
| Exact image archive SHA256 | `b125822b7a344520715698cc8b93b5295a5de7c1456b1a6e5db6a91ee9c6ec93` |
| Exact starter tree / lock | `07cce5cdacf4fe211b39f0bc55529c9e54374667c6da45ce23328b7be73c6f72` / `5803f71f7c12a6fed81fcac8c697fb283a5866c7d69cece1bb75c11a40c0c21a` |
| Existing Access organization | `startuptemplate.cloudflareaccess.com`; no new organization or seat purchase |

The complete manifest supplies recipe, tool/SDK, payload, install-record and entry hashes. CI checked the generated starter through ordinary installation/tests/build. GitHub flattened `.claude`, `.codex` and `CLAUDE.md` during artifact download; restoring those three ordinary aliases reproduced the exact complete245-entry CI tree, including content and modes. No starter build was rerun locally. The CI image ID remains distinct from the registry digest returned later.

## Conditional actions within this one approval

1. Record finite authority and preserve the existing management credential. Issue **at most one** separate account-scoped, expiring execution token with only the necessary groups in the ledger; no token-management, D1, Memory or billing permissions enter it. Store it as the declared `HOSTED_ACCEPTANCE_EXECUTION_TOKEN` in primary ignored `.env`. Read current platform capability/paid status, complete target inventories, supported teardown and fresh billing-window headroom. No new platform/AI plan, trial, subscription, seat or credits may be bought. If any prerequisite is unavailable, stop and revoke only the issued authority.
2. Temporarily configure only the prepared staging GET-only preflight authority and invoke the existing ProvisionWorkflow once to read the unique existing `wongstack-deny-inbound` firewall and current gross CPX22/primaryIPv4 quote for **nbg1**. No firewall/location/type substitution is allowed. Bind its returned ID and currency/tax conversion before any VM create. Continue only if the exact capability, absence/cleanup and complete priced estimate satisfy the limits below; otherwise restore that configuration and stop. This approval covers the conditional next step without a second VM permission question.
3. Publish the exact prepared starter and image only to the new targets below. Image delivery is **one** manual dispatch of the existing Cloud platform-maintenance workflow on the frozen main head, using the exact successful CI artifact/archive/image and pinned Wrangler4.142.0. Supply the token only as the temporary repository secret `HOSTED_ACCEPTANCE_IMAGE_PUBLICATION_TOKEN` in `matthewwong525/wongstack-cloud`, after proving that name absent; remove and read back its absence immediately after success or failure. Do not rebuild, rerun, redispatch or substitute an image after an uncertain response. Read back the actual registry digest and exact starter main/tree before use. The customer path remains SDK-only, with no GitHub workflow or runtime source-fetch dependency.
4. Insert only the one owned **queued** VM row through the existing D1 shape and provision that one VM/IPv4 through the existing workflow with the reviewed Source pin. Activate the finite staging-only owner/workspace test exception without restarting the canceled subscription or changing billing/subscription/trial/readiness records. Append actual server/IP/agent recipient/generation/runtime/guard receipts and verify the root-owned contract5 runtime before hosted use; never fabricate ready records. Preserve the durable original creation claim/token after an uncertain POST.
5. Merge only the reviewed acceptance fragment into staging, with actual matching resource receipts, the approved digest/expiry, `HOSTED_CREATION_ENABLED=false`, one serial standard-2 runner and customer-repo-only event subscription. Create/protect only the named app. Check/build receives no platform, Access, publication or cross-project credential; deployment uses separate fixed stages. Activate no production/general-creation controls and leave the global Source pin unchanged.
6. Run the prescribed ordinary setup/retry, two tiny owner-connected AI heading edits, deliberate failed check, exact private native Worker preview, anonymous HTML/assets/API denial, publication acknowledgment faults and same-operation recovery. Use the owner's already held AI plan/included quota only; private Access/AI sign-in requires owner participation. Finish archive/spec/metadata edits and checks before **each separate exact candidate approval**. This batch approves no unknown future candidate SHA. Preserve the same operation, locks, refs and grants after timeouts; no replacement deploy or grant.
7. Stop admission and perform the exact owned cleanup below on success, failure or approaching deadline. Retain sanitized evidence and explicitly name any unresolved leftover; no automatic budget/time extension.

## Exact prospective disposable targets

| Target | Bound value |
| --- | --- |
| Owner | `5c5eca98-d495-45d3-9f7a-4da7b9d1b17a` / `operations@claymoo.com` |
| VM/workspace | `83ec40bf-8873-4b75-a1b5-49151f2b1b8d`; one CPX22 atnbg1 and one primaryIPv4; no backups/snapshots/volumes/new firewall |
| Project | `hp_d3fd2bfec810475cd45de5bf97eced82` |
| Namespace / repos | `ha-83ec40bf` / `starter` and `ws-d3fd2bfec810475cd45de5bf97eced82` |
| Worker / Access destination | `ws-d3fd2bfec810475cd45de5bf97eced82`; one app, exact owner Allow and one observer policy |
| Runner image tag / Workflow / bucket | `ha-83ec40bf-runner` / `ha-83ec40bf-ci` / `ha-83ec40bf-backup` |
| SDK binding / migration | One `CiSandbox` class/DO namespace/container app, one new staging tag `hosted-acceptance-83ec40bf`; actual owned IDs append from creation receipts |
| Finite grants | One observer token, one customer-repo write grant/private context (at most24h); one starter write grant (at most1h); at most50 customer-repo SDK read grants (at most1h); at most one bucket-scoped R2 pair if required |

Require canonical expected-absence readbacks; a matching name never permits adopting existing resources. The existing host credential may write/read only the approved queued VM and owned trial records in the exact staging DB; it never enters customer processes. Existing service, users, billing, DB, production, shared firewall, secrets and unrelated resources remain preserved.

## Spending, time and recovery bounds

**At most10 USD incremental total and two hours from the first live mutation**, including credential issuance/configuration. Stop new work at90 minutes or8 USD estimated cost, reserving30 minutes and2 USD for cleanup. The VM/IP gross allocation is at most0.30 USD; no recurring subscription change. The conditional priced envelope is about6.847 USD before separately confirmed registry/Access charges, with fresh existing DO headroom and applicable rounding required. This is a monitored admission limit, not a provider-enforced billing cap. Missing current paid capability, prices, headroom, usage monitoring or teardown support refuses the dependent mutation.

One active operation/project, `max_instances=1`; one setup, at most8 checks,2 publications,40 serial runners,50 SDK read grants,90 aggregate reserved runner minutes and5-minute runner limits. At most5GiB combined new snapshot/registry storage and2GiB egress. The cost document gives finite request/CPU/storage/operation caps and conservative reserves. Zero automatic side-effect retries. Same-operation recovery/readback: at most20 attempts or5 minutes per phase within the same total authority. Setup10 minutes, candidate/publication30 minutes and save polling20 minutes at15-second intervals, all inside the shared total. Refuse changed dependencies/lock/commands or platform-credential exposure.

## Owned teardown and permitted leftovers

Resolve uncertain same-operation mutations while preserving recovery/protection. Enumerate exact created resources and grants completely. Remove serving Worker/previews/versions/deployments and prove canonical absence plus HTML/assets/API no longer serving **before** removing Access. Revoke observer/repo/SDK/starter/bucket grants and private context; require canonical absence and denied old access. Stop/delete exact Workflow instances, runners/container app, owned image and snapshot/registry storage; remove the owned bucket/subscription/bindings/checkout/Paseo registration and appropriate trial records. Delete the exact server/primaryIPv4 and verify both absent; power-off, expiry or a suppressed SDK destroy error is insufficient.

Restore only the approved staging configuration/secret diff; remove the temporary GitHub secret and revoke/remove the run-only execution token after owned teardown. Preserve existing credentials and resources. Permitted named retained leftovers are the **empty** `ha-83ec40bf` namespace if no supported namespace-delete interface exists, nonserving DO/D1 migration tags and exact audit/deleted-VM tombstones. No serving resource, orphan runner, grant or uncertain unpaid resource counts as cleaned; record its exact ID, last receipt, cost/protection and next supported recovery action without extending authority.

This is a private, reviewed-app functionality experiment in the existing SDK runner. Hostile-code isolation, nested Docker, full customer acceptance and general enablement remain deferred and unproved; original archived6.1–6.3 are not waived or closed.

<!-- end live-request.md -->
<!-- file live-results.md utf8 5519 -->
# Bounded live attempt — 2026-10-04

The user's **Approve** authorized the frozen request at Source `be2f662ee6a33a67d034f36023f0e7810a9ac5de`. The app journey did not run. Actual observations are append-only in [live-receipts.json](live-receipts.json); the approved input/request/documents remain byte-for-byte unchanged.

The authority began at18:47:19UTC, with admission ending20:17:19 and expiry20:47:19. Dependent admission stopped at19:37 after the private existing-key link expired without a saved Hetzner key. Creating the VM was authorized, but canonical server/primaryIPv4 cleanup access was unavailable; no VM row/server/IP was created. The owner selected their existing ChatGPT/Codex plan and included quota. Owner/AI sign-in remains unverified.

| Observation | Result |
| --- | --- |
| Existing platform capabilities, complete target inventories, finite execution token | Observed; one account token issued, later revoked and canonically absent; old API access denied |
| Gross exact CPX22/IPv4 quote and existing deny firewall | Observed via the existing GET-only Workflow; USD0.0756 maximum two-hour quote, firewall11682249 |
| Exact tested runner image publication | Passed; one existing maintenance dispatch37226460966, matching image config and registry manifest; temporary GitHub secret removed |
| Exact read-only starter publication | Passed; main48cc56daf2e702a2989ca6ec53240673223578eb; all245 files/modes/links and69 subtrees match tested input |
| Starter grant bound | Provider returned a24-hour write grant instead of the planned one-hour expiry. It was unused, revoked within two seconds, active inventory empty and old credential denied. Do not claim the planned provider TTL passed |
| Contract5 VM, SDK bindings/startup/credentials, setup/retry | Not run |
| Two real AI changes, red candidate, exact private previews/approvals/publications, acknowledgment faults/recovery | Not run |
| Full acceptance / hostile-code isolation / general enablement | Unproved; creation remains disabled |

## Actual cleanup

- Staging restored to original active version838648ff-8449-4c41-afd7-6cdbdc5e3a38 through deploymentc8fed444-8aa5-4b29-b4ae-3a9db7aa01a7. Exact active bindings and compiled ETag match the recorded baseline; existing secrets remain unchanged. The settings endpoint reports the latest uploaded version, so active deployment/version readback owns the restore evidence.
- Starter8l4hn95gddn0bbl6 deleted; canonical404 and complete empty namespace inventory observed. Its original grantmkzpe3i0mvncl0ly was revoked and denied. Temporary Git delivery server/tunnel stopped.
- Completed preflight instanceha-83ec40bf-preflight deleted; eventual canonical404 observed; existing ProvisionWorkflow preserved.
- Customer Worker/repo, SDK Workflow, backup bucket and VM row never created; canonical expected absence verified. Existing Access apps4, service tokens7, Workflows3 and container apps0 remain at their initial counts. The owner's subscription remains canceled.
- One account execution tokenfd6b408cf837422073f64692e2c383a5 revoked; canonical404 and old credential denial observed. Only HOSTED_ACCEPTANCE_EXECUTION_TOKEN was removed from primary ignored.env. Short-lived registry protocol credentials are distinct from that account token; they can continue responding until their own five-minute signed expiry. Expiry denial observations are recorded separately, without plaintext persistence.

## Named leftovers and unresolved proof

The **empty ha-83ec40bf namespace** remains because no namespace-delete route is documented. The nonserving configuration versionee4058f4-47ab-4d4e-a9e8-e685b26e5327 and exact deployment/version audit history remain; the active version has none of the temporary controls. No run credential was installed in that nonserving version.

The **ha-83ec40bf-runner image's22 blobs** remain unresolved. Registry tag deletion returned204 and the complete catalog became empty; canonical manifest HEAD returned404 while cached GET continued returning the old public template manifest. Standard provider garbage collection returned200, but all22 exact blob GET range probes still returned206. Direct deletion of the exact configuration blob through the standard OCI route returned405. The full owned digest inventory and last statuses are in live-receipts.json. Neither an empty listing nor a successful GC response proves storage removal.

The published compressed layers total636277685bytes; conservatively reserve **USD0.015 per month** for one roundedGiB of possibly retained standard R2 storage, pending provider confirmation. This is a storage estimate, not a billing receipt; delayed provider charges remain unknown. No container/runner is instantiated and anonymous registry access is denied. The next supported recovery is provider confirmation/removal of these exact registry objects. No token replacement, re-publication, subscription change or extension is implied.

The original full-acceptance tasks6.1–6.3 stay unfinished. This attempt establishes starter/image publication and several cleanup behaviors, not the app journey. Task4 remains unfinished and storage absence prevents closing cleanup task5.3 or archiving/merging this change.

## Publication decision

On 2026-10-04 the user chose to publish this change with the app journey not run and cleanup5.3 not finished, and to test a hosted app by hand elsewhere. The observations above are unchanged. The registry blobs and empty namespace remain open leftovers after publication.

<!-- end live-results.md -->
<!-- file maintenance-evidence.md utf8 2363 -->
# Prepared maintenance evidence

This is implementation/maintenance evidence, not a completed live functionality trial or isolation/customer-acceptance proof.

| Repo/input | Exact revision/run | Outcome |
| --- | --- | --- |
| Source helper implementation | ef9c70e0dd057b7245f2ea5277019922b01f96a6; PR266 | Build/test/payload passed;1,272 script cases and ordinary generated-current-source starter verification. Final review-only checkpoint has its own gate before presentation |
| Cloud gated archive checkpoint | e633bbcc568d8cd9a8cba5e765d1f01d018911e2; build37222419802/test37222419812/inputs37222419837 | All passed; full staged code tree matches merged main |
| Cloud published preparation | 8de0f017df64f1ff62507954e132b6bb981fa7a1; PR72 | Main build37222779841/test37222779777/inputs37222779808 all passed;2,755 app cases100%,30 VM and67 script cases |
| Compatible Source/starter/image | c22d448bfd8204994ba92f65b5f722762ce6f052; input artifact11311021774 | Exact generated starter ordinary install/test/build passed;245-entry tree/lock/install record verified; image tools/history/ordinary shared discovery verified |
| Cloud normal production deployment | 2df99388-c3ae-4a80-baaa-164d9fe6b198 | Normal platform deployment only; additive migrations0022–0023 applied; no hosted configuration or creation enabled |
| Current Cloud staging baseline | Deployment0aef7f42-a347-4891-9d77-db20ba48b588/version838648ff-8449-4c41-afd7-6cdbdc5e3a38 | Canonical readback has no trial controls or SDK execution bindings; configuration/credential/resource activation awaits approval |

[Cloud review](https://github.com/matthewwong525/wongstack-cloud/pull/72#issuecomment-5982842441) is UNKNOWN for the unconfigured hosted journeys, not live acceptance. Source has no customer preview on its maintenance deployment. No trial credentials, starter/registry publication, VM, sign-in or billed trial action occurred. Existing subscription/billing records remain unchanged.

The archive/image are prepared inputs. The actual registry digest, Artifacts starter main, runtime/recipient/guard, native private preview, exact app approvals, all three publication facts and canonical owned cleanup remain separate later receipts. SDK completion and mocked/protocol tests cannot substitute for them. No full acceptance or enablement decision follows from these green gates.

<!-- end maintenance-evidence.md -->
<!-- file provider-preflight.json utf8 3410 fence=~~~ -->
~~~json
{
  "observedAt": "2026-10-04T15:20:24.301271+00:00",
  "mode": "read-only",
  "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
  "staging": {
    "workerName": "wongstack-cloud-staging",
    "databaseId": "1029a8e7-be64-42c0-bf9a-de49f87a2322",
    "deploymentId": "329439e8-c168-4e51-9f7c-974272a6d976",
    "versionId": "05dafc8c-77f8-451a-80f4-544fe29a9b22",
    "percentage": 100,
    "environment": "staging",
    "hostedControlsAndExecutionBindings": "absent"
  },
  "selectOnlyReadbacks": {
    "workspaceCounts": [
      {
        "status": "deleted",
        "count": 7
      }
    ],
    "eligibleWorkspaces": [],
    "hostedStarterProjects": [],
    "rowsWritten": 0
  },
  "artifactsNamespaceInventory": {
    "httpStatus": 401,
    "status": "unavailable",
    "notAnAbsenceReceipt": true
  },
  "mutations": [],
  "secretsPersisted": false,
  "blockingPrerequisites": [
    "No existing eligible ready staging workspace. Scope decision pending for including one disposable VM in future exact authorization request.",
    "Artifacts namespace inventory unavailable under existing credential. No permission widening or credential issuance authorized by this readback.",
    "No actual published starter/image or contract5 workspace identity receipt exists."
  ],
  "rechecks": [
    {
      "observedAt": "2026-10-04T16:46:19.955961+00:00",
      "mode": "read-only",
      "owner": {
        "id": "5c5eca98-d495-45d3-9f7a-4da7b9d1b17a",
        "email": "operations@claymoo.com",
        "subscriptionStatus": "canceled",
        "endedAt": 1791055177598,
        "activePaid": false,
        "liveVmCount": 0
      },
      "artifacts": {
        "namespaceInventoryHttpStatus": 401,
        "errorCodes": [
          10000
        ],
        "existingTokenArtifactsPermissions": false
      },
      "staging": {
        "hostedControls": [],
        "existingSecretNames": [
          "DATA_KEY",
          "GITHUB_CLIENT_SECRET",
          "HETZNER_API_TOKEN",
          "STRIPE_SECRET_KEY",
          "STRIPE_WEBHOOK_SECRET"
        ]
      },
      "rowsWritten": 0,
      "mutations": [],
      "secretsPersisted": false
    },
    {
      "kind": "read-only-account-durable-object-usage",
      "observedAt": "2026-10-04T17:21:32.283126+00:00",
      "window": {
        "date_geq": "2026-09-04",
        "date_leq": "2026-10-04"
      },
      "dataset": "durableObjectsPeriodicGroups",
      "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
      "sum": {
        "durationGbSeconds": 546.156606976,
        "rowsRead": 1084,
        "rowsWritten": 1103
      },
      "schemaDurationUnit": "GB*s",
      "mutation": false,
      "limitation": "GraphQL usage observation, not invoice/subscription proof; recheck fresh before conditional spend"
    },
    {
      "kind": "post-maintenance-staging-readback",
      "observedAt": "2026-10-04T18:05:19.111553+00:00",
      "mode": "read-only",
      "accountId": "040f88e2bf4f25fb0b91b7cb24f3d442",
      "workerName": "wongstack-cloud-staging",
      "latestDeployment": {
        "id": "0aef7f42-a347-4891-9d77-db20ba48b588",
        "created_on": "2026-10-04T17:56:57.582445Z",
        "versions": [
          {
            "version_id": "838648ff-8449-4c41-afd7-6cdbdc5e3a38",
            "percentage": 100
          }
        ]
      },
      "trialControlsAndBindings": [],
      "rowsWritten": 0,
      "mutations": []
    }
  ]
}

~~~
<!-- end provider-preflight.json -->
<!-- file review.html utf8 45025 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-cloudflare-hosted-acceptance</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-cloudflare-hosted-acceptance">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-cloudflare-hosted-acceptance</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">We need to learn whether the existing managed-app setup, AI editing, private preview and publication work on the real platform. There are no customers. Test one owner-controlled disposable app first, without making a complete customer-isolation implementation a prerequisite for that learning.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Run one restricted staging trial.</b> Only the named owner and disposable workspace can use the test. Keep normal app creation disabled. Prepare its exact resources and cleanup within the proposed $10 and two-hour limits, then obtain the concrete live-run authorization.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">prepare exact inputs</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">         │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">         ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> one authorized staging app</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">         │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">         ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">   test and fix the flow</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Use the existing build runner.</b> Run the ordinary tests and build for reviewed tiny edits. Keep platform deployment credentials in separate deployment stages. Defer the extra container and hostile-code isolation work; passing this test proves functionality only.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">owner-controlled app ──▶ tests + build</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                              │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                              ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">                    separate deployment</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Exercise the real journey and clean up.</b> Test setup, an AI edit, a failing check, private preview, exact approved publication and a second edit. Confirm publication and recovery with separate receipts, then remove the exact owned resources and report leftovers.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">setup ──▶ edit ──▶ check ──▶ preview</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                              │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                              ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">                     approve + publish</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                              │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                              ▼</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">                       change 2 + cleanup</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> general customer enablement, hostile-code isolation claims, nested Docker/offline cache, a new runner service, extra app features, GitHub migrations, enrollment, Memory/Devices or billing changes. Original full live acceptance and isolation obligations remain unfinished; this trial does not waive them. Existing maintenance publication permission is retained. No live resource, credential, sign-in or spend is authorized until the complete exact request is approved.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to keep the implementation workspace or open this fresh follow-up workspace → chose this fresh workspace and closing the previous one, as explicitly supplied by the user. Do not repeat the question.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what this turn authorizes → chose planning only, as explicitly supplied by the user; prepare the live authorization request and stop at review.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: retain the proposed name <code>cloudflare-hosted-acceptance</code>, because both fresh roots have no active change and the checked work has no competing acceptance plan. The old implementation workspace lists no active change and is left alone.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: use the existing starter page for two tiny visible AI changes, because the acceptance concerns delivery rather than extra features or screens.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: use deterministic inventory, receipt comparison, fault control and cleanup checks, because these are fixed identity and bounds checks; AI is needed only for the real editing steps.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: propose $10 incremental spend and two hours including cleanup, because one serial app should fit a small bounded run; these are reviewable proposed ceilings, not approved spending.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: keep the pinned SDK and Wrangler versions for initial compatibility review, because an unrequested upgrade would change the tested contract. Missing real capabilities stop activation rather than imply compatibility.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked where the one disposable acceptance app should run → chose Cloud staging with one restricted owner/workspace. Production creation stays disabled; configuring or executing the run still requires fresh authorization.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what to do after plan review → chose “Ok ready to publish /ship.” This authorizes preparing the implementation and its ordinary maintenance gates/publication; the plan’s explicit fresh live-authorization and exact-candidate approval stops remain in force.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to include one disposable staging VM after readback found no ready workspace → chose inclusion in the later exact request only; no creation, sign-in, credential, trial or live authority.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how to obtain its contract5 Source while retaining the shared contract4 default → chose preparation of a staging-only immutable Source pin for exactly one named owner/VM through existing provisioning, with real paid-owner/access requirements intact. No global source pin, enrollment/billing change or live mutation is authorized.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Observed: official Sandbox security docs and the pinned0.12.1/CI0.2.0 interfaces do not establish an immutable trusted-check boundary against root-equivalent customer commands. Image permissions/USER/runuser cannot close that proof; stop runner preparation for a focused revised trust-boundary decision.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Prepared pin coverage reports150 targeted cases and100% guard/provisioning coverage with touched-file lint; full maintenance CI and live acceptance remain unverified. Both plans are blocked on the supported runner trust-boundary choice; no archive, commit, push, deployment or live authorization occurred. The compatibility proof field stays boolean false while its preparation status is recorded separately.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked to prepare the focused runner isolation revision and return its concrete plan → chose “Go do it just finish this.” Complete that revised planning work autonomously; this does not approve unknown live resources, credentials, spend or customer candidates.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: select one fixed offline Docker guest inside the existing SDK runner, with a separate working copy and trusted outer checks/receipts, because documented nested Docker and ordinary network/mount/capability controls provide a concrete correction without a new service or SDK fork. Exact pinned-platform support, offline ordinary commands and adversarial denial must pass CI and later real probes; no permissive fallback or successful-isolation claim.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to simplify to a restricted live functionality trial and continue here after pausing the other agent → chose “adjust the plan and go with live test.” Use the existing SDK runner for one owner-controlled app, defer nested Docker and adversarial isolation proof, retain disabled general creation and original full-acceptance obligations. Prepare autonomously; the exact resource/cost request and candidate-specific approvals remain separate.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how to test when the staging subscription is canceled → chose preparation of a staging-only exception for the one disposable VM, without restarting a subscription or changing billing records. Live activation remains part of the final exact resource/cost request; all other paid access remains unchanged.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/.c8rc.json</code> adds nested acceptance helpers to the measured coverage set; numeric thresholds and existing checks remain unchanged. No verification is removed.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: use a strictly read-only mode of the existing staging provisioning Workflow to obtain the firewall and VM/IP quote with its existing private Hetzner secret. The final exact request binds the preflight and conditional creation together; no secret export, new service or additional planning approval is needed.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Checkpoint preparation onto fresh main v30.7.0 (<code>1c5c65fe391a1db3ce2b3f7a43b39ff53dd71585</code>), preserving its unrelated memory, verification and workflow updates. The deliberate contract5 agent/starter input remains c22d448; ordinary maintenance checks and live trial evidence stay separate.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The manual image publisher is platform maintenance only. Complete and archive the Cloud preparation change through ordinary authorized publication, then bind its successful exact main CI image/starter artifact for one later explicit live dispatch. Source keeps the live trial tasks active and does not archive or claim acceptance from that maintenance merge.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Cloud preparation shipped viaPR72 at8de0f017df64f1ff62507954e132b6bb981fa7a1; its three main gates pass, exact CI starter/image artifact is11311021774, and normal production deployment applied additive migrations0022–0023. Staging readback confirms no trial controls/bindings. The final conditional request bundles the prepared targets and finite cost/capability readbacks; all actual live/provider/isolation outcomes remain unfinished.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user approved the frozen bounded live request and selected existing ChatGPT/Codex included quota. Actual publication and cleanup observations are recorded in live-results.md/live-receipts.json. No VM/app journey ran because the existing Hetzner key handover timed out; exact registry storage absence remains unresolved after supported GC and refused scoped blob deletion. Keep live tasks and cleanup5.3 unfinished; preserve frozen inputs and disabled general creation.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to rerun the bounded live trial or set up a staging workspace for hand testing → chose “Can we just merge now? Let’s quickly wrap it up so i can test elsewhere.” Publish the preparation, helpers and partial live records as they stand. Tasks4.1–4.6 and5.3 move to deferred work unrun; no acceptance, isolation or enablement claim follows, and the registry-blob and namespace leftovers stay open.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: archived as <code>openspec/changes/archive/2026-10-04-cloudflare-hosted-acceptance</code> with <code>--skip-specs</code>, because all three delta requirements already equal the main spec. No payload file changed, so no release number.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file runner-containment-design.md utf8 13674 -->
# Offline customer commands inside the existing SDK runner

**State:** DEFERRED by the user's restricted functionality-trial choice. This is retained design research for later customer isolation work; none of its nested Docker/offline-cache/adversarial gates is a prerequisite for the current internal functionality trial. No isolation claim follows from the trial; design.md owns current scope.

## Boundary and supported interfaces

Keep CI0.2.0 Workflow/runner, Sandbox0.12.1, ordinary Source checks and npm commands, and the existing fresh trusted preview/publication runners. Add one fixed Docker guest at a time inside the check/build runner. It runs only customer dependency hooks, tests and build code. The outer runner runs pinned Source checks, Git/history verification, the Docker controller and output validation. No customer JavaScript or customer shell script executes in the outer runner. No new provider service, runner adapter, SDK fork or write broker is introduced.

Cloudflare documents [Docker-in-Docker for Sandbox0.x](https://developers.cloudflare.com/sandbox/sdk/guides/docker-in-docker/), but its example uses host networking and disables iptables. That example would expose the outer control network and is unsuitable here. Docker documents a [none network](https://docs.docker.com/engine/network/drivers/none/) and ordinary [container execution controls](https://docs.docker.com/reference/cli/docker/container/run/). Combining those controls with Cloudflare's nested Docker entry point is a design inference, not a documented or tested guarantee for our exact pinned image. CI and subsequently authorized real probes must demonstrate the complete combination; a rejected or ineffective flag stops the run without a permissive fallback.

```text
existing SDK Workflow
          │
          ▼
outer SDK runner: pinned checks + controller
          │
          ▼
offline Docker guest: npm ci / test / build
          │ stop + inspect, then validate files
          ▼
canonical output + SDK workspace backup
          │
          ▼
existing fresh trusted preview/deploy runner
```

## Exact image and dependency preparation

CI builds the ordinary outer Dockerfile from the already reviewed Sandbox0.12.1 base digest. Keep its sandbox binary and SDK contract. Add pinned Docker daemon/client inputs and a standard Docker image archive for a fixed inner Node22 image, with exact Node/npm/OS/architecture and digest in compatibility.json. Load it using ordinary `docker image load`; never pull or build a customer Dockerfile at runtime. The inner image has no Docker socket/client authority, platform credentials, checkout token, SDK binary or trusted receipt emitter.

CI generates the starter from the reviewed Source commit and freezes its package/lock/install records. Prepare a complete npm cache for that same lock and architecture, including native/optional packages and lifecycle-tool inputs needed by ordinary tests/build. Cache preparation executes only reviewed starter inputs in the maintenance build, with no hosted provider credentials. Verify an actual offline `npm ci`, shared tests and `npm run build:app` in the guest; measuring only cache presence is insufficient. The two acceptance edits keep package and lock identities unchanged. Missing packages, an install hook needing the network, incompatible native binaries or a changed dependency lock fail closed; do not enable networking, skip hooks or alter the ordinary commands. This bounded acceptance recipe does not claim arbitrary future dependency changes are supported.

Use `NPM_CONFIG_OFFLINE=true`, an explicit trusted cache path, and no inherited npm configuration or user home. npm's [offline configuration](https://docs.npmjs.com/cli/v10/using-npm/config/) forbids network requests; prefer-offline is insufficient. Include daemon inputs, inner image/archive, cache, dispatcher, validation code and prepared starter hashes in the final manifest. Final publication approval binds these prepared inputs, then the returned outer registry digest must be independently read back before use. No registry push or starter publication during preparation.

## Admission before SDK checkout and restore

SDK0.2.0 checks out and tar-overlays candidate source before our command starts, including after restoring a backup. Command-time validation alone is therefore too late. Before calling the SDK runner, the existing trusted Worker must inspect the exact candidate/base trees through documented Artifacts `readCommit`, recursive `readTree` and `readBlob` methods. Bind the returned tree/object identities to the registered project/base/head; cap depth, entries, bytes and request time, and deny missing objects or unsupported methods. Keep optional declarations explicit and prove their deployed interfaces before customer delivery; the current Wrangler pins are not silently upgraded. A missing interface blocks delivery rather than delegating unsafe validation to customer code.

Validate canonical relative names and permitted Git modes, disallow submodules/special files, absolute or escaping symlinks and symlink cycles/ancestor collisions, and exclude tracked paths colliding with compiled output or trusted history. Existing internal payload links must pass a bounded canonical-target validator, not be blindly rejected or followed. CI fixtures must test malicious source entering the first runner and the later restore/overlay, not only build output. The final starter tree must pass this exact validator. SDK checkout stays from Artifacts; no customer runtime GitHub fetch is introduced.

Only backups emitted by this trusted pipeline for the same operation/head/image manifest can be restored. No customer-supplied backup or cross-head install cache is admitted. Before every successful SDK backup, validate the complete workspace tree and retain only admitted tracked source, verified credential-free Git history and canonical compiled output. Raw customer dependency/cache/coverage/temp directories and guest control data never enter that backup. This prevents malicious generated links from being restored before the SDK source overlay.

## Guest filesystem, processes and network

The outer runner prepares a separate disposable copy of the validated candidate under its private temporary directory. Mount only that copy at the guest's `/workspace`; do not give the guest writable access to the outer SDK `/workspace`. Provide a separate verified credential-free Git history copy read-only if ordinary checks need Git. The source copy is compared to the admitted source after commands; a tracked mutation invalidates checks. Constrain each command to its fixed cwd and args, with a canonical mount source created by the controller; do not follow customer-created paths when starting the next command. Do not mount `/opt`, outer `/tmp`, `/proc`, root, SDK sockets, daemon sockets, R2 mounts, secrets or credential-bearing checkout remnants into the guest. The prepared npm cache is copied into guest-owned disposable storage, not mounted writable over trusted image/cache inputs.

The trusted controller owns the exact image, argv, cwd mapping, mounts, environment, container ID and limits. Fixed Docker execution requires `--network=none`, private PID/IPC namespaces, `--cap-drop=ALL`, `--security-opt=no-new-privileges`, the default seccomp policy, read-only image root and bounded writable temp/workspace paths. Use a fixed unprivileged guest UID as an additional restriction; the actual boundaries are namespaces, mounts and dropped capabilities. No privileged mode, host PID/IPC/network, devices, added capabilities, security-unconfined setting or TCP daemon listener. Dockerd listens only on an outer Unix socket inaccessible to the guest. The controller verifies Docker inspect facts and runtime probes; silently ignored options do not qualify.

Freeze CPU/memory/PID/workspace/log limits from CI measurements, within the selected outer instance and approved aggregate caps. Timeouts, OOM, excess bytes, failed inspect or failed shutdown cannot return success. Count nested execution and image/cache storage in the same outer-runner budget; it adds no provider container app, instance or independently authorized resource. Only one guest may run at once. One failed guest cannot be replaced under an uncertain operation.

## Shared commands and trusted receipts

Source `.github/scripts/checks.mjs` continues to run from the pinned outer Source path, using exact repo/base/head/default-branch context. Its trusted Git/scope/loosened/wiki checks read the admitted outer tree. Its `npm ci` and `npm test` calls go through a fixed outer dispatcher that maps a canonical candidate cwd into the guest. Cloud's ordinary `npm run build:app` uses the same dispatcher. Preserve actual arguments, ordinary dependency hooks, whole-change scope and failure status; no customer shell interpolation or alternate check implementation. The inner npm process uses its real fixed Node/npm environment, not the outer dispatcher recursively. Audit every shared check subprocess so an indirect customer script/import cannot execute on the outer host.

The outer controller records Docker's exact container ID, verified configuration, wait/exit/OOM/timeout status and confirmed stopped state. Guest stdout is diagnostic customer data, never trusted receipt JSON. Keep controller summaries outside guest mounts and prefix/type them independently of customer output. The Workflow trusts only its pinned outer entry's exit and bound receipt, not a matching line printed by tests. After each command, stop/remove the exact guest and confirm no guest processes remain before reading output or emitting success; a background process or uncertain destroy blocks the backup and privileged stages. Preserve exact IDs/errors for cleanup readback.

Validate compiled output using no-follow canonical regular-file reads after confirmed guest stop: reject escaping or any output symlink, hard-linked/special files, unexpected paths, changed files during inspection, oversized output and unsafe configuration. Transfer only validated regular bytes into the outer SDK compiled-output directory; rehash the transferred tree. A copy/archive made by customer code is not accepted validation. Trusted identity/manifest construction and fixed project/Worker/Access targets remain outside the guest. A fresh deployment runner independently revalidates source, output, identity and target before receiving the existing project-bound publication authority; it never runs customer hooks with that authority.

## Evidence and fail-closed sequence

| Gate | Required evidence | What it permits |
| --- | --- | --- |
| Revised design review | This design, coherent Source/Cloud tasks/specs, explicit remaining pins | Preparation only |
| Complete maintenance gate | CI-built exact recipe/starter, true offline ordinary checks/build, adversarial fixture results, measured limits and immutable artifacts | Reviewable final live request, no resource/configuration mutation |
| Exact fresh live authorization | Complete prospective inputs, owner/workspace/targets/grants, cost/time/cleanup and manifest/ledger digests | Only named staging configuration/publication/VM/probes |
| Initial real runtime gate | Exact deployed image; actual namespace/mount/capability/seccomp/limit denial, Artifacts object interface, complete runner/grant cleanup readbacks | Restricted ordinary customer acceptance steps; no claim that the whole journey passed |
| Candidate-specific real gate | Exact head/tree, red refusal, protected check receipt/output, stopped guest and complete outer lifecycle readback | Existing private preview/approval path for that candidate |

CI adversarial fixtures attempt outer localhost/control-port access, external DNS/egress, outer process/environment read or signaling, namespace/capability escape, trusted-tool writes, daemon socket access, checkout/Artifact grant read, forged receipt/log success, source mutation, malicious source/backup links, output symlink/hardlink/special files, surviving children, timeout/OOM and failed teardown. Use synthetic sentinels without real credentials in CI. Later real probes log only booleans/reasons/public identities; no secret values or secret-derived hashes. Missing evidence leaves `runner.isolationVerified=false` and blocks privileged stages. Reserve these probes within the existing40-runner/90-minute/storage/cost caps; do not add an unbounded side experiment.

If the pinned platform cannot enforce even one required primitive, or offline ordinary starter commands cannot pass, retain disabled creation and report that precise unsupported prerequisite. Do not loosen the boundary, replace SDK pins, add a service or extend spend/time automatically. Planning readiness means the correction is concrete, not that future platform support has been proved.

## Alternatives considered

- Separate Linux users or PID-only SDK sessions leave shared files/control networking and cannot establish the needed boundary.
- Cloudflare's host-network Docker example exposes outer localhost; it cannot protect the SDK control channel.
- Treating the whole SDK runner as untrusted while trusting its success JSON leaves check status and backup/overlay safety unproved.
- A new runner service, SDK fork or serialized lexical function exceeds the settled scope and introduces new lifecycle/credential ownership.
- Network-free fixed Docker guests with separate working copies preserve the existing Workflow/shared commands and give concrete runtime denial tests. Their exact nested-platform compatibility remains a gate, not an assumption of success.

<!-- end runner-containment-design.md -->
<!-- file sandbox-interface-review.md utf8 5449 -->
# Bounded runner interface review

Observed 2026-10-04. This is read-only official-documentation and published-package research, not an executed isolation probe, provider acceptance, or vulnerability reproduction. No SDK package was installed/executed and no container, credential, or provider resource was created.

## Pinned inputs and documented boundary

Cloud's freshly fetched main lock pins `@cloudflare/ci@0.2.0` and `@cloudflare/sandbox@0.12.1`. The published Sandbox archive at [npm's pinned tarball](https://registry.npmjs.org/@cloudflare/sandbox/-/sandbox-0.12.1.tgz) was read and independently checked against the lock's SHA512 integrity:

`sha512-P1ZmNDLYtuEY1ZUcAx0OgTol98VqS617LGd4nf1RTOjSV2yHLDAp59NI36/gg3/pxkHPgmAEyFIjH/ie8FoA7g==`

Cloudflare's [current Sandbox security documentation](https://developers.cloudflare.com/sandbox/concepts/security/) (updated September30,2026) says the sandbox is the unit of trust: processes share files/processes/localhost, and a separate Linux user is not a security boundary in deployed sandboxes because processes have root-equivalent capabilities. Its [0.x security model](https://developers.cloudflare.com/sandbox/sdk/concepts/security/) likewise documents shared resources within one sandbox and separation between sandboxes. These docs do not prove the exact deployed pinned image's behavior; they invalidate treating image permissions or a `USER`/`runuser` choice alone as isolation proof.

The published0.12.1 declarations expose `BaseExecOptions` for timeout/environment/cwd/encoding; `ProcessOptions` adds process/session identifiers and lifecycle callbacks. They expose no per-command filesystem/capability restriction. `SessionOptions.isolation` describes PID namespace isolation requiring `CAP_SYS_ADMIN`; it does not document an immutable filesystem or private localhost boundary. Current [0.x command documentation](https://developers.cloudflare.com/sandbox/sdk/api/commands/) similarly gives command/environment/cwd/timeouts, not that missing boundary.

Published CI0.2.0 `SandboxRunner.run` creates a random fresh sandbox with `enableDefaultSession:false`, restores only its workspace backup, overlays the exact source, and launches the configured command with `startProcess`. Its public runner options/config expose no session or capability isolation primitive. `CIWorkflow` owns a private context and runner invocation; no documented public runner replacement seam was found. This is a bounded interface finding, not a claim that every conceivable supported correction is impossible.

## Concrete preparation blocker

Cloud's shipped `scripts/hosted/check-build.mjs` runs the trusted Source checks and customer-controlled npm commands inside one SDK sandbox. The current design requires actual trusted tooling/process isolation. A path under `/opt`, frozen image inputs, a clean child environment, and fresh runners cannot establish that same-sandbox boundary by themselves. The existing later privileged runners are fresh and important, but do not independently prove the earlier check receipt trustworthy or restored workspace material safe.

Do not mark `runner.isolationVerified`, compatible deployment, passing live tests, or publication accepted from these static observations. Do not configure the recipe or start a privileged live stage on the assumption that file ownership solves it. Preserve the shipped default-disabled implementation and frozen acceptance evidence.

## Required correction review

Re-plan the smallest supported correction within the existing SDK Workflow and ordinary shared commands. Treat the entire customer-executing sandbox and its outputs as untrusted. The review must explicitly cover trusted check orchestration and receipts, the sandbox control channel/localhost/processes, exact checkout credentials, workspace backup and overlay, and canonical compiled output entering fresh privileged runners. Require a supported containment or external trust boundary with named interfaces, CI-owned adversarial fixtures, and later separately authorized real runtime probes before accepting its claims.

No replacement orchestration service, custom packer, serialized function, write broker, dependency upgrade, Docker user permission claim, or weaker acceptance requirement is implicitly approved. If no supported correction fits the settled scope/pins, retain disabled creation and present the precise revised scope choice; do not guess a fix. Completing the separately chosen VM Source-pin preparation does not clear this blocker.

## Revised preparation design

The user requested completion of the focused revision. [runner-containment-design.md](runner-containment-design.md) selects a fixed offline Docker guest inside the existing SDK runner, with a separate working copy, trusted outer checks/receipts, pre-SDK source-tree admission and canonical stopped-guest output transfer. It resolves the design choice without a new service or SDK upgrade. Read-only review of official nested Docker, Docker network/run and Artifacts object-inspection interfaces supports preparing this composition; it does not prove our exact pinned platform enforces it. CI and later bounded real probes remain mandatory, with isolation proof false until observed. This revision supersedes the request to choose an approach, not the original blocker evidence or frozen shipped evidence. No Docker execution, build, push or provider mutation was used to design it.

<!-- end sandbox-interface-review.md -->
