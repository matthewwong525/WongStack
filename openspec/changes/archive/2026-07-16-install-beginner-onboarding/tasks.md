## 1. Bootstrap-from-zero + narration (SKILL.md)

- [x] 1.1 Add a short human-facing preamble at the start of a fresh install (Step 3F) — what it's about to set up, in plain language, before any change is made
- [x] 1.2 Promote "empty folder / never used git" to a first-class top rung of Step 1.5, with a plain-language explanation and confirm-before-`git init`; keep the existing gh/auth/remote rungs' behavior unchanged
- [x] 1.3 Reword Step 1.5 rungs to lead with a one-line "why" and ask one thing at a time, instead of surfacing raw tool-check output; keep all bash checks intact
- [x] 1.4 Soften the Step 3F fresh-install questions to plain-language framing while preserving the merge/collision logic and the batched decisions
- [x] 1.5 End Step 6 (report) by handing the user a concrete, copy-pasteable first command (e.g. a suggested `/plan ...`)

## 2. README front door

- [x] 2.1 Rewrite the Install section's paste block to be short and warm, keeping the URL-read mechanism and the "never drifts from the runbook" note
- [x] 2.2 Add a beginner pointer to Claude Code's web/desktop at claude.ai/code as the least terminal-intensive way to run the first paste

## 3. Release bookkeeping

- [x] 3.1 Bump `VERSION` to `4.2.0`
- [x] 3.2 Add a newest-first `CHANGELOG.md` entry for 4.2.0 describing the friendlier onboarding
- [x] 3.3 Verify SKILL.md still uses repo-relative paths and every original check/step is preserved (voice-only change)
