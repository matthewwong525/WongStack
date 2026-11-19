<!-- openspec-archive v1 2026-07-22-wong-setup -->
<!-- file proposal.md utf8 5431 -->
# wong-setup

**Status:** In progress — reworked mid-flight: install now delegates to /wong-sync's new fresh mode; runbook de-prescribed and agent-agnostic.

## Why

The install funnel has no step that listens. `/install-wong-stack` pitches for one paragraph, then installs — nothing asks what actually hurts in the user's workflow, maps those pains to the verbs that solve them, or is willing to conclude "WongStack isn't a good fit here." And the funnel carries duplicated machinery: the installer's copy-loop and `/wong-sync`'s payload manifest are two encodings of "what installs" that can drift. A consultative front door earns the install; a single copy engine delivers it.

**Non-goals:** No change to what installs (the manifest set is untouched). The consultation is not a toll gate — an already-convinced user goes straight to setup. No new WongStack-for-other-agents port — the toolkit stays Claude Code-native; only the *setup runbook* must be executable by any coding agent reading the paste-prompt URL.

## What Changes

- **New skill `wong-setup`** (source-only, never copied into targets). Consultation first: **research** the target repo up front → **discover** how the user works and where it hurts → **diagnose** by mapping pains to WongStack verbs via `references/fit-playbook.md` → honest **fit verdict**.
- **"Not a good fit" is a first-class exit** — when the disqualifiers hold, the skill says why, suggests alternatives, and stops without installing. **Discovery is skippable** — "just install it" fast-paths to setup. **Already installed** (manifest present) → skip the pitch, hand off to `/wong-sync`.
- **wong-setup does not copy the payload.** On a yes it makes `/wong-sync` runnable — git repo + first commit, `gh` + auth + remote, OpenSpec CLI + init, the authored content (CLAUDE.md "What this is", wiki hub README), the `wong-sync` skill bootstrapped in (its one file copy), and a **seed manifest** (`commit: null` + upstream block + agreed skill renames) — then hands off to `/wong-sync`, which performs the install as a sync.
- **`/wong-sync` gains a fresh-install mode:** a seed manifest (`commit: null`) means diff against the **empty tree** — every manifest file classifies as an upstream pull (batch-approvable = the install), collisions surface as conflicts with a keep-under-rename option, the contribute leg and changelog walk are skipped, the CLAUDE.md block is *inserted* when no markers exist, and the real manifest is written last as always. One copy engine, one list — no installer copy-loop to drift from the manifest.
- **The runbook is guidance-level and agent-agnostic.** Outcomes to reach ("a repo exists, `gh` is authed, a remote resolves"), not command sequences; the executing agent may be Claude, Codex, or anything that can run shell and edit files — Claude-only affordances (AskUserQuestion, subagents) are "if available" fallbacks. Setup asks which agent(s) drive the repo and passes that to `openspec init --tools`; for non-Claude agents it offers an AGENTS.md pointer to the skills. Three things stay precise: the seed-manifest schema, the shared clone cache path, and the handful of commands a newcomer needs handed to them verbatim.
- **BREAKING: `install-wong-stack` is deleted outright** — directory and all live references (the repo has no installed base; no tombstone, no migration machinery). README one-paste prompt, `wong-sync` references, payload-manifest exclusion, and docs all point at `wong-setup`. Historical CHANGELOG entries stay untouched — they're the release record.
- **Release:** VERSION major bump to **6.0.0** + CHANGELOG entry.

## Capabilities

### New Capabilities
<!-- None — the consultative layer extends install-onboarding; the fresh mode extends wong-sync. -->

