## 1. The `notes/` surface

- [x] 1.1 Create `notes/README.md` — the convention: `notes/<slug>.md` keyed to the branch/change slug, the frontmatter shape (`consolidated:`), the compression bar (keep/drop lists from design.md §5), kept-forever retention, and the boundary table against `proposal.md`'s Decision log and `wiki/`
- [x] 1.2 Add a `.gitkeep` or ensure `notes/README.md` alone carries the directory, so a fresh clone has the surface

## 2. `/save` — capture

- [x] 2.1 Add a note-writing step to `.claude/skills/save/SKILL.md`, placed with Step 4 (before the commit) so the note ships in the same commit; specify write-or-update-in-place at `notes/<slug>.md`, never a file per save
- [x] 2.2 Write the compression bar into that step (keep: user statements, decisions + rationale, what was ruled out and why, specifics, open threads; drop: tool mechanics, file dumps, reasoning-out-loud, repo-derivable facts) and state explicitly that `/dream`'s durable-facts filter is NOT applied here
- [x] 2.3 Add the write-only-when-warranted gate: skip the note when the session produced nothing beyond the diff and the Decision log, and say so in Step 7's report
- [x] 2.4 Make the OpenSpec change conditional — a session with no code and no plan writes the note and skips change authoring entirely; replace Step 2's "if the session is empty, skip the change" escape hatch with the fuller routing
- [x] 2.5 Add `notes/<slug>.md` to Step 5's stage-by-path list, and add the note to Step 7's report
- [x] 2.6 Add the notes-only routing to Step 1's preflight: when every changed path matches `notes/*.md`, skip Steps 3–6 (no branch, no PR, no CI wait) and commit + push directly to the default branch; any other path restores the full flow
- [x] 2.7 Amend `/save`'s hard rule "Never push to the default branch" with the path-scoped notes-only exception, and keep "never merge" absolute
- [x] 2.8 Add the protected-branch fallback: if the direct push is rejected, report it plainly and fall back to branch + PR — never force, never retry
- [x] 2.9 Add the notes-only variant of Step 7's report — note path + landed on the default branch, omitting the PR, CI, and preview sections rather than reporting them missing

## 3. `/dream` — consolidate from the repo

- [x] 3.1 Rewrite Phase 1 in `.claude/skills/dream/SKILL.md` to read unconsolidated `notes/*.md` instead of replaying the conversation; keep the in-scope/out-of-scope durable-fact filter, now applied to note content
- [x] 3.2 Add the watermark step: record a `consolidated:` date in each consumed note's frontmatter after its facts land in `wiki/`
- [x] 3.3 State that Phase 2 gardening runs with or without unconsolidated notes, and that an empty inbox is a normal outcome
- [x] 3.4 Delete the "Sweep mode — designed, not yet implemented" section
- [x] 3.5 Update the hard rules — reads only the repo, never a transcript or scrollback; still no git; still deliberate-only, and clarify that `/save` writing `notes/` is not `/dream` auto-running

## 4. `/continue` — read the note

- [x] 4.1 Add the note to step 2's resolve (read `notes/<slug>.md` when it exists) in `.claude/skills/continue/SKILL.md`
- [x] 4.2 Fold note context into step 4's recap alongside the proposal, Status, and Decision-log tail; no-note is not an error

## 5. Distribution

- [x] 5.1 Add `notes/` (directory + `README.md`) to `.claude/skills/wong-sync/references/payload-manifest.md` under "In the manifest", with the copy-if-absent / adapt-if-present rule
- [x] 5.2 Update `CLAUDE.md`'s "Where context lives" section to name `notes/` as the session-capture surface and state the three-surface boundary
- [x] 5.3 Update the delivery-gate doctrine text wherever it's asserted — `CLAUDE.md`, `README.md`, `wiki/development/the-change-loop.md`, and the `ship` / `wong-setup` skills — so the notes-only exception is stated once and consistently, and no page still implies every path to `main` runs through a PR
- [x] 5.4 Check the `WONG-STACK` block in `CLAUDE.md` and the README for any statement that `/dream` reads the conversation; update to the new model

## 6. Release

- [x] 6.1 Bump `VERSION` (minor — new capability, no breaking change)
- [x] 6.2 Add a newest-first `CHANGELOG.md` entry explaining the split (capture at `/save`, consolidation at `/dream`), the new `notes/` surface, and sweep-mode removal
- [x] 6.3 Cross-check every skill edit for consistency: no remaining reference to conversation-replay in `/dream`, no remaining mandatory-change assumption in `/save`
