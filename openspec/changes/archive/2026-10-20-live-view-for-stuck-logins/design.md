# Design

## Context

See [proposal.md](proposal.md) for why. Today [`live-view.md`](../../../wiki/development/live-view.md#when-it-opens) and [`browsing.md`](../../../wiki/development/browsing.md#when-a-step-needs-you) open a live view only at a robot check, and [`browsing.md`](../../../wiki/development/browsing.md#when-a-site-refuses-the-browser) ends every other refusal in steps. The live view's code is already generic: `hand-over.mjs open --view` takes any `--until` or `--until-gone` finish, so the stuck-login half is mostly a rule change.

[`passwords.md`](../../../wiki/development/passwords.md) offers the password link "at a login page with a password box", while `browsing.md`'s login steps send it at any login with no match. On an email-only first page, an agent reading the first rule asks the email in the chat as an ordinary answer, then sends the link at the password page: the double ask.

## Decisions

### What counts as a stuck login

After a login submit, the agent reads the page again. A stuck login is one where, after that re-read:

- the address is still on, or back on, the login page, or the page just reloads;
- the page shows no error message (*wrong password*, *no account*);
- the page shows no visible check, no code page, and no device approval.

`browse.mjs login` already prints `rejected` when the address doesn't leave the login page in 15 seconds. The agent reads the page on `rejected`: a message about the password sends the password link as today; no message is a stuck login. A `typed` email step that stays put after submit is a stuck login too, which is the Shopify case. No code tells the two apart: the page's own words do, and the snapshot already shows them.

Alternative: a script heuristic that diffs the page before and after. Rejected: login pages differ too much, and the snapshot read is already a required step.

### The view's finish at a login

The agent names the finish as for a robot check. For a login it's `--until` the signed-in address when known (`**/store/**` for Shopify's admin); otherwise `--until-gone` on every login box at once (`input[type=email], input[type=password]`), so an email-first login doesn't finish at its password page. The `--note` says what's stuck: *Shopify's login keeps reloading. Sign in here.*

### Order of asks before a view

The view comes after the usual routes, never instead of them: a saved login, the password link, a code by email or chat. A stuck login with a saved login gets the view straight away: the agent has nothing else to try. One view per site per task, shared with robot checks.

### Typing a password in the view

The person may type a password into the view. The type box sends key presses as they happen, not through a clipboard, and nothing on the link logs or reads them, so this adds no copy of the password. The view saves nothing: a password typed there isn't added to the saved logins. The agent says so only if asked.

### Optional password on an email-first link

`hand-over.mjs open --passwords --site <url> --email-first` puts `emailFirst` in the link's fragment, next to `site` and `username`. The page then labels the box *Password (optional)* with one hint line, and lets *Save and continue* go with the password blank. `passwords.mjs` `checkLogins` accepts an empty password only for a typed login flagged `emailFirst`; an export row still needs one. The saved login keeps `password: ''`.

`browse.mjs login` with `--password <ref>` on a saved login whose password is empty types nothing into that box and prints `BROWSE_LOGIN=missing`, so the agent sends the password link with the username filled in, as for no saved login. With `--username` only (the email step) it types the email as today.

Alternative: always optional. Rejected by the person: a one-page login saved without a password is useless.

### API first, then the browser

`browsing.md`'s opening says: when no service action or saved key can do a task on a website, the agent does it in the browser as the person, without being asked and without first offering steps. [`service-catalogue.md`](../../../wiki/stack/service-catalogue.md) gets one line linking there. API key and token pages keep their own-browser rule.

### Steps only

[Steps for you to finish](../../../wiki/development/browsing.md#steps-for-you-to-finish) adds: no *how this works* section, no background, and no other route offered. The one-line reason, the steps, and the last step's *tell me* carry it.

## Risks / Trade-offs

- [A site refuses a real person in this browser too] → one view per site per task, then steps, as for a robot check.
- [The view drives a signed-in browser] → unchanged guards: ask first, one link, secret in the link, closes when the login box goes.
- [A blank password saved as `''` reads as a login] → `logins` still lists it by name; `login` prints `missing` at a password box, so nothing types an empty password.
- [`browsing.md` sits at 2,419 words of 3,000] → each addition replaces text or links to `live-view.md`.

## Migration Plan

None. Saved logins keep their shape; an install picks the rules up on its next sync.
