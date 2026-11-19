<!-- openspec-archive v1 2026-07-16-install-beginner-onboarding -->
<!-- file proposal.md utf8 3027 -->
## Why

Someone who has never used Claude Code — or barely uses a terminal — should be able to paste one warm prompt and be genuinely *started*, the way a good onboarding prompt makes automation feel effortless. Today the installer is thorough but assumes the user is already inside a git repo, knows what a "skill" is, and can stomach a wall of `gh`/`jq`/`openspec` checks. The magic — "paste it and go" — breaks for the exact newcomer we most want to welcome.

## What Changes

- **Bootstrap from zero.** Make "empty folder / no git repo at all" a first-class, gentle entry path in `install-wong-stack`, not just a "no `.git` → `git init`" rung. The installer never assumes it's already in a repo; it offers to create one and walks the user in.
- **Plain-language, one-thing-at-a-time voice.** Reframe the newcomer-facing narration (esp. Step 1.5's GitHub setup and the fresh-install questions) as a "sharp new hire" asking what it needs — explaining *why* each piece exists, one question at a time — instead of presenting eight `gh`/`jq` facts at once. Same checks, warmer framing. Add a short human-facing preamble ("here's what I'm about to set up — ready?") so the human feels guided, while the procedural steps stay precise for Claude.
- **Warmer paste + a real first step.** Keep the URL-read install mechanism (so the README never drifts from the runbook), but rewrite the paste-able prompt in the README to be short and warm, and end the installer by handing the user their literal first command so "and then they can get started" is real.
- **README front-door pointer (out of skill scope).** Add a brief, friendly note in the README that Claude Code has a web/desktop version at claude.ai/code — the least terminal-scary way in — for the pre-paste step the skill can't own.
- Bump `VERSION` to `4.2.0` and add a newest-first `CHANGELOG.md` entry (a real UX feature → minor).

## Non-goals

- Teaching a user to *install or open* Claude Code itself — that happens before any skill can run and belongs to the README pointer, not the skill.
- Changing what the installer actually installs (skills, OpenSpec, hook), the update path's merge logic, or any delivery/CI behavior. This is a UX/voice change to onboarding, not a functional change to the payload.

## Capabilities

### New Capabilities
- `install-onboarding`: how the `install-wong-stack` skill welcomes a newcomer — bootstrapping from zero (no repo/git/GitHub), plain-language one-question-at-a-time narration, and ending with a concrete first command.

### Modified Capabilities
<!-- None: delivery-gate is unaffected; this change adds onboarding UX. -->

## Impact

- `.claude/skills/install-wong-stack/SKILL.md` — the primary edit (Step 1.5, Step 3F questions, new preamble + bootstrap-from-zero path, closing first-command handoff).
- `README.md` — warmer paste prompt + web/desktop pointer.
- `VERSION` (→ `4.2.0`) and `CHANGELOG.md` (new entry).
- No change to other skills, OpenSpec scaffolding, or the auto-push hook.

<!-- end proposal.md -->
<!-- file design.md utf8 3367 -->
## Context

`install-wong-stack/SKILL.md` is a precise runbook Claude executes. It already has a "newcomer-friendly" Step 1.5 (GitHub readiness) and a batched fresh-install question set (Step 3F). The gap is human *experience*: it assumes you're already in a repo, and it reads as a wall of `gh`/`jq`/`openspec` tool checks rather than a guided conversation. The reference that prompted this (Ben Syne's "Agent Loop Starter Kit") wins on one thing — paste one warm prompt, answer conversationally, you're going.

Two hard constraints from CLAUDE.md: skills reference files by repo-relative path (never `${CLAUDE_PLUGIN_ROOT}`), and editing the payload is a release (VERSION + CHANGELOG in the same change).

## Goals / Non-Goals

**Goals:**
- A newcomer with no repo and little terminal comfort can paste one prompt and be genuinely started.
- Same checks and install steps, reframed as one-question-at-a-time plain language with a warm preamble and a first-command handoff.
- README paste prompt stays a URL-read (no drift) but reads warmly; a claude.ai/code pointer covers the pre-paste step.

**Non-Goals:**
- Teaching install/opening of Claude Code itself (README pointer only).
- Any change to what gets installed, the update/merge logic, or delivery/CI behavior.
- Restructuring the runbook's step numbering or its precision for Claude.

## Decisions

