# The payload manifest

[`payload-files.json`](payload-files.json) is the file inventory for installation, sync, and the payload link check. Read it for paths and categories; this page owns the rules behind those choices. Copy only selected manifest entries. A present target file is adapted through the normal plan and apply workflow, never overwritten without review.

## Categories

- **Core** always ships: WongStack workflow skills, their whole `references/` and `scripts/` directories, the browser discovery skill, the recurring `/improve` spot check, path rules, process pages, the note convention, the test workflow, and the `WONG-STACK` block of `CLAUDE.md`.
- **UI** adds [`ux-principles.md`](../../../../wiki/ux-principles.md) for a repo with user-facing screens.
- **Pack** adds the optional Cloudflare provisioning skill, pipeline scripts, workflow, schema, and `wiki/stack/` pages when `components.stackPack` is true.
- **Scaffold** adds `app/` only when both `components.appScaffold` and `components.stackPack` are true. It excludes `app/wrangler.jsonc`, which contains source-repo database IDs.

A skill installed under a recorded local name stays under that name. The target's `.claude/.wong-stack.json` `components.skills` mapping wins over defaults. The preflight bounds payload comparison; exploration starts with its changed units and reads another target path only for a named dependency or impact. The inventory limits copying, not that evidence-based expansion. Target-owned notes, app code, business docs, and existing OpenSpec records are never copied from the source.

## Deterministic sync preflight

[`preflight.mjs`](../scripts/preflight.mjs) compares the payload selected for one target at the install record's `commit` and at the refreshed source `HEAD`. It reads `payload-files.json` from both commits and expands the union, so additions, removals, whole-directory entries, exclusions, and manifest evolution stay visible. `core` is always selected. `pack` needs `components.stackPack: true`; `scaffold` needs both `stackPack` and `appScaffold`; `ui` uses an explicit `components.ui`, the scaffold choice, or the already-installed UI owner page at its mapped path. `seededBySetup` is not payload.

The install record's skill names map upstream `.claude/skills/<name>/` paths to their actual local directories. Existing string arrays are identity mappings. Object mappings, or array entries with source and local names, preserve explicit renames. New upstream core skills use their upstream name until implementation records another choice. Source repositories can store the logical `.claude/` payload under the in-repo `.agents/` alias; the report always uses logical `.claude/` source and target paths.

A target that keeps the wiki pages in one other folder records it as `components.docsPath`, a repo-relative path such as `docs/development`. Payload paths under `wiki/development/` and then `wiki/` map into that folder, so `wiki/development/the-change-loop.md` and `wiki/contributing.md` become `docs/development/the-change-loop.md` and `docs/development/contributing.md`. Two payload paths that map to one target path fail with `path-collision`; an absolute or escaping folder fails with `unsafe-path`. A record without the field keeps the `wiki/` paths.

A source file stored as a symlink is read through its link, because a Git tree holds only the link text. This source stores `CLAUDE.md` as a link to `AGENTS.md`. Resolution is one hop, by Git path. A link to a folder, to another link, or to no file is not a payload unit, and a real file wins over a link to the same logical path.

Ordinary files are compared by Git blob identity first. The `CLAUDE.md` unit is only the text from the line containing `WONG-STACK:BEGIN` through the line containing `WONG-STACK:END`; prose outside the markers is never payload drift. Each upstream-changed unit is `added`, `modified`, or `removed`, and its target state is one of:

- `missing` — the mapped target unit is absent;
- `installed-equivalent` — it still equals the recorded source revision;
- `latest-equivalent` — it already equals the refreshed source;
- `locally-adapted` — it equals neither source value and must remain protected.

The JSON report contains the complete changed-unit list, counts, paths, and classifications, but no file body or diff hunk. It writes no cache, install record, payload file, worktree, or index. Invalid or non-ancestor commits, invalid inventory data, unsafe or escaping paths, missing source markers, read errors, Git errors, or a change set above the declared safety limit produce `status: error`. An error is never truncated into `current` or widened into an unclassified full scan.

The **improve** skill ships its dependency-free survey helper and investigation references as one directory. The helper reads supported tracked text and Git history through the Node.js runtime that OpenSpec already needs. It does not add a package or contact a service. The [repository improvement guide](../../../../wiki/development/repository-improvement.md) owns cadence and scheduler requirements.

The **plan** skill ships the [fixed review kit](../../plan/references/review-kit.html), [visual author guide](../../plan/references/review-author.md), [CLI contract](../../plan/references/openspec-cli.md), builder, and structural checker as one directory. Every new change gets a standalone `review.html`; the viewer's runtime is bundled into that output. The author writes only the change's visual fragment. `/save` refreshes it through the same builder, and the old sync script remains a compatibility entry point for marked legacy pages. A cited owner page must also ship; `scripts/check-payload-links.mjs` enforces link closure across install shapes.

## The opt-in stack pack

The pack stays out of a repo until adopted. Its drop-in files follow the manifest's ordinary copy-or-adapt rule. Configuration fragments instead merge into target-owned files through [`stack-pack-fragments.md`](stack-pack-fragments.md); live database IDs and secrets are created in the target, never copied. The whole [`wiki/stack/`](../../../../wiki/stack/README.md) section ships with the pack. The [staging walkthrough](../../../../wiki/development/staging-walkthrough.md) stays core because `/verify` works on other hosts too.

No copied file may carry a live `database_id` or a source-repo database name. The source's `app/wrangler.jsonc` is excluded; `/wong-cloudflare` creates the target's config from a fragment after provisioning. A target may take the pack without the starter app and keep its own Worker.

## The opt-in app scaffold

The scaffold is a starting React/Vite Worker app, not a required runtime for WongStack. It includes its own test suite and package manifest. The core test workflow finds a repo's `npm test` script at the root or in an immediate subdirectory; when none exists, it reports that and succeeds. No root `package.json` is copied on behalf of a target. A target that does not take the scaffold gains no app dependency.

## OpenSpec integration and migration

Fresh setup initializes the OpenSpec planning home with `openspec init --tools none`. The public WongStack verbs use the CLI directly and retain existing change folders, main specs, archives, schemas, and notes. No generated `openspec-*` skills, raw `/opsx:*` commands, visibility patch, or global profile setting is part of the payload.

For an installed target with the old generated layer, run [`retire-generated-openspec.mjs`](../scripts/retire-generated-openspec.mjs) first without `--apply` to inspect it. The script recognizes exact OpenSpec 1.8.0 generated content, with or without WongStack's old `user-invocable: false` line. It also requires a WongStack install record and the known OpenSpec target marker in the same skills directory. An agreed apply task may rerun it with `--apply` to retire only known unmodified files. It preserves modified, extra, unknown, or independently owned files and reports them. Do not mark the install record fully updated while that migration is unresolved. The hash list in [`generated-openspec-hashes.json`](generated-openspec-hashes.json) is the known-content boundary; a name prefix alone never authorizes deletion.

## Not copied

`wong-setup`, `update-dependencies`, `VERSION`, `CHANGELOG.md`, this source repo's notes, meta-only release checks, and the meta-only payload CI are outside the target inventory. `.claude/.wong-stack.json` is the target's install record, written after agreed implementation rather than copied upstream. Existing legacy verdict files may inform exploration but are not generated again.

## Install record

`.claude/.wong-stack.json` records the installed source version and commit, the selected components, actual local skill names, upstream location, and install/update dates. Setup or sync advances it only after its agreed changes and the applicable generated-layer migration are complete. A proposal alone does not advance the record.
