<!-- openspec-archive v1 2026-08-02-offer-app-scaffold -->
<!-- file proposal.md utf8 6272 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 8414 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 4525 -->
## 1. Payload manifest — the gated category

- [x] 1.1 Add an **app scaffold** section to `.claude/skills/wong-sync/references/payload-manifest.md`, parallel to "The opt-in stack pack", gated on `components.appScaffold: true` *and* `components.stackPack: true`
- [x] 1.2 List the scaffold's files (all of upstream `app/` — `package.json`, `package-lock.json`, `index.html`, `.gitignore`, `.oxlintrc.json`, the four tsconfigs, `vite.config.ts`, `worker-configuration.d.ts`, `README.md`, `worker/index.ts`, `src/`, `public/`)
- [x] 1.3 State the exclusion explicitly: **`app/wrangler.jsonc` is never copied**, with the live-`database_id` reason and the pointer to the `wrangler.jsonc` fragment as the file's actual source
- [x] 1.4 State the invariant that no copied payload file may contain a `database_id` or a database name, and note where the `db:migrate:*` scripts live instead
- [x] 1.5 Update the "Not in the manifest" section — `app/` is no longer flatly excluded as app source; it is gated payload

## 2. Config fragments

- [x] 2.1 In `.claude/skills/wong-sync/references/stack-pack-fragments.md`, extend the `wrangler.jsonc` fragment with `main`, `assets` (SPA not-found handling), `compatibility_date`, and `compatibility_flags`, keeping the existing five rules and the `env.staging` twin structure intact
- [x] 2.2 Add a rule explaining that the fragment is the only thing that creates a wrangler config, so it must describe a deployable Worker rather than bindings alone
- [x] 2.3 Add `db:migrate:staging` and `db:migrate:prod` to the `package.json` fragment, with the database name shown as filled by `/wong-cloudflare`, and note the subdirectory-layout path variant alongside the existing `../scripts/` ones

## 3. The app scaffold itself

- [x] 3.1 Remove `db:migrate:staging` and `db:migrate:prod` from `app/package.json` (they now arrive via the fragment); leave every other script unchanged
- [x] 3.2 Verify no remaining file under `app/` — excluding `wrangler.jsonc` and `package-lock.json` — contains the string `wongstack`, any `database_id`, or any other value specific to this repo
- [x] 3.3 Confirm `app/wrangler.jsonc` still works for this repo after 3.1, since WongStack builds and deploys from it

## 4. /wong-setup — detection and the offer

- [x] 4.1 Extend Step 2's research to determine whether the repo has an app of its own — a `package.json` with a build script, an application entry point, or a wrangler config; record the verdict for Step 6
- [x] 4.2 Rewrite Step 6's stack-pack offer so that, when the repo has no app, the same single outcome-shaped prompt also covers the starter site — no second question, no product or component vocabulary
- [x] 4.3 Keep the offer unchanged for a repo that already has an app: the scaffold is not mentioned
- [x] 4.4 Update Step 7's seed-manifest instructions to write `components.appScaffold` alongside `components.stackPack`, set together and only together

## 5. /wong-cloudflare — provisioning a scaffolded repo

- [x] 5.1 Extend the skill's own pack offer (the late-adoption path) to include the scaffold on the same detection rule, setting both flags on a yes
- [x] 5.2 State that the created wrangler config supplies the Worker entry point as well as the ids, so a scaffolded repo needs no hand-written application code
- [x] 5.3 Have the skill fill the `db:migrate:*` script names from the databases it derives, as part of applying the `package.json` fragment

## 6. Docs

- [x] 6.1 Update `wiki/stack/getting-started.md` — a repo can arrive with no app and be given one; say what lands and what `/wong-cloudflare` fills in
- [x] 6.2 Update `wiki/stack/d1-pipeline.md` where it assumes the repo brought its own Worker
- [x] 6.3 Check every page under `wiki/stack/` for prose that assumes an existing app, and fix what contradicts the new path

## 7. Verify end to end

- [x] 7.1 Re-run the fresh-repo install against a repo with no app: confirm `app/` lands, no `database_id` or `wongstack` string appears anywhere in the target, and no `wrangler.jsonc` is present before provisioning
- [x] 7.2 Run the install against a repo that already has an app: confirm the scaffold is neither offered nor copied, and the pack installs exactly as it does today
- [x] 7.3 Confirm a manifest with `appScaffold` absent produces byte-identical behavior to the current release

## 8. Release

- [x] 8.1 Bump `VERSION` from 9.0.0 to 9.1.0
- [x] 8.2 Add the newest-first `CHANGELOG.md` entry describing the offer change and the fragment fix

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 5282 -->
## ADDED Requirements

