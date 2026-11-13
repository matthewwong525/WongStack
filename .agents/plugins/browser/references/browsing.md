# Browsing

Browsing lets the agent use websites as you: the browser's own sign-ins, pictures, chat questions, and a live view for what only you can type. It hands you its browser for [a sign-in, a payment or a backup code, a robot check, or a stuck step](../skills/hand-over/references/live-view.md#when-it-opens), or [when you ask](browser-window.md#ask-for-the-browser). Every repo on the computer shares it.

**No API? The browser.** When no [company action or saved key](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/service-catalogue.md) can do a task on a website, the agent does it here as you, without being asked. It doesn't hand you steps first.

**API key and token pages use your own browser, never this one.** At such a page, even mid-errand, follow [the token website procedure](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/secrets.md#api-token-website-steps): it overrides sign-ins, pictures, and live views below. While [connecting your tools](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/connect-your-tools.md#pick-the-browser), the assistant makes keys here, in its window or on a server.

## Saved browser logins

The agent reaches your accounts (mail, calendar, banking) in [Camoufox](https://camoufox.com), a Firefox that more sites let in, not through connectors. One script drives it: [`browse.mjs`](../scripts/browse.mjs), through a small server beside it, [`browser-server.mjs`](../scripts/browser-server.mjs). Your logins stay in the browser's profile folder in your home folder, outside every repo, and survive a restart. The browser also keeps one device identity, made once per Camoufox version, so a site does not see a new device at each restart. The identity tells sites your computer's real system: Mac on a Mac, Windows on Windows, Linux on Linux. So the browser uses your computer's own fonts, and its own pages, such as its add-ons page, read correctly.

```bash
B=.claude/skills/browser/scripts/browse.mjs
node $B open https://www.netflix.com/   # BROWSE_URL=, once the page settles
node $B snapshot                        # the page as text, each part with a ref: e1, e2…
node $B click e7                        # also: type e3 "Jo", press Enter, select e5 "Large"
node $B get url                         # also: get count <selector>, get value e3
node $B close                           # this task's page; keeps the logins
```

A failed command prints one `BROWSE_ERROR=` line. A ref comes from the newest snapshot.

**Each ref acts on the box it marks.** A box in a payment box gets its own ref, even when the page has a box of the same name. When the script can't tell them apart, those boxes print no ref, and a `- note:` line says so: read the page again or use a selector. A click on a tick box, a round choice, or a switch is read back; if nothing changed, the script presses Space on it, and if it still didn't change, prints `BROWSE_ERROR=the box did not change`. A button with no ref, such as DigiKey's *Continue* `span`, takes a selector: `span[id*=ontinue]`. `BROWSE_CLICK=script` means only the page's script took the click, which a site may ignore: don't click again; send [the view that stays open](../skills/hand-over/references/live-view.md#when-it-opens). A box in a frame from another site, such as a shop's sign-in frame, is listed at the end of the page text under a header naming its site: use its ref, never a selector, since a selector reads only the main page.

1. **The first errand installs the browser, once you say yes.** On `BROWSE_NEEDS=install` (exit 3), the agent asks once, saying [what the install needs](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/required-tools.md#installing-camoufox): Python 3.10 or newer, 3 GB of disk, 700 MB of memory. It runs `browse.mjs install`. On `BROWSE_NEEDS=python`, it asks for Python first.
2. **A sign-in uses 1Password, or your turn.** When a site asks to log in and the browser isn't signed in, the agent first offers [a login or passkey from your unlocked 1Password](password-manager.md#use-it-at-a-sign-in). Else it asks whether you're ready, then sends [a sign-in turn](../skills/hand-over/references/live-view.md#sign-in): you sign in on the site's page, through a link or [in a window](browser-window.md#where-it-shows), and click *Hand back* at the top of the browser.
   - **A code page or an app approval after your turn:** the agent reads the code from your email or asks you in the chat: [login codes](login-codes.md).
   - **A robot check:** during your turn, it's yours to pass there; after it, you tap through it in [a live view](../skills/hand-over/references/live-view.md#when-it-opens).
3. **A login through another provider follows the provider.** When the page offers only *Sign in with Google* or *Apple*, the agent taps it and treats the provider's own sign-in page as any login: a sign-in turn there. A code or an emailed sign-in link comes [through the chat](login-codes.md). A passkey not in 1Password, or a device check, is [yours, on your own device](#when-a-step-needs-you).
4. **Later tasks reuse the session.** No login step, until the site logs you out.

**The agent never asks for a password in the chat.** It never reads, shows, types, or writes one. Its view of a page shows a filled password, card, or code box as `[hidden]`, even after a site shows the password as text; a box inside a payment company's frame is known by its name alone. If you start typing a password into the chat, it doesn't use or save it; it offers [a sign-in turn](../skills/hand-over/references/live-view.md#sign-in) instead.

**Tasks share the browser: one window, a tab each.** Two chats, or a chat and a scheduled run, each get their own tab and the same logins; neither waits, and neither shows its tab during a turn ([a tab for each chat](browser-window.md#a-tab-for-each-chat)). A page is named for its task's folder, so a second task in one folder passes `--session <name>` on every command. `close` closes only the task's own page; `stop` ends the browser for every task, so the agent runs it only when you ask. [`/verify`](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/staging-walkthrough.md) uses a temporary browser of its own, without your logins.

**A check never clears a shared browser's cookies.** A test that needs a clean or signed-in browser uses a throwaway profile in a temporary folder, deleted afterwards. Never run `cookies clear` on a profile that holds sign-ins, such as `~/.wong-stack/browser-profile`: it deletes every sign-in there for good. A check run with `agent-browser` passes `--profile <temp folder>` too: its default profile is shared, and when another chat holds it, Chrome stops with `SingletonLock: File exists`.

**A test never copies a Facebook or Messenger login** to another browser or network: Meta can lock the account.

**Read a page only after it settles.** `open` waits for two matching reads a second apart. After a click, read again if the page looks unfinished.

**A slow step is not a stuck one.** After a click on a step such as *Continue*, read the page again for up to 30 seconds before you call it stuck: DigiKey's Export step took over 10.

**Nothing is reported to the browser's makers.** The server sends no failure reports, and it listens only on this computer, behind a key only you can read.

**The first start moves your old logins once.** It copies the cookies and site storage of the old camofox browser into the new profile, then writes a `migrated` file so it never copies again. It never copies a Facebook, Messenger, Instagram, or other Meta login: Meta can lock an account when its login shows up in another browser, so you sign in to those again.

### The proxy setting

**The proxy is off unless you turn it on.** The browser goes straight to sites. If a site such as UPS does not load, say *turn the browser proxy on*: the agent runs `browse.mjs proxy on`, which prints `BROWSE_PROXY=on`. The browser then goes through a local forwarding proxy on this computer, with no extra install or account. It keeps no browsing logs and tunnels secure traffic encrypted. With the proxy on, a proxy that fails to start stops the browser's start; stopping the browser closes its proxy. `proxy off` turns it off, and `proxy` alone prints the setting. The setting [stays on this computer](browser-window.md#settings-stay-on-this-computer).

With the proxy on and [saved proxies](browser-proxy.md), such as one at your home and a paid backup, the browser goes through them first, so sites see your home address. Otherwise it uses this computer's own network, so sites see the computer's country. Its timezone and English follow the address sites see. It needs no WARP, relay, or phone connection, and chooses no country. Sites can still [refuse](#when-a-site-refuses-the-browser).

A running browser keeps its pages and logins, and takes a setting or an update only once you stop it and a later errand starts it. Never restart it for a setting or an update.

## Show what the browser is doing

The agent shows page pictures in the chat at key moments, so you can catch a wrong page or field.

- **When.** Each new page, before publishing, sending, booking, paying, or deleting, and the result. Avoid pictures after every click: they hide the one that matters.
- **A picture before a yes.** Before one of those actions, the picture goes with a question in the chat: *Publish the site now?* The agent waits for your yes, however long you take, then acts.
- **How.** Save to the temp folder, then open the printed path with your image tool (Claude's Read, Codex's image view). [Paseo](https://paseo.sh) shows it in chat; a terminal shows a placeholder.

  ```bash
  node .claude/skills/browser/scripts/browse.mjs screenshot --if-changed   # BROWSE_SHOT=<temp path>, or none: nothing new to show
  ```
- **One line each.** Above each picture, one line says what it shows: *Filled in 7pm, 2 people. Booking now.*
- **Never in the repo.** A picture can hold your mail or your bank balance, so it stays in the temp folder, never a repo file.
- **None while [a live view](../skills/hand-over/references/live-view.md) is open, and none of a typed card.** From sending the link until it closes, the agent takes no pictures: one could show your card. After it, a snapshot is safe; a picture waits until no card box holds a value, since a site can keep a typed card in its boxes.

## When a step needs you

When a step needs something only you can give, each kind of step has one route:

- **A password, card details, a backup or recovery code**, or another lasting secret the page asks for, you type on the site's own page in [a live view](../skills/hand-over/references/live-view.md#when-it-opens). Never the chat: these don't expire, so they must not sit in the stored chat.
- **A one-time code, an emailed sign-in link, or an app approval** comes through the chat or your signed-in email: [login codes](login-codes.md).
- **An ordinary answer** is asked in the chat, or taken from [saved details](../skills/hand-over/references/saved-details.md) after a yes: an email, a name, an address, a choice, a yes or no, or agreeing to terms. The agent types your answers itself and shows you [a picture of the page](#show-what-the-browser-is-doing). It never ticks *I agree* without your yes.
- **An API key or token page** is yours, in your own browser: [the own-browser procedure](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/secrets.md#api-token-website-steps).
- **A robot check**, a tick box or a picture puzzle, gets [a live view](../skills/hand-over/references/live-view.md#when-it-opens) you tap through.
- **A stuck site or payment step** gets [the view that stays open](../skills/hand-over/references/live-view.md#when-it-opens) until you tap *Hand back*.
- **A site that refuses the browser**, or a check or sign-in your try doesn't clear, [ends with steps for you](#when-a-site-refuses-the-browser).
- **A step only your own device can do** ends with you: a passkey on your own phone or computer, or a device check. The agent stops that step and gives you [steps to finish it yourself](#steps-for-you-to-finish).

**Ask for the browser at any time.** *Send me the browser*, *show me the browser*, or *let me take over* gets you [your chat's tab](browser-window.md#ask-for-the-browser). A step above that needs you still takes its own route. The agent never solves a check that asks whether a person is there, even when asked.

## Steps for you to finish

When a login or check stops the agent, it gives you steps for the rest of the job: signing in on your phone doesn't sign its browser in. [Steps for you to finish](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/finish-steps.md) owns how they read, with an example.

## How private links work

A private link is a page only you can open, for something the agent must never see or do. There are two: [the key link](../skills/hand-over/references/key-link.md) for an API key, and [the live view](../skills/hand-over/references/live-view.md) for everything you type on a website. [`hand-over.mjs`](../skills/hand-over/scripts/hand-over.mjs) opens each one, and this section owns what they share. A page whose answers *should* reach the chat, such as a plan's notes, opens through [a reply link](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/reply-links.md) instead, which never blocks a private link.

- **Ask first.** Before a live view, the agent asks in the chat as a multiple choice, with the assistant's question tool when it has one, else a short numbered list: *Pay City of Markham $45.00?* `Ready, send it / Not now`. It sends the link only once you reply. A [key link](../skills/hand-over/references/key-link.md) comes with no question.
- **Send it last.** The agent runs `open`, starts `wait` in the background, then ends its turn with the link on its own line, never only between steps: the chat often hides that text. `open` prints a `HANDOVER_SEND=` reminder under the link.
- **Always through Cloudflare, one per chat.** Every link is a Cloudflare address, even at the agent's own computer. `open` prints `HANDOVER_LINK` only once that address answers from outside, so your first tap never lands on an error page. On `HANDOVER_NEEDS=cloudflared`, the agent asks, installs [Cloudflare's tunnel tool](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/required-tools.md#installing-cloudflared), and tries again. Each chat has its own link; an unopened key link gives way to its chat's newer one. The computer has one [live view](../skills/hand-over/references/live-view.md#what-the-link-can-do), with a tab for each chat that needs you.
- **Also in your company app.** When this computer is signed in to [your company app](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/company-api.md), the app keeps each open link until it closes. The app gets only its address, kind, title and closing time: never what you type or a note. The chat gives you the link; [the inbox](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/reply-links.md#in-your-inbox-first) shows only your week and plans.
- **24 hours by default.** A key link closes 24 hours after opening, a [live view](../skills/hand-over/references/live-view.md) after 8; `--minutes N` changes that. A key link shows when it closes.
- **How a link closes.** A key link closes on its save or *Not now*, and a live view on *Hand back*, which ends every open turn. Either one closes when you say *done* and the agent runs `hand-over.mjs close`, or at its time limit, even if the chat stops. A closed link never works again.
- **After it closes.** A link that ends on your side (a save or *Hand back*) wakes the chat that opened it, even if it stopped waiting. The watcher closes private input first, then tries once through the Paseo CLI, sending only the completion's identity, mode, result, and saved names: never an address, page content, or credential. `HANDOVER_COMPLETION` names the event in both `wait` and the notification: act on it once and resume the task; a duplicate does nothing. `HANDOVER_NOTIFICATION=notified` means dispatch was acknowledged, not that the task has finished. Missing workspace identity or CLI gives `unavailable`; a failed or ambiguous send gives `unconfirmed`, with no automatic resend. The page then tells you to return to chat and say *continue*; saved inputs stay saved. Cancellation, expiry, and incomplete input never announce readiness (`ready: false` and `not-requested`). On `timeout`, the agent says so and offers a new link.

**Is a link safe?** Each link gets a new random address plus a secret key that only the link carries, and a copy left in the chat dies with it. Anyone who sees it while it's open can use it. Cloudflare carries the connection and could see what you type; your app already runs there, so you trust no new company. The agent learns only how the link ended and the names of what was saved, never a value. A live view sends what you type straight to the site's own boxes, and never reads it back, logs, or saves it. Each link adds one line to `~/.wong-stack/hand-over/timings.jsonl`, readable by your user alone and trimmed to its last 500 lines: what ended it and how long it was open, never a value. A live view alone [drives a browser signed in as you](../skills/hand-over/references/live-view.md#what-the-link-can-do) while it's open.

## When a site refuses the browser

Some sites turn the browser away, keep it on a *Verify you are human* page as DoorDash does, or reload their login with no message. A check or a stuck login first gets [one live view](../skills/hand-over/references/live-view.md#one-view-per-site). If the site still refuses, the agent stops:

1. **Say so in one line.** *DoorDash won't let my browser in.*
2. **Stop browsing that site.** No other browser and no second link.
3. **Give [steps to finish it yourself](#steps-for-you-to-finish)**, with the page's link. With [the proxy](#the-proxy-setting) off, the first step is: *say turn the browser proxy on, then ask me to restart the browser and try again*. A site such as UPS loaded only through it.

A check that clears by itself in a few seconds is not a refusal: the agent reads the page again first. It never routes its traffic through a hired or borrowed network address, uses a check-solving service, or solves a check that asks whether a person is there. One refusal ends the try: repeats can lock your account.

## Saved details

Everyday answers you chose to keep, such as an email or an address, fill a later form after one yes: [saved details](../skills/hand-over/references/saved-details.md).

Back to [the browser module](../README.md).
