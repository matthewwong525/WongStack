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
