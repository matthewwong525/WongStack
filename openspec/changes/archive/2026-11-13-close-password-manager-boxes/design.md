## Context

`browser-server.mjs` refuses every step aimed at a `moz-extension://` frame (`guardAddon`, `refLocator`, `ADDON_REFUSAL`), and `readPage` leaves those frames out of readings. The only opening is `addon logins` then `addon pick`, built in `fill-logins-from-1password` (55.3.0). While a fill list shows, every key but Escape is refused (`LIST_OPEN`).

Evidence, ClaymooApp chat of 2026-11-12 (`civil-otter`, `ec22a41f…jsonl`), which ran a browser from before 55.3.0:

- 1Password's *Save login?* box covered CapCut's *Confirm*. `click` aimed at it and `press Escape` did not close it; the step came back `BROWSE_ERROR=that is the password manager's own…`. A live view went out, and a 30-minute wait timed out before the person pressed X.
- `press Enter` went into 1Password's fill list. The `LIST_OPEN` key guard now refuses that, so this change leaves it.
- With the person's yes, the agent did vault work on `my.1password.com` / `start.1password.com` in a normal tab. The guard does not cover the website: once signed in there, the agent reads and changes the whole account.

## Goals / Non-Goals

**Goals:** the login pick that works on real sites, by the add-on's icon when no list opens, and for a passkey saved in 1Password; a code path that closes a password manager's box by its own close button, and nothing else; a refusal that points to it.

**Non-Goals:** vault work on the password manager's website, for now (the person dropped it); any other opening in the add-on; hiding or removing the box's frame from the page; a code guard on the website (it is a normal site).

## Decisions

### 0. Find why the agent skips 1Password, then open the list by its icon

The person finds the agent sends a live view instead of filling from 1Password. No recent chat shows `addon logins` failing, so task 1.1 first runs `addon logins` on three real sites from the person's vault (one of them the site they name, else Canva, Shopify, and a Google sign-in) and records what happens: the list opens, the list needs the icon, or the skill never ran `addon logins`.

`offeredLogins` today focuses the login box and presses ArrowDown. When no `FILL_LIST` frame shows within 1.5 s, it clicks 1Password's in-box icon once. The guard still refuses any other step aimed at it. If the skill skipped `addon logins`, the skill line moves first in the sign-in order, before any sign-in turn.

Found in task 1.1 (2026-11-13, add-on 8.12.41.1): the icon is `button#op-button` in a **closed** shadow root on a `com-1password-button` host, a 0×0 element at the end of `<body>`; the button is `position: fixed` over the field's right end. No Playwright locator reaches it: `com-1password-button #op-button` and `#op-button` both timed out. So `ICON_AT` hit-tests the login box's rectangle in the page with `elementFromPoint`, which returns the host where the icon shows, and the server clicks the middle of those points with `page.mouse.click`. Nothing is read from the add-on. On Shopify's sign-in, the hits were x 798–822, y 376–392 in an email box ending at x 838. A mouse click can show a tab behind, so `logins` joins `SHOWS_TAB`, as `pick` is.

### 0b. A passkey saved in 1Password

