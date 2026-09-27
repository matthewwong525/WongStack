# The payload manifest

[`payload-files.json`](payload-files.json) lists the files install, sync, and the payload link check use; this page owns its rules. Copy only selected entries. Adapt a file the target already has through plan and apply; never overwrite it unreviewed.

## Categories

Every install starts empty and takes **every** category.

- **Core** always ships: WongStack workflow skills with their whole `references/` and `scripts/` folders, the browser discovery skill, the `/improve` spot check, the `/routine` Paseo scheduler and its scripts, the `memory` skill with its session-start hooks for Claude (`.claude/settings.json`) and Codex (`.claude/hooks.json`), Codex project settings (`.claude/config.toml`), path rules, process pages, the test workflow and its scripts, and the `WONG-STACK` block of `CLAUDE.md`.
- **UI** adds [`ux-principles.md`](../../../../wiki/ux-principles.md) for user-facing screens.
- **Pack** adds the pipeline scripts, workflow, schema, and `wiki/stack/` pages.
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

## Deterministic sync preflight

[`preflight.mjs`](../scripts/preflight.mjs) compares one target's selected payload at the record's `commit` and at the refreshed source `HEAD`. It expands the union of both commits' `payload-files.json`, so every addition, removal, folder entry, exclusion, and manifest edit shows. It always selects `core`, `ui`, `pack`, and `scaffold`, ignoring other `components` flags; `seededBySetup` is not payload.

The record's skill names map upstream `.claude/skills/<name>/` to local folders: a string array maps each to itself; an object, or array entries with source and local names, keeps renames. A new upstream core skill keeps its name until implementation records another. The report uses logical `.claude/` paths, even for a source stored under `.agents/`.

A source symlink is read through its link, one hop by Git path, since a Git tree holds only the link text (this source's `CLAUDE.md` links to `AGENTS.md`). A link to a folder, another link, or nothing is no payload unit; a real file beats a link at the same logical path.

Files compare by Git blob first. The `CLAUDE.md` unit is only the lines from `WONG-STACK:BEGIN` through `WONG-STACK:END`; prose outside is never drift. Each upstream-changed unit is `added`, `modified`, or `removed`, with one target state:

- `missing` — the mapped target unit is absent;
- `installed-equivalent` — it still equals the recorded source revision;
- `latest-equivalent` — it already equals the refreshed source;
- `locally-adapted` — it equals neither and stays protected.

An installed commit older than the inventory has no `payload-files.json`. The preflight then compares against an empty baseline: every current unit is `added`, and one the target already has is `latest-equivalent` or `locally-adapted`. A missing inventory at the source `HEAD` is still an error.

The report adds two fields, still `schemaVersion: 1`, so an old install's own `/wong-sync` reads it:

- `catchUp` — `{ needed, reasons }`. Each reason is a fixed code with the paths it saw, read from the target's layout and install record alone: `agent-folder`, `codex-folder`, `rules-file`, `rules-file-reversed`, `wiki-elsewhere`, `opted-out`, `generated-openspec`, `deploy-token`, and `no-baseline`. `needed` is true for any reason, or an installed version below 19.0.0. [Catching up an older install](catch-up.md) owns what each asks of the plan.
- `updating` — one `{ version, title, note }` per source `CHANGELOG.md` entry above the installed version, newest first, with its `**Updating.**` or `**Moving an existing install.**` text, or `null`. `updatingComplete` is `false` when the changelog is missing or unparsable, or the installed version is unknown; that is never an error, because the file changes are still proven.

The JSON report gives each changed unit's path and class, with counts, never a file body or diff. It returns `status: error` on a bad or non-ancestor commit, invalid inventory, an unsafe or escaping path, missing markers, a read or Git error, or a change set over the safety limit. [`/wong-sync`](../SKILL.md) owns what each status does.

[`merge-check.mjs`](../scripts/merge-check.mjs) runs after the plan merges new text into edited files, before the install record advances. With the same arguments plus `--from <installed commit>`, it takes each unit the preflight calls `modified` and `locally-adapted`, and lists every upstream hunk with an added line the target no longer has: the file, the source line range, the count, and the first missing line. Only the text between the markers counts for the `CLAUDE.md` block. It exits 0 when nothing is missing, 1 when something is, and 2 on a usage or read error; with no baseline it reports `skipped`. A moved or reworded line passes, so it catches dropped sections, and the plan's review catches rewording.

**improve** ships its survey helper and references as one folder; the helper reads tracked text and Git history on OpenSpec's Node.js, adds no package, and calls no service. The [repository improvement guide](../../../../wiki/development/repository-improvement.md) owns cadence and scheduling.

**plan** ships the [review kit](../../plan/references/review-kit.html), the [CLI contract](../../plan/references/openspec-cli.md), and the builder as one folder. Each change's standalone `review.html` is built from its `proposal.md` alone, viewer bundled; `/save` rebuilds it the same way. A cited owner page ships too: `scripts/check-payload-links.mjs` enforces link closure in a target.

### Planning an update

Every `/wong-sync`, however old, reads this page from the source, so the plan's use of the report lives here, not in the installed skill. Whether the installed skill hands the report to `/explore` or `/plan`, add these lines to that description, in order, word for word:

- When `catchUp.needed`, plan each reported move by [catching up an older install](catch-up.md).
- Carry each applicable `updating` note as a task; post-publish steps come after the gate.
- Before the install-record task, run `node <source path>/.claude/skills/wong-sync/scripts/merge-check.mjs --target <target root> --source <source path> --from <installed commit>`; take or name every missing hunk.
- Write Why and What Changes for the person, not an engineer, as five groups: what they get, what changes in how they work, what of theirs stays, what is left out and why, and what they do themselves. Name a file, skill, or command there only when they must type it, and keep to 12 code spans or fewer; counts, paths, and commands go in the design and tasks.

## The memory store and its hooks

**memory** ships as one folder on OpenSpec's Node.js: script, schema migrations, the Worker's route module, runbook, and [writing bar](../../memory/references/writing-facts.md). Merge its `SessionStart` hook into a target's own `.claude/settings.json` or `.claude/hooks.json`; never replace the file. Codex asks once to trust a new hook. Plan the store by [setup's runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store). A sync that adds a file under `migrations/` ends its plan with one admin task: run `memory.mjs migrate` after the update merges and production deploys. [The memory convention](../../../../wiki/development/memory.md) owns the rest.

