# The agent signs in with 1Password's icon and passkeys, and closes its pop-up boxes

**Status:** ready-to-ship
**Branch:** allow-ai-click-1password
**Open questions:** none

## Why

On 2026-11-12, during the passwords work after Anne left, 1Password's *Save login?* box covered CapCut's *Confirm* button. The agent was not allowed to touch the box, so you had to open a live view only to press X, and one wait for you timed out after 30 minutes.

You also find the agent doesn't sign in with 1Password: it sends you a live view instead. Today it only waits for 1Password's list to open by itself. It never clicks the small 1Password icon beside the email box, and it never uses a passkey, even one saved in your 1Password.

You want the agent to sign in with 1Password without you going into the browser: right before it signs in, it tells you what it will do once in, and goes on after your yes. It should also close 1Password's boxes by itself. Every other click in the 1Password add-on stays blocked.

## What Changes

- **The agent clicks 1Password's icon beside the email box.** When 1Password's list doesn't open by itself, the agent clicks the small 1Password icon in the email or username box, reads the names of the logins it offers, and asks you, as today. After your yes it picks one, and 1Password fills the page.
  ```mermaid
  flowchart TD
    A["Site needs a login"] --> B{"1Password list open?"}
    B -- no --> C["Agent clicks the 1Password icon in the box"]
    B -- yes --> D["Agent asks: login + steps"]
    C --> D
    D -- "your yes" --> E["1Password fills, agent signs in"]
  ```
- **The agent signs in with a passkey saved in your 1Password.** When a site offers a passkey and 1Password shows its own *Sign in with passkey* box, the agent asks you first, the same way: the passkey's name, the site, and the steps after. After your yes, it presses that box's sign-in button once. A passkey on your phone or computer, not in 1Password, stays yours to do, as today.
  ```text
  Agent: Shopify offers a passkey. Your
         1Password has "Shopify (info@)".
         Once in, I will:
           1. Open Settings, then Users
         OK?
  You:   yes
  Agent: Signed in with the passkey.
  ```
- **The agent closes 1Password's boxes by itself.** When a 1Password box, such as *Save login?*, covers the page, the agent presses the box's own close button (X, *Not now*, or *Dismiss*) and goes on. It does not ask you, and it does not send you a live view. It never presses *Save*, *Update*, or *Never*, so nothing goes into your vault and no setting changes.
  ```text
  Agent: 1Password's "Save login?" box covers
         CapCut's Confirm button. I closed it
         without saving anything, and pressed
         Confirm.
  ```
- **When there is no close button, you close it, as today.** If the agent finds none of those buttons on the box, it sends you a live view to close it. All other clicks, keys, and readings inside 1Password stay blocked. The agent still never unlocks 1Password.
  ```mermaid
  flowchart TD
    A["1Password box covers the page"] --> B{"Box has X, Not now or Dismiss?"}
    B -- yes --> C["Agent presses it and goes on"]
    B -- no --> D["Live view: you close it"]
  ```
**Non-goals:** the agent using all of 1Password with no ask; a passkey with no yes, or one on your own phone or computer; a per-chat yes that opens the whole add-on; the agent unlocking 1Password or typing your 1Password password or Secret Key; pressing *Save* or *Update* in a 1Password box; work inside your vaults (copy, move, or change items), for now.

## What the build needs

- **An unlocked 1Password in the agent's browser at the build's check**: Ready. The build first tries the icon, a passkey, and the close on real sites from your vault. If 1Password is locked then, the build sends you a live view to unlock it. That is your only step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `password-manager-add-on`: the login pick may open the list by the add-on's icon in the login box, and covers a passkey saved in the add-on, after the same yes; the agent may press a password manager box's own close button with no ask.

- `browser-logins`: a passkey saved in the agent's browser's password manager is no longer a step only the person's own device can do.

## Impact

- `.agents/plugins/browser/scripts/browser-server.mjs`, `browse.mjs`, `addons.mjs`: `addon logins` clicks the add-on's icon in the login box when no list opens, and reads 1Password's passkey box; `addon pick` presses its sign-in once; a new `addon close` verb; the refusal text names it when a box covers the page.
- `.agents/plugins/browser/SKILL.md`, `references/password-manager.md`, `references/browsing.md`, `references/login-codes.md`: the icon and passkey sign-in, and when to close a box.
- `scripts/tests/browse.test.mjs`, `scripts/tests/browser-server.test.mjs`, `scripts/tests/fixtures/fake-camofox-server.mjs`: tests for the close.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-13** — Asked whether to let the agent click anywhere in 1Password, open it on a per-chat yes, or only close its boxes and use the website for vault work → chose: only close its boxes, and use 1Password.com for vault work.
- **2026-11-13** — Asked (the person's own message) to drop vault work for now → chose: only sign-in with 1Password, its icon and passkeys, with the ask right before each sign-in naming the steps after.
- **2026-11-13** — Assumed: closing a box needs no ask, because pressing X, *Not now*, or *Dismiss* saves nothing and changes no setting.
- **2026-11-13** — Assumed: the agent finds the close button only by these exact names, and never presses *Never*, because *Never* changes a 1Password setting for the site.
- **2026-11-13** — Assumed: a box with no such button goes to a live view, not a hidden-frame trick, because hiding the box could leave 1Password in a state the person can't see.
- **2026-11-13** — Assumed: the Enter key going into 1Password's fill list, also seen in that chat, needs no change, because the block on keys while the list shows shipped after that chat ran.
- **2026-11-13** — Asked whether the agent should also sign in with 1Password's icon beside the email box and with a passkey → chose yes (the person's own request; they find the agent doesn't sign in with 1Password today).
- **2026-11-13** — Assumed: a passkey sign-in asks first, every time, like a login pick, because a passkey signs in as fully as a password.
- **2026-11-13** — Assumed: the icon click lives inside `addon logins`, not as a free click, because the code then still lets only names out and one pick in.
- **2026-11-13** — Assumed: the build first finds out why the agent skips 1Password on real sites (list not opening, or the skill not trying), because no recent chat shows `addon logins` failing; the fix covers what it finds.
- **2026-11-13** — Assumed (build): the agent clicks 1Password's icon by where it shows, not by a selector, because the icon sits in a closed shadow root no locator reaches (tried on Shopify's sign-in).
- **2026-11-13** — Assumed (build): *Dismiss banner* counts as a close name, because it is the X of 1Password's sign-on banner and saves nothing.
- **2026-11-13** — Assumed (build): the *Change your vaults* section in the help page is left out, because you dropped vault work for now.
- **2026-11-13** — Assumed (build): the frames with a *Not now* box, a *Save*-only box, an icon, and a passkey box are stand-ins in `browser-server.test.mjs`; `fake-camofox-server.mjs` gains only the close route and the passkey pick reply, because it stands in for the server's routes, not for the page.
- **2026-11-13** — Assumed (build): `addon logins` and `addon close` wait for another chat's turn, as `addon pick` does, because their clicks can show the tab.
- **2026-11-13** — Asked whether to publish now or unlock again and test first, after 1Password stayed locked and another chat's live view reopened → chose: publish now; the icon, passkey, and *Save login?* checks run at the next unlock (design.md).
- **2026-11-13** — Assumed: the close hint leaves out 1Password's passkey box, because closing it would drop a passkey sign-in the person may have just said yes to.
- **2026-11-13** — Assumed: archive checkpoint inside /ship; local checks passed; the live checks in design.md run at the next 1Password unlock.
