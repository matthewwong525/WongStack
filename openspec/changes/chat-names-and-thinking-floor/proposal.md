# Chats opened for you think at medium or more and show their names

**Status:** ready-to-ship
**Branch:** chat-names-and-thinking-floor
**Open questions:** none

## Why

A chat that another chat, the Daily, or a schedule opens can think below medium: some models default to low (a Codex model does), and an unset level stays unset. Such a chat does weaker work, and nobody chose that. Agents also opened workspaces with a raw `paseo run --new-workspace --new-branch` or Paseo's Handoff skill, which skip the launcher, so the workspace kept a slug name such as `roadmap-week-bricks`. The Daily showed a chat's folder name, such as `potent-quail`, where the person looks for the chat's name. WongOS fixed all three on 2026-11-01 (WongOS PR 260); the launcher and the Daily are WongStack's, so the fix goes up.

## What Changes

- **A chat opened for you thinks at medium or more.** `workspace.mjs` gains `floorThinking`: low, off, none, or minimal becomes medium; medium and above stay; an unset level stays unset when the model's default (from `paseo provider models`) is medium or more, else becomes medium. The launcher, the Daily chat (`openDaily`), and a schedule run on the app's clock (`openSession`) pass the floored `--thinking`. A chat the person starts keeps the level they pick.
- **Open a workspace only through the launcher.** [New workspaces](../../../.agents/skills/plan/references/new-workspace.md) and [required tools](../../../wiki/development/required-tools.md) say never to use a raw `paseo run --new-workspace --new-branch` or Paseo's Handoff skill.
- **The Daily shows a chat's workspace name.** The start record, the chat list, the chief's watched rows, and the board task's chat show the name from `paseo workspace ls`; the folder stays in `cwd`, so a folder name still finds the chat.

WongOS also has a Paseo add-on that catches chats opened outside the launcher. It stays in WongOS: Paseo is optional in WongStack.

## Capabilities

### Modified Capabilities
- `multi-part-workspaces`: a new workspace's agent keeps the opener's thinking option only at medium or above.

## Impact

- `.agents/skills/schedule/scripts/workspace.mjs`, `lib/app-runs.mjs`, `.agents/skills/daily/scripts/daily.mjs`, `chief.mjs`.
- `.agents/skills/plan/references/new-workspace.md`, `wiki/development/required-tools.md`.
- Tests: `scripts/tests/workspace.test.mjs`, `schedule-app.test.mjs`, `daily.test.mjs`, `daily-chief.test.mjs`.

## Decision log

- **2026-11-01** — Ported from WongOS archive `2026-11-01-chat-names-and-thinking-floor`; WongOS's Paseo add-on left out, because Paseo is not a WongStack dependency (Matthew's choice).
- **2026-11-01** — Assumed: an unset level stays unset when the model's default is medium or more, not always medium as ClaymooApp's local copy does, because always-medium lowers a model whose default is high.
- **2026-11-01** — Check: the new-workspace rule adds instruction bytes, so the same page trims as many words elsewhere.