When a site calls WebAuthn, 1Password draws its own passkey box in a `moz-extension://` frame. From the add-on's source (8.12.41.1): it is the notification page, `inline/notification/notification.html`, with the `h1` *Sign in with a passkey*, an icon button *Use a security key or another passkey*, and the X *Close*. Several passkeys are `li > button` rows, each naming the item and its username; one passkey shows its name beside a *Sign in* button. Locked, it shows *To use your passkey, unlock 1Password first.* Seen live on 2026-11-13, with 1Password locked after a restart: Shopify's passkey button brought up 1Password's sign-on banner, *Unlock 1Password to sign in* with *Unlock* and an X, not the passkey box. `addon logins` printed `locked`, and `addon close` printed `BROWSE_ADDON_CLOSED=1`: the banner went, and 1Password stayed locked. The unlocked passkey box is not yet seen. `addon logins` on that page prints `BROWSE_ADDON_LOGIN=<n> | passkey: <name>` for each passkey it offers, reading only the names, and `addon pick <n>` presses that box's sign-in once, under the same 2-minute, same-page order. A passkey box with no name, or one asking to unlock, prints `locked` or `none`. A passkey 1Password does not hold (the browser's own *Use a phone* box) stays the person's, by the browser-logins rule.

*Alternative:* let the agent click 1Password's passkey box freely. Rejected: the person chose to keep every other click blocked.

### 1. `addon close`: press only a close button, found by name

A new verb in `ADDON_VERBS` (`addons.mjs`) through `browse.mjs addon close`, served by a new route in `browser-server.mjs`:

- For each visible frame on the tab where `inAddonFrame` is true and the frame is not the fill list (`FILL_LIST`; Escape closes that), look for `getByRole('button', { name: CLOSE_NAMES })` with `CLOSE_NAMES = /^(close|dismiss|dismiss banner|not now|no thanks)$/i`, first match per frame. From the add-on's source: the notification page's title bar has an X button whose `aria-label` is *Close* (the *Save login?* box and the passkey box share it); the sign-on banner's X is *Dismiss banner*.
- Click it with `clickOn`, wait up to 3 s for that frame's element to go hidden or detach, and print `BROWSE_ADDON_CLOSED=<count>`; no shown box prints `BROWSE_ADDON_CLOSED=0`.
- A shown box with no matching button: refuse with `BROWSE_ERROR=the password manager's box has no close button; the person closes it in the live view`, and press nothing.
- It returns nothing read from the frame. Playwright matches the accessible name inside the frame; the agent gets only the count.

*Alternative:* hide the frame element (`display: none`) from the page. Rejected: 1Password would keep the box open behind the page, and its host element can still take clicks.

*Alternative:* a fixed 1Password selector. Rejected as the first path: names cover Bitwarden's notification bar too. Task 1.1 checks the real names; if 1Password's X has no accessible name, the build adds its exact selector beside the names and says so.

### 2. The refusal points to it

When `guardAddon` or `refLocator` refuses a step and a non-list add-on frame shows, the refusal adds: `; a box of its own covers the page: close it with browse.mjs addon close`. `ADDON_REFUSAL` stays as it is for the other cases, so the live view's helper still tells the add-on page apart.

### 3. Skill and help page

- `SKILL.md`, the add-on line: when a password manager's box covers the page, run `addon close` at once with no ask, and say in the next report that it closed the box without saving. On its refusal, send a live view. The line *Never click, read, type into, or unlock an add-on otherwise* stays.
- `references/password-manager.md`: a short *Boxes over the page* paragraph and a *Change your vaults* section; the *Apart from that one pick* paragraph names the close.
- Offset the added skill words with cuts on the same route (`measure-context.mjs --check`).

## Seen before the ship, and the checks after it is live

Seen on real pages before the ship: on Shopify, `addon logins` opened 1Password's list by itself and read 4 login names (old code); after the restart onto this branch, `addon close` closed 1Password's real *Unlock 1Password to sign in* banner (`BROWSE_ADDON_CLOSED=1`), pressed nothing else, and left 1Password locked.

Not seen live, because 1Password stayed locked after the restart and another chat's live view reopened; the person chose to publish (Decision log). At the next unlock, in the shared browser:

- 1Password's in-box icon opens the list on a site where focus alone does not, and a pick fills.
- The unlocked *Sign in with a passkey* box: `addon logins` prints the passkey's name, and `addon pick` signs in after a yes.
- A real *Save login?* box: `addon close` closes it, nothing is saved, and the page's own button then takes a click.

A failure in any of them refuses or prints `none`, so the agent sends a live view, as before the change.

## Risks / Trade-offs

- [A page names its own button *Close* inside a frame that looks like an add-on's] → only `moz-extension://` frames are searched; a page can't make one.
- [1Password renames its button] → the close refuses, and the person closes it in a live view, as today.
- [Camoufox's WebAuthn may not reach 1Password] → task 1.1 checks; if 1Password draws no passkey box there, the passkey part stops and returns to the person, and the rest ships.
- [The close needs a real box to test] → task 1.1 runs in the shared browser with 1Password unlocked; locked sends one unlock turn, after the person's yes to a restart if another chat holds a live view ([test a live view](../../../wiki/maintaining/test-a-live-view.md)).
