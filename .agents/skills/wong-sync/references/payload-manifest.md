# The payload manifest

[`payload-files.json`](payload-files.json) lists install, sync, and link-check files; this page owns the rules. Copy selected entries; plan and apply adaptations to existing files, never overwrite them unreviewed.

## Categories

Every install starts empty and takes **every** category.

- **Core** always ships: whole workflow skill folders (`references/` and `scripts/`), browser discovery, hidden `hand-over` private links and `browser` Cloudflare browser for blocked sites, `/improve`, `/routine` Paseo scheduling, `memory` with Claude session-start/pre-edit hooks (`.claude/settings.json`) and Codex hooks (`.claude/hooks.json`), Codex settings (`.claude/config.toml`), `paseo.json`, path rules, process pages, CI's `.nvmrc`, test workflow, scripts including the wiki check, shared change-scope action, and `CLAUDE.md`'s `WONG-STACK` block.
- **UI** adds [`ux-principles.md`](../../../../wiki/ux-principles.md) for user-facing screens.
- **Pack** adds the pipeline scripts, workflow, schema, and `wiki/stack/` pages.
- **Scaffold** adds `app/`, except `app/wrangler.jsonc`, which holds source-repo database IDs.

## The agent folder

Keep one real `.agents/` folder linked as `.claude` and `.codex`. Inventory paths are logical `.claude/`, installed under `.agents/`: Codex reads `.claude/hooks.json` as `.codex/hooks.json` and `.claude/config.toml` as `.codex/config.toml` for Default-mode questions. Native `.agents/skills` discovery loads each skill once.

A real `AGENTS.md` holds `WONG-STACK`; `CLAUDE.md` links to it. Codex reads the former, Claude Code the latter; the inventory's block unit remains `CLAUDE.md` through the link. Sync plans the move, preserving all target text:

- a real `CLAUDE.md` and no `AGENTS.md` — `git mv CLAUDE.md AGENTS.md`, then `ln -s AGENTS.md CLAUDE.md`;
- a real `CLAUDE.md` and a real `AGENTS.md` — a reviewed task merges both into `AGENTS.md` with one `WONG-STACK` block, then links `CLAUDE.md`; never overwrite either file;
- `CLAUDE.md` already links to `AGENTS.md` — nothing.

On Windows, link with `MSYS=winsymlinks:nativestrict ln -s AGENTS.md CLAUDE.md`, as setup does for `.claude` and `.codex`.

An install from before 19.0.0 may still have a real `.claude/` or `.codex/` folder, or `AGENTS.md` linking to a real `CLAUDE.md`. [Catching up an older install](catch-up.md) owns those moves, and the rest such an install missed.

The record's `components.skills` mapping preserves local skill names. Inventory limits copying, not exploration of named dependencies or impacts. Never copy target-owned notes, app code, business docs, or OpenSpec records, or seed `wiki/people/` or other knowledge sections; those grow from use.

Setup also copies the source's values-blank `.env.example`. It is not in `payload-files.json`, so a sync never updates it.

## Deterministic sync preflight

[`preflight.mjs`](../scripts/preflight.mjs) compares the record's `commit` with refreshed source `HEAD` over both commits' `payload-files.json` union, including additions, removals, folders, exclusions, and manifest edits. It selects `core`, `ui`, `pack`, and `scaffold`; `seededBySetup` is not payload.

The record maps upstream `.claude/skills/<name>/` to local folders: string arrays keep names; objects or source/local pairs keep renames. New skills keep upstream names until implementation records another. Paths remain logical `.claude/`, including from `.agents/`.

