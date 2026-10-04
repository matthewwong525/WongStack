# Implementation and acceptance evidence

Source revision: `5e31b8e524db9f06a806fd03a17e12690b09c8b8`, branch `stiff-camel`, 2026-10-04. Includes the separately shipped memory release from main. Acceptance/checklist records updated afterward do not change the tested implementation.

## Remote source gate

- [App checks](https://github.com/matthewwong525/WongStack/actions/runs/37173664184): 101 tests passed in 16 files; 100% lines, statements, branches and functions; lint and unused-code checks passed.
- [Payload and script checks](https://github.com/matthewwong525/WongStack/actions/runs/37173664215): 1,091 tests passed; 91.85% lines/statements, 88.63% branches and 94.54% functions. Payload links, context limits, OpenSpec configuration, private-name and release checks passed.
- [Build and preview deployment](https://github.com/matthewwong525/WongStack/actions/runs/37173664179): passed; Worker upload 158.50 KiB (36.11 KiB compressed). Preview discovered from deployment 6836288767: https://stiff-camel-wongstack-staging.matthewwong525.workers.dev
- The save gate returned SUCCESS for this exact revision. No check setting was loosened. Source builds/tests ran in CI.
- Fixtures cover contracts, signed identity validation, discovery additions/removals, employee-client isolation and uncertain writes, memory adapter/direct-command parity, machine ownership, redirect refusal and complete installed payloads. They use synthetic data and do not establish a real business integration.

## Deployed anonymous observations

Checked the discovered preview on 2026-10-04 at approximately 03:24 UTC using unauthenticated HTTPS GET requests with redirects disabled and a 15-second timeout. The requests used no credential, cookie, employee session or owner configuration. Only status, content type and the redirect origin were retained; redirect query strings and response bodies were not logged.

| Request | Observed status | Redirect origin |
| --- | --- | --- |
| `/api/actions` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/api/actions?id=hello.greeting` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/api/openapi.json` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/apps/hello/api/greeting?name=Ada` | 302 | `https://startuptemplate.cloudflareaccess.com` |
| `/_memory/health` | 302 | `https://startuptemplate.cloudflareaccess.com` |

All responses had content type `text/html; charset=UTF-8`. These observations establish anonymous denial at the Access edge; no successful action response or schema was exposed. They do not establish an authenticated Worker response, action execution or the Worker's raw-memory status.

## Acceptance context

No permitted employee account/disposable identity or separate authorized production memory installation was supplied for these checks. Existing owner/deploy credentials were not used in place of an employee; no credentials were issued, access policy changed, production binding added or external provider connection created. Tasks 6.2–6.4 explicitly allow recording unavailable live checks as unverified. Their completion below means the safe observations and limitations were recorded, not that unavailable acceptance checks passed.

### Task 6.2 — employee sign-in and app/agent parity

**Human login unverified.** No permitted employee account with only its own login was available. First-use `cloudflared` sign-in on this `workers.dev` preview, authenticated discovery, greeting description and execution, browser-app parity, and subsequent cached-session reuse remain unverified live. The anonymous greeting request stopped at the Access edge. CI fixtures establish the source behavior described above; they do not replace the human login check.

### Task 6.3 — denial, target separation and fresh discovery

**Anonymous company denial verified at the Access edge** by the list, selected detail, OpenAPI and greeting observations above. Expired/removed employee-session denial is **unverified live** without an authorized disposable identity. Fresh authenticated discovery after an additional synthetic action reaches the preview is **unverified live**; no new route or deployment was introduced for this acceptance pass. Registry addition/removal and cache-revision behavior passed in CI.

The recorded deployment names the branch preview separately from production. Reviewed configuration gives staging its own Worker name and database, omits `MEMORY_DB` and `MEMORY_BUCKET` from staging, and the exact-revision remote deployment passed. This supports configuration-level target separation; an authenticated live check of both targets is **unverified**. No production endpoint or credential was used for these observations. Synthetic health/greeting examples prove no real business integration.

### Task 6.4 — combined production memory access and preview isolation

**Production memory integration unverified.** No separately authorized non-admin production installation was available, so combined discovery, harmless memory reads, and the live preservation of its production memory target while selecting this preview were not exercised. Existing owner/admin memory access was not borrowed.

The anonymous preview request to `/_memory/health` returned an Access-edge 302. It therefore does **not** prove a deployed Worker-level 404. The source handler returns `404 no_store` without `MEMORY_DB`; staging declares no production memory bindings, and CI fixtures cover preview 404, independent company/memory authentication and primary-checkout target preservation. Those source/configuration checks passed, while the live Worker-level 404 and non-admin production helper flow remain unverified.

## Host preview after starter-binding type correction

On 2026-10-04 the host preview compiled the corrected output guard using the committed starter binding types, installed dependencies only for previewing, and uploaded staging version `492c997e-ebd1-4e64-ac82-8f0d82ffe4a1`. The actual alias printed by Wrangler was https://employee-app-agent-access-wongstack-staging.matthewwong525.workers.dev . This upload used the primary checkout’s preview credential; no employee credential or production memory data was used. Staging migrations had nothing to apply. Read-only protection checks passed before build and upload, with human login explicitly unverified. No check was loosened.

The correction only widens a callback’s static binding-value type before its existing runtime string check. The previously tested implementation behavior is unchanged, but task 6.1 remains pending until CI passes the corrected source revision. This local build served the requested host preview, not the source gate.
