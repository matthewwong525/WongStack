# Design

## Context

See proposal.md - Why. Today `provision()` calls `accessOrganization()` first; when Cloudflare refuses the Zero Trust organization (onboarding or plan selection pending), it throws `AccessSetupError` with the dashboard link and nothing else is provisioned. The app Worker (`app/worker/index.ts`) answers `503 Workspace access is not configured` whenever the Access variables are blank, and both publish scripts (`cf-deploy.sh`, `cf-preview.sh`) run `scripts/check-private-access.mjs`, which requires the full Access app and policies. So a no-card account today gets no site at all.

R2 already degrades: `r2: false`, no bucket, and a rerun adds the bucket, the `MEMORY_BUCKET` binding, and the deploy token's R2 row.

## Goals / Non-Goals

**Goals:**
- One explicit, committed, reviewable "open without login" state that the Worker, the deployment check, and the provisioner agree on.
- A rerun that turns an open site private with a normal reviewed change.
- Setup's closing check needs no human sign-in beyond the person opening their own link.

**Non-Goals:**
- Detecting whether a card is on file through the API. We react to the onboarding failure only.
- Any open mode for the server installer, or for an account where Access provisioning succeeds.
- Changing `/verify` or the general Access runbook.

## Decisions

### The switch is a committed Worker var, `WORKSPACE_LOGIN: "off"`

Written by `wranglerConfig()` into both the top-level and `env.staging` `vars` only in open mode, with the `CF_ACCESS_*` vars left blank.

- **Worker:** with no identity, serve content only when `WORKSPACE_LOGIN === "off"` **and** `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` are both blank. Any Access identifier present → today's `401`. A leftover switch can't weaken a private site.
- **Deployment check:** when both environments carry `WORKSPACE_LOGIN: "off"` and no Access identifiers, verify the Worker names, the secrets rule (no `SKIP_AUTH`/`WONG_ENVIRONMENT`), and return `{ protection: 'open', humanLogin: 'none' }`, printing one warning line. A config with the switch **and** Access IDs fails the check as inconsistent. Everything else runs today's full check.

Alternatives: a secret or env var in CI (rejected: invisible in review, and the check already forbids auth-overriding secrets); dropping the check when Access vars are blank (rejected: a typo or lost var would silently publish a private site).

### Only the onboarding failure opens, and only on request

`provision` gains `--open-without-login`. With it, an `AccessSetupError` from `accessOrganization()` alone (the onboarding case) sets `report.access = { mode: 'open', reason: 'zero-trust-onboarding', onboardingUrl }`, skips `provisionAccess` and `provisionAccessPolicies`, and continues with memory, databases, config, and the deploy token. Errors from the later Access steps (conflicts, ownership, readback) still stop. `/wong-setup`'s runbook passes the flag; the server installer does not, so it keeps stopping.

In open mode no bootstrap Workers are created; the first CI deploy creates both Workers normally, on their `workers.dev` addresses by wrangler's default.

### Turning private later is a plain rerun

Rerun `provision` without `--keep-config` on an open install. When `accessOrganization()` now succeeds, it runs the normal Access steps with `adoptExisting` (the recorded memory Worker matches), then rewrites `app/wrangler.jsonc`: fills the four `CF_ACCESS_*` vars per environment and deletes `WORKSPACE_LOGIN`, the same way `addBucketBinding` edits in place; a config it can't edit goes to `todo`. The same run adds the R2 bucket if R2 is now on. `/save` publishes the edit; the deploy check then runs in full.

The card's links come from the account id: billing `https://dash.cloudflare.com/<account>/billing/payment-info`, R2 `https://dash.cloudflare.com/<account>/r2/overview`, Zero Trust `https://one.dash.cloudflare.com/<account>/`. The runbook owns the list; the report carries only `onboardingUrl`.

### Setup's closing check is the machine probe

Step 4g becomes: private site → `probe-private-access.mjs` on production and one preview (anonymous closed, machine `2xx`); open site → fetch production expecting `200`. Setup no longer walks production, staging, aliases, and previews by email PIN. The person pasting the starter box's message from the production link is the human check; the closing report marks human login verified only then.

## Risks / Trade-offs

- [The onboarding error may not always mean "no card"] → The open path triggers only on `accessOrganization()`'s failure and only with the flag; the closing report names the Zero Trust link either way, so a person with a card finishes the dashboard step and reruns.
- [A person builds real content on an open site and forgets the card] → The closing report says the site is public; `check-private-access` prints the open warning on every publish, so CI logs repeat it.
- [An account with a card but R2 off, or the reverse] → The two degrade independently: `r2` and `access.mode` are separate report fields, and the closing list shows only the steps still missing.
- [Previews and staging are public too in open mode] → Staging binds no production data or memory; the report says "anyone with the link".

## Migration Plan

Existing private installs carry no `WORKSPACE_LOGIN` var, so the Worker and check behave as today. `/wong-sync` delivers the new Worker and check scripts unchanged in effect. Rollback: revert the release; an open install then fails its deploy check closed, the pre-change behavior.
