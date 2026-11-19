<!-- openspec-archive v1 2026-10-04-cloudflare-hosted-starter -->
<!-- file proposal.md utf8 31483 -->
# Prepare account-free hosted projects

**Status:** ready-to-ship
**Branch:** spotless-panther
**Open questions:** none for this disabled implementation release. Live inventory, immutable starter/runner/agent pins, sign-in participation, cost, cleanup and enablement remain unfinished in [the follow-up](live-acceptance-follow-up.md).

## Why

Starting a hosted project should give a person a project their AI can work on and a small working site, without signing up for GitHub or Cloudflare. This release ships the tested implementation with managed creation disabled. A separate live-acceptance follow-up must prove the complete small-app journey before enabling it.

## What Changes

- **Prepare managed storage as the new-project default when enabled.** After the existing email sign-in and service access steps, start the project without provider accounts, tokens, or dashboard visits. A quieter choice keeps the normal GitHub setup for people who request it. Existing projects keep their current route.
  ```text
  NEW HOSTED PROJECT
  ═══════════════════════════════════════
  email sign-in ──▶ start project
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
        managed storage       choose GitHub
          (default)          existing setup

  EXISTING PROJECT ──▶ keep its current route
  ```
  ```text
  BEFORE                  AFTER
  ┌───────────────────┐   ┌───────────────────┐
  │ Set up your repo  │   │ Start your project│
  │ Connect GitHub    │   │ Your project      │
  │ Set up hosting    │   │ [Start project]   │
  │ Cloudflare token  │   │ Use GitHub        │
  └───────────────────┘   └───────────────────┘
  ```
- **The AI workspace stays familiar.** Use the existing workspace server, Paseo and AI sign-in flow. The project has ordinary saved history; reconnecting opens the same project. AI sign-in still belongs to the person. Memory and device setup are separate work.
  Each code change has its own plan and branch. Saved work, checks and the exact preview belong to that change; review and approval happen in the existing workspace/chat.
  ```text
  saved project ──▶ existing workspace server
                              │
                              ▼
                     sign in to your AI
                              │
                              ▼
                       ask for a change
  ```
- **Checks, builds and previews run on Cloudflare.** Reuse one set of check scripts across the hosted and GitHub routes. Cloudflare runs the hosted checks and build; the small app and its private preview run as ordinary Workers. Build runners use Cloudflare's supported containers, with no container running the app or its preview.
  ```text
  saved change ──▶ shared checks ──▶ build
                        │              │
                        ▼              ▼
                  failure report   private preview

  build runner: Cloudflare container
  app + preview: Cloudflare Workers
  ```
- **Review a passing change before publishing it.** Show the exact preview, accept approval for that change, and report success only after the live site and saved history both confirm it. A failed or uncertain publication says what is known and stays incomplete. This first version supports one change at a time per project.
  ```text
  passing change ──▶ review ──▶ approval
                                   │
                                   ▼
                        publish that exact change
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                    live site          saved history
                         └─────────┬─────────┘
                                   ▼
                         both agree: published
  ```
- **Keep setup and failure states understandable.** Reuse the existing dashboard cards; no new repository browser or hosting console. This disabled implementation release is accepted through its Source/Cloud maintenance gates. Enablement remains conditional on the separate complete live journey: setup, a real AI edit, a deliberately failing check, private preview, approved publication and a second change.
  ```text
  ┌─────────────────────────────────────┐
  │ My business                         │
  │ Setting up your project…            │
  │ You can leave this page open.       │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │ My business                         │
  │ Setup needs attention               │
  │ Your saved work is safe.            │
  │ [Retry setup]   Contact support     │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │ My business                         │
  │ Project ready                       │
  │ [Open workspace]   Open site        │
  │ Follow the existing AI sign-in steps│
  └─────────────────────────────────────┘
  ```

**Non-goals:** moving existing projects, removing the public GitHub template or existing GitHub workflow, a GitHub replacement with pull requests and issues, a new AI runtime, Memory/Devices, billing changes, automatic customer sign-ins, database-backed app features, background jobs, custom domains, parallel changes, a bespoke build or bundle-transfer system, enabling managed creation, and completing the deferred live trial in this release.

## Capabilities

### New Capabilities

- `cloudflare-hosted-projects`: account-free hosted project setup, ordinary Git editing, Cloudflare CI and private previews, exact-change approval, publication evidence and bounded recovery.

### Modified Capabilities

- `delivery-gate`: retain the GitHub route and add an explicit hosted route for checkpoints, checks and publication without GitHub authentication or pull requests.
- `install-onboarding`: recognize a trusted hosted project before personal setup and distinguish the hosted starter from a full personal installation.
- `server-agent`: negotiate the hosted bootstrap job without treating existing contract 4 as Artifacts support.

## Impact

- Source: a small hosted bootstrap helper; provider-neutral shared checks; a hosted delivery adapter and links from the existing verbs; install/payload metadata, tests and docs.
- Cloud companion: new-project route and dashboard cards, repository/resource records, the official CI SDK Workflow and required bindings in the existing service, and bounded publication/status handling. This plan records both sides; current implementation checkpoints are Source #259 and Cloud #70.
- Provider dependencies: Artifacts, Workers, Access, and the CI SDK's Workflows/Containers/R2 support in the platform account. Native Workers Builds remains a later simplification, pending documented automated Artifacts connection support.
- The initial request authorized planning only. The later `/apply` authorizes implementation of this reviewed plan, including its task-driven maintenance checks. Provider resources, credentials, customer sign-ins, live trials and release enablement still need fresh, concrete authorization; canceled approvals never transfer.

## Decision log

