# Start a hosted project without provider accounts

**Status:** in-progress
**Branch:** spotless-panther
**Open questions:** fresh bounded live inventory, compatible published starter/agent identities, necessary sign-in participation, cost limit, cleanup and enablement remain separate; the combined maintenance CI/staging checkpoint is authorized and running.

## Why

Starting a hosted project should give a person a project their AI can work on and a small working site, without signing up for GitHub or Cloudflare. The first delivery should prove that whole journey with a small amount of new machinery.

## What Changes

- **New hosted projects use managed storage by default.** After the existing email sign-in and service access steps, start the project without provider accounts, tokens, or dashboard visits. A quieter choice keeps the normal GitHub setup for people who request it. Existing projects keep their current route.
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
- **Keep setup and failure states understandable.** Reuse the existing dashboard cards; no new repository browser or hosting console. The first release is accepted only after setup, a real AI edit, a deliberately failing check, private preview, approved publication and a second change all work.
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

**Non-goals:** moving existing projects, removing the public GitHub template or existing GitHub workflow, a GitHub replacement with pull requests and issues, a new AI runtime, Memory/Devices, billing changes, automatic customer sign-ins, database-backed app features, background jobs, custom domains, parallel changes, and a bespoke build or bundle-transfer system.

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
