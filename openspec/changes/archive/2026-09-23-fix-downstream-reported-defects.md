<!-- openspec-archive v1 2026-09-23-fix-downstream-reported-defects -->
<!-- file proposal.md utf8 7603 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 5533 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 3114 -->
## 1. Sync preflight

- [x] 1.1 Add the failing preflight fixtures to `scripts/tests/wong-sync-preflight.test.mjs` first: `CLAUDE.md` → `AGENTS.md` symlink, the reversed pair, a directory link, CLI `--max-changes 0` (`invalid-argument`) and `--max-changes 1` (`change-limit`), and `docsPath` mapping, UI probe, collision, and unsafe-path cases. Confirm that they fail against the current `preflight.mjs`.
- [x] 1.2 Resolve file symlinks in `treeAt` with one `git cat-file --batch` call, so a link takes its target blob and directory or dangling links are dropped (review.html#/preflight).
- [x] 1.3 Make `parseArgs` produce camel-case keys so that `--max-changes` reaches `preflight()`.
- [x] 1.4 Read and validate `components.docsPath`. Map `wiki/development/` and then `wiki/` through it in `targetPathFor`, probe the UI page at its mapped path in `selectedCategories`, and fail with `path-collision` when two logical paths share one target path.
- [x] 1.5 Add a test that runs the preflight with this repository as its source against a fixture target recorded at an earlier commit, and asserts that the status is not `error`.
- [x] 1.6 Document `components.docsPath`, the symlink rule, and the `path-collision` code in `.claude/skills/wong-sync/references/payload-manifest.md`.

## 2. Stack-pack and save scripts

- [x] 2.1 Add `scripts/tests/preview-url.test.mjs` with a stub `gh` on `PATH`: a bot comment with a `https://workers.dev` logo link before a real preview URL, and an apex-only case. Confirm that it fails against the current script.
- [x] 2.2 Add `PREVIEW_HOSTS` and the reject-only `drop_bare_apex` filter to methods 2 to 4 of `.claude/skills/save/scripts/preview-url.sh`, with `PREVIEW_RE` built from `PREVIEW_HOSTS`.
- [x] 2.3 Add `scripts/tests/cf-secrets.test.mjs`: a correctly twinned consumer passes, a consumer missing from staging fails and names both counts, and a consumer that is not repointed warns. Confirm the first case fails against the current script.
- [x] 2.4 In `scripts/cf-secrets.mjs`, drop consumers from `bindingsIn` and add `checkQueueConsumers` to `checkBindings`.

## 3. Wiki

- [x] 3.1 Make the section-link example in `wiki/wiki-style.md` point at the real `contributing.md` heading anchor, with the example heading and its anchor in agreement.

## 4. Release

- [x] 4.1 Bump `VERSION` to 16.7.0 and add a newest-first `CHANGELOG.md` entry. Name each fix, the new `docsPath` field, and the local patch that each downstream repo can retire on its next `/wong-sync`: ClaymooApp's two `preflight.mjs` edits and `components.ui` workaround; WongOS's `preview-url.sh` and `cf-secrets.mjs` edits.
- [x] 4.2 Run `node --test scripts/tests/*.test.mjs`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`.
- [x] 4.3 Run the fixed preflight against `~/WongOS` and `~/ClaymooApp` read-only, and record the status and diagnostic counts in the Decision log.
- [x] 4.4 Validate with `openspec validate fix-downstream-reported-defects --strict --no-interactive` and complete the CI gate through `/save`.

<!-- end tasks.md -->
<!-- file specs/cf-secret-parity/spec.md utf8 2808 -->
## MODIFIED Requirements

### Requirement: A parity gate compares the two Workers to each other, and staging's bindings to production's

The pack SHALL provide a `secrets:check` operation that fails when the two Workers have drifted. Because `.dev.vars` is git-ignored and therefore absent in CI, the authoritative comparison SHALL be **Worker against Worker** — the secret names held by production against those held by staging — which requires no local file, no secret value, and no state beyond the two environments themselves.

The check SHALL additionally assert that every stateful binding declared at the top level of `wrangler.jsonc` reappears inside `env.staging`, catching the drift class the twin rule describes: an environment inherits no binding it does not redeclare, so a binding added to production alone is simply absent in staging. This half SHALL be a pure config read requiring no credential, so it runs even on an unprovisioned repo. Durable Objects SHALL be excluded, their storage being per-Worker and so already isolated. Queue producers SHALL be compared by binding name. Queue consumers SHALL be compared by count, because the twin rule requires a staging consumer to read a different queue from its production twin; a staging consumer that reads a queue that production also consumes SHALL produce a warning, not a failure.

Failure output SHALL name the missing keys or bindings so the fix is mechanical.

#### Scenario: A secret added to only one Worker fails the check

- **WHEN** a secret exists in the production Worker but is missing from staging
- **THEN** `secrets:check` exits non-zero and names the missing key

#### Scenario: The check runs in CI without a local secrets file

- **WHEN** the gate runs in CI, where `.dev.vars` does not exist
- **THEN** it still compares the two environments' secret names
- **AND** it does not fail merely because no local secrets file is present

#### Scenario: A binding added to production alone fails the check

- **WHEN** a stateful binding is declared at the top level of `wrangler.jsonc` with no counterpart in `env.staging`
- **THEN** `secrets:check` exits non-zero and names the binding

#### Scenario: A correctly twinned queue consumer passes

- **WHEN** production consumes `app-jobs` and `env.staging` consumes `app-jobs-staging`
- **THEN** `secrets:check` reports no queue-consumer failure

#### Scenario: A consumer missing from staging fails the check

- **WHEN** production declares more queue consumers than `env.staging`
- **THEN** `secrets:check` exits non-zero and names both counts

#### Scenario: A consumer copied but not repointed warns

- **WHEN** a staging queue consumer reads a queue that production also consumes
- **THEN** `secrets:check` prints a warning that names the queue and does not fail on it

<!-- end specs/cf-secret-parity/spec.md -->
<!-- file specs/preview-discovery/spec.md utf8 1379 -->
## Purpose

Lets `/save`, `/verify`, and `/ship` find the preview URL for the current commit without per-repo configuration, and never report a provider's home page as a preview.

## ADDED Requirements

### Requirement: Preview discovery never reports a bare provider apex

Preview discovery SHALL try, in order, GitHub Deployments for the head commit, commit statuses, check runs, and pull-request comments, and SHALL print the first preview URL it finds. For the three methods that match free text, it SHALL reject any candidate whose host is exactly a known provider apex, such as `workers.dev` or `vercel.app`. It SHALL only reject candidates. It SHALL NOT construct or repair a URL. When no candidate remains, it SHALL print nothing.

#### Scenario: A bot comment links the provider logo before the preview

- **WHEN** a pull-request comment links `https://workers.dev` in its header and `https://feature-app.example.workers.dev` in its table
- **THEN** discovery prints `https://feature-app.example.workers.dev`

#### Scenario: Only the apex is present

- **WHEN** the only preview-looking URL in every source is `https://workers.dev`
- **THEN** discovery prints nothing

#### Scenario: A deployment URL is trusted

- **WHEN** a GitHub Deployment status for the head commit has an `environment_url`
- **THEN** discovery prints that URL before it reads any free-text source

<!-- end specs/preview-discovery/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 3899 -->
## ADDED Requirements

### Requirement: Preflight reads a symlinked payload file through its link

The preflight SHALL read a payload file that the source tree stores as a symlink from the file that the link points at, inside the same source commit. It SHALL NOT use the link text as file content. A link to a directory SHALL NOT become a payload unit. When a real file and a link to it share one logical path, the real file SHALL win. The result SHALL be the same whichever file of a linked pair is the real file.

#### Scenario: CLAUDE.md is a symlink to AGENTS.md

- **WHEN** the source stores `CLAUDE.md` as a symlink to `AGENTS.md`, and `AGENTS.md` holds the `WONG-STACK` block markers
- **THEN** the preflight extracts the marked block from `AGENTS.md`
- **AND** it reports no `missing-block-marker` diagnostic

#### Scenario: The linked pair is reversed

- **WHEN** the source stores `AGENTS.md` as a symlink to a real `CLAUDE.md` that holds the markers
- **THEN** the preflight produces the same classification as for the forward layout

#### Scenario: WongStack is its own source

- **WHEN** the preflight runs with this repository as the source and a target whose install record names an earlier commit of it
- **THEN** the report status is `current` or `update`, never `error`

#### Scenario: A link points outside the tree or at a directory

- **WHEN** a symlink in the source tree points at a directory or at no blob in the same commit
- **THEN** the preflight does not report that link as a payload unit

### Requirement: The preflight change limit is settable from the command line

The `--max-changes` argument SHALL set the preflight's change limit. A value that is not a positive integer SHALL produce an `invalid-argument` error before any payload comparison.

#### Scenario: Raising the limit clears a change-limit error

- **WHEN** a sync would exceed the default change limit and the operator passes `--max-changes` with a larger value
- **THEN** the preflight uses the larger value and does not report `change-limit`

#### Scenario: An invalid limit is refused

- **WHEN** the operator passes `--max-changes 0`
- **THEN** the report status is `error` with an `invalid-argument` diagnostic

### Requirement: Preflight maps relocated wiki pages through the install record

The install record MAY set `components.docsPath` to a safe repo-relative folder that holds the target's WongStack wiki pages. When it is set, the preflight SHALL map each payload path under `wiki/development/` and then under `wiki/` to the same relative path under that folder, the more specific prefix first. The UI category probe SHALL look for `ux-principles.md` at its mapped path. Two payload paths that map to one target path SHALL produce an error, not an overwrite. A record without the field SHALL keep the `wiki/` paths.

#### Scenario: A relocated UI page selects the UI category

- **WHEN** the record sets `components.docsPath` to `docs/development` and the target has `docs/development/ux-principles.md`
- **THEN** the preflight selects the UI category without `components.ui`
- **AND** the `wiki/ux-principles.md` unit reports target path `docs/development/ux-principles.md`

#### Scenario: A development page maps into the same folder

- **WHEN** the record sets `components.docsPath` to `docs/development`
- **THEN** `wiki/development/the-change-loop.md` maps to `docs/development/the-change-loop.md`
- **AND** `wiki/contributing.md` maps to `docs/development/contributing.md`

#### Scenario: Two payload paths collide

- **WHEN** a mapped `wiki/<page>` and a mapped `wiki/development/<page>` resolve to one target path
- **THEN** the report status is `error` and the diagnostic names both source paths

#### Scenario: An unsafe folder is refused

- **WHEN** `components.docsPath` is absolute or escapes the target
- **THEN** the report status is `error` with an `unsafe-path` diagnostic

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-23

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 5923 fence=~~~ -->
~~~html
<section class="visual flow" id="preflight" data-kind="flow" data-states="after today">
  <p class="caption">One <code>/wong-sync</code> preflight run against <code>~/WongOS</code>. In the WongStack source, <code>CLAUDE.md</code> is a symlink to <code>AGENTS.md</code>, and <code>.claude</code> is a symlink to <code>.agents</code>.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-run"><h3>Run the preflight</h3><p><code>/wong-sync</code> runs the preflight on the target and the source.</p><details><summary>Details</summary><p>Command: <code>node preflight.mjs --target ~/WongOS --source &lt;WongStack&gt;</code>. The preflight reads the installed commit and the current commit of the source.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-list"><h3>List the source tree <span class="tag">Changed</span></h3><p>The preflight sees that <code>CLAUDE.md</code> is a symlink.</p><details><summary>Details</summary><p><code>treeAt</code> runs <code>git ls-tree -r</code>. The entry <code>120000 blob … CLAUDE.md</code> has mode <code>120000</code>, so the preflight marks it as a symlink. Today the mode is kept but not checked.</p></details></div>
      <p class="flow-connector">↓ What does the link name?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-resolve-file"><h3>If it names a file <span class="tag">Changed</span></h3><p>Use the blob of the real file in the same tree. <i class="callout">1</i></p><details><summary>Details</summary><p>The link text <code>AGENTS.md</code> resolves from the folder of the link. The preflight finds <code>AGENTS.md</code> in the same tree and reads that blob. The logical path stays <code>CLAUDE.md</code>.</p></details></div>
        <div class="flow-branch" data-target-id="after-resolve-dir"><h3>If it names a folder <span class="tag">Unchanged</span></h3><p>Ignore the link. <i class="callout">2</i></p><details><summary>Details</summary><p>The <code>.claude</code> link names the <code>.agents</code> tree, not a blob. The preflight does not follow it. The <code>.agents/</code> → <code>.claude/</code> alias in <code>logicalSourcePath</code> already maps each file under it.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both paths rejoin here</p>
      <div class="step flow-card" data-target-id="after-extract"><h3>Extract the WONG-STACK block <span class="tag">Changed</span></h3><p>The block extract reads the real text and finds both markers.</p><details><summary>Details</summary><p><code>extractBlock</code> gets the content of <code>AGENTS.md</code>. The begin and end <code>WONG-STACK</code> markers are present, so the block is compared with the target block.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-report"><h3>Report the result <span class="tag">Changed</span></h3><p>Status is <code>update</code> or <code>current</code>, with 0 diagnostics.</p><details><summary>Details</summary><p>The report lists the changed units. <code>/wong-sync</code> continues to <code>/explore</code>, and the normal workflow plans the update.</p></details></div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-run"><h3>Run the preflight</h3><p><code>/wong-sync</code> runs the preflight on the target and the source.</p><details><summary>Details</summary><p>Command: <code>node preflight.mjs --target ~/WongOS --source &lt;WongStack&gt;</code>. This run was reproduced against <code>~/WongOS</code> on 2026-09-23.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-list"><h3>List the source tree</h3><p><code>CLAUDE.md</code> looks like a normal file.</p><details><summary>Details</summary><p><code>git ls-tree -r</code> gives <code>120000 blob … CLAUDE.md</code>. <code>treeAt</code> keeps every blob and does not check the mode.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-blob"><h3>Read the blob</h3><p>The content is the link text, not the file.</p><details><summary>Details</summary><p><code>blob</code> runs <code>git show &lt;rev&gt;:CLAUDE.md</code>. The result is the 9 bytes <code>AGENTS.md</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-extract"><h3>Extract the WONG-STACK block</h3><p>The text has no markers, so the extract fails.</p><details><summary>Details</summary><p><code>extractBlock</code> is called with <code>required: true</code>. It stops with <code>missing-block-marker</code>: "CLAUDE.md at &lt;commit&gt; lacks the required block markers".</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-report"><h3>Report an error</h3><p>Status is <code>error</code>. The sync stops before <code>/explore</code>.</p><details><summary>Details</summary><p>The report has one diagnostic, <code>missing-block-marker</code>, and the exit code is 2. No changes are listed. The user cannot sync.</p></details></div>
    </div></div>
  </div>
  <div class="notes"><ol>
    <li>The preflight resolves a file symlink in the same tree at the same commit. It does not read the working copy. It works for either file of the pair: if <code>CLAUDE.md</code> is the real file and <code>AGENTS.md</code> is the link, the preflight reads <code>CLAUDE.md</code> directly.</li>
    <li>Directory symlinks stay out of scope. The existing <code>.agents/</code> → <code>.claude/</code> alias already covers the only directory link in the payload.</li>
  </ol></div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 52088 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-23-fix-downstream-reported-defects</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-23-fix-downstream-reported-defects</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
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
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="preflight" data-kind="flow" data-states="after today">
  <p class="caption">One <code>/wong-sync</code> preflight run against <code>~/WongOS</code>. In the WongStack source, <code>CLAUDE.md</code> is a symlink to <code>AGENTS.md</code>, and <code>.claude</code> is a symlink to <code>.agents</code>.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-run"><h3>Run the preflight</h3><p><code>/wong-sync</code> runs the preflight on the target and the source.</p><details><summary>Details</summary><p>Command: <code>node preflight.mjs --target ~/WongOS --source &lt;WongStack&gt;</code>. The preflight reads the installed commit and the current commit of the source.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-list"><h3>List the source tree <span class="tag">Changed</span></h3><p>The preflight sees that <code>CLAUDE.md</code> is a symlink.</p><details><summary>Details</summary><p><code>treeAt</code> runs <code>git ls-tree -r</code>. The entry <code>120000 blob … CLAUDE.md</code> has mode <code>120000</code>, so the preflight marks it as a symlink. Today the mode is kept but not checked.</p></details></div>
      <p class="flow-connector">↓ What does the link name?</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-resolve-file"><h3>If it names a file <span class="tag">Changed</span></h3><p>Use the blob of the real file in the same tree. <i class="callout">1</i></p><details><summary>Details</summary><p>The link text <code>AGENTS.md</code> resolves from the folder of the link. The preflight finds <code>AGENTS.md</code> in the same tree and reads that blob. The logical path stays <code>CLAUDE.md</code>.</p></details></div>
        <div class="flow-branch" data-target-id="after-resolve-dir"><h3>If it names a folder <span class="tag">Unchanged</span></h3><p>Ignore the link. <i class="callout">2</i></p><details><summary>Details</summary><p>The <code>.claude</code> link names the <code>.agents</code> tree, not a blob. The preflight does not follow it. The <code>.agents/</code> → <code>.claude/</code> alias in <code>logicalSourcePath</code> already maps each file under it.</p></details></div>
      </div>
      <p class="flow-connector">↓ Both paths rejoin here</p>
      <div class="step flow-card" data-target-id="after-extract"><h3>Extract the WONG-STACK block <span class="tag">Changed</span></h3><p>The block extract reads the real text and finds both markers.</p><details><summary>Details</summary><p><code>extractBlock</code> gets the content of <code>AGENTS.md</code>. The begin and end <code>WONG-STACK</code> markers are present, so the block is compared with the target block.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-report"><h3>Report the result <span class="tag">Changed</span></h3><p>Status is <code>update</code> or <code>current</code>, with 0 diagnostics.</p><details><summary>Details</summary><p>The report lists the changed units. <code>/wong-sync</code> continues to <code>/explore</code>, and the normal workflow plans the update.</p></details></div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-run"><h3>Run the preflight</h3><p><code>/wong-sync</code> runs the preflight on the target and the source.</p><details><summary>Details</summary><p>Command: <code>node preflight.mjs --target ~/WongOS --source &lt;WongStack&gt;</code>. This run was reproduced against <code>~/WongOS</code> on 2026-09-23.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-list"><h3>List the source tree</h3><p><code>CLAUDE.md</code> looks like a normal file.</p><details><summary>Details</summary><p><code>git ls-tree -r</code> gives <code>120000 blob … CLAUDE.md</code>. <code>treeAt</code> keeps every blob and does not check the mode.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-blob"><h3>Read the blob</h3><p>The content is the link text, not the file.</p><details><summary>Details</summary><p><code>blob</code> runs <code>git show &lt;rev&gt;:CLAUDE.md</code>. The result is the 9 bytes <code>AGENTS.md</code>.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-extract"><h3>Extract the WONG-STACK block</h3><p>The text has no markers, so the extract fails.</p><details><summary>Details</summary><p><code>extractBlock</code> is called with <code>required: true</code>. It stops with <code>missing-block-marker</code>: "CLAUDE.md at &lt;commit&gt; lacks the required block markers".</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-report"><h3>Report an error</h3><p>Status is <code>error</code>. The sync stops before <code>/explore</code>.</p><details><summary>Details</summary><p>The report has one diagnostic, <code>missing-block-marker</code>, and the exit code is 2. No changes are listed. The user cannot sync.</p></details></div>
    </div></div>
  </div>
  <div class="notes"><ol>
    <li>The preflight resolves a file symlink in the same tree at the same commit. It does not read the working copy. It works for either file of the pair: if <code>CLAUDE.md</code> is the real file and <code>AGENTS.md</code> is the link, the preflight reads <code>CLAUDE.md</code> directly.</li>
    <li>Directory symlinks stay out of scope. The existing <code>.agents/</code> → <code>.claude/</code> alias already covers the only directory link in the payload.</li>
  </ol></div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
