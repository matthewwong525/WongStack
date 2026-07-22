# Tasks — wong-setup

## 1. The wong-setup skill

- [x] 1.1 Author `.claude/skills/wong-setup/SKILL.md` — frontmatter (name, description, user-invocable) + phase order per design Decision 2: locate source → mode check (manifest → skip pitch, bootstrap `wong-sync` if missing, hand off) → deep research → discover → diagnose → fit verdict → GitHub readiness rungs → install → manifest → report. Carry the installer's runbook sections (source resolution, research prompt, GitHub rungs, fresh-install steps 3–6, legacy traces, hard rules) over nearly verbatim; add the fast path for already-sold users; keep the consultative register (no marketing language).
- [x] 1.2 Author `.claude/skills/wong-setup/references/fit-playbook.md` — discovery question bank, pain→verb map (lost context → change folders + `/continue`; plans in chat → `/plan`; scary shipping → `/save` + `/ship`; docs rot → `/dream`; etc.), disqualifiers with what to recommend instead (non-GitHub forge, no git, locked-in workflow, no ongoing changes).
- [x] 1.3 Extend the legacy-traces list in SKILL.md: installed/symlinked `install-wong-stack` → offer to repoint to `wong-setup` or remove (alongside the existing `install-wong-framework` and `contribute-wong-stack` entries).

## 2. Retire install-wong-stack

- [x] 2.1 Replace `.claude/skills/install-wong-stack/SKILL.md` with the non-invocable tombstone stub redirecting to `../wong-setup/SKILL.md`; delete nothing else remains in the directory.

## 3. wong-sync references

- [x] 3.1 `.claude/skills/wong-sync/SKILL.md` — "no manifest → point at `/install-wong-stack`" becomes `/wong-setup`; source-repo detection checks `VERSION` alongside `.claude/skills/wong-setup/`; the "installs once" framing line names `wong-setup`.
- [x] 3.2 `.claude/skills/wong-sync/references/payload-manifest.md` — the source-only exclusion entry names `wong-setup` (and notes the tombstone is likewise excluded); the intro line "install-wong-stack copies this same set" names `wong-setup`.

## 4. Root payload prose

- [x] 4.1 `README.md` — install section paste-prompt URL → `wong-setup/SKILL.md`, add the honest-fit framing ("not sure it's for you? it'll tell you"), update the skill table row (`/install-wong-stack` → `/wong-setup` with the consult-then-install description), and the Layout tree.
- [x] 4.2 `CLAUDE.md` — meta-repo notes: `install-wong-stack` mentions → `wong-setup` (the "don't run here" line and the payload description).
- [x] 4.3 `docs/development/adding-a-skill.md` + `docs/development/README.md` — rename mentions.

## 5. Release

- [x] 5.1 `VERSION` → 6.0.0; `CHANGELOG.md` newest-first entry explaining the takeover, the honest-fit consultation, the tombstone, and what (nothing) changes for installed repos.

## 6. Rework — install delegates to wong-sync; runbook guidance-level + agent-agnostic

- [x] 6.1 Rewrite `.claude/skills/wong-setup/SKILL.md`: setup = outcomes to reach (repo + commit, gh authed + remote, OpenSpec init with the user's agent tools), authored content (CLAUDE.md "What this is", wiki hub, collision agreements, AGENTS.md pointer for non-Claude agents), the single wong-sync bootstrap copy, the seed manifest (`commit: null` — exact schema), then hand off by file path to `.claude/skills/wong-sync/SKILL.md`. Drop the copy-loop, the manifest heredoc, and command-sequence prescription; Claude-only tools become "if available"; keep precise only the seed schema, the clone cache path, and user-facing commands.
- [x] 6.2 `.claude/skills/wong-sync/SKILL.md` — fresh mode: `commit: null` → base = empty tree (Step 2 note + distinguish from the pre-skill two-way fallback), skip changelog walk (Step 1) and contribute leg (Step 4), CLAUDE.md block insertion when no markers/file (Step 3), collision keep-under-rename recorded in `components.skills`, manifest filled with real version/commit last (Step 6), fresh path in the report (Step 7).
- [x] 6.3 `.claude/skills/wong-sync/references/payload-manifest.md` — wong-setup exclusion note: it copies no payload file except `wong-sync` (bootstrap); the fresh-mode pull installs the rest.
- [x] 6.4 `README.md` + `CLAUDE.md` — reflect the delegation (wong-setup hands the install to /wong-sync's fresh mode; the paste-prompt works in any coding agent) in the skill table row, install prose, and meta-repo notes.
- [x] 6.5 `docs/development/adding-a-skill.md` — the wiring list loses the fresh-install-list bullet (the manifest is the only list now); repoint the manifest-array bullet at the seed manifest step.
- [x] 6.6 `CHANGELOG.md` — rewrite the 6.0.0 entry: consultation, delegation to wong-sync fresh mode (one copy engine), agent-agnostic runbook, tombstone, installed repos unaffected.

## 7. Clean delete — no tombstone, no migration machinery (repo has no real users yet)

- [x] 7.1 Delete `.claude/skills/install-wong-stack/` outright.
- [x] 7.2 Scrub live references: wong-setup SKILL.md (research legacy-trace item + Step 8 repoint entry), payload-manifest tombstone note, README layout-tree note.
- [x] 7.3 Revise artifacts: proposal + design (tombstone decision → clean delete), install-onboarding delta (tombstone requirement → removed outright), wong-sync delta (drop the install-wong-stack repoint sentence), CHANGELOG 6.0.0 bullet (removed outright, no stub). Historical CHANGELOG entries (≤5.0.0) stay untouched — they're the release record.
