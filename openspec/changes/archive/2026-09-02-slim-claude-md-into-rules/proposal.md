# Slim CLAUDE.md into comprehensive path-scoped rules

**Status:** ready-to-ship
**Open questions:** none

## Why

Roughly 40KB (~10k tokens) of instructions load into every session before any work happens: an 11.9KB CLAUDE.md, ~14KB of rule `@`-imports, and ~13.7KB of skill frontmatter descriptions. Much of it is duplication — CLAUDE.md restates what the always-loaded skill descriptions already say, and its dense per-verb prose only matters when specific files are touched. Claude Code's own guidance says to keep CLAUDE.md under 200 lines and move file-specific instruction into path-scoped rules. The WONG-STACK block ships verbatim to every target repo, so every byte cut here is cut from every installed repo's every session.

## What Changes

- **CLAUDE.md gets an aggressive cut, both halves.** The meta-repo half shrinks to identity plus orientation; the "Working on WongStack" bullets move into a new meta-only rule. The WONG-STACK block keeps only what an agent needs before any file is touched — the four surfaces, the loop in one line, the git-ownership boundary, the always-true rules — and drops everything the skill descriptions, rules, and wiki already own.
- **The rules layer becomes comprehensive.** New rules: `payload.md` (meta-only, not in the manifest — the release ritual, template-is-code, skill-authoring conventions, git-skill boundaries), `openspec.md` (payload core — where facts belong across the four surfaces, OpenSpec never runs git), and `secrets.md` (payload core — the env convention, linking the owning wiki page). Existing rules keep their `@`-imports: imports load at launch by design, and that hard-load is accepted for core conventions.
- **No output style.** Research settled it: Claude Code deprecated output styles in v2.0.30 and removed `/output-style` in v2.1.91. Response style stays where it lives — `voice.md` via the wiki rule, ASD-STE100 in the block.
- **Skill description bloat is trimmed.** WongStack-authored skills get trigger-focused descriptions (what it does + when to invoke it; the body owns the how). Generated `openspec-*` skills and the vendored `agent-browser` skill stay pristine.
- **Release ritual:** manifest gains the two new payload rules, `VERSION` → 12.3.0 (minor), newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

**Non-goals:** no output-style file or plugin; no change to the generated `openspec-*` skills or `agent-browser`; no restructuring of the wiki tree itself; no change to what the prose allowlist covers or how `/save` routes; no removal of the `@`-import mechanism.

## Capabilities

### New Capabilities

- `context-economy`: the always-loaded session context is a budget. The WONG-STACK block carries orientation only and never restates what a skill description, rule, or wiki page owns; WongStack-authored skill descriptions are invocation triggers, not manuals.

### Modified Capabilities

- `path-scoped-rules`: the rule set grows from three files to a comprehensive layer — two new payload rules (`openspec.md`, `secrets.md`) plus a meta-only `payload.md` kept out of the manifest; the thin-importer requirement extends to the new rules.

## Impact

- **Edited:** `CLAUDE.md` (both halves), `.agents/rules/wiki.md`/`notes.md` only if wording needs it, `SKILL.md` frontmatter of the WongStack-authored skills (`save`, `verify`, `wong-sync`, `dream`, `improve`, `wong-cloudflare`, `wong-setup`, `update-dependencies`, `continue`, `ship`, `apply`, `plan`, `explore`), `.claude/skills/wong-sync/references/payload-manifest.md` + `payload-files.json`, `VERSION`, `CHANGELOG.md`.
- **New files:** `.agents/rules/payload.md` (meta-only), `.agents/rules/openspec.md`, `.agents/rules/secrets.md` (payload core, reachable as `.claude/rules/*`).
- **Downstream repos:** the next `/wong-sync` proposes the slimmer block and the two new rules; anything with local authorship stays untouched, as always.
- **Risk:** cutting always-loaded prose can drop a boundary an agent needed at planning time. Mitigation: the git-ownership line and the read-the-owning-doc instruction stay in the block; everything cut has a surviving owner that loads on touch or on invoke.

## Decision log

- **2026-09-02** — Archived for shipping. Delta specs were already folded into `openspec/specs/` at the previous checkpoint (new `context-economy`, updated `path-scoped-rules`); the archive moved to `openspec/changes/archive/2026-09-02-slim-claude-md-into-rules/` with all 15 tasks complete, ahead of the delegated final checkpoint and squash-merge.
- **2026-09-02** — Checkpointed ready-to-ship. The worktree's harness-assigned branch was renamed to `slim-claude-md-into-rules` (unpushed, zero commits ahead) to restore the branch = change = note tie. The user also floated a hook that auto-loads a folder's README when editing files in it; assessed as redundant with the path-scoped-rules pattern this change ships (a rule per folder importing its owning doc is the selective version) — left as an open thread in the note, not adopted.
- **2026-09-02** — Implemented all 15 tasks. Measured result: `CLAUDE.md` 11,874 → 4,812 bytes (109 → 39 lines); the WONG-STACK block ~9.4KB → 3,314 bytes; total skill-description frontmatter 13,673 → 8,809 bytes (every WongStack-authored description now ≤600 characters). New rules: `openspec.md`, `secrets.md` (payload core, added to manifest), `payload.md` (meta-only, deliberately unlisted). One fact found orphaned during the cut-verification walk — the "no `/opsx:*` commands" guard — moved into `openspec.md`. `node scripts/check-payload-links.mjs` passes with zero dead links; `git diff` confirms no `openspec-*` or `agent-browser` frontmatter changed. VERSION 12.3.0, newest-first CHANGELOG entry added.
- **2026-09-02** — Explored the context economics: ~40KB always-on, with the rule `@`-imports observably hoisted at session start (confirmed by Claude Code docs: imports load at launch by design). The user chose to keep `@`-imports ("intended to be loaded anyways"), asked for an aggressive CLAUDE.md cut, a more comprehensive rules layer, skill-description trims, and a minor bump. Online research (Anthropic docs + community guides) fixed the direction: <200-line CLAUDE.md, one-topic-per-rule, path scoping for file-specific instruction, and no output style — that feature is deprecated and removed in current Claude Code.
