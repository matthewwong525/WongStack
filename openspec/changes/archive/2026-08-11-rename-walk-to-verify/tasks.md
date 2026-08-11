# Tasks: rename-walk-to-verify

## 1. The skill itself

- [x] 1.1 `git mv .agents/skills/walk .agents/skills/verify`, then `git mv` the scripts: `walk-staging.sh` → `verify-staging.sh`, `walk-runner.sh` → `verify-runner.sh`
- [x] 1.2 In the moved `SKILL.md`: frontmatter `name: verify`, heading `# /verify`, and every `/walk`, `skills/walk`, and script-name token renamed per design.md — Decisions (rename order: script names, then `skills/walk`, then `/walk`); activity nouns ("the walk", "walkthrough") stay
- [x] 1.3 Same token rename in `references/walkthrough.md` and inside both scripts (self-references, comments, usage strings); the file `walkthrough.md` keeps its name

## 2. The probe ladder (broadened verification)

- [x] 2.1 Rework the scout in `SKILL.md`: classify each scenario to the strongest probe — browser journey, request probe, state probe — per the `staging-walkthrough` delta ("Scenarios become journeys, scoped to the change"); unreachable scenarios are carried into the report by name as unverified, and `NONE` fires only when no scenario has any probe
- [x] 2.2 Preflight: skip the browser environment check (and any browser install) when no journey is a browser journey; keep it unchanged when at least one is
- [x] 2.3 Add request-probe execution to the runbook (`references/walkthrough.md`) and scripts: plain HTTP against the preview URL, Access service-token headers applied the same way as the browser heal, request/response captured per step into the run's temporary directory
- [x] 2.4 Add state-probe execution: triggering request (when one exists) then an existing machine-level or stack-pack command against deployed state; never add tooling to the repo — a scenario with no existing command stays unverified
- [x] 2.5 Probe-generic grading and PR comment: grade captured evidence (screenshots, responses, command output) against the verbatim `THEN` (a bare `200` is not a pass), state each journey's probe and where it ran, and list unverifiable scenarios by name in every comment

## 3. Cross-references in other skills

- [x] 3.1 Rename the verb and any `skills/walk` path in `.agents/skills/ship/SKILL.md` and `.agents/skills/save/references/git-gate.md`
- [x] 3.2 Same in `.agents/skills/wong-cloudflare/SKILL.md`, `.agents/skills/wong-cloudflare/references/permission-groups.md`, and `.agents/skills/wong-setup/SKILL.md`
- [x] 3.3 Update the payload manifest (`.agents/skills/wong-sync/references/payload-manifest.md`): core-skill list entry `walk` → `verify`, and the prose that names `/walk` or its rationale

## 4. Docs and repo root

- [x] 4.1 Update `AGENTS.md` (the `WONG-STACK` block; `CLAUDE.md` is its symlink) — verb rename plus the beside-the-loop description of what `/verify` now covers
- [x] 4.2 Update `wiki/development/the-change-loop.md`, `wiki/development/staging-walkthrough.md`, `wiki/development/required-tools.md` — verb and skill-path renames, plus the probe ladder where those pages describe what the walk covers (browser scoped to browser journeys in required-tools); page names unchanged
- [x] 4.3 Update `wiki/stack/README.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/stack/d1-pipeline.md`

## 5. Comment-only surfaces

- [x] 5.1 Rename `/walk` in comments of `app/worker/access.ts`, `app/worker/index.ts`, `.github/workflows/deploy.yml`, `.env.example` — comments only; confirm no identifier or variable name changes in the diff

## 6. Specs and release

- [x] 6.1 Edit the `/walk` mention in the overview prose of `openspec/specs/ci-tests/spec.md` and the Purpose paragraph of `openspec/specs/staging-walkthrough/spec.md` (overview prose carries no delta — see design.md); requirement-level changes in the six affected specs land via this change's delta specs at `/save`
- [x] 6.2 Add the `CHANGELOG.md` entry (breaking: `/walk` is now `/verify`, and the scout broadened to the probe ladder; what a syncing target gains/loses) and bump `VERSION` to `12.0.0`
- [x] 6.3 Run `node scripts/check-payload-links.mjs` — zero dead links
- [x] 6.4 Sweep: `grep -rn '/walk\b\|skills/walk\|walk-staging\|walk-runner'` over the tree returns hits only under `notes/`, `openspec/changes/archive/`, this change's delta `REMOVED Requirements` section, and pre-12.0.0 `CHANGELOG.md` entries
