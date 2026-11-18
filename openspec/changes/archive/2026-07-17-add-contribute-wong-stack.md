<!-- openspec-archive v1 2026-07-17-add-contribute-wong-stack -->
<!-- file proposal.md utf8 3203 -->
## Why

`install-wong-stack` only flows one way: WongStack → target repo. When someone improves a WongStack skill, doc convention, or hook *while working in a target repo* (e.g. ClaymooApp), there is no first-class way to push that improvement back up. The result is drift — WongStack, the source of truth, falls behind its own installs. We need the inverse path so improvements made downstream can be contributed back upstream without leaking app-specific code.

## What Changes

- Add a new source-only meta-skill, `contribute-wong-stack`, that runs **from a target repo** and pushes WongStack payload improvements **up into a WongStack clone** (upstream only — downstream stays `install-wong-stack`'s job).
- It reuses the **same payload set** `install-wong-stack` copies *into* a target (workflow skills, `docs/` convention pages, the auto-push hook, the `CLAUDE.md` `WONG-STACK` block), and diffs **only those files** between the target repo and a user-provided WongStack clone (`$WS`). Non-payload files (app/business skills like `royalty-statement`, `notion`, `server`; and `VERSION`/`CHANGELOG.md`, which the installer never copies into a target) are never read or copied, so nothing local can leak upstream. `VERSION`/`CHANGELOG.md` are touched only by the release ritual, in `$WS`.
- For each drifted manifest file it shows the diff and asks **keep-WongStack / take-from-repo / skip**, per file, then copies accepted changes into `$WS`.
- On close it performs the release ritual **in `$WS`**: bump `VERSION` (semver) and add a newest-first `CHANGELOG.md` entry describing what was upstreamed. It leaves `$WS` as a dirty working tree ready for `/save` — it does **not** run git itself (the WongStack skills own git).
- `contribute-wong-stack` is a **source-only meta-skill, excluded from the copied payload** exactly as `install-wong-stack` is ("the payload minus the meta-skills"), and made available in targets via the same optional symlink mechanism. `install-wong-stack` is updated to exclude it from the copy and to offer symlinking it alongside the installer.
- **Non-goals:** downstream sync (install already does it), git subtree/remote tooling, auto-merging without per-file confirmation, and touching anything outside the manifest.

## Capabilities

### New Capabilities
- `contribute-wong-stack`: an upstream-only, guided, question-driven skill that diffs the WongStack payload manifest between a target repo and a WongStack clone, applies approved per-file changes upstream, and performs the VERSION + CHANGELOG release ritual in the clone.

### Modified Capabilities
<!-- No existing openspec/specs/ capability changes; install-wong-stack's behavior change is captured as a task, not a spec delta (its behavior is not spec-tracked here). -->

## Impact

- **New:** `.claude/skills/contribute-wong-stack/SKILL.md`.
- **Modified:** `.claude/skills/install-wong-stack/SKILL.md` (exclude the new meta-skill from the copied payload; offer to symlink it). `CLAUDE.md` `WONG-STACK` block / skill list and `README.md` (mention the upstream path). `VERSION` bump + `CHANGELOG.md` entry.
- **No runtime code, no dependencies, no CI** — the payload is prose; the gate is PR review.

<!-- end proposal.md -->
<!-- file design.md utf8 4765 -->
## Context

`install-wong-stack` is a mature, guided, question-driven skill that copies the WongStack payload into a target repo and, on re-run, diffs + re-merges without clobbering. Its Step 3F/3U already enumerate the exact payload set and how each part is copied or merged: skills under `.claude/skills/*/` **except the installer** (SKILL.md line 81 "Never install the installer into a target repo"), the `CLAUDE.md` `WONG-STACK:BEGIN/END` block, `docs/` style pages (`wiki-style.md`, `voice.md`), the `.claude/hooks/auto-push.sh` script plus a merged `settings.json` Stop entry, and the OpenSpec layer (regenerated via `openspec init`, not copied). The manifest is tracked as `.claude/.wong-stack.json`.

`contribute-wong-stack` is the inverse of that copy — the same manifest, walked in reverse. It reuses the installer's structure and vocabulary so the two read as a matched pair.

## Goals / Non-Goals

**Goals:**
- Give a one-command way to push downstream WongStack payload improvements back up into a WongStack clone, per-file and confirmed.
- Guarantee app/business-specific files can never leak upstream (manifest-scoped by construction).
- End in the WongStack skills' idiom: dirty clone + release ritual, ready for `/save`.

**Non-Goals:**
- Downstream sync (install already owns it).
- Git subtree/remote/cherry-pick tooling.
- Auto-merging without per-file confirmation.
- Reconciling non-manifest files or app source.

## Decisions

- **Reuse the installer's manifest, don't redefine it.** The skill derives its file set from the same enumeration `install-wong-stack` uses (ideally by referencing that section), so the two can't drift apart. *Alternative considered:* a standalone manifest file (e.g. reading `.claude/.wong-stack.json`) — rejected because two sources of truth for "what is the payload" is exactly the drift we're fixing.

- **`$WS` resolution mirrors the installer's Step 0.** Resolve the WongStack clone the same way install does (symlink target / `$HOME/src/WongStack` clone / explicit path arg), and reuse its self-guard: if `$WS` == current repo, stop. *Alternative:* require an explicit path every time — rejected as unfriendly and inconsistent with install.

- **Per-file three-way choice: keep / take / skip.** Same ergonomics as the installer's update path (Step 3U "keep / take new / merge"), inverted. We deliberately omit a "merge" option in v1 to keep the upstream flow unambiguous; a user who wants a hand-merge can take-from-repo then edit in `$WS` before `/save`. *Alternative:* offer merge — deferred to keep v1 tight.

- **Meta-skills are source-only and symlinked.** `contribute-wong-stack` is excluded from the copied payload exactly like the installer, and `install-wong-stack` is updated to skip **both** meta-skills when copying and to offer symlinking the contributor alongside itself. *Alternative:* copy the contributor into every target's committed `.claude/skills/` — rejected: it's meta-tooling, not workflow payload, and committing it into targets bloats their tree and creates yet another copy to keep in sync.

- **CLAUDE.md is block-scoped.** Only the `WONG-STACK:BEGIN/END` region is compared/copied, never the app-specific "What this is". This matches how the installer merges the block downstream.

- **Release ritual only fires on a real change.** Zero approvals → no `VERSION`/`CHANGELOG` edit, so an inspection-only run leaves `$WS` pristine.

## Risks / Trade-offs

- **A user takes a change that was actually app-specific customization of a shared skill upstream.** → The per-file diff + confirmation is the guard; the skill frames each prompt as "does this belong in *every* WongStack repo?" so genuinely generic improvements go up and local tweaks are skipped.
- **`$WS` has its own uncommitted work when the skill runs.** → The skill checks `$WS` is clean before applying (or warns) so the release ritual and later `/save` operate on a well-defined tree.
- **VERSION conflict if two contributions race.** → Out of scope; `/save`/PR review in `$WS` resolves version collisions the normal way.
- **Manifest drift between installer and contributor if they diverge.** → Mitigated by deriving the set from the installer's enumeration rather than duplicating it; a task calls this out explicitly.

## Migration Plan

Additive: a new SKILL.md plus small edits to `install-wong-stack`, `CLAUDE.md`, and `README.md`. No target repo is affected until a user runs the new skill. Rollback = delete the skill dir and revert the installer edits.

## Open Questions

- Should the skill support pushing to a WongStack clone via a path arg on invocation (`/contribute-wong-stack ~/src/WongStack`) in addition to auto-resolution? (Leaning yes — cheap, matches install's flexibility.)

<!-- end design.md -->
<!-- file tasks.md utf8 2488 -->
## 1. Author the contribute-wong-stack skill

- [x] 1.1 Create `.claude/skills/contribute-wong-stack/SKILL.md` with frontmatter (`name`, `description`, `user-invocable: true`) describing the upstream-only contribute-back flow
- [x] 1.2 Write Step 0 — resolve `$WS` (the WongStack clone) mirroring `install-wong-stack` Step 0 (symlink target / `$HOME/src/WongStack` clone / optional path arg), and stop if `$WS` == current repo
- [x] 1.3 Write the manifest-scoped diff step — enumerate the payload set by reference to the installer's enumeration (skills except both meta-skills, `opsx/`+`openspec-*`, `.claude/hooks/auto-push.sh`, `docs/wiki-style.md`+`voice.md`+`development/secrets.md`, and the `CLAUDE.md` `WONG-STACK` block; VERSION/CHANGELOG/settings.json Stop entry explicitly excluded); compare target→`$WS`, surface only drifted files, compare `CLAUDE.md` block-scoped only
- [x] 1.4 Write the per-file confirmation loop — show each diff, ask keep-WongStack / take-from-repo / skip, apply approved changes into `$WS` only
- [x] 1.5 Write the release ritual — on ≥1 applied change, bump `$WS/VERSION` (semver) and add a newest-first `$WS/CHANGELOG.md` entry; skip entirely when zero changes approved
- [x] 1.6 Write the close — verify `$WS` was clean before applying (warn otherwise), leave `$WS` dirty, do NOT run git, and tell the user to run `/save` in `$WS`; add the guardrail line that only manifest files are ever read/copied

## 2. Update install-wong-stack to treat contribute as a source-only meta-skill

- [x] 2.1 In `install-wong-stack/SKILL.md`, exclude `contribute-wong-stack` from the copied payload alongside the installer (the copy loop skips **both** meta-skills; update-path and hard-rule wording too)
- [x] 2.2 Offer to symlink `contribute-wong-stack` into the target the same way the installer offers to symlink itself, and note it in the closing guidance

## 3. Wire it into the repo's own docs and conventions

- [x] 3.1 Add `/contribute-wong-stack` to the skill list / `WONG-STACK` block context in `CLAUDE.md` where the workflow skills are described
- [x] 3.2 Mention the upstream/contribute-back path in `README.md` (the user story: improve in a target repo, push back to WongStack)

## 4. Release ritual for this change (in WongStack itself)

- [x] 4.1 Bump `VERSION` (minor: new skill) per semver — 4.2.0 → 4.3.0
- [x] 4.2 Add a newest-first `CHANGELOG.md` entry describing the new `contribute-wong-stack` skill and the installer change

<!-- end tasks.md -->
<!-- file specs/contribute-wong-stack/spec.md utf8 5573 -->
## ADDED Requirements

### Requirement: Upstream-only direction

The `contribute-wong-stack` skill SHALL move WongStack payload changes in one direction only: from the current (target) repo up into a user-provided WongStack clone (`$WS`). It SHALL NOT modify the target repo, and it SHALL NOT perform downstream sync (WongStack → target) — that remains `install-wong-stack`'s responsibility.

#### Scenario: Runs from a target repo

- **WHEN** a user invokes the skill while working in a repo that has WongStack installed
- **THEN** the skill treats the current repo as the source of candidate changes and a resolved WongStack clone (`$WS`) as the destination

#### Scenario: Refuses to run against itself

- **WHEN** the resolved `$WS` is the same repository as the current working repo (i.e. the current repo *is* the WongStack source)
- **THEN** the skill stops and explains there is nothing to upstream (the source cannot contribute to itself)

#### Scenario: Target repo is never modified

- **WHEN** the skill applies approved changes
- **THEN** all writes land under `$WS` only, and the target repo's working tree is left unchanged

### Requirement: Manifest-scoped diff

The skill SHALL diff only the files that `install-wong-stack` copies *into* a target — the workflow skills (`explore`, `plan`, `apply`, `save`, `continue`, `ship`, `document`, `improve`), the `docs/` progressive-disclosure convention pages (`wiki-style.md`, `voice.md`, `development/secrets.md`), the `.claude/hooks/auto-push.sh` script, and the `WONG-STACK` block in `CLAUDE.md`. It SHALL NOT read or copy any file outside that set. It SHALL NOT diff `VERSION` or `CHANGELOG.md` (the installer never copies those into a target, so the repo's copies aren't WongStack's — they are handled by the release ritual in `$WS` only), the generated `openspec-*` skills / `opsx/` layer (regenerated by `openspec init`), or the per-repo `settings.json` Stop entry (boilerplate, not payload).

#### Scenario: App-specific files cannot leak upstream

- **WHEN** the target repo contains non-manifest skills or files (e.g. `royalty-statement`, `notion`, `server`, business docs, app source)
- **THEN** those files are neither read nor proposed for upstreaming, and cannot appear in `$WS`

#### Scenario: Only drifted manifest files are surfaced

- **WHEN** the skill compares the target's manifest files against `$WS`
- **THEN** it presents only the files that differ, skipping files that are byte-identical

#### Scenario: CLAUDE.md is compared block-scoped

- **WHEN** the skill diffs `CLAUDE.md`
- **THEN** it compares only the content between the `WONG-STACK:BEGIN/END` markers, ignoring the app-specific "What this is" and other out-of-block content

### Requirement: Per-file confirmation before applying

For each drifted manifest file, the skill SHALL show the diff and ask the user to choose keep-WongStack (leave `$WS` as-is), take-from-repo (copy the target's version into `$WS`), or skip. It SHALL apply only the changes the user approves.

#### Scenario: Take-from-repo copies the target version upstream

- **WHEN** the user chooses "take-from-repo" for a drifted file
- **THEN** the skill overwrites that file in `$WS` with the target repo's version

#### Scenario: Keep or skip leaves the clone untouched for that file

- **WHEN** the user chooses "keep-WongStack" or "skip" for a drifted file
- **THEN** the skill makes no change to that file in `$WS`

#### Scenario: No approvals means no release ritual

- **WHEN** the user approves zero changes across all drifted files
- **THEN** the skill makes no edits to `$WS` and does not bump `VERSION` or add a `CHANGELOG` entry

### Requirement: Release ritual in the clone

When at least one change is applied to `$WS`, the skill SHALL bump `$WS/VERSION` following semver and add a newest-first `$WS/CHANGELOG.md` entry describing what was upstreamed — because editing the payload is a release.

#### Scenario: Version and changelog updated together

- **WHEN** one or more manifest files are copied into `$WS`
- **THEN** `$WS/VERSION` is bumped (semver) and a new top entry is added to `$WS/CHANGELOG.md` summarizing the upstreamed changes

### Requirement: Does not run git

The skill SHALL NOT run git commit, push, or branch operations itself. It SHALL leave `$WS` as a dirty working tree ready for the WongStack skills to handle (e.g. `/save`), mirroring how `install-wong-stack` ends.

#### Scenario: Clone left dirty for /save

- **WHEN** the skill finishes applying changes and the release ritual
- **THEN** `$WS` contains uncommitted changes and the skill instructs the user to run `/save` in `$WS`, without invoking git itself

### Requirement: Excluded from the copied payload

The `contribute-wong-stack` skill SHALL be a source-only meta-skill, excluded from the payload that `install-wong-stack` copies into targets — exactly as the installer excludes itself. It SHALL be made available in a target repo via the same optional symlink mechanism used for the installer, not by copying it into the target's committed `.claude/skills/`.

#### Scenario: Install skips both meta-skills

- **WHEN** `install-wong-stack` copies `.claude/skills/*/` into a target
- **THEN** it skips both `install-wong-stack` and `contribute-wong-stack`, copying only the workflow payload skills

#### Scenario: Made available by symlink

- **WHEN** a user wants `contribute-wong-stack` available in a target repo
- **THEN** it is offered as a symlink to the WongStack clone, the same way the installer is, rather than committed into the target

<!-- end specs/contribute-wong-stack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-17

~~~
<!-- end .openspec.yaml -->
