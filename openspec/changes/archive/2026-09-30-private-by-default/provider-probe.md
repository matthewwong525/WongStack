# Worker-scoped Access provider probe

Observed on 2026-09-30 in Cloudflare account `040f88e2bf4f25fb0b91b7cb24f3d442`. Task 1.1 passed: fresh dedicated email login through the default-address anchor and all ten protected addresses succeeded without machine headers or a custom-domain requirement. The owned disposable resources have been removed.

## Owned disposable resources

- Resource prefix: `wong-private-probe-munk6fj5`.
- Production Worker name: `wong-private-probe-munk6fj5-prod`; real Worker ID from `GET /workers/workers/<name>`: `e3b547bbd79e4b8483bb17b43cee48a3`.
- Staging Worker name: `wong-private-probe-munk6fj5-staging`; real Worker ID: `1a24e990814f41f68d3007f56b23c0b0`.
- Access app: `f46f5a2b-0c59-4323-8923-de7d1c663af8`.
- Human allow policy: `6daf42a1-98ae-4aa9-9c95-fbd0260fc750`; exact email `matthewwong525@gmail.com`.
- Separate machine `non_identity` policy: `48a19b80-0977-4889-9de2-c359771dcbbf`; disposable 24-hour service token `d39cad01-31b2-42f5-b75c-ee4e54d27d18`.
- Custom domain IDs: `b8314f76f9324020b885274f8588bc480c7e8b8f` (production) and `0bb5b1f6fa60e37dd421c5fc3ae79f5fd812cda3` (staging).

The existing organization `startuptemplate.cloudflareaccess.com` and its existing one-time-PIN provider were reused. No unrelated Workers, domains, policies, identity providers, or organization settings were modified. The shared user token received the four documented account-scoped Access provisioning groups while retaining its existing policy resources; token verification and organization/provider reads then passed. First-time organization creation was not tested by this already-onboarded account.

## API contract observed

`POST /accounts/<account>/access/apps` accepted one self-hosted app with two destinations, each `{"type":"worker","worker_id":"<actual Worker ID>"}`. Production alone carried `overrides: [{"behavior":"public","path_pattern":"/_memory/*"}]`. No account-wide or wildcard-hostname destination was created.

The app and exact-email human policy accepted `session_duration: "720h"`; a subsequent application GET retained that duration, both destinations, the override, and both policies. This confirms returned configuration, not JWT lifetime or early revocation. The machine policy used `decision: "non_identity"`, Cloudflare's actual API spelling for service authentication.

Workers were first deployed with a disposable unavailable 503 response. The old versions were uploaded before attaching Access; fresh content and aliases were uploaded afterward. Probe content contained no app assets or business data. Custom hostnames were attached after protection; their initial DNS/certificate propagation failure cleared before the checks below.

## Edge results

| Destination | Anonymous request | Dedicated machine request |
| --- | --- | --- |
| Production default `workers.dev` | 302 to the existing Access organization | 200, `Disposable Access probe fresh` |
| Staging default `workers.dev` | 302 | 200, fresh marker |
| Production old version `cd8a3dfb-963e-4cf9-9650-dcd33d567820` | 302 | 200, old marker |
| Staging old version `912fe195-9613-43ba-81ea-214d223c9c07` | 302 | 200, old marker |
| Production fresh version `43607bd4-2449-4f27-bf95-dc1286acc68d` | 302 | 200, fresh marker |
| Staging fresh version `a61633dc-b7cf-4997-9ff0-f3abf4b7709b` | 302 | 200, fresh marker |
| Production and staging `branch-probe` aliases | 302 | 200, branch marker |
| Production and staging custom `wongstack.com` hostnames | 302 | 200, fresh marker |

Default URLs are `https://<Worker name>.matthewwong525.workers.dev`; version URLs prepend the first eight characters of the version ID and `-`; alias URLs prepend `branch-probe-`. Custom URLs are `https://<Worker name>.wongstack.com`.

