## Context

An end-to-end install into a fresh repo exposed the gap. The target was a plain React+Vite SPA with no Worker; it took the stack pack and received the four pipeline scripts, the Actions workflow, `schema/`, `.dev.vars.example`, `wiki/stack/`, and the `wong-cloudflare` and `walk` skills — a complete pipeline with nothing to run through it.

Two facts make that unrecoverable rather than merely incomplete:

1. **The payload contains no Worker.** `app/` exists upstream but the payload manifest classifies it as app source, explicitly *not in the manifest*.
2. **The `wrangler.jsonc` fragment declares no entry point.** It carries `name`, `d1_databases`, and `env.staging` — no `main`, no `assets`. It is the only thing in the payload that creates a wrangler config, so even if the user hand-wrote a Worker, `/wong-cloudflare` would produce a config that cannot deploy it.

So `/wong-setup` Step 6's offer — *"Do you want this to be a real website people can open at an address?"* — is answerable "yes" by precisely the audience it is written for, and cannot be honoured. The remedy is to let the opinionated stack bring its own app.

An audit of upstream `app/` found it is the stock Cloudflare React starter, and that WongStack-specific values are confined to **two files**: `wrangler.jsonc` (worker name, database names, and two live `database_id`s) and `package.json` (two `db:migrate:*` scripts). The other 22 files are portable verbatim.

## Goals / Non-Goals

**Goals:**
- A repo with no app can accept the stack-pack offer and end up with a deployable application.
- No live `database_id` or foreign database name ever reaches a target repo.
- A repo that already has an app is unaffected — it never sees the scaffold and never sees the question.
- The offer stays one outcome-shaped question, per the existing non-technical-user requirement.
- Reuse the payload's existing mechanisms — gated category, copy-if-absent, config fragment — rather than inventing an install mode.

**Non-Goals:**
- Rebranding or genericizing the starter page.
- A scaffold for any stack other than React-on-Workers-with-D1. WongStack is opinionated; a Django repo is served by declining the pack.
- Migrating an existing app onto Workers.
- The four unrelated findings from the same e2e run — each is its own change.

## Decisions

### `components.appScaffold` is a separate flag, not part of `stackPack`

Folding the app into `stackPack` would force every pack adopter to take an app, which breaks the common case: an existing repo that wants the D1 pipeline for the application it already has. A separate boolean keeps *pack without app* expressible. The reverse — app without pack — is not a valid state and is specified as such, because the scaffold's build, deploy, and migration path **is** the pack.

*Alternative considered:* a tri-state `stackPack: "pipeline" | "full"`. Rejected — it changes the type of an existing manifest key, so every older manifest becomes a migration, for no gain over a second boolean that defaults to absent.

### `app/wrangler.jsonc` is excluded from the copy, not templated

The file carries two live `database_id` values. Copying it verbatim would point a stranger's Worker at WongStack's own production and staging databases — a data hazard, not a cosmetic defect. Templating it (shipping a copy with `<placeholder>` ids) would leave a file in the repo that looks configured and is not, and would duplicate a job the fragment already owns.

Excluding it instead means the target's config is created by `/wong-cloudflare` from the `wrangler.jsonc` fragment, filled with ids it just provisioned. That path already exists and is already specified ("A missing wrangler config SHALL be created from the fragment, not treated as a reason to stop"). The scaffold adds no new mechanism; it inherits one.

The consequence is that the fragment must now be complete enough to produce a deployable config on its own — hence the `main`/`assets`/`compatibility_*` addition. That is a fix the pack needed regardless of the scaffold: without it, any repo with a hand-written Worker got an undeployable config too.

### The `db:migrate:*` scripts move into the `package.json` fragment

Same rule as the wrangler config, one level down: a script embedding `wongstack-db` cannot travel. Two options were live —

- **Ship placeholders in the copied `app/package.json`,** filled later. Rejected: it puts a broken command in the repo between install and provisioning, and creates a second thing that must be edited in place.
- **Move them to the fragment** (chosen). `/wong-cloudflare` already derives the database names and already applies the `package.json` fragment, so the scripts arrive correct the first time they exist. The invariant becomes clean and checkable: *no copied payload file contains a database name.*

### The offer is conditional on detection, and stays one question

Asking a second question ("...and would you like a starter app?") would put the user in front of a decision they cannot evaluate — and a "no" leaves them exactly where the bug already leaves them. Instead, detection decides, and the scaffold becomes part of what the existing yes delivers.

Detection is deliberately conservative: the repo counts as having an app if **any** of a `package.json` with a build script, an application entry point, or a wrangler config is present. Only the absence of all three triggers inclusion. A false negative offers an unwanted starter into an unusual repo; a false positive silently returns today's broken outcome. The conservative direction is the one that fails visibly.

### The scaffold lands at `app/`, keeping `schema/` at the root

Mirrors the upstream layout, which the pack scripts already handle: `lib-wrangler-config.sh` searches the root and then one level down for a wrangler config, and the fragments doc already specifies `migrations_dir: "../schema/migrations"` and `bash ../scripts/cf-build.sh` for the subdirectory layout. Nothing new is required.

### `package-lock.json` ships with it

Pinning to the exact versions WongStack builds against makes the installed app reproducible and known-working on day one. The cost is that a target's lockfile ages with WongStack's release cadence rather than its own — acceptable, since the file is the target's from the moment it lands and `npm update` is theirs to run.

## Risks / Trade-offs

- **A non-JS app is misdetected as "no app"** (a Go or Python service with no `package.json`) → the three-signal check includes "an application entry point" of any kind, not just a Node one; when detection is uncertain the scaffold is not included, and the pack still installs as it does today.
- **A user who wanted the pipeline for a not-yet-written app gets an app they didn't ask for** → the offer's wording says a starter site is included, so the yes is informed; and the scaffold is copy-if-absent, so deleting it is a normal repo edit with nothing to undo in the manifest.
- **The starter page is Cloudflare-branded** → deliberate, and matches what `npm create cloudflare` produces, so it reads as a starter rather than as someone else's product. Its `/api/` control earns its place as the post-provisioning smoke test.
- **A later sync adds new upstream `app/` files into a repo that has diverged** → the same copy-if-absent behavior every payload file has; the repo's own files are never touched, and an unwanted new file is a deletion.
- **Two flags can be set inconsistently** (`appScaffold` without `stackPack`) → specified as invalid; the manifest writer sets both together, and the scaffold category is gated on the pair.

## Migration Plan

No migration. Existing manifests have no `appScaffold` key, absent reads as false, and every installed repo behaves exactly as it does today. The change is additive to the payload and requires a `VERSION` minor bump (9.0.0 → 9.1.0) with a `CHANGELOG.md` entry, per the release rule.

Rollback is deleting the gated category from the payload manifest; no target repo is left in an inconsistent state, because a repo that took the scaffold owns those files outright.

## Open Questions

None blocking. One to revisit after the first real run: whether the detection signals need a fourth (a lockfile without a build script, e.g. a library repo) — deferred until a misdetection is actually observed rather than guessed at.
