# Tasks

## 1. Welcome note in Access

- [x] 1.1 Add `welcomeNote(status, person)` in `app/src/apps/access/` building the note from the page origin, the email and whether the person may connect; unit tests cover may-connect by own set, by role, an install not handing out its project, and a person who may not connect
- [x] 1.2 Carry the new email in the saved result (`saidSchema` optional `welcome`), passed by `PersonPage` only when adding, and render the note with `CopyText` in `Notices` under *Saved.*; a failed save shows none; test it in `PersonPage.test.tsx` or `App.test.tsx`
- [x] 1.3 Show the same note on an active person's page under the sign-in line; test it

- [x] 1.4 Make the note forwardable: when the person may connect, it says to install an assistant if needed (Claude Code or Codex, with their install links), to paste the message below into its chat, and to sign in with their email, then carries the viewer's own setup message from `/api/access/setup` unchanged; without a ready message it falls back to address and email; update `note.test.ts` and the Access tests

- [x] 1.5 Replace the inline note with a popup: open it after a save that newly gives a person the project (added or listed, own set or role, from the person page or the People row's role pick), with the message, Copy and Done; no popup for other saves or a failed save; remove the note from the Saved notice and from the person's page; test each case
- [x] 1.6 Add a fold-out *Message to send them* under a saved person's own *Can install the project* tick while it is ticked, holding the same message; none on a role; test it

## 2. Install step in Connect your assistant

- [x] 2.1 Add a first step *Have an AI assistant on your computer* with install links for Claude Code and Codex, named as examples, in `AssistantSetup.tsx`; update `AssistantSetup.test.tsx` for four steps and the links

## 3. Docs and release

- [x] 3.1 Update `wiki/stack/employee-access.md` (Add person: the note to send) and the page owning the Connect steps if it lists them; add a `## Next (minor) — A clear invite for teammates` entry to `CHANGELOG.md`

- [x] 3.2 Update the wiki's Add person text and the CHANGELOG entry for the forwardable message

- [x] 3.3 Update the wiki's Add person text and the CHANGELOG entry for the popup and the fold-out

## 4. Verification

- [x] 4.1 Run the app's lint, type check and tests locally and confirm they pass