- **2026-10-03** — Assumed: start this fresh plan from fetched Source main, because the user explicitly canceled the old Source and Cloud changes; this workspace matched main before any planning write.
- **2026-10-03** — Assumed: default only new hosted projects to Artifacts and preserve all existing GitHub projects and explicit GitHub choices, because those preferences are settled in the brief.
- **2026-10-03** — Asked whether an operator dashboard connection was acceptable → chose to preserve the expectation that dashboard setup is unnecessary; the customer must do nothing in either provider.
- **2026-10-03** — Asked how much the first delivery should prove → chose one complete small app: setup, AI edits, shared tests, private preview, approved publication and a second change.
- **2026-10-03** — Asked which automated build route to use → chose no GitHub workflows in the hosted route and a full move of hosted execution to Cloudflare.
- **2026-10-03** — Assumed: use Cloudflare's documented CI SDK recipe with ordinary Worker Previews, because it meets automatic setup and Cloudflare-only hosted execution; native Workers Builds documents Artifacts dashboard setup but not an Artifacts connection API contract.
- **2026-10-03** — Assumed: start with an HTTP and static-asset app, one owner and one change at a time, because that proves the requested repository and AI/setup journey without adding data provisioning, collaboration or a new orchestration service.
- **2026-10-03** — Assumed: reuse existing email sign-in, workspace servers and AI sign-in steps, because current Cloud main already supplies them; change neither billing nor Memory/Devices.
- **2026-10-03** — Assumed: implement recurring setup, CI routing and receipt checks as deterministic code, because those steps need exact repeatable results; AI remains responsible for understanding and editing the customer's app.
- **2026-10-03** — Asked how PRs work with Artifacts → investigated the current official Git/API documentation and recommended one OpenSpec change linked to one ordinary branch, with checks, exact preview and approval handled by the hosted delivery adapter; the user then requested `/apply`. OpenSpec records the plan and branch; it does not provide a PR service or enforce approval.
- **2026-10-03** — The user invoked `/apply` for this reviewed change. Begin with the SDK contract boundary; keep provider mutations, credentials, customer sign-ins, trials and production enablement outside this implementation authorization. Cloud main remains `4bb0082ea93f0d11b94e296e4d0e615901485156`; its fresh local archive is implementation preparation, not reuse of the canceled companion branch.
- **2026-10-04** — The user explicitly authorized pushing the prepared SDK slice, Cloud's normal CI and its automatic existing staging deployment. This covers the SDK pins, boundary helper and protocol tests, not new hosted resources, tokens, live trials or production publication. The fresh companion is Cloud #70; its gate is still pending.
- **2026-10-04** — Verified the SDK's native push normalization, actual public runner command/credential/snapshot interfaces, accepted Wrangler schema and tracked-output collision behavior with 30 passing focused tests and full helper coverage. Maintenance CI remains the first expansion gate; these fixtures do not establish live isolation or publication.
- **2026-10-04** — Cloud #70's exact code head `6faef10cd9513e52af9b2a04f4ddaa39841570c7` passed full Test and Deploy maintenance runs. Task 1.2 is complete at its implementation-contract gate, with [the exact evidence](sdk-contract-evidence.md); no preview URL was discoverable, and no full hosted/live acceptance is claimed. Continue to shared checks on current Source main.
- **2026-10-04** — Check: `.github/workflows/test.yml` delegates its existing app and quality checks to `.github/scripts/checks.mjs`; `.github/scripts/app-untouched.sh` gains an explicit local base/head comparison for provider-neutral callers. No check is removed: whole-change skips, suite discovery, quality reports after a red suite and the independent deployment workflow remain. The wrapper no longer caches npm dependencies, because portable suite discovery and execution now belong to one ordinary script.
- **2026-10-04** — Check: `.github/scripts/checks.mjs` adds the shared entry point, using the existing scope, loosened-check and wiki implementations with explicit repository/base/head/default-branch inputs. Source's additional payload maintenance checks remain separate from the customer gate.
- **2026-10-04** — Prepared task 2.1 with 88 passing focused script cases, including 17 shared-check fixtures, and passing payload/wiki/configuration/context checks. The [implementation evidence](shared-checks-evidence.md) records the existing Source staging actions its maintenance push would trigger. No provider action is authorized by the earlier Cloud-only approval; obtain Source staging authorization before this checkpoint's push.
- **2026-10-04** — The user approved Source staging CI for the prepared shared-check slice (`c6efe02`), including the existing staging Worker/database checks and branch preview upload. Push this checkpoint and use its exact maintenance result for task 2.1; this approval does not create new hosted resources or authorize credentials, a trial or production publication.
- **2026-10-04** — Source #259's first head passed Test and Deploy but failed two payload integration cases. Add the new capability to the existing Cloudflare documentation-area mapping and extend static payload dependency inspection to the shared script's fixed sibling command paths. Keep every existing assertion and rerun the full maintenance gate; task 2.1 remains incomplete until it passes.
- **2026-10-04** — Source #259's corrected exact head `796ddd9beadeaa12d8736fef9fe1d2b8227cb620` passed Test, Deploy and all 1038 payload cases. Task 2.1 is complete; [its evidence](shared-checks-evidence.md) records the failures, repairs and discovered staging preview. Continue to the HTTP/static hosted starter and negotiated workspace bootstrap, without provider resource creation or release publication.
- **2026-10-04** — Prepared tasks 2.2 and 2.3: an offline pinned HTTP/static starter, authenticated contract-5 bootstrap, private project handoff and setup routing. The companion context endpoint and contract negotiation remain Cloud dependencies; neither starter publication nor hosted readiness is established. [Prepared evidence](starter-bootstrap-evidence.md) distinguishes focused fixtures from the generated app's pending maintenance build. Leave both tasks unchecked until that gate passes.
- **2026-10-04** — Check: Source's payload maintenance workflow adds the generated starter's ordinary installation, type generation, complete tests and build, plus compiled configuration/assets/identity inspection. The script coverage inventory includes `server/hosted/*.mjs`; coverage floors remain unchanged. These checks add evidence and run no deployment command for the generated app. A maintenance push still invokes the existing separate Source staging deployment, so the prior shared-check-slice approval does not cover this new slice.
- **2026-10-04** — Check: `.github/workflows/payload.yml` adds generated-starter checks for the existing non-documentation scope, because the main app's checks do not compile the separate hosted configuration. No existing check is removed or skipped.
- **2026-10-04** — Check: `scripts/tests/.c8rc.json` includes the new hosted helper directory in the existing coverage inventory, because these helpers need the same coverage gate as other Source scripts. Numeric thresholds remain unchanged; no coverage suppression is added.
- **2026-10-04** — Read-only fetch found independent Source main release `a775930044e8d77c967a136431d8d971b20809e8` (Memory #258). Keep this prepared checkpoint on its established branch without importing that release or expanding into Memory/Devices. Final main reconciliation remains a later delivery responsibility.
- **2026-10-04** — The user approved pushing prepared starter/bootstrap commit `bb01e066f3dd45b150e67a51c1c94c2391d44c98` to Source #259 and running normal maintenance CI, including its existing staging Worker/database checks and branch preview upload. The generated starter is tested and built without deployment. New resources, tokens, starter publication, an Artifacts trial and production publication remain outside this approval. The checkpoint is pushed; tasks 2.2 and 2.3 await its exact gate result.
- **2026-10-04** — Starter/bootstrap head `bb01e06` passed Source Test, Deploy and the full script suite; the generated starter's ordinary commands completed, then its compiled-configuration assertion failed. The published Cloudflare Vite plugin 1.62.1 normalizes absent resources to nested empty structures (Durable Object bindings and queue producers/consumers). Teach the assertion to distinguish empty metadata from configured resources; add a regression with provider-shaped defaults and retain rejection of real bindings/schedules. Keep tasks 2.2 and 2.3 unchecked until the corrected exact head passes maintenance CI.
- **2026-10-04** — Check: `scripts/check-hosted-starter.mjs` accepts provider-normalized empty binding structures, because their object presence does not mean a resource exists. Any nonempty binding array or schedule remains rejected; add service/KV checks and bounded failure categories. No generated-app test, build, identity or asset check is skipped.
- **2026-10-04** — Corrected Source #259 head `80df7e81325ef4e5265f719d752578847547a176` passed Test, existing staging Deploy and Payload, including all 1057 script cases and the actual generated starter's ordinary tests/build plus compiled output checks. Complete tasks 2.2 and 2.3 at this Source gate; [the exact evidence](starter-bootstrap-evidence.md) retains the first failure and one repair. The Cloud context endpoint and full hosted acceptance remain pending. Continue to accepted Cloud task 3.1, preparing only internal records before obtaining its own staging migration authorization.
- **2026-10-04** — Cloud task 3.1 is prepared locally at `f405ff9c18d15188b0f4554bbc8a7eb282990023`, reconciled with current Cloud main `5b1ff7c4fea87d2dde2323fc065cc323e80f524f`. Its companion change's `internal-records-evidence.md` records 37 real-SQLite cases and full new-module coverage, focused lint, knip and duplicate checks. No route or provider client calls the new records. Keep task 3.1 unchecked: pushing to Cloud #70 would apply four empty tables to the existing staging database and redeploy its existing Worker, so request fresh approval for that concrete checkpoint. Earlier SDK or Source staging approvals do not cover it.
- **2026-10-04** — The user approved Cloud's prepared records staging migration and CI. Corrected Cloud #70 head `d41f3b78d11358a5a906ee4511d31c4d73f850ad` passed Test and Deploy after one collision repair: four distinct `hosted_starter_` tables preserve an earlier staging table. The accepted companion evidence records 2,155 app, 30 VM and 46 script cases, full coverage and the successful existing-staging migration/deployment. Complete task 3.1; no preview URL was discovered, no customer hosted setup/publication is accepted, and creation remains disabled. Continue to the accepted disabled setup implementation in task 3.2 without provider resources, tokens, sign-in, trial or production actions.

- **2026-10-04** — Cloud task 3.2 is prepared locally at `f4a51149c0c34c84aac753fb7800b5f6a6641cf8`, with 456 focused compatibility/SQLite cases, 100% selected new-module/router/contract coverage, passing type-only Worker checking, lint, knip and duplicate checks. Its disabled setup endpoint, exact private contract-5 handoff and bounded DB maintenance retain uncertain operations; no configured creation control, source-release move or actual hosted provider call is included. The companion setup evidence documents the one-page inventory and unproved REST log response boundary. Keep task 3.2 unchecked: fresh approval is pending for Cloud #70 normal CI, its one empty additive setup table on the existing staging database and its existing staging Worker deployment. No dashboard/pipeline, live acceptance or production step has run.

- **2026-10-04** — The user approved the disabled-setup staging migration and CI. Cloud #70 exact head `f4a51149c0c34c84aac753fb7800b5f6a6641cf8` passed [Test](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37174093101) (2,300 app cases, 100% whole-app coverage, 30 VM and 46 script cases) and [Deploy](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37174093064), including successful additive setup-table migration and existing-staging build/deployment. No CI repair was needed; preview discovery returned no URL. Complete task 3.2 at this maintenance gate and proceed to existing dashboard cards, keeping creation disabled until full hosted acceptance. No real hosted provider resources, credentials, sign-in, trial or production action is approved by this gate.

- **2026-10-04** — Assumed: the first dashboard milestone uses Your project and its existing recorded identity rather than adding project naming/renaming state. Friendly-name editing can follow the complete small-app acceptance; the primary action and explicit GitHub choice are unchanged. The same Cloud companion now holds accepted dashboard task 3.3, with existing cards/pairing/AI guidance, server-authoritative eligibility/status and no new migration, resource, credential or activation. Unknown operations offer status/support; only known safe bootstrap failure offers same-target retry. Project preparation remains separate from live-site and memory readiness.

- **2026-10-04** — Dashboard head `20761902f4576bb34f9e35dd25d1317a4e9195fa` passed [Test](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37175776400) (2,389 app cases across 87 files, 100% whole-app coverage, plus the existing VM/script gates) and [Deploy](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37175776390). Ordinary existing-staging build/deployment passed with no new migration and no CI repair. Preview discovery returned no URL. Complete task 3.3 at this maintenance gate only; creation remains disabled and complete customer hosted acceptance remains pending.

- **2026-10-04** — The user asked to verify only at the end. Finish remaining implementation and test fixtures before a single combined focused-check/Source-and-Cloud maintenance/staging checkpoint; stop per-slice approval/deployment requests. This supersedes the earlier per-milestone maintenance cadence, not the exclusion of new provider resources, tokens, sign-ins, billable trials or production publication. Keep new bindings/subscriptions/configuration inactive and creation disabled; request one concrete final deployed-check approval only after the complete result is reviewable. Full live acceptance and enablement remain separate explicit decisions.

- **2026-10-04** — Bind the small Source/Cloud delivery adapter through one project-private `POST /api/hosted/projects/:id/delivery` endpoint, existing verified bearer/current identity and bounded candidate/status/approve/recover actions. Verbs retain archive/spec/commit responsibilities and register the exact candidate before its ordinary Artifacts push. Native previews expose their actual immutable deployment identity and owned Worker; the reviewed native API does not establish a separate production Worker version ID, so do not fabricate one. Production receipts keep their real version and deployment IDs. Reuse immutable existing resource/candidate/publication facts before adding schema or another service. Remaining checks are deferred until the complete implementation is prepared.

- **2026-10-04** — Automatic authenticated live observation needs a project-specific machine identity: the existing owner-email Allow policy cannot authorize the platform’s service request. Prepare only the documented Access service token and Service Auth policy for that same Worker, preserving the owner policy, with exact owned receipts, sealed finite credentials and single-attempt uncertainty retention in minimal additive setup fields. Existing applied migrations remain frozen. This is code preparation, not credential issuance or resource authorization. Require verified unexpired observation authority before production deployment; no missing-authority deployment or renewal broker. The final concrete staging checkpoint will identify any additive columns, while actual grants/policies remain in the later separately approved live inventory. [Cloudflare service-token documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/) requires Service Auth, including strict-mode behavior; the existing signed Worker Access guard already accepts verified service identities.

- **2026-10-04** — Keep final repository acknowledgment on the existing Source Git path after Cloud has independently recorded the provider deployment and authenticated live identity/assets. The SDK ordinary runner exposes a project read credential, not a write selector; do not inject broad management authority or build a broker to compensate. Source uses its already scoped Git grant for an exact normal fast-forward main push with expected-old pre-push enforcement, then requests Cloud bounded readback/acknowledgment of that same publication. An already matching remote head recovers by readback only. Offline/expired Source remains deployed-awaiting-confirmation, never published, and blocks another change. Builds, checks, native previews and provider deployment all remain on Cloudflare.

- **2026-10-04** — Fetched current Source main `932439b` (published v30.3.0) and merged it normally into the existing feature branch at local `fb719c6`, preserving the prepared hosted delivery changes. Published upstream memory and company-action changes remain upstream behavior; this change adds no Memory/Devices migration, enrollment or billing work. No push, checks, staging deployment or hosted provider action accompanied this preparation. Verify the integrated result only at the combined final checkpoint.

- **2026-10-04** — Completed the user-requested combined focused verification: 89 Source cases, 487 Cloud cases with unchanged seven-module 100% coverage, and 12 ordinary pipeline script cases. Exact Source/Cloud type, lint, payload, context and validation evidence is retained in the final checkpoint records. Keep remaining tasks unchecked pending normal maintenance CI; request only one final approval for the complete prepared commits and existing staging actions, explicitly including the eight additive Cloud columns. No live hosted resource, credential, sign-in, trial, production publication or enablement is authorized by this preparation.

- **2026-10-04** — The user authorized pushing complete Source `b94bd6405b74db08883f1ac188806733a6a35a9f` and Cloud `b54a885512aeafb6dbb39fbeded44559fa6d2635` and one combined final normal CI/staging checkpoint, including existing Workers/database checks, Source branch preview/generated-starter test/build and additive Cloud migration 0021. Both pushes succeeded. Existing staging resources only; no live Artifacts resources, credentials, sign-ins, starter deployment, trial or production publication are authorized.

- **2026-10-04** — Source's first full payload CI found two starter preparation failures because current upstream company discovery/login-link routes were inserted between the signed-access denial block and the old adjacent preview-comment anchor. Narrow the required exact-one anchor to the complete unchanged denial block and insert identity immediately after it. Preserve current upstream routing byte-for-byte; missing/duplicate anchors still fail. All seven affected starter script cases and syntax/selected lint pass. Full generated starter test/build remains in the authorized CI rerun, with no local app build or starter deployment.

- **2026-10-04** — Source repair `33773b5` passed all 1,148 script cases, then ordinary generated-starter lint reported `fetch` complexity 23 against unchanged maximum 21. Factor the identical existing open-workspace predicate into a typed generated helper to make room for the compiled identity route while keeping the full signed-access denial block and upstream routing. Preserve strict exact-one transformation anchors and add generated signed/unsigned/method/stale-open-switch coverage; do not raise the limit or add exclusions. Cloud's final evidence head `6b20efe8db3960ba23c73c09012f96108c5d3d24` passed complete maintenance CI/staging with no remaining migrations; live hosted acceptance remains pending.

- **2026-10-04** — Source repaired head `3de4694fdd872eada9e9f5332d3b8c7c7bb9f074` passed [Test](https://github.com/matthewwong525/WongStack/actions/runs/37207060305), [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37207060315) and [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37207060278), with settled exact-head SUCCESS. All 1,148 script cases pass above unchanged coverage floors; full generated starter install/type generation/test/build and compiled configuration/identity/assets checks pass without deployment. Source app tests, payload/release/wiki/context checks and the exact branch staging preview pass. Together with Cloud's final recorded passing gate, complete implementation/maintenance tasks 4.1–5.2. Two narrow Source repairs and one Cloud documentation repair were required. Keep 6.1 incomplete for compatible published starter/agent/runner identities and 6.2/6.3 incomplete for separately authorized live acceptance/cleanup; creation remains disabled and no publication/merge is authorized by this checkpoint.

- **2026-10-04** — The user invoked `/ship`, then explicitly selected “Ship disabled implementation; retain live follow-up.” Narrow this release to the tested code and normal Source/Cloud production deployments, including Cloud record migrations 0019–0021. Move original unfinished tasks 6.1–6.3 verbatim into `live-acceptance-follow-up.md`; do not mark them complete or fabricate acceptance. This deliberate scope change supersedes the earlier requirement to finish the real app trial before shipping this code, while preserving that complete journey as a condition of later enablement. No new hosted resource, credential, sign-in, billable trial, starter publication or managed-creation enablement is authorized. Archive only the completed implementation tasks and keep creation/delivery/observer controls and new provider bindings inactive.

- **2026-10-04** — Archive checkpoint for the explicitly approved disabled implementation release: all 13 current-scope tasks are complete, original 6.1–6.3 remain unfinished in `live-acceptance-follow-up.md`, and delta requirements exactly match reconciled main specs. Number the Source release 30.4.0 from current main 30.3.0, then gate this exact archive checkpoint before merging. No live Artifacts acceptance or enablement is implied.

<!-- end proposal.md -->
<!-- file design.md utf8 24117 -->
# Design

## Context

See [the proposal](proposal.md) for the intended customer journey. Planning started on freshly fetched Source main `ff05dde00fb1b7ac7de467bcf5fe9adac4b68178`; Cloud main was inspected read-only at `4bb0082ea93f0d11b94e296e4d0e615901485156`. These are observations, not future deployment pins.

Current Source setup assumes GitHub: the unattended installer provisions memory and GitHub secrets, and the delivery verbs use GitHub PRs. Current Cloud main already provides email sign-in, workspace VMs, Paseo and customer AI sign-in terminals. Its new-project dashboard still asks for GitHub and the customer's Cloudflare token. Preserve that route for existing GitHub projects and explicit GitHub choices.

The same-repo work check found the canceled Artifacts workspace and separate memory and coordination work. The user supplied the canceled owner's responsibility boundary: history/cleanup there, this fresh plan here. Neither canceled branch is a prerequisite. Do not copy its implementation, touch its frozen evidence, or pull Memory/Devices into this change.

Implementation started after the user's `/apply`. Before shared Source work, the save stage advanced this checkout to current main `02542fa2a8c4eb8a64266cacebee00987579564d`, preserving the shipped discovery-only independent-chat behavior. The Cloud companion checkout starts at current main `fb2d6fc1f8866af6ab805dcd392ceb6ce908fb58`, preserving its newly shipped GitHub/existing-server repairs. The first SDK checkpoint is [Cloud #70](https://github.com/matthewwong525/wongstack-cloud/pull/70); it has no new runtime binding, subscription, migration or enabled managed project. Later Cloud tasks extend that companion, without reviving #65.

The sanitized wh1007 evidence was read with the supplied SHA256 verified. It establishes a publication failure after provider deployment, not accepted publication or next-change behavior. No private Workflow records or credential files were read.

## Goals / Non-Goals

**Goals of this release:** ship the tested setup and delivery implementation with managed creation disabled. The separately authorized follow-up must establish that one new hosted project can be bootstrapped, edited by an AI, checked remotely, privately previewed and published twice. All customer project storage and hosted execution use Cloudflare; the workspace VM remains the existing AI editing environment. Repeated setup and delivery steps are deterministic.

**Non-goals:** see the proposal. In particular, this is an HTTP/static starter, not a full memory-ready personal WongStack installation. Copy the shipped workflow/knowledge payload and record its source, but do not provision a memory store or add memory readiness to hosted setup. Existing memory code and personal installation behavior remain separate. Do not modify billing or device enrollment to manufacture a test account.

## Decisions

### 1. Supported architecture and alternatives

Primary documentation checked on 2026-10-03:

| Approach | Documented support | Fit for this delivery |
| --- | --- | --- |
| Artifacts + native Workers Builds | Builds directly from Artifacts, `main` production, native branch previews; setup guide uses the dashboard | Smallest eventual architecture, but automatic connection is not yet established by the public API contract |
| Artifacts + official CI SDK Workflow | Artifacts push events start the SDK pipeline; SDK runners execute normal shell entry points; Workflows, Containers/DO and R2 support the runners | Selected: documented automatic route, with small platform glue and native Worker Previews |
| Artifacts + platform GitHub Actions | A private platform workflow could be dispatched without customer GitHub accounts | Rejected by the user: hosted execution must remove the GitHub workflow dependency |
| Build/deploy on the existing AI VM | Ordinary Git and Wrangler could be run there | Rejected as the delivery gate: couples checks and publication to the editing machine and its credentials |
| Bespoke packing, Worker loader, snapshot transport and publisher | Would require custom contracts and recovery machinery | Out of scope; the provider SDK owns runner snapshots/cache and Wrangler owns deployment |

Cloudflare's [Artifacts integration guide](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/artifacts-integration/) documents dashboard setup. Its [connection API](https://developers.cloudflare.com/api/resources/workers_builds/subresources/repos/subresources/connections/methods/upsert/) still enumerates GitHub, GitLab and Origin, without an Artifacts provider. Do not infer that `origin` means Artifacts, use a dashboard-internal API, or treat generic trigger creation as proof that the initial connection is supported.

The selected recipe is [build and deploy on push](https://developers.cloudflare.com/artifacts/guides/build-and-deploy-on-push/): one namespace subscription starts the supported CI SDK Workflow for a pushed repository, branch and commit. Use the SDK template and its normal runner command interface. Containers execute build commands; they do not serve the customer's preview. The [Workflows product](https://developers.cloudflare.com/workflows/) supplies durable execution, not a shell by itself.

### 2. Keep the platform integration small

Add the CI SDK Workflow and its documented runner/cache bindings to the existing Cloud service, with a small dedicated module and fixed trusted command entry points. Do not build another control service, custom runner scheduler, arbitrary command endpoint, registry, credential broker or publication reservation service.

Use the existing Cloud database for only the necessary records:

- Project: owner/workspace IDs, provider (`github` or `artifacts`), authoritative Artifacts account/namespace/repo/remote, pinned template identity, target Worker ID, Access app/policy IDs, setup phase and exact owned-resource receipts.
- Candidate: branch, base/head SHAs, SDK Workflow instance ID, check/build outcome, native Preview/deployment ID and immutable URL.
- Publication: operation ID, approved candidate SHA and expected main SHA, provider receipt, identity observation, repository acknowledgment and final state.

Allow one in-flight setup/publication and one active candidate per project, using an atomic condition on these existing records. Set operation and runner timeouts. A timed-out or ambiguous operation remains incomplete and inspectable; retry status/readback, not an uncertain mutation. Do not append a generic recovery engine.

### 3. Bootstrap with ordinary Git and an existing workspace

Seed a new project from a reviewed, immutable hosted starter in Artifacts. The public Source repository stays on GitHub; a release preparation step stages the starter in Artifacts once. Customer setup and every build must then use that pinned Artifacts source without fetching GitHub or dispatching GitHub workflows. Preserve the selected source identity in the install record; never substitute a canceled branch or an unreviewed template.

The hosted template uses the existing app scaffold, with no memory or business database binding and no background bindings. Its memory routes receive no memory credentials or provisioned store; do not report them ready. Native Preview configuration and Access are the only hosted app configuration needed for this first delivery. Keep compatibility payload files if needed, but never execute GitHub workflows on this route.

The trusted host bootstraps the ordinary Git checkout as the workspace user through a new, explicitly negotiated hosted job. Reuse the existing payload copy/install-record and Paseo setup helpers, without calling the personal provisioner's memory/GitHub-secret steps. Set the git author from the existing verified owner identity; request no GitHub sign-in. Configure repo-scoped Git access privately outside tracked content, using the exact remote returned by Artifacts. [Artifacts authentication](https://developers.cloudflare.com/artifacts/guides/authentication/) distinguishes Git tokens from Cloudflare management tokens.

A retry checks the recorded target and existing checkout before acting and opens the same project. `/wong-setup` detects a verified private hosted handoff or an Artifacts origin before its personal flow. An origin or committed marker identifies the possible route but grants no authority: missing trusted context stops with reconnect guidance. Contract 4 does not support this bootstrap; Source and Cloud negotiate the new job before dispatch, preserving existing contract-4 jobs.

### 4. One check implementation, normal build commands

Extract only the portable test-suite discovery, whole-change comparison and existing quality checks into one shared entry point in the payload. Preserve current GitHub behavior: docs-only semantics, no duplicate suite execution, loosened-check detection, wiki checks, and independently deployable staging on a red test. Supply base/head/default-branch context explicitly; do not read the platform repo's `GITHUB_*` values as customer project context.

The hosted SDK pipeline invokes the same files and the app's existing test/build scripts. Keep Actions YAML as a thin wrapper on the GitHub route. No translated GitHub workflow interpreter, copied check list, live test runner on the AI VM or new root app manifest.

Pin the SDK/template, Wrangler and lockfile used for the hosted path at implementation time after checking their supported interfaces. Pass ordinary script paths and arguments into runners. Do not serialize functions or bundle closures with `function.toString()`; a meaningful boundary test executes the actual generated command contract with hostile names and a clean environment.

Candidate install/test/build steps get no platform-management, Access-write, publication or cross-project secrets. Use the SDK's supported checkout, snapshots and runner handoff. A trusted final deployment step validates the recorded Worker/config and uses the supported Wrangler entry point on compiled output, without rerunning candidate install/build hooks under deployment credentials. Do not expose account-wide secrets to arbitrary customer commands. Confirm the SDK supports this boundary before implementation proceeds beyond its integration contract; if it does not, report the gap and revise the plan instead of adding a custom packing/transport layer.

### 5. Native Worker Previews, without app containers

Use `wrangler preview`, not a custom fetch wrapper, Worker loader or container URL. [Native Previews](https://developers.cloudflare.com/workers/previews/) require project Wrangler 4.135.0 or later, do not inherit production settings, and provide both a moving branch URL and an immutable deployment URL. Record the latter for exact-change review, from actual provider output/readback.

Keep native `previews` configuration on the new hosted starter only. Do not convert existing GitHub installations' `env.staging` or version URLs. Top-level assets remain native assets; the [configuration guide](https://developers.cloudflare.com/workers/previews/configuration/) says the preview uploads the branch's assets. The app is limited to HTTP and static assets, avoiding D1 migration and queue/cron semantics in this delivery. Later data support must use separate resources; [preview resource isolation](https://developers.cloudflare.com/workers/previews/resources/) does not automatically isolate D1, KV or R2.

Protect the exact project Worker before uploading business content. Use its provider Worker ID, verified owner-email policy and a separately owned project-specific Service Auth identity for automated observation, with the documented `worker` Access destination for production and previews; avoid an account-wide allow policy. [Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) supports these destinations. Empty placeholder creation may establish a Worker ID before protection, but serves no customer content. Validate both policy readback and unauthenticated denial for assets/API/immutable preview. No open-install fallback on this hosted route. Customer human-login verification is distinct from machine verification and requires their participation when eventually authorized.

### 6. Exact-change publication using the same supported pipeline

Hosted `/apply` can request a remote preview; `/save` checkpoints a candidate branch and waits for its SDK check result, without a GitHub PR. `/continue` retains the same change and checkout. The normal plan, archive/spec reconciliation and record-maintenance responsibilities remain with the existing verbs; the adapter changes transport and gate lookup only.

Use one active OpenSpec code change per candidate branch. Record the actual branch in the proposal (its name need not match the change slug); the authoritative candidate links the change slug, branch, base/head SHAs, checks, preview and approval. Save the change files with their implementation and resume by the recorded branch rather than guessing from its name. The existing workspace/chat supplies the change summary, diff review and preview; do not add a PR dashboard, threaded comments or reviewer assignments. [Artifacts Git support](https://developers.cloudflare.com/artifacts/api/git-protocol/) supplies normal commits/refs; [Cloudflare's product explanation](https://blog.cloudflare.com/next-git-platform-on-cloudflare/) places review/merge workflows above those primitives. No native PR service is established by the documented API.

Finish archive/spec reconciliation and other tracked metadata edits before the final candidate checkpoint, checks, preview and approval. Any later commit invalidates that approval. The published and acknowledged SHA includes the final change record; do not manufacture an archive commit after approval or silently approve a different head.

Approval records the project, passing head SHA, expected main SHA and immutable Preview identity. Use a reserved release ref carrying that same SHA to start the ordinary Artifacts push pipeline for publication; the provider event is documented, so no assumed custom SDK event shape is needed. The trusted publication path creates the release operation/ref only after approval. An arbitrary main/release-ref push without the matching recorded approval never causes a production deploy. Repo-scoped write tokens are not branch-scoped protection; enforce this production rule in the trusted Workflow, not by claiming the Git token protects main.

The release run verifies the approved refs and reruns required checks for its exact SHA, builds the production configuration, then publishes through ordinary Wrangler. A passing preview approves source behavior; it does not prove the production configuration, which is checked separately. This deliberately permits one rebuild for release rather than inventing cross-environment bundle promotion.

Keep three facts separate:

1. Immutable provider receipt: account/project/Worker, SDK run, approved source SHA, Worker version and deployment IDs returned by publication and confirmed by provider readback.
2. Identity observation: an authenticated live request serves the expected project/SHA and expected assets. Stamp identity during the ordinary trusted build, not with a custom runtime wrapper. Bounded propagation/readback can remain pending without redeployment.
3. Repository acknowledgment: only after (1) and (2), the existing Source Git path advances `main` to the exact approved SHA by normal fast-forward with expected-old pre-push enforcement, then Cloud reads back the exact remote head and records that acknowledgment. Ref changes use an expected old head and reject concurrent changes; never force-push or rewrite the workspace checkout.

The private publication record reaches `published` only when all three agree. If deployment succeeds but identity or repository acknowledgment fails, retain `deployed-awaiting-confirmation`, show incomplete publication, and recover by readback of that same operation. No second deployment, new approval/ref, automatic reservation clearing or fabricated success. A failed final record acknowledgment retries the same bounded record after independent readback.

A later candidate starts from the confirmed main. This narrow rule requires candidates to be fast-forward descendants of recorded main; if main changed, refresh the candidate and checks and request fresh approval. Do not add general merge resolution or a PR system.

## UX

### Use-case brief

The hosted owner wants to begin working with their AI without managing provider accounts. Done means the project opens in the familiar workspace and has a working protected site. Reuse Cloud's `Dashboard`, `Step`, `Card`, `PairPanel` and AI sign-in guidance. Assume setup is performed infrequently, often from a phone; operators inspect failures from a desktop. The common case is a new managed project; selecting GitHub is a secondary explicit choice, and existing projects keep their current cards.

### Flow

Existing email sign-in/service access → Start project using the recorded project identity → existing setup card → existing workspace/AI sign-in flow. Setup loading, safe retry/support and ready states stay in the same card. The person reviews change previews and approves publication through the existing chat/verbs; create no additional publish dashboard in this delivery.

### Hierarchy

Start project is the sole primary action on the creation card; Use GitHub is quieter. Loading has no competing action. Retry setup is primary on a known safe failed setup; uncertainty is support/status-only, never a mutation retry button. Open workspace is primary when ready; Open site and documentation are secondary. A later setup failure never advertises automatic sign-in or readiness it has not verified.

### Components

Modify the current Cloud setup cards rather than adding a repository browser. Retain native form controls, existing validation and accessible status text. Add only the provider-choice state and the project setup status projection. The current AI sign-in instructions remain user steps, not automated actions.

### Review

[review.html](review.html): What Changes item 1 sketches creation before/after; item 5 sketches loading, failed and ready dashboard states, phone-first. Items 2–4 explain workspace, CI and publication without adding screens.

## Dependencies and acceptance

The planning phase created no credentials or provider resources and performed no live checks. The later `/apply` starts implementation, which must first establish, using the official SDK and protocol fixtures, its exact checkout, runner credential boundary, compiled-output handoff, result schema and finite cleanup contract. Task-driven maintenance checks must not silently deploy or provision new resources; inspect the maintenance workflow before dispatch. Live acceptance needs a separately authorized disposable inventory and budget, platform Paid/Zero Trust readiness, necessary permissions and source/Cloud deployment pins. The current [Artifacts pricing](https://developers.cloudflare.com/artifacts/platform/pricing/) requires Workers Paid; do not start a trial or create tokens to satisfy this dependency.

Required deferred live acceptance before enablement, all on fresh non-canceled resources (see [the unfinished follow-up](live-acceptance-follow-up.md)):

| Case | Evidence required |
| --- | --- |
| New managed project | No customer GitHub/Cloudflare token or dashboard step; exact repo/template/Worker receipts; one checkout and Paseo project on retry |
| Real AI edit | Person-approved AI sign-in, ordinary edit/commit/push on Artifacts; no provider sign-in; source identity preserved |
| Shared checks | Same check files on both routes; code under an earlier docs commit still tested; docs-only handling preserved; deliberately red hosted candidate cannot publish |
| Private preview | Native immutable deployment URL bound to exact passing SHA; expected HTML/static asset and API response; unauthenticated requests denied |
| Approval | Missing approval, changed candidate/base or foreign project cannot deploy production |
| Publication and recovery | Provider deployment, live identity/assets and main acknowledgment all agree; injected failure between them stays incomplete and retries only readback/ack |
| Second change | Branch from confirmed main, checks, new private preview and second approval/publication succeed |
| GitHub compatibility | Existing setup, personal provisioning, PR checks/preview discovery and merging remain covered in Source/Cloud CI; no repo migration |
| Teardown | Exact project/preview and SDK-owned trial resources removed or explicitly retained by approval; scoped trial grants revoked; absence readbacks and leftovers reported |

CI for the Source/Cloud implementation still follows each maintenance repository's existing GitHub gate. Those gates do not replace the real hosted acceptance above and are not part of customer-project execution. A customer-owned AI sign-in and any billable trial need separate later authorization; no prior canceled approval carries over.

## Risks / Trade-offs

- [SDK integration is documented, but not proven in this fresh design] → Treat the credential/output boundary as a stop-before-expansion contract check; a documented recipe or green source CI is not live acceptance.
- [Automatic native Workers Builds connection remains a gap] → Do not promise it or build an undocumented client. Reconsider only when a supported Artifacts connection contract exists.
- [Build containers, R2 and Workflow bindings add platform resources] → Use only the official SDK's required runner/cache model, with timeouts and finite retention. No container-backed app/preview or separate custom transport bucket.
- [Preview is public by default and native URLs change] → Establish project-specific Access before content, read provider receipts, and use an immutable URL for review.
- [A production deploy can outpace durable publication acknowledgment] → Preserve independent receipts and an incomplete phase; recover the same operation without a new mutation.
- [New route would otherwise inherit personal memory/GitHub provisioning] → Separate the hosted starter bootstrap; retain shipped memory behavior and present it as unconfigured, not ready. This delivery does not import Memory/Devices code.
- [Cross-project or broad deployment authority] → Trusted config/target checks, clean credential-free customer commands and project-bound final deployment. Reject if the official SDK cannot maintain this boundary within the selected approach.

## Delivery and incremental follow-ups

Implement from the latest main of both repositories, under this new plan. Cloud changes are companion integration needed for this end-to-end delivery, not a revival of Cloud #65. Roll out only to new projects with the negotiated Source contract and a reviewed pinned starter; a failed contract/integration keeps managed creation unavailable with a clear service-side status, without falling into customer token setup.

This implementation release remains disabled. Its user-authorized ship includes normal Source/Cloud production deployment and Cloud record migrations; it does not complete the live acceptance. Release enablement follows the complete fresh acceptance in the unfinished follow-up. To roll back, disable new managed creation and keep already-created Artifacts repositories, grants and deployments available for status/recovery; do not migrate them to GitHub or delete customer work. Cleanup/decommissioning uses exact owned receipts and explicit authority.

Follow-ups, each requiring its own plan: (1) replace the SDK build path with native Workers Builds when automatic connection is supported; (2) add business D1 with separate staging resources and migration acceptance; (3) team access and more than one change; (4) custom domains and non-HTTP workloads. Memory/Devices remains its own workstream and is not an implicit prerequisite.

<!-- end design.md -->
<!-- file tasks.md utf8 6841 -->
# Tasks

The user invoked `/apply` and subsequently requested verification only at the end. Prepare the remaining implementation and its test fixtures first; defer focused verification, normal Source/Cloud CI and existing staging verification to one combined final checkpoint. Do not request or run intermediate deployed gates. Start from current main in each repository; never use canceled branches. The combined final checkpoint passed, and the user subsequently authorized `/ship` for the tested disabled implementation, including normal production deployments and prepared Cloud record migrations. Live Artifacts resources, credential issuance, customer sign-in, a billable trial and production publication remain separately unauthorized.

## 1. Cloud: establish the supported CI SDK boundary

- [x] 1.1 Pin the official SDK/template and record its supported checkout, command, output-handoff and cleanup contracts in the owning Cloud docs; verify the documented recipe and package interfaces support ordinary script entry points without custom packing or function serialization.
- [x] 1.2 Add boundary fixtures for the actual runner commands, credential separation, compiled-output handoff and provider result parsing, including hostile names and incomplete results; use `/save` for Cloud CI evidence. Stop and revise this plan if the SDK cannot keep customer commands free of deployment secrets or transfer output through a supported interface; do not expand the integration around that gap.

## 2. Source: shared checks and the hosted starter

- [x] 2.1 Extract the portable check entry point and make the existing GitHub test workflow invoke it; add fixtures for whole-change base/head comparison, suite discovery, docs-only changes and loosened checks, and verify at the final combined checkpoint that the existing GitHub gate and independently deployable staging behavior remain intact.
- [x] 2.2 Define the reviewed HTTP/static hosted starter with pinned dependencies, native Preview configuration and build-time project/SHA identity, retaining the normal app test/build entry points; verify starter/config fixtures reject business-data, memory and background bindings and that GitHub installations retain their existing staging configuration. Document its immutable Artifacts release preparation and source record; do not publish the starter without later authorization.
- [x] 2.3 Add the negotiated contract-5 hosted bootstrap and verified private handoff before personal onboarding, reusing payload copy/install records and workspace helpers; cover retry/reconnect, untrusted markers, contract-4 compatibility and absence of personal memory/GitHub provisioning at the final combined checkpoint. Update the owning install/server docs and add the payload's `CHANGELOG.md` Next minor entry, leaving `VERSION` unchanged; verify payload links and release checks.

## 3. Cloud: managed project setup and existing dashboard cards

- [x] 3.1 Add the minimal provider, project, candidate and publication records with atomic single-operation conditions, target ownership and exact resource receipts; test duplicate setup, cross-project requests and incomplete-operation readback at the final combined checkpoint, and document finite retention and recovery responsibilities in Cloud's owning docs.
- [x] 3.2 Implement deterministic Artifacts project creation from the pinned starter, repo-scoped private Git access, project-specific Worker/Access protection before customer content and the negotiated existing workspace bootstrap; verify recorded-target retry and partial failure behavior at the final combined checkpoint without adding memory, billing or enrollment steps.
- [x] 3.3 Reuse the existing dashboard creation/status cards for managed default, explicit GitHub, loading, safe failure and ready states; add UI coverage for phone layout, reconnect and uncertainty without a mutation retry, plus existing GitHub onboarding regression checks at the final combined checkpoint. Update the customer setup guidance to describe the account-free hosted route and existing AI sign-in steps.

## 4. Cloud: one SDK pipeline and native Worker previews

- [x] 4.1 Wire the documented Artifacts namespace push subscription to the SDK Workflow, shared checks and ordinary app build commands with explicit repository/base/head context; cover foreign targets, duplicate events, red candidates, finite timeouts and credential isolation at the final combined checkpoint. Document the required SDK bindings and bounded runner/cache retention without introducing another control service.
- [x] 4.2 Add trusted native Preview deployment of passing compiled output, project configuration validation and exact immutable URL/Worker/deployment receipt recording; cover missing provider receipts and target mismatches at the final combined checkpoint, and document project-specific Access and preview configuration. Live denial/HTML/assets/API verification remains in the later authorized acceptance task.
- [x] 4.3 Add the approved release-ref path to this same pipeline, ordinary production checks/build/deploy, independent provider and live-identity observations, then exact fast-forward main acknowledgment; test stale/missing approvals, changed bases, arbitrary main pushes, injected failures between all three facts and recovery without redeployment at the final combined checkpoint. Document the incomplete publication state and bounded readback/acknowledgment procedure.

## 5. Source: hosted delivery adapter and payload guidance

- [x] 5.1 Add the small hosted adapter for checkpoint, check-result lookup, private preview, exact approval, publication status and continuation; link it from the existing delivery verbs without changing their planning/archive responsibilities. Cover one change/branch binding, resume with differing names, archive/spec edits before final approval, authoritative private context, exact candidate/base identity, unavailable gate and GitHub PR/check/merge compatibility at the final combined checkpoint.
- [x] 5.2 Update the owning change-loop, hosting and install guidance for the two explicit routes, the hosted starter's limits and truthful pending publication; verify skill links, payload conventions, context budgets and the release entry at the final combined checkpoint. Keep personal setup, existing GitHub repos and Memory/Devices outside the hosted implementation.

## Deferred live acceptance

The user explicitly moved former tasks 6.1–6.3 outside this disabled implementation release. They remain unfinished in [the live follow-up](live-acceptance-follow-up.md); none was marked complete. Compatible published starter/runner/agent pins, a complete real app journey and exact cleanup still need a separately planned and authorized follow-up. Shipping this implementation keeps managed creation disabled.

<!-- end tasks.md -->
<!-- file specs/cloudflare-hosted-projects/spec.md utf8 9206 -->
# Cloudflare hosted projects

## Purpose

Give a new hosted customer an ordinary project their AI can edit and a working small site, with project storage, checks, previews and publication on the platform's Cloudflare account and no customer provider accounts.

## ADDED Requirements

### Requirement: Managed storage is the default for new hosted projects

When managed creation is separately enabled, a new hosted project SHALL use platform-managed Artifacts unless the owner explicitly requests GitHub. Its setup SHALL require no customer GitHub or Cloudflare account, provider credential, provider dashboard visit or operator dashboard connection. Existing GitHub projects and explicitly selected GitHub projects SHALL retain their normal setup and delivery route, without migration.

#### Scenario: Owner starts a new hosted project

- **WHEN** an eligible signed-in owner starts a new hosted project without choosing GitHub
- **THEN** the service sets up managed project storage and hosting automatically and reports their separate readiness without asking for provider accounts

#### Scenario: GitHub is already selected

- **WHEN** a project already uses GitHub or a new project's owner explicitly selects GitHub
- **THEN** its setup, pull requests, checks, preview discovery and merging retain the normal GitHub behavior

### Requirement: Managed creation stays disabled pending live acceptance

The prepared implementation SHALL keep new managed project creation disabled and provider execution bindings unconfigured until a separately authorized complete live acceptance and enablement decision. Shipping the implementation alone SHALL NOT activate customer provisioning or imply that the live journey passed.

#### Scenario: Managed creation is disabled

- **WHEN** the managed route has not completed live acceptance and remains disabled
- **THEN** starting a workspace creates no managed repository, hosting resource or provider credential, while the existing GitHub route remains available

### Requirement: Hosted setup preserves the project and its source identity

Hosted setup SHALL create one project from a reviewed pinned template and record its actual source identity. It SHALL supply an ordinary Git checkout to the existing AI workspace, retain the existing AI sign-in steps, and reuse that same project after reconnect or a partial retry. It SHALL NOT overwrite unrelated work, replace a chosen source silently, automate customer AI sign-in or declare memory ready without a configured store.

#### Scenario: Setup is retried

- **WHEN** a setup stopped after creating the repository or registering the workspace
- **THEN** retry verifies and reuses those same owned resources and preserves any customer work

#### Scenario: The template cannot be verified

- **WHEN** the selected template or recorded project identity cannot be verified
- **THEN** setup stops with a recoverable status and does not substitute a different template or target

### Requirement: Hosted execution has no GitHub runtime dependency

Hosted project checks, builds, previews and publication SHALL execute on Cloudflare using the same portable check implementation as the GitHub route. Customer project setup and delivery SHALL NOT dispatch GitHub workflows, require GitHub authentication, fetch their template from GitHub at runtime or run the delivery gate on the AI editing machine. The public Source and existing GitHub maintenance routes SHALL remain supported.

#### Scenario: A hosted candidate is saved

- **WHEN** the AI saves a candidate to its Artifacts project
- **THEN** Cloudflare runs the required checks for that exact candidate with explicit project/base/head context and reports their result

#### Scenario: An earlier code change is followed by documentation

- **WHEN** the latest candidate commit changes documentation but an earlier unmerged candidate commit changes app code
- **THEN** the shared check evaluates the whole change and runs the app suite, preserving GitHub's existing semantics

### Requirement: Business content and exact previews stay private

The hosted starter SHALL support HTTP and static assets with no required memory or business database setup. Production and native preview content SHALL require the recorded owner's authorized access before business content is uploaded. The review URL SHALL identify the exact candidate deployment, with expected app assets and API behavior, and SHALL NOT be constructed from a naming convention or replaced by an earlier or moving preview.

#### Scenario: Exact candidate preview is ready

- **WHEN** a passing candidate has a verified native preview deployment
- **THEN** its immutable URL and provider identity are reported for that candidate, while unauthenticated requests to its HTML, static assets and API are denied

#### Scenario: Protection is incomplete

- **WHEN** the project's protection or deployment identity cannot be verified
- **THEN** the service keeps the project incomplete and publishes no unprotected business content or misleading preview link

### Requirement: Publication requires approval of the passing candidate

The hosted route SHALL publish only an owner-approved, passing candidate belonging to that project, with the recorded expected main head. A changed candidate or main head SHALL require refreshed checks and approval. An arbitrary repository push without a matching valid publication approval SHALL NOT deploy production. The first delivery SHALL allow only one active candidate and one publication at a time per project.

#### Scenario: A stale approval is presented

- **WHEN** the approved candidate SHA or expected main SHA differs from authoritative repository state
- **THEN** publication is refused before a production mutation and the owner receives the changed-state explanation

#### Scenario: A push lacks approval

- **WHEN** a main or release ref is pushed without the project's matching recorded approval and passing checks
- **THEN** no production deployment starts

### Requirement: Published means provider, live identity and repository agree

Hosted publication SHALL retain separate immutable provider deployment evidence, authenticated live project/source identity, and authoritative repository acknowledgment of the exact approved SHA. It SHALL report `published` only when all three agree. A failure after provider deployment SHALL remain explicitly incomplete and recover the same operation by bounded readback or acknowledgment, without redeploying, force-pushing, deleting customer work or inventing a success receipt.

#### Scenario: Deployment succeeds but acknowledgment fails

- **WHEN** the provider deployed the approved source but live identity or repository acknowledgment is absent or mismatched
- **THEN** publication remains incomplete, reports the verified deployment separately, and retries only confirmation of that operation

#### Scenario: A second change is made

- **WHEN** a publication completed with all three facts confirmed and the owner requests another change
- **THEN** the new candidate starts from that confirmed main and can complete checks, a new private preview and its own approved publication

### Requirement: Platform authority is isolated from customer commands

Customer installation, test and build commands SHALL receive no platform-management, protection-management, publication or cross-project credential. Only a trusted project-bound publication stage SHALL receive its necessary deploy/repository authority, without rerunning customer preparation hooks with that authority. Repository markers and URLs SHALL NOT grant authority or permit cross-project operations.

#### Scenario: Customer code requests another project's target

- **WHEN** customer configuration or a delivery request names a different project's Worker, repository or protection resources
- **THEN** the trusted route refuses before mutation and exposes no other project's credentials

#### Scenario: Untrusted preparation runs

- **WHEN** a customer's dependency scripts, tests or build execute
- **THEN** their environment lacks platform and publication credentials, and their output cannot change the authoritative deployment target

### Requirement: Operations have bounded uncertainty and finite cleanup

Hosted setup and delivery SHALL retain exact owned-resource identities and bounded outcomes. Uncertain mutation outcomes SHALL require readback before retry or cleanup. Cleanup SHALL remove only recorded owned resources and grants within its authorized inventory, retain protection while content can still serve, and report verified absence or explicit leftovers. A later acceptance trial SHALL require fresh authorization and SHALL NOT inherit canceled trial approval.

#### Scenario: Creation response is lost

- **WHEN** a creation may have succeeded but its response is unavailable
- **THEN** the operation remains uncertain until ownership/readback resolves it and does not create or delete another resource on a guess

#### Scenario: Authorized cleanup is incomplete

- **WHEN** an owned trial resource or scoped grant cannot be confirmed absent
- **THEN** cleanup reports the exact leftover and does not claim complete teardown

<!-- end specs/cloudflare-hosted-projects/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 6588 -->
## MODIFIED Requirements

### Requirement: The gate is CI when present, else PR review

For a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.

For a verified managed Artifacts project, `/ship` SHALL use the mandatory exact-candidate Cloudflare check result and the approved publication contract defined by `cloudflare-hosted-projects`; no GitHub pull request or absent GitHub check SHALL count as its gate. A failed, timed-out or unreadable hosted gate SHALL stop publication.

#### Scenario: Checks fail on the branch

- **WHEN** a pushed commit's checks fail
- **THEN** the skill reads the failure and pushes a fix, at most three times
- **AND** `/ship` merges only once the checks pass

#### Scenario: The repo has no checks

- **WHEN** the repo has no CI workflow
- **THEN** `/save` reports `NONE` and `/ship` merges on PR review

#### Scenario: Hosted checks are unreadable

- **WHEN** the Cloudflare check result for the approved hosted candidate cannot be read
- **THEN** publication stops unverified and no GitHub fallback is used

### Requirement: The gate reads the pushed commit

The check wait on every route SHALL report on the commit just pushed and no other. For the GitHub route it SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.

For the managed Artifacts route, mandatory checks SHALL never be treated as absent; missing or foreign-run results SHALL be unreadable rather than successful.

#### Scenario: The previous commit was green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS`

### Requirement: Save checkpoints and never merges

For GitHub repositories, `/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.

For a verified managed Artifacts project, `/save` SHALL commit and push the candidate branch, maintain the same change record, wait for its exact Cloudflare gate and report its verified preview without a GitHub PR. On every route `/save` SHALL NOT merge, publish production, force-push or bypass hooks, and live credentials SHALL stay out of tracked content and reports.

#### Scenario: A normal save

- **WHEN** `/save` runs on a branch with an active change
- **THEN** the pull request shows the current Status and checklist, and the report ends with one gate result

#### Scenario: A hosted checkpoint

- **WHEN** `/save` runs on a verified managed Artifacts project
- **THEN** the candidate and change record are saved and the Cloudflare check result is reported, without creating a GitHub PR or publishing production

### Requirement: Git verbs check their preconditions first

For GitHub repositories, `/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as "no PR".

For a managed Artifacts project, those verbs SHALL instead verify the private hosted handoff, project identity, authorized remote and applicable Cloudflare status before a mutation; a missing or invalid handoff SHALL stop with reconnect guidance rather than request a GitHub or customer Cloudflare sign-in. An Artifacts origin or committed marker SHALL NOT establish authorization.

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh` is not signed in
- **THEN** it stops before the push and says to run `gh auth login`

#### Scenario: Hosted authority is missing

- **WHEN** a checkout identifies Artifacts but has no valid private hosted handoff
- **THEN** the verb stops before mutation with reconnect guidance and does not use personal setup

### Requirement: Every file edit takes the same route

Every save that changes a GitHub repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

Every save that changes a verified managed Artifacts project SHALL take the candidate branch, change review and exact Cloudflare gate defined by `cloudflare-hosted-projects`, whatever paths it changes; the provider SHALL NOT alter plan, archive or wiki conventions. Facts-only saves SHALL make no repository mutation on either route.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

### Requirement: Ship deletes the branch only after a confirmed merge

For GitHub repositories, `/ship` SHALL merge exactly the gated commit, confirm the merge, and retarget every open pull request based on the branch to the default branch before deleting it. When the merge fails, or the dependent pull requests cannot be listed, it SHALL keep the branch; a branch the forge already deleted SHALL be reported as deleted at merge, not as an error.

For managed Artifacts projects, `/ship` SHALL preserve the candidate/release refs until the approved publication and exact main acknowledgment are confirmed. A pending or failed publication SHALL retain its refs and evidence; deletion after success SHALL not erase the immutable publication receipt or customer history.

#### Scenario: A stacked pull request

- **WHEN** an open pull request uses the merged branch as its base
- **THEN** it is retargeted to the default branch before the delete, and the report names it

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 4241 -->
## MODIFIED Requirements

### Requirement: Setup readies the computer before it writes anything

For personal setup, before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged.

Setup SHALL recognize a verified private hosted context or an Artifacts origin before entering personal setup. A verified hosted project SHALL reuse its existing workspace tools and verified owner identity without customer GitHub authentication. A claimed hosted project lacking private authority SHALL stop with reconnect guidance; a committed marker or remote alone SHALL NOT grant access.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

#### Scenario: The helpers come with the one question

- **WHEN** setup runs where the browser tool and the tunnel tool are absent and the person says yes to its install question
- **THEN** both are installed, and no later step asks to install either

#### Scenario: A helper fails to install

- **WHEN** the browser tool or the tunnel tool fails to install during setup
- **THEN** setup names it, says it will be offered again at first need, and continues

#### Scenario: Artifacts checkout has no private handoff

- **WHEN** setup sees an Artifacts origin but cannot verify its hosted authority
- **THEN** setup stops with reconnect guidance before requesting personal provider sign-in or writing elsewhere

### Requirement: Setup waits for the Cloudflare token

Personal setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no token, it SHALL stop, write nothing, and say that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

A verified platform-managed Artifacts project SHALL instead use platform-owned provisioning through its authorized hosted route, with no customer Cloudflare token request. Unavailable platform authority SHALL remain a hosted blocker rather than become personal setup.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the link that creates one

### Requirement: A finished install is complete and recorded

A completed personal install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit.

The separate hosted starter defined by `cloudflare-hosted-projects` SHALL retain the payload layout, wiki and ignore rules and actual pinned source record, but SHALL report only its established repository/workspace/site readiness. It SHALL NOT provision a memory store or claim a full memory-ready personal installation as part of this delivery.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

#### Scenario: Hosted starter completes

- **WHEN** the hosted starter establishes its project, workspace and protected site
- **THEN** those results are recorded with the pinned source and memory remains separately unconfigured without blocking that starter

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/server-agent/spec.md utf8 1225 -->
## MODIFIED Requirements

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 5. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`. Contract 5 SHALL identify the new hosted bootstrap contract described by `cloudflare-hosted-projects`. Contract 4 SHALL continue to identify the preservation/project-preparation contract and SHALL NOT imply implementation of Artifacts capabilities. A host SHALL dispatch the hosted job only to a peer whose negotiated contract supports it; existing GitHub and preservation jobs SHALL retain their compatibility.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 5, commit: "abc…", paseo: "up" | "down" }` and nothing else

#### Scenario: An older agent connects

- **WHEN** a server reports contract 4
- **THEN** the host retains its supported GitHub/preservation jobs and sends no hosted bootstrap job

<!-- end specs/server-agent/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-03

~~~
<!-- end .openspec.yaml -->
<!-- file final-checkpoint-evidence.md utf8 11505 -->
# Final combined checkpoint

## Current result

Remaining implementation, focused verification and the user-authorized combined normal maintenance CI/staging checkpoint pass at the exact accepted heads below. Both branches remain open and unmerged. Cloud's additive staging migration is applied. No hosted provider resource, credential issuance, sign-in, trial, starter deployment or production action is authorized by this record. Tasks 4.1–5.2 are complete at their implementation/maintenance gate; 6.1–6.3 remain incomplete for compatible published identities and separately authorized live acceptance/cleanup.

## Source preparation and focused checks

Source now includes freshly fetched main `932439b` (v30.3.0) through local merge `fb719c6`, preserving hosted delivery edits. Published upstream behavior is retained without adding Memory/Devices or billing work to this change.

- 89 focused cases passed across hosted delivery, private bootstrap, shared checks, checkpoint helpers, exact-head check waiting, GitHub shipping compatibility and the OpenSpec CLI contract.
- The added hosted delivery module's 19 cases and selected lint passed after equivalent control-character validation replaced a lint-rejected regex.
- Payload and source-skill links, OpenSpec configuration and retired-name checks passed. Wiki links and page sizes passed after the detailed delivery procedure moved to its existing owning hosting page.
- Instruction budgets passed after trimming only this change's prose: 26,178 words / 190,761 bytes against unchanged 27,084 / 190,845 limits; named-secret-save 47,379 bytes against 47,387.
- Strict validation passed for all 36 Source planning/specification items.

These are implementation checks, not a live hosted publication receipt. Generated starter full test/build and whole maintenance gates belong to normal CI at the separately approved final checkpoint.

## Cloud final review

Final review found and repaired missing Source starter build identity inputs and missing independent compiled Worker identity observation. The ordinary build now receives exact public project/head literals; preflight and live confirmation separately fetch compiled runtime identity, the injected manifest identity and actual HTML/assets. A trusted build receipt distinguishes known command exits from transport/signal uncertainty and permits a corrected checkpoint after an exact red result. Worker-only SDK type resolution now matches Vite while retaining strict typing; narrow runtime doubles preserve the real SDK and existing router fixtures.

All 453 focused Cloud cases and 12 pipeline script cases pass after two schema/ordered-transition fixture corrections. Worker and Node type-only checks, selected lint, knip and the zero-clone duplicate check pass. The unchanged seven-module coverage scope now passes all 487 Cloud cases: 469/469 statements, 510/510 branches, 83/83 functions and 299/299 lines (100% throughout), after meaningful missing authority/protocol/recovery cases were added. Selected lint remains clean. Strict validation passes all 20 Cloud planning/specification items. The borrowed full-wiki check still reports the same six pre-existing Cloud issues (five stale Access anchors and the oversized D1 pipeline page); it reports no new hosted-page issue, and this record does not claim a clean whole-Cloud wiki. No complete normal CI or staging result for this remaining implementation is claimed.

The new additive `0021_hosted_observer.sql` prepares five nullable observation fields on existing setup rows and three immutable expected-output fields on existing publication rows, with identity triggers/indexes. Applied migrations 0019/0020 and configured creation controls/bindings remain frozen. Actual observation credentials and provider resources remain a later separately authorized inventory.

## Remaining acceptance

Live Artifacts setup, private preview HTML/assets/API, authenticated three-fact publication, acknowledgment failure/recovery, a second real AI change and exact cleanup remain Source tasks 6.2/6.3 under fresh bounded authorization. Compatible published starter/agent identities are still required; maintenance staging alone cannot establish them.

## Authorized first maintenance runs and repairs

At exact Source `b94bd6405b74db08883f1ac188806733a6a35a9f`, [Test](https://github.com/matthewwong525/WongStack/actions/runs/37205834030) passed 101 app cases across 16 files with 100% coverage. [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37205834069) passed existing staging/database checks and uploaded the exact branch preview: staging version `557ab0ac-035e-4eb5-8da7-b8859096c810`, preview version `01033879-7220-4e6d-8074-ff97e940ba8e`, GitHub deployment `6841615060`. Exact-head preview discovery returned `https://spotless-panther-wongstack-staging.matthewwong525.workers.dev`; anonymous reads of root and `/api/me` returned HTTP 302. No sign-in or protected-content acceptance was attempted.

[Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37205834039) failed two of 1,148 script cases with `starter_anchor`, while numeric coverage remained above unchanged limits. Current upstream routes separated the guard from its old adjacent comment. The narrow repaired anchor retains strict exact-one behavior and inserts identity directly after signed access. A fixture removes only the inserted import/route and requires the entire remaining generated Worker to equal current upstream byte-for-byte. All seven affected starter script cases, syntax checks and selected lint pass; full payload/generated-starter CI is rerunning under the same checkpoint authorization.

Cloud `b54a885512aeafb6dbb39fbeded44559fa6d2635` passed its full ordinary test command (2,541 app cases across 93 files, 100% coverage; 30 VM and 58 script cases; zero clones), but [Test](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37205834717) failed the separate loosened-check reason gate because the existing runtime-boundary reason omitted the Vitest configuration filename. A new dated file-bound explanation repairs that documentation gate without changing configuration or lowering a check. [Deploy](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37205834707) passed and applied `0021_hosted_observer.sql` to existing staging: Worker version `e8e51758-ec83-4b93-93cc-9378c85e9d5b`, later preview upload `4d94c75b-23d1-4068-8506-b4bcd92fc22f`, no preview URL returned/discovered. These are platform service versions, not hosted customer receipts. Safe anonymous staging HTML/JavaScript/CSS reads returned HTTP 200; `/api/me` returned 401. Source and Cloud complete gates remain pending exact-head reruns.

Source repair head `33773b55be7eadd63f5de010ff7ce0e6ccc03c5b` passed all 1,148 script cases and unchanged coverage limits. Its [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37206288197) then failed ordinary generated-starter lint: the added identity route brought the current upstream `fetch` complexity to 23 against the unchanged maximum 21. The next narrow repair factors the identical existing open-workspace predicate into a typed generated helper, preserving the signed-access denial block and ordinary routing; neither the limit nor a check is suppressed. Full generated-starter acceptance remains pending its rerun.

The second narrow Source repair passes all seven affected offline starter cases. Generated Worker/router tests/helper/Vite/Vitest sources pass actual lint with the unchanged maximum 21, and the generated Worker project passes type-only compilation (`--noEmit --incremental false`). Tests require exact restoration of upstream routing after undoing only the identity insertion/predicate extraction, strict missing/duplicate extraction-anchor refusal and the unchanged predicate expression. Generated app cases cover unsigned/forged identity, signed GET identity, signed POST ordinary fallback and audience-only stale-open refusal. No complete app test/build ran locally; CI owns that remaining result.

Cloud repaired head `a762fb097a62adbf7a304c44c4950bae91cda0f7` passed full maintenance; its final recorded head `6b20efe8db3960ba23c73c09012f96108c5d3d24` also passed [Test](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37206396053) and [Deploy](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37206395934), with settled exact-head SUCCESS. The full app/VM/script/coverage gates remain unchanged and pass. The last existing staging run had no pending migrations: Worker version `13872b10-341b-497f-b211-4fa08c5b285a`, later preview upload `c318a109-0ee4-452b-8359-99aaae598564`; no Cloud branch preview URL was returned or discovered. Cloud companion implementation tasks are complete at their code/maintenance gate. Source's complete gate and all live acceptance remain pending.

## Accepted combined maintenance result

Source repaired head `3de4694fdd872eada9e9f5332d3b8c7c7bb9f074` passed [Test](https://github.com/matthewwong525/WongStack/actions/runs/37207060305), [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37207060315) and [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37207060278). The exact-head settled wait returned SUCCESS. Full script CI passes all 1,148 cases with 92.09% statements/lines and 88.84% branches, above unchanged floors. Generated starter CI runs ordinary dependency installation, type generation, full `npm test` and `npm run build`, then verifies no forbidden compiled resources, actual project/source literals and HTML assets. Its accepted result is `{ok:true, sourceCommit:"3de4694fdd872eada9e9f5332d3b8c7c7bb9f074"}`; no starter deployment occurred. Source's ordinary app gate and release/payload/wiki/instruction checks also pass; instructions remain 26,178 words / 190,761 bytes and named-secret-save 47,379 bytes against unchanged budgets.

Existing Source staging deployment version is `15b1849c-b408-4ad1-a813-e30bab869d6e`; exact branch preview upload version is `2c17f0cd-781a-45d2-aeb4-21cb781dcd9e`. Exact-head preview discovery returned `https://spotless-panther-wongstack-staging.matthewwong525.workers.dev` through GitHub deployment `6841828763`. These are maintenance receipts; no protected customer content/login or hosted publication is claimed. Cloud's final accepted head/results are recorded above. Two narrow Source integration repairs and one Cloud reason-documentation repair were needed; no threshold, coverage exclusion, skip, applied 0019/0020 migration, configured new binding or creation control was loosened. Comparison against Cloud's last separately approved dashboard head confirms current Wrangler configuration and applied 0019/0020 are unchanged.

Complete Source implementation/maintenance tasks 4.1–5.2 and Cloud companion tasks 4.1–4.3. Leave Source6.1 open because a passing maintenance build does not establish compatible published Artifacts starter, trusted runner-image and deployed agent/source pins. Source6.2/6.3 remain separately authorized complete live acceptance and exact cleanup. The two PRs remain open/unmerged, new hosted creation remains disabled and no real provider credential/resource has been issued by this acceptance. Session-fact persistence was unavailable because this checkout has no registered memory session; no fact was added or spooled. The user cadence and exact resumable evidence are retained in the proposal and this record.

<!-- end final-checkpoint-evidence.md -->
<!-- file live-acceptance-follow-up.md utf8 2217 -->
# Deferred live acceptance

**State:** unfinished; outside this disabled implementation release.
**Proposed next change:** `cloudflare-hosted-acceptance`.

On 2026-10-04 the user explicitly chose to ship the tested implementation with hosted creation disabled and retain the three live-acceptance tasks as follow-up work. They have not been completed, waived or authorized by this ship. Plan the bounded inventory, compatible immutable starter/runner/agent pins, cost limit, sign-in participation and exact cleanup before asking for live authorization. No canceled trial approval carries over.

## Original unfinished work

1. Original task 6.1: Use `/save` to establish passing Source and Cloud maintenance gates and compatible deployment/starter identities; inspect the final diff for canceled-code reuse, GitHub runtime dependencies in hosted jobs, and unintended memory/billing changes. Keep managed creation disabled until the complete hosted acceptance is recorded.
2. Original task 6.2: Obtain fresh authorization for a bounded disposable inventory, cost limit, necessary sign-in participation and cleanup before any live mutation; then use `/save` and record the design's complete acceptance matrix: automatic setup/retry, real AI edit, shared/red checks, protected exact preview including assets/API, exact approval, all three publication facts, injected acknowledgment failure/recovery, and a second complete change from confirmed main. Source CI or provider deployment alone cannot complete this task.
3. Original task 6.3: Verify exact owned-resource/grant cleanup and absence readbacks, documenting any explicitly retained resources; record the complete fresh evidence and separately approved enablement/rollback decision. Verify rollback disables new managed creation while retaining existing customer Artifacts work and publication recovery, without migrating repos or deleting customer work.

The existing Source/Cloud maintenance gates are passing. The compatible published identities and complete real hosted acceptance above remain unproved. Keep managed creation disabled until that follow-up records acceptance and a separate enablement decision. Memory/Devices and billing remain separate work.

<!-- end live-acceptance-follow-up.md -->
<!-- file review.html utf8 70824 fence=~~~ -->
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
<title>Review · 2026-10-04-cloudflare-hosted-starter</title>
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
<body data-change="2026-10-04-cloudflare-hosted-starter">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-cloudflare-hosted-starter</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Starting a hosted project should give a person a project their AI can work on and a small working site, without signing up for GitHub or Cloudflare. This release ships the tested implementation with managed creation disabled. A separate live-acceptance follow-up must prove the complete small-app journey before enabling it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Prepare managed storage as the new-project default when enabled.</b> After the existing email sign-in and service access steps, start the project without provider accounts, tokens, or dashboard visits. A quieter choice keeps the normal GitHub setup for people who request it. Existing projects keep their current route.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">NEW HOSTED PROJECT</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">═══════════════════════════════════════</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">email sign-in ──▶ start project</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                       │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">             ┌─────────┴─────────┐</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">             ▼                   ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">      managed storage       choose GitHub</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        (default)          existing setup</span>

<span class="ln" data-note="item-1-line-10" tabindex="0">EXISTING PROJECT ──▶ keep its current route</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-11" tabindex="0">BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">┌───────────────────┐   ┌───────────────────┐</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│ Set up your repo  │   │ Start your project│</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│ Connect GitHub    │   │ Your project      │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">│ Set up hosting    │   │ [Start project]   │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">│ Cloudflare token  │   │ Use GitHub        │</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">└───────────────────┘   └───────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The AI workspace stays familiar.</b> Use the existing workspace server, Paseo and AI sign-in flow. The project has ordinary saved history; reconnecting opens the same project. AI sign-in still belongs to the person. Memory and device setup are separate work. Each code change has its own plan and branch. Saved work, checks and the exact preview belong to that change; review and approval happen in the existing workspace/chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">saved project ──▶ existing workspace server</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                            │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                            ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">                   sign in to your AI</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">                            │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">                            ▼</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">                     ask for a change</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Checks, builds and previews run on Cloudflare.</b> Reuse one set of check scripts across the hosted and GitHub routes. Cloudflare runs the hosted checks and build; the small app and its private preview run as ordinary Workers. Build runners use Cloudflare's supported containers, with no container running the app or its preview.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">saved change ──▶ shared checks ──▶ build</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                      │              │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                      ▼              ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">                failure report   private preview</span>

<span class="ln" data-note="item-3-line-6" tabindex="0">build runner: Cloudflare container</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">app + preview: Cloudflare Workers</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Review a passing change before publishing it.</b> Show the exact preview, accept approval for that change, and report success only after the live site and saved history both confirm it. A failed or uncertain publication says what is known and stays incomplete. This first version supports one change at a time per project.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">passing change ──▶ review ──▶ approval</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">                                 │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">                                 ▼</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">                      publish that exact change</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">                                 │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">                       ┌─────────┴─────────┐</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">                       ▼                   ▼</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">                  live site          saved history</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">                       └─────────┬─────────┘</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">                                 ▼</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">                       both agree: published</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Keep setup and failure states understandable.</b> Reuse the existing dashboard cards; no new repository browser or hosting console. This disabled implementation release is accepted through its Source/Cloud maintenance gates. Enablement remains conditional on the separate complete live journey: setup, a real AI edit, a deliberately failing check, private preview, approved publication and a second change.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">┌─────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">│ My business                         │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Setting up your project…            │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ You can leave this page open.       │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">└─────────────────────────────────────┘</span>

<span class="ln" data-note="item-5-line-7" tabindex="0">┌─────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ My business                         │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│ Setup needs attention               │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│ Your saved work is safe.            │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ [Retry setup]   Contact support     │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">└─────────────────────────────────────┘</span>

<span class="ln" data-note="item-5-line-14" tabindex="0">┌─────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-15" tabindex="0">│ My business                         │</span>
<span class="ln" data-note="item-5-line-16" tabindex="0">│ Project ready                       │</span>
<span class="ln" data-note="item-5-line-17" tabindex="0">│ [Open workspace]   Open site        │</span>
<span class="ln" data-note="item-5-line-18" tabindex="0">│ Follow the existing AI sign-in steps│</span>
<span class="ln" data-note="item-5-line-19" tabindex="0">└─────────────────────────────────────┘</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> moving existing projects, removing the public GitHub template or existing GitHub workflow, a GitHub replacement with pull requests and issues, a new AI runtime, Memory/Devices, billing changes, automatic customer sign-ins, database-backed app features, background jobs, custom domains, parallel changes, a bespoke build or bundle-transfer system, enabling managed creation, and completing the deferred live trial in this release.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: start this fresh plan from fetched Source main, because the user explicitly canceled the old Source and Cloud changes; this workspace matched main before any planning write.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: default only new hosted projects to Artifacts and preserve all existing GitHub projects and explicit GitHub choices, because those preferences are settled in the brief.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked whether an operator dashboard connection was acceptable → chose to preserve the expectation that dashboard setup is unnecessary; the customer must do nothing in either provider.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked how much the first delivery should prove → chose one complete small app: setup, AI edits, shared tests, private preview, approved publication and a second change.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked which automated build route to use → chose no GitHub workflows in the hosted route and a full move of hosted execution to Cloudflare.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: use Cloudflare's documented CI SDK recipe with ordinary Worker Previews, because it meets automatic setup and Cloudflare-only hosted execution; native Workers Builds documents Artifacts dashboard setup but not an Artifacts connection API contract.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: start with an HTTP and static-asset app, one owner and one change at a time, because that proves the requested repository and AI/setup journey without adding data provisioning, collaboration or a new orchestration service.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: reuse existing email sign-in, workspace servers and AI sign-in steps, because current Cloud main already supplies them; change neither billing nor Memory/Devices.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: implement recurring setup, CI routing and receipt checks as deterministic code, because those steps need exact repeatable results; AI remains responsible for understanding and editing the customer's app.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked how PRs work with Artifacts → investigated the current official Git/API documentation and recommended one OpenSpec change linked to one ordinary branch, with checks, exact preview and approval handled by the hosted delivery adapter; the user then requested <code>/apply</code>. OpenSpec records the plan and branch; it does not provide a PR service or enforce approval.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>The user invoked <code>/apply</code> for this reviewed change. Begin with the SDK contract boundary; keep provider mutations, credentials, customer sign-ins, trials and production enablement outside this implementation authorization. Cloud main remains <code>4bb0082ea93f0d11b94e296e4d0e615901485156</code>; its fresh local archive is implementation preparation, not reuse of the canceled companion branch.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user explicitly authorized pushing the prepared SDK slice, Cloud's normal CI and its automatic existing staging deployment. This covers the SDK pins, boundary helper and protocol tests, not new hosted resources, tokens, live trials or production publication. The fresh companion is Cloud #70; its gate is still pending.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Verified the SDK's native push normalization, actual public runner command/credential/snapshot interfaces, accepted Wrangler schema and tracked-output collision behavior with 30 passing focused tests and full helper coverage. Maintenance CI remains the first expansion gate; these fixtures do not establish live isolation or publication.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Cloud #70's exact code head <code>6faef10cd9513e52af9b2a04f4ddaa39841570c7</code> passed full Test and Deploy maintenance runs. Task 1.2 is complete at its implementation-contract gate, with <a href="sdk-contract-evidence.md">the exact evidence</a>; no preview URL was discoverable, and no full hosted/live acceptance is claimed. Continue to shared checks on current Source main.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/test.yml</code> delegates its existing app and quality checks to <code>.github/scripts/checks.mjs</code>; <code>.github/scripts/app-untouched.sh</code> gains an explicit local base/head comparison for provider-neutral callers. No check is removed: whole-change skips, suite discovery, quality reports after a red suite and the independent deployment workflow remain. The wrapper no longer caches npm dependencies, because portable suite discovery and execution now belong to one ordinary script.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/scripts/checks.mjs</code> adds the shared entry point, using the existing scope, loosened-check and wiki implementations with explicit repository/base/head/default-branch inputs. Source's additional payload maintenance checks remain separate from the customer gate.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Prepared task 2.1 with 88 passing focused script cases, including 17 shared-check fixtures, and passing payload/wiki/configuration/context checks. The <a href="shared-checks-evidence.md">implementation evidence</a> records the existing Source staging actions its maintenance push would trigger. No provider action is authorized by the earlier Cloud-only approval; obtain Source staging authorization before this checkpoint's push.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user approved Source staging CI for the prepared shared-check slice (<code>c6efe02</code>), including the existing staging Worker/database checks and branch preview upload. Push this checkpoint and use its exact maintenance result for task 2.1; this approval does not create new hosted resources or authorize credentials, a trial or production publication.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Source #259's first head passed Test and Deploy but failed two payload integration cases. Add the new capability to the existing Cloudflare documentation-area mapping and extend static payload dependency inspection to the shared script's fixed sibling command paths. Keep every existing assertion and rerun the full maintenance gate; task 2.1 remains incomplete until it passes.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Source #259's corrected exact head <code>796ddd9beadeaa12d8736fef9fe1d2b8227cb620</code> passed Test, Deploy and all 1038 payload cases. Task 2.1 is complete; <a href="shared-checks-evidence.md">its evidence</a> records the failures, repairs and discovered staging preview. Continue to the HTTP/static hosted starter and negotiated workspace bootstrap, without provider resource creation or release publication.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Prepared tasks 2.2 and 2.3: an offline pinned HTTP/static starter, authenticated contract-5 bootstrap, private project handoff and setup routing. The companion context endpoint and contract negotiation remain Cloud dependencies; neither starter publication nor hosted readiness is established. <a href="starter-bootstrap-evidence.md">Prepared evidence</a> distinguishes focused fixtures from the generated app's pending maintenance build. Leave both tasks unchecked until that gate passes.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: Source's payload maintenance workflow adds the generated starter's ordinary installation, type generation, complete tests and build, plus compiled configuration/assets/identity inspection. The script coverage inventory includes <code>server/hosted/*.mjs</code>; coverage floors remain unchanged. These checks add evidence and run no deployment command for the generated app. A maintenance push still invokes the existing separate Source staging deployment, so the prior shared-check-slice approval does not cover this new slice.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/payload.yml</code> adds generated-starter checks for the existing non-documentation scope, because the main app's checks do not compile the separate hosted configuration. No existing check is removed or skipped.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/.c8rc.json</code> includes the new hosted helper directory in the existing coverage inventory, because these helpers need the same coverage gate as other Source scripts. Numeric thresholds remain unchanged; no coverage suppression is added.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Read-only fetch found independent Source main release <code>a775930044e8d77c967a136431d8d971b20809e8</code> (Memory #258). Keep this prepared checkpoint on its established branch without importing that release or expanding into Memory/Devices. Final main reconciliation remains a later delivery responsibility.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user approved pushing prepared starter/bootstrap commit <code>bb01e066f3dd45b150e67a51c1c94c2391d44c98</code> to Source #259 and running normal maintenance CI, including its existing staging Worker/database checks and branch preview upload. The generated starter is tested and built without deployment. New resources, tokens, starter publication, an Artifacts trial and production publication remain outside this approval. The checkpoint is pushed; tasks 2.2 and 2.3 await its exact gate result.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Starter/bootstrap head <code>bb01e06</code> passed Source Test, Deploy and the full script suite; the generated starter's ordinary commands completed, then its compiled-configuration assertion failed. The published Cloudflare Vite plugin 1.62.1 normalizes absent resources to nested empty structures (Durable Object bindings and queue producers/consumers). Teach the assertion to distinguish empty metadata from configured resources; add a regression with provider-shaped defaults and retain rejection of real bindings/schedules. Keep tasks 2.2 and 2.3 unchecked until the corrected exact head passes maintenance CI.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/check-hosted-starter.mjs</code> accepts provider-normalized empty binding structures, because their object presence does not mean a resource exists. Any nonempty binding array or schedule remains rejected; add service/KV checks and bounded failure categories. No generated-app test, build, identity or asset check is skipped.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Corrected Source #259 head <code>80df7e81325ef4e5265f719d752578847547a176</code> passed Test, existing staging Deploy and Payload, including all 1057 script cases and the actual generated starter's ordinary tests/build plus compiled output checks. Complete tasks 2.2 and 2.3 at this Source gate; <a href="starter-bootstrap-evidence.md">the exact evidence</a> retains the first failure and one repair. The Cloud context endpoint and full hosted acceptance remain pending. Continue to accepted Cloud task 3.1, preparing only internal records before obtaining its own staging migration authorization.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Cloud task 3.1 is prepared locally at <code>f405ff9c18d15188b0f4554bbc8a7eb282990023</code>, reconciled with current Cloud main <code>5b1ff7c4fea87d2dde2323fc065cc323e80f524f</code>. Its companion change's <code>internal-records-evidence.md</code> records 37 real-SQLite cases and full new-module coverage, focused lint, knip and duplicate checks. No route or provider client calls the new records. Keep task 3.1 unchecked: pushing to Cloud #70 would apply four empty tables to the existing staging database and redeploy its existing Worker, so request fresh approval for that concrete checkpoint. Earlier SDK or Source staging approvals do not cover it.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user approved Cloud's prepared records staging migration and CI. Corrected Cloud #70 head <code>d41f3b78d11358a5a906ee4511d31c4d73f850ad</code> passed Test and Deploy after one collision repair: four distinct <code>hosted_starter_</code> tables preserve an earlier staging table. The accepted companion evidence records 2,155 app, 30 VM and 46 script cases, full coverage and the successful existing-staging migration/deployment. Complete task 3.1; no preview URL was discovered, no customer hosted setup/publication is accepted, and creation remains disabled. Continue to the accepted disabled setup implementation in task 3.2 without provider resources, tokens, sign-in, trial or production actions.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Cloud task 3.2 is prepared locally at <code>f4a51149c0c34c84aac753fb7800b5f6a6641cf8</code>, with 456 focused compatibility/SQLite cases, 100% selected new-module/router/contract coverage, passing type-only Worker checking, lint, knip and duplicate checks. Its disabled setup endpoint, exact private contract-5 handoff and bounded DB maintenance retain uncertain operations; no configured creation control, source-release move or actual hosted provider call is included. The companion setup evidence documents the one-page inventory and unproved REST log response boundary. Keep task 3.2 unchecked: fresh approval is pending for Cloud #70 normal CI, its one empty additive setup table on the existing staging database and its existing staging Worker deployment. No dashboard/pipeline, live acceptance or production step has run.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user approved the disabled-setup staging migration and CI. Cloud #70 exact head <code>f4a51149c0c34c84aac753fb7800b5f6a6641cf8</code> passed <a href="https://github.com/matthewwong525/wongstack-cloud/actions/runs/37174093101">Test</a> (2,300 app cases, 100% whole-app coverage, 30 VM and 46 script cases) and <a href="https://github.com/matthewwong525/wongstack-cloud/actions/runs/37174093064">Deploy</a>, including successful additive setup-table migration and existing-staging build/deployment. No CI repair was needed; preview discovery returned no URL. Complete task 3.2 at this maintenance gate and proceed to existing dashboard cards, keeping creation disabled until full hosted acceptance. No real hosted provider resources, credentials, sign-in, trial or production action is approved by this gate.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the first dashboard milestone uses Your project and its existing recorded identity rather than adding project naming/renaming state. Friendly-name editing can follow the complete small-app acceptance; the primary action and explicit GitHub choice are unchanged. The same Cloud companion now holds accepted dashboard task 3.3, with existing cards/pairing/AI guidance, server-authoritative eligibility/status and no new migration, resource, credential or activation. Unknown operations offer status/support; only known safe bootstrap failure offers same-target retry. Project preparation remains separate from live-site and memory readiness.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Dashboard head <code>20761902f4576bb34f9e35dd25d1317a4e9195fa</code> passed <a href="https://github.com/matthewwong525/wongstack-cloud/actions/runs/37175776400">Test</a> (2,389 app cases across 87 files, 100% whole-app coverage, plus the existing VM/script gates) and <a href="https://github.com/matthewwong525/wongstack-cloud/actions/runs/37175776390">Deploy</a>. Ordinary existing-staging build/deployment passed with no new migration and no CI repair. Preview discovery returned no URL. Complete task 3.3 at this maintenance gate only; creation remains disabled and complete customer hosted acceptance remains pending.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user asked to verify only at the end. Finish remaining implementation and test fixtures before a single combined focused-check/Source-and-Cloud maintenance/staging checkpoint; stop per-slice approval/deployment requests. This supersedes the earlier per-milestone maintenance cadence, not the exclusion of new provider resources, tokens, sign-ins, billable trials or production publication. Keep new bindings/subscriptions/configuration inactive and creation disabled; request one concrete final deployed-check approval only after the complete result is reviewable. Full live acceptance and enablement remain separate explicit decisions.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Bind the small Source/Cloud delivery adapter through one project-private <code>POST /api/hosted/projects/:id/delivery</code> endpoint, existing verified bearer/current identity and bounded candidate/status/approve/recover actions. Verbs retain archive/spec/commit responsibilities and register the exact candidate before its ordinary Artifacts push. Native previews expose their actual immutable deployment identity and owned Worker; the reviewed native API does not establish a separate production Worker version ID, so do not fabricate one. Production receipts keep their real version and deployment IDs. Reuse immutable existing resource/candidate/publication facts before adding schema or another service. Remaining checks are deferred until the complete implementation is prepared.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Automatic authenticated live observation needs a project-specific machine identity: the existing owner-email Allow policy cannot authorize the platform’s service request. Prepare only the documented Access service token and Service Auth policy for that same Worker, preserving the owner policy, with exact owned receipts, sealed finite credentials and single-attempt uncertainty retention in minimal additive setup fields. Existing applied migrations remain frozen. This is code preparation, not credential issuance or resource authorization. Require verified unexpired observation authority before production deployment; no missing-authority deployment or renewal broker. The final concrete staging checkpoint will identify any additive columns, while actual grants/policies remain in the later separately approved live inventory. <a href="https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/">Cloudflare service-token documentation</a> requires Service Auth, including strict-mode behavior; the existing signed Worker Access guard already accepts verified service identities.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Keep final repository acknowledgment on the existing Source Git path after Cloud has independently recorded the provider deployment and authenticated live identity/assets. The SDK ordinary runner exposes a project read credential, not a write selector; do not inject broad management authority or build a broker to compensate. Source uses its already scoped Git grant for an exact normal fast-forward main push with expected-old pre-push enforcement, then requests Cloud bounded readback/acknowledgment of that same publication. An already matching remote head recovers by readback only. Offline/expired Source remains deployed-awaiting-confirmation, never published, and blocks another change. Builds, checks, native previews and provider deployment all remain on Cloudflare.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Fetched current Source main <code>932439b</code> (published v30.3.0) and merged it normally into the existing feature branch at local <code>fb719c6</code>, preserving the prepared hosted delivery changes. Published upstream memory and company-action changes remain upstream behavior; this change adds no Memory/Devices migration, enrollment or billing work. No push, checks, staging deployment or hosted provider action accompanied this preparation. Verify the integrated result only at the combined final checkpoint.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Completed the user-requested combined focused verification: 89 Source cases, 487 Cloud cases with unchanged seven-module 100% coverage, and 12 ordinary pipeline script cases. Exact Source/Cloud type, lint, payload, context and validation evidence is retained in the final checkpoint records. Keep remaining tasks unchecked pending normal maintenance CI; request only one final approval for the complete prepared commits and existing staging actions, explicitly including the eight additive Cloud columns. No live hosted resource, credential, sign-in, trial, production publication or enablement is authorized by this preparation.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user authorized pushing complete Source <code>b94bd6405b74db08883f1ac188806733a6a35a9f</code> and Cloud <code>b54a885512aeafb6dbb39fbeded44559fa6d2635</code> and one combined final normal CI/staging checkpoint, including existing Workers/database checks, Source branch preview/generated-starter test/build and additive Cloud migration 0021. Both pushes succeeded. Existing staging resources only; no live Artifacts resources, credentials, sign-ins, starter deployment, trial or production publication are authorized.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Source's first full payload CI found two starter preparation failures because current upstream company discovery/login-link routes were inserted between the signed-access denial block and the old adjacent preview-comment anchor. Narrow the required exact-one anchor to the complete unchanged denial block and insert identity immediately after it. Preserve current upstream routing byte-for-byte; missing/duplicate anchors still fail. All seven affected starter script cases and syntax/selected lint pass. Full generated starter test/build remains in the authorized CI rerun, with no local app build or starter deployment.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Source repair <code>33773b5</code> passed all 1,148 script cases, then ordinary generated-starter lint reported <code>fetch</code> complexity 23 against unchanged maximum 21. Factor the identical existing open-workspace predicate into a typed generated helper to make room for the compiled identity route while keeping the full signed-access denial block and upstream routing. Preserve strict exact-one transformation anchors and add generated signed/unsigned/method/stale-open-switch coverage; do not raise the limit or add exclusions. Cloud's final evidence head <code>6b20efe8db3960ba23c73c09012f96108c5d3d24</code> passed complete maintenance CI/staging with no remaining migrations; live hosted acceptance remains pending.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Source repaired head <code>3de4694fdd872eada9e9f5332d3b8c7c7bb9f074</code> passed <a href="https://github.com/matthewwong525/WongStack/actions/runs/37207060305">Test</a>, <a href="https://github.com/matthewwong525/WongStack/actions/runs/37207060315">Payload checks</a> and <a href="https://github.com/matthewwong525/WongStack/actions/runs/37207060278">Deploy</a>, with settled exact-head SUCCESS. All 1,148 script cases pass above unchanged coverage floors; full generated starter install/type generation/test/build and compiled configuration/identity/assets checks pass without deployment. Source app tests, payload/release/wiki/context checks and the exact branch staging preview pass. Together with Cloud's final recorded passing gate, complete implementation/maintenance tasks 4.1–5.2. Two narrow Source repairs and one Cloud documentation repair were required. Keep 6.1 incomplete for compatible published starter/agent/runner identities and 6.2/6.3 incomplete for separately authorized live acceptance/cleanup; creation remains disabled and no publication/merge is authorized by this checkpoint.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The user invoked <code>/ship</code>, then explicitly selected “Ship disabled implementation; retain live follow-up.” Narrow this release to the tested code and normal Source/Cloud production deployments, including Cloud record migrations 0019–0021. Move original unfinished tasks 6.1–6.3 verbatim into <code>live-acceptance-follow-up.md</code>; do not mark them complete or fabricate acceptance. This deliberate scope change supersedes the earlier requirement to finish the real app trial before shipping this code, while preserving that complete journey as a condition of later enablement. No new hosted resource, credential, sign-in, billable trial, starter publication or managed-creation enablement is authorized. Archive only the completed implementation tasks and keep creation/delivery/observer controls and new provider bindings inactive.</li>
<li class="decision card" id="decision-47" data-note="decision-47" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint for the explicitly approved disabled implementation release: all 13 current-scope tasks are complete, original 6.1–6.3 remain unfinished in <code>live-acceptance-follow-up.md</code>, and delta requirements exactly match reconciled main specs. Number the Source release 30.4.0 from current main 30.3.0, then gate this exact archive checkpoint before merging. No live Artifacts acceptance or enablement is implied.</li>
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
<!-- file sdk-contract-evidence.md utf8 1785 -->
# SDK contract milestone

Cloud companion: [PR #70](https://github.com/matthewwong525/wongstack-cloud/pull/70), branch `cloudflare-hosted-starter`, prepared from Cloud main `fb2d6fc1f8866af6ab805dcd392ceb6ce908fb58`. Tested code head: `6faef10cd9513e52af9b2a04f4ddaa39841570c7`.

The SDK 0.2.0 public API and existing resolved Wrangler 4.142.0 are pinned. Thirty focused protocol tests passed with full helper coverage. Full Cloud [Test](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37164135507) and [Deploy](https://github.com/matthewwong525/wongstack-cloud/actions/runs/37164135479) maintenance runs both concluded success on that exact head. The paired same-repository PR events skipped as intended. No check was loosened. Preview discovery returned no URL; no preview was inferred from workflow completion.

This completes the implementation contract gate for Source tasks 1.1/1.2. Fixtures exercise actual SDK event normalization, checkout command selection, per-runner environment/credentials, shell arguments, chained snapshots, malformed results and source-overlay collisions. Provider-specific compiled-file validation and deployment remain later work.

The user expressly authorized this existing staging maintenance deployment on 2026-10-04. No new Artifacts repo, namespace, Workflow, runner/cache resource, Access policy or credential was created for this milestone; production was not merged. No historical trial resources or credentials were reused.

These results do **not** prove live sandbox isolation, native event delivery, private Worker Preview behavior, complete publication, resource cleanup or a second hosted change. Full hosted creation remains unimplemented and unavailable; the separately authorized live acceptance matrix still applies.

<!-- end sdk-contract-evidence.md -->
<!-- file shared-checks-evidence.md utf8 3433 -->
# Shared checks implementation evidence

Task 2.1 is complete at its implementation gate on Source main `02542fa2a8c4eb8a64266cacebee00987579564d`. The exact pushed head `796ddd9beadeaa12d8736fef9fe1d2b8227cb620` passed [Test](https://github.com/matthewwong525/WongStack/actions/runs/37166952516), [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37166952519) and [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37166952543) in [Source #259](https://github.com/matthewwong525/WongStack/pull/259). These establish maintenance compatibility, not hosted execution or publication acceptance.

The first pushed head `f840702a609715196d7172696e3ad9871c1e63fc` passed Test and Deploy, including recorded branch preview deployment `6835193877`, but [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37166722802) failed two of 1038 script cases. The new capability needed its documentation-area mapping, and the static payload-dependency test needed to follow fixed sibling command paths in the shared script. Both were repaired without dropping checks; the fresh full gate passed all 1038 cases with 91.63% lines and 88.63% branches. The 21 focused repair cases also passed.

Preview discovery for the accepted head returned deployment `6835229668` and [the Source branch preview](https://spotless-panther-wongstack-staging.matthewwong525.workers.dev). It is the existing GitHub staging/version route, not the future immutable managed native Preview acceptance.

The portable entry point requires the repository root, full base/head commits and default-branch context. It rejects a different checked-out head or nested root, evaluates the whole change, discovers the existing suite, and reports loosened checks and wiki failures even after installation or tests fail. Its fixtures use temporary repositories and an npm command double; they run no real app build, provider calls or deployed checks.

Prepared checks:

- `node --test scripts/tests/{checks,app-untouched,loosened-checks,cli-conventions}.test.mjs`: 88/88 passed.
- `scripts/tests/node_modules/.bin/c8 --include=.github/scripts/checks.mjs --reporter=text --reports-dir=.scratch/shared-checks-coverage --temp-directory=.scratch/shared-checks-coverage/tmp node --test scripts/tests/checks.test.mjs`: 17/17 passed, 100% lines and 95.31% branches.
- Focused oxlint with denied warnings and `bash -n .github/scripts/app-untouched.sh`: passed.
- Payload links, OpenSpec configuration, retired names, context budgets, wiki links and strict change validation: passed.

GitHub's Test workflow now calls this entry point. Source's extra payload checks remain separate. The existing Deploy workflow remains independent, with the same staging target and branch preview behavior; no Worker configuration, database schema or provider inventory is changed by this slice. The test workflow drops npm caching because suite discovery and execution now live in the portable script; its Check decision explains this change.

The user approved pushing this prepared shared-check slice and running Source's normal maintenance workflows on 2026-10-04, including the existing `wongstack-staging` Worker deployment, staging D1 migration check and branch-version preview upload. This authorization is separate from the earlier Cloud SDK staging approval. No new hosted resources, credentials, trial or production publication is included.

<!-- end shared-checks-evidence.md -->
<!-- file starter-bootstrap-evidence.md utf8 9966 -->
# Hosted starter and workspace bootstrap preparation

Tasks 2.2 and 2.3 passed their Source maintenance gate at exact head `80df7e81325ef4e5265f719d752578847547a176`, after one compiled-configuration repair. Both tasks are checked off; Cloud service integration and complete hosted acceptance remain pending. This slice creates no hosted resource or credential, publishes no starter and enables no managed creation. `VERSION` remains unchanged.

## Prepared behavior

- The offline starter helper reuses payload copying, wiki hubs and the actual selected-source install record. It refuses an existing destination or dirty source. Direct dependencies are frozen to resolved lockfile versions, including Wrangler 4.144.0; the currently unused `qs` security override remains a constraint instead of inventing a resolved package.
- The HTTP/static configuration has native `previews.vars`, top-level assets and signed Access checks. It rejects business-data, memory, background, service and custom-build bindings. Existing GitHub `env.staging` is untouched. Compatibility route code remains shipped but has no provisioned memory bindings. The install record keeps `components.memory: null`.
- A compiled `/_hosted/identity` endpoint uses build-time project/SHA literals behind the existing signed identity verifier. The generated starter retains the complete app test chain and adds an identity-route test using the existing actual RSA-signed Access fixture. Ordinary build delegates to `build:app`, without migration/deployment hooks.
- The contract-5 fixed bootstrap job verifies the service's exact project/remote/template/generation before writes, clones the already-seeded Artifacts repository once, keeps later customer work and reuses the existing Paseo setup helper. Repo-scoped Git credentials and project-scoped delivery authority stay in private files outside history. No personal provisioning, GitHub login, platform credential or memory readiness enters the job or its report.
- Git remotes follow the official `.artifacts.cloudflare.net/git/<namespace>/<repo>.git` contract. Git token validation follows `art_v1_<40 lowercase hex>?expires=<digits>`, preventing Git-config quoting/control injection. The service-bound bearer token rejects controls. Foreign folders/remotes, stale generations, symlinks, weak permissions, untrusted markers and incomplete receipts stop with reconnect guidance.
- `/wong-setup` selects and verifies hosted context before choosing a personal target. A marker or Artifacts origin identifies the route but grants no authority.

## Local non-build evidence

`node --test scripts/tests/hosted-bootstrap.test.mjs scripts/tests/hosted-starter.test.mjs`: **18 passed**. Fixtures execute preparation using the real Source manifest/lockfile and exercise the maintenance command orchestration with stubbed npm output; this is not compilation evidence.

`node --test scripts/tests/hosted-bootstrap.test.mjs scripts/tests/hosted-starter.test.mjs scripts/tests/server-agent-contract.test.mjs scripts/tests/server-agent.test.mjs scripts/tests/server-agent-source.test.mjs scripts/tests/agent-layout.test.mjs scripts/tests/payload-rule-paths.test.mjs`: **77 passed** on the final prepared code, including the new orchestration and required-anchor fixtures.

The combined installer/agent/new/project run passed **98 of 104** under this root host. All **29 personal installer cases passed**. Six existing project cases failed on simulated UID-1000 versus root-owned private state directories, before reaching the extracted Paseo helper. A disposable copy of the exact existing `server-project.test.mjs` and its public module dependencies was then run as UID/GID 1000 with `setpriv --reuid=1000 --regid=1000 --clear-groups <temporary-node> --test <temporary-checkout>/scripts/tests/server-project.test.mjs`: **11 passed**, including all six cases. The temporary Node executable, public module copies and fixture checkout were removed. No existing assertion was changed for this environment.

These checks passed:

```text
scripts/tests/node_modules/.bin/oxlint --deny-warnings server/hosted server/agent/hosted.mjs server/agent/agent.mjs server/install-wongstack.mjs server/prepare-project.mjs scripts/check-hosted-starter.mjs scripts/tests/hosted-starter.test.mjs scripts/tests/hosted-bootstrap.test.mjs .agents/skills/wong-sync/scripts/hosted-context.mjs
node scripts/check-payload-links.mjs
node scripts/check-openspec-config.mjs
node scripts/check-retired-names.mjs
node .github/scripts/wiki-links.mjs
node scripts/measure-context.mjs --check
openspec validate cloudflare-hosted-starter --strict --no-interactive
```

The context budget remains within its limits, including startup at 2,174 words against 2,200. The script coverage inventory now includes `server/hosted/*.mjs`; no new coverage suppression or lower threshold was added.

## Prepared maintenance gate

Source's payload maintenance workflow adds `node scripts/check-hosted-starter.mjs`. It refuses local execution and, in maintenance CI only, prepares the real starter and runs ordinary `npm ci --no-audit --no-fund`, `npm run cf-typegen`, `npm test`, and `npm run build`. It then reads the actual Vite/Wrangler redirected config, compiled Worker identity and HTML asset output, rejecting resource bindings or missing native Preview configuration. No deploy or preview command runs in this generated-starter check.

This generated app was **not** installed, type-generated, tested or built locally. Its compilation, full app quality chain and compiled handoff awaited a fresh authorized Source maintenance gate, together with full script coverage and existing app Test/Deploy/Payload checks. The user subsequently authorized this slice's staging gate; its exact outcomes appear below.

Cloud still must implement the authenticated project-scoped `POST /api/hosted/projects/:projectId/context` companion endpoint and negotiate contract 5 before dispatch. The Source helper targets the canonical service origin `https://wongstack.com`. Service integration, any noncanonical host configuration, immutable Artifacts starter staging and live acceptance remain subsequent work; no operational readiness is claimed here.

## Review fixes before the gate

Config validation now rejects absent/non-string Access audiences and name inputs, including when both production and Preview audiences are absent. Starter generation requires each Worker, routing-test, Vitest and Vite patch anchor exactly once; missing or duplicate anchors fail as `starter_anchor`. The Worker anchor includes the signed Access denial block so a changed protection block cannot silently move the compiled identity route outside it. The focused fixtures mutate only disposable copied payload files, cover missing and duplicate anchors for all four transformations, and pass with the final 77-case regression command above. No build, git, CI or provider action ran for this review fix.

## First maintenance attempt and repair

Exact Source head `bb01e066f3dd45b150e67a51c1c94c2391d44c98` passed [Test](https://github.com/matthewwong525/WongStack/actions/runs/37168659224) and [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37168659225). [Payload](https://github.com/matthewwong525/WongStack/actions/runs/37168659258) passed its full script suite, then the generated-starter step failed at `compiled_configuration`, after its awaited ordinary installation/type-generation/test/build commands returned successfully. This does not complete the starter gate.

Read-only inspection of the [published Cloudflare Vite plugin 1.62.1](https://registry.npmjs.org/@cloudflare/vite-plugin/-/vite-plugin-1.62.1.tgz), its normalized Wrangler defaults and `getOutputConfig` showed nested empty resource metadata, including `durable_objects: {bindings: []}` and `queues: {producers: [], consumers: []}`. The original check treated these harmless objects as configured resources. The repair checks actual contents recursively, retains rejection of nonempty arrays/scalars, adds service/KV guards and names the failed resource category without printing values. Seven focused starter cases and focused lint pass; the orchestration fixture now uses provider-shaped nested defaults. A complete maintenance rerun remains required.

## Accepted maintenance checkpoint

Corrected exact Source head **`80df7e81325ef4e5265f719d752578847547a176`**, branch `spotless-panther`, [Source #259](https://github.com/matthewwong525/WongStack/pull/259):

- [Test 37168956645](https://github.com/matthewwong525/WongStack/actions/runs/37168956645): success.
- [Deploy 37168956698](https://github.com/matthewwong525/WongStack/actions/runs/37168956698): success, existing Source staging only.
- [Payload 37168956697](https://github.com/matthewwong525/WongStack/actions/runs/37168956697): success, **1057/1057 script cases**, followed by the real generated starter's ordinary installation, type generation, full tests and build. Its compiled configuration/assets/identity checks returned `{ok:true,sourceCommit:"80df7e81325ef4e5265f719d752578847547a176"}`.

The parent's maintenance wait returned `RESULT: SUCCESS` after one CI repair. Tasks 2.2 and 2.3 are complete at their Source implementation gate. Cloud's context endpoint/contract negotiation, protected native Artifacts preview, live isolation, approved publication and second-change acceptance remain pending; this success proves none of those provider facts. No Artifacts starter, project, token or new hosted resource was created. Session facts remain skipped because no current session is registered in this Source checkout.

Preview discovery for the accepted head returned [the existing Source staging preview](https://spotless-panther-wongstack-staging.matthewwong525.workers.dev), via GitHub deployment `6835548645`. This is the retained GitHub staging route; it is not an immutable native Artifacts preview or hosted acceptance proof. No human login verification ran.

<!-- end starter-bootstrap-evidence.md -->
