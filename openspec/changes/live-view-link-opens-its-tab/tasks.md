# Tasks

## 1. The link names its chat

- [x] 1.1 In `.agents/plugins/browser/hand-over/scripts/hand-over.mjs`, give `addressOf` an optional chat (design decision 1) and pass `CHAT` from `open --view` and `joinView`; `listingOf` and the watch link stay plain.
- [x] 1.2 In `scripts/tests/hand-over.test.mjs`, check that a first view's and a joining chat's `HANDOVER_LINK` end in `&chat=<that chat>`, and that `listingOf`'s `url` has no `chat`. Verify: `node --test scripts/tests/hand-over.test.mjs`.

## 2. The page opens that tab

- [x] 2.1 In `.agents/plugins/browser/hand-over/scripts/view-page.mjs`, add and export `linkOf(hash)` and `tabToOpen(view, chat)`, and in `start` call `/show` once before the first render when `tabToOpen` names a tab (design decisions 2 and 3); a 409 or failed call renders the first `/view` answer.
- [x] 2.2 In `scripts/tests/view-page.test.mjs`, test `linkOf` (key only, key and chat, an encoded name, an empty `#` part) and `tabToOpen` (the named tab not shown → it; already shown → null; no such tab → null; a watch view → null; no chat → null). Verify: `node --test scripts/tests/view-page.test.mjs`.

## 3. Docs and release

- [x] 3.1 In `.agents/plugins/browser/hand-over/references/live-view.md` § *What the link can do*, change *sends you the same link* to say the link opens on its tab, with an equal cut on the page. Verify: `node scripts/measure-context.mjs --check`.
- [x] 3.2 Add a `## Next (patch) — A chat's live-view link opens its own tab` entry at the top of `CHANGELOG.md`, with *Updating.* Nothing to do by hand.

## 4. Checks

- [ ] 4.1 Run `openspec validate live-view-link-opens-its-tab --strict --no-interactive`, `node --test scripts/tests/hand-over.test.mjs scripts/tests/view-page.test.mjs`, `node scripts/check-payload-links.mjs`, and `node scripts/measure-context.mjs --check`.
- [x] 4.2 In a throwaway browser by `wiki/maintaining/test-a-live-view.md`, open views from two chats; open the second chat's link while the first tab shows. Verify: the second tab shows, and the first tab's page is as it was.
- [ ] 4.3 `/save`, then confirm CI passes on the saved change.
