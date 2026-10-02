# Hosted migration acceptance in progress

This report records the representative hosted migration trial. Earlier feasibility reports remain separate. No production promotion, customer migration or merge has occurred.

## Validated source and staging preparation

| Case | Outcome | Observed evidence |
| --- | --- | --- |
| Initializer source | PASS, source only | `b2ba7f45cdfa7c0b9bd2c3b2d3b7298ae009b7b1`: all required remote checks, 1,160 script tests. No live consumer. |
| Trial boundary and original D1 receipt source | PASS | `9e4af1466e613e11b7a6038826e528e6ef7be521`: required build 37039348456, payload 37039348565, test 37039348582. |
| Disposable REST probe source | PASS, source only | `3a6b9b6f1241cc926b9b9fb48b6a8cd3a0198614`: required build 37039809409, payload 37039809449, test 37039809448; 1,179 script tests, zero failures. Coverage floors unchanged. Skipped duplicate PR runs are excluded as gate evidence. |
| Cloud source | PASS | `f232ad8e4609e54f834217d04732d33b6e13e30d`: required build 37034664625 and test 37034664493. |
| Isolated service update | PASS, infrastructure only | Exact source `3a6b9b6`, acknowledged active version `4581e7af-5632-4533-85b4-22d594887dd1`, routing probes and independent owned-resource readbacks. Namespace, DO, Workflow and container IDs preserved. |
| Staging-only cloud connection | PASS, configuration only | Active cloud version `5ac6be89-0ffc-4553-86ed-a930d620f155`, same green cloud code, exactly `WONGSTACK_HOSTED_URL`, `WONGSTACK_HOSTED_ADMIN_TOKEN`, `WONGSTACK_SOURCE_COMMIT` added. Existing required secrets, business DB, APP_URL and staging environment preserved. Production untouched. |

The first cloud secret command combined an already suffixed `--name` with `--env staging`. Pinned Wrangler targeted nonexistent `wongstack-cloud-staging-staging`; private debug records one rejected PATCH with provider code 10007 and no successful acknowledgment. Independent readbacks proved the original active/latest versions and resources unchanged and the wrong target absent. The failed intent and logs were retained. A separately reviewed same-state correction omitted `--name` for the secret command, then independently verified the acknowledged exact deployment. This is corrected infrastructure setup, not cloud signup or VM acceptance.

Private original configuration and version receipts are retained for restoration. Secret deletion follows the [provider's documented version flow](https://developers.cloudflare.com/workers/configuration/secrets/#delete-secrets-from-your-project); no existing required secret is deleted or rotated. Cleanup remains pending and must be independently verified before claiming completion.

## Repository-only GitHub migration diagnosis

Use the second planned project `c1b7db67-9e30-46aa-9a8c-82c96bca4210`, with a synthetic fixture owner and scoped machine grant. It remains repository-only: no business/memory DB, Worker, Access app, VM, AI account or memory identity was created. The original source is public `matthewwong525/WongStack`; it was read, never modified or pushed by this trial.

The isolated local fixture has a private Git configuration, a local branch and commit beyond its GitHub origin, and an uncommitted tracked note. Actual `prepare` from the detached exact green source ran with platform credentials excluded from child Git/helper environments.

| Case | Outcome | Evidence |
| --- | --- | --- |
| Full-ref source mirror/object verification | PASS | 354 advertised refs: four heads, 115 tags and 235 other refs; source mirror matched, full fsck passed. |
| Artifacts mirror push and ref readback | PASS | Actual push acknowledgment and independent advertised-ref map matched every source ref/SHA. No push trigger or publication ran. |
| Default full Artifacts restore | FAIL | Actual client restore clone returned Git 128; independent diagnostic clone reproduced HTTP 500 / expected packfile. Original working origin had not been switched. Original one-shot operation retained uncertainty; it was not replayed. |
| Full mirror using protocol v1 | FAIL | Distinct documented protocol also returned Git 128. The precise provider cause is unknown. |
| Main-only protocol v2 fetch | PASS | Bare single-branch/no-tags clone, then full fsck. |
| Bounded complete independent restore | PASS | Twelve explicit no-tags fetch batches of at most 32 refs into the independent bare repository; all 354 refs matched exactly and full fsck passed. This verifies complete objects/ref history for this observation, not the failed client completion. |
| Original client completion after explicit reconciliation | PASS, operator recovery | Verified an independent full bare cache, unchanged source/destination refs and untouched local work before replacing only the absent failed cache. The actual exact-source client then completed with all 354 refs/objects verified, local branch/commit/uncommitted files preserved and GitHub backup remote retained. The original uncertain receipt remains unchanged. |
| New bounded restore implementation | PASS, repository restore only | Exact `7aa6bbcd35b00dccac3eaefb9b98f27cf3aa88c1` passed required push build 37044210927, payload 37044210822 and test 37044210897: 1,187 script tests. Its exported helper then cold-restored all 354 refs into a new isolated bare cache, fetched at most 32 explicit refs per batch, passed full fsck and preserved local work plus historical failed/recovery receipts. The older project/service source pin stayed unchanged; no full preparation rerun or VM/setup acceptance is claimed. |
| Grant and issued repository token removal | UNKNOWN | Issued provider IDs/state/scope/expiry are recorded privately. Service bookkeeping is reviewed source/contract evidence, not public status evidence. Every observed credential still needs actual revocation/expiry and old-credential rejection checks. |

[Artifacts documents both fetch protocols](https://developers.cloudflare.com/artifacts/api/git-protocol/); that does not explain the observed full-mirror HTTP 500. The bounded restore passed and motivates the client correction without assuming an undocumented provider limit or discarding refs.

## Unfinished acceptance

Primary cloud owner mailbox is pending; no immutable owner identity is guessed. No primary project database, cloud fixture user, physical VM, canonical memory initialization, owner confirmation or device approval has run. The source-only probe is gated but its two live phases remain separate and unexecuted. No PASS above releases memory integration or proves future REST atomicity.

Actual repo+AI provisioning, the single `/wong-setup` path, real application assets/migrations, private human login, canonical memory, checked preview, exact owner-approved publication/main advancement, another change, teammate isolation/removal, final cloud source pin and full teardown remain incomplete. Required source checks are green; overall merge readiness is not established.
