# Tasks

## 1. Reply links

- [x] 1.1 `reply-link.mjs`: any page file goes to the inbox as a `plan` item, with `lib/bridge.js` first in its `<head>` in the uploaded copy only. Verify in `reply-link-inbox.test.mjs`: the uploaded body starts with the bridge, the file and its version stay as written, and a review-kit page gets no bridge.
- [x] 1.2 Add `lib/bridge.js`. Verify a jsdom case: `alive` waits for the hello, `send` and `act` answer from the port, an old version answers 409, other calls pass through, a link opens its own tab, and a closed page answers 410.
- [x] 1.3 Add `hasApp(cwd)` to `lib/inbox.mjs`; `openLink` goes inbox-only when it is true, with `signed-out` and `inbox-down`; remove `listPage` and `unlist`; add `openReviewLink`; raise `PROTOCOL` to 17. Verify: an app project signed out or with the inbox down never calls the tunnel; a no-app project still gets one; `hasApp` answers for a subfolder, an older install, a helper alone, and a folder outside a checkout.

## 2. The loop

- [x] 2.1 `build-review.mjs`: `linked()` returns `{link, reason}` and still takes a bare string; `linkLines` adds the sign-in line when signed out; an `Optional` need. `preview-review.mjs` prints `previewLines`. The profile's `reviewLink` calls `openReviewLink`. Verify in `review.test.mjs` and `preview-review.test.mjs`, the `--link` tunnel case run outside a checkout.
- [x] 2.2 Update the loop README's `reviewLink` row and the ask convention's link line, within the instruction budget. Verify `node scripts/measure-context.mjs --check`.

## 3. Inbox

- [x] 3.1 `Waiting.tsx`: *Open* and *Nothing open.*; `Archive.tsx` → `Artifacts.tsx` with its heading, search label and empty texts; tests, comments, `payload-files.json` and the verification journeys follow. Verify `npm test` in `app/`.

## 4. Docs and release

- [x] 4.1 `wiki/development/reply-links.md`: every page in the inbox, signed out, no-app tunnel, new reasons, *Open* and *Artifacts*; move its page-author half to `reply-link-pages.md` with the key line and the bridge; link the new page from the development hub, the seed hub and `payload-files.json`. Verify `node .github/scripts/wiki-links.mjs` and `node scripts/check-payload-links.mjs`.
- [x] 4.2 Rename the inbox lists in `review-pages.md` (and the *Optional* need), `plain-pages.md`, `daily.md`, `first-day/use-skills.md`, `stack/mini-apps.md`; `required-tools.md` says a reply link needs `cloudflared` only with no app.
- [x] 4.3 Retire `inbox/Archive.tsx` and *Nothing waits for you* in `scripts/retired-names.json`; add a `## Next (minor)` entry to `CHANGELOG.md`. Verify `node scripts/check-retired-names.mjs`.

## 5. Checks

- [x] 5.1 Run `node scripts/payload-checks.mjs`, oxlint, the script tests and the app's tests; all pass.
