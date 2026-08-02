# harden-cloudflare-access

**Status:** blocked (live Access verification on a custom domain)
**Open questions:** section 7 needs Access stood up on a real custom domain and a full `/wong-cloudflare` run against a live account — both are outward-facing mutations on the user's production Cloudflare account and need their go-ahead

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
