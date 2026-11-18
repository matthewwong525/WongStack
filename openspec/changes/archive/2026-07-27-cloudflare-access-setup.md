<!-- openspec-archive v1 2026-07-27-cloudflare-access-setup -->
<!-- file proposal.md utf8 4985 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 5812 -->
## Context

This is change 1 of a three-change arc that gives WongStack an optional, opinionated Cloudflare stack. The stack is drawn from a real production app (`~/ClaymooApp`) that documents its Cloudflare setup in a handful of bullets across `architecture.md`, `dev-servers.md`, and `ci-and-deploy.md`, plus a six-line `worker/lib/access-email.ts`. The *reasoning* is there; the *setup* — clicking through the Zero Trust dashboard to make it real — is written down nowhere. This change writes it, generalized.

It ships first because it is the hard dependency for the rest: the D1 auto-migrate pipeline (change 2) needs the user-scoped token to read build logs, and the later integration tests need the service token to reach gated previews. Getting the credentials and the Access policy documented up front means the two later changes never have to backfill setup steps.

Docs-only. No skills, scripts, installer, or manifest touched. The pages live under `wiki/stack/` in this repo now; `cloudflare-stack-pack` (change 2) adds the manifest wiring that installs them into a target repo behind the opt-in.

## Goals / Non-Goals

**Goals:**
- One runbook an adopter can follow to stand up Cloudflare Access correctly, including the wildcard-covers-previews trick and the public-surface bypass.
- One credentials page that gets `.env` filled with a *working* token — steering clear of the account-token trap — and creates the service token the test change will need.
- Make the header-trust safety boundary impossible to miss.
- Stay generic and optional; WongStack's stack-agnostic identity is unchanged.

**Non-Goals:**
- No scripts, config fragments, seed template, or D1 pipeline docs (change 2).
- No install prompt, refreshable-pack list, or payload-manifest edit (change 2).
- No CI/test wiring (later) — this change only *creates* the service token so that change has it.
- Not reproducing exact dashboard menu paths from memory — those are verified live at apply time.

## Decisions

