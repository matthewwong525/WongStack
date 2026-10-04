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
