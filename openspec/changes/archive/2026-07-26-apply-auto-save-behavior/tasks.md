## 1. Apply skill behavior

- [x] 1.1 Update `.agents/skills/apply/SKILL.md` so an all-tasks-complete state invokes `/save` exactly once, including an already-complete change
- [x] 1.2 Update `.agents/skills/openspec-apply-change/SKILL.md` completion and pause guidance to distinguish automatic completed-change saving from optional partial checkpoints

## 2. Change-loop documentation

- [x] 2.1 Update `wiki/development/the-change-loop.md` to describe the automatic completion handoff while preserving `/save` as the independent git owner
- [x] 2.2 Align live concise loop guidance in `CLAUDE.md`, `README.md`, `.agents/skills/plan/SKILL.md`, and `.agents/skills/wong-setup/SKILL.md` with the new behavior

## 3. Release

- [x] 3.1 Add a newest-first `CHANGELOG.md` entry describing the `/apply` completion handoff and its partial-work boundary
- [x] 3.2 Bump `VERSION` from `6.1.1` to `6.2.0`

## 4. Verification

- [x] 4.1 Validate the OpenSpec change and verify live prose has no remaining claim that completed `/apply` only suggests a separate `/save`
- [x] 4.2 Confirm every implementation and verification task is complete, reaching the terminal state that hands the change to `/save`
