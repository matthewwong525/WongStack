# One browser window with a tab for each chat, and browser settings on each computer

**Status:** ready
**Branch:** explore/browser-tabs-password-manager
**Open questions:** none

## Why

When several chats use the assistant's browser, each chat opens its own window, so your screen fills with windows. On Linux, the browser always hides on a virtual screen, even on a computer where you sit at the screen. The proxy is always on, though most new people do not need it. And the assistant asks every new person which password manager they use, though anyone can add one to the browser the way they add any extension.

## What Changes

- **One window, a tab for each chat.** Each chat gets its own tab in the one browser window. The chats work at the same time. While it is your turn in a tab, the other chats keep working in their own tabs and never switch away from yours.
  ```screen
  <div class="card col gap">
    <div class="row gap"><span class="tag">Netflix · chat 1</span><span class="tag-outline">UPS · chat 2</span><span class="tag-outline">Shopify · schedule</span></div>
    <div class="field">netflix.com/login</div>
    <div class="skeleton"></div>
    <span class="muted">One window. A tab closes when its chat is done.</span>
  </div>
  ```
- **The browser shows on your screen by default, Linux too.** On a Mac, on Windows, and on a Linux computer with a screen, the browser opens in a window you can see and use. Your turn happens in that window: you do the step and say *done*. A Linux computer can turn on the link setting: then the browser hides on its virtual screen and your turn comes as a live-view link. A Linux server with no screen always uses the link.
  ```mermaid
  flowchart TD
    A["Browser starts"] --> B{"Linux?"}
    B -- "No" --> W["Window on your screen"]
    B -- "Yes" --> C{"Link setting on, or no screen?"}
    C -- "No" --> W
    C -- "Yes" --> L["Virtual screen, live-view link"]
  ```
- **On a Mac, the window stays out of sight until it's your turn.** The browser works hidden, so it never covers what you're doing. When a step needs you, its window comes to the front on your tab. When your turn ends, it hides again. Say *show me the browser* to see it at any time.
  ```mermaid
  flowchart TD
    W["works hidden"] --> T{"needs you?"}
    T -- "no" --> W
    T -- "yes" --> F["window comes to the front"]
    F --> D["you do the step, say done"]
    D --> W
  ```
- **Ask for the browser at any time.** With the link setting on, say *send me the browser* and you get a live-view link to your chat's tab. It stays open until you tap *Hand back*. The link still comes by itself for a sign-in, a payment, a robot check, or a stuck step. With a window, the assistant brings your chat's tab to the front instead, and keeps it yours until you say *done*.
  ```text
  You: send me the browser
  Assistant: Here is the browser, on your
  UPS tab. Tap Hand back when you're done.
  https://view-k3x.trycloudflare.com/…
  ```
- **The proxy is a setting, off by default.** The browser goes straight to sites unless you turn the proxy on. Say *turn the browser proxy on* if a site such as UPS does not load. A running browser keeps what it has; the change takes effect at its next start.
  ```text
  You: turn the browser proxy on
  Assistant: The proxy is on from the
  browser's next start. It's running now
  for 2 chats, so I won't restart it.
  ```
- **These settings stay on this computer.** The window or link setting and the proxy setting are saved in your home folder, never in the repo, so each computer keeps its own and no teammate gets yours.
  ```text
  ~/.wong-stack/browser-settings.json
  { "window": true, "proxy": false }
  ```
- **Add a password manager yourself, like any extension.** The assistant no longer asks which password manager you use. In the browser window, you open Firefox's add-on site and add the one you want, as in your own Firefox. The assistant still never opens, reads, or types into any add-on. An automatic check loads a real add-on in a throwaway browser and confirms the assistant can not reach into it.
  ```text
  Before: Assistant: Which password manager
          do you use? [1Password] [Bitwarden]
          [Other] [None]
  After:  (no question; you add it yourself
          from addons.mozilla.org in the window)
  ```

**Non-goals:** a separate browser or set of logins for each chat; a link setting on a Mac or Windows computer; a proxy in another country or a paid proxy service; the assistant using the password manager itself; restarting a running browser to apply a setting.

## What the build needs

