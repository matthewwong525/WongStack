<!-- openspec-archive v1 2026-08-03-harden-cloudflare-access -->
<!-- file proposal.md utf8 11331 -->
# harden-cloudflare-access

**Status:** shipped
**Open questions:** whether partial-label wildcards work on *every* plan tier is still unknown — confirmed on two accounts, not established as universal. The runbook documents that uncertainty rather than resolving it.

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

The Access runbook's recommended path does not work, and the way it fails is the dangerous kind: **every terminal-testable path passes.**

An adopter stood the wall up exactly as documented, on `workers.dev`, and got this:

| caller | result |
|---|---|
| unauthenticated | 302 to login ✅ |
| service token | reaches the Worker ✅ |
| **logged-in browser** | Cloudflare's *"There is nothing here yet"* placeholder ❌ |

Access is built for zones you own; `workers.dev` is Cloudflare's. Only the browser path fails, so `curl`-based verification reports a working wall and the reader concludes they are protected. The runbook currently names `*.<subdomain>.workers.dev` as *"the trick that makes previews free"* and the spec requires that wildcard.

Three further findings compound it:

- **The documented auth snippet locks out every machine caller, including WongStack's own `/walk`.** The runbook's `getAccessEmail()` reads `Cf-Access-Authenticated-User-Email`. Access strips `CF-Access-Client-Id` and sets **no email header for service tokens** — such a request arrives carrying only `cf-access-jwt-assertion`, `cf-connecting-ip`, `cf-ipcountry`, `cf-ray`, `cf-visitor`. So the documented pattern `401`s CI and `/walk`. The signed JWT is the only signal covering humans (`email`) and machines (`common_name`) both.
- **The wildcard over-gates a shared subdomain.** `*.<subdomain>.workers.dev` matches every Worker in the account — for one adopter it would have walled five unrelated ones. The Access API does accept partial-label patterns (`*-<worker>-staging.<subdomain>.workers.dev`), which is not obvious and is what scoping needs.
- **Provisioning has no propagation, account-selection, or smoke-test step.** After widening the token, Access endpoints `403`'d for about a minute and the probe protocol treats a first `403` as failure. A multi-account token nearly provisioned one project into another's account. And a fresh `workers.dev` hostname serves a placeholder for a minute or two after first deploy, which reads twice over as "the deploy failed."

## What Changes

- **The runbook requires a custom domain for Access**, and states plainly that `workers.dev` cannot be reliably gated. The `curl`-passes-browser-fails asymmetry is documented as the expected symptom, so a reader who sees it recognizes it.
- **Terminal checks stop counting as evidence.** Verification requires a logged-in browser load; a service-token `200` is explicitly named as *not* proof the wall works.
- **JWT verification becomes the documented default**, replacing plain header trust. The verified assertion carries `email` for humans and `common_name` for service tokens, so one path serves both and machine callers stop being locked out. The implementation ships as `worker/access.ts` in the app scaffold rather than as a snippet each adopter retypes.
- **Hostname patterns are scoped to the app** — the app, its staging Worker, and its branch previews — never a bare subdomain wildcard. The partial-label form is documented, since it is the thing that makes scoping possible.
- **`/wong-cloudflare` gains three steps and one check**: enumerate accounts and stop for a choice before creating anything; retry with backoff after widening a token, treating an early `403` as propagation rather than failure; set expectations that a fresh hostname 404s briefly; and finish with a **smoke test** — one authenticated and one anonymous request against the deployed URL, asserting app versus challenge. That single check would have caught both the broken wall and the locked-out service token immediately.

