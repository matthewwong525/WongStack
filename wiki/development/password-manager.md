# Your password manager in the browser

The agent's browser can hold a password manager add-on, such as 1Password or Bitwarden. You add it yourself, like any add-on, sign in to it, and fill a login from your vault. The agent never uses it.

## Add it yourself

The agent asks nothing about a password manager. When you want one, add it as in your own Firefox:

1. Open the browser: [the window](browser-window.md#where-it-shows), or a live view you [ask for](browser-window.md#ask-for-the-browser).
2. Go to [Firefox's add-on site](https://addons.mozilla.org), find your password manager, and add it. Check its maker first: a look-alike can read every page.
3. Sign in to it. It stays from start to start.

**An add-on you add does not update itself:** Camoufox turns add-on updates off. When it stops working, remove it and add it again.

Any other add-on goes in the same way. The agent's guard covers every add-on, whoever added it: see [use it at a sign-in](#use-it-at-a-sign-in).

## The checks

You can also say *add my password manager*: the agent then adds one for you, with these checks. [`addons.mjs`](../../.agents/skills/browser/scripts/addons.mjs) does each step, through `browse.mjs addon <verb>`. An add-on can read every page of a browser signed in as you, so a look-alike is a real risk.

- **Firefox's add-on site only.** `addon find <name>` lists up to three extensions from [addons.mozilla.org](https://addons.mozilla.org), each with its maker, website, daily users, and whether Mozilla features it.
- **Your yes, with the facts.** The agent names the maker, website, and daily users of the match. It warns you when an add-on is not featured and has under 10,000 daily users: on 2026-11-05 every big manager had more than 67,000, and a look-alike had 4.
- **The file must match.** `addon add <slug>` refuses a download whose sha256 fingerprint is not the one the site gives.
- **One at a time.** A new add-on replaces the old one and deletes its stored data.

An add stops the browser, and the next command starts it with the add-on. While a live view is open in any chat, the add stops at once and changes nothing: the agent tries again once the view closes.

## Use it at a sign-in

In [the browser window](browser-window.md#your-turn-in-the-window), use it as in your own Firefox. In a live view, with the one the agent added:

1. The agent runs `addon open` before [a sign-in turn](live-view.md#sign-in). The password manager's own page opens in the task's tab.
2. The agent sends the live view. You sign in to the password manager, or unlock it. The view opens over that page: its finish is not met there, since the site does not show.
3. You press *Back* until the site shows: each of the password manager's own steps takes one press. Then you fill the login from the list the password manager shows in the page. Back on the site, or at the view's end, the page gets its own size again.

The add-on's button is on the toolbar, from the second start of a new browser. Its small pop-up takes no typing on this screen, so use its page in the tab.

The agent's own steps skip the password manager, and every other add-on. `snapshot` leaves out their frames, and a click, typing, a key, or a choice aimed at one stops with `BROWSE_ERROR=that is the password manager's own; the person uses it in the live view`. While its page shows in the tab, every step but a new address stops the same way, and the agent can not see that page.

## Keep it safe

When it adds the add-on, the agent tells you these two steps: `addon add` prints them as `BROWSE_ADDON_TELL=`. They hold for one you add too.

- **Use a separate vault** that holds only the logins the agent's errands need.
- **Set auto-lock to 5 minutes.** The guard stops the agent's routine reading and clicks, not a script it runs in a page. A locked vault gives a script nothing.

## Updates

At a browser start, once a week, the add-on the agent added is checked for a newer version and swapped in by the same checks. A password manager far behind stops working. A failed check keeps the working copy, so a dead network never stops a start.

## Remove or change it

Say *remove my password manager*: `addon remove` deletes the add-on the agent added and its stored data, so no signed-in session stays. To change to another one, add it: the old one goes.

An add-on you added yourself, you remove in the browser's own add-ons page (`about:addons`). The agent's one, by hand: delete `~/.wong-stack/camoufox/addons/` and `password-manager.json` with the browser stopped. An answer saved by an older version, *None* included, is ignored.

Part of [browsing](browsing.md), in [development](README.md).
