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
