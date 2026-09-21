---
slug: fix-improve-survey-symlink-entry
started: 2026-09-21
updated: 2026-09-21
---

# Improve survey follow-up context

The user selected the survey CLI repair from two ranked findings. The user deferred the other finding: all 21 missing-link leads in the survey came from historical `CHANGELOG.md` entries, although the report says historical records are excluded.

Planning exposed a related fault outside the selected scope. The documented `.claude/skills/plan/scripts/build-review.mjs` command also exited successfully without creating `review.html` in this source repository. Its direct-entry check compares an unresolved `.claude` path with the resolved `.agents` module path. The current change stayed limited to the selected survey helper; review generation used the canonical `.agents/...` path.
