<!-- openspec-archive v1 2026-09-02-slim-claude-md-into-rules -->
<!-- file proposal.md utf8 6418 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 6827 -->
# Design — slim-claude-md-into-rules

## Context

See proposal.md — Why. Measured baseline (2026-09-02): `CLAUDE.md` 11.9KB (lines 17–109 are the WONG-STACK block); rule `@`-imports hoisted at launch add 14.1KB (`wiki-style.md` 7.5KB + `voice.md` 1.6KB + `notes/README.md` 4.9KB); skill frontmatter descriptions total ~13.7KB, with `save` at 1918 chars and `verify` at 1707. The hoisting is documented Claude Code behavior, not a bug: "imported files are expanded and loaded into context at launch," and "splitting into `@path` imports helps organization but doesn't reduce context."

Research grounding (read during planning):

- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — target <200 lines per CLAUDE.md; path-scoped rules trigger when Claude *reads* matching files; rules without `paths` load at launch; one topic per rule file; HTML comments in CLAUDE.md are stripped before injection; imports load at launch.
- [Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) — CLAUDE.md for what's true every session; rules for file-specific constraints; skills for procedures (name + description load, body on invoke); output styles replace the whole system prompt and are for role changes.
- Output styles are deprecated (v2.0.30) and `/output-style` was removed (v2.1.91); the replacement is plugins ([official plugin](https://github.com/anthropics/claude-code/tree/main/plugins/explanatory-output-style)). Community guides ([rules directory](https://claudefa.st/blog/guide/mechanics/rules-directory), [rule design](https://note.com/hayatetakeda/n/n2b0a91af5174?hl=en)) converge on: one concern per rule, scope everything that isn't needed every session, keep unconditional rules minimal.

## Goals / Non-Goals

**Goals:** cut the always-loaded context roughly in half without orphaning any fact; make the rule layer cover every surface an agent edits (code, wiki, notes, openspec, env, payload); keep the block useful as a standalone orientation for non-Claude agents.

**Non-Goals:** changing rule *semantics* (the `@`-import eager load is accepted — user decision); touching generated or vendored skills; restructuring wiki pages; adding hooks or plugins.

## Decisions

1. **Keep `@`-imports in `wiki.md` and `notes.md`; link, don't import, in the new rules.** The user chose to hard-load the core conventions (style, voice, notes) — they are near-universal and small enough. New rules cover occasional surfaces: `secrets.md` links `wiki/development/secrets.md` (4.4KB — not worth 100% sessions for <5% relevance), `openspec.md` owns its one routing fact inline, `payload.md` states the ritual inline (it has no single owning page; CLAUDE.md was the owner). Alternative rejected: importing everywhere — it would grow the launch load this change exists to cut.

2. **No output style.** The feature is deprecated and removed; its replacement (plugins injecting at SessionStart) is unconditional context — the opposite of this change's direction. Voice stays owned by `voice.md` (loaded via the wiki rule) and ASD-STE100 stays as a one-line block rule.

3. **`payload.md` is meta-only.** Its content ("editing the payload is a release") is meaningless in a target repo, and its `paths` would misfire there (`.claude/skills/**` exists in every target). Kept out of `payload-files.json`; the manifest prose notes the distinction. Paths: `.claude/**`, `app/**`, `scripts/**`, `.github/**`, `VERSION`, `CHANGELOG.md`, `wiki/wiki-style.md`, `wiki/voice.md`, `wiki/contributing.md`, `wiki/agent-knowledge-center.md`, `wiki/development/**`, `notes/README.md` — the payload surfaces, coarse on purpose; over-firing costs one small rule, under-firing costs a silent unreleased payload edit.

4. **Target shape of CLAUDE.md (~4–5KB total, well under 200 lines).**
   - *Meta half:* 2–3 sentences of identity (template, payload, meta-repo that dogfoods; don't run `/wong-setup`//`/wong-sync` here) + pointer to the README and `wiki/development/README.md`. Everything else moves to `payload.md`.
   - *Block:* the four-surfaces table (kept — it is the orientation), read-the-owning-doc instruction, the loop in one line with each verb linked to nothing (skill descriptions already load) and the change-loop page linked as owner, the git boundary sentence, one line each for: ASD-STE100, the gate (link), the prose allowlist (link), secrets (link), wiki discipline. Cut whole: the per-verb parenthetical prose (~2.5KB), the `/wong-sync` bullet (~1.6KB — its skill description loads every session), the long credentials paragraph body, the prose-allowlist detail.
   - Maintainer context that must stay near the text but needn't cost tokens goes into HTML comments (stripped at injection).

5. **Description budget: 600 characters.** Large enough for purpose + trigger phrases (the `apply` description, 477 chars, already works), small enough to force the how back into bodies. `save` keeps its list of *what invoking it causes* only as far as routing needs; behaviors like "waits for CI, auto-fixing failures" live in the body it already duplicates. Skills trimmed: save, verify, wong-sync, dream, improve, wong-cloudflare, wong-setup, update-dependencies, continue, ship, apply, plan, explore. Exempt: `openspec-*` (regenerated by `openspec update`; edits would be overwritten and break the pristine-generated-skills convention), `agent-browser` (vendored).

6. **Trigger-on-read is good enough.** Rules fire when a matching file is *read*, and every skill's flow reads before it writes; the payload rule therefore lands before the first payload edit in practice. No hook is added to force it.

## Risks / Trade-offs

- [A planning-time fact gets cut and no rule has fired yet] → the block keeps the boundary facts (git ownership, loop, surfaces); everything else cut is owned by an always-loaded skill description or a linked page the block tells the agent to read first.
- [Slimmer block reads as a downgrade to targets on next `/wong-sync`] → the sync adapts blocks rather than rewriting locally-authored ones; the CHANGELOG entry explains the cut so the sync's after-picture can, too.
- [Description trims weaken skill auto-selection] → keep every *trigger phrase* ("use when…", user-verb vocabulary); cut only mechanism prose. Verify by rereading each trimmed description against its old trigger list.
- [`payload.md` paths over-fire (e.g. generated `openspec-*` edits)] → acceptable; the rule is small and its advice ("this is a release") is correct for those files too.

## Migration Plan

Single branch, ordinary loop. Order: new rules → CLAUDE.md rewrite → description trims → manifest + VERSION + CHANGELOG → `node scripts/check-payload-links.mjs`. Rollback is `git revert`; no state migrates.

<!-- end design.md -->
<!-- file tasks.md utf8 2922 -->
# Tasks — slim-claude-md-into-rules

## 1. Rules layer

- [x] 1.1 Write `.agents/rules/openspec.md` (paths: `openspec/**`) — the cross-surface routing fact in rule form (Decision log vs note vs wiki), plus "OpenSpec never runs git"; restate nothing any surface's own doc owns.
- [x] 1.2 Write `.agents/rules/secrets.md` (paths: `.env*`, `**/.env.example`) — one-line reason to care + link to `wiki/development/secrets.md`; no `@`-import (design decision 1).
- [x] 1.3 Write `.agents/rules/payload.md` (meta-only; paths per design decision 3) — release ritual (VERSION bump, newest-first CHANGELOG entry, `node scripts/check-payload-links.mjs`), template-is-code, repo-relative paths in skills, git-fronting skills keep their OpenSpec step, pointer to `wiki/development/` for the rest.
- [x] 1.4 Reread `code.md`, `wiki.md`, `notes.md` against the new set — keep `@`-imports, adjust wording only where the new rules now own a fact.

## 2. CLAUDE.md rewrite

- [x] 2.1 Rewrite the meta half (above the WONG-STACK markers) to identity + pointers per design decision 4; move everything relocated into `payload.md` (task 1.3) rather than deleting it.
- [x] 2.2 Rewrite the WONG-STACK block to orientation-only per design decision 4: four-surfaces table, read-the-owning-doc, the loop in one line + change-loop link, git-ownership boundary, one-liners with links for STE-100, gate, prose allowlist, secrets, wiki discipline. Cut the per-verb prose, the `/wong-sync` bullet, and the long credentials paragraph.
- [x] 2.3 Verify every fact cut from CLAUDE.md has a surviving owner (rule, skill description, or linked wiki page) — walk the old file section by section against the new set.

## 3. Skill description trims

- [x] 3.1 Trim `save`, `verify`, `wong-sync` descriptions to ≤600 chars each, preserving trigger phrases; confirm each dropped behavior is stated in the skill body before cutting it.
- [x] 3.2 Trim `dream`, `improve`, `wong-cloudflare`, `wong-setup`, `update-dependencies` the same way.
- [x] 3.3 Trim `continue`, `ship`, `apply`, `plan`, `explore` the same way (several may already fit — verify, don't churn).
- [x] 3.4 Confirm no `openspec-*` or `agent-browser` frontmatter changed (`git diff --stat` on those paths is empty).

## 4. Manifest and release

- [x] 4.1 Add `.claude/rules/openspec.md` and `.claude/rules/secrets.md` to `payload-files.json` core; update `payload-manifest.md`'s rules paragraph, noting meta-only rules stay unlisted.
- [x] 4.2 Bump `VERSION` to 12.3.0 and add the newest-first `CHANGELOG.md` entry explaining the slim block and new rules (so `/wong-sync`'s after-picture can).
- [x] 4.3 Run `node scripts/check-payload-links.mjs` and fix anything it reports as dead — the CLAUDE.md rewrite moves several link sources.
- [x] 4.4 Measure the result: report old vs new byte counts for CLAUDE.md, the block, and total description chars in the change's Decision log.

<!-- end tasks.md -->
<!-- file specs/context-economy/spec.md utf8 3030 -->
# context-economy Delta

## Purpose

The instructions that load into every session — CLAUDE.md, the WONG-STACK block, and skill frontmatter descriptions — are a shared budget. This capability bounds what each always-loaded surface may carry, so context spends on the work instead of on restatements.

## ADDED Requirements

### Requirement: The WONG-STACK block carries orientation only

The WONG-STACK block in `CLAUDE.md` SHALL carry only what an agent needs before it touches any file: what the repo's knowledge surfaces are and where each kind of fact lives, the change loop named in one line, the git-ownership boundary (the WongStack skills own all git; OpenSpec never runs git), and the rules that apply to every session regardless of surface. The block SHALL NOT restate a fact that a skill frontmatter description, a path-scoped rule, or a wiki page owns — it SHALL link to the owner instead. Every fact removed from the block SHALL have a surviving owner that loads on file touch (a rule), on invocation (a skill), or by link (a wiki page).

#### Scenario: An agent plans without touching files

- **WHEN** an agent starts a session and reads only the always-loaded context
- **THEN** it knows the four knowledge surfaces, the loop verbs, and the git-ownership boundary
- **AND** it knows where to read more before acting on any of them

#### Scenario: A fact is owned elsewhere

- **WHEN** a fact in the block is also stated by a skill description that loads every session, or by a rule or wiki page
- **THEN** the block links to that owner rather than restating it

### Requirement: The meta-repo half of CLAUDE.md is orientation only

The part of `CLAUDE.md` outside the WONG-STACK block SHALL identify the repo and point into the wiki; the conventions for working on the payload (the release ritual, template-is-code, skill authoring) SHALL live in a meta-only path-scoped rule that loads when a payload file is touched.

#### Scenario: An agent edits a payload file

- **WHEN** an agent edits a file under `.claude/skills/` or another payload surface
- **THEN** the release-ritual conventions are in its context via the meta-only rule
- **AND** a session that touches no payload file never loads them

### Requirement: WongStack-authored skill descriptions are triggers, not manuals

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters; the how belongs in the skill body, which loads only on invocation. Generated skills (`openspec-*`) and vendored skills (`agent-browser`) are exempt and SHALL stay pristine.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored skill's description exceeds the budget
- **THEN** it is rewritten to its purpose and its invocation triggers
- **AND** every behavior detail it dropped remains stated in the skill body

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are trimmed
- **THEN** no `openspec-*` or `agent-browser` frontmatter changes

<!-- end specs/context-economy/spec.md -->
<!-- file specs/path-scoped-rules/spec.md utf8 5367 -->
# path-scoped-rules Delta

## MODIFIED Requirements

### Requirement: The payload ships path-scoped rules in the core category

The payload SHALL include a `.claude/rules/` directory (real path `.agents/rules/` in this repo, reached through the `.claude` symlink) as a core, copy-if-absent category on the payload manifest. Each rule file SHALL carry YAML frontmatter with a `paths:` list of glob patterns, so an agent loads it only when reading files those patterns match. Five rules SHALL ship:

- `code.md`, scoped to the code surfaces (`app/**`, `scripts/**`, `.github/workflows/**`)
- `wiki.md`, scoped to `wiki/**`
- `notes.md`, scoped to `notes/**`
- `openspec.md`, scoped to `openspec/**`
- `secrets.md`, scoped to the env surfaces (`.env*`, `**/.env.example`)

A target repo that already has any of these files SHALL keep its own copy untouched, per the sync's existing local-authorship rule.

#### Scenario: An agent edits code

- **WHEN** an agent reads or edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the `code.md` rule is in its context before the edit
- **AND** a session that touches no matching file never loads it

#### Scenario: An agent touches the wiki or notes

- **WHEN** an agent reads a file under `wiki/` or `notes/`
- **THEN** the matching rule imports the owning convention pages into context for that surface

#### Scenario: An agent works inside an OpenSpec change

- **WHEN** an agent reads or edits a file under `openspec/`
- **THEN** the `openspec.md` rule is in its context, stating where each kind of fact belongs across the four surfaces and that OpenSpec never runs git

#### Scenario: An agent touches an env file

- **WHEN** an agent reads or edits `.env.example` or another env surface
- **THEN** the `secrets.md` rule is in its context, pointing at the owning secrets convention

#### Scenario: A target repo receives the rules

- **WHEN** `/wong-sync` runs in a repo that lacks `.claude/rules/code.md`
- **THEN** the file is proposed as a missing payload file
- **AND** a locally authored rule of the same name is never overwritten

### Requirement: A rule is a thin importer, except for the fact it owns

A rule file SHALL NOT restate a convention another payload file owns — it SHALL name the owning doc, either importing it with Claude Code's `@path` syntax or linking it, keeping each rule short. `@`-imports load at launch (Claude Code expands imports eagerly); a rule SHALL therefore `@`-import only conventions worth holding in every session, and link the rest for the agent to read when the rule fires. Where a rule states a fact no other file owns, the rule file itself SHALL be that fact's single owner. Specifically:

- `code.md` SHALL own the write-less-code standard — the least code that does the job and none that doesn't; decompose branchy code into named helpers as it is written; prefer surgical edits over file rewrites; verify with the project's own checks after substantive edits; no `any`, and `unknown` only where it is narrowed before use — and SHALL state that the numeric limits are enforced by the repo's CI gates, not by the agent's memory.
- `wiki.md` SHALL import the wiki style and voice pages and restate nothing from them.
- `notes.md` SHALL import the notes convention and restate nothing from it.
- `openspec.md` SHALL own the cross-surface routing rule in rule form — a fact about why a change is shaped its way goes to the change's Decision log, session context to the note, reusable process to the wiki — and SHALL restate no surface's own convention.
- `secrets.md` SHALL link the secrets convention page and restate nothing from it beyond the one-line reason to read it.

#### Scenario: A rule names an owned convention

- **WHEN** a rule needs the reader to follow a convention another file owns
- **THEN** it imports or links the owning file rather than restating its scope or exceptions

#### Scenario: The code rule states the standard

- **WHEN** an agent loads `code.md`
- **THEN** the write-less-code standard is stated there in full, because no other file owns it
- **AND** every numeric limit is attributed to the CI gate that enforces it, not restated as a number the agent must track

## ADDED Requirements

### Requirement: Meta-only rules stay out of the manifest

The meta-repo MAY keep rules in `.claude/rules/` that guide work on WongStack itself and are not payload. `payload.md` SHALL be such a rule: scoped to the payload surfaces, it SHALL own the working-on-WongStack conventions that CLAUDE.md's meta half previously carried — editing the payload is a release (VERSION bump, newest-first CHANGELOG entry, `node scripts/check-payload-links.mjs` passes), a template or fragment is code and never a `docs(...)` commit, skills reference files by repo-relative path, and a git-fronting skill keeps its OpenSpec step intact. A meta-only rule SHALL NOT be listed in `payload-files.json`, so `/wong-sync` never proposes it to a target.

#### Scenario: A target repo never receives a meta-only rule

- **WHEN** `/wong-sync` reads the manifest in a target repo
- **THEN** `payload.md` is not among the files it may copy

#### Scenario: The release ritual surfaces at edit time

- **WHEN** an agent in this repo edits a payload file
- **THEN** `payload.md` is in its context, carrying the release ritual and the template-is-code rule

<!-- end specs/path-scoped-rules/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-02

~~~
<!-- end .openspec.yaml -->
