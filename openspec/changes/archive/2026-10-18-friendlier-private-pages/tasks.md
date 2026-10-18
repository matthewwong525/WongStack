# Tasks

## 1. Shared look

- [x] 1.1 Add `.agents/skills/hand-over/scripts/private-page.css` (light and dark custom properties, card, step circles, buttons, tick and refusal marks, private-link label) and serve it at `/page.css` from `pages()` in `hand-over.mjs` with the existing headers and `text/css`; verify a `hand-over.test.mjs` case fetches `/page.css` from an open link with those headers.

## 2. Key page

- [x] 2.1 Add the optional `why` guide field in `keys.mjs` (`GUIDE_FIELDS`, `LIMITS.why = 140`, one line) and pass it through `describeKeys`; verify `keys.test.mjs` covers an accepted `why`, a too-long one, and a multi-line one.
- [x] 2.2 Rebuild `keys-page.html`/`.mjs` per design Decisions 3, 5, 6, 7: header with label, title, `why`, privacy line; one card per key; steps in circles ending in *Paste it here*; *We'll check it with <host>*; `N of M saved`; *All set* finish; readable name with code name beneath; `Open until` clock; *Not now*. Verify `keys-page.test.mjs` is updated and extended for each, with existing behavior tests (partial saves, refusal, Save anyway, multi-line paste, key file, closed link) still passing.

## 3. Password page and private form

- [x] 3.1 Move `passwords-page.html` onto the shared stylesheet with the label, the privacy line at the top, *assistant* for *agent*, and *Not now*; verify `passwords-page.test.mjs` passes with its text updated.
- [x] 3.2 Move `form-page.html`/`.mjs` onto the shared stylesheet with the label, *Your assistant never sees what you type.* above the fields, the shortened submit line, the `Open until` clock, and *Not now*; verify `form-page.test.mjs` passes with its time and button tests updated.

## 4. Docs and release

- [x] 4.1 Update `wiki/development/secrets.md` (the `why` field in the guide example, a *Connect Stripe*-style title), `wiki/stack/api-keys.md`, `wiki/development/passwords.md`, and `wiki/development/browsing.md` for *Not now*, the clock, and the what-it's-for line; verify `rg "Close without (continuing|sending)|Closes in [0-9]+ min" wiki .agents` finds only intended mentions.
- [x] 4.2 Add a `## Next (minor) — Friendlier private pages` entry to `CHANGELOG.md`; verify `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` pass.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and the hand-over tests; verify they pass.
- [x] 5.2 Open each page at 390x844 in light and dark through a local server with made-up keys (one guided key, two keys with one unguided, a refusal, all set; the password page; a card form) and show the screenshots in the chat; verify each matches its sketch.
- [x] 5.3 Open a real key link through the tunnel at phone size (390x844) with a made-up guide, and confirm the look, the clock, and *Not now*.
