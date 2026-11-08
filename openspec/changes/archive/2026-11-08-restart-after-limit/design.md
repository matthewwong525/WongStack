# Design

## Context

**The line-up needs Paseo for two jobs.** It *sees* the chats (`paseo ls --global` for who is open and working, `paseo logs` for what they said), and it *sends* notes (`chief.mjs` `reply` → `paseo send --behavior steer`, from the worker's `deliverNotes`). Its map in `line-up.json` is keyed by Paseo agent id. Outside Paseo, `D line-up` and `D tell` answer `unsupported`. Check-ins already work everywhere, because each chat's own `Stop` hook runs them.

**Hooks are the one thing both tools share.** Claude Code and Codex both run `SessionStart`, `UserPromptSubmit` and `Stop`; both put a hook's added context in front of the model. Neither has a hook that fires in an idle chat. Claude Code 2.1.310 also has its own messages between chats, but they rest on an undocumented session file and address, and only a session can send one; this plan does not use them.

## Goals / Non-Goals

**Goals:**
- The line-up keeps every Claude Code and Codex chat in the project in line, in Paseo or not.
- Two ways, no more: Paseo first, a waiting note otherwise.
- One list of chats, written the same way by both tools.
- Nothing works worse than today for a Paseo chat.

**Non-Goals:**
- A restart after the usage limit, and a wake for an idle chat outside Paseo.
- Claude Code's own messages between chats; an own or third-party AI tool.
- The watch, the Inbox chat list, *what's going on?* per-chat lines, `D reply`, `D answer`, `D allow`, and closing chats: they keep Paseo.

## Decisions

**1. Status cards: `chat-list.mjs`.** Every chat writes a card from its own hooks, Claude Code and Codex alike: `daily.mjs mark` on `SessionStart` and `UserPromptSubmit`, and `stop-check.mjs` on `Stop`, after its checks. A stop that the stop check or the ask check sends back keeps the card `working`. One file per chat at `~/.local/state/wongstack/chats/<key>.json`, `key` the session or thread id: `{ key, tool, name, paseoId, repo, cwd, transcript, state: working|idle, at }`. `paseoId` comes from `PASEO_AGENT_ID`. `name` is the Paseo title, else the step title, else the folder name. A background run and a sub-agent write none. The list is the cards in this repo (`sameRepo`). A card not updated in 24 hours whose transcript is also unchanged counts as closed and goes after 7 days.

**2. The line-up reads the cards.** `lineUpData` gives each chat its new messages from its transcript with `transcript.mjs` `readChat`, after the map's `read` mark. A mark is the transcript byte size at the last read; `lineUpDue` compares sizes. The map is keyed by chat `key`. An old map keyed by Paseo ids starts fresh on first read, and its pending notes are dropped with one journal line: they are minutes old, and the next read finds the same news. `D line-up`, `D tell` and `D map` drop the `PASEO_AGENT_ID` check. `D tell --agent` takes a key, a name, or a Paseo id.

**3. Two ways: Paseo, else a waiting note.** `tell` keeps its limits (a *Needs you* chat or check-ins off: no note; the streak; `From the daily:`), then queues the note by the card:

| Chat | Way | When the chat reads it |
|---|---|---|
| Has a Paseo id | `paseo`: the worker's `deliverNotes`, as today | at once (`--behavior steer` while working) |
| Any other | `waiting`: `waiting-notes.mjs` | at its next stop or next message |

- **`paseo`:** unchanged for every Paseo chat, Claude Code or Codex. A send that fails moves the note to waiting notes with one journal line, so a note is never lost.
- **`waiting`:** `~/.local/state/wongstack/notes/<key>.jsonl`. `take(key)` removes and returns the notes in one locked step, so two readers never hand over one note twice. `stop-check.mjs` takes them before the judge: they go back as the block reason, count one toward the streak, and the judge does not run for that stop. On `UserPromptSubmit`, `mark` prints them as added context with the person's message. The journal line is written at hand-over.

**4. Safety stays where it was.** Every note starts `From the daily:`, so `readChat` never counts it as the person's. The streak of 5 counts notes and check-ins as now. Every hook exits 0 on any error, so a broken card or note file leaves a chat as it is today.

## Risks / Trade-offs

- **An idle chat outside Paseo waits for the person** before it reads its note. Accepted: no hook fires in an idle chat, and the note is still there at the next message.
- **A working chat outside Paseo reads its note only at its stop.** Accepted: no after-step hook is shared by both tools, and one way for both keeps the code small.
- **Two sources of chats.** The watch keeps Paseo's list for the Inbox and *what's going on?*; the line-up uses the cards. Accepted for now; moving the rest is a later plan.
- **More hook runs.** Two more short Node runs per chat, at start and at each message.