**Non-goals:** making Access work on `workers.dev` (it is Cloudflare's zone; the answer is a custom domain); requiring Access at all — it stays opt-in and the app stays public by default; the CI and config-drift fixes.

## Capabilities

### Modified Capabilities
- `cloudflare-access-guide`: the wildcard requirement is replaced by scoped hostnames on a custom domain, and the header-trust auth model is replaced by JWT verification covering both caller kinds.
- `cloudflare-provisioning`: account selection, token-propagation retry, hostname-propagation expectation-setting, and a closing smoke test.
- `app-scaffold`: the scaffold carries the Access verification module, inert until Access is adopted.

## Impact

- `wiki/stack/cloudflare-access.md` — the hostname model, the auth model, the verification protocol.
- `.claude/skills/wong-cloudflare/SKILL.md` and `references/` — account selection, retry, smoke test, expectation-setting.
- `app/worker/access.ts` — new; JWT verification for humans and service tokens.
- `wiki/stack/cloudflare-credentials.md` — service-token values and what they do and don't set.
- `VERSION`, `CHANGELOG.md`.
- **Any repo that already stood up Access following this runbook may believe it is gated when a browser is not** — the changelog must say so directly.

## Decision log

- **2026-08-02** — Implemented 27/31. Sections 2–6 done; section 7 blocked.
  **Section 1 resolved better than expected.** The design flagged the partial-label wildcard as the blocking open question ("verify before documenting") — confirmed **live against the Access API**: `*-claymoo-admin.snowy-waterfall-9b1b.workers.dev` is a working application domain on a real account. Plan-tier dependency could not be established, and the runbook says so rather than implying it was proven. The `common_name` claim was confirmed **authoritatively** in Cloudflare's application-token docs: a service-token JWT carries `common_name` (the Client ID) and an empty `sub`, and no `email` — which is exactly the asymmetry the header pattern trips over. The adopting repo's `worker/access.ts` was not obtainable, so the module was written from the verified claim structure and the documented verification procedure instead — arguably better-founded than a copied snippet.
  The runbook now requires a custom domain, documents the curl-passes/browser-fails matrix as the recognizable symptom, gives app-scoped hostname patterns, states the real capability loss (`workers.dev` previews can't be gated), and replaces the terminal verification with a three-caller table whose decisive row is a logged-in browser.
  `app/worker/access.ts` ships inert and verifies the assertion (signature, `aud`, `iss`, `exp`/`nbf`) rather than trusting a header. **Tested: 15/15** — both caller kinds admitted, and every fail-closed path including `alg: none` downgrade, tampered payload, wrong-audience (a valid token for another app in the same org), unknown `kid` with rotation refetch, unconfigured env, and `SKIP_AUTH` injected as a *request header* being ignored. Typechecks and lints clean under `tsconfig.worker.json`; one real type error surfaced and was fixed (the runtime's `JsonWebKey` doesn't declare `kid`).
  `/wong-cloudflare` gained the four run changes. Note the account-choice hazard **reproduced incidentally**: the repo's own token sees two accounts, which is exactly the multi-account case task 5.1 guards.
  **Remaining (7.1–7.4):** standing Access up on a live custom domain and running provisioning end to end are outward-facing mutations on the user's production Cloudflare account. Not done unprompted. The CHANGELOG states this limitation explicitly.
- **2026-08-02** — **Section 7 run live** against `ithinkwong.com`, on the user's go-ahead. Created `wongstack-staging.ithinkwong.com` (Workers custom domain → the `wongstack-staging` Worker) and an Access application scoped to that one hostname, with a service-token policy and an email policy.
  **7.3 passes decisively.** The scoped app gates exactly one hostname; all five unrelated Workers sharing `matthewwong525.workers.dev` stay open (`200`). The account has **seven** Workers on that subdomain, so the `*.<subdomain>.workers.dev` pattern this change removes would have walled six unrelated ones — the over-gating risk is not hypothetical, it is this account.
  **Second independent confirmation of partial-label wildcards.** The pre-existing `ithinkwong.com` Access app carries `self_hosted_domains: ['ithinkwong.com', '*wongos.matthewwong525.workers.dev']` — a real partial-label pattern, on a *different account* from the one found during task 1.2. Two accounts, two live uses. Note the form is a bare `*` prefix on the label rather than the `*-` this change documents; both work, the mechanism is the same.
  **7.4 passes, including a negative control.** The smoke test from `/wong-cloudflare` 4g reports `pass` on the public app (anonymous `200`) and on the gated app (anonymous `302` to `cloudflareaccess.com`, service token `200`), and correctly reports `fail` with actionable wording — *"anonymous request returned 200 and was not challenged"* — when the public app is deliberately checked as if gated.
  **`access.ts` verified against real Cloudflare-issued tokens, not just synthetic ones.** Captured a genuine `CF_Authorization` JWT from a service-token request. Its claims settle the change's central premise **empirically** rather than from documentation: `common_name` present, **`email` absent**, `sub` empty. A Worker reading `Cf-Access-Authenticated-User-Email` would have rejected that caller — which is exactly the lockout this change fixes. The module accepts it against the **live** certs endpoint via both header and cookie, and rejects: the *other real app's* `aud` (cross-app replay, using a genuine second audience from the same org), a tampered payload, and a wrong team domain.
  **Outstanding: 7.1's third caller.** A logged-in browser needs a human to receive the one-time PIN; the IdP is OTP-only. Deliberately **not** marked verified — claiming a service-token `200` as proof is precisely the error this change exists to prevent, and doing it here would refute the change in its own record. `/walk` (7.2) needs `playwright`, which is not installed and which `/walk` never installs.
- **2026-08-02** — **7.1 closed: the maintainer confirmed the logged-in browser serves the app** on `wongstack-staging.ithinkwong.com`. That was the decisive row — the whole change exists because it is the *only* check that covers a human, and because on `workers.dev` it is the one that fails while every terminal check passes. The custom-domain requirement is now verified end to end rather than argued from the failure it avoids.
  7.2 is **descoped to the mechanism**: the service-token path `/walk` uses reaches the gated host and returns real app HTML, which is the property the task was protecting. A full `/walk` run needs `playwright` in the app's devDependencies — a separate opt-in this repo has not taken, and one `/walk` deliberately never installs. Recorded as descoped rather than checked off silently or left open against a dependency that is not coming.
  Change complete at 31/31 and archived.

<!-- end proposal.md -->
<!-- file design.md utf8 7750 -->
## Context

An adopter followed `wiki/stack/cloudflare-access.md` end to end and ended up with a wall that passes every check the runbook suggests and stops no human from being locked out — or, depending on how you read it, stops every human and admits every machine's opposite. The observed matrix on `workers.dev`:

| caller | result |
|---|---|
| unauthenticated | 302 to login ✅ |
| service token | reaches the Worker ✅ |
| logged-in browser | Cloudflare's "There is nothing here yet" placeholder ❌ |

Access applies to zones the account controls. `workers.dev` is Cloudflare's zone, and the login-completion redirect has nowhere correct to land. The runbook currently calls `*.<subdomain>.workers.dev` *"the trick that makes previews free,"* and the shipped spec **requires** that wildcard — so this is not a documentation slip, it is a specified behaviour that does not work.

Alongside it, three findings from the same adoption:

- The runbook's `getAccessEmail()` reads `Cf-Access-Authenticated-User-Email`. A service-token request arrives with only `cf-access-jwt-assertion, cf-connecting-ip, cf-ipcountry, cf-ray, cf-visitor` — Access strips `CF-Access-Client-Id` and sets no email. So the documented pattern `401`s CI and `/walk`. The adopter wrote `worker/access.ts` themselves after diagnosing it.
- `*.<subdomain>.workers.dev` would have walled five unrelated Workers sharing that subdomain.
- Provisioning lacks a propagation retry (Access `403`'d for ~a minute after a successful token widen), an account-selection step (a multi-account token nearly provisioned into the wrong account), and any end-of-run verification.

The unifying property: **every one of these is invisible to the checks the payload currently prescribes.** That is the thing this change has to fix, not just the individual values.

## Goals / Non-Goals

**Goals:**
- The documented Access path works when followed.
- A reader cannot mistake a passing terminal check for a working wall.
- One auth implementation serves humans and machines, so `/walk` and CI are not locked out by the recommended code.
- A policy gates the app, not everything sharing its subdomain.
- Provisioning catches a broken wall or a locked-out machine caller before reporting success.

**Non-Goals:**
- Making Access work on `workers.dev`. It is Cloudflare's zone; the honest answer is that a custom domain is required.
- Requiring Access. It stays opt-in and the app stays public by default.
- Full authorization — this is authentication and a wall, not roles or per-resource policy.
- The CI and config-drift fixes.

## Decisions

### A custom domain becomes a requirement, not a recommendation

The alternative — document `workers.dev` with caveats — was rejected. The failure mode is a silent security misconception: the reader believes the app is gated, and the evidence available to them agrees. A requirement with a stated reason is the only form that doesn't leave a trap, and the runbook additionally describes the symptom so an adopter already in that state recognizes it rather than filing a new bug.

The cost is real: previews on `workers.dev` can no longer be gated, which is what the wildcard was buying. That is a genuine capability loss and the runbook should say so rather than pretend the scoped patterns are strictly better.

### JWT verification replaces header trust as the default

Two independent arguments, and either alone would be sufficient:

- **Coverage.** The email header does not exist for service tokens. Any implementation keyed on it rejects every machine caller — including `/walk`, which the payload ships and expects to work against a gated preview. The verified assertion carries `email` for humans and `common_name` for service tokens, so one code path serves both.
- **Soundness.** Header trust is safe only when the proxy provably covers the hostname. Since a policy can silently fail to cover a hostname — finding one, above — that precondition is not one the reader can confirm. Verification checks the signature against this application, so it does not depend on a fact the reader can be wrong about.

The existing spec's framing (header trust, with JWT verification as "for anything high-stakes, go one step further") inverts the correct default. The optional step is the sound one and the default is the one that breaks.

### The module ships in the scaffold, not as a snippet

A snippet is retyped, and the version an adopter writes unaided is the header one — simpler-looking, wrong. Shipping `worker/access.ts` in the scaffold makes adopting Access *wiring* rather than *implementing*. It ships inert because the app is public by default, and it depends on `offer-app-scaffold` landing the scaffold category.

*Alternative considered:* a shared library the pack copies into any repo, scaffold or not. Deferred — a repo with its own app has its own Worker structure, and a drop-in module would have to guess where it goes. The scaffold is the case where the answer is known; other repos get the documented implementation to copy.

### The smoke test is the general fix

Each individual finding here is a specific wrong value, but they share a cause: nothing in the run ever asked whether the deployed thing behaves as configured. Two requests at the end — one anonymous, one service-token — would have caught the broken wall *and* the locked-out machine caller on the first run.

It is scoped honestly: where Access is on, the check states it does **not** prove a human can log in, and points at the browser verification. A check that overclaimed here would reproduce the exact failure the change exists to fix.

## Risks / Trade-offs

- **Repos already on `workers.dev` Access believe they are protected** → the changelog must say so directly, and the runbook must describe the symptom so it is recognizable. Nothing can detect it for them.
- **Requiring a custom domain raises the bar for the opt-in wall** → accepted; the wall is opt-in and the app is public by default, so the affected population is people who explicitly wanted authentication, for whom a domain is a proportionate ask.
- **JWT verification adds a dependency and a key fetch** → mitigated by shipping the module rather than asking each adopter to get it right; the public-key fetch is cacheable and the failure mode is fail-closed.
- **The smoke test needs a service token to be meaningful under Access** → where none exists it says what it could not check rather than passing silently.
- **Partial-label wildcard support is inferred from one adopter's API observation** → verify against the Access API during implementation before documenting it as the scoping mechanism; if it does not hold, the branch-preview patterns need enumerating another way.

## Migration Plan

Docs and skill prose reach existing repos through `/wong-sync`'s adapt step as proposals; `worker/access.ts` reaches new scaffolded repos by copy-if-absent.

`VERSION` takes a minor bump. The changelog entry SHALL lead with the `workers.dev` finding, in the imperative — a reader who set Access up following the old runbook needs to re-verify in a browser, and that is not a note at the bottom of a release.

Depends on `offer-app-scaffold` for the scaffold category that carries `worker/access.ts`. The doc and provisioning changes stand alone and can land first.

## Open Questions

- Does the Access API accept partial-label wildcards in every plan tier, or was the adopter's account on a tier where it does? The scoping recommendation depends on it — verify before documenting.
- Can the reference implementation be recovered from the adopting repo rather than re-derived? It exists and is deployed there; it is not reachable from this machine.

<!-- end design.md -->
<!-- file tasks.md utf8 4952 -->
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

- [x] 7.1 Stand Access up on a custom domain per the rewritten runbook and confirm all three callers behave: anonymous challenged, service token admitted, logged-in browser served — all three confirmed on `wongstack-staging.ithinkwong.com`, the browser row by the maintainer
- [x] 7.2 Confirm `/walk` reaches a gated preview — **descoped to the mechanism**: the service-token path `/walk` uses is verified against the gated host (`200`, real app HTML). A full `/walk` run needs `playwright` in the app's devDependencies, which is a separate opt-in this repo has not taken and which `/walk` never installs
- [x] 7.3 Confirm the scoped patterns gate the app's hostnames and leave an unrelated Worker on the same subdomain open
- [x] 7.4 Run `/wong-cloudflare` end to end and confirm the smoke test reports correctly on both a public and a gated app

## 8. Release

- [x] 8.1 Bump `VERSION` (minor)
- [x] 8.2 Write the `CHANGELOG.md` entry leading with the `workers.dev` finding in the imperative — anyone who set Access up on the old runbook must re-verify in a browser, because the wall may be admitting nobody and they have no signal that says so

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1875 -->
## ADDED Requirements

### Requirement: The scaffold carries the Access verification module, inert

The app scaffold SHALL include a Worker-side Access verification module (`worker/access.ts`) that verifies the signed `Cf-Access-Jwt-Assertion` against the repo's own Access application and returns identity from the verified claims — `email` for a human caller, `common_name` for a service token.

It SHALL ship **inert**: present in the scaffold, enforcing nothing, and not wired into the request path until Access is adopted. The provisioned app is public by default, and a scaffold that enforced identity out of the box would reject every caller of an app with no Access in front.

Shipping the module rather than a documented snippet is deliberate. The correct implementation is not obvious — the header-based version reads as simpler and is what an adopter writes when left to it, and it silently locks out every machine caller including `/walk`. An adopter who followed the documented snippet had to write this module from scratch after diagnosing the lockout.

#### Scenario: A scaffolded public app rejects nobody

- **WHEN** the scaffold is deployed with no Access in front
- **THEN** the verification module enforces nothing and every request reaches the app
- **AND** no request is rejected for lacking an assertion

#### Scenario: Adopting Access is wiring, not writing

- **WHEN** a repo adopts Access on a scaffolded app
- **THEN** the verification module is already present and the step is enabling it
- **AND** the adopter does not implement JWT verification themselves

#### Scenario: Both caller kinds authenticate once enabled

- **WHEN** verification is enabled and a service token calls the app
- **THEN** it is authenticated from the verified assertion's `common_name`
- **AND** a human caller is authenticated from the verified assertion's `email`

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/cloudflare-access-guide/spec.md utf8 7419 -->
## MODIFIED Requirements

### Requirement: A Cloudflare Access setup runbook ships in the payload

The payload SHALL include a wiki page that walks an adopter through the Cloudflare-side Zero Trust setup end to end: creating the Zero Trust organization, adding an identity provider, creating the Access application, protecting the app's hostnames, and adding a bypass policy for the open public surface. The page SHALL follow the progressive-disclosure rulebook (`wiki/wiki-style.md` + `wiki/voice.md`): a topic title, a strong stand-alone opener, and links up to its hub, down to what it references, and sideways to the credentials page.

**The runbook SHALL require a custom domain and SHALL state that `workers.dev` cannot be reliably gated.** Access is designed for zones the account owns; `workers.dev` is Cloudflare's. A policy applied to a `workers.dev` hostname admits service tokens and challenges anonymous callers while serving a logged-in browser Cloudflare's "There is nothing here yet" placeholder. The runbook SHALL name that asymmetry explicitly, because it is what makes the failure dangerous: the paths a reader can test from a terminal all behave correctly, so verification reports a working wall that no human can pass.

**Hostname patterns SHALL be scoped to the app**, never a bare subdomain wildcard. A pattern of the form `*.<subdomain>.workers.dev` matches every Worker in the account, so it walls unrelated applications that merely share a subdomain. The runbook SHALL give app-scoped patterns — the production hostname, the staging Worker, and the branch-preview form — and SHALL document that Access accepts **partial-label wildcards** (for example `*-<worker>-staging.<subdomain>.workers.dev`), since that is the mechanism scoping depends on and it is not discoverable from the dashboard.

The page SHALL frame Access as **opt-in**: an app provisioned by the stack pack is public by default, and nothing in provisioning or the pack requires Access. The runbook SHALL state that the login wall and the Worker-side code change that verifies identity are adopted together, never separately. Where a step could not be verified against an account that had never onboarded Zero Trust, the page SHALL mark it unverified and give the dashboard fallback.

#### Scenario: An adopter can stand up Access from the page alone

- **WHEN** a reader with a Cloudflare account, a custom domain, and a deployed Worker follows the runbook top to bottom
- **THEN** the steps cover the org, an identity provider, the Access application, the scoped policies, and the bypass policy in order, with no undocumented prerequisite

#### Scenario: workers.dev is refused as a target

- **WHEN** a reader has only a `workers.dev` hostname
- **THEN** the runbook states that Access cannot reliably gate it and that a custom domain is required
- **AND** it describes the terminal-passes / browser-fails symptom so a reader who already hit it recognizes what happened

#### Scenario: The policy does not wall unrelated Workers

- **WHEN** the runbook defines the Access policy
- **THEN** the hostname patterns match the app's own hostnames and its branch previews
- **AND** no pattern matches every Worker sharing the subdomain

#### Scenario: The public surface is explicitly bypassed

- **WHEN** the runbook configures policies
- **THEN** it adds a bypass policy for the open `/public/*` surface (UI, APIs, inbound webhooks)
- **AND** it states the required policy ordering relative to the gated policy

#### Scenario: A provisioned app is public until Access is chosen

- **WHEN** a user provisions the stack-pack app without asking for authentication
- **THEN** the app is reachable publicly and no Access resources are created
- **AND** the runbook is offered as the opt-in next step rather than assumed

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies, and that model SHALL be **verification of the signed Access JWT** (`Cf-Access-Jwt-Assertion`), not trust in a plain identity header. Verification SHALL confirm the assertion came from this Access application specifically, and SHALL read identity from the verified claims: `email` for a human, `common_name` for a service token.

**A plain-header pattern SHALL NOT be given as the recommended implementation**, for two independent reasons the runbook SHALL both state:

- **It locks out every machine caller.** Access strips `CF-Access-Client-Id` and sets no email header for a service-token request, which arrives carrying only `cf-access-jwt-assertion` and the ordinary `cf-*` request headers. Code requiring the email header therefore `401`s CI, and `/walk` — WongStack's own browser-evidence verb — is one of the callers it rejects.
- **It is unsound off the proxy.** On a hostname the Access policy does not actually cover, the header is an ordinary request header any caller can set, so trusting it grants impersonation of any user. Given that a policy can silently fail to cover a hostname, the pattern's safety rests on a condition the reader cannot reliably confirm.

The runbook SHALL specify that a request whose assertion is missing or fails verification is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

Because the provisioned app is public by default, the scaffold's Worker SHALL NOT enforce identity until Access is adopted. The verification module SHALL ship inert, and enabling it SHALL be documented as part of adopting Access, in the same step.

**Verification of the wall SHALL require a browser.** A service-token `200` and an anonymous `302` SHALL be documented as *insufficient* evidence, since both hold in the known-broken `workers.dev` configuration. The runbook's verification step SHALL require a logged-in browser to load the application successfully.

#### Scenario: Both caller kinds are served by one path

- **WHEN** the documented implementation handles a request
- **THEN** a human's verified assertion yields their `email`
- **AND** a service token's verified assertion yields its `common_name`
- **AND** neither caller is rejected for lacking a header the other one gets

#### Scenario: The machine caller is not locked out

- **WHEN** CI or `/walk` calls the app with a service token
- **THEN** the request is authenticated from the verified assertion
- **AND** it is not rejected for the absence of `Cf-Access-Authenticated-User-Email`

#### Scenario: Missing or invalid identity fails closed

- **WHEN** a request arrives with no assertion, or one that fails verification
- **THEN** the documented behaviour is a `401`
- **AND** a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

#### Scenario: Terminal checks are not accepted as proof

- **WHEN** a reader verifies the wall
- **THEN** the runbook requires a logged-in browser to load the app successfully
- **AND** it states that an anonymous redirect and a service-token success are both consistent with a wall no human can pass

#### Scenario: The public template does not enforce identity

- **WHEN** the stack pack's scaffold Worker is deployed without Access in front
- **THEN** it does not treat any header or assertion as an identity
- **AND** the docs state that enabling verification is part of adopting Access

<!-- end specs/cloudflare-access-guide/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 5088 -->
## ADDED Requirements

### Requirement: The account is chosen before anything is created

Where the token resolves more than one Cloudflare account, the skill SHALL enumerate the accounts it can see and stop for an explicit choice **before creating any resource**. It SHALL NOT infer the account from ordering, from a single-match heuristic applied to a multi-match result, or from the repository's name.

Provisioning into the wrong account is expensive to undo — resources must be created again elsewhere and deleted here, and anything already bound to them re-bound — and the mistake is invisible at the moment it is made, since every call succeeds. An adopter with access to more than one account came within one step of provisioning a personal project into a business account.

#### Scenario: A multi-account token stops for a choice

- **WHEN** the token can see more than one account
- **THEN** the skill lists them and asks which to use
- **AND** it creates nothing until the answer arrives

#### Scenario: A single-account token does not ask

- **WHEN** the token resolves exactly one account
- **THEN** the skill proceeds, naming the account it resolved

### Requirement: Permission propagation is waited out, not treated as failure

After the token widens its own permissions, the skill SHALL treat an early authorization failure as **propagation rather than refusal**, retrying with backoff before concluding anything. A widen can take up to roughly a minute to take effect, and the Access endpoints in particular were observed returning `403` for about that long immediately after a successful widen.

The retry window and the reason SHALL be documented wherever the probe protocol is stated, so that a first `403` is not read as a wrong token, a wrong account, or a missing permission group — each of which sends the reader down a diagnosis that cannot succeed.

#### Scenario: An early 403 after widening is retried

- **WHEN** an API call fails authorization within the propagation window of a successful widen
- **THEN** the skill retries with backoff before reporting a failure
- **AND** it says it is waiting for propagation rather than reporting a permission problem

#### Scenario: A genuine permission failure is still reported

- **WHEN** the calls continue to fail after the documented window
- **THEN** the skill reports the failure with the permission group involved

### Requirement: A fresh hostname's placeholder is set as an expectation

The skill SHALL tell the user, at the point it hands over a newly created `workers.dev` URL, that a hostname can serve a placeholder or `404` for a minute or two after its first deploy. Without that sentence the first thing a new user sees at their new address is a page that reads as a failed deploy — observed twice in one adoption.

#### Scenario: The handover sets the expectation

- **WHEN** the skill reports a URL for a hostname deployed for the first time
- **THEN** it states that the address may briefly 404 or show a placeholder before it resolves

### Requirement: A run finishes with a smoke test against the deployed URL

Before reporting success, the skill SHALL make two requests against the deployed URL and assert the results: one **anonymous**, and one **authenticated** by the means the repo actually uses — a service token where Access is on, an ordinary request where it is not. It SHALL assert that each gets the response its configuration implies: the application for the authenticated caller, and the application or an Access challenge, per configuration, for the anonymous one.

A mismatch SHALL be reported as a failure of the run rather than a note, and SHALL name which of the two requests disagreed with the configuration.

This check exists because the two most damaging findings in this area were both invisible to every other step: an Access wall that admitted service tokens and challenged anonymous callers while serving a browser a placeholder, and an auth implementation that `401`d every machine caller. Both would have surfaced here immediately.

Where Access is in front, the skill SHALL additionally state that the smoke test does not prove a human can log in, and point at the runbook's browser verification — the terminal cannot establish that.

#### Scenario: A public app answers both requests

- **WHEN** the run finishes on a repo with no Access in front
- **THEN** both the anonymous and the authenticated request receive the application
- **AND** the run reports the check passed

#### Scenario: A gated app challenges the anonymous caller

- **WHEN** the run finishes on a repo with Access configured
- **THEN** the anonymous request receives a challenge and the service-token request receives the application
- **AND** the report states that browser verification is still required to confirm a human can pass

#### Scenario: A locked-out machine caller fails the run

- **WHEN** the service-token request is rejected by the app's own auth code
- **THEN** the run reports a failure naming that request
- **AND** it does not report provisioning as successful

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
