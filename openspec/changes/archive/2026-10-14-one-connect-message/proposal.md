# One connect message for every assistant

**Status:** ready-to-ship
**Branch:** flying-mole
**Open questions:** none

## Why

Connecting an assistant takes a long message that comes in two versions and carries a web address and a 64-character fingerprint. Setup then puts the project in a fixed folder in your home. The owner made this simpler in his own app and wants WongStack to work the same way.

## What Changes

1. **One short message, the same for everyone.** The popup no longer picks between a project message and an apps-only one. Setup itself works out what you are allowed and does that. The lines about fingerprints, private folders and never printing credentials are gone.
   ```text
   Set up my company's project for me
   in this folder.
   Download <link> and run it with node.
   Print the sign-in link it shows into
   the chat and wait while I sign in.
   Then tell me what works and what
   is left.
   ```

2. **The assistant downloads the setup file from your own app, at a fixed public link.** The link is your app's address plus a fixed ending, the same for everyone and every time, so the message never changes or goes stale. It needs no sign-in. The file is the setup script WongStack already publishes openly, plus your app's address; it holds no key, and nothing works until the person signs in.
   ```text
     BEFORE                AFTER
   file from a fixed     file from a fixed
   address on GitHub     address on your app
        │                      │
        ▼                      ▼
   assistant checks      assistant runs it
   a fingerprint
        │
        ▼
   assistant runs it
   ```

3. **Setup installs into the folder the chat is in.** It no longer uses a fixed folder in your home.
   ```text
   folder holds       │ what setup does
   ───────────────────┼─────────────────────
   nothing            │ installs the project
   our read-only copy │ updates it
   another copy of it │ signs in, leaves it
   other files        │ stops, changes nothing
   ```
   The downloaded setup file removes itself when it finishes, so no stray file is left in the folder.

4. **No more matching a fingerprint at each release.** WongStack no longer records a fixed address and fingerprint for the setup file, so an app can never show *Ask your employer to finish the reviewed assistant setup*.

**Non-goals:** saving or publishing through the app (planned in its own workspace, *Save through the app*); a sign-in with no tap at all; a sign-in page that opens by itself (the printed link is enough); changing who may install the project; removing Cloudflare's sign-in tool from setup; any change to an install's sign-in wall.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: one setup message for everyone, the setup file served by the app at a fixed public link, and setup that installs into the folder it runs in.

## Impact

- `app/worker/employee-access/prompt.ts`, `setup.ts`, a new setup-file module and its route in `app/worker/index.ts`; `bootstrap-release.json` removed.
- `app/src/components/AssistantSetup.tsx` and `app/src/lib/access.ts`.
- `scripts/employee-bootstrap.mjs` and its tests.
- `wiki/stack/employee-project.md`, `wiki/stack/mini-apps.md`, `wiki/stack/cloudflare-access.md`.
- `CHANGELOG.md` (minor), `scripts/retired-names.json`, the payload file lists.

## Decision log

- **2026-10-13** — Asked how Connect should get simpler → chose the shape of his ClaymooApp plan `one-connect-message`, by pointing to it twice.
- **2026-10-13** — Asked how the two parts should run → chose simpler Connect here and saving through the app in a new workspace.
- **2026-10-13** — Asked what a teammate may do through the app without GitHub → chose save only; planned in the other workspace, not here.
- **2026-10-13** — Assumed: the setup file is served under the opening every install's sign-in wall already has for memory, because the publish check matches the wall exactly, so a new opening would stop every existing install publishing until its owner reran a Cloudflare step.
- **2026-10-13** — Assumed: a preview's link needs a sign-in, because only the live app has that opening; the check before publishing fetches it with the checker's own sign-in.
- **2026-10-13** — Assumed: a person who lacks the tick to install the project still gets no message and a greyed card, because who may connect is not part of this change.
- **2026-10-13** — Assumed: the "install Node, cloudflared or Git if missing" line leaves the message, because setup already names the missing tool, where to get it, and to run again.
- **2026-10-13** — Assumed: setup keeps Cloudflare's sign-in tool, because the ClaymooApp plan keeps it and replacing it means the app issuing its own device sign-ins.
- **2026-10-13** — Assumed: a message copied before this ships keeps working, because the fixed public address it names stays reachable.
- **2026-10-13** — Asked, in a review note, to keep a fixed public link → chose a fixed link on the app in place of the ten-minute one; the links table and the ten-minute line are dropped.
- **2026-10-13** — Assumed: "a fixed public link" means one on the person's own app, not today's GitHub address, because the GitHub address needs the fingerprint that makes the message long.
- **2026-10-13** — Asked, in a review note, whether the sign-in page should open by itself → chose printing the link only; the change is dropped.
- **2026-10-13** — Asked what next, with the notes applied → chose build and publish.
- **2026-10-13** — Assumed: a person with no project keeps a private copy of the setup script to call their apps with, because the downloaded file removes itself and they would otherwise download again for every call.
- **2026-10-13** — Assumed: "another copy of the project" is a Git folder that holds the setup script and did not come from the app, because the recorded app address can differ from the one people use.
- **2026-10-13** — Assumed: the no-sign-in fetch from the live app is checked right after publishing, not as a task, because only the live app has the opening and a plan can not be archived with a task that waits on its own publish.
- **2026-10-13** — Saved: the build is written and its local checks pass; the two preview checks (tasks 5.2, 5.3) and the live no-sign-in fetch are still to run.
- **2026-10-14** — Checked on the preview with the owner's own sign-in: the fixed link served the setup file carrying the preview's address; run with nothing typed in an empty folder it installed the project there and removed itself; a second run said up to date. The message was read from the route the popup reads, not from the screen.
- **2026-10-14** — Assumed: signing in waits ten minutes, up from two, because the first real try timed out before the owner could tap the link. Said to the owner before publishing; not objected to.
- **2026-10-14** — Archived for publishing: every task is ticked; the no-sign-in fetch from the live app is checked right after it goes live.
