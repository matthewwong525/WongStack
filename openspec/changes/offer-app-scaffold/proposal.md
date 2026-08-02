# offer-app-scaffold

**Status:** ready-to-ship
**Open questions:** none

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

The stack pack assumes the target repo already has a Worker. It ships pipeline scripts, CI, schema, and docs — but no app — and the `wrangler.jsonc` fragment that creates the config declares `name`, `d1_databases`, and `env.staging` with **no `main` and no `assets`**, so there is no Worker entry point anywhere in the payload. An e2e install into a fresh repo (a plain Vite SPA, no Worker) landed the whole pack and left nothing deployable.

That breaks the offer at its weakest point. `/wong-setup` Step 6 asks *"Do you want this to be a real website people can open at an address?"* — deliberately phrased for someone who doesn't know what a Worker is. They say yes, get the pack, run `/wong-cloudflare`, and it arrives at a repo with nothing to deploy and no specification for what to build. WongStack is an opinionated stack; when the target has no app, opting in should bring ours.

## What Changes

- **New gated payload category `components.appScaffold`** — WongStack's `app/` becomes copyable payload, gated on its own manifest flag, parallel to `components.stackPack`. A separate flag because *pack without app* must stay possible for a repo that already has an app; taking the app implies the pack.
- **`app/wrangler.jsonc` is excluded from the copy.** It hardcodes `name: "wongstack"`, `wongstack-db`/`wongstack-db-staging`, and **two live `database_id` values**. Copying it would point a stranger's Worker at WongStack's own production and staging D1 databases. `/wong-cloudflare` already creates a missing wrangler config from the fragment with the ids it just provisioned; the scaffold leans on that path rather than duplicating it.
- **The `wrangler.jsonc` fragment gains the Worker entry** — `main`, `assets`, `compatibility_date`, `compatibility_flags`. It is the only thing that creates that file, so today even a scaffolded repo would get a config wrangler cannot deploy. The existing five rules are unchanged.
- **The two `db:migrate:*` scripts move from `app/package.json` into the `package.json` fragment**, since they hardcode WongStack's database names and cannot ship verbatim.
- **`/wong-setup` Step 6 folds the app into the existing offer** — only when Step 2's research finds no buildable app of its own. One question, still phrased in outcomes; a repo that already has an app never sees it. A yes sets both `stackPack` and `appScaffold` in the seed manifest.
- **The scaffold ships as-is** — the stock Cloudflare starter page, whose `/api/` button doubles as a post-provisioning smoke test. No rebranding.
- **Release** — `VERSION` 9.0.0 → 9.1.0 and a `CHANGELOG.md` entry, since the payload changes.

**Non-goals:** rebranding or genericizing the starter page; offering the app to repos that already have one; a scaffold for any stack other than React-on-Workers-with-D1; and the four unrelated findings from the same e2e run (the payload manifest omitting `the-change-loop.md`, `agent-knowledge-center.md`, and `required-tools.md`; `wiki-style.md`'s dead links; the missing git-identity rung in Step 5; the `.dev.vars` gitignore timing window) — each is its own change.

## Capabilities

### New Capabilities
- `app-scaffold`: the opt-in reference app — what it contains, what is deliberately excluded from the copy and why, the manifest flag that gates it, and the copy-if-absent guarantee that an existing app is never touched.

### Modified Capabilities
- `stack-pack`: the pack's payload gains a second gated category, and the `wrangler.jsonc` fragment must declare a Worker entry point rather than bindings alone.
- `install-onboarding`: the Step 6 stack-pack offer becomes conditional on whether the repo already has an app, and a yes records a second manifest flag.
- `cloudflare-provisioning`: the skill fills the `db:migrate:*` script names alongside the fragments it already applies, and does less work on a scaffolded repo, which already carries `main`/`assets`.

## Impact

- `.claude/skills/wong-sync/references/payload-manifest.md` — new gated category and its exclusion.
- `.claude/skills/wong-sync/references/stack-pack-fragments.md` — Worker entry in the `wrangler.jsonc` fragment; two scripts added to the `package.json` fragment.
- `.claude/skills/wong-setup/SKILL.md` — Step 2 detection, Step 6 offer, Step 7 seed manifest.
- `.claude/skills/wong-cloudflare/SKILL.md` — what it fills on a scaffolded repo.
- `app/package.json`, `app/wrangler.jsonc` — the two files carrying WongStack-specific values.
- `wiki/stack/getting-started.md`, `wiki/stack/d1-pipeline.md` — a repo can arrive with no app and get one.
- `VERSION`, `CHANGELOG.md`.
- No behavior change for any repo that declines the pack or already has an app.

## Decision log

- **2026-08-02** — Implemented all 26 tasks. `components.appScaffold` added as a second gated payload category (gated on the *pair* with `stackPack`, since the scaffold's build/deploy path is the pack), wired into `wong-sync`'s Step 2 file list and its manifest writer. `app/wrangler.jsonc` excluded from the copy — it carries two live `database_id`s. The `wrangler.jsonc` fragment gained `main`/`assets`/`compatibility_*` plus a sixth rule explaining *why* a bindings-only fragment produces an undeployable config. Both `/wong-setup` and `/wong-cloudflare` now detect an appless repo on the same three signals and fold the starter site into the existing single question.
  Verified by simulating the copy-if-absent walk into a scratch target: 23 files land, no `wrangler.jsonc`, and zero occurrences of `database_id`, `wongstack`, or a live id in any copied file (lockfile included).
  **Consequence accepted:** removing `db:migrate:*` from `app/package.json` costs *this* repo those two aliases. Harmless — `scripts/cf-build.sh:107` applies migrations itself, reading the database name from the wrangler config, and nothing in the pipeline invoked the npm scripts.
  Release tasks folded into the shared 9.1.0 entry rather than bumping per change.
