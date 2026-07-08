## 1. Doctrine — core files

- [x] 1.1 `CLAUDE.md`: reframe the "GitHub Actions is the build gate. Don't build/test locally" rule → CI honored-if-present, else PR review; nothing builds locally; plan/record live in OpenSpec + the repo (any forge).
- [x] 1.2 `README.md` line ~5: change "It's GitHub-native for delivery: GitHub Actions is the build gate" → PR-based delivery on any forge, CI an optional accelerator honored when present.
- [x] 1.3 `README.md` line ~27: rewrite "CI is the only gate. Nothing builds locally." → gate is CI when present, else PR review; still nothing builds locally.
- [x] 1.4 `README.md` line ~16/17 (save/ship table rows): soften "wait for CI green" to "wait for CI green when present" (or equivalent) so the table matches the doctrine.
- [x] 1.5 `README.md` line ~66 (prerequisites): align wording so "CI optional" reads consistently with the new doctrine.

## 2. Doctrine — skills & docs

- [x] 2.1 `.claude/skills/save/SKILL.md`: intro ("GitHub Actions is the gate"), Step 4/Step 5 notes, and Hard rules ("GitHub Actions is the only gate") → CI-if-present-else-PR-review; keep the `NONE → proceed` mechanics intact.
- [x] 2.2 `.claude/skills/ship/SKILL.md`: intro ("GitHub Actions is the only gate"), Step 4, and Hard rules → same reframe; `/ship` merges on green when CI present, else after PR review.
- [x] 2.3 `.claude/skills/save/scripts/wait-for-checks.sh`: soften the header comment ("This is WongStack's build/test gate: we never build or test locally") to reflect CI-optional; no logic change.
- [x] 2.4 `docs/development/the-change-loop.md`: `/save` "wait for CI" wording → "wait for CI when present."
- [x] 2.5 `.claude/skills/install-wong-stack/SKILL.md` line ~75: "checkpoint behind GitHub-Actions-as-only-gate" → CI-optional framing (already notes "Thin/absent CI is fine").

## 3. Release bookkeeping

- [x] 3.1 Bump `VERSION` `3.0.0` → `3.1.0`.
- [x] 3.2 Add a newest-first `CHANGELOG.md` entry for the doctrine shift (CI optional; PR review is the no-CI gate).

## 4. Verify

- [x] 4.1 Grep the payload for stale absolutes — "the build gate", "only gate", "CI is the only", "GitHub-native for delivery" — and confirm none remain (or are reworded).
- [x] 4.2 Sanity-read `save`/`ship` runbook steps to confirm the `NONE` path still proceeds and no local-build step was introduced.
