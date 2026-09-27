# Tasks

## 1. The report rule

- [x] 1.1 In `.agents/skills/explore/references/asking-the-user.md`, replace the *Lead a report with the outcome* bullet with the rule in design.md: the outcome and at most one link for a non-technical reader who ran the verb, technical lines on request, caller-read lines inside a chain, and the technical-reader case. Verify: the bullet reads alone and names the gate line and `merge.sh` lines as examples.

## 2. Skills

- [x] 2.1 In `.agents/skills/save/SKILL.md` §5, keep the list for a technical reader and inside a chain; for a non-technical reader who ran `/save`, link the rule. Keep `SAVE_GATE_RESULT` mandatory inside a chain. Verify: `/ship`, `/apply`, and `/verify` still get the line.
- [x] 2.2 In `.agents/skills/continue/SKILL.md` §4, give the non-technical *State* and drift wording from design.md. Verify: the drift check commands are unchanged.
- [x] 2.3 In `.agents/skills/ship/SKILL.md` Step 6, give the non-technical report from design.md, keeping *Checks loosened*. Verify: a technical reader still gets every line.

## 3. Loop picture and words

- [x] 3.1 Replace the loop line in `AGENTS.md`'s `WONG-STACK` block, `README.md`'s *The commands*, and `wiki/development/README.md` with `/explore → /plan → /apply → /save → /ship` and `/continue` as the way back in. Verify: `grep -rn "save → /continue\|save -> /continue"` finds nothing outside archives.
- [x] 3.2 Redraw the diagram in `wiki/development/the-change-loop.md` with `/continue` on a side arrow into `/apply`, and fix its surrounding sentences that call the git verbs a sequence. Verify: the *`/apply` vs `/continue`* section still matches.
- [x] 3.3 Add *Preview link*, *Review page*, *Mini app*, *Routine*, *Save*, and *Publish* to *Terms the agent may use* in `wiki/README.md`, with links where a page owns the term. *Save* says a wiki-only save is live right away.

## 4. Release

- [x] 4.1 Bump `VERSION` 25.10.1 → 25.11.0 and add a `CHANGELOG.md` entry with an **Updating** line.
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate plain-words-and-verbs --strict --no-interactive`. Verify: all pass.
- [ ] 4.3 CI passes on the pull request, checked by `/save`.