### Requirement: An opt-in app scaffold ships in the payload

The payload SHALL include WongStack's own `app/` — a React-on-Workers-with-D1 application — as a copyable category gated on `components.appScaffold` (boolean) in `.claude/.wong-stack.json`. A repo whose manifest lacks the flag SHALL receive none of the scaffold's files.

The flag SHALL be **separate from `components.stackPack`**, because a repo that already has an app must be able to take the Cloudflare pack without the scaffold. Taking the scaffold SHALL imply the pack: `appScaffold: true` without `stackPack: true` is not a valid manifest state, since the scaffold's build, deploy, and migration path is the pack.

#### Scenario: A repo without the flag receives no scaffold

- **WHEN** a repo installs or syncs WongStack with `components.appScaffold` absent or false
- **THEN** no file under `app/` is written to it
- **AND** the repo's own application layout is untouched

#### Scenario: The pack is takeable without the scaffold

- **WHEN** a repo that already has an app opts into the Cloudflare stack pack
- **THEN** `components.stackPack` is true and `components.appScaffold` is absent or false
- **AND** it receives the pack's scripts, CI, schema, and docs but no `app/` files

#### Scenario: The scaffold implies the pack

- **WHEN** a manifest records `components.appScaffold: true`
- **THEN** `components.stackPack` is also true
- **AND** the repo receives both categories

### Requirement: The scaffold carries no WongStack-specific value

Every file copied by the scaffold SHALL be free of values belonging to the WongStack repo itself — no Worker name, no database name, and above all no `database_id`. Two files in upstream `app/` carry such values and SHALL therefore be handled specially:

- **`app/wrangler.jsonc` SHALL NOT be copied.** It declares `name: "wongstack"`, the `wongstack-db` and `wongstack-db-staging` database names, and two live `database_id` values. Copying it would point the installing repo's Worker at WongStack's own production and staging databases. The target's wrangler config SHALL instead be created by `/wong-cloudflare` from the `wrangler.jsonc` fragment with the ids it provisions, which is the existing path for a repo with no wrangler config.
- **The `db:migrate:staging` and `db:migrate:prod` scripts SHALL NOT ship in the copied `app/package.json`.** They embed WongStack's database names. They SHALL be supplied by the `package.json` config fragment and filled by `/wong-cloudflare` with the names it derives, so no script referencing another repo's database ever sits in the target.

Every other file in `app/` SHALL be copied verbatim, including `package-lock.json`, so the installed app builds against the exact dependency versions WongStack builds against.

#### Scenario: No live database id reaches a target repo

- **WHEN** the scaffold is installed into any repo
- **THEN** no copied file contains a `database_id`
- **AND** the repo's wrangler config is created later by `/wong-cloudflare` from the fragment

#### Scenario: No script names a foreign database

- **WHEN** the scaffold's `app/package.json` lands in a target repo
- **THEN** it contains no script referencing `wongstack-db` or `wongstack-db-staging`
- **AND** the migration scripts arrive through the `package.json` fragment with the target's own database names

#### Scenario: Dependency versions are pinned

- **WHEN** the scaffold is installed
- **THEN** `app/package-lock.json` is copied with it
- **AND** `npm ci` in the installed app resolves the versions WongStack itself builds against

### Requirement: The scaffold is copy-if-absent like every other payload file

The scaffold SHALL follow the payload's ordinary copy rule: a file that is absent is copied, a file that is present is left exactly as it is. The sync SHALL NOT overwrite, merge, or restructure an application the repo already has, and installing the scaffold SHALL NOT be a special mode.

#### Scenario: An existing app is never clobbered

- **WHEN** a repo with `components.appScaffold: true` already has a file at a scaffold path
- **THEN** that file is left byte-for-byte as it is
- **AND** only the absent files are copied

#### Scenario: A partial scaffold completes

- **WHEN** a repo has some scaffold files and not others
- **THEN** the sync copies only the missing ones

### Requirement: The scaffold ships as the stock starter, unbranded

The scaffold's landing page SHALL ship as the stock Cloudflare React starter — hero, framework logos, a counter, and a live `/api/` fetch served by the Worker. It SHALL NOT be rebranded or genericized into a placeholder shell.

The `/api/` control SHALL be documented as a **provisioning smoke test**: after `/wong-cloudflare` completes, clicking it exercises the deployed Worker and confirms the pipeline end to end, so the first thing a new user can do with their live address is prove it works.

#### Scenario: A new user confirms their site is live

