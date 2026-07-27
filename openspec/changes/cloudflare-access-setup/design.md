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
