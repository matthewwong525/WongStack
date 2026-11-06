# Your password manager in the assistant's browser

**Status:** ready-to-ship
**Branch:** camoufox-live-view-extensions
**Open questions:** none

## Why

When a site asks you to sign in through the live view, you must find the password in your own password manager, copy it, and paste it. Your password manager can not fill the live view, because the view is a picture of another browser. If the assistant's browser has your password manager too, you click its button in the view and it fills the login for you.

## What Changes

- **When the assistant installs its browser, it asks once which password manager you use.** That happens one time, at the first errand that needs the browser. It works with any password manager that has a Firefox add-on, such as 1Password, Bitwarden, LastPass, Dashlane, Proton Pass, Keeper or NordPass. If you say no, it never asks again. You can still say *add my password manager* at any time.
  ```text
  Assistant: My browser is installed.
  Which password manager do you use? I can
  add it to my browser, so you can fill
  logins from it in the live view.
  [1Password]  [Bitwarden]  [Other]  [None]

  You: 1Password
  Assistant: I'll add "1Password – Password
  Manager" by 1Password from Firefox's add-on
  site. Add it?
  [Add it]  [Not now]
  ```

- **You choose the add-on; the assistant tells you what it found.** It gets the add-on from Firefox's add-on site, so you can add any add-on there. Before it adds one, it tells you the name, the maker, the maker's website, and how many people use it. When Mozilla does not feature it and few people use it, the assistant says so, because a copy-cat with a similar name can read every page in its browser. You decide.
  | You ask for | The assistant finds | Result |
  |---|---|---|
  | 1Password | 1Password – Password Manager, by 1Password, 1password.com | Added, after your yes |
  | Proton Pass | Proton Pass, by Proton, proton.me | Added, after your yes |
  | Bitwarden | Boltwarden, by an unknown maker | A warning: 4 people a day, not featured, and not by Bitwarden. Added only if you still say yes |

- **You sign in to your password manager once, in the live view, then fill logins from it.** Its button shows in the browser's toolbar at the top of the view. The first time, the assistant opens your password manager in its own tab, and you sign in to your account there. After that, at each login you unlock it and pick the login from its list on the site's page. The browser keeps it after a restart, and the assistant keeps it up to date each week.
  ```screen
  <div class="card col gap">
    <div class="row gap"><span class="field grow">admin.shopify.com/login</span><button class="btn-ghost">1Password</button></div>
    <div class="col gap">
      <div class="skeleton">Shopify: Log in</div>
      <div class="field">Email</div>
      <div class="field">Password</div>
      <div class="card col gap"><span class="muted">1Password</span><span>Shopify: operations@claymoo.com</span></div>
    </div>
    <div class="field">Tap a box above, then type</div>
  </div>
  ```
  This view is not part of the app, so the plan has a sketch, not a real picture.

- **The assistant never uses your password manager.** It never clicks its button or its fill list, and it never reads a password from it. But while it is unlocked, the assistant drives the same browser. So the assistant suggests two settings, and you choose them in your password manager:
  | Setting | Why |
  |---|---|
  | A separate vault with only the logins the assistant needs | If something goes wrong, your other passwords stay out of reach. |
  | Lock after 5 minutes | The password manager is unlocked only while you sign in. |

- **You can change or remove it.** Say *remove my password manager* and the assistant takes the add-on out of its browser and forgets your account there. Say *use Bitwarden instead* and it swaps one for the other.
  ```text
  You: remove my password manager
  Assistant: Done. 1Password is gone from my
  browser, with its sign-in.
  ```

**Non-goals:** the assistant fills logins from your password manager by itself; unlock with a fingerprint or your password manager's desktop app (a server has neither); a password manager with no Firefox add-on; changes to the live view itself, which *The live view is the one place for sensitive input* owns.

## What the build needs

- **The live view's tools on this server**: Ready. `x11vnc`, `xdotool` and `Xvfb` are installed, and noVNC 1.6.0 is in `~/.wong-stack/live-view/`.
- **Firefox's add-on site**: Ready. This server reaches `addons.mozilla.org`, and its answers give each add-on's maker, website, featured status, daily users and file fingerprint.
- **The live view sign-in**: Ready. Today's live view for a stuck login and a sign-in is enough; *The live view is the one place for sensitive input*, still in build in another chat, uses the same view.
- **Your password manager, to try it**: Ready. After it is live, you add 1Password and sign in once in a live view.

## Capabilities

### New Capabilities

- `password-manager-add-on`: adding, keeping, and removing one password manager add-on in the shared browser, the once-only offer when the browser is installed, and the rule that the agent never uses it.

### Modified Capabilities

None.

## Impact

- `.agents/skills/browser/scripts/addons.mjs` (new) and `browse.mjs`: the `addon` commands (`find`, `add`, `remove`, `status`, `decline`) and the add-on's folder beside the browser's profile.
- `.agents/skills/browser/scripts/launch-config.py` and `browser-server.mjs`: pass the saved add-on to Camoufox's `addons` launch option, allow its own tabs, pin its button, and set the prefs that keep its storage from start to start.
- `.agents/skills/hand-over/scripts/view.mjs`: keep the window the person last clicked in front.
- `browse.mjs`: page readings leave out the add-on's own frames, and a click or a typing step inside one is refused.
- `.agents/skills/browser/SKILL.md`, a new `wiki/development/password-manager.md`, and one line each in `live-view.md`, `browsing.md` and `wiki/development/README.md`.
- Network: `addons.mozilla.org` API v5, read only.
- Tests: `scripts/tests/addons.test.mjs` (new), `browse.test.mjs`, `launch-config.test.mjs`.

## Decision log

