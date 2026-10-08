# Tasks

Build sections 1–3 together, authoring each group's tests and docs beside its code. The boxes in 1–3 are checked by source review; section 4 is the one gate.

## 1. Actions on a reply link (hand-over scripts)

- [x] 1.1 Add `--action <name>=<message>` to `reply-link.mjs open` and `actions` to `openReplyLink()`, with the limits in [design 1](design.md), stored in the registration and replaced on re-open; update the usage text and the header comment. Verify by review that a bad name or message exits 2.
- [x] 1.2 Add `POST /p/<id>/act` and the `actions` and `version` fields of `alive` ([design 2](design.md)). Author tests in `scripts/tests/reply-link.test.mjs`: the chat gets the registered message exactly and nothing from the request; an unknown action is 400; a stale version is 409 and wakes nothing; a second accepted trigger is 409; an unconfirmed wake is 502 and can be retried; no key is 403; `alive` lists the names and a version that changes when the file does.

## 2. The plan page and its builder (plan skill)

- [x] 2.1 Make `build-review.mjs --link` register `build` and `publish` with the messages in [design 3](design.md). Extend `scripts/tests/review.test.mjs` to assert both messages name the change and that a run without `--link` is unchanged.
- [x] 2.2 Add the ready section to `review-kit.html` ([design 4](design.md)): hidden from disk and until `alive` lists both actions, the confirm step, the unsent-notes stop, and each answer's wording. Keep one `<script>` and one `<style>`. Extend `scripts/tests/review-browser.test.mjs`: from disk no section; live, *Build it* posts `build` once and shows the asked line; *Build and publish* posts nothing until *Yes, publish*; an unsent note stops both; a 409 changed shows the reload line; a 410 hides the section.

## 3. Docs and the release

- [x] 3.1 Add actions to `wiki/development/reply-links.md` (the flag, the route, the snippet for another page's button, and that a page can never change a message) and the two buttons to `wiki/ux-principles.md#the-review-file`. Verify with `node scripts/check-payload-links.mjs`.
- [x] 3.2 Add the `## Next (minor) — …` entry to `CHANGELOG.md` in plain words, saying the link can now start a build and a publish, with an **Updating.** note that nothing needs doing. Verify that `VERSION` is unchanged.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate build-from-plan-page --strict --no-interactive`; fix what fails.
- [x] 4.2 Walk it from this host on a throwaway plan with a phone-sized browser: *Build it* reaches this chat once with the fixed message; a second tap sends nothing; rebuild the page and confirm an old tab is told to reload. Record the results in the Decision log.
