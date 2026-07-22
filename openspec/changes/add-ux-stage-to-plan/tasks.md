# Tasks — add-ux-stage-to-plan

## 1. Docs (the doctrine)

- [x] 1.1 Write stack-neutral `docs/ux-principles.md` — Part 1 use-case brief + flow; Part 2 Refactoring-UI principles distilled without design-system specifics; the `## UX` design.md section template; a "conditional — UI-less repos ignore it" note.
- [x] 1.2 Register it in `docs/README.md` (the "Building UI?" pointer alongside wiki-style/voice).

## 2. OpenSpec config (self-enforcing rule)

- [x] 2.1 Add a `design` rule to `openspec/config.yaml`: UI-bearing changes carry a `## UX` section per `docs/ux-principles.md`; skip UI-less.
- [x] 2.2 Add a `tasks` rule: UI tasks reference the design.md `## UX` subsection they implement.

## 3. /plan skill (orchestration)

- [x] 3.1 Add the "UX stage (UI-bearing changes only)" section to `.claude/skills/plan/SKILL.md`: design subagent → critic subagent → one revision round → append `## UX` → tasks reference it; UI-less changes skip.

## 4. Payload wiring (install + contribute)

- [x] 4.1 `install-wong-stack`: offer `ux-principles.md` only for repos with UI (fresh-install Step 3.3 + copy block comment + update "Style pages" line) — never forced into a UI-less repo.
- [x] 4.2 `contribute-wong-stack`: add `docs/ux-principles.md` to the docs manifest so it round-trips.

## 5. Release

- [x] 5.1 Bump `VERSION` 4.5.0 → 4.6.0.
- [x] 5.2 Add a newest-first `CHANGELOG.md` entry.
