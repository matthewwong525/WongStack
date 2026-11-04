# Design

## Context

WongOS shipped this on 2026-11-01 (WongOS PR 260, archive `2026-11-01-chat-names-and-thinking-floor`). WongStack's 47.0.0 then removed the Daily chat (`openDaily`) and its chat list (`readChats`, `picture`), so only the launcher, the app-clock schedule run, and the daily's board to-dos, status, and journal remain to port. See proposal.md for the why.

## Goals / Non-Goals

**Goals:** a chat opened for you never thinks below medium; the daily shows the Paseo workspace name, not the folder.

**Non-Goals:** WongOS's Paseo add-on that catches chats opened outside the launcher; Paseo is optional in WongStack. No floor for a chat the person starts.

## Decisions

- **One floor in `workspace.mjs`.** `floorThinking(level)` maps low, off, none, and minimal to medium and keeps the rest. `modelDefault(call, provider, model)` reads `defaultThinkingOptionId` from `paseo provider models`. `flooredThinking(call, settings)` keeps an unset level unset only when that default is medium or more, else gives medium; a failed read gives medium. The launcher and `openSession` in `lib/app-runs.mjs` call it. Alternative: always medium for an unset level, as ClaymooApp does; rejected, because it lowers a model whose default is high.
- **Names from `paseo workspace ls`.** `workspaceOf` in `daily.mjs` prefers the launcher's `workspaceName`. The chief's `admit` and `hand` look up each folder's name once per pass through `workspaceNames`, and keep the folder in `cwd`. `watchedRow` also matches the folder's base name, so a reply by folder name still finds the chat.
- **Launcher-only rule** in `new-workspace.md` and `required-tools.md`, with words trimmed elsewhere on the same page.

## Risks / Trade-offs

- [Paseo lists no workspaces, or an old Paseo has no `name`] → the folder name stands in, as before.
- [A model list without `defaultThinkingOptionId`] → the floor gives medium, which may lower a high-default model by one step; it never goes below medium.
