# Your password manager in the browser

The agent's browser can hold a password manager add-on, such as 1Password or Bitwarden, and any other add-on, such as Dark Reader. You ask the agent to add it, sign in to it, and fill a login from your vault. The agent never uses it.

## Ask the agent

The agent asks nothing about a password manager. When you want an add-on, say so: *add my password manager*, or *add Dark Reader*. The agent adds a well-known one at once, with [the checks](#the-checks), and opens a password manager's sign-in page, so you only sign in. An add-on the browser already has, such as uBlock Origin, is built in: the agent says so and adds nothing.

Ask the agent, not the add-on site in the browser. 1Password added from [Firefox's add-on site](https://addons.mozilla.org) in Camoufox 158.0.1-beta.41 opened no setup page, and its button did nothing; the copy the agent added worked. When you ask the agent for an add-on you already added yourself, its add removes your copy and its stored data, so only the working copy loads.

An add-on you add yourself stays from start to start, but it is not promised to work, and it does not update itself: Camoufox turns add-on updates off. The agent's guard covers every add-on, whoever added it: see [use it at a sign-in](#use-it-at-a-sign-in).

## The checks

[`addons.mjs`](../../.agents/skills/browser/scripts/addons.mjs) does each step, through `browse.mjs addon <verb>`. The agent never sends you to the add-on site to add it yourself. An add-on can read every page of a browser signed in as you, so a look-alike is a real risk.

- **Firefox's add-on site only.** `addon find <name>` lists up to three extensions from [addons.mozilla.org](https://addons.mozilla.org), each with its maker, website, daily users, and whether Mozilla features it.
- **Your ask is your yes for a well-known one.** When one add-on fits your words, and Mozilla features it or 10,000 or more people use it each day, the agent names its maker, website, and daily users, and adds it at once. When the agent already added it, it says so and adds nothing.
- **It asks first for a doubtful match.** When your words fit more than one add-on, the agent names the matches and adds the one you pick. It warns you and waits for your yes when an add-on is not featured and has under 10,000 daily users: on 2026-11-05 every big manager had more than 67,000, and a look-alike had 4.
- **The file must match.** `addon add <slug>` refuses a download whose sha256 fingerprint is not the one the site gives.
- **Side by side.** A new add-on joins the others. The same add-on again replaces only its own copy.

An add stops the browser, and the next command starts it with the add-on. While a live view is open in any chat, the add stops at once and changes nothing: the agent tries again once the view closes.

Right after it adds a password manager, the agent opens its own page and [sends you the browser](browser-window.md#ask-for-the-browser). You sign in to it there: that is your only step.

## Use it at a sign-in

In [the browser window](browser-window.md#your-turn-in-the-window), use it as in your own Firefox. In a live view, with the one the agent added:

1. The agent runs `addon open` right after it adds a password manager, and before [a sign-in turn](live-view.md#sign-in). The password manager's own page opens in the task's tab: the newest one added, else the newest add-on.
2. The agent sends the live view. You sign in to the password manager, or unlock it. The view opens over that page.
3. You press *Back* until the site shows: each of the password manager's own steps takes one press. Then you fill the login from the list the password manager shows in the page. Back on the site, or at the view's end, the page gets its own size again.

On the password manager's page, the browser keeps the page's own size, so the view sizes the browser's window to your screen instead: the whole toolbar shows.

Each add-on's button is on the toolbar, from the second start of a new browser. Its small pop-up also works in a live view: it stays open until you pick from it or tap outside it. Tap its box, then type, such as your password to unlock it ([a pop-up stays open](live-view.md#what-the-link-can-do)).

The agent's own steps skip the password manager, and every other add-on. `snapshot` leaves out their frames, and a click, typing, a key, or a choice aimed at one stops with `BROWSE_ERROR=that is the password manager's own; the person uses it in the live view`. While its page shows in the tab, every step but a new address stops the same way, and the agent can not see that page.

## Keep it safe

When it adds an add-on that Firefox's add-on site tags as a password manager, the agent tells you these two steps: `addon add` prints them as `BROWSE_ADDON_TELL=`. For any other add-on, it says only that the add-on loads from the next start.

- **Use a separate vault** that holds only the logins the agent's errands need.
- **Set auto-lock to 5 minutes.** The guard stops the agent's routine reading and clicks, not a script it runs in a page. A locked vault gives a script nothing.

## Updates

At a browser start, once a week, each add-on the agent added is checked for a newer version and swapped in by the same checks. A password manager far behind stops working. A failed check keeps the working copy, so a dead network never stops a start.

## Remove or change it

Name the add-on: *remove my password manager*, or *remove Dark Reader*. `addon remove <name>` deletes that add-on and its stored data, so no signed-in session stays, and leaves the others. To change to another password manager, ask for the new one, then remove the old one.

An add-on you added yourself, you remove in the browser's own add-ons page (`about:addons`). The agent's ones, by hand: delete `~/.wong-stack/camoufox/addons/` and `addons.json` with the browser stopped. An answer saved by an older version, *None* included, is ignored.

Part of [browsing](browsing.md), in [development](README.md).