- **WHEN** a user finishes `/wong-cloudflare` on a scaffolded repo and opens the returned URL
- **THEN** the starter page loads and its `/api/` control returns a response from the deployed Worker
- **AND** the user has confirmed the pipeline works without reading any documentation

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 3625 -->
## MODIFIED Requirements

### Requirement: Where the skill is present, it is the whole door to the pack

When `/wong-cloudflare` runs in a repo whose manifest lacks `components.stackPack: true` (or whose pack files never landed), it SHALL NOT stop and point elsewhere. It SHALL make the pack's outcome-phrased offer itself; on a yes it SHALL set `components.stackPack: true` in `.claude/.wong-stack.json`, land the pack's drop-in files by following the `wong-sync` skill's clone-refresh and copy-if-absent steps (the adapt step SHALL NOT run as part of this), apply the id-free config fragments, and continue into provisioning. On a no it SHALL stop having changed nothing.

Where the repo has no application of its own, the offer SHALL include the app scaffold on the same terms `wong-setup` uses: one outcome-shaped question, and on a yes `components.appScaffold: true` is set alongside `stackPack` so the copy-if-absent walk lands the scaffold too. A repo that already has an application SHALL NOT be offered it.

The skill SHALL own all config-fragment application: the id-free fragments (`package.json` scripts, `.env.example` variables, `.gitignore` entries) at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. A missing wrangler config SHALL be created from the fragment, not treated as a reason to stop. Because the fragment declares the Worker entry point as well as the bindings, the created config SHALL be deployable whether the application arrived with the scaffold or was already the repo's own.

The `db:migrate:staging` and `db:migrate:prod` scripts SHALL be written with the database names the skill derives, as part of the `package.json` fragment, since no copied payload file may carry a database name.

When no Cloudflare token is available yet, the skill SHALL stop cleanly after the adoption work with the files and fragments in place, stating that a re-run with a token completes provisioning.

#### Scenario: Late adoption through the skill

- **WHEN** `/wong-cloudflare` runs in a repo that has the skill but not `components.stackPack: true`
- **THEN** it offers the pack, and on a yes sets the flag, lands the missing drop-in files, applies the id-free fragments, and proceeds toward provisioning
- **AND** on a no it stops with the repo unchanged

#### Scenario: Late adoption in a repo with no app

- **WHEN** `/wong-cloudflare` offers the pack in a repo with no application of its own and the user says yes
- **THEN** it sets `components.appScaffold: true` alongside `components.stackPack: true`
- **AND** the copy-if-absent walk lands the scaffold, so provisioning has something to deploy

#### Scenario: A scaffolded repo needs only ids

- **WHEN** the skill reaches the binding step in a repo carrying the scaffold
- **THEN** it creates the wrangler config from the fragment, supplying the entry point and the ids it just provisioned
- **AND** it does not ask the user to author any application code

#### Scenario: Adoption without a token yet

- **WHEN** the user says yes to the pack but has no Cloudflare account or token
- **THEN** the run completes the adoption work and stops cleanly, telling the user a later re-run provisions
- **AND** nothing is half-provisioned

#### Scenario: No pointer at a refusing path

- **WHEN** any payload prose directs a repo without the pack toward adopting it
- **THEN** it names a route that works — `/wong-cloudflare` where the skill exists, or setting `components.stackPack: true` and running `/wong-sync` where it does not
- **AND** no prose claims `/wong-sync` offers the pack

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 4909 -->
## MODIFIED Requirements

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

The offer SHALL be phrased as an **outcome the user recognizes**, not an inventory of what ships. It SHALL NOT lead with product or component names (`D1`, `Workers`, "pipeline scripts", "seed template") — the audience is someone who does not know what those are, decline is the documented safe default, and a jargon-first offer therefore converts the target user into a decline by confusion. It SHALL name the practical cost honestly (a free Cloudflare account, a few minutes) and the practical result (a live address other people can open). Technical detail SHALL remain available for a user who asks, as a follow-up rather than as the prompt.

**The offer SHALL include the app scaffold when, and only when, the repo has no application of its own.** Research SHALL determine this before the offer is made, from the absence of an application to build — no build script in a `package.json`, no application entry point, and no wrangler config. Where that holds, accepting the offer SHALL install the scaffold too, and the seed manifest SHALL record both `components.stackPack: true` and `components.appScaffold: true`. Where the repo already has an application, the scaffold SHALL NOT be mentioned and the manifest SHALL record `stackPack` alone.

The scaffold SHALL NOT be raised as a second question. It is part of what the one outcome-shaped offer delivers, not a separate decision the user is asked to adjudicate — a repo with nothing to deploy cannot honour "a real website people can open at an address" without an app, so bundling it is what makes the existing promise true. The prompt SHALL remain free of product and component vocabulary when the scaffold is included; describing it as *"I'll set up a starter site you can change"* satisfies this, while naming React, Vite, or a Worker does not.

