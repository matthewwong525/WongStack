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
