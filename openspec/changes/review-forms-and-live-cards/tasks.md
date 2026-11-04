# Tasks

## 1. Builder

- [x] 1.1 `build-review.mjs`: the `live` fence (`folder:`, optional `height:`): read `index.html` inside the page root, inline local styles, scripts, pictures and fonts as data URIs through the extended byte checks (GIF, SVG as text, WOFF, WOFF2), stop on any `http:`, `https:` or `//` address, prepend the CSP meta and the `review.answer` shim, and write a sealed `<iframe sandbox="allow-scripts" srcdoc>`; 800 KB a card, warn over 800 KB a page, stop over 1.5 MB (`PAGE_MAX`); verify in `review-pictures.test.mjs` with a fixture folder, a web address, a path outside the root, and an oversized card
- [x] 1.2 The `form` fence (`text`, `long`, `choice`, `choices`, `date`, `tick`, `file` with types and count), drawn as real inputs with stable question ids; stop on an unknown kind or type, over 12 questions, and on a secret-like label with the private-key pointer; verify in `review.test.mjs`
- [x] 1.3 The `## What the build needs` section: bullets with `Ready` or `Needs you`, an optional `form` fence and one `https` link per item; drawn after the cards and before Decisions; stop on a bullet with neither state; verify in `review.test.mjs`
- [x] 1.4 `.agents/skills/plan/references/drawings.md`: one line each for `live` and `form`, with offsetting cuts

## 2. Kit

- [x] 2.1 `review-kit.html`: the live card: `review:hello` port on first load, newest answer per card kept as a note (2,000 characters) and sent as *Card #n answer*, a second load resets the card with its message, *Phone* / *Computer* scaled widths, *Full screen* in the viewer; styles in the one `<style>` with the look's colors
- [x] 2.2 Form answers saved, restored, and sent with the notes and with any bar action, as `- Card #n, "<question>": <answer>`; a file box with drop and pick, the limits checked on the page, *Never send a password, key, or card here*, and a per-file state (sending, sent, refused with the reason)
- [x] 2.3 Files: upload each picked file at once (tunnel `POST file`, or `inbox:file` over the port), keep its id, and send `files` with the send or action; a failed upload stays retryable
- [x] 2.4 Needs list: count open items, answered on the page or not; while any is open, each bar button except *Send notes* reads *N things need you* and scrolls to the first open item
- [x] 2.5 Browser tests in `review-browser.test.mjs` at 320 px: a live card sends an answer, fails to fetch the web, and is reset after it navigates; width switch and full screen; a form answered and sent; a file too big refused; a needs list holding Build until answered; plan, preview, and ads pages unchanged otherwise

## 3. Reply links and files on the computer

- [x] 3.1 `reply-link.mjs`: `POST file` with `x-reply-key`, name, question, raw body up to 25 MB streamed to disk and 100 MB a link; first-bytes check against the name's type; write `<uploads>/<id>-<safe name>` with mode `0600`; `--uploads <dir>` with the `.scratch/<name>-uploads/` default; `send` and `act` take `files` and add `Files:` lines with question, name, size, and path; unsent files deleted when the link closes; verify in the reply-link tests, including a missing key and a mismatched type
- [x] 3.2 `lib/inbox.mjs`: read each claimed tap's files with `GET /api/inbox/files/:id`, check and write them as 3.1 does, add the same `Files:` lines, and report `sent` only once they are written; verify in its tests with a fake app

## 4. App

- [x] 4.1 New migration in `schema/migrations/`: `inbox_files` and `inbox_file_parts`, keyed and scoped like the inbox's other tables
- [x] 4.2 `app/worker/apps/inbox/`: `POST items/:id/files` (open item, its person, 25 MB a file streamed into 1 MB parts, 100 MB an item, 300 MB waiting an install, allowed types), `GET files/:id` for the computer, deletion on `tap-result` `sent`, on cancel and failure, and at any inbox call after 24 hours; the item lists the files still held, a tap naming a deleted one is `files_gone`, and each part read holds the check-in's taps; `inbox:tap` and claim carry `files`; `LIMITS.bodyBytes` to 1.6 MB; verify in `api.test.ts`, including another person's file and an expired file
- [x] 4.3 `app/src/apps/inbox/PlanView.tsx`: accept `inbox:file` only from the item's own port, upload it, answer `inbox:file-result`, and pass `files` with the tap; verify in `PlanView.test.tsx`

## 5. Plan and apply skills

- [x] 5.1 `plan/SKILL.md`: write `## What the build needs` for every plan (keys through `company-api.mjs services` and `.env`, logins through `browse.mjs logins`), and make a website this app doesn't run as a `live` prototype in `<change>/prototypes/<site>/`; offset the words so `node scripts/measure-context.mjs --check` passes
- [x] 5.2 `apply/SKILL.md` and `apply/references/build-helper.md`: build a site from its approved `prototypes/<site>/`, then pass the approved card's and the built page's pictures at 390 and 1280 px to `preview-review.mjs --approved`; a need still open stops the build with what is missing

## 6. Docs and release

- [x] 6.1 `wiki/review-pages.md`: live cards, website prototypes, forms, files and their limits, and the needs list, with a row each in the card table; `wiki/development/reply-links.md`: files on a reply link and in the Inbox, unreadable after 24 hours and deleted at the next Inbox use
- [x] 6.2 `CHANGELOG.md`: a `## Next (minor) — Review pages that ask and run the real thing` entry, with an **Updating.** note that the app's next deploy adds the file tables

## 7. Verification

- [x] 7.1 Pre-check: `node .github/scripts/checks.mjs --worktree` and the app's tests pass
- [ ] 7.2 `/save`, then on the preview: an ads review page in the Inbox with a live card, a form, and a logo file; tap *Approve*; the chat gets the answers and the file's path, and the app no longer holds the file
- [ ] 7.3 The same page through a tunnel reply link on a phone-sized browser: a file sent, the needs list holding *Build it* until answered
