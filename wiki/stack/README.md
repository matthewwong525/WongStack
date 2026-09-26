# Cloudflare stack

The stack every WongStack install runs on: a React + Vite SPA on Cloudflare Workers, with D1 for data, migrations applied automatically on release, and Cloudflare Access as an optional login wall. Setup starts from an empty folder and stands all of it up from one token.

It fits AI-driven dev because **merge = deploy**: one runtime, cheap per-branch preview URLs, and a change that ships the moment its PR lands. [One token](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) is all it takes to stand up.

**It doesn't assume you already have an app.** Every install gets WongStack's [starter app](../../.agents/skills/wong-sync/references/payload-manifest.md#the-app-scaffold), so there is a real address people can open from day one.

## Pages

- [Getting started](getting-started.md) — the whole path in five steps, written for the person doing it; start here if you're setting this up for the first time.
- [Core stack](core-stack.md) — *what* you build on: React + Vite on Cloudflare Workers with D1, and why the combo suits AI-driven dev.
- [Deploy and data pipeline](d1-pipeline.md) — *how* code and data ship: the `env.staging` model, twin-every-binding, auto-applied migrations, seeded staging, CI, and the prod-recovery runbooks.
- [Mini apps](mini-apps.md) — small apps from one request, on their own Worker beside the main app: a preview from the agent host in seconds, tests per app, a short merge to keep one, and a generated dashboard.
- [Cloudflare Access](cloudflare-access.md) — **opt-in**: a login wall in front of an otherwise-public app, and why the header-trust code change adopts with it, never before it.
- [Staging walkthrough](../development/staging-walkthrough.md) — `/verify` exercises the change's own scenarios against the deployed preview — a real browser for UI journeys, direct requests and existing commands for the rest — and grades them against what those scenarios promised. It is not stack-specific and lives with the development docs; this entry points at it because the pack's pipeline is what publishes the preview it walks.
- [Cloudflare credentials](cloudflare-credentials.md) — the token screen in detail: the user-scoped two-checkbox token, how it widens itself, the narrow CI deploy token, per-environment Worker secrets, and the account-root trade-off.

Every install takes the pack. Standing it up is [setup's provisioning step](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md), which runs once when `/wong-setup` installs WongStack in an empty folder. A login wall is [Cloudflare Access](cloudflare-access.md#turning-it-on-through-an-agent), and removing everything is the [teardown](getting-started.md#teardown).

> Session memory is not part of this pack: every repo gets it, and [its page](../development/memory.md) lives with the core process docs.
>
> **This section installs with the stack pack** — see [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#the-stack-pack).
