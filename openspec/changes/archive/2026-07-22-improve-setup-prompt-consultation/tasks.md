## 1. Reword the README front door

- [x] 1.1 Replace the setup-prompt code block in `README.md` with the evaluate-first paste from design.md ## Decisions #1 (keeps the `wong-setup/SKILL.md` URL-read mechanism).
- [x] 1.2 Adjust the lead-in sentence (~line 35) so it frames the paste as the fit-assessing front door rather than "the whole setup"; keep the "(not sure WongStack is for you? it'll tell you)" note.

## 2. Tighten the fast-path trigger

- [x] 2.1 In `.claude/skills/wong-setup/SKILL.md` Step 3, reword the fast path per design.md ## Decisions #2 — consultation is the default; fast path fires only on an explicit skip signal ("just install it" / "skip the questions"); drop the "read the README and named what they want" clause; state that a bare "set up WongStack" is not a skip signal.
- [x] 2.2 Verify the "Hard rules" line about skipping still reads consistently with the tightened Step 3 (no reintroduced broad reading).

## 3. Release ritual

- [x] 3.1 Bump `VERSION` 6.0.0 → 6.0.1 (patch: wording fix, no behavior change).
- [x] 3.2 Prepend a newest-first `CHANGELOG.md` entry describing the front-door prompt fix.

## 4. Verify

- [x] 4.1 Re-read the reworded README paste + Step 3 as an agent would: confirm following the paste now leads to the consultation, and that an explicit "just install it" still fast-paths.
- [x] 4.2 `openspec validate improve-setup-prompt-consultation --strict`.
