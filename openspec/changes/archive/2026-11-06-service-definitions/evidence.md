# Evidence

## Test chats (task 4.2, design 12)

One round, 2026-11-06, on the built tree before the review fixes (the fixes touched refresh, the scrubber and the guide, not what the chats read). Each chat ran headless with `claude -p` (Claude Code 2.1.310) in its own detached scratch worktree of this repo, with the build copied in. Transcripts were judged from their tool calls.

| Chat | Task | Before its first Notion call or edit | Read the whole `openapi.json` | Code typed from `app/worker/services/notion.ts`, `tsc -b` | Result |
|---|---|---|---|---|---|
| 1 | Newest Notion page | services skill, `services`, `api notion`, `api notion search` | no | — | pass; Notion returned no pages (none shared with the connection), and the chat said so |
| 2 | Newest Notion page | same | no | — | pass; same empty answer |
| 3 | Newest Notion page | same | no | — | pass; same empty answer |
| 4 | Add an action | read the skill, the types file and the example; no `api notion` | no | no code | stopped before any call or edit, asking how a chat-added key reaches built code |
| 5 | Add an action | read the skill, `api notion search` | no; read one call's `description` with a one-line script | `NotionSearchAnswer`, `NotionSearchRequest`; `tsc -b` passes | pass |
| 6 | Add an action | read the skill, `api notion search` | no | `NotionSearchAnswer`; `tsc -b` passes | pass |

No chat acted on Notion before reading its short view or the files the skill names, so the skill's text was not changed and no task was run again.

All three action chats met the same limit, which existed before this change: a key added from a chat lives in the live database, while built server code can use only keys listed in `app/worker/keys.ts`. Listing Notion there ships it to every install, so in this repo each chat stopped or asked before doing that. Task 2's scratch code was thrown away with the worktrees.
