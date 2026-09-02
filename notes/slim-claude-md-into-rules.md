---
slug: slim-claude-md-into-rules
started: 2026-09-02
updated: 2026-09-02
consolidated:
---

# Slim CLAUDE.md into comprehensive path-scoped rules

## What the user stated

- Keep the `@`-imports in rules even though they load at launch: "it's intended to be loaded anyways so may as well hard load it." The eager load of `wiki-style.md` + `voice.md` + `notes/README.md` (~14KB) is an accepted cost, not a bug to fix.
- Wanted the dynamic rules layer "more comprehensive," an **aggressive** cut of CLAUDE.md, skill-description bloat cleaned up, and a minor version bump. Explicitly OK with big changes.
- Asked to "look online to see how other people do it" before planning — research was a stated requirement, not an option.
- Floated an output-style doc; dropped after research showed the feature is deprecated.

## Research findings (with dates, for future re-checks)

- Claude Code docs ([memory page](https://code.claude.com/docs/en/memory)): `@`-imports expand **at launch** by design — "splitting into imports helps organization but doesn't reduce context." Path-scoped rules trigger when Claude *reads* a matching file (not on every tool use). Target <200 lines per CLAUDE.md. HTML comments are stripped before injection (free maintainer notes). Rules without `paths:` load unconditionally, same priority as `.claude/CLAUDE.md`.
- Output styles: deprecated in Claude Code v2.0.30, `/output-style` removed in v2.1.91; replaced by SessionStart-hook plugins. Ruled out for WongStack — a plugin injects unconditional context, the opposite of this change.
- Community consensus (claudefa.st, note.com guides): one concern per rule file; scope everything not needed every session; known bug — `~/.claude/rules/` (user-level) path-scoped rules are silently ignored (GitHub #21858), so path scoping must be project-level.
- Observed live this session: the rule *bodies* stayed lazy (wiki rule injected only after reading `wiki/README.md`), while rule `@`-imports were hoisted into session-start context. Both halves matter when reasoning about what a rule costs.

## Decisions not in the Decision log

- New rules **link** instead of `@`-import (secrets → `wiki/development/secrets.md`) because they cover occasional surfaces; importing everywhere would regrow the launch load the change cuts. The user's keep-`@` ruling applies to the near-universal conventions, not as a blanket policy.
- 600-character description budget chosen because `apply` (477 chars) already triggers fine and Claude Code's own skill-description guidance favors triggers over manuals. `ship`/`apply`/`plan`/`explore` were already under budget and left untouched.
- `payload.md` rule is deliberately meta-only (unlisted in `payload-files.json`): "editing the payload is a release" is meaningless in a target, and its `paths:` would misfire there.
- During the cut-verification walk, exactly one fact turned out orphaned — "don't reach for `/opsx:*` commands" — and moved into the `openspec.md` rule. Everything else cut had a surviving owner.
- `CLAUDE.md` is a symlink to `AGENTS.md` in this repo (the Write tool refuses the symlink; edit `AGENTS.md`). `.claude` → `.agents` likewise.

## Measurements (2026-09-02 baseline → after)

- `CLAUDE.md`: 11,874 → 4,812 bytes (109 → 39 lines); WONG-STACK block ~9.4KB → 3,314 bytes.
- Skill-description frontmatter total: 13,673 → 8,809 bytes.
- Always-on rule imports unchanged (~14KB) by user decision.

## Open threads

- **README auto-load hook** — mid-implementation the user asked whether a hook that always loads a folder's README when editing files in that folder would be good. Assessment given: the path-scoped-rules pattern is the selective version of that idea (a rule per folder importing its owning doc — exactly what `notes.md` and `wiki.md` do); a blanket hook would inject hub READMEs (mostly link lists) on every edit and re-bloat context, is Claude-only, and needs settings trust in targets. If more folders deserve auto-context, add a rule per folder (or a nested CLAUDE.md, which Claude Code loads on demand natively). Not adopted; revisit if a concrete folder keeps getting edited without its conventions in context.
- The 20 conditional links reported by `check-payload-links.mjs` are pre-existing opt-in-category links, untouched by this change.
- `improve-openspec-plans` (from an earlier `/improve` run) is still an active change with no tasks — unrelated to this line of work.