- **The browser on this Mac**: Ready. Camoufox 158.0.1-beta.41 is installed, and a throwaway copy opened tabs in one window in a test today.
- **A Linux computer**: Ready. The automatic tests use a stand-in screen. No real Linux desktop is tried in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `password-manager-add-on`: the once-only question at install goes; the person adds a password manager, or any add-on, themselves.
- `browser-logins`: tasks share one window with a tab each; the window is the default on Linux with a screen too; a per-computer link setting on Linux; the person can ask for the browser at any time; the local proxy becomes a per-computer setting, off by default.

## Impact

- `.agents/skills/browser/scripts/browser-server.mjs`: the first task page opens a window and later ones open as tabs in it, from a kept home tab; no tab switch while a person's turn is open; window on Linux when a screen exists and the link setting is off; the forwarder starts only with the proxy setting on.
- `.agents/skills/browser/scripts/browse.mjs`: `window [on|off]` covers Linux (off means the link); a new `proxy [on|off]`; both in `~/.wong-stack/browser-settings.json`.
- `.agents/skills/hand-over/scripts/view.mjs` and `hand-over.mjs`: a window turn on a Linux desktop; select the task's tab, not raise its own window; keep the turn's tab selected in a live view; an on-request `--keep-open` view.
- `.agents/skills/browser/scripts/addons.mjs` and `browse.mjs`: no `BROWSE_ADDON=none` offer line, no `addon asked` or `decline`.
- `.agents/skills/browser/SKILL.md`, `wiki/development/browsing.md`, `live-view.md`, `password-manager.md`.
- Tests: `scripts/tests/browser-server.test.mjs`, `browse.test.mjs`, `view.test.mjs`, `hand-over.test.mjs`, `addons.test.mjs`, and a real-browser check of tabs and a real add-on, run by hand, not in CI.

## Decision log