### Modified Capabilities
- `install-onboarding`: the onboarding skill is now `wong-setup`; new requirements for up-front research, pain discovery via the fit playbook, the honest not-a-fit exit, the skippable consultation, the make-wong-sync-runnable scope (no payload copying), the agent-agnostic runbook, and the handoff. Existing requirements (bootstrap from zero, plain-language narration, real first step, warm one-paste front door) carry over renamed.
- `wong-sync`: **fresh-install mode** — seed-manifest handshake, empty-tree base classification, CLAUDE.md block insertion, collision-rename handling, contribute leg idle on fresh runs; plus renamed references (no-manifest pointer → `/wong-setup`, manifest exclusion, source detection, legacy traces).
- `secrets-convention`: rename — the seeding offer is made through the `wong-setup` flow.
- `delivery-gate`: rename — the doctrine-text file list names the `wong-setup` skill.

## Impact

- **Skills:** new `.claude/skills/wong-setup/` (SKILL.md + `references/fit-playbook.md`); `install-wong-stack/` deleted; `wong-sync/SKILL.md` gains the fresh mode + renamed references; `wong-sync/references/payload-manifest.md` exclusion entry.
- **Root payload:** `README.md` (install section + skill table + layout), `CLAUDE.md` (meta-repo notes), `VERSION` → 6.0.0, `CHANGELOG.md` entry.
- **Docs:** `docs/development/adding-a-skill.md` + `docs/development/README.md` mentions.
- **Specs:** delta specs for the four modified capabilities.
- **Installed repos:** unaffected — a manifest with a real `commit` syncs exactly as before; fresh mode triggers only on `commit: null`.

<!-- end proposal.md -->
<!-- file design.md utf8 7362 -->
# Design — wong-setup

## Context

`/install-wong-stack` is a guided installer with a one-paragraph pitch and no listening step. `/wong-sync` owns everything post-install, requires a `.claude/.wong-stack.json` manifest, and classifies every payload file three-way against a recorded base commit. The installer's copy-loop and wong-sync's payload manifest are two encodings of "what installs." The README's one-paste prompt points at the installer's raw SKILL.md URL — and the agent executing a paste-prompt may not be Claude (Codex or any shell-capable coding agent). The repo has no real installed base yet, which frees the retirement to be a clean delete. Two explore sessions settled the shape: one consultative skill that front-doors everything, and the install itself delegated to wong-sync.

## Goals / Non-Goals

