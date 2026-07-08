## 1. New `/apply` skill

- [x] 1.1 Add `.claude/skills/apply/SKILL.md` — implement stage fronting `openspec-apply-change`, no git, six-stage loop diagram, boundaries (no git / already-on-branch / pause on ambiguity).

## 2. Skills — the git + resume verbs

- [x] 2.1 `.claude/skills/save/SKILL.md`: rewrite for the living handoff — `**Status:**` + `**Open questions:**` header, append-only `## Decision log`, PR-body-mirror template, `/save <note>`, author-as-fallback (4b), spec sync under 4c; keep the generic `preview-url.sh` + `wait-for-checks.sh` and CI-when-present-else-PR-review gate.
- [x] 2.2 `.claude/skills/continue/SKILL.md`: resume on-ramp — handle+instruction parse, Status in the pick menu, Decision-log journey recap, counts-only drift check, hand off to `/apply`.
- [x] 2.3 `.claude/skills/ship/SKILL.md`: six-stage loop framing, change-mirror PR body on create, out-of-band review note; no app-specific quality-gate subagents.

## 3. Skills — the think/draft verbs

- [x] 3.1 `.claude/skills/explore/SKILL.md`: six-stage loop diagram.
- [x] 3.2 `.claude/skills/plan/SKILL.md`: six-stage loop diagram + hand off to `/apply`; description pairs with `/apply`.

## 4. Docs

- [x] 4.1 `docs/development/the-change-loop.md`: rewrite for the six-stage loop, the living-handoff surfaces (Status / Decision log / PR mirror), and `/apply` vs `/continue`.
- [x] 4.2 `docs/development/README.md`: update the change-loop line to the six-stage loop.

## 5. Meta surfaces + release bookkeeping

- [x] 5.1 `README.md`: intro skill list, loop line + skill table (`/apply` row, reworked `/save` + `/continue` rows), quickstart, layout tree, install summary, manifest skill list.
- [x] 5.2 `CLAUDE.md`: git/OpenSpec mapping + "Use the WongStack skills" rule updated for `/apply` and the reshaped loop.
- [x] 5.3 `.claude/skills/install-wong-stack/SKILL.md`: add `apply` to the description, collision list, install list, manifest `skills` array, workflow-fit + closing summary.
- [x] 5.4 Bump `VERSION` `3.2.0` → `4.0.0`.
- [x] 5.5 Add a newest-first `CHANGELOG.md` 4.0.0 entry.
