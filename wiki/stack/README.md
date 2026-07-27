# Cloudflare stack

The stack WongStack recommends for AI-driven dev — **a recommendation, not a requirement.** WongStack itself is stack-agnostic; this optional section documents one opinionated way to run it: a React + Vite SPA on Cloudflare Workers, with D1 for data, migrations applied automatically on deploy, and Cloudflare Access as the login wall. Take it whole, take a piece, or skip it entirely — nothing elsewhere in the toolkit assumes it.

It fits AI-driven dev because **merge = deploy**: one runtime, cheap per-branch preview URLs, and a change that ships the moment its PR lands. The pieces here are the setup that makes that safe.

## Pages

- [Cloudflare Access](cloudflare-access.md) — put a login wall in front of the app with no auth code: the Zero Trust org, an identity provider, one Access application, and the wildcard policy that gates production and *every* preview URL at once (plus a bypass for the open public surface). Explains the header-trust auth model and exactly when it's safe.
- [Cloudflare credentials](cloudflare-credentials.md) — the two tokens that make everything work: a **user-scoped** API token (not an account token — that trap costs you the build logs), and the Access service token CI needs to reach gated previews. Both land in `.env` per the [secrets convention](../development/secrets.md).

> **More is coming.** The scripts, D1 two-database pipeline (auto-migrate on deploy, seeded staging, prod recovery), timestamp-prefixed migrations, and the opt-in installer wiring ship in a following change. This section starts with the Cloudflare-side setup everything else builds on.
