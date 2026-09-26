# Learn the development loop by chatting

**Status:** in-progress
**Branch:** tutorial-redesign-change-loop
**Open questions:** none

## Why

Today's tutorial tells you to type a command yourself, and says nothing about why each step happens. A new person learns faster with one ready-made message to paste, and an assistant that explains each step while it does the work.

## What Changes

- **The tutorial becomes one box with a message to copy.** It is titled *Learn the development loop*. It holds a plain message and a Copy button. You paste the message into your chat with the assistant, and it walks you through the rest.
  ```text
  ┌──────────────────────────────┐
  │ Learn the development loop   │
  │                              │
  │ Your first change removes    │
  │ this box. Copy this message  │
  │ into your chat:              │
  │ ┌──────────────────────────┐ │
  │ │ Remove the tutorial from │ │
  │ │ my home page. Walk me    │ │
  │ │ through each step and    │ │
  │ │ explain what it does.    │ │
  │ └──────────────────────────┘ │
  │ [ Copy ]                     │
  │                              │
  │ Your apps                    │
  │ ┌──────────────────────────┐ │
  │ │ Hello                    │ │
  │ │ Say hello from the API   │ │
  │ └──────────────────────────┘ │
  └──────────────────────────────┘
  ```
- **You learn by chatting.** The message asks the assistant to explain each step. It writes a plan and sends a link so you can read it. It asks *build it now?*, and then sends a link to try the change. It asks *publish it?*, and then the change goes live. Before each step it says what the step is for. Nothing new is installed for this; the message does the teaching.
  ```text
  paste the message
   │
   ▼
  plan to read ── "build it now?" ── yes
   │
   ▼
  link to try ─── "publish it?" ──── yes
   │
   ▼
  live: the box is gone
  ```
- **Setup's last message points to the box.** It gives your site's address and says to open it and copy the message.
- **An update never brings the tutorial back.** If you already removed it, updating WongStack leaves it removed. A site that still shows the old tutorial gets the new box.

**Non-goals:** no lessons, progress ticks, or new assistant skill. No login-wall lesson; that stays in [the Access guide](../../../wiki/stack/cloudflare-access.md). No change to how a plan, a preview, or publishing works.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: the starter landing page's tutorial is a copyable message that asks the agent to remove the tutorial and explain each step; setup points to it; sync never restores a removed tutorial.

## Impact

- **App:** `app/src/Tutorial.tsx` is rewritten with the message and a Copy button; its test moves from `App.test.tsx` to a new `app/src/Tutorial.test.tsx`; `App.css` gains the box's styles. Removing the tutorial stays one step: delete `Tutorial.tsx`, `Tutorial.test.tsx`, its styles, and one line in `App.tsx`.
- **Skills:** `wong-setup/references/cloudflare.md` Step 5 ends by pointing to the box; `wong-sync`'s payload manifest says a removed tutorial is not restored.
- **Docs:** `wiki/stack/getting-started.md` and `wiki/stack/mini-apps.md`.
- **Release:** 24.1.0.

## Decision log

- **2026-09-26** — Asked where the tutorial lives → first chose **home page plus an agent guide**. Replaced by the answer below.
- **2026-09-26** — Asked how security fits in → first chose **an optional last lesson**. Dropped by the answer below.
- **2026-09-26** — Asked when the tutorial starts → chose **after setup; its closing message points to the tutorial**.
- **2026-09-26** — Asked, after reading the first plan (the user): "This might be too much… just have a prompt with a copy button… it'll go create a plan… ask them to apply it then ask them to ship… 'Learn the development loop'… they learn just by chatting with ai" → chose **one box with a copyable plain message, no lessons, no new skill**.
- **2026-09-26** — Assumed: the message is plain words, not a command: *Remove the tutorial from my home page. Walk me through each step and explain what it does.* The plain request already stops at the plan to ask "build it now?" and after the preview to ask "publish it?", and asking for explanations makes the assistant teach without a new skill.
- **2026-09-26** — Assumed: when the browser blocks copying, the button says to select the message and copy it by hand, and the message stays selectable, because some phones and embedded browsers refuse clipboard access.
- **2026-09-26** — Assumed: `/wong-sync` copies the tutorial file only when the target's `App.tsx` still renders `<Tutorial />`, because a person who removed the tutorial finished it.
- **2026-09-26** — Review note on the page sketch ("Remove 1,2,3") → removed the three what-happens-next lines from the box; the box holds only the title, one intro line, the message, and Copy, because the assistant explains the steps in chat.
- **2026-09-26** — Assumed: release 24.1.0, because this changes the starter page and removes nothing a target relies on.
- **2026-09-26** — Assumed during apply: the button keeps saying `Copied` rather than resetting after two seconds, because a reset timer adds a cleanup that no test can observe, and the page's mutation bar is 100%.
- **2026-09-26** — Apply evidence on the host: oxlint, `tsc -b`, Vitest (34 tests, 100% coverage), knip, and Stryker (193 mutants, 100%; `Tutorial.tsx` 13 killed) pass; the payload link check and the OpenSpec config check pass. CI stays the gate.
- **2026-09-26** — Save checkpoint: the tutorial box, its tests, setup's closing line, the sync rule, docs, and 24.1.0 landed; the `mini-apps` delta synced into `openspec/specs/`. `origin/main` moved to 24.0.1 (#131); merged it, keeping 24.1.0 and both changelog entries. Task 4.3 waits on CI and the preview.
