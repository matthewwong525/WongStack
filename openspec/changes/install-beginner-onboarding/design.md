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
