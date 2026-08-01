# Cloudflare stack

The stack WongStack recommends for AI-driven dev — **a recommendation, not a requirement.** WongStack itself is stack-agnostic; this optional section documents one opinionated way to run it: a React + Vite SPA on Cloudflare Workers, with D1 for data, migrations applied automatically on deploy, and Cloudflare Access as the login wall. Take it whole, take a piece, or skip it entirely — nothing elsewhere in the toolkit assumes it.

It fits AI-driven dev because **merge = deploy**: one runtime, cheap per-branch preview URLs, and a change that ships the moment its PR lands. The pieces here are the setup that makes that safe.

## Pages

- [Core stack](core-stack.md) — *what* you build on: React + Vite on Cloudflare Workers with D1, styled with Tailwind. The pieces, their versions, and why the combo suits AI-driven dev — merge = deploy, one runtime, cheap preview URLs as the inner loop.
- [Deploy and data pipeline](d1-pipeline.md) — *how* code and data ship: why a branch preview is a *version* and staging has to be a whole second Worker, the `env.staging` model and the twin-every-binding rule, migrations that auto-apply on deploy, timestamp-prefixed migrations and the additive/order-independent rule, the seeded-staging model and `db:reset:staging`, the runbook for adopting all this in a repo on the older model, and the three prod-recovery runbooks — Time Travel, never hand-apply schema, and reconciling `d1_migrations` when prod drifts.
- [Cloudflare Access](cloudflare-access.md) — put a login wall in front of the app with no auth code: the Zero Trust org, an identity provider, one Access application, and the wildcard policy that gates production and *every* preview URL at once (plus a bypass for the open public surface). Explains the header-trust auth model and exactly when it's safe.
- [Cloudflare credentials](cloudflare-credentials.md) — the two tokens that make everything work: a **user-scoped** API token (not an account token — that trap costs you the build logs), and the Access service token CI needs to reach gated previews. Both land in `.env` per the [secrets convention](../development/secrets.md).

> **This section installs with the opt-in stack pack.** A repo takes it at [`/wong-setup`](../../.claude/skills/wong-setup/SKILL.md) (or by setting `components.stackPack: true` and re-syncing); the pack's [scripts](d1-pipeline.md#the-scripts), seed template, and these pipeline docs then install and refresh through [`/wong-sync`](../../.claude/skills/wong-sync/SKILL.md). A repo that declines sees none of it, and WongStack stays stack-agnostic.
