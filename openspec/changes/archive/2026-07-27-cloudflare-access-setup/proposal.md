# cloudflare-access-setup

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack says how to work but nothing about what to run on. The opinionated Cloudflare stack that answers that question is blocked on one thing nobody has written down: the **Cloudflare-side setup**. Every later piece — auto-migrating D1 on deploy, reading a failed build log, running CI against a preview — needs an Access policy and the right API token to exist first, and the reference app this is drawn from documents that in four bullets. Without it, an adopter hits a login wall or an `Invalid token` and stops.

**Non-goals:** no scripts, no D1 pipeline, no install wiring, no manifest change, no tests — those are the two changes that follow. Nothing here becomes required: WongStack stays stack-agnostic and these pages are inert for a repo that never adopts the stack.

## What Changes

- Add a `wiki/stack/` section — the home the rest of the stack work lands in — with a hub and two pages:
  - **Cloudflare Access** — the Zero Trust setup runbook: create the org, add an identity provider, create the Access application, cover the production hostname *and* every `*.workers.dev` preview URL with **one wildcard policy**, add a **bypass policy** for the open `/public/*` surface, and get the policy order right. Plus the auth model that falls out of it: the Worker carries **no auth code** and trusts the `Cf-Access-Authenticated-User-Email` header the proxy sets — safe only *behind* the proxy, so the runbook makes verifying preview coverage a step, not a footnote. A missing header is a `401`; only an explicit `SKIP_AUTH` dev escape substitutes a fallback identity.
  - **Cloudflare credentials** — the token guide: create a **user-scoped** API token (My Profile → API Tokens), *not* an account token — the Workers Builds log API rejects account tokens with `Invalid token`, which is the single most confusing failure in this stack. Grant the listed permissions, paste `CLOUDFLARE_USER_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` into `.env` per the existing [secrets convention](../../../wiki/development/secrets.md), and everything downstream works with no further setup. Also creates an Access **service token** (`CF-Access-Client-Id` / `CF-Access-Client-Secret`) and adds it to the policy — the only way CI ever reaches an Access-gated preview, so it is set up now rather than retrofitted.
- Link the new section from [`wiki/README.md`](../../../wiki/README.md) so nothing is orphaned.
- **Retire `recommended-stack-guide`** (0/8 tasks, never started). Its single-page Tier-1 doc is superseded by this section and the two changes after it.
- `CHANGELOG.md` entry + `VERSION` bump (minor — additive docs).

## Capabilities

### New Capabilities
- `cloudflare-access-guide`: The payload ships a Cloudflare-side setup runbook — Zero Trust Access (wildcard policy over prod + previews, bypass for the public surface, header-trust auth model) and the credentials it needs (user-scoped API token, Access service token) — as an optional wiki section, not a requirement.

### Modified Capabilities
<!-- None. `secrets-convention` is used as-is (new variables documented in `.env.example`), not changed. -->

## Impact

- **Docs:** new `wiki/stack/` folder (hub + 2 pages); one link added to `wiki/README.md`.
- **Root payload:** `CHANGELOG.md` + `VERSION`.
- **Planning:** `openspec/changes/recommended-stack-guide/` removed as superseded.
- **No skills, scripts, installer, or manifest changes.** The pages are payload content that only reaches a target repo once `cloudflare-stack-pack` wires the opt-in install; until then they live in this repo and are readable here.
- **Follow-on changes (not this one):** `cloudflare-stack-pack` (scripts, seed template, config fragments, D1 pipeline docs, opt-in install, manifest), `wong-sync-pull-only`, then integration tests.

## Decision log

- **2026-07-27** — Implemented all 11 tasks. Authored `wiki/stack/` (hub + `cloudflare-access.md` + `cloudflare-credentials.md`), linked it from `wiki/README.md` under a new *Optional* heading (kept visually separate from the core process list). Retired the superseded `recommended-stack-guide` change. Bumped `VERSION` 6.4.0 → 6.5.0 and added the newest-first CHANGELOG entry. **Decision:** all three changes in this arc ride one umbrella branch `opinionated-dev-framework` (one PR), chosen for easier management over a branch-per-change split — so here the branch name deliberately does *not* equal the change name. **Flagged, not skipped:** tasks 2.3/3.3 ask to verify exact Cloudflare dashboard labels/permission names against the live dashboard; this environment can't reach it, so the pages lead with an explicit "labels drift — match on concept, verify against the live dashboard" callout (design Decision 3) instead of pinning names that would rot. The reviewer/implementer with dashboard access should confirm the permission names in `cloudflare-credentials.md`.
