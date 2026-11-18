<!-- openspec-archive v1 2026-09-26-trim-legacy-and-restatement -->
<!-- file proposal.md utf8 9302 -->
# Trim legacy paths and restated rules

**Status:** ready-to-ship
**Branch:** plan-aot-opensource
**Open questions:** none

## Why

WongStack now starts fresh, with no installs older than this release to support. Yet it still carries every migration path it has needed since 17.0.0. The same rules are also written in several places, and those copies have drifted. Every agent session pays for this text: about 5,300 words load before the user types, and one `/ship` run reads about 2,800 more. A stranger reads contradictions such as "run the checks" beside "nothing builds locally". Removing the legacy paths and keeping one owner per rule makes the toolkit smaller, cheaper, and consistent.

## What Changes

- **BREAKING: Legacy paths are removed.** Installs from before this release are not supported.
  - The `wong-sync` migrations for `notes/` (from before 17.0.0) and for the agent-folder layout and CI secret (from before 18.0.0).
  - The fallback to the `.wong-framework.json` install record.
  - The `components.stackPack`, `components.appScaffold`, and `components.ui` flags, which only gate old repos.
  - The legacy `review.html` refresh and its compatibility entry point.
  - Change matching by name when a proposal has no Branch line.
  - The pack's adoption runbook for the previous staging model.
  - The retire migration for the generated `openspec-*` layer from before 16.0.0.
  - The "Before 18.0.0" section in `SECURITY.md`, and the `adapt.md` stub. (review.html#/removed)
- **The session digest is smaller.** The always-loaded memory digest drops from 25 KB to about 6 KB. Open threads and the current change's facts come first, and `memory search` reaches the rest. The Claude hook runs only on `startup` and `resume`, like the Codex hook, not after `/clear` or compaction.
- **Each rule has one owner.**
  - `/ship` keeps its steps and commands and links [the change loop](../../../wiki/development/the-change-loop.md) for the reasons. It drops the restated pull-in rules, the history note, and the hard rules that repeat its body. This cuts about 1,300 words.
  - `/verify`'s skill, its walkthrough reference, and the staging-walkthrough wiki page each keep one job: steps, mechanics, and reasons. This cuts about 1,100 words.
  - The change-selection order is defined once, with named rungs, in the checkpoint-evidence reference. `apply`, `continue`, `save`, `ship`, and `verify` state only how they differ. This fixes the drift where `/ship` cites the wrong rung.
  - The exit-round rules stay in `/explore`, and other pages link them. (review.html#/owners)
- **Contradictions are resolved.**
  - `rules/code.md` no longer says to run checks locally or to run `/simplify`, which is Claude-only.
  - One default-branch rule, in `git-gate.md`.
  - `rules/payload.md` says which route wins for a wiki page that is also payload.
- **Stale text is corrected.** The change loop no longer describes session notes. The `openspec-*` and `/opsx:*` mentions are gone. `required-tools.md` lists Node and drops the setup readiness step that no longer exists.
- **Descriptions are triggers, not manuals.**
  - The vendored `agent-browser` skill no longer triggers on its own. `/verify` calls it.
  - The `verify`, `routine`, `continue`, and `memory` descriptions shrink to about 35 words each.
  - The `AGENTS.md` rules block becomes one line and a link per rule, and names `/routine`.
- **The wiki follows its own style.** Every page links up to its hub, and each hub links every child. `wiki/README.md` gets a topic title. The history sections move out of `staging-walkthrough.md` and `repo-layout.md`.
- **Scripts share one CLI convention:**
  - `--help` prints usage and exits 0.
  - A usage error exits 2.
  - Unknown flags are errors.
  - `isMain` has one copy.

**Non-goals:** No change to `CHANGELOG.md`, the archive, or the 18.x history. No behavior change beyond the removed legacy paths and the smaller digest. No new skill. Change 1 (`harden-edge-cases`) fixes behavior; this change moves and cuts text around those fixes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wong-sync`: The notes and 18.0.0 migrations and the legacy install record are removed. Component flags are no longer preserved.
- `stack-pack`: The previous-model adoption runbook and the legacy flag handling are removed.
- `app-scaffold`: The legacy flag handling is removed.
- `change-branch-association`: Same-name fallback for proposals without a Branch line is removed.
- `ux-wireframes`: The legacy page refresh is removed.
- `context-economy`: The digest has a smaller limit and hook scope. Each rule has one owner. Vendored skills do not add descriptions to every session.
- `memory-recall`: The digest limit and its ordering change.
- `openspec-cli-workflow`: The retire migration for the generated `openspec-*` layer (before 16.0.0) is removed.
- `toolchain-dependencies`: The required-tools page lists Node.js as a required runtime.

## Impact

- **Skills:** `ship`, `verify` (with `references/walkthrough.md`), `continue`, `save` (with `references/checkpoint-evidence.md`, `git-gate.md`, and `scripts/checkpoint-evidence.mjs`), `apply`, `explore`, `improve`, `memory` (with `scripts/lib/digest.mjs`), `wong-sync` (with `references/payload-manifest.md`, `payload-files.json`, and `scripts/preflight.mjs`; `adapt.md` is deleted), `wong-setup`, `plan/scripts/build-review.mjs`, `save/scripts/sync-review-proposal.mjs` (deleted), `agent-browser/SKILL.md`, and `routine`.
- **Always-loaded surfaces:** `AGENTS.md`, `.agents/settings.json`, and `.agents/rules/{code,payload}.md`.
- **Wiki:** `README.md`, `development/{README,the-change-loop,required-tools,staging-walkthrough,repo-layout}.md`, `contributing.md`, `agent-knowledge-center.md`, and `ux-principles.md`.
- **Other:** `SECURITY.md`, `.agents/.wong-stack.json`, and the scripts that gain the shared CLI convention. Tests that cover legacy paths are removed or changed.

## Decision log

- **2026-09-25** — The user said to assume a fresh repo that does not need to support old versions → this change removes every migration and fallback that exists only for installs before this release.
- **2026-09-25** — Asked how far the fresh-repo reset goes → chose **remove legacy code only**. `CHANGELOG.md`, the archive, and the 18.x numbering stay.
- **2026-09-25** — Asked whether Cloudflare stays mandatory → mandatory, because memory needs it. The component flags therefore have no remaining use.
- **2026-09-25** — Asked the delivery shape → **several changes, one PR**. This change applies second, after `harden-edge-cases`, in release 19.0.0.
- **2026-09-25** — Assumed: the digest limit is about 6 KB, ordered open threads, then the current change's facts, then the newest facts. The 25 KB limit fills one fifth of the fixed session load, and `memory search` gives the rest on demand.
- **2026-09-25** — Assumed: `agent-browser` gets `disable-model-invocation: true` in its frontmatter, instead of a rewritten description, so the vendored file stays close to upstream. `/verify` names it explicitly. If the host still lists it, the description is shortened as a fallback.
- **2026-09-25** — Assumed: `components.skills` renames and `components.docsPath` stay, because they record a target's own choices, not a legacy state.
- **2026-09-26** — Changed during apply: the retire migration for the generated `openspec-*` layer (before 16.0.0) is removed too, with its hash list and test, because it is a legacy path. That needed a REMOVED delta for `openspec-cli-workflow` and a MODIFIED `context-economy` requirement, which said the vendored `agent-browser` skill stays unchanged. Its one local edit is now `disable-model-invocation: true`, recorded in `.agents/rules/payload.md`. A new Claude Code session no longer lists it.
- **2026-09-26** — Changed during apply: `toolchain-dependencies` is modified so the required-tools page lists Node.js as a required runtime. The `memory.mjs import` command and `noteAuthors` existed only for the notes migration and are removed. `check-payload-links.mjs` checks one install shape, because every install takes every category. `scripts/lib-cli.mjs` joins the pack, because pack scripts import it. Skill scripts keep their own `isMain`, because a skill ships alone.
- **2026-09-26** — Measured with `node scripts/measure-context.mjs`: instruction words 17,491 → 14,246 from this change (18,812 → 14,246 against the script's baseline), owner words 11,058 → 8,985. `/ship` 2,990 → 1,823 words, `/verify` 2,420 → 1,086, `AGENTS.md` 801 → 577. Helper words rose 5,245 → 6,641, from the new parser, CLI library, and help text in the scripts. `node --test scripts/tests/*.test.mjs`: 143 pass. No dead links.
- **2026-09-26** — Saved the implementation (20 of 20 tasks) for CI, with the deltas reconciled into `openspec/specs/`. It ships with `harden-edge-cases` and `open-source-surface` in PR #105.
- **2026-09-26** — Distilled facts before the archive: no reusable fact. The one feedback fact (#147) is about briefing audit subagents, not about WongStack process.
- **2026-09-26** — Archived after CI passed on PR #105 (`2b82958`), with the deltas already reconciled into `openspec/specs/`, so the archive used `--skip-specs`.

<!-- end proposal.md -->
<!-- file design.md utf8 4447 -->
## Context

See [proposal.md](proposal.md) for why. The [review page](review.html#/removed) shows what is removed and [where each rule lands](review.html#/owners). The facts that shape the approach:

- `wong-sync/scripts/preflight.mjs:213-216` selects the `ui`, `pack`, and `scaffold` categories from the `components` flags. New installs already set all three to `true`.
- `save/scripts/checkpoint-evidence.mjs` emits a `legacy` object (same-name active and archive folders). Five verbs read it through a sentence copied four times.
- `plan/scripts/build-review.mjs:79-82` has a `legacy` branch for pages with `proposal:start` markers, and `save/scripts/sync-review-proposal.mjs` is its compatibility entry point.
- `memory/scripts/lib/digest.mjs:6-7` sets `MAX_LINES = 150` and `MAX_BYTES = 25 KB`. The cached digest in this repo is 25.3 KB.
- `scripts/measure-context.mjs` already reports the instruction-word total against a baseline. The `context-economy` spec requires a simplification to report a net reduction.

## Goals / Non-Goals

**Goals:**
- A net cut of at least 4,000 instruction words, measured by `measure-context.mjs`, with no loss of a rule. Every removed sentence is either legacy or has a live owner that a link reaches.
- Code and prose agree: when a legacy branch leaves the code, its prose and tests leave with it.

**Non-Goals:**
- No rewording for style alone. A section that is correct, single-owned, and short stays as it is.
- No change to `review-kit.html` or the review page layout.

## Decisions

### Cut by owner, not by length

For each duplicated rule, choose the owner by where a reader acts on it. The skill owns the steps and commands the agent runs. A `references/` file owns mechanics that only that skill needs. The wiki owns reasons and process that people read. Every other copy becomes one sentence and a link. *Alternative:* shorten each copy in place. Rejected: shorter copies still drift, and drift is the defect.

### Named rungs for change selection

`checkpoint-evidence.md` defines the rungs by name: `explicit`, `session`, `changed-active`, `recorded-branch`, `sole-active`, and `changed-archive`. Each verb lists the rungs it uses, in order. With the `legacy` rung gone, the helper stops emitting `legacy`, and its tests drop those cases.

### Flags go, the selection stays one code path

`preflight.mjs` always selects `core`, `ui`, `pack`, and `scaffold`. Setup stops writing `components.stackPack`, `components.appScaffold`, and `components.ui`. `components.skills` and `components.docsPath` stay, because they are a target's own choices. The preflight ignores an old flag rather than rejecting it. An unsupported repo then fails later, in planning, where a person reads it.

### The digest is ranked, then capped

`digest.mjs` ranks the facts: current-change threads, other threads, feedback, project, and reference, each newest first. It then cuts at 40 lines or 6 KB. The last line keeps the count and the search command. The Claude hook gets `"matcher": "startup|resume"`, like the Codex hook.

### The vendored browser skill is not auto-invoked

Add `disable-model-invocation: true` to `agent-browser/SKILL.md`, and record that edit in the vendored-file note, so an upstream refresh keeps it. `/verify` already names the skill.

### One CLI convention

Add `scripts/lib-cli.mjs` with `isMain` and `parseCli(spec)`. `parseCli` uses `parseArgs` with `strict: true`, prints usage for `--help` and exits 0, and exits 2 on a usage error. The seven scripts that copy `isMain` import it. The memory scripts keep their own copy in `lib/store.mjs`, because the memory skill ships alone and must not import from `scripts/`.

## Risks / Trade-offs

- [A cut removes a rule that only the cut text held] → Before each cut, grep for the rule's key terms and confirm the owner states it. The review page lists every owner, so a reviewer can check.
- [A 6 KB digest hides a fact that the agent needed] → Threads and the current change come first, and the last line names the search. The `/explore` and `/continue` memory searches do not change.
- [`disable-model-invocation` is not honored by Codex] → Codex does not list vendored descriptions the same way. If it does, shorten the description as the fallback in the Decision log.

## Migration Plan

None. Installs from before this release are not supported. The 19.0.0 changelog entry says so and gives the fix: set up again in an empty folder.

<!-- end design.md -->
<!-- file tasks.md utf8 4510 -->
## 1. Remove legacy paths

- [x] 1.1 `wong-sync/references/payload-manifest.md`: delete the notes migration and the "Moving to 18.0.0" section, and the sentences about flags gating old repos. Delete `references/adapt.md`, and repoint `wiki/contributing.md:12` to `/wong-sync` (review.html#/removed).
- [x] 1.2 `wong-sync/SKILL.md` and `wong-setup/SKILL.md`: read only `.claude/.wong-stack.json`.
- [x] 1.3 `preflight.mjs`: always select `core`, `ui`, `pack`, and `scaffold`, and ignore old flags. Remove the flag notes from `payload-files.json`. Setup and `.agents/.wong-stack.json` stop writing the three flags. Update `scripts/tests/` preflight cases.
- [x] 1.4 `build-review.mjs`: remove the `legacy` branch. Delete `save/scripts/sync-review-proposal.mjs` and its mentions in `save/SKILL.md` and the manifest. Update the review tests.
- [x] 1.5 `checkpoint-evidence.mjs`: stop emitting `legacy`. Remove the same-name fallback from `continue`, `save`, `ship`, `verify`, and `apply`. Update the helper's tests.
- [x] 1.6 Delete the previous-model adoption runbook from `wiki/stack/`, `SECURITY.md` "Before 18.0.0", and the Browser Rendering history note in `wong-setup/references/permission-groups.md`. Check `generated-openspec-hashes.json`'s legacy normalization and remove it if nothing else needs it.

## 2. Memory digest

- [x] 2.1 `memory/scripts/lib/digest.mjs`: rank (current-change threads, other threads, feedback, project, reference; newest first within each), then cap at 40 lines and 6 KB. Update the digest tests for the order, the cap, and the last line.
- [x] 2.2 `.agents/settings.json`: add `"matcher": "startup|resume"` to the SessionStart hook.

## 3. One owner per rule

- [x] 3.1 `save/references/checkpoint-evidence.md`: define the named selection rungs. Replace the numbered orders and the copied "Read the helper fields…" sentence in `apply`, `continue`, `save`, `ship`, and `verify` with a list of the rungs each verb uses (review.html#/owners).
- [x] 3.2 `ship/SKILL.md`: keep the steps and commands. Replace the pull-in restatement, the verify restatement, the history note, and the repeated hard rules with links to the change loop and `/apply`'s resolve order.
- [x] 3.3 `/verify`: the skill keeps the steps and the verdict table, `references/walkthrough.md` keeps the mechanics, and `wiki/development/staging-walkthrough.md` keeps the reasons. Remove the other copies.
- [x] 3.4 `apply:44`, `explore:50-70`, and `the-change-loop.md:24-45`: keep each rule in its owner, and link from the rest.
- [x] 3.5 Resolve the contradictions. In `rules/code.md`, remove the local-check and `/simplify` lines. Put one default-branch rule in `git-gate.md`, and link it from `improve`, `ship`, `continue`, and `save`. In `rules/payload.md`, say which route a payload wiki page takes.
- [x] 3.6 Fix the stale text: session notes in `the-change-loop.md:41-42`, `openspec-*` in `wiki/development/README.md:5`, `/opsx` in `ship` and `continue`, and `required-tools.md:3,11,53`.

## 4. Always-loaded surfaces

- [x] 4.1 `agent-browser/SKILL.md`: add `disable-model-invocation: true`, and note the local edit where the vendored file is documented. Confirm in a new session that the description is gone from the skill list. If it is still listed, shorten it and record that in the Decision log.
- [x] 4.2 Trim the `verify`, `routine`, `continue`, and `memory` descriptions to about 35 words each. Each stays a trigger that names when to use the skill.
- [x] 4.3 `AGENTS.md` WONG-STACK rules block: one line and a link per rule, with `/routine` in the verb list.

## 5. Wiki and scripts

- [x] 5.1 Wiki style: link `staging-walkthrough.md` from `development/README.md`. Add up-links to `staging-walkthrough`, `the-change-loop`, `agent-knowledge-center`, and `ux-principles`. Title `wiki/README.md` as a topic. Move the history in `staging-walkthrough.md:163-186` and `repo-layout.md:29` out of the wiki; the archive already holds it.
- [x] 5.2 Add `scripts/lib-cli.mjs` (`isMain`, `parseCli` with strict parsing, `--help` exit 0, usage error exit 2). Use it in the scripts that copy `isMain`, and in `check-openspec-config.mjs` and `check-payload-links.mjs`. Set `strict: true` in `memory.mjs`. Add a test that runs each script with `--help` and with an unknown flag.
- [x] 5.3 Run `node scripts/measure-context.mjs` and `node scripts/check-payload-links.mjs`. Record the before and after instruction-word totals in the Decision log. The goal is a net cut of at least 4,000 words with no dead link.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 782 -->
## MODIFIED Requirements

### Requirement: The app scaffold ships in the core payload

The payload SHALL include WongStack's own `app/` — a React-on-Workers-with-D1 application — as part of the core payload. Setup starts from an empty folder, so every install SHALL receive the scaffold. No install-record flag SHALL gate it.

#### Scenario: A new install receives the scaffold

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives `app/`, and the provisioning step creates its wrangler config

#### Scenario: A legacy repo without the flag receives no scaffold

- **WHEN** an install record carries `components.appScaffold: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/change-branch-association/spec.md utf8 1406 -->
## MODIFIED Requirements

### Requirement: Continue resolves the branch independently of the change name

`/continue` SHALL read the branch recorded in the selected change's proposal. A PR reference SHALL use its actual head branch and resolve the change carried there. A proposal with no branch field SHALL be resumed in the current checkout or after the user names its branch. `/continue` SHALL NOT assume that a change name is a branch name.

#### Scenario: Resume a saved change by name

- **WHEN** `/continue review-handoff` reads a proposal with `Branch: editor-work`
- **THEN** it checks out `editor-work` when checkout is safe and resumes `review-handoff`

#### Scenario: Resume from a fresh clone

- **WHEN** the current checkout has no `review-handoff` folder but one fetched remote branch carries it
- **THEN** `/continue review-handoff` reads the proposal from that branch and checks out its recorded branch when safe

#### Scenario: Resume by pull request

- **WHEN** a PR head branch has a unique changed active OpenSpec folder with another name
- **THEN** `/continue` loads that folder and resumes it on the PR head branch

#### Scenario: Legacy same-name handoff

- **WHEN** a change has no recorded branch and a branch with the same name exists
- **THEN** `/continue` does not check out that branch on the name alone, and asks for the branch when the change is not in the current checkout

<!-- end specs/change-branch-association/spec.md -->
<!-- file specs/context-economy/spec.md utf8 2762 -->
## MODIFIED Requirements

### Requirement: WongStack-authored skill descriptions are triggers, not manuals

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters. How it operates SHALL belong in its body or its linked owner reference. A shared rule SHALL have one owner; references SHALL not reproduce the generated OpenSpec workflow layer under a new name.

The vendored `agent-browser` skill SHALL remain exempt from the description budget. Its only local edit SHALL be the frontmatter key that stops automatic invocation, and that edit SHALL be recorded where the vendored file is documented. WongStack SHALL neither install nor require generated OpenSpec skills.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored description exceeds the budget
- **THEN** it is reduced to purpose and invocation triggers
- **AND** required behavior remains in its owning skill or linked reference

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are shortened
- **THEN** the vendored browser skill's body and description are left intact

#### Scenario: A generated skill is hidden from the menu

- **WHEN** the vendored browser skill is listed by the host
- **THEN** its frontmatter stops automatic invocation, and `/verify` still calls it by name

#### Scenario: A common CLI rule is needed by two verbs

- **WHEN** two verbs need the same root-resolution or artifact-path rule
- **THEN** they link to one shared contract rather than carrying separate copies

## ADDED Requirements

### Requirement: Each rule has one owner

Each workflow rule SHALL be written in one payload file, its owner. Other skills and pages SHALL link the owner and SHALL state only how they differ from it. The change-selection order SHALL be defined once, with named rungs, and each verb SHALL refer to rungs by name, not by number. No payload surface SHALL contradict another on the same rule.

#### Scenario: A verb needs the selection order

- **WHEN** a reader follows `/ship`'s change selection
- **THEN** it links the one definition and names the rung it starts from

#### Scenario: A rule is restated

- **WHEN** a reviewer finds the same procedure in two skills
- **THEN** one copy is replaced by a link to the other

### Requirement: Vendored skills do not load descriptions into every session

A vendored skill that only a WongStack verb calls SHALL NOT be offered for automatic invocation. Its description SHALL NOT add to the always-loaded surface.

#### Scenario: A browser request that is not a verify

- **WHEN** a user asks about unread Slack messages in a WongStack repo
- **THEN** the vendored browser skill is not triggered by its description

<!-- end specs/context-economy/spec.md -->
<!-- file specs/memory-recall/spec.md utf8 1524 -->
## MODIFIED Requirements

### Requirement: A bounded digest loads at session start

The session-start hook SHALL add a digest of the memory store to the agent's context when a session starts or resumes, and SHALL NOT add it again after the context is cleared or compacted. Code SHALL build the digest with no model. The digest SHALL list the live `thread` facts of the change whose recorded branch is the current branch first, then other open threads, then the other live facts by type and recency. It SHALL NOT exceed 40 lines or 6 KB. When facts are left out, its last line SHALL state how many and how to search them. Each line SHALL show the fact's type, body, slug, age in days, author, and id. When the store has no live facts and no run to report, the hook SHALL add nothing.

#### Scenario: A repo with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest holds at most 40 lines and 6 KB, and its last line states how many facts it left out and names the search command

#### Scenario: Work continues on a change branch

- **WHEN** a session starts on the branch that change `add-po-search` records, and that slug has two open threads
- **THEN** the digest lists those two threads before any other fact

#### Scenario: The context is cleared

- **WHEN** the user runs `/clear` in a Claude Code session
- **THEN** the hook does not add the digest again

#### Scenario: An empty store

- **WHEN** the store has no live facts and no background run
- **THEN** the hook adds nothing to the context

<!-- end specs/memory-recall/spec.md -->
<!-- file specs/openspec-cli-workflow/spec.md utf8 372 -->
## REMOVED Requirements

### Requirement: Migration preserves local ownership

**Reason**: WongStack starts fresh with 19.0.0. No supported install carries the generated `openspec-*` layer from before 16.0.0, so the retire script and its hash list are deleted.
**Migration**: None. An install with the generated layer is not supported. Set it up again in an empty folder.

<!-- end specs/openspec-cli-workflow/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 1697 -->
## MODIFIED Requirements

### Requirement: The Cloudflare stack pack ships in the core payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — as part of the core payload. Every install SHALL receive the pack and the app scaffold. Setup SHALL NOT ask the user whether to take either, and the install record SHALL carry no flag that gates them.

#### Scenario: A new install receives the pack

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives the pack scripts, the seed template, the workflow, and the pipeline docs
- **AND** its install record has no `components.stackPack` or `components.appScaffold` flag

#### Scenario: Sync always selects the pack

- **WHEN** `/wong-sync` runs in an installed repo
- **THEN** its preflight selects the pack and scaffold files with the rest of the core payload

#### Scenario: A legacy repo that declined the pack is unaffected

- **WHEN** an install record carries `components.stackPack: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again

#### Scenario: A legacy repo keeps its own app

- **WHEN** an install record carries `components.appScaffold: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again

## REMOVED Requirements

### Requirement: The pack documents its adoption path for repos on the previous model

**Reason**: No supported install runs the previous staging model. WongStack starts fresh with 19.0.0.
**Migration**: None. Set up the repo again in an empty folder.

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 3616 -->
## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/verify` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, and `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/verify` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

Core payload scripts MAY run on Node.js, which the OpenSpec CLI already requires, only when they use Node's built-in modules and need no package manifest, dependency entry, or install step. The memory scripts, the review builder, and the improvement survey are such scripts. No core payload script or skill SHALL invoke a standalone `jq`, `python`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, Node.js as a required runtime (because OpenSpec, the session-start hooks, and the dependency-free scripts run on it), the browser CLI scoped to `/verify`, and `curl` as a provisioning dependency. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: A memory script uses only built-in modules

- **WHEN** a reviewer inspects the memory skill's scripts
- **THEN** they import only Node built-in modules
- **AND** the repository gains no package manifest or lockfile for them

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/verify` specifically
- **AND** the rest of the core payload is stated to need `git`, `gh`, `openspec`, and the Node.js runtime that `openspec` requires

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/verify` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/verify`
- **THEN** no browser tool or browser is installed on its behalf

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 1086 -->
## MODIFIED Requirements

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why and What Changes and SHALL render paragraphs, lists, bold, inline code, and links. Plan and save SHALL use one shared refresh implementation. Pages SHALL be assembled from their inputs. A missing input SHALL be reported as an error, and the last output SHALL be kept. A change without a page SHALL be reported and left untouched. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page displays the proposal's current Why and What Changes

#### Scenario: A current-format refresh fails

- **WHEN** the page's required visual input is missing
- **THEN** refresh preserves the last output and reports the failure

#### Scenario: No file or no markers

- **WHEN** save runs for a change without a page
- **THEN** the page is not created or rewritten, and the checkpoint reports the limitation and proceeds

<!-- end specs/ux-wireframes/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1857 -->
## MODIFIED Requirements

### Requirement: Sync preserves installation context

The payload inventory and install record SHALL remain available to the normal workflow. The install record SHALL advance only after implementation, preserve local skill names and the relocated docs path, and identify the source version and commit used. Both entry skills SHALL read only `.claude/.wong-stack.json`. A missing record SHALL route to setup. A seed record SHALL mean incomplete setup. Running in the WongStack source itself SHALL stop without target changes.

#### Scenario: Local installation choices
- **WHEN** the install record contains renamed skills or a relocated docs path
- **THEN** the exploration and implementation use those choices without creating duplicate skills

#### Scenario: Missing or incomplete installation
- **WHEN** the record is missing or has null version and commit
- **THEN** the skill routes to setup with the current context

#### Scenario: Source repo
- **WHEN** the target is the WongStack source repo
- **THEN** the skill reports that it cannot sync the source with itself

#### Scenario: Legacy installation record
- **WHEN** only `.claude/.wong-framework.json` exists
- **THEN** the skill treats the record as missing and routes to setup

## REMOVED Requirements

### Requirement: Sync plans the move of notes into the memory store

**Reason**: WongStack starts fresh with 19.0.0. No supported install has a `notes/` directory.
**Migration**: None. An install from before 17.0.0 is not supported. Set it up again in an empty folder.

### Requirement: Sync migrates repos installed before 18.0.0

**Reason**: WongStack starts fresh with 19.0.0. Every supported install already has the `.agents/` layout and the deploy token.
**Migration**: None. An install from before 18.0.0 is not supported. Set it up again in an empty folder.

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 5291 fence=~~~ -->
~~~html
<section class="visual tree" id="removed" data-kind="tree">
  <p class="caption">Legacy paths: the files and sections this change removes or edits.</p>
  <div class="frame">
    <div class="label">wong-sync and wong-setup</div>
    <ul>
      <li class="del">.agents/skills/wong-sync/references/adapt.md <span class="why">stub, file deleted</span></li>
      <li class="del">payload-manifest.md § Moving notes into the memory store <span class="why">notes/ from before 17.0.0</span></li>
      <li class="del">payload-manifest.md § Moving to 18.0.0 <span class="why">agent folder, wong-cloudflare, CI secret</span></li>
      <li class="edit">wong-sync/references/payload-files.json <span class="why">comment on the component flags removed</span> <i class="callout">1</i></li>
      <li class="edit">wong-sync/SKILL.md <span class="why">no .wong-framework.json fallback</span></li>
      <li class="edit">wong-setup/SKILL.md <span class="why">no .wong-framework.json fallback</span></li>
    </ul>
    <div class="label">Review page and change selection</div>
    <ul>
      <li class="edit">plan/scripts/build-review.mjs <span class="why">legacy review.html refresh removed</span></li>
      <li class="del">save/scripts/sync-review-proposal.mjs <span class="why">compatibility entry point</span> <i class="callout">2</i></li>
      <li class="edit">save/scripts/checkpoint-evidence.mjs <span class="why">no legacy same-name output</span> <i class="callout">3</i></li>
    </ul>
    <div class="label">Docs</div>
    <ul>
      <li class="edit">SECURITY.md <span class="why">§ Before 18.0.0 removed</span></li>
      <li class="edit">wiki/stack/d1-pipeline.md <span class="why">§ Adopting the staging environment removed</span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>The flags <code>stackPack</code>, <code>appScaffold</code>, and <code>ui</code> only gate old repos. A new install sets all three to true, so every category ships. <code>components.skills</code> and <code>components.docsPath</code> stay.</li>
      <li>The file is in <code>save/scripts/</code>, not <code>plan/scripts/</code>. It only calls <code>buildReview</code> for older save steps.</li>
      <li>Without the <code>legacy</code> output, a proposal with no <code>**Branch:**</code> line does not match a branch by its name. The helper reports <code>active</code>, <code>archive</code>, and <code>recorded</code> only.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="owners" data-kind="tree">
  <p class="caption">Duplicated rules: where each copy is today, and the one owner after.</p>
  <div class="frame">
    <div class="label">/ship steps and reasons · about 1,300 words cut</div>
    <ul>
      <li class="edit">.agents/skills/ship/SKILL.md <span class="why">keeps steps and commands; drops pull-in rules, history, repeated hard rules</span></li>
      <li class="edit">wiki/development/the-change-loop.md <span class="why">owner of the reasons; ship links it</span></li>
    </ul>
    <div class="label">/verify: three pages, one job each · about 1,100 words cut <i class="callout">1</i></div>
    <ul>
      <li class="edit">.agents/skills/verify/SKILL.md <span class="why">owner of the steps</span></li>
      <li class="edit">verify/references/walkthrough.md <span class="why">owner of the mechanics</span></li>
      <li class="edit">wiki/development/staging-walkthrough.md <span class="why">owner of the reasons; history moves out</span></li>
    </ul>
    <div class="label">Change-selection order · about 400 words cut <i class="callout">2</i></div>
    <ul>
      <li class="edit">save/references/checkpoint-evidence.md <span class="why">owner: one order, named rungs</span></li>
      <li class="edit">apply/SKILL.md <span class="why">copy removed; states its difference only</span></li>
      <li class="edit">continue/SKILL.md <span class="why">copy removed; states its difference only</span></li>
      <li class="edit">save/SKILL.md <span class="why">copy removed; states its difference only</span></li>
      <li class="edit">ship/SKILL.md <span class="why">copy removed; cites the correct rung</span></li>
      <li class="edit">verify/SKILL.md <span class="why">copy removed; states its difference only</span></li>
    </ul>
    <div class="label">Exit-round rules <i class="callout">3</i></div>
    <ul>
      <li class="edit">.agents/skills/explore/SKILL.md <span class="why">owner: § The exit round</span></li>
      <li class="edit">wiki/development/the-change-loop.md <span class="why">copy removed; links explore</span></li>
      <li class="edit">explore/references/asking-the-user.md <span class="why">copy removed; links explore</span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>Today the three verify pages repeat each other. After, the skill has the steps, the reference has the mechanics, and the wiki page has the reasons. Each links the other two.</li>
      <li>Today five skills each copy the order, and <code>/ship</code> cites the wrong rung. After, the rungs have names in one place, so a skill can cite a rung by name.</li>
      <li>The exit round stays with <code>/explore</code> because it runs the round. The change loop and asking-the-user link its section.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 52756 fence=~~~ -->
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
<title>Review — 2026-09-26-trim-legacy-and-restatement</title>
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
  <b>Review · 2026-09-26-trim-legacy-and-restatement</b>
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

WongStack now starts fresh, with no installs older than this release to support. Yet it still carries every migration path it has needed since 17.0.0. The same rules are also written in several places, and those copies have drifted. Every agent session pays for this text: about 5,300 words load before the user types, and one `/ship` run reads about 2,800 more. A stranger reads contradictions such as "run the checks" beside "nothing builds locally". Removing the legacy paths and keeping one owner per rule makes the toolkit smaller, cheaper, and consistent.

## What Changes

- **BREAKING: Legacy paths are removed.** Installs from before this release are not supported.
  - The `wong-sync` migrations for `notes/` (from before 17.0.0) and for the agent-folder layout and CI secret (from before 18.0.0).
  - The fallback to the `.wong-framework.json` install record.
  - The `components.stackPack`, `components.appScaffold`, and `components.ui` flags, which only gate old repos.
  - The legacy `review.html` refresh and its compatibility entry point.
  - Change matching by name when a proposal has no Branch line.
  - The pack's adoption runbook for the previous staging model.
  - The retire migration for the generated `openspec-*` layer from before 16.0.0.
  - The "Before 18.0.0" section in `SECURITY.md`, and the `adapt.md` stub. (review.html#/removed)
- **The session digest is smaller.** The always-loaded memory digest drops from 25 KB to about 6 KB. Open threads and the current change's facts come first, and `memory search` reaches the rest. The Claude hook runs only on `startup` and `resume`, like the Codex hook, not after `/clear` or compaction.
- **Each rule has one owner.**
  - `/ship` keeps its steps and commands and links [the change loop](../../../wiki/development/the-change-loop.md) for the reasons. It drops the restated pull-in rules, the history note, and the hard rules that repeat its body. This cuts about 1,300 words.
  - `/verify`'s skill, its walkthrough reference, and the staging-walkthrough wiki page each keep one job: steps, mechanics, and reasons. This cuts about 1,100 words.
  - The change-selection order is defined once, with named rungs, in the checkpoint-evidence reference. `apply`, `continue`, `save`, `ship`, and `verify` state only how they differ. This fixes the drift where `/ship` cites the wrong rung.
  - The exit-round rules stay in `/explore`, and other pages link them. (review.html#/owners)
- **Contradictions are resolved.**
  - `rules/code.md` no longer says to run checks locally or to run `/simplify`, which is Claude-only.
  - One default-branch rule, in `git-gate.md`.
  - `rules/payload.md` says which route wins for a wiki page that is also payload.
- **Stale text is corrected.** The change loop no longer describes session notes. The `openspec-*` and `/opsx:*` mentions are gone. `required-tools.md` lists Node and drops the setup readiness step that no longer exists.
- **Descriptions are triggers, not manuals.**
  - The vendored `agent-browser` skill no longer triggers on its own. `/verify` calls it.
  - The `verify`, `routine`, `continue`, and `memory` descriptions shrink to about 35 words each.
  - The `AGENTS.md` rules block becomes one line and a link per rule, and names `/routine`.
- **The wiki follows its own style.** Every page links up to its hub, and each hub links every child. `wiki/README.md` gets a topic title. The history sections move out of `staging-walkthrough.md` and `repo-layout.md`.
- **Scripts share one CLI convention:**
  - `--help` prints usage and exits 0.
  - A usage error exits 2.
  - Unknown flags are errors.
  - `isMain` has one copy.

**Non-goals:** No change to `CHANGELOG.md`, the archive, or the 18.x history. No behavior change beyond the removed legacy paths and the smaller digest. No new skill. Change 1 (`harden-edge-cases`) fixes behavior; this change moves and cuts text around those fixes.
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

<section class="visual tree" id="removed" data-kind="tree">
  <p class="caption">Legacy paths: the files and sections this change removes or edits.</p>
  <div class="frame">
    <div class="label">wong-sync and wong-setup</div>
    <ul>
      <li class="del">.agents/skills/wong-sync/references/adapt.md <span class="why">stub, file deleted</span></li>
      <li class="del">payload-manifest.md § Moving notes into the memory store <span class="why">notes/ from before 17.0.0</span></li>
      <li class="del">payload-manifest.md § Moving to 18.0.0 <span class="why">agent folder, wong-cloudflare, CI secret</span></li>
      <li class="edit">wong-sync/references/payload-files.json <span class="why">comment on the component flags removed</span> <i class="callout">1</i></li>
      <li class="edit">wong-sync/SKILL.md <span class="why">no .wong-framework.json fallback</span></li>
      <li class="edit">wong-setup/SKILL.md <span class="why">no .wong-framework.json fallback</span></li>
    </ul>
    <div class="label">Review page and change selection</div>
    <ul>
      <li class="edit">plan/scripts/build-review.mjs <span class="why">legacy review.html refresh removed</span></li>
      <li class="del">save/scripts/sync-review-proposal.mjs <span class="why">compatibility entry point</span> <i class="callout">2</i></li>
      <li class="edit">save/scripts/checkpoint-evidence.mjs <span class="why">no legacy same-name output</span> <i class="callout">3</i></li>
    </ul>
    <div class="label">Docs</div>
    <ul>
      <li class="edit">SECURITY.md <span class="why">§ Before 18.0.0 removed</span></li>
      <li class="edit">wiki/stack/d1-pipeline.md <span class="why">§ Adopting the staging environment removed</span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>The flags <code>stackPack</code>, <code>appScaffold</code>, and <code>ui</code> only gate old repos. A new install sets all three to true, so every category ships. <code>components.skills</code> and <code>components.docsPath</code> stay.</li>
      <li>The file is in <code>save/scripts/</code>, not <code>plan/scripts/</code>. It only calls <code>buildReview</code> for older save steps.</li>
      <li>Without the <code>legacy</code> output, a proposal with no <code>**Branch:**</code> line does not match a branch by its name. The helper reports <code>active</code>, <code>archive</code>, and <code>recorded</code> only.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="owners" data-kind="tree">
  <p class="caption">Duplicated rules: where each copy is today, and the one owner after.</p>
  <div class="frame">
    <div class="label">/ship steps and reasons · about 1,300 words cut</div>
    <ul>
      <li class="edit">.agents/skills/ship/SKILL.md <span class="why">keeps steps and commands; drops pull-in rules, history, repeated hard rules</span></li>
      <li class="edit">wiki/development/the-change-loop.md <span class="why">owner of the reasons; ship links it</span></li>
    </ul>
    <div class="label">/verify: three pages, one job each · about 1,100 words cut <i class="callout">1</i></div>
    <ul>
      <li class="edit">.agents/skills/verify/SKILL.md <span class="why">owner of the steps</span></li>
      <li class="edit">verify/references/walkthrough.md <span class="why">owner of the mechanics</span></li>
      <li class="edit">wiki/development/staging-walkthrough.md <span class="why">owner of the reasons; history moves out</span></li>
    </ul>
    <div class="label">Change-selection order · about 400 words cut <i class="callout">2</i></div>
    <ul>
      <li class="edit">save/references/checkpoint-evidence.md <span class="why">owner: one order, named rungs</span></li>
      <li class="edit">apply/SKILL.md <span class="why">copy removed; states its difference only</span></li>
      <li class="edit">continue/SKILL.md <span class="why">copy removed; states its difference only</span></li>
      <li class="edit">save/SKILL.md <span class="why">copy removed; states its difference only</span></li>
      <li class="edit">ship/SKILL.md <span class="why">copy removed; cites the correct rung</span></li>
      <li class="edit">verify/SKILL.md <span class="why">copy removed; states its difference only</span></li>
    </ul>
    <div class="label">Exit-round rules <i class="callout">3</i></div>
    <ul>
      <li class="edit">.agents/skills/explore/SKILL.md <span class="why">owner: § The exit round</span></li>
      <li class="edit">wiki/development/the-change-loop.md <span class="why">copy removed; links explore</span></li>
      <li class="edit">explore/references/asking-the-user.md <span class="why">copy removed; links explore</span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>Today the three verify pages repeat each other. After, the skill has the steps, the reference has the mechanics, and the wiki page has the reasons. Each links the other two.</li>
      <li>Today five skills each copy the order, and <code>/ship</code> cites the wrong rung. After, the rungs have names in one place, so a skill can cite a rung by name.</li>
      <li>The exit round stays with <code>/explore</code> because it runs the round. The change loop and asking-the-user link its section.</li>
    </ol>
  </div>
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
