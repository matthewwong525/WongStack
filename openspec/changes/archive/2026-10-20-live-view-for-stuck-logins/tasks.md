# Tasks

## 1. Password link: optional password on email-first logins

- [x] 1.1 `hand-over.mjs open --passwords` takes `--email-first` (only with `--site`) and carries `emailFirst` in the link's fragment beside `site` and `username`; usage text updated. Verify: `hand-over.test.mjs` case for the fragment and for `--email-first` without `--site` exiting with usage.
- [x] 1.2 `passwords-page.html`/`.mjs`: with `emailFirst`, the password box is labeled *Password (optional)*, drops `required`, shows *Leave it blank if the site sends you a code.*, and *Save and continue* sends a typed login with an empty password; without it nothing changes. Verify: `passwords-page.test.mjs` cases for both.
- [x] 1.3 `passwords.mjs` `checkLogins` accepts an empty password only on a login flagged `emailFirst`, and saves it as `password: ''`; an export row or an unflagged login still needs one. Verify: `passwords.test.mjs` cases for each.
- [x] 1.4 `browse.mjs login` with `--password` on a saved login whose password is empty types nothing, submits nothing, and prints `BROWSE_LOGIN=missing`; `--username` only still types the email (`typed`). Verify: `browse.test.mjs` cases for both.

## 2. Live view: say it serves stuck logins too

- [x] 2.1 `hand-over.mjs` usage for `--view` names a robot check *or a stuck login*. Verify: `hand-over.test.mjs` usage snapshot, if one exists, passes.

## 3. Docs

- [x] 3.1 `wiki/development/live-view.md`: first sentence and *When it opens* cover a stuck login (what counts, after which routes), the finish for a login (`--until-gone` on the login box, or `--until` a known signed-in address), a password typed in the view is not saved, and *One view per site* counts both. Verify: read-through against the spec delta.
- [x] 3.2 `wiki/development/browsing.md`: the opening says API first, then the browser by default; *When a step needs you*, the *robot check* bullet in saved logins, *Let me take over*, and *When a site refuses the browser* add the stuck login; *Steps for you to finish* adds steps only, no backstory or other routes; the email-first login step names `--email-first`. Stay under 3,000 words. Verify: `node scripts/check-payload-links.mjs` passes and the page stays under 3,000 words.
- [x] 3.3 `wiki/development/passwords.md`: offered at any login page with no match, an email-only first page included; `--email-first` and the optional password, and what a blank password does next time. Verify: read-through.
- [x] 3.4 `wiki/stack/service-catalogue.md`: one line that a task no action or key can do goes to [browsing](../development/browsing.md). Verify: link resolves in the wiki check.
- [x] 3.5 `CHANGELOG.md` gets a `## Next (minor)` entry in plain words. Verify: present.

## 4. Verification

- [x] 4.1 Run the hand-over, passwords, and browse tests and the wiki checks; all pass.
- [x] 4.2 `openspec validate live-view-for-stuck-logins --strict --no-interactive` passes.
- [x] 4.3 Run locally, since the password link is not part of the uploaded app: open an `--email-first` password link for a pretend site, save with the password blank, and confirm `browse.mjs login --password` prints `missing` for it.
