# Deployed source and server evidence

## Reviewed feature checkpoint

Source feature revision `9795b516c54917afd55510b0c7fa2e761f014c1b` passed the aggregate `/save` gate on [PR 213](https://github.com/matthewwong525/WongStack/pull/213). [Build/deploy](https://github.com/matthewwong525/WongStack/actions/runs/36675391307), [app tests](https://github.com/matthewwong525/WongStack/actions/runs/36675391357), and [payload checks](https://github.com/matthewwong525/WongStack/actions/runs/36675391298) passed. First-run failures were corrected by making a shared spec generic and recording a comment-only knip change; a later existing review-note browser timeout passed on retry, with all ten browser checks independently passing locally. No check settings were weakened.

## Source addresses

A fresh dedicated email login and securely saved session (outside git, mode 0600) reached production default, staging default, staging custom, the earlier `app-design-finished` staging alias, and the new `zero-trust-defaults` staging alias. Five paths on each address (HTML, shared CSS, Hello page and JavaScript, health API) produced 75 independent requests: anonymous 302, human 200, machine 200. All app cookies had the expected app audience, dedicated test email, and a signed 720-hour lifetime. Forged identity headers and a development-bypass query were challenged. The staging memory route returned 404, while a separate memory-key read through source production answered successfully.

The new signed origin guard is deployed on current staging/default/custom and the new preview. Source production and the pre-existing alias retain the native Access wall on their earlier content until the source release deploys. These observations do not claim the new guard was uploaded to those older versions. The native wall preserves protection across that release boundary.

## Real Ubuntu server and unattended install

An isolated Ubuntu 24.04 `cx23` server in the dedicated staging project ran `server/setup.sh` from the reviewed source. All ten promised commands were present, Node was `v22.23.3`, OpenSpec was `1.13.2`, and `paseo.service` was active. The installer ran as workspace user `wong`, using a reachable dedicated cloud-fixture owner independently of git authorship. It returned `done`, and the owned private target repo's first commit passed [Test](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36676504580) and [Deploy](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36676504584).

The owner's fresh PIN login rendered the deployed starter; saved human cookies were 720 hours and mode 0600. An independent machine request returned 200 and anonymous access returned 302. `memory.mjs digest` succeeded; an additional read through the recorded production memory Worker returned an admin-authorized result from the empty store. The installer rerun returned `done`, with the same pushed HEAD, app, policies, Workers and management-token ID.

The version-1 management file echoed the exact source pin, target/account/owner and preallocated staging recipient. It was a workspace-user-owned regular file mode 0600 inside mode 0700; the rerun preserved it. It remains privately on the server until the cloud has authoritative matching account/VM/job records and acknowledges authenticated delivery. No value appears in this evidence. This direct installer run proves no cloud host root-token rolling behavior; that belongs to downstream host tests.

Server, repo and Cloudflare resources are retained only for the coordinated live membership/offline checks. Task 6.2 remains pending until their owned-resource cleanup completes. Live removal/revocation, existing-owner cloud recovery, standalone setup and final release checks are still required.

## Delivered server fixture previews

The same server fixture app (`d2394c31-9120-4231-8dce-ec4181488ac1`) protects its actual production/default, staging/default, two immutable staging versions and one branch alias. These are separate from the removed ten-address prerequisite provider app and the source app above; no custom domain was created for this repository.

| Surface | Actual CI URL | Version |
| --- | --- | --- |
| Production | https://private-server-munoxync.matthewwong525.workers.dev | `20061c0a-88d3-4084-b7f6-6eb5adee3d47` |
| Staging | https://private-server-munoxync-staging.matthewwong525.workers.dev | `1ec06a0a-b72c-41d3-afdb-0d1ac271a636` |
| Old version | https://0a093e66-private-server-munoxync-staging.matthewwong525.workers.dev | `0a093e66-64e3-418d-a62b-bd41cdeb7656` |
| Fresh version | https://4d4df37c-private-server-munoxync-staging.matthewwong525.workers.dev | `4d4df37c-15e2-4a99-b285-126d815108c1` |
| Alias | https://fixture-preview-coverage-private-server-munoxync-staging.matthewwong525.workers.dev | Fresh version above |

The [first preview CI](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36680037920) returned the old version and alias URLs. The [second preview CI](https://github.com/matthewwong525/private-server-munoxync/actions/runs/36680266277) returned the fresh version and updated alias URLs. Both Test and Deploy gates passed. After the alias moved, a five-path matrix on every address verified anonymous 302, independent machine 200 and saved real-owner human 200 (75 requests). The old Hello marker remained on the old immutable URL; staging/fresh/alias served the fresh marker. All five application cookies had signed 720-hour lifetimes and were saved outside git in mode 0600. This preserves the cloud fixture's original private result and sticky resources.

A second `server/setup.sh` attempt encountered the normal unattended package-upgrade lock; after the operating system finished it, the retry completed successfully. No lock was deleted or system updater killed.

## Standalone installation and preview-first login

The full standalone payload was installed into an empty dedicated target by the standalone runbook, without invoking the server installer. It recovered from induced Access app creation failure using the same bootstrap Workers; while protection was incomplete their default addresses were unavailable. The completed provisioning rerun created or updated no resources and retained machine/memory credentials. The inventory now includes the Node version file both shipped CI workflows require, with a workflow-to-payload contract test.

[Standalone PR 1](https://github.com/matthewwong525/private-standalone-munoxync/pull/1) passed the first staging gate at `279f569`. Initial check-review failures were resolved by recording the newly introduced exact starter settings; none was weakened. The already-green fixture branch was temporarily the disposable repository default for the normal production CI path at `fb48225`, then default `main` was restored. [Production Deploy](https://github.com/matthewwong525/private-standalone-munoxync/actions/runs/36680629755) and its Test gate passed. Production, staging default and actual CI alias each passed all five content paths with separate anonymous 302, machine 200 and real-owner human 200 (45 requests). Every application cookie was signed for 720 hours and saved privately. A production memory-key query returned admin-authorized data; the unkeyed query returned 401 and staging returned 404.

Preview-first human login initially failed to finish at the still-disabled production callback. The source correction records newly created bootstrap ownership, verifies the owned app and both exact policies, then enables only its protected unavailable production default once; previews stay disabled and adopted/existing publication choices are preserved. All 77 focused provision/installer tests passed, covering policy/application mismatches, interrupted uploads/activation, lost receipts and retry markers.

The live callback check reused the same disposable standalone resources. It deliberately replaced production fixture content with the standard unavailable bootstrap response and disabled its default/previews, then replayed a controlled pending ownership marker in a separate private test journal. An induced policy-read interruption preserved disabled settings and machine 404. Recovery through the source function enabled the default only after exact provider readback: anonymous 302, machine 503 with only the setup-incomplete response, and previews still disabled. A fresh dedicated owner OTP reached the existing staging alias while production still contained no business content; its new app cookies were 720 hours. The original CI-green production version `0ff51cce-2849-42b8-b77d-81a3aac7c3b3` was restored afterward, with no forced operation. This replay proves the native callback; automated first-creation ownership-marker behavior is additionally covered by the source contract tests.

The standalone repository/resources remain only through their final verified fixture checkpoint and owned cleanup. The real cloud server fixture remains retained beyond the two-hour staging sweep with `wongstack-env=private-check` and `wongstack-retain=access-live-gates`; its pending private result remains untouched. Parent owns teardown after coordinated live/dashboard-authority gates.
