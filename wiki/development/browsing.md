# Browsing

Browsing lets the agent use websites as you: saved logins, pictures, and chat questions or private forms. It shows its browser only for [a robot check or a stuck login](live-view.md). Every repo on the computer shares it.

**No API? The browser.** When no [company action or saved key](../stack/service-catalogue.md) can do a task on a website, the agent does it here as you, without being asked. It doesn't hand you steps first.

**API key and token website steps use your own browser.** Before opening or interacting with a token page, follow [the token website procedure](secrets.md#api-token-website-steps), including when ordinary browsing reaches such a step. It takes precedence over saved logins, pictures, and private forms below; the agent gives you the service link and short steps.

## Saved browser logins

The agent reaches your accounts (mail, calendar, banking) in [camofox](https://github.com/jo-inc/camofox-browser), a browser more sites let in, not through connectors. One script drives it: [`browse.mjs`](../../.agents/skills/browser/scripts/browse.mjs). Your logins stay in your home folder, outside every repo, and survive a restart.

```bash
B=.claude/skills/browser/scripts/browse.mjs
node $B open https://www.netflix.com/   # BROWSE_URL=, once the page settles
node $B snapshot                        # the page as text, each part with a ref: e1, e2…
node $B click e7                        # also: type e3 "Jo", press Enter, select e5 "Large"
node $B get url                         # also: get count <selector>, get value e3
node $B close                           # this task's page; keeps the logins
```

A failed command prints one `BROWSE_ERROR=` line. A ref comes from the newest snapshot.

**Each ref acts on the box it marks.** A box in a payment box gets its own ref, even when the page has a box of the same name. When the script can't tell them apart, those boxes print no ref, and a `- note:` line says so: read the page again or use a selector. A click on a tick box, a round choice, or a switch is read back; if nothing changed, the script presses Space on it, and if it still didn't change, prints `BROWSE_ERROR=the box did not change`.

1. **The first errand installs the browser, once you say yes.** On `BROWSE_NEEDS=install` (exit 3), the agent asks once, saying [what the install needs](required-tools.md#installing-camofox): about 1.4 GB of disk and 700 MB of memory. It then runs `browse.mjs install`.
2. **A saved login goes first.** When a site asks to log in, the agent runs `browse.mjs logins`, which gives each login's name, site, and username, never a password. It matches the login page's host against each saved site's host, `www.` dropped: they match when they're equal, or when one sits under the other, so `login.netflix.com` matches `netflix.com`. The script checks the same match itself, right before each value it types.
   - **One match:** the agent logs in without asking, because saving the login was your permission. It names the page's boxes from its own snapshot, and the script types the login into them:

     ```bash
     node $B login netflix-com --username e4 --password e5 --submit e6   # BROWSE_LOGIN=accepted|rejected|missing|typed|wrong-site
     ```

     `accepted` means the address left the login page within 15 seconds; the login is saved at once. A page that asks for the email first gets two commands, each with the one box it shows: the first prints `BROWSE_LOGIN=typed`. A login saved with no password prints `missing` at the password box, and types nothing. `wrong-site` means the page is on another site, or moved there after the email: nothing more was typed.
   - **Two matches:** it asks in the chat which account to use, as a multiple choice.
   - **No match, `missing`, `wrong-site`, or `rejected` with a message:** it sends [the password link](passwords.md) with the site, and a known username, already filled in, then logs in with what you save. A first page that asks only the email gets the link at once, with `--email-first`: you give the email and an optional password together, never the email in the chat.
   - **A code page or an app approval:** it reads the code from your email or asks you in the chat: [login codes](login-codes.md).
   - **A robot check, or a stuck login:** you tap through it or sign in yourself in [a live view](live-view.md#when-it-opens). A `rejected` with no message, or a `typed` email step that stays put, is stuck.
3. **A login through another provider follows the provider.** When the page offers only *Sign in with Google* or *Apple*, the agent taps it and treats the provider's own sign-in page as any login: a saved login for that provider, else [the password link](passwords.md) with the provider's website filled in. A code or an emailed sign-in link comes [through the chat](login-codes.md). A passkey or a device check is [yours, on your own device](#when-a-step-needs-you).
4. **Later tasks reuse the session.** No login step, until the site logs you out.

**The agent never asks for a password in the chat.** It never reads, shows, or writes one, and it never opens [the saved logins file](passwords.md): only the script that types a login reads it. Its view of a page shows a filled password, card, or code box as `[hidden]`, even after a site shows the password as text; a box inside a payment company's frame is known by its name alone. If you start typing a password into the chat, it doesn't use or save it; it offers [the password link](passwords.md) instead.

**Tasks share the browser.** Two chats, or a chat and a scheduled run, each get their own page and the same logins; neither waits. A page is named for its task's folder, so a second task in one folder passes `--session <name>` on every command. `close` closes only the task's own page; `stop` ends the browser for every task, so the agent runs it only when you ask. [`/verify`](staging-walkthrough.md) uses a temporary browser of its own, without your logins.

**A check never clears a shared browser's cookies.** A helper that needs a clean or signed-in browser for a test makes a throwaway profile in a temporary folder and deletes it afterwards. Never run `cookies clear` on a profile that holds sign-ins, such as `~/.wong-stack/browser-profile`: it deletes every sign-in there for good, and you must log in again by hand.

**Read a page only after it settles.** `open` waits for two matching reads a second apart. After a click, read again if the page looks unfinished.

**Nothing is reported to the browser's makers.** `browse.mjs` switches camofox's failure reports off at every start, and the browser listens only on this computer.

**Every new start uses a local forwarding proxy automatically**, with no extra install or account. It keeps no browsing logs and tunnels secure traffic encrypted. Startup failure stops the browser; stopping the browser closes its proxy.

It uses this computer's own network: Canadian on a Canadian laptop, Finnish on a Finland server. It needs neither WARP nor Paseo's relay, chooses no country, and uses no phone connection. Sites can still [refuse](#when-a-site-refuses-the-browser).

A running browser keeps its pages and logins. The default activates after you ask to stop it and a later errand starts it again. Never restart it just for an update.

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
- **None while a private form or [a live view](live-view.md) is open.** From sending the link until it closes, the agent takes no pictures: one could show your card.

## When a step needs you

When a step needs something only you can give, the agent gets it without showing you its browser, except at a robot check or a stuck login. Each kind of step has one route:

- **A password**, or the email a login asks for, goes through [the password link](passwords.md).
- **A one-time code, an emailed sign-in link, or an app approval** comes through the chat or your signed-in email: [login codes](login-codes.md).
- **An ordinary answer** is asked in the chat: an email, a name, an address, a choice, a yes or no, or agreeing to terms. The agent types your answers itself and shows you [a picture of the page](#show-what-the-browser-is-doing). It never ticks *I agree* without your yes.
- **A sensitive detail** goes through [the private form](#the-private-form): card details, a backup or recovery code, or another lasting secret the page asks for. Never the chat: these don't expire, so they must not sit in the stored chat.
- **An API key or token page** is yours, in your own browser: [the own-browser procedure](secrets.md#api-token-website-steps).
- **A robot check**, a tick box or a picture puzzle, or **a stuck login** gets [a live view](live-view.md#when-it-opens) you tap through or sign in on.
- **A site that refuses the browser**, or a check or login your try doesn't clear, [ends with steps for you](#when-a-site-refuses-the-browser).
- **A step only your own device can do** ends with you: a passkey or a device check. The agent stops that step and gives you [steps to finish it yourself](#steps-for-you-to-finish).

*Let me take over* opens nothing, except [a live view](live-view.md) at a robot check or a stuck login. Elsewhere the agent names the route above that fits. It never solves a check that asks whether a person is there, even when asked.

## Steps for you to finish

When a login or check stops the agent, it gives you steps for the rest of the job. Signing in on your phone doesn't sign its browser in.

- **One line on what stopped it.** *The shop wants a passkey, which only your phone can give.*
- **Numbered steps, one action each**, in the order you'll do them on your own phone or computer.
- **A link on every step that has a page**: the exact page, not the home page. The agent uses the address it was on, or one the site publishes. It never invents one: when unsure, it links the nearest page and makes the rest a step.
- **The site's own words.** Each button and box is named as the site labels it.
- **What it already knows, filled in**: the item, the date, the amount, the address, so you copy and don't look up. Never a password, a card, or a code.
- **What comes back.** The last step says what to tell the agent, and what it does next.
- **Nothing else.** No section on how things work, no background, and no other route to try.

```text
The shop wants a passkey, which only your phone can give. To finish the order:

1. Open the trail mix: https://shop.example.com/p/trail-mix-1kg
2. Set the quantity to 2 and tap Add to cart, then Checkout.
3. Sign in with your passkey.
4. Pick Pickup at Markham, Saturday 10 to 11am.
5. Tap Place order, and tell me the order number. I'll put the pickup in your calendar.
```

## How private links work

A private link is a page only you can open, for something the agent must never see or do. There are four: [the password link](passwords.md), [the key link](secrets.md#receive-a-key-through-a-private-link), [the private form](#the-private-form), and [the live view](live-view.md). [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs) opens each one, and this section owns what they share. A page whose answers *should* reach the chat, such as a plan's notes, opens through [a reply link](reply-links.md) instead, which never blocks a private link.

- **Ask first.** Before a password link, a private form, or a live view, the agent asks in the chat as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *I need your card to pay City of Markham $45.00.* `Ready, send the form / Not now`. It sends the link only once you reply. A [key link](secrets.md#receive-a-key-through-a-private-link) comes with no question.
- **Always through Cloudflare, one at a time.** Every link is a Cloudflare address, also when you sit at the computer the agent runs on: there is no local link. `open` prints `HANDOVER_LINK` only once that address answers from outside, so your first tap never lands on an error page. On `HANDOVER_NEEDS=cloudflared`, the agent asks, installs [Cloudflare's tunnel tool](required-tools.md#installing-cloudflared), and tries again. Only one link is open at a time; a key link nobody has opened gives way to a newer one.
- **Also in your inbox.** When this computer is signed in to [your company app](../stack/company-api.md), each link waits under *Needs you* in [the inbox](reply-links.md#in-your-inbox-first) until it closes, and *Open* opens it in a new tab. The app gets only its address, kind, title and closing time: never what you type, a username, or a note.
- **24 hours by default.** A key, password or form link closes 24 hours after opening, a [live view](live-view.md) after 8; `--minutes N` changes that. A key link or form shows its closing time, with *tomorrow* or the weekday when it isn't today.
- **How a link closes.** On its own finish (a save, a form's send, or a check you passed), on *Not now*, when you say *done* and the agent runs `hand-over.mjs close`, or at its time limit, even if the chat stops. A closed link never works again.
- **After it closes.** A link that ends ready (a save, or a form the site accepted) wakes the chat that opened it, even if it stopped waiting. The watcher closes private input first, then tries once through the installed Paseo CLI, sending only completion identity, mode, result, and the names of what was saved: never a private address, page content, or credential. `HANDOVER_COMPLETION` identifies the same event in `wait` and the notification: handle that identity once, resume the original task, and consume a duplicate without doing the task again. `HANDOVER_NOTIFICATION=notified` means dispatch was acknowledged, not that the task has finished. Missing workspace identity or CLI gives `unavailable`; a failed or ambiguous send gives `unconfirmed`, with no automatic resend. The page then tells you to return to chat and say *continue*; saved inputs stay saved. Cancellation, expiry, incomplete input, and a form the site did not accept never announce readiness (`ready: false` and `not-requested`). A form the site hasn't answered wakes the chat as `unconfirmed`, and its final result wakes it again as a new completion, its identity ending `:late`. On `timeout`, the agent says so and offers a new link.

**Is a link safe?** Each link gets a new random address plus a secret key that only the link carries, and a copy left in the chat dies with it. Anyone who sees it while it's open, say over your shoulder, can use it. Cloudflare carries the connection, so like any site it hosts, it could in principle see what you type; your app already runs there, so this adds no new company to trust. The agent learns only how the link ended and the names of what was saved, never a value. A private form reads back nothing you gave it: what you type goes straight into the site's own boxes, and is never read back, logged, or saved. Its helper reads only the page's address, whether a named part is still there, and a dropdown's own choice before your pick, to put it back if the site says no. It records how long each step took, never a value. A live view alone [drives a browser signed in as you](live-view.md#what-the-link-can-do) while it's open.

### The private form

The private form takes a sensitive detail, such as a card or a backup code, from you to a website without the agent seeing it. It shows one picture of the site's page, and saves nothing you type. [The private form](private-form.md) owns how it works and how the agent opens one.

## When a site refuses the browser

Some sites turn the browser away, keep it on a *Verify you are human* page as DoorDash does, or reload their login with no message. A check or a stuck login first gets [one live view](live-view.md#one-view-per-site), where it can show one. If the site still refuses, the agent stops:

1. **Say so in one line.** *DoorDash won't let my browser in.*
2. **Stop browsing that site.** No other browser and no second link.
3. **Give [steps to finish it yourself](#steps-for-you-to-finish)**, with the page's link.

A check that clears by itself in a few seconds is not a refusal: the agent reads the page again first. It never routes its traffic through a hired or borrowed network address, uses a check-solving service, or solves a check that asks whether a person is there. One refusal ends the try: repeats can lock your account.

## Save your passwords

Say *save my passwords* and the agent sends a private link to pick the logins it may use: [save your passwords](passwords.md).

Back to [development](README.md).