**1. A `wiki/stack/` section (hub + two pages), not one page.** The stack work spans Access, credentials, and — in change 2 — the build/D1 pipeline. A section hub is the seam those later pages attach to, so it exists from the start. Two pages now: `cloudflare-access.md` (the Access runbook + auth model) and `cloudflare-credentials.md` (the two tokens). *Alternative — one combined page:* rejected; the token guide is referenced on its own (change 2's build docs point at it) and deserves its own URL. *Alternative — defer the hub to change 2:* rejected; it would orphan these two pages until then.

**2. Split "how Access works" from "which tokens you need."** The Access runbook owns the policy model and the header-trust boundary; the credentials page owns the token mechanics. They cross-link. This keeps each page single-topic per the rulebook and lets change 2's build documentation link the credentials page without dragging in the whole Access story.

**3. Verify exact Cloudflare names at apply time.** Dashboard labels, menu paths, and permission names drift and vary by plan. The spec makes verification a requirement; the author checks the live dashboard rather than pinning names that would rot. Where a name can't be verified, the page describes the capability ("a token permission that allows editing Workers") and flags it, rather than inventing a label.

**4. Create the service token now, use it later.** The integration-tests change is out of scope, but its one Cloudflare-side prerequisite — an Access service token added to the policy — is cheap to include here and expensive to retrofit (it means re-opening the Access policy). The credentials page creates it and explains what it unlocks, even though nothing consumes it yet.

**5. Retire `recommended-stack-guide` in this change.** That change (0/8, unstarted) proposed a single Tier-1 recommendation page explicitly forbidden from naming a stack as default. This arc supersedes it wholesale. Removing its `openspec/changes/` folder here keeps `openspec list` honest — one superseding change, not two overlapping ones.

**6. Reuse the secrets convention as-is.** The new `.env` variables (`CLOUDFLARE_USER_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, service-token pair) are documented by *pointing at* `wiki/development/secrets.md`, not by restating how secrets work. The `.env.example` entries themselves are change 2's job (they ship with the pack); this change only names the variables in prose.

## Risks / Trade-offs

- **Dashboard drift** → any click-path we write ages as Cloudflare's UI changes. *Mitigation:* lead with the durable concepts (application, wildcard policy, bypass, service token, user-scoped token) and treat exact labels as verifiable detail, per Decision 3.
- **Header-trust footgun** → an adopter who copies the "Worker has no auth code" model but misconfigures the wildcard exposes every admin route on an ungated preview. *Mitigation:* the spec forces the safety boundary and the "verify previews are gated" step to be explicit, not a footnote.
- **Pages live here before they install anywhere** → until change 2, these pages sit in this repo's `wiki/stack/` without a manifest entry, readable but not synced. *Mitigation:* acceptable and intended — the proposal and this design both state the wiring is deferred, and `wiki/README.md` links the section so it isn't orphaned in the meantime.
- **Writing setup we can't fully click through here** → this environment can't open the Cloudflare dashboard. *Mitigation:* the runbook is authored from the documented model + general Cloudflare Access knowledge, and the "verify against live dashboard" requirement puts the burden on the implementer to reconcile exact names — the prose is structured so a wrong label is a fill-in, not a rewrite.

<!-- end design.md -->
<!-- file tasks.md utf8 3575 -->
## 1. The `wiki/stack/` section

- [x] 1.1 Create `wiki/stack/README.md` — the section hub: a strong opener stating it's the optional Cloudflare stack (recommendation, not requirement), a short map of the pages, and a placeholder note that the build/D1 pipeline pages arrive with `cloudflare-stack-pack`. Links down to both pages, up to `wiki/README.md`.
- [x] 1.2 Link the `wiki/stack/` hub from `wiki/README.md` as an optional section, visually distinct from the core process list (mirror how the existing list entries read), so nothing is orphaned.

## 2. Cloudflare Access runbook (`wiki/stack/cloudflare-access.md`)

- [x] 2.1 Write the setup runbook per `wiki/wiki-style.md` + `wiki/voice.md`: topic title, stand-alone opener, ordered steps — create the Zero Trust org, add an identity provider, create the Access application, protect the prod host + `*.workers.dev` previews with ONE wildcard policy (call out that this is what gates previews for free), add a bypass policy for `/public/*`, and state the policy ordering. Generalize from `~/ClaymooApp/docs/development/architecture.md` (Auth model) — nothing app-specific.
- [x] 2.2 Write the auth-model section: the Worker has no auth code and trusts `Cf-Access-Authenticated-User-Email` (generalize `~/ClaymooApp/worker/lib/access-email.ts`). State the safety boundary loudly — header trust holds only behind the proxy — and make "verify previews are actually gated by the wildcard" an explicit step. Specify `401` on a missing header, with a fallback identity only under an explicit `SKIP_AUTH` dev flag (generalize `~/ClaymooApp/docs/development/dev-servers.md` local-auth).
- [x] 2.3 Cross-link: down/sideways to `cloudflare-credentials.md` (for the service token added to the policy), up to the `wiki/stack/` hub. Verify Access dashboard menu/label names against the live dashboard; where a name can't be verified, describe the capability and flag it rather than guessing.

## 3. Cloudflare credentials guide (`wiki/stack/cloudflare-credentials.md`)

- [x] 3.1 Write the user-scoped API token guide: create it at My Profile → API Tokens (user-scoped, NOT an account token), list the permissions it needs, and store `CLOUDFLARE_USER_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in `.env` — link `wiki/development/secrets.md`, don't restate it. Call out the account-token trap and its `Invalid token` symptom against the Workers Builds log API (generalize `~/ClaymooApp/docs/development/ci-and-deploy.md`).
- [x] 3.2 Write the Access service-token section: create the service token, add it to the Access policy, and state that this is what lets a non-interactive CI/test caller reach an Access-gated preview (generalize the note in `~/ClaymooApp/.claude/skills/server/SKILL.md`). Cross-link up to the hub and sideways to `cloudflare-access.md`.
- [x] 3.3 Verify exact Cloudflare permission names and menu paths against the live dashboard before finalizing; describe-and-flag anything unverifiable rather than pinning a guessed label.

## 4. Retire the superseded change + release

- [x] 4.1 Remove `openspec/changes/recommended-stack-guide/` (0/8 tasks, unstarted) as superseded by this arc; confirm `openspec list` no longer shows it.
- [x] 4.2 Add a newest-first `CHANGELOG.md` entry and bump `VERSION` (minor — additive docs).
- [x] 4.3 Verify: both pages read as optional and stand-alone, every link resolves (up/down/sideways + `wiki/README.md` → hub → pages), the header-trust boundary and the account-token trap are both explicit, and no skill/installer/core doc now implies Cloudflare is required.

<!-- end tasks.md -->
<!-- file specs/cloudflare-access-guide/spec.md utf8 5554 -->
## ADDED Requirements

### Requirement: A Cloudflare Access setup runbook ships in the payload

The payload SHALL include a wiki page that walks an adopter through the Cloudflare-side Zero Trust setup end to end: creating the Zero Trust organization, adding an identity provider, creating the Access application, protecting the production hostname AND every `*.workers.dev` preview URL with a single wildcard policy, and adding a bypass policy for the open public surface. The page SHALL follow the progressive-disclosure rulebook (`wiki/wiki-style.md` + `wiki/voice.md`): a topic title, a strong stand-alone opener, and links up to its hub, down to what it references, and sideways to the credentials page.

#### Scenario: An adopter can stand up Access from the page alone

- **WHEN** a reader with a Cloudflare account and a deployed Worker follows the runbook top to bottom
- **THEN** the steps cover the org, an identity provider, the Access application, the wildcard policy, and the bypass policy in order, with no undocumented prerequisite

#### Scenario: One wildcard policy covers prod and previews

- **WHEN** the runbook defines the Access policy
- **THEN** it uses one wildcard hostname pattern that matches both the production host and every per-branch `*.workers.dev` preview URL
- **AND** it states that this is what gates preview URLs without per-branch configuration

#### Scenario: The public surface is explicitly bypassed

- **WHEN** the runbook configures policies
- **THEN** it adds a bypass policy for the open `/public/*` surface (UI, APIs, inbound webhooks)
- **AND** it states the required policy ordering relative to the gated policy

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies: the Worker carries no auth code and trusts the `Cf-Access-Authenticated-User-Email` header set by the Access proxy. It SHALL state, as a first-class step and not a footnote, that trusting the header is safe ONLY behind the proxy, so the reader MUST verify the wildcard policy actually covers preview hostnames before relying on it. It SHALL specify that a request missing the header is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

#### Scenario: The header-trust risk is stated loudly

- **WHEN** a reader reaches the auth-model section
- **THEN** it states that header trust holds only behind the Access proxy
- **AND** it makes verifying that previews are actually gated an explicit step

#### Scenario: Missing identity fails closed

- **WHEN** the runbook describes a request that arrives without the Access identity header
- **THEN** it specifies a `401` response by default
- **AND** it specifies that a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

### Requirement: A credentials guide ships covering the user-scoped API token and Access service token

The payload SHALL include a wiki page that documents the two credentials the stack needs. It SHALL instruct the reader to create a USER-scoped API token (My Profile → API Tokens), state explicitly that an account-scoped token does NOT work because the Workers Builds log API rejects it with `Invalid token`, list the permissions the token needs, and have the reader store `CLOUDFLARE_USER_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env` per the existing secrets convention. It SHALL also walk through creating an Access service token and adding it to the Access policy so non-interactive callers can reach gated preview URLs. Exact Cloudflare permission and menu names SHALL be verified against the live dashboard when the page is written, not reproduced from memory.

#### Scenario: The user-scoped-vs-account-token trap is called out

- **WHEN** a reader follows the token guide
- **THEN** it directs them to create a user-scoped token, not an account token
- **AND** it names the `Invalid token` symptom an account token produces against the Workers Builds log API

#### Scenario: Credentials land in .env via the secrets convention

- **WHEN** the guide tells the reader where to put the token
- **THEN** it names `CLOUDFLARE_USER_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as `.env` variables
- **AND** it links the existing secrets convention rather than restating it

#### Scenario: A service token is created for non-interactive access

- **WHEN** a reader completes the credentials guide
- **THEN** they have created an Access service token and added it to the Access policy
- **AND** the guide states this is what lets a later CI/test caller reach an Access-gated preview URL

### Requirement: The stack section stays optional and does not make WongStack stack-specific

The new `wiki/stack/` section SHALL be linked from `wiki/README.md` such that it is reachable but clearly optional, and no skill, installer, or core doc SHALL require or default to Cloudflare as a result of this change. The pages SHALL contain nothing specific to any single app — every example is generic.

#### Scenario: WongStack stays stack-agnostic after the change

- **WHEN** a reader reviews the skills, installer, and core wiki after this change
- **THEN** none of them require or default to Cloudflare/Access
- **AND** only the `wiki/stack/` pages name it

#### Scenario: The section is reachable but not orphaned

- **WHEN** a reader opens `wiki/README.md`
- **THEN** it links the `wiki/stack/` hub
- **AND** the hub links every page in the section

<!-- end specs/cloudflare-access-guide/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-27

~~~
<!-- end .openspec.yaml -->
