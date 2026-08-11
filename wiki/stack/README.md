# Cloudflare stack

The stack WongStack recommends for AI-driven dev — **a recommendation, not a requirement.** WongStack itself is stack-agnostic; this optional section documents one opinionated way to run it: a React + Vite SPA on Cloudflare Workers, with D1 for data, migrations applied automatically on release, and Cloudflare Access as an optional login wall. Take it whole, take a piece, or skip it entirely — nothing elsewhere in the toolkit assumes it.

It fits AI-driven dev because **merge = deploy**: one runtime, cheap per-branch preview URLs, and a change that ships the moment its PR lands. [One token](../../.claude/skills/wong-cloudflare/SKILL.md) is all it takes to stand up.

**It doesn't assume you already have an app.** A repo with a Worker of its own takes the pipeline and keeps its application untouched. A repo with no application at all is offered WongStack's [starter app](../../.claude/skills/wong-sync/references/payload-manifest.md#the-opt-in-app-scaffold) as part of the same single opt-in, so "a real address people can open" is answerable either way.

## Pages

- [Getting started](getting-started.md) — the whole path in five steps, written for the person doing it; start here if you're setting this up for the first time.
- [Core stack](core-stack.md) — *what* you build on: React + Vite on Cloudflare Workers with D1, and why the combo suits AI-driven dev.
- [Deploy and data pipeline](d1-pipeline.md) — *how* code and data ship: the `env.staging` model, twin-every-binding, auto-applied migrations, seeded staging, CI, adoption, and the prod-recovery runbooks.
- [Cloudflare Access](cloudflare-access.md) — **opt-in**: a login wall in front of an otherwise-public app, and why the header-trust code change adopts with it, never before it.
- [Staging walkthrough](../development/staging-walkthrough.md) — `/verify` exercises the change's own scenarios against the deployed preview — a real browser for UI journeys, direct requests and existing commands for the rest — and grades them against what those scenarios promised. It is not stack-specific and lives with the development docs; this entry points at it because the pack's pipeline is what publishes the preview it walks.
- [Cloudflare credentials](cloudflare-credentials.md) — the token screen in detail: the user-scoped two-checkbox token, how it widens itself, per-environment Worker secrets, and the account-root trade-off.

Standing it all up — and adopting the pack in the first place — is [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md), the one door: it offers, configures, provisions, and tears down.

> **This section installs with the opt-in stack pack** — see [the payload manifest](../../.claude/skills/wong-sync/references/payload-manifest.md#the-opt-in-stack-pack) for what that gates. A repo that declines sees none of it, and WongStack stays stack-agnostic.
