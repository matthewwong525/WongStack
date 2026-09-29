# Proposal

**Status:** ready-to-ship
**Branch:** workspace-notify-form
**Open questions:** none

## Why

After giving the assistant a password or token, you should be able to go straight back to the task without typing another message. Website forms already list their fields outside the live preview, but their submit buttons still require a tap inside it.

## What Changes

- **Save and continue in one tap.** Password and token forms get one main button that saves your entries, closes the private input, and wakes the chat that asked for them. A failed save stays open so you can fix it; a token form waits until every requested token is saved.
  ```text
  PASSWORDS: BEFORE
  ┌──────────────────────────────────┐
  │ Drop an export, or add a login   │
  │ [x] netflix.com                  │
  │ Website  [netflix.com          ] │
  │ Username [me@example.com       ] │
  │ Password [********             ] │
  │ [Add]                            │
  │ [Save 1 login]          [Done]   │
  └──────────────────────────────────┘
  PASSWORDS: AFTER
  ┌──────────────────────────────────┐
  │ Drop an export, or add a login   │
  │ [x] netflix.com                  │
  │ Website  [netflix.com          ] │
  │ Username [me@example.com       ] │
  │ Password [********             ] │
  │ [Add]                            │
  │ [Save and continue]              │
  │ Close without continuing         │
  └──────────────────────────────────┘
  TOKENS: BEFORE
  ┌──────────────────────────────────┐
  │ Keys for your assistant          │
  │ Stripe key [********      ] Show │
  │ [Save]                 [Done]    │
  └──────────────────────────────────┘
  TOKENS: AFTER
  ┌──────────────────────────────────┐
  │ Keys for your assistant          │
  │ Stripe key [********      ] Show │
  │ [Save and continue]              │
  │ Close without continuing         │
  └──────────────────────────────────┘
  EMPTY / SAVING / SAVE ERROR
  ┌──────────────────────────────────┐
  │ No login chosen or key entered   │
  │ [Save and continue: disabled]    │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Saving your entries...           │
  │ [Saving... disabled]             │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Saved entries stay saved         │
  │ Couldn't save one. Try again.    │
  │ [Save and continue]              │
  └──────────────────────────────────┘
  ```
- **The website's button appears under its fields too.** Tap the matching button outside the preview to do the same thing as tapping it on the website. It keeps the site's label and disabled state, follows the next page, and waits for your latest typing. If the next page asks for a code, it stays with you until you finish.
  ```text
  BEFORE
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ Email, password, [Sign in] here  │
  ├──────────────────────────────────┤
  │ Email    [                     ] │
  │ Password [                     ] │
  │ Other typing                     │
  └──────────────────────────────────┘
  AFTER
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ Email, password, [Sign in] here  │
  ├──────────────────────────────────┤
  │ Email    [                     ] │
  │ Password [                     ] │
  │ [Sign in]                        │
  │ Other typing                     │
  └──────────────────────────────────┘
  SENDING / NEXT STEP
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ [Sign in: disabled while sent]   │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Website preview: enter your code │
  │ Code [                         ] │
  │ [Verify]                         │
  └──────────────────────────────────┘
  NO MATCH / PAGE CHANGED
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ Tap the button on the page       │
  │ Other typing                     │
  └──────────────────────────────────┘
  ```
- **The workspace hears only the result.** The chat receives a brief message saying the input step finished and which entries were saved, never their contents. It resumes even if it had stopped waiting. A website click wakes it only when the requested step is finished. If the wake-up fails, the page tells you to return to the chat; saved entries stay saved.
  ```text
  save entries / finish website step
                  │
                  ▼
         close private input
                  │
                  ▼
       wake the requesting workspace
                  │
                  ▼
           continue the task

  RETURNING / FINISHED
  ┌──────────────────────────────────┐
  │ Saved. Returning to your chat... │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Your assistant was notified      │
  │ You can return to the chat       │
  └──────────────────────────────────┘
  WAKE-UP UNAVAILABLE
  ┌──────────────────────────────────┐
  │ Saved; chat wasn't notified      │
  │ Return to chat and say continue  │
  └──────────────────────────────────┘
  CLOSED / EXPIRED
  ┌──────────────────────────────────┐
  │ This link has closed             │
  │ Ask in chat for a new link       │
  └──────────────────────────────────┘
  ```

Non-goals: managing passwords inside the chat, building a new website, or automatically clicking a website's submit button without your tap.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: one-tap password completion, mirrored website form actions, permitted action metadata, and completion that wakes the originating workspace.
- `secrets-convention`: one-tap key completion and result-only workspace notification after successful persistence.

## Impact

The hand-over watcher and its password, key, and browser pages under `.agents/skills/verify/scripts/`; their payload tests under `scripts/tests/`; the canonical browsing and secrets guides; and a minor release entry in `CHANGELOG.md`. Uses the installed Paseo CLI when the opener supplies its agent identity. No new service or app dependency. Current branch: `workspace-notify-form`.

## Decision log

- **2026-09-29** — Asked Should the password and token forms save your entries and wake the chat in one tap? → chose Save and continue.
- **2026-09-29** — Assumed: keep both improvements in one change, because the same private hand-over owns the fields, website actions, and return to the requesting chat.
- **2026-09-29** — Assumed: wake the existing requesting chat rather than create a new one, because it holds the task that needs to continue.
- **2026-09-29** — Assumed: a website button mirrors the real action and label, and completion waits for the requested finish, because submitting a password can lead to another code step.
- **2026-09-29** — Assumed: offer mirrors for identifiable visible form actions; unfamiliar embedded or custom controls remain tappable in the preview, because the tool must not guess which action to trigger.
- **2026-09-29** — Assumed: use ordinary code for saving, forwarding taps, and notifying the workspace, because this repeated flow needs no model call to decide when it is complete.

- **2026-09-29** — Assumed: verify implementation tasks with focused checks and keep publishing checks in the final save, because the authorized build-and-publish flow archives completed work before its single publishing checkpoint. All planned coverage and live checks remain required.

- **2026-09-29** — Assumed: record the completed host checks with disposable credentials and an isolated idle chat. Token and password completion woke that chat; a waiting result and repeated identity were consumed once. Website submission included the last character, stayed open for a code, and notified at the requested finish. Partial key input stayed open and cancellation sent no readiness.

- **2026-09-29** — Assumed: checkpoint the completed archive for release 27.7.0 after focused tests and host checks passed; the publishing checks remain the final gate before merging.