## The stack pack

Every install takes the pack. Drop-in files follow copy-or-adapt; config fragments merge into target-owned files through [`stack-pack-fragments.md`](stack-pack-fragments.md). All of [`wiki/stack/`](../../../../wiki/stack/README.md) ships with it; the [staging walkthrough](../../../../wiki/development/staging-walkthrough.md) stays core, because `/verify` works on other hosts too.

Create live database IDs and secrets in the target; never copy them. No copied file may carry a live `database_id` or source-repo database name, so the source's `app/wrangler.jsonc` stays out and [provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config) builds the target's from a fragment.

## The app scaffold

A starter React/Vite Worker app with its own tests and package manifest. `app/worker/index.ts` sends `/_memory/` to the memory skill's route module, so the route updates with the skill; only that import and branch sit in `app/`. The landing page opens with a tutorial, `app/src/pages/home/Tutorial.tsx`: a message to copy into the chat, asking the agent to remove the tutorial and explain each step; the mini apps are listed below it. Add or update `Tutorial.tsx`, `Tutorial.css`, and `Tutorial.test.tsx` only when the target's `app/src/pages/home/Home.tsx` still renders `<Tutorial />` (or, on the flat layout, its `app/src/App.tsx` does); otherwise the person finished it, so the plan leaves it out and says so in one line. The build writes no list page, and `/apps/` redirects to `/`; a target whose landing page does not read `/apps/apps.json` gets a plan task to list the apps there. The core test workflow finds `npm test` at the root or in an immediate subdirectory; with none, it reports that and succeeds. No root `package.json` is copied for a target.

Add or update the landing page's [tutorial](../../../../wiki/stack/mini-apps.md), `app/src/Tutorial.tsx` and `Tutorial.test.tsx`, only while the target's `app/src/App.tsx` renders `<Tutorial />`; otherwise the person finished it; the plan skips them and says so in one line. The build writes no list page and `/apps/` redirects to `/`; a target whose landing page doesn't read `/apps/apps.json` gets a plan task to list the apps there.

The core test workflow runs `npm test` at the root or one folder down; with none, it says so and passes. No root `package.json` is copied.

The [mini apps](../../../../wiki/stack/mini-apps.md) route ships file by file: `router.mjs` and `routes.mjs` with their type declarations, and the example `mini-apps/apps/hello/`; `app/worker/index.ts` sends `/apps/` to it. Nothing else under `mini-apps/` ships, so apps made here stay here; list a new scaffold file by hand. App tests use Node's built-in runner, so the folder has no package manifest.

## OpenSpec integration and migration

Fresh setup runs `openspec init --tools none`. The verbs call the CLI directly and keep existing changes, specs, archives, and schemas. No generated `openspec-*` skills, raw `/opsx:*` commands, visibility patch, or global profile setting ships.

## Not copied

Outside the target inventory: `wong-setup`, `update-dependencies`, the `server/` setup script, `VERSION`, `CHANGELOG.md`, this repo's install record, and the meta-only release checks and payload CI. A target's `.claude/.wong-stack.json` is written after agreed implementation and never copied upstream. Old verdict files may inform exploration; nothing writes new ones. An older install's leftover layout and record fields are caught up in place by [catching up an older install](catch-up.md).

## Install record

`.claude/.wong-stack.json` records the source version and commit, memory store ids, actual local skill names, upstream, and install and update dates. Setup or sync advances it only after its agreed changes and any generated-layer migration, never on a proposal alone. It holds no mode: every install follows the same rules. The machine's [home](../../../../wiki/development/home.md) lives outside every repo, in `~/.wong-stack/machine.json`; setup and sync never copy it.
