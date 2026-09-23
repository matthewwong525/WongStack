# Fix the defects that ClaymooApp and WongOS reported

**Status:** ready-to-ship
**Branch:** fix-bugs-resolve-upstream-prs
**Open questions:** none

## Why

ClaymooApp and WongOS each found WongStack defects during their own work and queued them as upstream pull requests in their notes. None of those pull requests was opened, so each repo carries a local patch that `/wong-sync` must protect on every sync. The worst defect breaks the 16.4.0 sync preflight for every target, because this source stores `CLAUDE.md` as a symlink: `node preflight.mjs --target ~/WongOS --source .` returns `missing-block-marker` today. The preflight has never worked against this source.

## What Changes

- The sync preflight reads a symlinked payload file through its link. In a Git tree, a symlink is a blob that holds the link text. `CLAUDE.md` is a symlink to `AGENTS.md` here, so the `WONG-STACK` block extract read the text `AGENTS.md` and failed. The preflight now resolves a file symlink to the blob it points at and ignores directory symlinks, for either direction of the pair. (review.html#/preflight)
- `--max-changes` works from the command line. `parseArgs` stored the option as `max-changes`, but `preflight()` reads `maxChanges`, so the flag and its positive-integer check were silently ignored. That flag is the documented way out of a `change-limit` error.
- The preflight honors `components.docsPath`, a new optional install-record field for a target that keeps the wiki pages in another folder. Payload paths under `wiki/development/` and `wiki/` map into that folder, and the UI category probe looks for `ux-principles.md` there. Two payload paths that map to one target path are an error, not a silent overwrite.
- `preview-url.sh` rejects a bare provider apex such as `https://workers.dev`. Methods 2 to 4 match free text, and a deploy bot's logo link matched before the real preview URL. The filter only removes candidates; it never builds a URL.
- `secrets:check` accepts a correctly twinned queue consumer. It compared consumers by queue name, but the twin rule requires a different queue name in staging, so every correct setup failed. Consumers are now compared by count, and a staging consumer that reads a production queue gives a warning.
- The anchor example in `wiki/wiki-style.md` points at a heading that exists in `contributing.md`.
- Fixture tests cover each script fix. The payload manifest documents `docsPath`. `VERSION` goes to 16.7.0, with a `CHANGELOG.md` entry that names the local patches each downstream repo can retire.

**Non-goals:** Write to ClaymooApp or WongOS; open pull requests there; have `/wong-setup` write `docsPath`; support wiki layouts other than one flat folder; change how `/wong-sync` adapts files after the preflight.

## Capabilities

### New Capabilities

- `preview-discovery`: `preview-url.sh` discovery order and the rule that a bare provider apex is never a preview URL.

### Modified Capabilities

- `wong-sync`: the preflight resolves symlinked payload files, honors `--max-changes`, and maps wiki paths through `components.docsPath`.
- `cf-secret-parity`: queue consumers are compared by count, not by queue name, and a consumer that is not repointed gives a warning.

## Impact

`.claude/skills/wong-sync/scripts/preflight.mjs` and `references/payload-manifest.md`; `.claude/skills/save/scripts/preview-url.sh`; `scripts/cf-secrets.mjs`; `wiki/wiki-style.md`; new or extended tests under `scripts/tests/`; `VERSION` and `CHANGELOG.md`. Targets that already carry a local patch get a `locally-adapted` unit on their next sync. That sync can take the upstream file and remove the patch. The install record gains one optional field; existing records without it behave as before.

## Decision log

- **2026-09-23** — The user asked to fix the bugs and resolve the upstream pull requests from `~/WongOS` and `~/ClaymooApp`. Investigation found no open pull request on `matthewwong525/WongStack` and none from another author. The queued work exists only as open threads: `notes/sync-wongstack-16-6-0.md` in ClaymooApp; `notes/fix-preview-url-discovery.md` and archived task 9.3 of `adopt-wongstack-2026-08-02` in WongOS.
- **2026-09-23** — Asked whether the preflight should support ClaymooApp's `components.docsPath` → chose to support it, over fixing only the hard bugs and leaving ClaymooApp's `ui: true` workaround.
- **2026-09-23** — Asked what "resolve those PRs" means → chose to fix here only. Each repo retires its local patch on its next `/wong-sync`. No other repo is written to.
- **2026-09-23** — Assumed that `docsPath` maps both `wiki/` and `wiki/development/` into one folder, the more specific prefix first. That is ClaymooApp's actual layout (`docs/development/the-change-loop.md` and `docs/development/contributing.md`) and the only user of the field. A collision check makes the flattening safe.
- **2026-09-23** — Assumed a general symlink resolution in `treeAt` rather than ClaymooApp's hard-coded `AGENTS.md` → `CLAUDE.md` mapping, because it also covers the reversed layout that ClaymooApp's test added and any later symlinked payload file.
- **2026-09-23** — Assumed the queue-consumer fix follows WongOS's local version (count check plus a not-repointed warning), because that version has run on every WongOS push since 2026-08-07.
- **2026-09-23** — Assumed the `preview-url.sh` fix follows WongOS's reject-only `drop_bare_apex`. WongOS's other two findings are already fixed here: `deploy.yml` publishes a GitHub Deployment, and `.env.example` names `CLOUDFLARE_API_TOKEN`.
- **2026-09-23** — Assumed the `wiki-style.md` example fix is in scope. It is a reported payload defect, and the edit is the task, not a side edit.
- **2026-09-23** — Assumed a link resolves one hop, by Git path, not by logical path. Link text that goes through the `.claude` folder link, and a chain of links, is dropped rather than followed. No payload file needs either today.
- **2026-09-23** — Assumed a minor bump to 16.7.0, because the install record gains a field.
- **2026-09-23** — The worktree branch was renamed from `jovial-wombat` to `fix-bugs-resolve-upstream-prs` outside the session; the Branch line records the new name.
- **2026-09-23** — Implemented all fixes test-first. Each of the 12 new cases failed against the old files for the reported reason: `missing-block-marker`, link text as content, `--max-changes` ignored, `docsPath` unmapped, `https://workers.dev` returned, and `consumer:app-jobs` reported missing. All pass now. Locally, every suite passes except `review.test.mjs`, which needs `jsdom` from `app/node_modules`; CI installs it. The link, OpenSpec config, and context checks pass.
- **2026-09-23** — Read-only preflight runs with the fixed script: `~/WongOS` (15.0.0) → `update`, 46 changed units, 0 diagnostics (it was `error` / `missing-block-marker` before); `~/ClaymooApp` (16.6.0, `docsPath` set) → `update`, 1 changed unit, 0 diagnostics.
- **2026-09-23** — The self-source test records `HEAD` rather than an earlier commit: CI's `actions/checkout` is shallow, so no earlier commit exists there. The `CLAUDE.md` block is extracted on every run regardless of commit distance, so the test still fails on the old file.
- **2026-09-23** — Archive checkpoint for `/ship`. The task-driven save passed CI on PR #100 (`4bc6de2`), which closed task 4.4. Deltas were synced into `openspec/specs/` at that save, so the archive used `--skip-specs`. `openspec validate --specs` still reports `app-scaffold` as failing; that file is unchanged from `main` and outside this change.
