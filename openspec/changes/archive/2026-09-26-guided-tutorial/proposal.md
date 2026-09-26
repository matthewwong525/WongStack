# Learn the development loop by chatting

**Status:** ready-to-ship
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
- **One home page, no separate all-apps page.** The page that listed every mini app at `/apps/` is gone; that address now opens your home page, which already lists your apps. Each mini app's back link says *Home* and goes there.
  ```text
  before                after
  ──────                ─────
  home ─▶ app           home ─▶ app
          │                      │
          ▼                      ▼
     all apps page       "Home" ─▶ home
  ```
- **The home page looks like your mini apps.** It uses the same plain look: your device's own font, simple outlined cards and buttons, and light or dark to match your device. The purple starter-template colors go.
- **Setup's last message points to the box.** It gives your site's address and says to open it and copy the message.
- **An update never brings the tutorial back.** If you already removed it, updating WongStack leaves it removed. A site that still shows the old tutorial gets the new box.

**Non-goals:** no change to what a mini app can do or how it saves. No lessons, progress ticks, or new assistant skill. No login-wall lesson; that stays in [the Access guide](../../../wiki/stack/cloudflare-access.md). No change to how a plan, a preview, or publishing works.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: the starter landing page's tutorial is a copyable message that asks the agent to remove the tutorial and explain each step; setup points to it; sync never restores a removed tutorial. The build no longer writes an app list page; `/apps/` redirects to `/`; the example app links Home; the landing page takes the mini apps' plain style.

## Impact

- **Mini apps:** `scripts/mini-dashboard.mjs` stops writing `/apps/index.html`; `mini-apps/router.mjs` redirects `/apps/` to `/`; `hello/` and `tips/` link Home; `scripts/tests/mini-apps.test.mjs` follows.
- **App:** `app/src/index.css` and `App.css` take the mini apps' style; `AppList.tsx`'s failure state drops its `/apps/` link. `app/src/Tutorial.tsx` is rewritten with the message and a Copy button; its test moves from `App.test.tsx` to a new `app/src/Tutorial.test.tsx`; `App.css` gains the box's styles. Removing the tutorial stays one step: delete `Tutorial.tsx`, `Tutorial.test.tsx`, its styles, and one line in `App.tsx`.
- **Skills:** `wong-setup/references/cloudflare.md` Step 5 ends by pointing to the box; `wong-sync`'s payload manifest says a removed tutorial is not restored.
- **Docs:** `wiki/stack/getting-started.md`, `wiki/stack/mini-apps.md`, `wiki/stack/README.md`, and the mini-app save reference.
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
- **2026-09-26** — Save checkpoint: the tutorial box, its tests, setup's closing line, the sync rule, docs, and 24.1.0 landed; the `mini-apps` delta synced into `openspec/specs/`. `origin/main` moved to 24.0.2 (24.0.1 #131, then OpenSpec 1.13.2); merged it, keeping 24.1.0 and both changelog entries. Task 4.3 waits on CI and the preview.
- **2026-09-26** — Asked, after the first preview (the user): "also remove the all mini apps page it should just go back to home page and things should be styled similarly like the mini apps so its congruent" → the build stops writing `/apps/index.html`, `/apps/` redirects to `/`, each app's back link reads Home and points at `/`, and the landing page takes the mini apps' plain style. Added to this change rather than a new one, because it reshapes the same landing page.
- **2026-09-26** — Assumed: `/apps/` answers with a temporary (302) redirect to `/`, because old links and bookmarks to the list should land somewhere useful, and a temporary redirect is not cached forever if the list ever returns.
- **2026-09-26** — Assumed: "styled like the mini apps" means the landing page adopts the mini apps' system look (`system-ui`, `color-scheme: light dark`, system colors, 1px outlines), not the reverse, because the mini apps are many and the landing page is one.
- **2026-09-26** — Assumed: when the list fails to load, the page says to reload instead of linking to `/apps/`, because that page no longer exists.
- **2026-09-26** — Assumed: `/wong-sync` for an older install whose own landing page does not read `/apps/apps.json` adds a task to list the apps there, because `/apps/` stops listing them.
- **2026-09-26** — Save checkpoint: the list page is gone, `/apps/` redirects home, the example apps link Home, and the home page takes the mini apps' look; the `mini-apps` deltas synced into `openspec/specs/`. Host checks pass: 260 script tests, oxlint, `tsc -b`, Vitest (34 tests, 100% coverage), knip, and Stryker (100%). Task 4.3 waits on the new preview.
- **2026-09-26** — Task 4.3 on the preview, headless Chromium at 390×844 (touch): the box and the app list render with no sideways scroll; Copy put the exact message on the clipboard and read `Copied`; Hello's Home link and `/apps/` both land on `/`.
- **2026-09-26** — Distilled facts at ship: the store holds no live fact for this change or its branch, so no repeatable fact moved. The wiki edits ride in this change: `wiki/stack/mini-apps.md`, `wiki/stack/getting-started.md`, and `wiki/stack/README.md`.
- **2026-09-26** — Archive checkpoint: every task checked, the change archived with `--skip-specs` after confirming both `mini-apps` requirements in `openspec/specs/` equal the deltas.