A source symlink is read one hop by Git path (this source's `CLAUDE.md` links to `AGENTS.md`); a link to a folder, a link, or nothing is no unit, and a real file beats a link at the same path.

Files compare by Git blob. The `CLAUDE.md` unit is only the `WONG-STACK:BEGIN`…`END` lines. Each upstream-changed unit is `added`, `modified`, or `removed`, and its target is `missing`, `installed-equivalent` (equals the recorded source), `latest-equivalent` (equals the refreshed source), or `locally-adapted` (neither; protected).

An install older than the inventory compares against an empty baseline: every unit is `added`. A missing inventory at source `HEAD` is an error.

Two more fields, still `schemaVersion: 1`, so an old install's `/wong-sync` reads them:

- `catchUp` — `{ needed, reasons }`, each reason a fixed code with its paths, from the target's layout and record alone: `agent-folder`, `codex-folder`, `rules-file`, `rules-file-reversed`, `wiki-elsewhere`, `opted-out`, `generated-openspec`, `deploy-token`, `mini-apps-folder`, `no-baseline`. `needed` is true for any reason or a version below 19.0.0. [Catching up an older install](catch-up.md) owns each.
- `updating` — one `{ version, title, note }` per `CHANGELOG.md` entry above the installed version, newest first, `note` its `**Updating.**` or `**Moving an existing install.**` text or `null`. `updatingComplete` is `false`, never an error, when the changelog or installed version can't be read.

The report gives paths, classes, and counts, never a body or diff. It returns `status: error` on a bad or non-ancestor commit, invalid inventory, an unsafe path, missing markers, a read or Git error, or a change set over the safety limit; [`/wong-sync`](../SKILL.md) owns each status.

[`merge-check.mjs`](../scripts/merge-check.mjs) runs after the plan merges new text into edited files, before the record advances. With `--from <installed commit>`, it lists each upstream hunk whose added line a `modified`, `locally-adapted` unit no longer has: file, source lines, count, first missing line. It exits 0 when nothing is missing, 1 when something is, 2 on a usage or read error, and reports `skipped` with no baseline. A moved or reworded line passes; the plan's review catches rewording.

**improve** ships an outcome brief for finding one supported improvement through the normal delivery skills, with an optional area or desired outcome and a findings-only mode. The [repository improvement guide](../../../../wiki/development/repository-improvement.md) owns cadence and scheduling.

**plan** ships the [review kit](../../plan/references/review-kit.html), the [CLI contract](../../plan/references/openspec-cli.md), the [drawing guide](../../plan/references/drawings.md), and the builder as one folder. Each change's standalone `review.html` is built from its `proposal.md` alone, viewer bundled; `/save` rebuilds it the same way. A cited owner page ships too: `scripts/check-payload-links.mjs` enforces link closure in a target.

### Planning an update

Every `/wong-sync`, however old, reads this page from the source, so the plan's use of the report lives here, not in the installed skill. Whether the installed skill hands the report to `/explore` or `/plan`, add these lines to that description, in order, word for word:

- Go straight into `/plan`: run any `/explore` as its bounded pass, never stopping at *Plan it?*.
- When `catchUp.needed`, plan each reported move by [catching up an older install](catch-up.md).
- Carry each applicable `updating` note as a task; post-publish steps come after the gate. For the private-default release, follow [the privacy migration](catch-up.md#privacy-migration).
- Before the install-record task, run `node <source path>/.claude/skills/wong-sync/scripts/merge-check.mjs --target <target root> --source <source path> --from <installed commit>`; take or name every missing hunk.
- Write Why and What Changes for the person, not an engineer, as five groups: what they get, what changes in how they work, what of theirs stays, what is left out and why, and what they do themselves. Name a file, skill, or command there only when they must type it, and keep to 12 code spans or fewer; counts, paths, and commands go in the design and tasks.

## The memory store and its hooks

**memory** ships on OpenSpec's Node.js: script, migrations, Worker route, runbook, [writing bar](../../memory/references/writing-facts.md), finite core, private client state/queue, generic setup, private setup-state, and strict public results. Merge `SessionStart`/`PreToolUse` into the target's `.claude/settings.json` or `.claude/hooks.json`; never replace either. Codex asks once to trust a new hook. Use [setup's runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store). Added migrations require reviewed trusted migration after deployment; ordinary CLI SQL migration is retired. Mini apps receive no memory configuration. [The memory convention](../../../../wiki/development/memory.md) owns the rest.

The pack explicitly ships four memory publication scripts with `cf-deploy.sh`, keeping imports inside copied core/pack. Source-only provisioning retains the original D1 creation receipt and publishes reviewed generated config/install-record changes. Callers use only record routing metadata and prove their own private machine. GitHub Actions delivers durable nonsecret artifacts; other hosts need the explicit [private journal adapter](../../../../wiki/stack/d1-pipeline.md#memory-publication). Existing-store migration and live integration require separate verification.

## The Paseo project file

`paseo.json` readies each new Paseo workspace: `worktree.setup` copies the primary worktree's secrets files, and `metadataGeneration` names things as `/save` and `/ship` do. A target's own `paseo.json` gets a merge, never a replacement: `worktree.setup` becomes a list with the seed command appended when absent, missing `metadataGeneration` entries are added, and the target's keys win. The agent presets are machine settings, not payload; [required tools](../../../../wiki/development/required-tools.md) says how they get added.

## The stack pack

Every install takes the pack: copy or adapt drop-ins; merge config fragments by [`stack-pack-fragments.md`](stack-pack-fragments.md). All [`wiki/stack/`](../../../../wiki/stack/README.md) ships. The [staging walkthrough](../../../../wiki/development/staging-walkthrough.md) stays core for `/verify` on other hosts.

Create live database IDs and secrets in the target; never copy them. No copied file may carry a live `database_id` or source-repo database name, so the source's `app/wrangler.jsonc` stays out and [provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config) builds the target's from a fragment.

## The app scaffold

A starter React/Vite Worker app with its own tests and package manifest. `app/worker/index.ts` sends `/_memory/` to the memory skill's route module and, after the login check, `/_walk/` to the verify skill's, so each route updates with its skill; only those imports and branches sit in `app/`. Below its workspace heading, the [welcome](../../../../wiki/stack/mini-apps.md), `app/src/pages/home/Tutorial.tsx`, offers one chat request to name the workspace and remove the guide, with explanations and a preview before publishing. Update `Tutorial.tsx`, `.css`, and `.test.tsx` only while the target's `Home.tsx` (flat layout: `app/src/App.tsx`) renders `<Tutorial />`; otherwise it stays removed. `/apps/` redirects to `/`, whose app list is compiled in from `app/src/apps/`. The test workflow runs `npm test` at the root or one folder down, and passes with none. No root `package.json` is copied.

[Mini apps](../../../../wiki/stack/mini-apps.md) ship in `app/`: `src/apps/<name>/` holds pages; `worker/apps/<name>/` holds optional handlers. Registries discover both. Only the `hello` example ships. Ordinary handlers have no memory bindings. List source-only apps, such as `tips`, in `scaffold.exclude`.

## OpenSpec integration and migration

Fresh setup runs `openspec init --tools none`. The verbs call the CLI directly and keep existing changes, specs, archives, and schemas. No generated `openspec-*` skills, raw `/opsx:*` commands, visibility patch, or global profile setting ships.

## Not copied

Outside the target inventory: `wong-setup`, `update-dependencies`, the `server/` setup script and agent, `VERSION`, `CHANGELOG.md`, this repo's install record, and the meta-only release checks and payload CI. A target's install record never goes upstream. Old verdict files may inform exploration; nothing writes new ones.

## Install record

Create a fresh `.claude/.wong-stack.json`: `upstream.repo` names the repository actually installed, including a fork; version and commit come from that checkout, and `upstream.clone` hints at its cache. Later sync follows this source. Record the target's memory store ids, local skill names, and install/update dates; never copy the source's record, memory bindings, or live config. Advance it only after agreed changes and any generated-layer migration. It holds no mode.
