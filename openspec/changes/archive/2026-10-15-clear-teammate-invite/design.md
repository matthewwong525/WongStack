# Design

## Context

Access saves through `Owner.save`, which navigates home with a `said` result shown by `Notices`. A new person has no page open after save. Who may connect is decided by setup (`code`: `ready`, `lacked`, `off`); the owner's status carries each person's key levels and `status.project`, from which the same answer can be read for the person being saved. The Connect steps live only in `AssistantSetup.tsx`.

## Goals / Non-Goals

**Goals:** the owner always knows what to send; a teammate with no assistant knows what to install.

**Non-Goals:** sending mail; a bare app-link button; changing setup's message or who may connect.

## Decisions

- **One `welcomeNote(status, person)` helper** in `app/src/apps/access/` builds the note text from `window.location.origin`, the email, and whether the person may connect, read the way setup reads it: when the install hands out its project (`status.project === 'ready'`), the person's effective Project code level (own set or role) decides; otherwise everyone may connect. Pure and unit-tested. Alternative, a server-built note: rejected, the address is the page's own origin and nothing secret is in it.
- **The note carries the setup message.** `setupMessage` (worker `prompt.ts`) is the same for everyone and holds nothing per person, so the Access screen reads the viewer's own `/api/access/setup` once and puts its `prompt.text` in the note, below install and sign-in lines. When that read fails or holds no ready message (a machine sign-in), the note falls back to the address and sign-in email. Alternative, adding the message to the status read: rejected, the setup read already returns it.
- **The saved result carries the person given the project.** `saidSchema` keeps an optional `welcome` email; `PersonPage` passes it only when `mayConnect` was false for the person as saved (or there was no person) and is true for the fields being sent, and only while `status.project === 'ready'`. A role picked in the People row does the same through `RoleSelect`. `Notices` opens a popup from it (the Access dialog parts, Copy and Done), not an inline note. A failed save opens none.
- **A fold-out under the person's own *Can install the project* tick** (`details`, *Message to send them*) holds the same message for a saved, active person while the tick is on. `SetFields` takes an optional person to show it; a role's set passes none. One helper for the words.
- **The install step is a first `<li>` in `Steps`**, links opening in a new tab: Claude Code (`https://claude.com/product/claude-code`) and Codex (`https://developers.openai.com/codex`). Shown only when there is something to copy; the "nothing to copy" message stays as it is.

## Risks / Trade-offs

- [Install pages move] → two stable product links; a dead link still leaves the names to search.
- [Note mismatches setup's rule] → the helper mirrors setup's rule and its test covers own set, role, and an install not handing out its project.

## UX

### Use-case brief
The owner or an Admin, on a computer, has just added a teammate and wants them working. Done: the teammate has signed in and connected. Common case: one person at a time, a few times a month. Edge: the person may not connect yet. Mirrors the existing *Saved.* notice and the `FinishStep` copy pattern.

### Flow
Add person → Save access → *Saved.* with the note → Copy → send it. Later: open the person → Copy again. Teammate: open the link → sign in → Connect your assistant → step 1 installs if needed → steps 2 to 4.

### Hierarchy
After save the one primary action is *Copy*; the list stays below. In the popup, *Copy* in step 2 stays the solid button; the install links are plain links.

### Review
`review.html`: the first What Changes item sketches the notice, the second the popup.

### Components
Existing `Alert` notice, `CopyText`, the `Steps` list. Nothing new.
