# The payload manifest

[`payload-files.json`](payload-files.json) lists the files install, sync, and the payload link check use; this page owns its rules. Copy only selected entries. Adapt a file the target already has through plan and apply; never overwrite it unreviewed.

## Categories

Every install starts empty and takes **every** category.

- **Core** ships every listed skill's scripts/references, including browser discovery, private/reply links, camofox, improvement, scheduling and memory. It also ships `scheduled-work`, Claude/Codex memory hooks and project settings, `paseo.json`, rules, process pages, `.nvmrc`, portable checks, test workflow/change-scope action, and the `WONG-STACK` block.
- **UI** adds [`ux-principles.md`](../../../../wiki/ux-principles.md) for user-facing screens.
- **Pack** adds scripts, workflow, schema, `wiki/stack/`, the [check runner](../../../../scripts/check-runner/worker.mjs) and [company calls](../../../../scripts/company-api.mjs). Employee migrations are additive; memory imports need no app packages.
- **Scaffold** adds `app/`, except `app/wrangler.jsonc`, which holds source-repo database IDs.

## The agent folder

Install logical `.claude/` paths into real `.agents/`, linked as `.claude` and `.codex`. Hooks and config serve both agents; Codex config enables Default-mode questions. Codex loads `.agents/skills` natively, once.

Real `AGENTS.md` holds `WONG-STACK`; `CLAUDE.md` links to it. Codex and Claude read their respective names; the inventory block remains `CLAUDE.md`. Sync preserves every target-owned line:

- a real `CLAUDE.md` and no `AGENTS.md` — `git mv CLAUDE.md AGENTS.md`, then `ln -s AGENTS.md CLAUDE.md`;
- a real `CLAUDE.md` and a real `AGENTS.md` — a reviewed task merges both into `AGENTS.md` with one `WONG-STACK` block, then links `CLAUDE.md`; never overwrite either file;
- `CLAUDE.md` already links to `AGENTS.md` — nothing.

On Windows, link with `MSYS=winsymlinks:nativestrict ln -s AGENTS.md CLAUDE.md`, as setup does for `.claude` and `.codex`.

[Catch-up](catch-up.md) moves pre-19.0.0 real agent folders and reversed `AGENTS.md` links, plus other missed migrations.

`components.skills` preserves local skill names. Explore dependencies beyond the copying inventory. Never copy target-owned notes, app code, business docs or OpenSpec records; seed no knowledge sections, including `wiki/people/`.

Setup also copies the source's values-blank `.env.example`. It is not in `payload-files.json`, so a sync never updates it.

## Deterministic sync preflight

[`preflight.mjs`](../scripts/preflight.mjs) compares recorded `commit` with refreshed `HEAD`, using both inventories' union, including additions/removals, folders, exclusions and manifest changes. It selects all four categories; `seededBySetup` is not payload.

Skill mappings use logical `.claude/` paths: string arrays map names to themselves; objects or source/local pairs preserve renames. New skills keep upstream names until implementation records another.

Read source symlinks one Git hop. Folder, chained or broken links are no unit; real files win at the same path.

Compare Git blobs, limiting `CLAUDE.md` to the marked block. Upstream units are `added|modified|removed`; target classes are `missing`, `installed-equivalent` (recorded source), `latest-equivalent` (refreshed source), or protected `locally-adapted` (neither).

Pre-inventory installs use an empty baseline: all units are `added`. Missing `HEAD` inventory is an error.

Two additional fields retain `schemaVersion: 1` compatibility:

- `catchUp: { needed, reasons }` derives code/path reasons from layout/record alone: `agent-folder`, `codex-folder`, `rules-file`, `rules-file-reversed`, `wiki-elsewhere`, `opted-out`, `generated-openspec`, `deploy-token`, `mini-apps-folder`, `no-baseline`. Any reason or version below 19.0.0 means needed; [catch-up](catch-up.md) owns the moves.
- `updating` lists newer changelog entries newest-first as `{ version, title, note }`; note is Updating/Moving-an-existing-install text or null. Unreadable changelog/version sets `updatingComplete: false`, without error.

Reports expose paths/classes/counts only. Invalid/non-ancestor commits, invalid inventory, unsafe paths, missing markers, read/Git failures or oversized changes return `status: error`; [`wong-sync`](../SKILL.md) handles them.

Before advancing the record, [`merge-check.mjs`](../scripts/merge-check.mjs) with `--from <installed commit>` checks merged locally-adapted/modified units. Missing added lines report file/source lines/count/first missing line. Exit 0 means none missing, 1 means missing, 2 means usage/read failure; no baseline is `skipped`. Moved/reworded lines pass; review catches rewording.

**improve-code** ships the [improvement brief](../../../../wiki/development/repository-improvement.md): optional focus/outcome, findings-only mode, and one supported improvement plan.

**save/ship** ship [`checkpoint.mjs`](../../save/scripts/checkpoint.mjs) and [`ship.mjs`](../../ship/scripts/ship.mjs) for checkpoint/prepare/finish. Portable `--worktree` checks precede pushing. Source payload/session-measurement scripts stay meta-only.

