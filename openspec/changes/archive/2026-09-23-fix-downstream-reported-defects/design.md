## Context

See proposal.md for why. The four scripts are payload files, and each downstream repo that patched one now classifies it `locally-adapted` on every sync. The two local patches are the reference implementations:

- ClaymooApp `638adbc0` — `preflight.mjs` maps `AGENTS.md` to `CLAUDE.md` and skips mode-`120000` blobs; `preflight.test.ts` covers the forward and reversed layouts.
- WongOS `scripts/cf-secrets.mjs` (`checkQueueConsumers`) and `.agents/skills/save/scripts/preview-url.sh` (`drop_bare_apex`).

The upstream preflight tests live in `scripts/tests/wong-sync-preflight.test.mjs`, which is meta-only. Their fixtures never stored `CLAUDE.md` as a symlink, so the self-sync failure shipped green.

## Goals / Non-Goals

**Goals:** Each downstream patch can retire in favor of the upstream file with no loss of behavior. Each fix has a fixture test that fails against the current file.

**Non-Goals:** A general path-mapping record (`pathMap`); target-side symlink handling (the target is read through the filesystem, which already follows links).

## Decisions

### Resolve file symlinks inside `treeAt`, not by name

`treeAt` collects regular blobs first. It then resolves each mode-`120000` entry: read the link text with `git cat-file`, resolve it against the link's Git directory with POSIX path rules, and look it up by Git path among the regular blobs. Resolution is one hop: a link to another link, or link text that goes through the `.claude` folder link, finds no regular blob and is dropped. When the target is a blob, register the link's logical path with the target's `oid` and `gitPath` unless a regular file already owns that logical path. Links to a directory, to a path outside the tree, or to a missing path are dropped. The existing `.agents/` → `.claude/` alias stays as it is, because it handles the directory link.

Alternative: ClaymooApp's `if (gitPath === 'AGENTS.md') return 'CLAUDE.md'`. It is shorter but covers one file name in one direction. The reversed layout then depends on sort order and a collision guard written for another purpose.

Cost: one `git cat-file --batch` call for all links in a tree, not one process for each link. The source has two links today.

### `parseArgs` produces camel-case keys

`options[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())]`. The `preflight()` signature stays the same, so programmatic callers and tests are unaffected.

### `docsPath` flattens two prefixes into one folder

`targetPathFor` applies the skill mapping first. Then, if `components.docsPath` is set, it replaces a leading `wiki/development/` or else `wiki/` with `<docsPath>/`. `docsPath` goes through the existing `safeRelativePath` check at record load, so an absolute or escaping value is `unsafe-path`, like every other unsafe path. `expandInventory` records each target path once; a second logical path for the same target path fails with a new `path-collision` code that names both source paths. `selectedCategories` probes `targetPathFor('wiki/ux-principles.md')`, so the probe and the report cannot disagree.

Alternative: a structure-preserving map (`wiki/` → `<docsPath>/`). That puts `the-change-loop.md` at `docs/development/development/` for ClaymooApp, the only user of the field.

### Preview apex filter is reject-only

Port WongOS's `PREVIEW_HOSTS` list and `drop_bare_apex` filter into methods 2 to 4, and build `PREVIEW_RE` from `PREVIEW_HOSTS` so that the list has one definition. Method 1 is not filtered, because a Deployment's `environment_url` is authoritative.

### Queue consumers compare by count

`bindingsIn` keeps producers keyed by binding name and drops consumers. A new `checkQueueConsumers(config, staging)` fails when staging declares fewer consumers than production, and warns for each staging consumer whose queue production also consumes. This is WongOS's version without change, so WongOS's file becomes byte-identical except for the unrelated wrangler-lookup delta it has not synced yet.

### Tests

- `scripts/tests/wong-sync-preflight.test.mjs`: forward and reversed symlink fixtures, a directory link fixture, the CLI `--max-changes 0` and `--max-changes 1` cases, and `docsPath` mapping, probe, collision, and unsafe-path cases.
- New `scripts/tests/preview-url.test.mjs`: a temporary Git repo with a stub `gh` first on `PATH` that returns a fixed PR comment body and empty Deployment, status, and check-run lists.
- New `scripts/tests/cf-secrets.test.mjs`: copy `cf-secrets.mjs` and `lib-wrangler-config.mjs` into a temporary Git repo with a `wrangler.jsonc` fixture, and run `check` without `CLOUDFLARE_API_TOKEN` so only the binding comparison runs.

Each new case is run once against the current file first, to show that it fails.

## Risks / Trade-offs

- [A downstream repo's next sync reports the four files as `locally-adapted`] → The CHANGELOG entry names each patch and says the upstream file replaces it. `/explore` reads that entry during the sync.
- [Symlink resolution reads link text for every link] → One batch call; the tree has two links today.
- [`docsPath` flattening could hide a future `wiki/README.md` versus `wiki/development/README.md` pair] → Those files are `seededBySetup`, not payload. If they become payload, the collision error stops the sync rather than hiding one file.

## Migration Plan

No data migration. Records without `docsPath` behave as before. ClaymooApp can keep `components.ui: true`; it is redundant after this release. Rollback is a revert of the release commit.