`wong-setup` SHALL NOT apply the pack's config fragments. On acceptance it SHALL name `/wong-cloudflare` as the follow-on step that configures and provisions, runnable whenever the user has a Cloudflare account. On decline it SHALL name the late-adoption route that actually works (per the stack-pack capability) rather than implying `/wong-sync` will offer the pack.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the `/wong-sync` pull installs the pack's files with the rest of the payload
- **AND** setup applies no config fragment, telling the user `/wong-cloudflare` configures and provisions whenever they have a Cloudflare account

#### Scenario: A repo with no app accepts the offer

- **WHEN** research finds no build script, no application entry point, and no wrangler config, and the user accepts the offer
- **THEN** the seed manifest records both `components.stackPack: true` and `components.appScaffold: true`
- **AND** the `/wong-sync` pull installs the app scaffold alongside the pack

#### Scenario: A repo that already has an app is never offered the scaffold

- **WHEN** research finds an application the repo already builds
- **THEN** the offer covers the pack only and never mentions the scaffold
- **AND** an acceptance records `components.stackPack` alone

#### Scenario: The scaffold does not add a question

- **WHEN** the scaffold is included in the offer
- **THEN** the user is asked exactly one question, about the outcome
- **AND** they are not asked to decide separately about an application, a framework, or a Worker

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed
- **AND** any mention of taking the pack later names the working route

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

#### Scenario: A non-technical user meets the offer

- **WHEN** the offer is shown to someone who does not know what a database or a Worker is
- **THEN** the prompt describes the outcome in words they already understand and states what it will cost them
- **AND** it does not require them to recognize any product, component, or file name in order to answer

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 6499 -->
## MODIFIED Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — that a repo installs only by opting in. A repo that does not opt in SHALL receive none of the pack's files and SHALL remain stack-agnostic. Opt-in state SHALL be recorded as `components.stackPack` (boolean) in `.claude/.wong-stack.json`; absent or false means the repo never took the pack.

The pack SHALL have a **second, independently gated category**: the app scaffold, recorded as `components.stackPack: true` plus `components.appScaffold` (boolean), and specified by the `app-scaffold` capability. The two flags SHALL be separate so that a repo which already has an application can take the pipeline without the app. The pack alone SHALL NOT be assumed to arrive at a repo that has a Worker: a repo with `stackPack: true` and no scaffold may legitimately have no application yet, and in that state the pack's scripts have nothing to build until one exists.

#### Scenario: A repo that declines the pack is unaffected

- **WHEN** a repo installs or syncs WongStack without opting into the pack
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it
- **AND** `components.stackPack` is absent or false

#### Scenario: A repo that opts in receives the pack

- **WHEN** a repo opts into the pack
- **THEN** it receives the pack scripts, the seed template, and the pipeline docs, and is guided through the config fragments
- **AND** `components.stackPack` is true

#### Scenario: A repo takes the pipeline without the app

- **WHEN** a repo that already has its own application opts into the pack
- **THEN** `components.stackPack` is true and `components.appScaffold` is absent or false
- **AND** no `app/` file is written to it

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The `wrangler.jsonc` fragment is the **only thing in the payload that creates a wrangler config**, so it SHALL declare a deployable Worker and not bindings alone: `main` (the Worker entry point), `assets` (with single-page-application not-found handling for an SPA), `compatibility_date`, and `compatibility_flags`, alongside the existing `name`, `d1_databases`, and `env.staging` block. A fragment that declares bindings without an entry point produces a config wrangler cannot deploy, which is indistinguishable to the user from a broken install.

The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts, and SHALL include the `db:migrate:staging` and `db:migrate:prod` scripts, whose database names are filled from the resources `/wong-cloudflare` derives. Those two scripts SHALL live in the fragment rather than in any copied file, because a hardcoded database name cannot travel between repos. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: A created wrangler config is deployable

- **WHEN** `/wong-cloudflare` creates a wrangler config from the fragment in a repo that had none
- **THEN** the result declares `main`, `assets`, `compatibility_date`, and `compatibility_flags` as well as the bindings and `env.staging`
- **AND** `wrangler deploy` has an entry point to build

#### Scenario: Migration scripts name the target's own databases

- **WHEN** the `package.json` fragment is applied
- **THEN** `db:migrate:staging` and `db:migrate:prod` reference the databases provisioned for this repo
- **AND** no copied payload file contains a migration script naming another repo's database

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
