# Managed hosted projects

The managed route starts a new HTTP/static project without asking its owner for GitHub or Cloudflare accounts. Existing GitHub projects keep their [current pipeline](github-actions.md). Managed creation stays disabled until service integration and complete acceptance establish setup, editing, private preview, approved publication, recovery and a second change.

## Prepare the starter

The source-only [starter helper](https://github.com/matthewwong525/WongStack/blob/main/server/hosted/starter.mjs) prepares a fresh release folder from the reviewed source checkout using the normal payload inventory, folder links, wiki hubs and install record. Dependencies are frozen to the lockfile, including Wrangler 4.144.0. The app retains its normal `npm test` chain and `npm run build:app`; `npm run build` delegates directly to it, without database migration or publication hooks. Source maintenance CI builds and tests the generated starter separately from the existing app.

Preparation copies compatibility payload files, but declares no business database, memory, queue, cron or background binding. Memory is recorded as unconfigured. The original GitHub configuration and its separate staging environment stay unchanged. [Native Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/) uses a separate `previews.vars` block and top-level static assets. The generated `/_hosted/identity` endpoint contains project and source SHA literals compiled from `WONG_HOSTED_PROJECT` and `WONG_HOSTED_SHA`, behind the existing signed Access identity check.

After review and an explicit release authorization, stage the prepared folder in an Artifacts starter repository once; retain its exact provider remote, immutable commit, source version/commit and dependency lock. Record the receipt in the service's starter pin before creating any customer project. No customer setup or build fetches Source from GitHub. Preparing files alone neither publishes this starter nor enables managed creation.

## Open the workspace

The service first establishes the exact project Worker and owner-specific Access protection, then seeds its repository from the pinned starter. Only a negotiated contract-5 peer receives [the hosted bootstrap job](https://github.com/matthewwong525/WongStack/blob/main/server/README.md#hosted-project-bootstrap). The workspace uses the existing tools, Paseo and AI sign-in steps; the owner still signs in to their AI. [Artifacts Git tokens](https://developers.cloudflare.com/artifacts/guides/authentication/) belong to one repository and are separate from Cloudflare management credentials.

Before personal setup or delivery, [private context verification](../../.agents/skills/wong-sync/scripts/hosted-context.mjs) confirms the checkout's exact remote, project, starter/source and generation with the authenticated service. A committed marker or origin chooses the possible route but grants no authority. Missing, revoked, foreign or unverifiable context stops with reconnect guidance; it never becomes a request for personal provider credentials. Retrying the same authorized bootstrap preserves customer edits and opens the same Paseo project.

## Save and publish a change

The existing [change loop](../development/the-change-loop.md) owns planning, saved history and archiving on both routes. A managed project uses the [hosted delivery adapter](../../.agents/skills/save/scripts/hosted-delivery.mjs) for its authenticated checkpoint, Cloudflare check result, exact private preview and publication status. It creates no GitHub pull request. Existing GitHub projects keep their usual checks, staging and merge flow.

One active change binds its name to the actual branch in its proposal; the names may differ. The checkpoint records the expected main SHA and exact candidate SHA. Cloudflare checks the whole change, builds through ordinary app commands and records the native immutable preview from provider receipts. Missing, foreign, failed or unreadable checks cannot approve publication. The review link comes from that exact result, never from a guessed URL or an earlier preview.

Before final approval, finish the change's tracked archive, specification and metadata edits, then save and check that final candidate. Approval binds its exact head, expected main and immutable preview. Any later commit needs fresh checks and approval. The service reruns production checks/build and accepts only its recorded approved release operation; pushing main or a release branch alone never publishes.

Publication stays incomplete until the provider deployment, authenticated live project/SHA/assets and exact main acknowledgment all agree. If the deployment exists while either confirmation is missing, report that fact and the pending step. After the service independently verifies deployment and authenticated live identity/assets, the existing workspace uses its scoped Git access for one guarded fast-forward of the approved SHA to main. The service reads main back and records that acknowledgment. An offline workspace, expired context or changed main leaves publication incomplete. Continue the same operation by bounded readback or acknowledgment; do not deploy again, invent a success receipt or discard the saved refs. A later change starts from the service's confirmed main.

## Scope and recovery

This starter supports HTTP and static assets. Business databases, background jobs, personal memory and device setup are separate work. Readiness means the recorded repository, workspace and protected site are established; it does not imply a full personal installation.

Reconnect an expired or missing private workspace handoff through the existing service. A guessed project marker or remote cannot restore authority. Rollback disables new managed creation while preserving existing customer work and publication recovery. Cleanup needs explicit authorization for the exact recorded resources and grants, keeps Access while content can still serve, and reports verified absence or named leftovers.

## Delivery runbook

For a verified managed Artifacts project, use the [adapter](../../.agents/skills/save/scripts/hosted-delivery.mjs) instead of GitHub PR/check/merge transport. A marker or Artifacts origin only selects this procedure; [private verification](../../.agents/skills/wong-sync/scripts/hosted-context.mjs) must succeed before mutation. Missing authority stops with reconnect guidance. Explicit GitHub projects keep their existing route.

### Call the adapter

Write nonsecret request JSON into ignored scratch. The owning verb selects the change and actual branch; never infer one from the other. `selection` contains `changeName`, `branch`, `baseSha` (expected confirmed main) and `headSha` (exact saved candidate). `continue`, `publication` and `recover` may omit both SHAs to read that same registered change/branch; new candidate and approval claims need exact SHAs.

```bash
node "$ROOT/.claude/skills/save/scripts/hosted-delivery.mjs" <command> \
  --repo "$ROOT" --input "$REQUEST_FILE" --change-root "$CHANGE_ROOT"
```

The adapter verifies current private context, sends its token only in the authorization header, checks project/generation/remote/source identity, and prints whitelisted receipts. It runs no commit, push, merge or deployment. Keep its private handoff outside tracked files and reports.

### Each verb keeps its work

- **`/save`:** Keep selection, handoff upkeep, spec reconciliation and credential exclusion. Commit on the actual candidate branch. Fetch/read remote main and keep its exact SHA as `baseSha`; the service must confirm that base. Register `checkpoint` before the ordinary candidate push so the push event can claim that exact candidate. Then push and poll `gate`. Repeat only read-only lookup for up to 20 minutes, at 15-second intervals while checks are pending. Exact passed checks yield `SUCCESS`, failed checks `FAILURE`, and a timed-out run or polling budget `TIMEOUT`; missing/foreign/unreadable results yield `UNKNOWN`, never `NONE`. Preserve the existing capped fix loop; every fix gets a new committed checkpoint. `preview` returns only the exact passing native receipt. Create no GitHub PR.
- **`/apply`:** Keep planning and implementation. Request `preview` only for the exact saved head. Unsaved edits or missing remote checks mean preview pending; never show an earlier preview as this work. A task needing remote checks still invokes `/save` under the existing gate-task rule. Upload no hosted app from the AI host.
- **`/continue`:** Keep the existing selection and dirty-work protections. Use `continue` for the selected change and recorded branch. Fetch/read Artifacts history to find the proposal when needed; no GitHub PR lookup. Resume that actual branch, even when its name differs from the change. A publication pending confirmation stays the same operation.
- **`/ship`:** Keep task completion, validation, spec reconciliation and archive. Finish all tracked edits, including release metadata when applicable, **before** the final `/save` and exact approval. A final archive checkpoint retains the original change name and branch. Require `SUCCESS`; an unreadable hosted gate cannot fall back to GitHub. Verify the exact preview through the existing walk, then `approve` with `candidateId`, a fresh `publicationId` and its exact `preview` receipt. Approval records source and expected main; it does not itself deploy. Only an `approved` receipt permits the first ordinary Git push of that exact head to `refs/heads/release/<publicationId>`; other phases use status/recovery. Keep main unchanged until the confirmation step below; do not run the GitHub merge script.

### Confirm publication

`publication` reads the same operation by `publicationId`; `recover` rereads its provider/live facts and actual Artifacts main. An uncertain release push requires status/ref readback before retry. Never replace approval or redeploy an existing operation. Keep refs while incomplete.

When status exposes validated provider and live project/SHA/assets receipts and `repositoryAckNeeded: true`, the existing workspace performs only the ordinary Git acknowledgment with its already configured repository-scoped private grant. It receives no deployment or management credential. The service may retain the original passing preview past its candidate deadline for this already approved operation while private context remains valid. That permits only the same readback/acknowledgment; fresh approval or deployment remains deadline-bound. If the workspace is offline or private context expired, publication stays incomplete.

1. Read exact remote `refs/heads/main`. Already the approved SHA after a lost reply → call `recover`, with no push. Any head other than the expected approval base → stop; retain the operation and report changed main.
2. At the expected base, check ancestry and prepare a private temporary hooks folder outside the customer checkout. Its `pre-push` invokes the root-owned [guard](../../.agents/skills/save/scripts/hosted-main-pre-push.mjs) through the existing trusted runtime:
   ```sh
   #!/bin/sh
   exec /usr/local/lib/wongstack-agent-runtime/bin/node /opt/wongstack/source/.agents/skills/save/scripts/hosted-main-pre-push.mjs "$1" "$2"
   ```
   Make that hook executable. Set `WONG_HOSTED_ACK_REPO` to the checkout and `WONG_HOSTED_ACK_REQUEST` to the nonsecret JSON containing the exact `selection` and `publicationId`. Use this pinned host copy for the hook; customer edits to copied payload scripts cannot replace it.
3. The skill runs one ordinary push with `-c core.hooksPath="$HOOK_DIR" -c push.followTags=false`, the verified Artifacts remote and the exact refspec `"$APPROVED_SHA:refs/heads/main"`. Use no force, force-with-lease or hook bypass. The guard freshly verifies private context and publication, accepts exactly one update, and checks Git's advertised old remote SHA against the approved base before transfer. A concurrent changed head is refused. It executes no customer hooks, checks, builds or deployment.
4. Read back main, then call `recover` for that same operation. Cloud records acknowledgment and completes publication only when main equals the approved SHA and its independent deployment/live receipts still agree. On a lost reply, unreadable ref or failed acknowledgment, repeat bounded readback/recovery; never redeploy. Remove the temporary hook folder afterward.

Report *published* only with all three matching receipts. Otherwise name the known deployment and pending confirmation. Sync from confirmed main only after success, keeping dirty-work protections. New work starts from that confirmed main.

Back to the [Cloudflare stack](README.md).
