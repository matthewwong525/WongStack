# Clear teammate invite

**Status:** ready-to-ship
**Branch:** invite-install-steps
**Open questions:** none

## Why

When you add someone in Access, the app goes straight back to the list and never says what to send them. The teammate then lands on *Connect your assistant*, which assumes they already have an AI assistant on their computer. A new teammate can stall at either end.

## What Changes

- **When you give someone the project, a popup gives you the message to forward.** A save that newly gives a person the project, whether you just added them or they were already on the list, opens a popup with a ready-to-send message and a *Copy* button. You send it to your coworker however you like, and they paste it into their AI assistant. It tells them to install an assistant if they have none (such as Claude Code or Codex), to paste it into its chat, and to sign in with their email when it shows the link. Other saves just say *Saved.*. To copy it again later, open the person: a fold-out under *Can install the project* holds the same message.
  ```text
   you            coworker        their AI
    │── Copy, send ──▶│               │
    │                 │── paste ─────▶│
    │                 │◀─ sign-in link│
    │                 │── signs in ──▶│
    │                 │◀── connected ─│
  ```
  ```text
  ┌──────────────────────────────┐
  │ Send ann@co.com this message │
  │ You can now use our company  │
  │ app at https://...           │
  │ To connect your AI assistant:│
  │ 1. No assistant? Install one │
  │ 2. Paste this note into it   │
  │ 3. Sign in with ann@co.com   │
  │ For the assistant: ...       │
  │               [Done] [Copy]  │
  └──────────────────────────────┘
  ```
  ```text
  ┌──────────────────────────────┐
  │ Project                      │
  │ [x] Can install the project  │
  │ + ▸ Message to send them     │
  │ [ ] Can publish              │
  └──────────────────────────────┘
  ```
- **The teammate's steps start with getting an assistant.** *Connect your assistant* gains a first step: *Have an AI assistant on your computer*, with install links for a couple of them, such as Claude Code or Codex, named as examples, not requirements. The copy, paste and approve steps follow, numbered 2 to 4.
  ```text
  ┌────────────────────────────────┐
  │ Connect your assistant         │
  │ +1 Have an AI assistant        │
  │ +  No assistant yet? Install   │
  │ +  one, such as Claude Code or │
  │ +  Codex.                      │
  │  2 Copy your setup message     │
  │    [Copy]                      │
  │  3 Paste it into its chat      │
  │  4 Approve the sign-in it opens│
  └────────────────────────────────┘
  ```

Non-goals: the app sending an email or invite itself; a separate *Copy app link* button (taken out on 2026-10-05); changing who may connect.

## Capabilities

### New Capabilities

### Modified Capabilities

- `employee-onboarding`: adding a person offers a welcome note to send; the Connect steps open with getting an assistant.

## Impact

- `app/src/apps/access/` (Notices, PersonPage, People, Owner save result), a new welcome-note helper and its tests
- `app/src/components/AssistantSetup.tsx` and its test
- `wiki/stack/employee-access.md`, `CHANGELOG.md`

## Decision log

- **2026-10-15** — Asked: make the invite clear at both ends, a note for the owner to send and an install step for the teammate → chose to build it (`/apply`).
- **2026-10-15** — Assumed: the note is copied and sent by the owner, not emailed by the app, because the app has no mail sender and the owner asked on 2026-10-05 to send people the website themselves.
- **2026-10-15** — Asked (after the first preview): the owner usually forwards the message and the coworker pastes it into their AI → chose a note that carries the setup message itself, with install and sign-in steps around it.
- **2026-10-15** — Asked: who gets the forwardable setup part → chose the people you give the project to (*this is post inviting someone who we want to give access to the repo*).
- **2026-10-15** — Assumed: the note carries the setup message only when the new person may connect (Project code held, or the install not handing out its project), because a person without it is refused at setup.
- **2026-10-15** — Asked (after the second preview): where the message shows → chose a popup after a save that gives the project (*after we give them the repo access if that is added*), and to copy it again, a fold-out under the *Can install the project* tick (*popup only and maybe dropdown under the checkbox*). No note in the *Saved.* box or elsewhere on the person's page.
- **2026-10-15** — Asked (after the third preview): *why is there also a can't copy? show the message* → removed that fold where the message is already shown in full; a failed copy points to the text above. The Connect popup keeps it.
- **2026-10-15** — Assumed: the fold-out shows only on a person's own set, because a role's tick names no one to send it to.
- **2026-10-15** — Assumed: the install step names Claude Code and Codex as examples with their install pages, because WongStack makes no chat app a requirement.
- **2026-10-15** — Archived and saved for publishing by /ship as 43.2.0.
