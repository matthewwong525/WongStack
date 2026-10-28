# Tasks

## 1. Link tool

- [x] 1.1 In `.agents/skills/hand-over/scripts/hand-over.mjs`, add the `SEND_REMINDER` constant with its comment, print `HANDOVER_SEND=${SEND_REMINDER}` right after `HANDOVER_LINK=` in `startLink`, and name it in `open`'s usage text. Verify by reading the diff: one new print, no other output changes.
- [x] 1.2 In `scripts/tests/hand-over.test.mjs`, make `opened` assert the `HANDOVER_SEND=` line sits right under `HANDOVER_LINK=` and holds no `https?:`, `key=` or `trycloudflare`; make the refused second-open test and the never-answers test assert no `HANDOVER_(LINK|SEND)=` line.

## 2. Wiki

- [x] 2.1 Add the *Send it last* bullet after *Ask first* in `wiki/development/browsing.md#how-private-links-work`; trim the nearby *Always through Cloudflare* and *Is a link safe?* text so the page stays under 3,000 words, keeping every fact. Verify with `wc -w`.
- [x] 2.2 In `passwords.md` (*How*), `live-view.md`, `private-form.md` and `secrets.md` (step 3), replace "send the `HANDOVER_LINK` it prints, and run `wait` in the background" with "run `wait` in the background, and then [end your turn with the `HANDOVER_LINK` it prints](browsing.md#how-private-links-work)"; the password page adds "as its `HANDOVER_SEND=` line says".
- [x] 2.3 Add `## Next (minor) — Private links come in the last message` at the top of `CHANGELOG.md`'s entries: the link comes in the agent's last message, and the tool prints a reminder under it. **Updating.** Nothing to do.

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/hand-over.test.mjs`; it passes.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree`; it passes (links, word cap, context).
- [x] 3.3 Before the first `/save` opens the pull request, show the person its title and body (why every install needs it) and wait for a yes; then `/save`.