- **Keep the runbook structure; layer voice on top.** Rather than rewrite Steps 1.5/3F, add a short human-facing preamble at the start of a fresh install and reword the existing rungs to lead with a plain-language "why" and ask one thing at a time. *Alternative considered:* a full rewrite into a narrative flow — rejected as it would blur the precision Claude relies on and risk regressing the careful merge/collision logic.
- **Bootstrap-from-zero as a new top rung of Step 1.5.** Step 1.5 already offers `git init` when `.git` is missing; promote "empty folder / never used git" to an explicit, gentle first-class entry so it reads as designed-for rather than an edge case. Reuse the existing rungs (gh install, auth, remote) below it unchanged in behavior.
- **First-command handoff in Step 6 (report).** Step 6 already ends with a "plan/build/save/ship" sentence; make it hand over a concrete suggested first command. *Alternative:* auto-run `/plan` — rejected; the skill must not commit/act further, and the user should choose.
- **README: warmer wording, same URL-read.** Reword the paste block and add a claude.ai/code line. Keep the "link points at the runbook so this never drifts" property.
- **Version bump = minor (4.2.0).** UX feature, no breaking change; detectable by the updater via CHANGELOG. (Main is already at 4.1.0; 3.2.0 was taken by `/improve`.)

## Risks / Trade-offs

- **[Runbook precision erodes as prose softens]** → Keep procedural bash/checks intact; change only surrounding human-facing sentences. Reviewer (PR) verifies steps still parse as instructions.
- **[Preamble/one-at-a-time adds turns for experienced users]** → Bootstrap-from-zero and slow narration trigger only when the corresponding gap exists (no repo, missing gh); an already-set-up repo skips straight through.
- **[README and skill drift on the paste wording]** → The paste stays a URL-read pointing at the runbook, so the installer behavior remains single-sourced; only tone lives in the README.

<!-- end design.md -->
<!-- file tasks.md utf8 1454 -->
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

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 3267 -->
## ADDED Requirements

### Requirement: Bootstrap from zero

The `install-wong-stack` skill SHALL treat "no git repository yet" (an empty or non-repo folder) as a first-class, supported starting point, and SHALL NOT assume the user is already inside a git repo. When no repo exists, it SHALL offer, in plain language and only after confirmation, to create one and continue the install — never failing or dead-ending the newcomer.

#### Scenario: Empty folder, never touched git

- **WHEN** the skill runs in a folder with no `.git` and the user has never used git
- **THEN** it explains in plain language that it will set up a repo for them, offers to run `git init` (and an initial commit), and — only on confirmation — proceeds into the rest of the install

#### Scenario: Already in a repo

- **WHEN** the skill runs inside an existing git repo
- **THEN** it skips the bootstrap-from-zero path and proceeds as before, without asking repo-creation questions

### Requirement: Plain-language, one-thing-at-a-time narration

The skill SHALL present its newcomer-facing setup (GitHub readiness and fresh-install questions) as a guided conversation that explains *why* each piece is needed and asks about one thing at a time, rather than presenting a wall of tool checks at once. It SHALL open a fresh install with a short human-facing preamble stating what it is about to set up before it begins changing anything. The underlying procedural steps and checks SHALL remain intact and precise for Claude to execute.

#### Scenario: GitHub not yet set up

- **WHEN** the newcomer lacks `gh`, auth, or a remote
- **THEN** the skill introduces each missing piece with a one-line plain-language reason, offers to handle it, and waits — rather than listing all gaps as raw tool-check output

#### Scenario: Install preamble

- **WHEN** a fresh install begins
- **THEN** before any change is made, the skill tells the user in plain language what it is about to set up and confirms readiness

#### Scenario: Checks preserved

- **WHEN** the friendlier narration is applied
- **THEN** every existing readiness check and install step still runs; only the human-facing framing changes

### Requirement: End with a real first step

On successful install, the skill SHALL end by handing the user a concrete first command to run (e.g. a suggested `/plan ...`) so a newcomer knows exactly how to get started, rather than only reporting what was installed.

#### Scenario: Install completes

- **WHEN** the install finishes successfully
- **THEN** the closing report includes an explicit, copy-pasteable first command the user can run next

### Requirement: Warm one-paste front door

The README SHALL present a short, warm, beginner-friendly paste-able install prompt that keeps the URL-read mechanism (so the README never drifts from the installer runbook), and SHALL point newcomers to Claude Code's web/desktop version at claude.ai/code as the least terminal-intensive way to run that first paste.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to Claude Code reads the install section
- **THEN** they find one short warm prompt to paste that reads+follows the installer URL, plus a pointer to claude.ai/code for running it without a heavy terminal setup

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-16

~~~
<!-- end .openspec.yaml -->
