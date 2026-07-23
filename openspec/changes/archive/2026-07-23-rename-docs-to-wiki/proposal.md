# Rename WongStack's own `docs/` → `wiki/`

**Status:** ready-to-ship
**Open questions:** none

## Why

The `dream-replaces-document` change (v4.4.0) taught every skill to resolve the wiki root as
`wiki/` falling back to `docs/`, rewrote the convention pages to speak in `wiki/` terms, and
explicitly listed WongStack's own directory rename as the deferred follow-up. That follow-up was
never written — so the meta-repo still keeps its wiki at `docs/` while `CLAUDE.md` and
`dream/SKILL.md` already link `wiki/README.md`, `wiki/wiki-style.md`, and
`../../../wiki/wiki-style.md`. **Those links are broken in this repo today**, and WongStack tells
every target repo to use a name it doesn't use itself.

## What Changes

- **Move the tree**: `git mv docs wiki` — `README.md`, `wiki-style.md`, `voice.md`,
  `ux-principles.md`, and `development/{README.md, adding-a-skill.md, secrets.md,
  the-change-loop.md}`. No page content is rewritten beyond path references.
- **Repair every live reference** to the moved paths: `CLAUDE.md` (the Rulebook-canonical line,
  the payload list), `README.md` (tree diagram + what an install gives a target),
  `plan/SKILL.md` (`ux-principles.md` refs incl. the `../../../docs/` relative link),
  `improve/SKILL.md` + `references/docs-audit-playbook.md`, `wong-setup/SKILL.md` +
  `references/fit-playbook.md`, `wong-sync/references/payload-manifest.md`,
  `openspec/config.yaml`, and the wiki's own internal links.
- **Keep the fallback intact.** Skills continue to resolve `wiki/`, falling back to `docs/`.
  Installed targets that kept `docs/` must not break — this change renames the *source* repo, not
  the resolution rule.
- **Refresh the one active change that names `docs/` paths** — `recommended-stack-guide`
  (proposal, design, tasks, spec) — so implementing it lands files in the right place.
  (`improve-openspec-plans` has no such references.)
- **Release ritual**: `VERSION` bump + newest-first `CHANGELOG.md` entry.

**Non-goals:** rewriting CHANGELOG history or archived OpenSpec changes (they are the record of
what shipped, at the paths that existed then); changing the wiki-root *resolution* rule; any
content edit to a wiki page beyond fixing paths; renaming `/improve docs` (the variant name is a
subject, not a path) or `docs-audit-playbook.md`.

## Capabilities

### New Capabilities

- `wiki-root`: where WongStack's progressive-disclosure wiki lives (`wiki/` in this repo), the
  generic `wiki/`-then-`docs/` resolution every skill uses in a target, and the rule that no
  payload file may hardcode `docs/` as the wiki root.

### Modified Capabilities

- `secrets-convention`: the requirement text naming "the `docs/` wiki" and seeding "the
  `secrets.md` page (with `docs/`)" becomes wiki-root-relative.
- `install-onboarding`: the informed-discovery scenario's hardcoded `docs/` folder becomes the
  resolved wiki root.
- `delivery-gate`: the doctrine-text list names `wiki/development/the-change-loop.md`.

## Impact

- **Files moved:** all 8 pages under `docs/` → `wiki/`.
- **Files edited:** `CLAUDE.md`, `README.md`, `VERSION`, `CHANGELOG.md`, `openspec/config.yaml`,
  four skills (`plan`, `improve`, `wong-setup`, `wong-sync`), one active change folder.
- **Downstream:** the payload manifest's convention-page entries are path-resolved, so
  `/wong-sync` keeps syncing them into targets at whichever root each target uses. No installed
  repo needs to act.
- **Risk:** stale links. Mitigated by a repo-wide grep for `docs/` as an acceptance check, with
  CHANGELOG and `openspec/changes/archive/` explicitly excluded.

## Decision log

- **2026-07-23** — Change authored, implemented, and verified in one pass. `git mv docs wiki` moved all 8 pages (history follows). References repaired across `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the `plan`/`improve`/`wong-setup`/`wong-sync` skills — WongStack's own page paths only; every generic "`wiki/`, falling back to `docs/`" resolution sentence, the `docs/adr/` globs, and the `/improve docs` variant name were left untouched (design decision 4). VERSION → 6.1.0 + CHANGELOG entry. The acceptance grep (decision 6) surfaced a spec the plan had missed — `delivery-gate` names `the-change-loop.md` in its doctrine-text requirement — so a `delivery-gate` delta was added (task 4.3). Branch renamed `docs-wiki-sync` → `rename-docs-to-wiki` to restore the branch=change tie. **Task 1.2 left unchecked deliberately:** it asked for the pure rename as its own commit before the edits, but `/apply` owns no git, so the rename + edits land in one `/save` commit; rename detection still holds (6 of 8 pages byte-identical). Pre-existing rot noted, out of scope: `wiki/development/adding-a-skill.md` links the deleted `document` skill — a `/dream` or `/improve docs` item.
