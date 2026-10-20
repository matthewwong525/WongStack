# Proposal

**Status:** planned
**Open questions:** none

## Why

On 2026-10-20 a ClaymooApp chat had to set up a Halloween countdown in Shopify's admin. Shopify's login took the saved email, then kept reloading with no check to pass. The rules show you the assistant's browser only for an *I'm not a robot* check, so it gave up and sent a long do-it-yourself guide. You'd rather it had shown you its browser and let you sign in. Some sites also ask for the email on one page and the password on the next, so you get asked twice.

## What Changes

- **No API can do it? The browser is the default.** When no saved key or company action can do a task on a website, the assistant does it in its browser as you, without being asked. It doesn't hand you steps first.

- **A stuck login opens the live view.** A login that loops, or sits with no error and no check, now gets the same private link a robot check gets. It shows the assistant's browser, and you sign in there yourself. The usual asks still come first: a saved login, the password link, a code from your email. If your own try in the view doesn't get in, then you get steps.
  ```mermaid
  flowchart TD
    task --> api{API can do it?}
    api -->|yes| call[use the API]
    api -->|no| browser[browser]
    browser --> login{login works?}
    login -->|yes| done[carry on]
    login -->|stuck| view["live view: you sign in"]
    view -->|in| done
    view -->|still stuck| steps[short steps]
  ```

- **One ask for email and password.** When a site asks for your email first and your password on the next page, the password link asks for both at once. The password is optional there, since some of those sites send a code instead. If you leave it blank and the site does want one, the link comes back for the password only.
  ```screen
  <div class="col gap">
    <div class="card col gap phone">
      <span class="tag-outline">Before</span>
      <span class="muted">Chat: What's your Shopify email?</span>
      <span class="muted">then a second link:</span>
      <h3>Save your shopify.com login</h3>
      <div class="field"><label>Email or username</label><input></div>
      <div class="field"><label>Password</label><input></div>
      <button class="btn-primary">Save and continue</button>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">After</span>
      <h3>Save your shopify.com login</h3>
      <div class="field"><label>Email or username</label><input></div>
      <div class="field"><label>Password (optional)</label><input></div>
      <span class="muted">Leave it blank if the site sends you a code.</span>
      <button class="btn-primary">Save and continue</button>
    </div>
  </div>
  ```

- **Steps, when you get them, are only steps.** One line on what stopped it, the numbered steps, and what to tell the assistant after. No *how this works* section and no list of other routes.

**Non-goals:** a live view for card details, which stay in the private form; a second live view on the same site; any way around a site that refuses a real person.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a task no API can do goes to the browser; a stuck login gets one live view, like a robot check; an email-first login gets one password link with the password optional; steps for the person carry only the steps.

## Impact

- `wiki/development/browsing.md`, `live-view.md`, `passwords.md`; one link from `wiki/stack/service-catalogue.md`.
- `.agents/skills/hand-over/scripts/`: `passwords.mjs` accepts a login with no password; `passwords-page.html`/`.mjs` mark the password optional for an email-first link; `hand-over.mjs` gains the flag and loses "robot check" from `--view`'s help.
- `.agents/skills/browser/scripts/browse.mjs`: a saved login with no password prints `BROWSE_LOGIN=missing` at a password box.
- Tests: `passwords.test.mjs`, `passwords-page.test.mjs`, `hand-over.test.mjs`, `browse.test.mjs`.
- `CHANGELOG.md`.

## Decision log

- **2026-10-20** — Asked why the ClaymooApp chat didn't open its browser for the Shopify login → found the rules limit the live view to a visible robot check, so a silent loop counted as a refusal and ended in steps.
- **2026-10-20** — Asked what next → chose to plan the fix, adding: an email-first login asks for the email and an optional password in one go.
- **2026-10-20** — Asked when the assistant should show its browser → answered: when no API key can do it, use the browser by default; when stuck on a login, ask through the normal process. Read as: a stuck login joins the robot check, after the saved login, password link, and code routes.
- **2026-10-20** — Asked how long do-it-yourself steps should be → chose steps only, no backstory.
- **2026-10-20** — Asked when the password is optional → chose only on email-first logins.
- **2026-10-20** — Assumed: *let me take over* elsewhere still opens nothing, because the answer named stuck logins only.
- **2026-10-20** — Assumed: a stuck login shares the robot check's one view per site per task, because a site that turns away a real person in this browser will do it again, and repeats can lock the account.
- **2026-10-20** — Assumed: a login the site rejects with a message still gets the password link, and only one with no message counts as stuck, because a wrong password needs a new password, not a view.
- **2026-10-20** — Assumed: a blank password saves the login with the email only, because the next login then types the email without asking again.
- **2026-10-20** — Assumed, after the second look: a stuck login's view finishes at the signed-in address, or when every login box is gone, not when the box last typed into is gone, because an email-first login drops its email box at the password page and would close the view before the person is signed in.
