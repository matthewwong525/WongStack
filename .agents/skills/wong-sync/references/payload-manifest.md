# The payload manifest

[`payload-files.json`](payload-files.json) lists the files install, sync, and the payload link check use; this page owns its rules. Copy only selected entries. Adapt a file the target already has through plan and apply; never overwrite it unreviewed.

## Categories

Every install starts empty and takes **every** category.

- **Core** always ships: WongStack workflow skills with their whole `references/` and `scripts/` folders, the browser discovery skill, the hidden `hand-over` skill whose scripts open the private links, the hidden `browser` skill that runs Cloudflare's cloud browser when a site blocks the agent's own, `/improve-code` to plan one code improvement, `/routine` and its scripts, the `memory` skill with its session-start and pre-edit hooks for Claude (`.claude/settings.json`) and Codex (`.claude/hooks.json`), Codex project settings (`.claude/config.toml`), the Paseo project file (`paseo.json`), path rules, process pages, CI's `.nvmrc`, test workflow, portable check entry point and quality scripts, and shared change-scope action, and the `WONG-STACK` block of `CLAUDE.md`.
- **UI** adds [`ux-principles.md`](../../../../wiki/ux-principles.md) for user-facing screens.
- **Pack** adds scripts, workflow, schema, `wiki/stack/`, the [check runner](../../../../scripts/check-runner/worker.mjs), the [routine runner](../../../../scripts/routine-runner/worker.mjs) and [company calls](../../../../scripts/company-api.mjs). Employee migrations are additive; memory imports need no app packages.
- **Scaffold** adds `app/`, except `app/wrangler.jsonc`, which holds source-repo database IDs.

## The agent folder

A target keeps the payload in one real `.agents/` folder, linked as `.claude` and `.codex`, as here. The inventory's logical `.claude/` paths install under `.agents/`: `.claude/hooks.json` is Codex's `.codex/hooks.json`, and `.claude/config.toml` its `.codex/config.toml`, which turns on Default-mode questions. Codex loads `.agents/skills` natively, so each agent loads a skill once.

Likewise a real `AGENTS.md` holds the `WONG-STACK` block and `CLAUDE.md` links to it: Codex reads only `AGENTS.md` and Claude Code reads `CLAUDE.md`, so one file serves both and no copy drifts. The inventory's block unit stays `CLAUDE.md`, read through the link. A sync plans the move, keeping every line of the target's own text:

- a real `CLAUDE.md` and no `AGENTS.md` — `git mv CLAUDE.md AGENTS.md`, then `ln -s AGENTS.md CLAUDE.md`;
- a real `CLAUDE.md` and a real `AGENTS.md` — a reviewed task merges both into `AGENTS.md` with one `WONG-STACK` block, then links `CLAUDE.md`; never overwrite either file;
- `CLAUDE.md` already links to `AGENTS.md` — nothing.

On Windows, link with `MSYS=winsymlinks:nativestrict ln -s AGENTS.md CLAUDE.md`, as setup does for `.claude` and `.codex`.

An install from before 19.0.0 may still have a real `.claude/` or `.codex/` folder, or `AGENTS.md` linking to a real `CLAUDE.md`. [Catching up an older install](catch-up.md) owns those moves, and the rest such an install missed.

A skill installed under a local name keeps it: the record's `components.skills` mapping beats defaults. The inventory limits copying, not how far exploration follows a named dependency or impact. Never copy target-owned notes, app code, business docs, or OpenSpec records. No install seeds `wiki/people/` or other knowledge sections; they grow from use.

Setup also copies the source's values-blank `.env.example`. It is not in `payload-files.json`, so a sync never updates it.

## Deterministic sync preflight

[`preflight.mjs`](../scripts/preflight.mjs) compares one target's payload at the record's `commit` and at the refreshed source `HEAD`, over the union of both commits' `payload-files.json`, so every addition, removal, folder entry, exclusion, and manifest edit shows. It always selects `core`, `ui`, `pack`, and `scaffold`; `seededBySetup` is not payload.

The record's skill names map upstream `.claude/skills/<name>/` to local folders: a string array maps each to itself; an object, or source-and-local pairs, keeps renames. A new upstream skill keeps its name until implementation records another. Paths are logical `.claude/`, even from `.agents/`.