**plan** ships its builder, [kit](../../plan/references/review-kit.html), [CLI contract](../../plan/references/openspec-cli.md) and [drawing guide](../../plan/references/drawings.md). Build/rebuild standalone `review.html` from `proposal.md` alone, bundling the viewer. Cited owner pages must ship; the payload-link check enforces closure.

### Planning an update

Every sync reads this source page. Add these report instructions to its explore/plan handoff, in order, verbatim:

- Go straight into `/plan`: run any `/explore` as its bounded pass, never stopping at *Plan it?*.
- When `catchUp.needed`, plan each reported move by [catching up an older install](catch-up.md).
- Carry each applicable `updating` note as a task; post-publish steps come after the gate. For the private-default release, follow [the privacy migration](catch-up.md#privacy-migration).
- Before the install-record task, run `node <source path>/.claude/skills/wong-sync/scripts/merge-check.mjs --target <target root> --source <source path> --from <installed commit>`; take or name every missing hunk.
- Write Why and What Changes for the person, not an engineer, as five groups: what they get, what changes in how they work, what of theirs stays, what is left out and why, and what they do themselves. Name a file, skill, or command there only when they must type it, and keep to 12 code spans or fewer; counts, paths, and commands go in the design and tasks.

## The memory store and its hooks

**memory** ships scripts/migrations/Worker route/[writing bar](../../memory/references/writing-facts.md). [Retrieval](../../../../wiki/development/document-retrieval.md) ships fallback and pinned setup metadata, never caches. Merge hooks into target settings/hooks, never replace; Codex asks once to trust them. Use [setup's runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store). Added migrations require an admin `memory.mjs migrate` after merge/deploy. Machine ownership also needs trusted replacement credentials; old private history stays unassigned. [Memory](../../../../wiki/development/memory.md) owns other details.

## The Paseo project file

Merge target `paseo.json`, preserving its keys. Make `worktree.setup` a list; append absent primary-secret seeding. Add missing metadata-generation entries, matching save/ship naming. Presets are machine settings, added per [required tools](../../../../wiki/development/required-tools.md).

## The stack pack

Every install takes the pack. Copy/adapt drop-ins; merge config [fragments](stack-pack-fragments.md) into target files. `wiki/stack/` ships; [walkthrough](../../../../wiki/development/staging-walkthrough.md) stays core for other hosts.

Create database IDs/secrets in the target. Copy no live `database_id` or source database name; exclude source `app/wrangler.jsonc`. [Provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config) builds its config.

## The app scaffold

React/Vite Worker starter with tests/package manifest. `app/worker/index.ts` routes memory and authenticated walk requests into their skill modules; keep only those imports/branches and memory's authenticated root callback in the app. Adapt that callback using the signed-identity validator; add no page/binding.

The [welcome](../../../../wiki/stack/mini-apps.md) offers naming/removing the guide with explanation and preview. Update Tutorial and its test only while Home (older flat layout: `app/src/App.tsx`) renders `<Tutorial />`; otherwise preserve its removal. `/apps/` redirects home; compile the app list from `app/src/apps/`. Tests run root/one-folder-down `npm test`, passing when none exists. Copy no root package manifest. Plan each older screen's move onto shared UI parts.

[Mini apps](../../../../wiki/stack/mini-apps.md): hello/access ship; scaffold exclusions omit source-only apps. Preserve target apps/routes/branding/welcome removal/independent memory. Access bootstrap/migrations ship explicitly; repository access stays manual. Merge target key entries; never replace a populated `app/worker/keys.ts`.

## Scheduled-work records

[Host schedules](../../../../wiki/stack/host-schedules.md) use existing clocks. Core ships `schedule`, its definition format/host/legacy references, Node helpers, and `openspec/schemas/scheduled-work/`; no cloud runner/bootstrap/model setup.

An install owns its `schedules/<name>.json`, business goals and progress. Never add those live records to this inventory or overwrite them from the template. Routines need no ongoing OpenSpec goal; finite goals stay open until verified completion/cancellation and cleanup. Save's record-only helper preserves the code gate and rejects implementation. Updates preserve deployed cloud resources and native host jobs. [Migration/teardown](../../../../wiki/stack/legacy-cloud-schedules.md) is explicit and prevents duplicate actions.

## OpenSpec integration and migration

Fresh setup runs `openspec init --tools none`. The verbs call the CLI directly and keep existing changes, specs, archives, and schemas. No generated `openspec-*` skills, raw `/opsx:*` commands, visibility patch, or global profile setting ships.

## Not copied

Never ship setup/dependency-update skills, source VERSION/changelog/install record, release checks or payload CI. Target install records stay downstream. Old verdicts can inform exploration; write none.

## Company action updates

Preserve custom handlers/paths/checks. Describe selected [company actions](../../../../wiki/stack/company-api.md) only; bare handlers stay undiscovered and usable. Older records may connect an explicit origin until a reviewed update records production. Keep memory's target/credential; give employees no business/owner key.

## Install record

Create target `.claude/.wong-stack.json` from its selected source: repo (including forks), checkout version/commit, clone-cache hint. Record target memory IDs, production-verified public company origin, local skill names and dates. Copy no source record/bindings/live config. Advance after agreed changes and generated-layer migration; retain no mode.