**Goals:** a front door that researches, listens, diagnoses against the verbs, and gives an honest verdict including "no"; one entry point; one copy engine (wong-sync's manifest diff) for install and update alike; a runbook any coding agent can execute.

**Non-Goals:** porting WongStack itself to other agents (the skills stay Claude Code-native; non-Claude agents get a pointer, not a port); changing the manifest *set*; changing wong-sync's behavior for already-installed repos (real `commit` present → identical to today).

## Decisions

1. **Takeover, not front door.** `wong-setup` absorbs the installer role; `install-wong-stack` is retired. *Alternative:* a thin consult skill fronting the old installer — rejected (two skills for one journey).

2. **Install = sync with an empty base.** wong-sync's three-way classification degenerates correctly when the base is the empty tree: absent-locally → "upstream update" (pull = install, batch-approvable); exists-locally-and-differs (a collision) → "true conflict" (ask, now with keep-under-rename); "contribution candidate" is impossible since upstream always differs from ∅. So the fresh install reuses the classify/pull machinery nearly unchanged, and the installer copy-loop — a second, driftable encoding of the payload list — disappears. Fresh-mode deltas in wong-sync: skip the changelog walk (nothing installed before), skip the contribute leg, *insert* the CLAUDE.md block when no markers exist (today it only replaces between markers), offer rename on collisions and record it in `components.skills`.

3. **The seed manifest is the handshake.** wong-setup ends its setup phase by writing `.claude/.wong-stack.json` with `commit: null`, `version: null`, the `upstream` block, and any renames agreed during collision discussion; wong-sync reads `commit: null` as "fresh — empty-tree base." wong-sync's "no manifest → stop, point at `/wong-setup`" rule stays: the seed is how intent-to-install is distinguished from not-installed. The schema is one of the few things kept prescriptive-precise.

4. **Chicken-and-egg via the existing bootstrap.** A fresh repo doesn't have the wong-sync skill yet; wong-setup copies it in before handing off — the same single-bootstrap the manifest-present path has always done. That copy is wong-setup's *only* payload file operation.

5. **Authored vs copied.** What comes out of the consultation isn't payload: CLAUDE.md's "What this is" and a seeded wiki hub README are *authored* from research + conversation, so they stay in wong-setup, done before handoff. The `WONG-STACK` block itself is payload and arrives via wong-sync's pull (inserted per Decision 2). `openspec init` and the GitHub rungs are environment setup, also wong-setup's. The closing "here's your first command" stays wong-setup's — it wraps the whole conversation, after wong-sync reports.

6. **Guidance over prescription.** The runbook states outcomes ("a repo with at least one commit exists; `gh` is authed; `origin` resolves") and lets the executing agent pick commands, keeping the plain-language one-rung-at-a-time narration for newcomers. Exactly three things stay verbatim-precise: the seed-manifest JSON schema, the shared clone cache path (`${XDG_CACHE_HOME:-~/.cache}/wong-stack/WongStack`), and the few commands handed *to the user* to run themselves (e.g. `gh auth login --web`). *Trade-off accepted:* bash blocks were rails for weaker agents; the risky file operations now live in wong-sync, which keeps its precision — only the adaptive conversational half loses rails, where they hurt.

7. **Agent-agnostic runbook, Claude-native toolkit.** The runbook must be executable by any agent that can run shell and edit files: Claude-only affordances (AskUserQuestion, Explore subagents, the Skill tool) are phrased as "if available, else do it inline / ask in plain text." Setup asks which agent(s) drive the repo and passes them to `openspec init --tools`; when the answer isn't (only) Claude, it notes the skills live in `.claude/skills/` and offers an AGENTS.md pointer so other agents can discover the verbs. The handoff to wong-sync is likewise "read and follow `.claude/skills/wong-sync/SKILL.md`" — a file path, not a Claude Skill invocation.

8. **Sequencing inside wong-setup:** locate source → mode check (manifest with real commit → hand to `/wong-sync`, no pitch) → research → discover → diagnose → verdict. GitHub rungs run only after a yes (or the explicit fast path) — never during the consultation.

9. **Consultative advisor tone, not sales language.** Ask, diagnose, recommend, factually; the willingness to conclude "not a good fit" (playbook disqualifiers → terminal exit with an alternative named) is what makes "good fit" credible. Playbook content in `references/fit-playbook.md`, mirroring `/improve`'s references pattern.

10. **Clean delete, no tombstone.** `install-wong-stack/` is removed outright, along with every live reference (legacy-trace repoint entries included). The tombstone idea guarded stale paste-prompts in the wild — but the repo has no real installed base yet, so there's nothing to guard; carrying redirect machinery for zero users is pure weight. Historical CHANGELOG entries (≤5.0.0) keep the old name — they're the release record, not live references.

11. **Major bump to 6.0.0.** Public entry point changes, a skill is retired, and wong-sync's contract gains a mode — precedent: 5.0.0 retiring `contribute-wong-stack`.

## Risks / Trade-offs

- [wong-sync fresh mode mishandles an existing manifest] → fresh behavior triggers only on `commit: null`; any real commit takes today's path untouched.
- [A non-Claude agent misses skill frontmatter conventions] → the runbook depends on none of them; everything the executing agent needs is in the SKILL.md body + playbook.
- [Consultation annoys the decided] → fast path at every consult phase.
- [CLAUDE.md block insertion into an arbitrary existing file] → insertion appends the block with markers and touches nothing outside them; conflicts with the user's own rules are surfaced during the consultation's CLAUDE.md discussion, not silently merged.

## Migration Plan

Single change, one release (6.0.0). Installed repos: unaffected (real `commit` → today's path). Fresh installs: new funnel. Rollback: revert the branch. The old installer's raw URL 404s post-ship — accepted, since no installed base exists yet.

## Open Questions

None open — both explore sessions' decisions are folded in above.

<!-- end design.md -->
<!-- file tasks.md utf8 5441 -->
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

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 961 -->
# delivery-gate — delta

## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. Doctrine text across the payload — `CLAUDE.md`, `README.md`, `docs/development/the-change-loop.md`, and the `save`, `ship`, and `wong-setup` skills — MUST NOT assert CI as the sole or required gate. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 8040 -->
# install-onboarding — delta

## ADDED Requirements

### Requirement: Research before the conversation

`wong-setup` SHALL run its deep-research step (the target-repo survey: what the app is, how it ships, CLAUDE.md, docs, skills, OpenSpec, legacy traces, GitHub readiness) *before* any discovery conversation, and SHALL use the findings to make its questions specific to the repo rather than generic.

#### Scenario: Informed discovery

- **WHEN** the skill runs in a repo with no CI and a stale `docs/` folder
- **THEN** the discovery questions reference those findings (e.g. asking how they verify a change today) instead of asking from a blank script

### Requirement: Pain discovery and diagnosis via the fit playbook

`wong-setup` SHALL hold a short discovery conversation — how the user works with a coding agent today and where it hurts — and SHALL map the surfaced pains to the specific WongStack verbs that address them, using the pain→verb map in its `references/fit-playbook.md`. The playbook SHALL carry the discovery question bank, the pain→verb map, and the disqualifiers with alternatives; SKILL.md SHALL NOT inline that content. The skill's prose SHALL stay in a consultative register — asking, diagnosing, recommending — with no marketing language.

#### Scenario: Pain maps to a verb

- **WHEN** the user says work gets lost between agent sessions
- **THEN** the skill connects that pain to change folders plus `/continue`, per the playbook's map, in plain factual language

### Requirement: Honest fit verdict with a first-class not-a-fit exit

After discovery, `wong-setup` SHALL give an explicit fit verdict. When a playbook disqualifier holds (e.g. a non-GitHub forge, no willingness to use git, a locked-in workflow the loop would fight, no ongoing changes to manage), the skill SHALL say WongStack is not a good fit, explain why, suggest an alternative from the playbook, and stop without changing the repo.

#### Scenario: Not a good fit

- **WHEN** discovery reveals the team hosts on a non-GitHub forge and won't move
- **THEN** the skill states the mismatch plainly, offers what to consider instead, invites them back if circumstances change, and makes no changes to the repo

#### Scenario: Good fit

- **WHEN** discovery surfaces pains the verbs address and no disqualifier holds
- **THEN** the skill summarizes the pain→verb mapping as its recommendation and proceeds to setup

### Requirement: Consultation is skippable

`wong-setup` SHALL fast-path a user who is already decided ("just install it") straight to setup, skipping discovery and diagnosis. The consultation SHALL never be a toll gate.

#### Scenario: Already sold

- **WHEN** the user asks to skip the questions and install
- **THEN** the skill proceeds directly to setup without requiring the discovery conversation

### Requirement: Setup scope is making wong-sync runnable, then handing off

On a yes (or the fast path), `wong-setup` SHALL NOT copy the payload itself. It SHALL reach these outcomes — a git repo with at least one commit; `gh` installed, authed, and an `origin` remote that resolves (offered one plain-language rung at a time, only after the verdict, never during the consultation); the OpenSpec CLI present and `openspec init` run with the tools the user's agent(s) need; the authored content in place (CLAUDE.md "What this is" from the research + conversation, a wiki hub README when none exists); the `wong-sync` skill copied in (its only payload file operation); and a **seed manifest** written (`commit: null`, `version: null`, the `upstream` block, and any skill renames agreed during collision discussion). It SHALL then hand off to `/wong-sync` — by file path, "read and follow `.claude/skills/wong-sync/SKILL.md`" — whose fresh mode performs the install, and SHALL close with the real-first-step report after wong-sync finishes.

#### Scenario: Fresh repo, sold user

- **WHEN** the verdict is yes in a repo with no WongStack presence
- **THEN** wong-setup bootstraps the environment outcomes, authors the non-payload content, copies in `wong-sync`, writes the seed manifest, and hands off to `/wong-sync` — which pulls the whole payload as its fresh-mode sync

#### Scenario: No payload copy-loop

- **WHEN** wong-setup's setup phase completes
- **THEN** the only payload file it has copied is the `wong-sync` skill; every other payload file arrives via wong-sync's manifest-driven pull

### Requirement: Agent-agnostic runbook

The `wong-setup` runbook SHALL be executable by any coding agent that can run shell commands and edit files — not only Claude. Claude-specific affordances (AskUserQuestion, subagents, the Skill tool) SHALL be phrased as "if available" with plain fallbacks. The runbook SHALL state outcomes to reach rather than command sequences, keeping verbatim only the seed-manifest schema, the shared clone cache path, and the few commands handed to the user to run themselves. Setup SHALL ask which agent(s) drive the repo, pass them to `openspec init --tools`, and — when the answer is not (only) Claude — note where the skills live and offer an AGENTS.md pointer to them.

#### Scenario: Executed by a non-Claude agent

- **WHEN** a Codex-style agent reads the paste-prompt URL and follows the runbook
- **THEN** every step is achievable with shell + file edits and plain-text questions; nothing requires a Claude-only tool

#### Scenario: Non-Claude repo tooling

- **WHEN** the user says their repo is driven by an agent other than Claude
- **THEN** setup passes that tool to `openspec init --tools` and offers an AGENTS.md pointer to `.claude/skills/`

### Requirement: install-wong-stack is removed outright

The `install-wong-stack` skill SHALL be deleted — directory and all live references (README, payload manifest, wong-sync, docs, legacy-trace lists) — with no tombstone or migration machinery, since no installed base exists. Historical CHANGELOG entries SHALL keep the old name as the release record.

#### Scenario: No trace in the tree

- **WHEN** the payload ships at 6.0.0
- **THEN** `.claude/skills/install-wong-stack/` does not exist and the only remaining mentions of the name are historical CHANGELOG entries and archived changes

## MODIFIED Requirements

### Requirement: Bootstrap from zero

The `wong-setup` skill SHALL treat "no git repository yet" (an empty or non-repo folder) as a first-class, supported starting point, and SHALL NOT assume the user is already inside a git repo. When no repo exists, it SHALL offer, in plain language and only after confirmation, to create one and continue the setup — never failing or dead-ending the newcomer.

#### Scenario: Empty folder, never touched git

- **WHEN** the skill runs in a folder with no `.git` and the user has never used git
- **THEN** it explains in plain language that it will set up a repo for them, offers to create it (with an initial commit), and — only on confirmation — proceeds into the rest of the setup

#### Scenario: Already in a repo

- **WHEN** the skill runs inside an existing git repo
- **THEN** it skips the bootstrap-from-zero path and proceeds as before, without asking repo-creation questions

### Requirement: Warm one-paste front door

The README SHALL present a short, warm, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` (so the README never drifts from the runbook), SHALL note that the skill will honestly assess fit ("not sure it's for you? it'll tell you"), and SHALL point newcomers to Claude Code's web/desktop version at claude.ai/code as the least terminal-intensive way to run that first paste — while the prompt itself works in any coding agent.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short warm prompt to paste that reads+follows the `wong-setup` runbook URL, a note that it assesses fit honestly, and a pointer to claude.ai/code for running it without a heavy terminal setup

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 703 -->
# secrets-convention — delta

## MODIFIED Requirements

### Requirement: The installer offers the convention without forcing it

`wong-setup` SHALL offer to seed the convention into a target repo — the `secrets.md` page (with `docs/`) plus, on confirmation, an `.env.example` and the git-ignore entries for real secrets files. It SHALL confirm before touching `.gitignore` or adding the example, since the target may already handle secrets its own way.

#### Scenario: Installer seeds on opt-in

- **WHEN** `wong-setup` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example` and the `.gitignore` entries; if the user declines, it leaves them untouched

<!-- end specs/secrets-convention/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 5053 -->
# wong-sync — delta

## ADDED Requirements

### Requirement: Fresh-install mode via seed manifest

`/wong-sync` SHALL treat a manifest whose `commit` is null as a fresh install handed off by `wong-setup`, and SHALL classify every payload file three-way against the **empty tree** as base: files absent locally classify as upstream updates (the pull, batch-approvable, is the install); files present locally that differ classify as conflicts, resolved keep-local / take-upstream / **keep under another name** — a rename recorded in the manifest's `components.skills`. On a fresh run the contribute leg SHALL be idle (no contribution candidates exist against an empty base) and the changelog walk SHALL be skipped (there is no prior version); the sync SHALL report the version being installed instead. Pulled files land in the working tree for `/save`, and the real manifest — actual `version`, `commit`, components — is written last, exactly as on any sync. A manifest with a real `commit` SHALL behave exactly as before; fresh behavior triggers only on `commit: null`.

#### Scenario: Fresh repo pull

- **WHEN** `/wong-sync` runs on a seed manifest in a repo with no payload files
- **THEN** every manifest file is offered as one batch-approvable pull, the contribute leg does nothing, and the manifest is rewritten with the real version and commit afterward

#### Scenario: Collision during fresh install

- **WHEN** the target already has a skill named `save` that differs from WongStack's
- **THEN** the file surfaces as a conflict with keep / take-upstream / keep-under-another-name, and a rename is recorded in `components.skills`

#### Scenario: Installed repo unaffected

- **WHEN** the manifest carries a real `commit`
- **THEN** classification, changelog walk, and the contribute leg behave exactly as before this change

### Requirement: CLAUDE.md block insertion when no markers exist

On a fresh-mode sync, when the target's `CLAUDE.md` lacks `WONG-STACK:BEGIN/END` markers (or the file does not exist), `/wong-sync` SHALL insert the block (markers included) without modifying any content outside it — creating the file if needed. On every sync, content outside the markers SHALL remain untouched, as today.

#### Scenario: CLAUDE.md exists without markers

- **WHEN** a fresh-mode sync meets a `CLAUDE.md` with the user's own content and no markers
- **THEN** the block is appended with its markers and the user's content is byte-identical outside them

## MODIFIED Requirements

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages, and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup` (and the retired `install-wong-stack` tombstone), `VERSION`, and `CHANGELOG.md`. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

### Requirement: Installer defers updates to wong-sync

`wong-setup` SHALL handle fresh integrations only. When a manifest with a real `commit` already exists, it skips the consultation, installs/updates nothing except ensuring the `wong-sync` skill is present, then directs the user to run `/wong-sync`. Its legacy-traces step SHALL offer to remove an installed or symlinked `contribute-wong-stack` (superseded by `/wong-sync`). `wong-sync`'s source-repo detection SHALL identify a WongStack source by `VERSION` alongside `.claude/skills/wong-setup/`.

#### Scenario: Re-run on an installed repo

- **WHEN** `/wong-setup` runs in a repo whose `.claude/.wong-stack.json` has a real `commit`
- **THEN** it skips the pitch, ensures `wong-sync` is installed (bootstrapping older installs), makes no other changes, and says to run `/wong-sync` for updates

#### Scenario: Leftover contribute-wong-stack

- **WHEN** the skill or sync finds an installed/symlinked `contribute-wong-stack`
- **THEN** it offers to remove it, noting `/wong-sync` supersedes it

#### Scenario: No manifest during sync

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json` at all
- **THEN** it stops and points at `/wong-setup` for the fresh integration — a missing manifest means "not installed"; only a seed manifest (`commit: null`) means "install now"

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-22

~~~
<!-- end .openspec.yaml -->
