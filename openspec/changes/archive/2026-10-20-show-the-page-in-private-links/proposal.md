# Proposal

**Status:** ready-to-ship
**Branch:** form-screenshots-reorder
**Open questions:** none

## Why

A private form shows only boxes, so you fill in a card without seeing the page it goes to or what the assistant already typed there. The password page opens on a file drop most people skip. And every form starts from nothing, so you type the same card, email, and address again each time.

## What Changes

- **A private form opens with a picture of the site's page.** The assistant takes one picture of the whole page as the link opens: its own answers typed in, your private boxes still empty. The picture sits first, above the boxes. Tap it to see it full screen, then zoom and drag around it; close goes back to the form.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="tag-outline">Private link</span>
      <h3>Pay City of Markham</h3>
      <span class="muted">$45.00 · ticket P0178390</span>
      <div class="field"><label>Card number</label><input></div>
      <div class="field"><label>Security code</label><input></div>
      <button class="btn-primary">Pay $45.00</button>
      <button class="btn-ghost">Not now</button>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">Private link</span>
      <h3>Pay City of Markham</h3>
      <span class="muted">$45.00 · ticket P0178390</span>
      <div class="skeleton"></div>
      <span class="bar">The site's page. Tap to zoom.</span>
      <div class="field"><label>Card number</label><input></div>
      <div class="field"><label>Security code</label><input></div>
      <button class="btn-primary">Pay $45.00</button>
      <button class="btn-ghost">Not now</button>
    </div>
  </div>
  ```
  Tapping the picture:
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="muted">The site's page</span><span class="grow"></span><button class="btn-ghost">−</button><button class="btn-ghost">+</button><button class="btn-ghost">Close</button></div>
    <div class="skeleton"></div>
    <span class="bar">Pinch or use + and − to zoom; drag to move around.</span>
  </div>
  ```

- **The password page shows the login page too, and the file drop moves to the bottom.** When the assistant sends the password link for one site, the page opens with a picture of that site's login page. Then the add-a-login boxes, then the drop-a-file box, on every password link, not only one site's.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="tag-outline">Private link</span>
      <h3>Save logins for your assistant</h3>
      <div class="skeleton"></div>
      <span class="bar">Drop your export file here, or tap to pick it</span>
      <h4>Add a login</h4>
      <div class="field"><label>Website</label><input></div>
      <div class="field"><label>Password</label><input></div>
      <button class="btn-primary">Save and continue</button>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">Private link</span>
      <h3>Save your netflix.com login</h3>
      <div class="skeleton"></div>
      <span class="bar">Netflix's login page. Tap to zoom.</span>
      <div class="field"><label>Website</label><input></div>
      <div class="field"><label>Password</label><input></div>
      <div class="skeleton"></div>
      <span class="bar">Or drop your password export here, or tap to pick it</span>
      <button class="btn-primary">Save and continue</button>
    </div>
  </div>
  ```

- **Save what you fill in, if you want.** A private form gets a *Save for next time* tick, off until you tick it. The details save only once the site accepts them. When the assistant asks an everyday answer in the chat (an email, a name, an address, a phone), it asks once whether to keep it. Everything saved sits on this computer next to your saved passwords, not in the repo. Like saved passwords, it is not locked with a password of its own.
  ```screen
  <div class="card col gap phone">
    <div class="field"><label>Card number</label><input></div>
    <div class="field"><label>Security code</label><input></div>
    <div class="row gap"><input type="checkbox"><span>Save for next time</span></div>
    <button class="btn-primary">Pay $45.00</button>
  </div>
  ```

- **Next time, one yes in the chat fills it.** When a form asks for details you saved, the chat asks first. On your yes the assistant fills the saved details and presses the site's button itself, with no form to open. The assistant still never sees a saved card: it knows it only as *card ending 4242*.
  ```mermaid
  flowchart TD
    page[asks for a card] --> saved{saved card?}
    saved -->|yes| ask["chat: use card 4242?"]
    ask -->|yes| fill[assistant pays] --> done[receipt]
    ask -->|use another| form[private form]
    saved -->|no| form
  ```
  ```text
  I need a card to pay City of Markham $45.00.
  [Use card ending 4242]  [Use another card]  [Not now]
  ```
  Say *forget my card* (or any saved detail) and it is deleted.

## Capabilities

### New Capabilities

- `saved-details`: keeping details the person chose to save, and reusing them after a yes in the chat.

### Modified Capabilities

- `browser-logins`: the private form and the one-site password link show a picture of the site's page; the password page puts the file drop last; a private form offers to save its details.

## Impact

- `.agents/skills/hand-over/scripts/`: `hand-over.mjs` (picture at open, `--session` with `--passwords`, a `fill` command), `form.mjs`, `form-page.html`/`.mjs`, `passwords-page.html`/`.mjs`, `private-page.css`, a shared picture viewer, a new `details.mjs`.
- `.agents/skills/browser/scripts/browse.mjs`: a full-page picture.
- `~/.wong-stack/details.json`: a new file outside git, mode 0600.
- `wiki/development/browsing.md`, `passwords.md`, the hand-over skill, and tests under `scripts/tests/`.

## Decision log

- **2026-10-20** — Asked whether saving filled-in details joins the page-picture plan or gets its own → chose the same plan.
- **2026-10-20** — Asked what is saved for next time → chose everyday answers (email, name, address, phone) and private-form details like a card; passwords already save through the password link.
- **2026-10-20** — Asked how saved details are reused → chose ask each time in the chat, and on a yes the assistant fills them itself with no private form.
- **2026-10-20** — Assumed: the picture is taken by the link's own opener, of the whole page, before anything private is typed, because a picture taken later could show what the person typed.
- **2026-10-20** — Assumed: the picture opens full screen on a tap with pinch, + and −, and drag, because a whole-page picture is too small to read in place on a phone.
- **2026-10-20** — Assumed: the password page shows a picture only for a one-site link whose browser page is on that site, because a page on another site would mislead.
- **2026-10-20** — Assumed: the file drop goes below the add-a-login boxes on every password link, as you asked, keeping its own wording *Or drop your password export here*.
- **2026-10-20** — Assumed: *Save for next time* starts unticked, and saves only once the site accepts, because a refused card is not worth keeping.
- **2026-10-20** — Assumed: saved details sit in one file next to saved passwords, readable only by this computer's account and not locked with a password of their own, matching saved logins.
- **2026-10-20** — Assumed: a saved card keeps its security code, because a site asks for it every time and you asked not to type details again.
- **2026-10-20** — Assumed: the assistant knows a saved card only as *card ending 4242*, because the chat question has to name it.
- **2026-10-20** — Assumed: a saved dropdown answer keeps its visible choice too and matches on both, because a site's own value alone picked the wrong month on another site.
- **2026-10-20** — Assumed: a dropdown is picked by its visible choice, not the site's value, because a walk on a pretend card page found the browser waits 30 seconds on a value before failing.
- **2026-10-20** — Check: walked locally on a pretend card page over a real private link, in a desktop browser: the form showed the page's picture with the typed email; tap, + and Close worked and zoom stayed centred; a month shown as *03 - March* filled; *Save for next time* saved *card ending 4242* on the site's yes; `fill` paid again with no form and printed no value; a refused saved card left every box empty and the dropdowns back on Month and Year. The one-site password link showed the picture, then the login boxes, then the file drop. Not yet tried on a phone, so pinch is untested.
- **2026-10-20** — Asked whether to publish before a phone try → chose publish; pinch-to-zoom on a phone is checked at the next real form.
- **2026-10-20** — Archived for publishing as 43.14.0; added the saved-details spec to the browser area's docs.
