**Status:** Shipped 2026-07-21 — squash-merged in #22, archived.

## Why

WongOS (Matthew's personal second brain) proved two convention changes in daily use that WongStack should adopt so the source of truth doesn't drift behind its own installs:

1. **`/document` wrote pages; nothing consolidated them.** A wiki that only accretes pages rots — duplicates pile up, contradictions linger, links break. WongOS replaced `/document` with **`/dream`**: capture the session's durable facts, then garden the whole tree in the same pass (merge duplicates, resolve contradictions newest-wins, prune stale content, repair links, reality-check cited paths against the code).
2. **The wiki reads better as `wiki/` than `docs/`** — the tree holds process and conventions, not API docs. WongOS renamed the directory; the skills were rewritten to resolve the wiki root generically (`wiki/` if present, else `docs/`), so no installed repo breaks.

## What Changes

- **`/dream` replaces `/document`.** `.claude/skills/dream/` is added; `.claude/skills/document/` (including `references/progressive-disclosure.md`) is deleted — the rulebook's canonical home is now the payload's own `docs/wiki-style.md`. Dream is deliberate-only, never auto-run, and leaves edits in the working tree for `/save`.
- **Wiki root is resolved, not hardcoded.** `improve` (`/improve docs` + `references/docs-audit-playbook.md`) and `dream` resolve `wiki/`, falling back to `docs/` — backward-compatible with every existing install.
- **Convention pages updated** — the `CLAUDE.md` WONG-STACK block, `docs/wiki-style.md`, `docs/voice.md`, and `docs/development/secrets.md` now speak in `wiki/` terms and name `/dream` as the wiki's single write path. `/ship`'s cross-references point at `/dream`.
- **Meta-skills + README follow the rename** — the payload manifests in `install-wong-stack` and `contribute-wong-stack` list `dream` instead of `document`; `README.md` and the repo `CLAUDE.md` drop every reference to the deleted skill.
- **Release ritual:** `VERSION` → 4.5.0 (4.4.0 was taken by the auto-push retirement, #21), newest-first `CHANGELOG.md` entry.
- **Non-goals:** WongStack's own `docs/` → `wiki/` directory rename and the installer's seeding of `wiki/` in new targets — the natural follow-up change, kept separate to keep this one review-sized.

## Capabilities

### Modified Capabilities
- `contribute-wong-stack`: the manifest-scoped diff now lists `dream` (not `document`) among the workflow skills it compares.

<!-- dream/improve behavior is payload prose, not spec-tracked here; the manifest requirement is the one spec-tracked surface this change touches. -->

## Impact

- **New:** `.claude/skills/dream/SKILL.md`.
- **Deleted:** `.claude/skills/document/` (SKILL.md + `references/progressive-disclosure.md`).
- **Modified:** `.claude/skills/improve/{SKILL.md,references/docs-audit-playbook.md}`, `.claude/skills/ship/SKILL.md`, `.claude/skills/install-wong-stack/SKILL.md`, `.claude/skills/contribute-wong-stack/SKILL.md`, `CLAUDE.md` (WONG-STACK block + rulebook-canonical line), `README.md`, `docs/{wiki-style.md,voice.md,development/secrets.md}`, `VERSION`, `CHANGELOG.md`.
- **No runtime code, no dependencies, no CI** — the payload is prose; the gate is PR review.

## Decision log

- **2026-07-21** — Change authored and implemented in one pass: the payload edits were upstreamed from WongOS by `/contribute-wong-stack` (per-file approved: dream, improve, ship, WONG-STACK block, all three docs pages), then the meta-skill manifests, README, and CLAUDE.md were updated here so no reference to the deleted `document` skill survives. WongStack's own `docs/` → `wiki/` rename deliberately deferred to a follow-up change.
- **2026-07-21** — Merged `main` (#21, retire the auto-push Stop hook, which claimed v4.4.0): conflicts resolved by combining both changes — skill lists say `dream` *and* carry no auto-push references; the `contribute-wong-stack` manifest spec drops the hook and the `settings.json` exclusion note. This release re-versioned 4.4.0 → **4.5.0**.
