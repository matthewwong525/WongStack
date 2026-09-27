# Codex reads the WongStack rules in every install

**Status:** ready-to-ship
**Branch:** explore-repo-improvements
**Open questions:** none

## Why

When someone uses Codex instead of Claude in a repo set up by chat, Codex never sees the WongStack rules. Codex reads only a file named `AGENTS.md`, and chat setup writes the rules to a file only Claude reads. So Codex skips the way of working: plans, review pages, publishing only when asked. Repos set up by the server script already have both files. This change brings chat setup and updates in line.

## What Changes

- **New installs get one rules file both agents read.** Chat setup writes the rules to `AGENTS.md`, which Codex reads, and makes `CLAUDE.md` a link to it for Claude. One copy, so the two can never disagree. It is the same layout as this repo and the server install.
  ```text
  Before              After
  ─────────────────   ──────────────────
  CLAUDE.md (rules)   AGENTS.md (rules)
    Claude: yes         Codex: yes
    Codex:  no            ▲
                          │ link
                        CLAUDE.md
                          Claude: yes
  ```
- **Existing installs switch over on their next update.** When an installed repo has only `CLAUDE.md`, the update plan renames it to `AGENTS.md` and puts the link in its place. Every line the person wrote stays, and they see the step on the review page before anything changes. A repo that already has its own `AGENTS.md` gets a plan that merges the two into `AGENTS.md`, never an overwrite.
- **Updates keep working after the switch.** The update check reads the rules through the link, so it still spots rule changes and still leaves the person's own text alone.

Non-goals: no change to Claude's behavior; no edit to anyone's personal Codex settings; no change to this repo's own layout, which already works this way.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payload-layout`: *One real agent folder with a link per agent* adds the doctrine file: a real `AGENTS.md` holds the `WONG-STACK` block, and `CLAUDE.md` links to it, in the source and every install.
- `wong-sync`: *Only payload changes create update work* adds that a target's `CLAUDE.md` read through a link to `AGENTS.md` compares the same as a real file, and a new requirement plans the move of a real `CLAUDE.md` to `AGENTS.md` with a link, keeping all target prose.

## Impact

- `.agents/skills/wong-sync/references/payload-manifest.md`: *The agent folder* names the doctrine-file layout and the sync migration (move, link, or merge when both exist).
- `.agents/skills/wong-setup/SKILL.md`: the setup prompt and agent-folder step write `AGENTS.md` and `ln -s AGENTS.md CLAUDE.md`, with the Windows `MSYS=winsymlinks:nativestrict` prefix.
- `wiki/development/repo-layout.md`: drops "a target has a real `CLAUDE.md` … and no `AGENTS.md`"; shipped pages link `AGENTS.md` like every other page.
- Shipped links to `CLAUDE.md` (`wiki/development/home.md`, `wiki/agent-knowledge-center.md`, `.agents/rules/wiki.md`) point at `AGENTS.md`; `wiki/agent-knowledge-center.md` drops "repos that use other agents can add an `AGENTS.md` pointer".
- `scripts/check-payload-links.mjs` (+ `payload-links.test.mjs`): the target file set gains `AGENTS.md`, and the shipped-page exception for a link through `CLAUDE.md` goes.
- `scripts/tests/wong-sync-preflight.test.mjs`: a target whose `CLAUDE.md` links to `AGENTS.md` classifies the block correctly.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-09-27** — Asked which repo improvements to plan → chose the Codex rules fix here, memory security and reliability + housekeeping in their own workspaces.
- **2026-09-27** — Asked whether each extra part gets its own workspace → chose one workspace each.
- **2026-09-27** — Assumed: the fix is a real `AGENTS.md` with `CLAUDE.md` linked to it, not a `project_doc_fallback_filenames` setting, because Codex's docs place that setting only in the person's own `~/.codex/config.toml`, which an install can't ship.
- **2026-09-27** — Assumed: `AGENTS.md` is the real file and `CLAUDE.md` the link, not the reverse, because the source and `server/install-wongstack.mjs` already use that direction, so every install ends up the same.
- **2026-09-27** — Assumed: an existing install migrates through its next `/wong-sync` plan, not a separate script, because sync already plans every target change for review and keeps local prose.
- **2026-09-27** — Assumed: a target with both a real `CLAUDE.md` and a real `AGENTS.md` gets a planned merge into `AGENTS.md`, because two real files would hold two copies of the rules that drift.
- **2026-09-27** — Assumed: the inventory's block entry stays `CLAUDE.md`, because preflight reads the target through the link with `readFileSync`, and renaming the unit would make every existing install report a spurious removal.
- **2026-09-27** — Assumed: distillation found no repeatable fact left to place, because the store held none for this change or branch, and the one learned fact (Codex reads only `AGENTS.md`) now lives in the manifest's agent-folder section.
- **2026-09-27** — Archive checkpoint: built all tasks (setup writes `AGENTS.md` with a `CLAUDE.md` link, the sync manifest plans the move, shipped links point at `AGENTS.md`, preflight and link-check tests added), numbered 26.10.0, and saved for `/ship`.
