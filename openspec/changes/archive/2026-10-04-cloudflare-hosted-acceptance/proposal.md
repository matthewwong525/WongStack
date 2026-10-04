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
