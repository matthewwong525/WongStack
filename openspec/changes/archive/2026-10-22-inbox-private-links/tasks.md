# Tasks

## 1. App: link items

- [x] 1.1 Add `schema/migrations/20261023120000_inbox_link_items.sql` rebuilding `inbox_items` with `link` among its kinds, in one transaction (design decision 1). Extend the data-pipeline test to apply it to a database holding inbox rows and check none are lost.
- [x] 1.2 Extend `app/worker/apps/inbox/item-put.ts` to take `link` items, checking `{what, url}` by design decision 1, and make `tap.ts` refuse taps on them. Extend `api.test.ts`: a `link` with an `http`, non-tunnel, credentialed or over-long address is refused; a tap on a `link` gets 400; another person never sees one; a closed `link` leaves `GET items`.
- [x] 1.3 Add `LinkRow` to `app/src/apps/inbox/` and list `link` items under *Needs you* after questions (design decision 3). Test that the row shows the title, kind word and closing time, and that *Open* is a new-tab link with `noopener noreferrer` and no tap.

## 2. App: decisions

- [x] 2.1 Change `drafts.ts` and `Decision.tsx` by design decision 4: drop the note, always show *Or type your own answer* on questions and approvals, make typing pick it and picking a choice deselect it, send own words as `send`, and point `N` at the box. Update `App.test.tsx`: typing after a pick sends only the words; an approval's words send `send`, not `approve`; an old draft with a `note` still reads; `N` focuses the box.
- [x] 2.2 Add tick-several questions by design decision 4: `npx shadcn@latest add checkbox` from `app/`, a `multi` flag accepted by `daily.mjs` `detailOf` and set by `chief.md` when the agent's question allows several answers, `{ticks, own}` drafts, and one `send` carrying the ticked labels then the words. Test: typing unticks nothing; ticks and words arrive together in order; words alone or ticks alone can be sent; nothing ticked or typed can't. Extend `daily.test.mjs` for `multi`.
- [x] 2.3 Add `linkify.tsx` and use it in the question heading and choice labels, turning choices into `div role="radio"` rows (design decision 5). Test: an `https` address becomes a new-tab link and tapping it picks nothing; `javascript:` and bare words stay text; trailing punctuation is left out of the link; click, Enter and Space pick a row and `aria-checked` follows.

## 3. Computer: listing links

- [x] 3.1 Add `listLink` to `lib/inbox.mjs`, with a 3 s limit and no thrown error (design decision 2). Make `hand-over.mjs`'s `watch` process list each link after it answers and close the item on every recorded end. Make `reply-link.mjs` list a non-plan page and close it on `close` and stop. Build the login address without `user`.
- [x] 3.2 Replace the boundary test in `scripts/tests/hand-over.test.mjs` with one that runs each mode (keys, passwords with site and username, form, view) against a fake client. It checks that only `{id, what, title, url, closesAt, workspace}` is sent, that no value, username, note or picture is, and that the item closes on done, close, deadline and gave-way. Add reply-link tests: a form is listed and closed; a plan is not listed as a link; a listing that hangs past 3 s doesn't delay `REPLY_LINK`.

## 4. Daily: answered in its own chat

- [x] 4.1 Extend `daily.mjs` by design decision 6: `inboxAdd` keeps `{id, agent, at, request}`, and `watch` closes and prints `answered-elsewhere` for an item whose agent moved on with no chief reply since. Add one line each to `references/chief.md`, for `answered-elsewhere` and for words on an approval, offset by a cut in the same file. Extend `scripts/tests/daily.test.mjs`: a card answered in its own chat closes; a stopped agent that runs closes its item; an agent the chief just replied to keeps its item; old plain-id state still reads.

## 5. Docs and release

- [x] 5.1 Update `wiki/development/browsing.md` (every private link is also listed in the inbox, address only), `wiki/development/reply-links.md` (forms are listed and open by link; one own-answer box; links in decisions), `wiki/development/passwords.md` (a link opened from the inbox asks for the username) and `wiki/development/daily.md` (answered in its own chat). Run `node scripts/check-payload-links.mjs`.
- [x] 5.2 Add a `## Next (minor) — Every private link and form listed in your inbox` entry to `CHANGELOG.md`. Its **Updating.** note: no step is needed; links show in the inbox once the computer is signed in to the app; decisions take your own words in one box.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and `cd app && npm test`; all pass, including `measure-context.mjs --check` after bringing `main` in.
- [x] 6.2 After implementation, `/save`. On the preview, signed in as the person, confirm: a throwaway key link and a throwaway form each show under *Needs you*; *Open* reaches them in a new tab; each row leaves once its link is done or closed. A throwaway question with a link in it opens the link without picking. Typed words reach a throwaway chat alone. A throwaway question answered in its own chat leaves the inbox at the next watch round.