- **2026-11-05** — Asked whether the live view can use 1Password through a Camoufox add-on → Matthew asked for any password manager the person uses, *"not specifically 1 password"*.
- **2026-11-05** — Asked where this goes, since *The live view is the one place for sensitive input* is in build → chose a change of its own here, built on that one and live after it.
- **2026-11-05** — Asked when the assistant adds it → chose to ask once, at the first live view sign-in, and remember a no.
- **2026-11-05** — Asked again whether to offer it at install instead → the requester chose to ask once at install, in the browser skill, with a no never asked again and adding it later only on request. This replaces the first-sign-in offer.
- **2026-11-05** — Assumed: only an add-on Mozilla features (promoted) or with at least 10,000 daily users, confirmed by name, maker and website, because a look-alike could read every page of a browser signed in as the person. Featured-only was dropped: on 2026-11-05 Dashlane, Proton Pass, Keeper and NordPass were not featured, with 67,000 to 194,000 daily users each, and a look-alike (`boltwarden`) had 4.
- **2026-11-05** — Asked to drop the 10,000-a-day floor → the requester said: *"if they want an add-on they should be able to add it"*. Any add-on on Firefox's add-on site can be added after the person's yes; the assistant still names the maker, website and daily users, and warns when one is not featured and has under 10,000 daily users.
- **2026-11-05** — Assumed: one password manager at a time, kept per computer in the browser's own folder, because the browser is per computer and a second manager adds risk for no gain.
- **2026-11-05** — Assumed: the agent never uses the add-on, with a hard guard on its clicks and readings, because Matthew asked for it to help him sign in, not to sign in for him.
- **2026-11-05** — Asked to check it in the browser first → tried Bitwarden and 1Password in a test copy of the browser: both load and keep their data through a restart; the small toolbar pop-up takes no typing on this server's screen, so the password manager opens in a tab.
- **2026-11-05** — Assumed: the add-on updates itself weekly at a browser start, because a password manager stops working when far behind.
- **2026-11-05** — Assumed: build and publish now on today's live view, not after *The live view is the one place for sensitive input*, because that change was still unsaved in its own workspace at /ship, and the add-on, its tab and the guard need nothing from it. That change merges this one in when it next takes main.
- **2026-11-05** — Assumed: the guard sits in `browser-server.mjs`, which reads the page, so its tests are in `browser-server.test.mjs`; `browse.test.mjs` checks the refusal reaches the agent as the server gives it. An add-on's box inside a closed shadow root is not caught.
- **2026-11-05** — Assumed: a refused add, such as a non-extension, prints `BROWSE_ERROR=` like every other refusal, not a separate `BROWSE_ADDON_REFUSED=`.
- **2026-11-05** — Assumed: `add` and `remove` stop at once with a message while a live view is open, never waiting, so a chat is not held for minutes.
- **2026-11-05** — Assumed: the toolbar pin is written into `prefs.js` with the browser stopped, because the driver rewrites `user.js` at each start. A new profile has no toolbar layout yet, so its button is pinned from the second start.
- **2026-11-05** — Tried with a test copy of the browser, with no account: `addon open` puts the add-on's page in the task's tab, but the driver can not see or use that tab until the person goes back to a site, and each of the add-on's own steps takes one *Back*. Assumed: while the page shows, the tab's steps stop at once with the refusal, a live view's resize keeps the page's size, and the page is first sized to the screen.
- **2026-11-06** — Review at /ship: a live view could not open over the add-on's page, since its helper read the refusal as no page. Assumed: the server marks that refusal `addonPage`, and the helper reads it as a page whose finish is not met; the view's end leaves the size it gave, since that page's size can not be read; a bar read on that page is not kept, so the first fit back on the site reads it.
- **2026-11-06** — Review at /ship: nothing asked a computer that had the browser before. Assumed: the first `open` with no saved choice prints `BROWSE_ADDON=none`, and whichever command prints it first saves the choice as `asked`, so the offer is made once even when the person does not answer.
- **2026-11-06** — Review at /ship: assumed `addon add` prints the safe-setup advice as `BROWSE_ADDON_TELL=`, and the skill passes it on, so the advice never depends on the agent's memory.
- **2026-11-06** — Second review at /ship: a scheduled run with no person used up the one offer. Assumed: printing `BROWSE_ADDON=none` saves nothing; the offer counts as made only when the agent asks the person in a chat and runs `browse.mjs addon asked`, or on `add` or `decline`, and a run with no person never asks. `open` prints the line at a task's first open (a new tab file) while no choice is saved, not at each page. This replaces the earlier *whichever command prints it first* pick.
- **2026-11-06** — Second review at /ship: `addon open` before a `--sign-in` link would stop the saved login, since no step types on the password manager's page. Assumed: the skill runs `addon open` only before a `--view` the person signs in through, and `hand-over.mjs open --sign-in` refuses at once, with the fix, while that page shows, rather than going back from it.
- **2026-11-06** — Second review at /ship: a view over the password manager's page left the page at the view's last size. Assumed: `addon open` keeps the page's own size; a size read there answers with it, so the view's end sets it; a resize while that page shows becomes the size the site gets back, and the site gets it once the person is back there. This replaces the earlier *the view's end leaves the size it gave* pick.
- **2026-11-06** — Asked how to finish the last check, a sign-in with a real password manager account, which no test account here covers → the requester chose to publish now and check it the first time they add 1Password. The real-account steps move from the tasks to *After it is live*.
- **2026-11-06** — At /ship, *The live view is the one place for sensitive input* went live first, and removed the password link with its `--sign-in`. Assumed: `addon open` runs before every sign-in turn, and the refusal of a `--sign-in` over the password manager's page goes, with its test, since nothing types a saved login now.
- **2026-11-06** — Archive checkpoint at /ship: archived as 50.1.0, merged with main's 50.0.0 live view; the browser tests pass.
