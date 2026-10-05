# Tasks

## 1. Prove the typing route

- [x] 1.1 With a throwaway local page holding a text box inside a cross-origin frame, confirm a snapshot ref can be focused and typed into over agent-browser's local input feed from a Node script, using a named session and never `close --all`; record the result in the Decision log, and stop to re-plan if it fails for same-origin fields too

## 2. The private form (script and page)

- [x] 2.1 Add `.agents/skills/hand-over/scripts/form.mjs`: validate the form file by the limits in design.md, serve the form's routes, and on send fill each field, press the submit target once, and refuse a second send; add `scripts/tests/form.test.mjs` covering a valid file, each rejected shape, the order of browser calls, no value in any recorded command, and the refused second send
- [x] 2.2 Add `form-page.html` and `form-page.mjs`, mirroring the key page: title, note, one labelled box per field with its autofill kind, a dropdown with the given choices, the named button, *Close without sending*, time left, and the *Sent* and *Not accepted* end states; add `scripts/tests/form-page.test.mjs` covering each state at phone width
- [x] 2.3 In `hand-over.mjs`, add `open --form <file>` requiring `--until` or `--until-gone`; after the send, wait up to 60 seconds for the finish, clear the filled text boxes when it is not reached, and report `HANDOVER_RESULT=not-accepted` with no readiness notification; extend `scripts/tests/hand-over.test.mjs` for both outcomes, the clearing calls, and the usage errors

## 3. Remove the live browser link and the local link

- [x] 3.1 Delete `hand-over-page.html`, `hand-over-page.mjs`, and `scripts/tests/hand-over-page.test.mjs`; remove from `hand-over.mjs` the `handOver` mode, field scan, autofill rules, field, action, navigation and viewport routes, stream pass-through, blank-tab clean-up, and viewport reset; make `open` with no mode a usage error; delete the tests that covered them and verify `node --test scripts/tests/hand-over.test.mjs` names no removed route
- [x] 3.2 Remove `--local`; print `HANDOVER_LINK` only once the tunnel's public address answers, failing as a tunnel that never started does; move `keys.test.mjs`, `passwords.test.mjs`, and `hand-over.test.mjs` off `--local` onto the fake tunnel tool and the recorded loopback port, and add tests for the wait and its failure
- [x] 3.3 Add the deleted file names and the `hand-the-browser-over` anchor to `scripts/retired-names.json` with their replacements, and update the script's header comment and usage text to the three remaining modes

## 4. Wiki and rules

- [x] 4.1 Rewrite `wiki/development/browsing.md`: replace *Hand the browser over* with *When a step needs you* and *Private links* (the form's procedure, the *Ready?* question, closing, wake-up, safety), fix saved-login step 3 for provider sign-in, and the pictures bullet; verify the page stays under 3,000 words
- [x] 4.2 Update `passwords.md`, `secrets.md` (no net growth), `login-codes.md` (backup code to the private form, emailed sign-in link, the *What still goes to the hand-over* section), `blocked-sites.md` (step 4 and the refusal wording), `required-tools.md` (every private link needs the tunnel tool), `kept-checks.md`, `repository-improvement.md`, and `wiki/development/README.md` to the new routes and anchors
- [x] 4.3 Update the browsing rule in `AGENTS.md` and the payment note on `wiki/people/matthew-wong.md`: his email and the terms are asked in the chat, the card goes in the private form
- [x] 4.4 Update `.agents/skills/hand-over/SKILL.md`, the hand-over line in `.agents/skills/close/SKILL.md`, `.agents/skills/verify/references/walkthrough.md`, the `browser` area's definition in `.agents/skills/memory/references/areas.json`, and the message in `scripts/employee-bootstrap.mjs`, with no net growth in skill text

## 5. Release

- [x] 5.1 Add the `## Next (major)` entry to `CHANGELOG.md` with the **Updating.** note from design.md, leaving `VERSION` alone

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate "secure-form-replaces-hand-over" --strict --no-interactive`; fix what this change broke
- [x] 6.2 Run `/save`, then open a real private form through Cloudflare against the throwaway page at phone width: fill it, send it, and show the person pictures of the form, *Sent*, and *Not accepted*; confirm no value appears in the watcher's files, the tunnel log, or the process list during the send
- [x] 6.3 Open a real password link and key link through Cloudflare from this computer and confirm each opens on the first tap and saves; record what could not be checked (Google sign-in, the cloud browser's input feed) as open threads
