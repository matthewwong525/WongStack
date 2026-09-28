# Watch the agent browse, in the chat

**Status:** ready-to-ship
**Branch:** browser-live-screenshots
**Open questions:** none

## Why

When the agent uses its browser for you, you see only its words: "opened your inbox", "filled the form". You can't see what it saw, so you can't catch a wrong page or a wrong field until it's done. A picture at each step lets you follow along from your phone.

## What Changes

- **You see pictures as it goes.** While the agent browses, it drops a picture of the page into the chat at each key moment, with one line saying what it shows. Key moments are: a new page, right before it sends, books, or pays for anything, and the result.
  ```text
  you: "book a table at Nori, 7pm"
      │
      ▼
  agent: "Opened the booking page"
    ┌──────────────────────┐
    │ [picture of the page] │
    └──────────────────────┘
      │
      ▼
  agent: "Filled in 7pm, 2 people.
          Booking now."
    ┌──────────────────────┐
    │ [picture of the form] │
    └──────────────────────┘
      │
      ▼
  agent: "Booked. Here's the
          confirmation:"
    ┌──────────────────────┐
    │ [picture: confirmed]  │
    └──────────────────────┘
  ```
- **The chat doesn't flood.** No picture after every click or keystroke, and no second picture when the page hasn't changed.
- **App checks show theirs too.** When the agent checks your app before it goes live, it shows each step's picture in the chat as it checks it, not only on GitHub afterwards.
- **Nothing while you have the browser.** When the agent hands you its browser, for a login or a captcha, it takes no pictures until you hand it back, as today.

Non-goals: no live video stream, no picture after every action, and no change to how app-check pictures are saved on GitHub.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: during a personal browsing task, the agent shows a screenshot in the chat at each key moment (a new page, before an outward action, the result), skips unchanged pages, and still takes none during a hand-over.
- `staging-walkthrough`: `/verify` shows each browser journey's screenshots in the chat as it grades them.

## Impact

- `wiki/development/home.md` *Saved browser logins*: a new *Show what the browser is doing* subsection owns when and how (`agent-browser screenshot --if-changed`, then open the file with the host's image tool so Paseo renders it inline).
- `.agents/skills/verify/references/walkthrough.md` § d: open each browser journey's screenshots in order while grading, linking the home subsection.
- `AGENTS.md` (`CLAUDE.md` links to it) rule *Browse as the person*: names showing key moments.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Asked how often the agent should show a picture while it browses → chose at key moments: each new page, right before it sends or buys anything, and the result.
- **2026-09-28** — Asked which browsing should show pictures → chose all of it: personal errands and `/verify`'s app checks.
- **2026-09-28** — Assumed: the agent shows a picture by opening the screenshot file with its own image tool (Claude's Read, Codex's image view), because Paseo 0.9.2 turns an image a tool returns into an inline chat picture for both, and it needs no image hosting.
- **2026-09-28** — Assumed: `--if-changed` on each screenshot, because agent-browser's guide recommends it to skip unchanged images and save tokens.
- **2026-09-28** — Assumed: no pictures during a hand-over, because the `browser-logins` spec already forbids reading a picture of the page then.
- **2026-09-28** — Assumed: sensitive pages such as a bank still get pictures, because the agent already reads their text; the picture only shows the person what the agent sees.
- **2026-09-28** — Assumed: screenshots go to agent-browser's temp folder, never the repo, because they hold personal data.
- **2026-09-28** — Assumed: prose only, no new script, because one agent-browser command plus the host's image tool does the job.
- **2026-09-28** — Asked whether a test picture opened with the image tool shows in Paseo's chat on the phone → chose yes, it shows.
- **2026-09-28** — Assumed: the plan's "run /save" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-28** — Wiki distillation: no repeatable fact beyond `wiki/development/home.md`'s new *Show what the browser is doing*, which this change writes.
- **2026-09-28** — Archive checkpoint: archived by `/ship` and saved for release 26.22.0.
