## 1. Handoff methodology — /save + /continue

- [x] 1.1 Rewrite `.claude/skills/save/SKILL.md`: add the `**Status:**` + `**Open questions:**` proposal header (vocabulary `in-progress | blocked (<on what>) | ready-to-ship | parked`), the append-only `## Decision log` (one dated bullet per save, never rewrite prior entries), and `/save <note>` → sets status + seeds the log entry
- [x] 1.2 In `save/SKILL.md`, make the PR body a regenerated **mirror** of the change every save (status + condensed plan + `tasks.md` checklist + `/continue <name>` resume hint); document that the body is generated, not curated
- [x] 1.3 Keep `/save`'s CI-when-present-else-PR-review gate intact (no local build); confirm no delivery-gate regression
- [x] 1.4 Rewrite `.claude/skills/continue/SKILL.md`: recap the last 1–3 decision-log entries (the "why") and add the counts-only **drift check** (commits ahead of main vs task checkboxes; unresolved review comments if a PR exists), flagging drift

## 2. Split /apply out of /continue (BREAKING — six-verb loop)

- [x] 2.1 Create `.claude/skills/apply/SKILL.md`: front-door that invokes `openspec-apply-change`, works the `tasks.md` checklist, checks off `- [x]`, runs no git, assumes the branch is checked out
- [x] 2.2 Rewire `continue/SKILL.md` to hand off to the `/apply` skill (Skill tool) after checkout + load, instead of `/opsx:apply` directly; keep the explicit-instruction override
- [x] 2.3 Update every loop-description surface to six verbs (`/explore ▶ /plan ▶ /apply ▶ /save ▶ /continue ▶ /ship`): the `WONG-STACK` block + rules in `CLAUDE.md`, `README.md`, and `docs/development/the-change-loop.md`
- [x] 2.4 Update `.claude/skills/install-wong-stack/SKILL.md` to install the new `/apply` skill and teach the six-verb loop; ensure its update/diff flow explains the `/apply` addition
- [x] 2.5 Grep the whole payload for stale five-verb loop mentions (arrow diagrams, `/continue` "runs /opsx:apply") and reconcile each (also fixed `explore`, `plan`, `docs/development/README.md`; CHANGELOG history left as-is)

## 3. Richer /ship quality gate (genericized)

- [x] 3.1 Rewrite `.claude/skills/ship/SKILL.md` to launch three parallel background subagents after the branch is final and collect them at a quality-gate step before merge; keep the CI-when-present gate and no-local-build rule
- [x] 3.2 Add `.claude/skills/ship/agents/doc-finder.md`, `test-runner.md`, `integration-reviewer.md` — ported from ClaymooApp, stripped of all Cloudflare/D1/Workers-Builds/wrangler/preview-URL specifics; test-runner discovers the test command from the repo, integration-reviewer discovers downstream callers from the repo
- [x] 3.3 Wire the merge gate: block on test-runner blockers and unresolved integration `breaking` findings; report `advisory` findings without blocking or auto-fixing

## 4. Generic secrets convention

- [x] 4.1 Add a root `.env.example` with documented placeholder variables (inline comment per var); add the real secrets file to `.gitignore`; assert no platform names (Cloudflare/wrangler/Workers Builds)
- [x] 4.2 Author `docs/development/secrets.md` per the progressive-disclosure rulebook: why real secrets stay out of git, `.example` as the source-of-truth variable list, how to bootstrap a local file; link it from the section README
- [x] 4.3 Have `install-wong-stack` seed the `.env.example` convention into target repos (offered, not forced)

## 5. Release bookkeeping + verification

- [x] 5.1 Add a `CHANGELOG.md` entry and bump `VERSION` `3.1.0 → 4.0.0` (major — verb-set change)
- [x] 5.2 Verify the loop reads consistently across `CLAUDE.md`, `README.md`, `install-wong-stack`, and docs (six verbs everywhere, handoff surface described once and linked)
- [x] 5.3 Dogfood: use the rewritten `/save` (status header, decision log, PR mirror) to checkpoint this very change and confirm the new behavior works end-to-end
