<!-- openspec-archive v1 2026-08-10-update-openspec-deps -->
<!-- file proposal.md utf8 2952 -->
# Proposal: update-openspec-deps

**Status:** ready-to-ship
**Open questions:** none

## Why

The OpenSpec CLI moved from 1.5.0 to 1.8.0 upstream. The installed 1.5.0 layer was three minor
versions stale, and this repo carried local edits inside the generated `openspec-apply-change`
skill that every `openspec update` silently wiped — a maintenance trap with no owner.

## What Changes

- Upgrade the global OpenSpec CLI to 1.8.0 and regenerate the generated artifacts with
  `openspec update` on the **core profile**, which adds a sixth generated skill,
  `openspec-update-change` (revise a change's planning artifacts; never edits code).
- Accept 1.8.0's removal of the `.claude/commands/opsx/` pointer commands — deprecated commands
  are not kept deliberately.
- Adopt the rule that **generated `openspec-*` skills are pristine upstream output, never edited
  locally**. WongStack behavior lives in the fronting verbs: `.claude/skills/apply/SKILL.md`
  already owns the `/save` handoff (all-done checkpoint, gate-task exception,
  never-checkpoint-to-stop), so the duplicated copy inside `openspec-apply-change` is dropped
  rather than re-grafted.
- Update the surfaces that stated the old world: the payload manifest
  (`.claude/skills/wong-sync/references/payload-manifest.md` — pristine-skills rule, six skills,
  no opsx directory), `CLAUDE.md`, `wiki/development/the-change-loop.md`, and
  `.claude/skills/wong-setup/SKILL.md` (five → six).
- Release bookkeeping: `VERSION` 11.2.0 → 11.3.0, newest-first `CHANGELOG.md` entry,
  `node scripts/check-payload-links.mjs` passes.

## Non-goals

- No WongStack verb fronts `openspec-update-change` yet; it is available directly.
- No changes to the WongStack verb skills themselves (`/apply` already owned the handoff).

## Impact

- Targets pick up the same layer by running
  `npm install -g @fission-ai/openspec@latest && openspec update` themselves; the generated
  skills are per-repo, not payload.
- Future CLI updates here are safe: regenerate freely, nothing local to preserve.

## Decision log

- **2026-08-10** — Upgraded CLI 1.5.0 → 1.8.0; `openspec update` deleted the five `opsx/*.md`
  pointer commands and rewrote the generated skills, wiping the local `/save`-handoff edits in
  `openspec-apply-change`. First pass re-grafted those edits; the user overruled: generated
  skills stay pristine, customization belongs in the fronting verb (`/apply` already owns the
  handoff verbatim), and deprecated commands stay deleted. Also adopted the core profile's new
  `update` workflow (`openspec-update-change`) at the user's direction after it was initially
  skipped. Manifest, CLAUDE.md, change-loop wiki, wong-setup, VERSION 11.3.0, and CHANGELOG
  updated; link check green.
- **2026-08-10** — Shipped: checkpointed on PR #68 (CI green, commit f94a95a), archived to
  `openspec/changes/archive/2026-08-10-update-openspec-deps/` via `/ship`, no delta specs to
  sync.

<!-- end proposal.md -->
<!-- file tasks.md utf8 946 -->
# Tasks: update-openspec-deps

## OpenSpec layer

- [x] Upgrade the global CLI to `@fission-ai/openspec@1.8.0`
- [x] Switch the profile to core (`openspec config profile core`) — adds the `update` workflow
- [x] Regenerate with `openspec update`: six pristine `openspec-*` skills, `opsx/*.md` commands
      deleted, `.claude/skills/.openspec-target` marker added
- [x] Verify `openspec list` and `openspec doctor` are clean under 1.8.0

## Skills and docs

- [x] Drop the local re-graft in `openspec-apply-change` — `/apply` owns the `/save` handoff
- [x] Rewrite the manifest's `openspec-*` entry: pristine-skills rule, six skills, no opsx dir
- [x] Update the five→six skill count in `CLAUDE.md`, `wiki/development/the-change-loop.md`,
      and `.claude/skills/wong-setup/SKILL.md`

## Release

- [x] Bump `VERSION` to 11.3.0
- [x] Add the 11.3.0 `CHANGELOG.md` entry
- [x] `node scripts/check-payload-links.mjs` passes (no dead links)

<!-- end tasks.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-10

~~~
<!-- end .openspec.yaml -->