A source symlink is read one hop by Git path (this source's `CLAUDE.md` links to `AGENTS.md`); a link to a folder, a link, or nothing is no unit, and a real file beats a link at the same path.

Files compare by Git blob. The `CLAUDE.md` unit is only the `WONG-STACK:BEGIN`…`END` lines. Each upstream-changed unit is `added`, `modified`, or `removed`, and its target is `missing`, `installed-equivalent` (equals the recorded source), `latest-equivalent` (equals the refreshed source), or `locally-adapted` (neither; protected).

An install older than the inventory compares against an empty baseline: every unit is `added`. A missing inventory at source `HEAD` is an error.

Two more fields, still `schemaVersion: 1`, so an old install's `/wong-sync` reads them:

- `catchUp` — `{ needed, reasons }`, each reason a fixed code with its paths, from the target's layout and record alone: `agent-folder`, `codex-folder`, `rules-file`, `rules-file-reversed`, `wiki-elsewhere`, `opted-out`, `generated-openspec`, `deploy-token`, `mini-apps-folder`, `no-baseline`. `needed` is true for any reason or a version below 19.0.0. [Catching up an older install](catch-up.md) owns each.
- `updating` — one `{ version, title, note }` per `CHANGELOG.md` entry above the installed version, newest first, `note` its `**Updating.**` or `**Moving an existing install.**` text or `null`. `updatingComplete` is `false`, never an error, when the changelog or installed version can't be read.

The report gives paths, classes, and counts, never a body or diff. It returns `status: error` on a bad or non-ancestor commit, invalid inventory, an unsafe path, missing markers, a read or Git error, or a change set over the safety limit; [`/wong-sync`](../SKILL.md) owns each status.

[`merge-check.mjs`](../scripts/merge-check.mjs) runs after the plan merges new text into edited files, before the record advances. With `--from <installed commit>`, it lists each upstream hunk whose added line a `modified`, `locally-adapted` unit no longer has: file, source lines, count, first missing line. It exits 0 when nothing is missing, 1 when something is, 2 on a usage or read error, and reports `skipped` with no baseline. A moved or reworded line passes; the plan's review catches rewording.

**improve-code** ships a brief for finding one supported code-structure improvement and planning it, with an optional area or desired outcome and a findings-only mode. The [code improvement guide](../../../../wiki/development/repository-improvement.md) owns method and cadence.

**save** and **ship** ship their one-command scripts with the skill folders: [`checkpoint.mjs`](../../save/scripts/checkpoint.mjs) runs a save's commit, push, PR, check wait and preview, and [`ship.mjs`](../../ship/scripts/ship.mjs) runs `/ship`'s `prepare` and `finish`. The portable check entry point's `--worktree` mode checks a finished build on the computer before a push. The source repo's `scripts/payload-checks.mjs` and `scripts/measure-sessions.mjs` are meta-only and never ship.

**plan** ships the [review kit](../../plan/references/review-kit.html), the [CLI contract](../../plan/references/openspec-cli.md), the [drawing guide](../../plan/references/drawings.md), and the builder as one folder. Each change's standalone `review.html` is built from its `proposal.md` alone, viewer bundled; `/save` rebuilds it the same way. A cited owner page ships too: `scripts/check-payload-links.mjs` enforces link closure in a target.

### Planning an update

Every `/wong-sync`, however old, reads this page from the source, so the plan's use of the report lives here, not in the installed skill. Whether the installed skill hands the report to `/explore` or `/plan`, add these lines to that description, in order, word for word:

- Go straight into `/plan`: run any `/explore` as its bounded pass, never stopping at *Plan it?*.
- When `catchUp.needed`, plan each reported move by [catching up an older install](catch-up.md).
- Carry each applicable `updating` note as a task; post-publish steps come after the gate. For the private-default release, follow [the privacy migration](catch-up.md#privacy-migration).
- Before the install-record task, run `node <source path>/.claude/skills/wong-sync/scripts/merge-check.mjs --target <target root> --source <source path> --from <installed commit>`; take or name every missing hunk.
- Write Why and What Changes for the person, not an engineer, as five groups: what they get, what changes in how they work, what of theirs stays, what is left out and why, and what they do themselves. Name a file, skill, or command there only when they must type it, and keep to 12 code spans or fewer; counts, paths, and commands go in the design and tasks.

## The memory store and its hooks

**memory** ships its scripts, migrations, Worker route and [writing bar](../../memory/references/writing-facts.md). [Document retrieval](../../../../wiki/development/document-retrieval.md) ships fallback and pinned setup metadata, never runtime/model caches. Merge its `SessionStart` and `PreToolUse` hooks into a target's own `.claude/settings.json` or `.claude/hooks.json`; never replace the file. Codex asks once to trust a new hook. Plan the store by [setup's runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store). A sync that adds a file under `migrations/` ends its plan with one admin task: run `memory.mjs migrate` after the update merges and production deploys. Machine-ownership migration also requires trusted replacement credentials; old private history stays unassigned. [The memory convention](../../../../wiki/development/memory.md) owns the rest.

## The Paseo project file

`paseo.json` readies each new Paseo workspace: `worktree.setup` copies the primary worktree's secrets files, and `metadataGeneration` names things as `/save` and `/ship` do. A target's own `paseo.json` gets a merge, never a replacement: `worktree.setup` becomes a list with the seed command appended when absent, missing `metadataGeneration` entries are added, and the target's keys win. The agent presets are machine settings, not payload; [required tools](../../../../wiki/development/required-tools.md) says how they get added.

## The stack pack

Every install takes the pack. Drop-in files follow copy-or-adapt; config fragments merge into target-owned files through [`stack-pack-fragments.md`](stack-pack-fragments.md). All of [`wiki/stack/`](../../../../wiki/stack/README.md) ships with it; the [staging walkthrough](../../../../wiki/development/staging-walkthrough.md) stays core, because `/verify` works on other hosts too.

Create live database IDs and secrets in the target; never copy them. No copied file may carry a live `database_id` or source-repo database name, so the source's `app/wrangler.jsonc` stays out and [provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config) builds the target's from a fragment.

## The app scaffold

A starter React/Vite Worker app with its own tests and package manifest. `app/worker/index.ts` sends `/_memory/` to the memory skill's route module and, after the login check, `/_walk/` to the verify skill's, so each route updates with its skill; only those imports and branches sit in `app/`, plus the narrow authenticated root callback for memory’s normal-login marker. Adapt that callback with the existing signed identity validator; add no page or binding. Below its workspace heading, the [welcome](../../../../wiki/stack/mini-apps.md), `app/src/pages/home/Tutorial.tsx`, offers one chat request to name the workspace and remove the guide, with explanations and a preview before publishing. Update `Tutorial.tsx` and `.test.tsx` only while the target's `Home.tsx` (flat layout: `app/src/App.tsx`) renders `<Tutorial />`; otherwise it stays removed. `/apps/` redirects to `/`, whose app list is compiled in from `app/src/apps/`. The test workflow runs `npm test` at the root or one folder down, and passes with none. No root `package.json` is copied. A target's own screens on the earlier plain look move onto the parts in `app/src/components/ui/`, each named in the plan.

[Mini apps](../../../../wiki/stack/mini-apps.md): `hello` and `access` ship; `scaffold.exclude` omits source-only apps such as `tips`. Preserve custom apps, routes, branding, removed welcomes and independent memory. Access/bootstrap/migrations ship explicitly; repository access stays manual. `app/worker/keys.ts` is the target's own once it lists a key: merge entries, never replace it.

## OpenSpec integration and migration

Fresh setup runs `openspec init --tools none`. The verbs call the CLI directly and keep existing changes, specs, archives, and schemas. No generated `openspec-*` skills, raw `/opsx:*` commands, visibility patch, or global profile setting ships.

## Not copied

Outside the target inventory: `wong-setup`, `update-dependencies`, `VERSION`, `CHANGELOG.md`, this repo's install record, and the meta-only release checks and payload CI. A target's install record never goes upstream. Old verdict files may inform exploration; nothing writes new ones.

## Company action updates

Review the target’s custom routes; preserve their handlers, paths and checks. Describe only the actions the owner selects, following [company actions](../../../../wiki/stack/company-api.md). Bare handlers stay usable and undiscovered. Older records can connect an explicit company origin until a reviewed update records production. Memory retains its existing target and credential; no employee receives a business or owner key.

## Install record

Create a fresh `.claude/.wong-stack.json`: `upstream.repo` names the repository actually installed, including a fork; version and commit come from that checkout, and `upstream.clone` hints at its cache. Later sync follows this source. Record the target's memory store ids, public `components.companyApi.origin` from production readback, local skill names, and install/update dates; never copy the source's record, memory bindings, or live config. Advance it only after agreed changes and any generated-layer migration. It holds no mode.
