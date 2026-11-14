# Finished chats show DONE: in the chat list

**Status:** parked
**Branch:** loud-bedbug
**Open questions:** none

## Why

A finished chat now stays open until you close it, so the chat list fills with chats that need nothing from you. Today you open each one to see if it is finished. A `DONE: ` mark on its name shows it at a glance.

## What Changes

- **A finished chat's name starts with `DONE: `.** About a minute after a chat finishes, the daily's helper on your computer adds `DONE: ` to the start of the chat's name in the chat list. Finished means what the Daily chat already uses: the chat's work is live at its last change, its folder has nothing new, it is stopped, and it has no open question. An earlier mark such as `WAITING: ` gives way to `DONE: `. The chat stays open: you still close it, or pick it from *what's going on?*.
  ```screen
  <div class="card col gap phone">
    <h3>Chats</h3>
    <div class="row gap"><span class="grow">DONE: Fix the invoice total</span><span class="tag-outline">idle</span></div>
    <div class="row gap"><span class="grow">DONE: Move old installs' knowledge</span><span class="tag-outline">idle</span></div>
    <div class="row gap"><span class="grow">Add the Notes page</span><span class="tag">working</span></div>
    <div class="row gap"><span class="grow">Live reader for company knowledge</span><span class="tag-outline">waits for you</span></div>
  </div>
  ```
  The list is Paseo's own app, not a WongStack screen, so this is a sketch, not a picture.

- **The mark goes when the chat has new work.** When you write in a `DONE: ` chat and it starts to work, or its folder gets new changes, the helper takes `DONE: ` off again. When the chat finishes again, the mark comes back. A name you changed yourself after the mark stays as you wrote it.
  ```mermaid
  flowchart LR
    w["Fix the invoice total"] -->|finished| d["DONE: Fix the invoice total"]
    d -->|new work| w
  ```

Non-goals: no chat closes by itself; no change to what counts as finished, to *what's going on?*, to the board's Done or to the 3-day tidy-up. Chat names come from Paseo, so without Paseo nothing changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: a new requirement: the helper marks a finished chat's name with `DONE: `, and takes the mark off when the chat has new work.

## Impact

- `.agents/skills/daily/scripts/done-titles.mjs` (new): reads the watched rows each pass, uses `finished()` from `finished.mjs`, and renames workspaces through `paseo workspace rename`; keeps `done-titles.json` in the private state folder.
- `.agents/skills/daily/scripts/chief.mjs`: the watch pass calls it in service mode.
- Docs: `wiki/development/daily.md` (*Close finished chats*).
- Tests: `scripts/tests/daily-done-titles.test.mjs` (new); `scripts/tests/daily-chief.test.mjs` for the pass wiring.
- `CHANGELOG.md` (`minor`).
- Overlap: the planned `chat-names-and-thinking-floor` also edits `chief.mjs` (it shows workspace names in the Daily). The two touch different functions; whichever goes second takes the other's lines in.

## Decision log

- **2026-11-04** — Assumed: the helper's watch pass sets the mark, not the chat at the end of its own publish, because the pass already sees every chat, catches a merge made outside the chat, and adds no words to the skills.
- **2026-11-04** — Assumed: the mark is set by itself, with no ask and no off switch, because Matthew asked for it to appear once a task is finished, and a name change is harmless and undone by the helper itself.
- **2026-11-04** — Assumed: "finished" is the existing check in `finished.mjs`, unchanged, because the 45.9.0 plan settled it and the Daily chat's list and the names then agree.
- **2026-11-04** — Assumed: the mark comes off when the chat stops being finished, because a `DONE: ` chat that works again would mislead.
- **2026-11-04** — Assumed: the helper takes off only a mark it set, and a name the person changed after the mark is left alone, because the name is the person's.
- **2026-11-04** — Assumed: an earlier status mark (capital letters then `: `, such as `WAITING: `) is replaced, not kept, because the status it named is over; the mark coming off gives the plain name.
- **2026-11-04** — Assumed: the workspace's name changes, not the agent's tab title, because the workspace name is what the chat list shows and what was renamed `WAITING: ` by hand.
- **2026-11-04** — Assumed: a stopped chat that is not finished is checked again only when it changes, or every 10 minutes, because each check may ask GitHub, and the pass runs every minute.
- **2026-11-04** — Asked by the chat "Show the step in the chat title" to stop → parked, not built: Matthew folded this part into that plan, which reuses its design.