- **2026-11-06** — Asked how several chats share the browser → chose one window with a tab for each chat, working at the same time, never switching away from the person's tab during their turn.
- **2026-11-06** — Asked when the Linux link setting sends the link → chose at its usual steps (sign-in, payment, robot check, stuck step) and also whenever the person asks for the browser.
- **2026-11-06** — Asked whether the proxy gets a setting → the requester said: *"proxy is off by default because people new probably wont use a proxy but this gives a setting to flip it on and off"*.
- **2026-11-06** — Asked how to test the password manager → chose a real 1Password test on this Mac, with a restart and two chats in tabs, plus an automatic check that loads a real add-on in a throwaway browser.
- **2026-11-06** — Asked where the proxy and link settings live → the requester said they *"should be local to the computer not committed and shared"*. They go in `~/.wong-stack/browser-settings.json`, where the window setting already is.
- **2026-11-06** — Assumed: tabs open through the browser's own new-tab path from a kept blank home tab, because the driver's own new page always opens a new window. A test with a throwaway Camoufox on this Mac gave 2 windows for 2 driver pages, and no new window for a page opened from inside one; a background tab ran its timers on time and took a picture.
- **2026-11-06** — Assumed: a Linux computer shows the window when the browser's start sees a screen (`DISPLAY` or `WAYLAND_DISPLAY`), else it uses the link, because a server has no screen to show.
- **2026-11-06** — Assumed: the link setting is the same `window off` on Linux, not a second setting, because one switch can not disagree with itself. On a Mac or Windows computer, `window off` keeps its meaning: no window and no link.
- **2026-11-06** — Assumed: every computer, this one included, starts with the proxy off at its next browser start, because the default is off for everyone. A site that loaded only through the proxy, as UPS did in October, then needs `proxy on`; the refusal steps name it.
- **2026-11-06** — Assumed: on request, the link view is a stay-open view of the chat's own tab, because the person asked to look and use, not to finish one step.
- **2026-11-06** — Asked at /ship → the requester said: *"i'll add the password manager myself no need to prompt me to add it also i think person can just add it themselves if they wish as with other extensions"*. The once-only question at install goes, and the real 1Password test with the person leaves this change; the automatic real add-on check stays.
- **2026-11-06** — Assumed: `addon find`, `add`, `open` and `remove` stay for a person who asks the assistant to add one, because they check the maker and the file's fingerprint; only the offer and its `asked` and `decline` records go. Checked: Camoufox's policies block no add-on install from Firefox's add-on site, and turn off automatic add-on updates (`ExtensionUpdate: false`), so an add-on the person adds by hand does not update itself.
- **2026-11-06** — Checked with `scripts/tests/manual/browser-tabs-real.mjs` on this Mac (a throwaway Camoufox, Bitwarden from Firefox's add-on site): 3 task tabs gave 1 window; typing, a key, reading, and a picture in a tab behind left the person's tab shown; a click selected its own tab, so a click waits for the person's turn, as a resize does; a resize of a tab behind sized the shown tab's window and never ended, so a resize now shows its tab first; the add-on's page opened in a task tab, and its frame stayed out of a snapshot and refused a click. A page can not tell which tab shows, since Camoufox and the driver tell every tab it shows, so the check reads it from a small throwaway add-on of its own.
- **2026-11-06** — Assumed: while the person's turn is open in one chat's tab, another chat's `hand-over.mjs open` stops with *the person is using the browser in another chat's tab*, because its tab could not show for the person's turn.
- **2026-11-06** — Asked, in the chat calm-dinosaur, whether the browser can work hidden and show only the parts that need the person → chose yes, added to this plan rather than a separate one, because it changes the same window and one window makes it simpler.
- **2026-11-06** — Checked on this Mac from calm-dinosaur: the standard macOS call (`NSRunningApplication` hide and unhide, through `osascript -l JavaScript` by the Camoufox process id) hides the browser with no permission prompt; the browser keeps working hidden; a new window unhides it without taking the keyboard; moving within a tab keeps it hidden.
- **2026-11-06** — Assumed: hiding is for a Mac only, and Windows and a Linux desktop keep the window shown as above, because only the Mac call was tried.
- **2026-11-06** — Assumed: a live view's poll selects the turn's tab again only while no page the person or a site opened during the turn is open, because a page can not tell which tab shows. A tap on another chat's tab or the home tab goes back; a *Forgot password* tab, a bank's check page, or a *Sign in with Google* tab stays until it closes. A tab the person opened before the turn does not stop it, since the turn began on the turn's tab.
- **2026-11-06** — Assumed: *show me the browser* runs the same `hand-over.mjs open --view --keep-open` turn as *send me the browser*, not `browse.mjs show`, because only a turn keeps the window up until *done*; `show` holds no turn, so the next step of any chat hides it again. `browse.mjs show` stays for a finished page the agent wants the person to see.
- **2026-11-06** — Assumed: the window hides again at a turn's end inside the server, on `front` with `turn: false`, which every end in `hand-over.mjs` already sends (`done`, `closed`, `handed-back`, `timeout`, an error), and on a lease that lapses, because one place then covers every end.
- **2026-11-06** — Checked on this Mac with a throwaway Camoufox (`scripts/tests/manual/browser-tabs-real.mjs`, aimed at its own process id): while the app is hidden, a mouse click and `bringToFront` hang, and the click fell back to the page's own script; typing, a key, a read, and a picture work. Assumed: a click, a plain `front`, and a resize unhide the app without activating it for that step alone, then hide it again, because an untrusted script click is easy for a site to spot. Unhidden this way, the window sits just behind the person's app.
- **2026-11-06** — Checked on this Mac: `activateWithOptions` from `osascript` brought the window in front 7 times of 8 in a short test, but at the turn of every full manual run, with the person using another app, the window stayed just behind that app. Assumed: the turn asks twice and goes on; the window then shows just behind the person's app, and the chat says to click *Camoufox* in the Dock.
- **2026-11-06** — Assumed: the server finds the browser's process id as its own child whose program is `camoufox` (from `ps`), because the driver gives no process id for a persistent context; a failed hide or show is written once in `~/.wong-stack/camoufox/server.log`, since the server's own output goes nowhere.
- **2026-11-06** — Assumed: *send me the browser* runs `hand-over.mjs open --view --keep-open` on every computer, not `browse.mjs front` on a window computer, because `front` holds no turn, so another chat's click could take the window away. With a window it takes the window path, holds the turn, and ends when the person says *done* and the agent runs `close`.
- **2026-11-06** — Assumed: checkpoint at /ship with tasks 1–5 built and the main specs reconciled; local script tests fail only in the Mac temp-folder and driver tests outside this change, so CI is the gate.
