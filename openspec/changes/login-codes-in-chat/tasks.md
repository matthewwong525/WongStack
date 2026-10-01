# Tasks

## 1. Password link pre-fill

- [x] 1.1 `hand-over.mjs`: accept `--site` and `--username` with `open --passwords` only (usage error otherwise), and print them URL-encoded in the link's fragment beside the key; update the usage text and header comment
- [x] 1.2 `passwords-page.mjs` / `passwords-page.html`: read `site` and `user` from the fragment, pre-fill the add-a-login form, title the page *Save your <host> login*, focus the first empty field; no change without them
- [x] 1.3 Tests: `hand-over.test.mjs` covers the flags, the usage errors, and the fragment; `passwords-page.test.mjs` covers the pre-fill, the title, the focus, a pre-filled form saved by *Save and continue*, and that the server never receives the fragment

## 2. Wiki

- [x] 2.1 Write `wiki/development/login-codes.md`: when a code step after a saved login happens, emailed codes read from the signed-in inbox, codes asked in the chat, app approvals, wrong or expired codes, and what still goes to the hand-over, per `design.md`; links up to `browsing.md` and sideways to `passwords.md`
- [x] 2.2 `wiki/development/browsing.md`: step 2 sends no match or a rejected login to the pre-filled password link and a code page to the new page; drop "a login" and "a code sent to you" from the hand-over *When* list, keeping single sign-on and other on-page-only steps
- [x] 2.3 `wiki/development/passwords.md`: the agent also offers the link, site filled in, at a login with no saved or a rejected password; document `--site` and `--username`
- [x] 2.4 List the new page under Browsing in `wiki/development/README.md`

## 3. Release

- [x] 3.1 Add a `## Next (minor) — Log in with fewer taps` entry at the top of `CHANGELOG.md`
- [ ] 3.2 Pass the payload and wiki checks in CI through `/save`
