# Show the sign-in link at once

**Status:** ready-to-ship
**Branch:** ship-print-link
**Open questions:** none

## Why

A person pasted the setup message into their assistant and waited. The assistant had the sign-in link but did not show it until they typed *send me the link*. The setup message told the assistant never to print login output, and the link has the word *token* inside it, so the assistant played safe and held it back.

## What Changes

- **The assistant shows the sign-in link the moment setup prints it, then waits.** Both setup messages a person copies from the app now ask for the link in so many words. The setup tool also says, right beside the link, to show it to the person now and that it is safe to show.
  ```text
    BEFORE                  AFTER
  you       assistant     you       assistant
   │─ set up ───▶│         │─ set up ───▶│
   │◀─ waiting ──│         │◀─ +link ────│
   │─ the link? ▶│         │  sign in    │
   │◀─ link ─────│         │◀─ what works│
  ```
- **Nothing else from the sign-in is shown.** Passwords, keys and the rest of the sign-in output stay out of the chat, as before. The link is checked first: only this business's own sign-in address is ever passed on.
- **A person already connected does nothing.** The new wording reaches people the next time they copy the setup message.

**Non-goals:** changing how sign-in works, opening the browser for the person, or changing a downstream app that carries its own setup message.

## Decision log

- **2026-10-13** — Asked it seems like it didn't print a link when I ran this command, can you fix it → chose fix it and publish.
- **2026-10-13** — Assumed: the cause is the wording, not a missing link, because the picture shows the setup tool had printed the link and the assistant sent it only when asked.
- **2026-10-13** — Assumed: the link is safe to show, because the setup tool already passes on only this business's own sign-in address and drops anything that holds a login.
- **2026-10-13** — Assumed: the apps-only setup message changes too, though it was kept word for word until now, because it said to show the link only when no browser is there, and an assistant can not tell.
- **2026-10-13** — Assumed: the Claymoo app's own setup message, the one in the picture, is fixed in its own project, because it is a separate copy this change can not reach.
- **2026-10-13** — Archive checkpoint: built in one pass with every task ticked and the local checks green; the setup tool was re-pinned, numbered 40.9.1 and saved for the check before publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: adds the promise that setup shows the person its sign-in link at once and nothing else from the sign-in.

## Impact

`scripts/employee-bootstrap.mjs` and `scripts/company-api.mjs` print a new sign-in line; `app/worker/employee-access/prompt.ts` rewords both texts; `app/worker/employee-access/bootstrap-release.json` is re-pinned to the new bootstrap bytes. Tests beside each, `wiki/stack/employee-project.md`, and a `CHANGELOG.md` patch entry. No data, migration or dependency changes.
