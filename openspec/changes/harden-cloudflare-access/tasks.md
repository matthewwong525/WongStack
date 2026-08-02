## 1. Confirm the mechanics before writing the fix

- [x] 1.1 Verify that Access on a `workers.dev` hostname serves a logged-in browser a placeholder while admitting a service token — reproduce, or record the adopting repo's evidence as the source
- [x] 1.2 Verify the Access API accepts partial-label wildcards (`*-<worker>-staging.<subdomain>.workers.dev`) and note any plan-tier dependency; the scoping recommendation rests on this
- [x] 1.3 Confirm the header set a service-token request actually arrives with (`cf-access-jwt-assertion` and the ordinary `cf-*` headers, no email)
- [x] 1.4 Try to obtain the adopting repo's working `worker/access.ts` rather than re-deriving it

## 2. wiki/stack/cloudflare-access.md — the hostname model

- [x] 2.1 Replace the `*.<subdomain>.workers.dev` recommendation with a custom-domain requirement, stating why Access cannot reliably gate a zone Cloudflare owns
- [x] 2.2 Document the terminal-passes / browser-fails symptom so an adopter already in that state recognizes it
- [x] 2.3 Give app-scoped hostname patterns — production, staging Worker, branch previews — and document the partial-label wildcard form as the mechanism that makes scoping possible
- [x] 2.4 State the capability that is genuinely lost: previews on `workers.dev` can no longer be gated
- [x] 2.5 Rewrite the verification step to require a logged-in browser load, and say explicitly that an anonymous `302` plus a service-token `200` is not evidence

## 3. wiki/stack/cloudflare-access.md — the auth model

- [x] 3.1 Replace `getAccessEmail()` and the header-trust model with JWT verification of `Cf-Access-Jwt-Assertion` against this Access application
- [x] 3.2 Document reading `email` for humans and `common_name` for service tokens as one path serving both
- [x] 3.3 State both reasons the header pattern is rejected: it locks out every machine caller including `/walk`, and its soundness rests on a precondition the reader cannot confirm
- [x] 3.4 Keep fail-closed (`401`) and the explicit `SKIP_AUTH` development escape; keep the "adopted together with the code change" rule
- [x] 3.5 Reconcile `app/worker/index.ts`'s existing header-trust warning comment with the new default

## 4. app/worker/access.ts

- [x] 4.1 Add the verification module: verify the assertion against the app's Access application, return `email` or `common_name` from verified claims, fail closed
- [x] 4.2 Ship it inert — present, wired into nothing, enforcing nothing until Access is adopted
- [x] 4.3 Document enabling it as one wiring step in the Access runbook
- [x] 4.4 Add it to the app-scaffold file list in the payload manifest (coordinate with `offer-app-scaffold`)

## 5. /wong-cloudflare — the four run changes

- [x] 5.1 Enumerate accounts and stop for an explicit choice when the token sees more than one; create nothing before the answer
- [x] 5.2 Retry with backoff after a token widen, treating an early `403` as propagation; document the window in the probe protocol so a first `403` isn't diagnosed as a permission problem
- [x] 5.3 Say, when handing over a first-deploy URL, that it may 404 or show a placeholder for a minute or two
- [x] 5.4 Add the closing smoke test: one anonymous and one authenticated request, asserting app vs challenge per configuration, failing the run on a mismatch and naming which request disagreed
- [x] 5.5 Where Access is on, have the smoke test state that it does not prove a human can log in, pointing at the browser verification

## 6. Related docs

- [x] 6.1 Update `wiki/stack/cloudflare-credentials.md` on service-token values and what they do and do not set on a request
- [x] 6.2 Check `wiki/stack/staging-walkthrough.md` and the `walk` skill for anything assuming the email header reaches a service-token caller

## 7. Verify

- [~] 7.1 Stand Access up on a custom domain per the rewritten runbook and confirm all three callers behave: anonymous challenged ✅, service token admitted ✅, logged-in browser served — **outstanding, needs a human one-time-PIN login**
- [~] 7.2 Confirm `/walk` reaches a gated preview — the service-token mechanism `/walk` uses is verified against the gated host; a full `/walk` run needs `playwright`, which is not installed and which `/walk` never installs
- [x] 7.3 Confirm the scoped patterns gate the app's hostnames and leave an unrelated Worker on the same subdomain open
- [x] 7.4 Run `/wong-cloudflare` end to end and confirm the smoke test reports correctly on both a public and a gated app

## 8. Release

- [x] 8.1 Bump `VERSION` (minor)
- [x] 8.2 Write the `CHANGELOG.md` entry leading with the `workers.dev` finding in the imperative — anyone who set Access up on the old runbook must re-verify in a browser, because the wall may be admitting nobody and they have no signal that says so