Production `/_memory/read` and `/_memory/read/deep` reached the probe's independent test-key check without an Access identity: absent test key returned 401, valid disposable test key returned 200. `/_memory` and `/_memoryx/read` returned the Access 302 challenge even with that test key. This probes only the provider's narrow override; the real memory implementation and its keys still need their own tests.

## Email login and the default-address anchor

The parent completed real one-time-PIN login through the dedicated cloud walk inbox and observed all ten default/custom/old/fresh/alias hosts render their expected probe markers in the browser without service headers. The application cookies matched the original app audience and exact test email, and `exp - iat` was 720h. The separate staging diagnostic app's cookie used its own audience and also lasted 720h. Browser session state was saved separately at `/root/.wong-stack/access-tests/private-by-default-human-session.json` with mode 0600; safe host results were read from `/tmp/private-access-human-results.json`.

For the approved automated email-login test, the disposable human policy was changed to the exact dedicated test address `walk+private44653bbbf55e6c4e@wongstack.com`. Application and policy GETs confirmed that address, the existing one-time-PIN identity provider, and the 720h duration. With only Worker destinations, the parent observed no delivered Access OTP after fresh challenges/resends, while a cloud staging sign-in message to the same address arrived immediately. The exact-hostname diagnostic app then delivered its Access OTP and completed login; that organization session also reached all native Worker addresses. This isolates a native-only initial-login problem without mistaking machine responses for human success. [Cloudflare's OTP guidance](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) states the code-sent message is also shown when policy blocks delivery; [troubleshooting](https://developers.cloudflare.com/cloudflare-one/access-controls/troubleshooting/) also names delivery suppression.

Two scoped diagnostics were added without widening that exact test identity:

- A separate hostname-based app `3ff0a6da-ccc5-4fd9-84d4-653029dcc73b`, named `wong-private-probe-munk6fj5-hostname-diagnostic`, protected only the disposable staging custom hostname, with the same exact-email and separate machine policies. Its OTP/login succeeded. It has now been deleted, restoring native protection for that hostname.
- Adding the production custom hostname as the original app's legacy `domain` while supplying only its two Worker destinations failed with HTTP 400, code `12130`, `domain not included in destinations`. Adding the matching exact `public` destination as well succeeded and retained both Worker IDs, the memory override, policies, and 720h.
- The original app was changed to use its production default `workers.dev` address as `domain`, retaining both actual Worker destinations and adding only that matching exact public destination with a mirrored `/_memory/*` override. The custom public destination was removed. An independent fresh browser profile completed its initial email OTP directly on that default address; all ten protected hosts then rendered their expected markers. The staging custom hostname now used the original app audience, after the diagnostic app's removal. Anonymous/service/key boundary checks still passed with this shape.

A separate native-only `identity-probe` alias confirmed the incoming `Cf-Access-Jwt-Assertion` header is present for the machine caller, its audience matches this application, and its claims contain a service `common_name` rather than a human email. The fresh human profile reached that same alias and confirmed a signed assertion, matching application audience, human email present, service name absent, and `iat: 1790741160`, `exp: 1793333160` (720h). No raw token was returned or logged. `ctx.access` was absent for both callers in this probe, so the existing signed-JWT verifier does not need to depend on that context.

Dedicated probe service credentials and safe resource metadata were saved outside git under `/root/.wong-stack/access-tests/private-by-default.json` (directory 0700, file 0600). Existing primary-worktree credentials were not changed. Fresh browser state was saved separately under `/root/.wong-stack/access-tests/private-by-default-human-fresh-session.json` with mode 0600. Probe cleanup has invalidated these disposable credentials and sessions; the saved service record explicitly marks resources deleted, so future verification must provision dedicated credentials for its own workspace.

Cleanup removed only the two custom domain IDs, two disposable Workers, original disposable Access app, and disposable service token listed above; the extra diagnostic app had already been removed. Subsequent account-level Worker/domain/Access-app/service-token list checks returned no resources with this probe prefix. Existing organization settings and unrelated resources remain unchanged. Credential values are intentionally absent from this file.
