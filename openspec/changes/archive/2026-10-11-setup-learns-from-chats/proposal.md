# Setup learns from your past chats while it installs

**Status:** ready-to-build
**Branch:** flashy-frog
**Open questions:** none

## Why

Today a new install knows nothing about you until you paste the *Make it yours* message, say yes to a question, and wait while the assistant reads a month of chats. Setup already has long waits, so it can learn about you during them, and the first message can go back to one small job: making the page yours.

## What Changes

- **Setup reads your past AI chats while it installs.** As soon as setup has its tools, it says in one line that it is reading what you typed in your past AI chats on this computer, then carries on installing. Helpers read the chats side by side, newest first, each taking one slice. They hand back short notes; setup writes them once, to your wiki page, the wiki, and memory, before its first save. It reads every chat it can find, not only the last month. A computer with a long history gets its newest eight slices read, and setup says how far back that reached.
  ```text
  BEFORE
  setup ───────────────▶ site live
  paste message ─▶ "may I read?" ─▶ read
                     ─▶ questions ─▶ page

  AFTER
  setup ─┬─ install, hosting ─┬▶ site live
         └+ helpers read chats┘  + notes saved
  paste message ─▶ page
  ```
- **It tells you, and stops if you say so.** Setup no longer asks before reading. One line says what it reads and what it keeps; reply *skip the chats* and it stops and writes nothing. It keeps short notes about you and your business: never passwords, keys, copies of chats, or anything about health, family, or money.
- **The *Make it yours* message only changes the page.** It asks what to call the page, updates the heading, removes the welcome box, explains each step, and shows a preview before publishing. It no longer asks to read chats or runs question rounds.
  ```text
  ┌──────────────────────────────┐
  │ Make it yours                │
  │ "Make this home page mine.   │
  │  Ask what to call it, update │
  │  the heading, remove this    │
  │  guide, explain each step,   │
  │  show a preview first."      │
  │                       [Copy] │
  └──────────────────────────────┘
  ```
- **Nothing slows down or breaks when chats can't be read.** A computer with no chats, an assistant that can't start helpers, or a helper that fails never stops setup. With no helpers, the assistant reads the newest slice itself while the site first goes live.
- **Installs you already have keep working.** An update swaps the welcome message only where the box is still showing. To have the assistant learn from past chats there, ask it: *get to know me from my past chats*.

**Non-goals:** Reading chats from apps that keep no chat files on this computer, reading chats when someone only evaluates WongStack, sending chat text anywhere, or re-reading chats on every update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: Setup learns from the person's past chats in parallel with the install, tells rather than asks, and writes notes once.
- `memory`: The recent-chats read can cover every chat and be split into numbered parts.
- `mini-apps`: The starter page's first request personalizes the page only; the requirement that it learn about the person is removed.

## Impact

`wong-setup` skill text and a new owning wiki page, the `memory.mjs recent-chats` command and its tests, the starter app's `Tutorial.tsx` message and test, the getting-started and mini-apps wiki pages, the memory skill's command table, and a minor payload release. The skills' instruction budget has almost no room, so skill text added is offset by cuts. No app data, database, or dependency changes.

## Decision log

- **2026-10-11** — Assumed: Setup tells in one line and reads without asking, because the request says "by default it should try to pull all ai chat logs"; *skip the chats* stays as the way out.
- **2026-10-11** — Assumed: "All chat logs" means every Claude Code and Codex chat kept on this computer, because those are the chat files the memory tools can already read safely; other assistants keep none locally.
- **2026-10-11** — Assumed: At most eight helpers of about 150,000 characters each, newest first, because one long-used computer here holds 2.3 million characters across 784 chats and an uncapped read would cost more than setup itself. Setup says how far back it read.
- **2026-10-11** — Assumed: Helpers only read and return notes, and setup writes once, because the wiki folder and the memory store do not exist when the helpers start, and parallel writers would collide.
- **2026-10-11** — Assumed: Only what the person typed is read, with keys replaced, as today, because the agent's replies and tool output add bulk and risk without saying more about the person.
- **2026-10-11** — Assumed: The welcome message drops the question rounds along with the chat read, because the request says the copied prompt "is just for changing the UI".
- **2026-10-11** — Assumed: Slicing chats into parts is code in the memory script, not a judgment the assistant makes, because it is a repeated mechanical step.
