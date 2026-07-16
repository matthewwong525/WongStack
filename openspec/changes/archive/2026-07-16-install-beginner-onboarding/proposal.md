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
