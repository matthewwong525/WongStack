# Cloudflare stack

WongStack apps run on Cloudflare Workers with Access protecting pages and previews. [Setup](getting-started.md) includes D1 data and migrations.

The pack uses **merge = deploy**, independent staging and branch previews. [One token](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) sets up an install.

**It doesn't assume you already have an app.** Every install gets WongStack's [starter app](../../.agents/skills/wong-sync/references/payload-manifest.md#the-app-scaffold), so there is a real address people can open from day one.

## Pages

- [Getting started](getting-started.md) — what installing costs, what you do by hand, and what to do when something goes wrong; start here if you're setting this up for the first time.
- [Make WongStack your own](customizing-wongstack.md) — change the defaults in your fork, install it with one request, and keep projects following your version.
- [Core stack](core-stack.md) — *what* you build on: React + Vite on Cloudflare Workers with D1, and why the combo suits AI-driven dev.
- [Deploy and data pipeline](d1-pipeline.md) — *how* code and data ship: the `env.staging` model, auto-applied migrations, and seeded staging.
- [Staging bindings and secrets](staging-bindings.md) — the staging Worker's own database, queue, bucket, and secrets, so a branch never writes to production.
- [The Artifacts route](artifacts-route.md) — an install with one account: your project, its checks and its publishing in your own Cloudflare account, with no GitHub; what it costs, how setup and the verbs differ, and teardown.
- [Cloud routines](cloud-routines.md) — a prompt on a schedule, run in your own Cloudflare account with your computer off: how a run works, what it costs, what a run is given, its limits, and teardown.
- [CI on GitHub Actions](github-actions.md) — the thin deploy workflow that runs the pipeline's scripts, and why not Cloudflare's Workers Builds.
- [Fix a broken production database](d1-recovery.md) — the runbooks for when production is red: undo a bad migration with Time Travel, never hand-apply schema, and repair a drifted `d1_migrations` ledger.
- [Company actions](company-api.md) — described app actions and memory reads for employee assistants, with separate authentication.
- [Mini apps](mini-apps.md) — small apps from one request, part of the main app under `/apps/`: the same loop and checks as any change, and a card each on the home page.
- [Cloudflare Access](cloudflare-access.md) — automatic email login, native Worker and preview coverage, signed identity, and separate machine access.
- [Employee access](employee-access.md) — the Access mini app: how the owner is known, the live app's key for its sign-in list, the first open, and the practice list on previews.
- [Staging walkthrough](../development/staging-walkthrough.md) — `/verify` exercises the change's own scenarios against the deployed preview — a real browser for UI journeys, direct requests and existing commands for the rest — and grades them against what those scenarios promised. It is not stack-specific and lives with the development docs; this entry points at it because the pack's pipeline is what publishes the preview it walks.
- [API keys](api-keys.md) — for anyone: get a key from a service, give it through the private link the assistant sends, and what to do if one leaks.
- [Cloudflare credentials](cloudflare-credentials.md) — the token screen in detail: the user-scoped token with two permission rows, how it widens itself, the narrow CI deploy token, per-environment Worker secrets, and the account-root trade-off.
- [Manage Cloudflare with cf](cloudflare-cli.md) — optional account inspection and one-off resource work, using existing credentials while setup and app publishing keep their own workflows.

Every install takes the pack. Standing it up is [setup's provisioning step](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md), which runs once when `/wong-setup` installs WongStack, from any folder. A login wall is [Cloudflare Access](cloudflare-access.md#turning-it-on-through-an-agent), and removing everything is the [teardown](getting-started.md#teardown).

> [Session memory](../development/memory.md) is separate from this pack. Setup provisions it.

[Employee assistant connection](employee-project.md) covers the private company API bootstrap and separate manual repository setup.
