# Browsing

Browsing is how the agent uses websites as you: it keeps your logins, logs in with the passwords you save for it, shows you what it's doing, and asks you in the chat or through a private form when a step needs you. It never shows you its browser or lets you drive it. It works the same for every repo on the computer.

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

1. **The first errand installs the browser, once you say yes.** On `BROWSE_NEEDS=install` (exit 3), the agent asks once, saying [what the install needs](required-tools.md#installing-camofox): about 1.4 GB of disk and 700 MB of memory. It then runs `browse.mjs install` and carries on.
2. **A saved login goes first.** When a site asks to log in, the agent runs `browse.mjs logins`, which gives each login's name, site, and username, never a password. It matches the login page's host against each saved site's host, `www.` dropped: they match when they're equal, or when one sits under the other, so `login.netflix.com` matches `netflix.com`.
   - **One match:** the agent logs in without asking, because saving the login was your permission. It names the page's boxes from its own snapshot, and the script types the login into them:

     ```bash
     node $B login netflix-com --username e4 --password e5 --submit e6   # BROWSE_LOGIN=accepted|rejected|missing
     ```

     `accepted` means the address left the login page within 15 seconds; the login is saved at once. A page that asks for the email first gets two commands, each with the one box it shows: the first prints `BROWSE_LOGIN=typed`.
   - **Two matches:** it asks in the chat which account to use, as a multiple choice.
   - **No match, `missing`, or `rejected`:** it sends [the password link](passwords.md) with the site, and a rejected login's username, already filled in, then logs in with what you save.
   - **A code page or an app approval:** it reads the code from your email or asks you in the chat: [login codes](login-codes.md).
3. **A login through another provider follows the provider.** When the page offers only *Sign in with Google* or *Apple*, the agent taps it and treats the provider's own sign-in page as any login: a saved login for that provider, else [the password link](passwords.md) with the provider's website filled in. A code or an emailed sign-in link comes [through the chat](login-codes.md). A passkey or a device check is [yours, on your own device](#when-a-step-needs-you).
4. **Later tasks reuse the session.** No login step, until the site logs you out.

**The agent never asks for a password in the chat.** It never reads, shows, or writes one, and it never opens [the saved logins file](passwords.md): only the script that types a login reads it. If you start typing a password into the chat, it doesn't use or save it; it offers [the password link](passwords.md) instead.

**Tasks share the browser.** Two chats, or a chat and a scheduled run, each get their own page and the same logins; neither waits. A page is named for its task's folder, so a second task in one folder passes `--session <name>` on every command. `close` closes only the task's own page; `stop` ends the browser for every task, so the agent runs it only when you ask. [`/verify`](staging-walkthrough.md) uses a temporary browser of its own, without your logins.

**Read a page only after it settles.** A page read in its first second can be half-loaded: `open` waits until two reads a second apart match, and after a click the agent reads again when the page looks unfinished.

**Nothing is reported to the browser's makers.** `browse.mjs` switches camofox's failure reports off at every start, and the browser listens only on this computer.

## Show what the browser is doing

While the agent browses for you, it drops a picture of the page into the chat at each key moment, so you can catch a wrong page or a wrong field before it's too late.

- **When.** Each new page, right before an action that publishes, sends, books, pays for, or deletes something, and the result. Not after every click or keystroke: a flood of pictures hides the one that matters.
- **A picture before a yes.** Before one of those actions, the picture goes with a question in the chat: *Publish the site now?* The agent waits for your yes, however long you take, then acts.
- **How.** The agent takes the picture into the temp folder, then opens the path it prints with its own image tool (Claude's Read, Codex's image view). [Paseo](https://paseo.sh) shows an image a tool opens as a picture in the chat; a terminal shows a placeholder, which does no harm.

  ```bash
  node .claude/skills/browser/scripts/browse.mjs screenshot --if-changed   # BROWSE_SHOT=<temp path>, or none: nothing new to show
  ```
- **One line each.** Above each picture, one plain line says what it shows: *Filled in 7pm, 2 people. Booking now.*
- **Never in the repo.** A picture can hold your mail or your bank balance, so it stays in the temp folder, never a repo file.
- **None while a private form is open.** From sending [a private form](#the-private-form) until the site has answered, the agent takes no pictures: one could show your card.

## When a step needs you

When a step needs something only you can give, the agent gets it without showing you its browser. Each kind of step has one route:

- **A password** goes through [the password link](passwords.md).
- **A one-time code, an emailed sign-in link, or an app approval** comes through the chat or your signed-in email: [login codes](login-codes.md).
- **An ordinary answer** is asked in the chat: an email, a name, an address, a choice, a yes or no, or agreeing to terms. The agent types your answers itself and shows you [a picture of the page](#show-what-the-browser-is-doing). It never ticks *I agree* without your yes.
- **A sensitive detail** goes through [the private form](#the-private-form): card details, a backup or recovery code, or another lasting secret the page asks for. Never the chat: these don't expire, so they must not sit in the stored chat.
- **An API key or token page** is yours, in your own browser: [the own-browser procedure](secrets.md#api-token-website-steps).
- **A site that refuses the browser**, or shows a *Verify you are human* check that doesn't clear, [ends with steps for you](#when-a-site-refuses-the-browser).
- **A step only you can do on the page** ends with you: a picture puzzle, a passkey, or a device check. The agent stops that step and gives you [steps to finish it yourself](#steps-for-you-to-finish). No form helps: nothing typed can pass them.

*Let me take over* opens nothing. The agent has no live view of its browser to offer, so it names the route above that fits. It never solves a check that asks whether a person is there, even when asked.

## Steps for you to finish

When the agent can't get past a login or a check, it hands the rest to you in the chat as steps you can follow without asking anything back. A login on your own phone doesn't log the agent's browser in, so the steps cover the rest of the job, not only the login.

- **One line on what stopped it.** *The shop wants a passkey, which only your phone can give.*
- **Numbered steps, one action each**, in the order you'll do them on your own phone or computer.
- **A link on every step that has a page**: the exact page, not the home page. The agent uses the address it was on, or one the site publishes. It never invents one: when unsure, it links the nearest page and makes the rest a step.
- **The site's own words.** Each button and box is named as the site labels it.
- **What it already knows, filled in**: the item, the date, the amount, the address, so you copy and don't look up. Never a password, a card, or a code.
- **What comes back.** The last step says what to tell the agent, and what it does next.

```text
The shop wants a passkey, which only your phone can give. To finish the order:

1. Open the trail mix: https://shop.example.com/p/trail-mix-1kg
2. Set the quantity to 2 and tap Add to cart, then Checkout.
3. Sign in with your passkey.
4. Pick Pickup at Markham, Saturday 10 to 11am.
5. Tap Place order, and tell me the order number. I'll put the pickup in your calendar.
```

## How private links work

A private link is a page only you can open, for something the agent must never see. There are three: [the password link](passwords.md), [the key link](secrets.md#receive-a-key-through-a-private-link), and [the private form](#the-private-form). [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs) opens each one, and this section owns what they share. A page whose answers *should* reach the chat, such as a plan's notes, opens through [a reply link](reply-links.md) instead, which never blocks a private link.

- **Ask first.** Before a password link or a private form, the agent asks in the chat as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *I need your card to pay City of Markham $45.00.* `Ready, send the form / Not now`. It sends the link only once you reply, so the 10 minutes start when you're there, not while you're away. A question waits for you; a link dies. A [key link](secrets.md#receive-a-key-through-a-private-link) comes with no question and stays open 30 minutes.
- **Always through Cloudflare, one at a time.** Every link is a Cloudflare address, also when you sit at the computer the agent runs on: there is no local link. `open` prints `HANDOVER_LINK` only once that address answers from outside, so your first tap never lands on an error page. On `HANDOVER_NEEDS=cloudflared`, the agent asks, installs [Cloudflare's tunnel tool](required-tools.md#installing-cloudflared), and tries again. Only one link is open at a time; a key link nobody has opened gives way to a newer one.
- **How a link closes.** On its own finish (a save, or a form's send), on its close button, when you say *done* and the agent runs `hand-over.mjs close`, or at its time limit, even if the chat stops. A closed link never works again.
- **After it closes.** A link that ends ready (a save, or a form the site accepted) wakes the chat that opened it, even if it stopped waiting. The watcher closes private input first and makes one bounded notification attempt through the installed Paseo CLI. It sends only completion identity, mode, result, saved login/key names, and Worker-key names; never a private address, page content, or credential. `HANDOVER_COMPLETION` identifies the same event in `wait` and the notification: handle that identity once, resume the original task, and consume a duplicate without doing the task again. `HANDOVER_NOTIFICATION=notified` means dispatch was acknowledged, not that the task has finished. Missing workspace identity or CLI gives `unavailable`; a failed or ambiguous send gives `unconfirmed`, with no automatic resend. The page then tells you to return to chat and say *continue*; saved inputs stay saved. Cancellation, expiry, incomplete input, and a form the site did not accept never announce readiness (`ready: false` and `not-requested`). On `timeout`, the agent says so and offers a new link.

**Is a link safe?** Each link gets a new random address plus a secret key that only the link carries, and it dies on its finish, on close, or at its time limit, even if the chat stops. A copy left in the chat is dead too. Anyone who sees it while it's open, say over your shoulder, can use it until it closes. Cloudflare carries the connection, so like any site it hosts, it could in principle see what you type; your app already runs on Cloudflare, so this adds no new company to trust. The agent learns only how the link ended and the names of what was saved, never a value. A private form reads back nothing you gave it: the agent names the boxes, what you type goes straight into the site's own boxes, and it is never read back, logged, or saved. The form's helper reads only the page's address, whether a named part of the page is still there, and a dropdown's own choice before your pick, to put it back if the site says no. The browser runs with no window, so it can't offer to save your card or password.

### The private form

The private form takes a sensitive detail from you to a website without the agent seeing it. It shows a title, a line saying what it's for, one box per detail labelled as on the site, and one button with the site's own label, such as *Pay $45.00*. Each box says what it holds (card number, expiry, security code), so 1Password or your phone's autofill can fill the form in one tap. Your tap on the button types the details into the site and presses the site's button once. That tap is your yes for that action alone, so the chat asks nothing more. The form never shows the site, ends on *Sent* or *Not accepted*, and never sends twice.

1. **Finish the rest of the page first.** The agent asks the ordinary answers in the chat, types them, and shows a picture of the page with the *Ready?* question.
2. **Name the boxes.** From its own snapshot, the agent writes a form file outside the repo: each box's label as on the site, its autofill kind, and its field as a snapshot ref or a selector. A dropdown lists the site's own choices. No value goes in the file.

   ```json
   { "title": "Pay City of Markham",
     "note": "$45.00 · ticket P0178390",
     "fields": [
       { "label": "Card number", "kind": "cc-number", "target": "e12" },
       { "label": "Expiry month", "kind": "cc-exp-month", "target": "e13",
         "options": [{ "value": "03", "text": "03 - March" }] },
       { "label": "Security code", "kind": "cc-csc", "target": "e15" }
     ],
     "submit": { "label": "Pay $45.00", "target": "e31" } }
   ```

   `kind` is an HTML autofill name, left out for a box with none, such as a backup code. [`form.mjs`](../../.agents/skills/hand-over/scripts/form.mjs) owns the limits, 12 boxes among them. A ref is written `e12`; `@e12` works too. A ref reaches a field inside a payment provider's embedded box, where a selector can't.
3. **Open it with the finish**, send the `HANDOVER_LINK` it prints, and run `wait` in the background:

   ```bash
   node .claude/skills/hand-over/scripts/hand-over.mjs open --form "$form" --until "**/receipt/**"   # where the site goes once it accepts
   node .claude/skills/hand-over/scripts/hand-over.mjs open --form "$form" --until-gone "#card-form"  # a page that changes in place
   node .claude/skills/hand-over/scripts/hand-over.mjs wait                                           # prints HANDOVER_RESULT=...
   ```

   Name the page the site reaches once it accepts, not "left the card page": an error page would count too. The form works on the page this task has open; a task that passes `--session <name>` to `browse.mjs` passes it here too. `FORM_FILE=` (exit 2) names the fault in the file. Exit 1 means the page already meets the finish, the task has no page open, or another link is open.
4. **Hands off while it's open.** From `open` until `wait` prints, the agent sends its browser no commands and takes no pictures. A page it changed would also renumber the refs the form uses.
5. **Read how it ended.**
   - `done`: the site moved on. The agent takes a fresh snapshot, shows the picture, say of the receipt, and carries on.
   - `not-accepted`: the site kept its page within 60 seconds, or a box could not be filled. The form has emptied the boxes it typed into and put each dropdown back, so the agent may look. It reads the site's message, tells you what it said, and offers a new form. It never says a payment failed before reading the page: a slow site may still have taken it. It never sends a new form unasked.
   - `timeout` or `closed`: the agent says so and offers a new form.

A site whose fields take no typing from the form ends as `not-accepted` with nothing sent. The step is then yours, with [steps to finish it yourself](#steps-for-you-to-finish).

## When a site refuses the browser

Some sites turn the browser away or keep it on a *Verify you are human* page, as DoorDash does. The agent then stops:

1. **Say so in one line.** *DoorDash won't let my browser in.*
2. **Stop browsing that site.** No other browser and no private link.
3. **Give [steps to finish it yourself](#steps-for-you-to-finish)**, with the page's link.

A check that clears by itself in a few seconds is not a refusal: the agent reads the page again first. It never routes its traffic through a hired or borrowed network address, uses a check-solving service, or solves a check that asks whether a person is there. One refusal ends the try: repeats can lock your account.

## Save your passwords

Say *save my passwords* and the agent sends a private link where you pick the logins it may use; it never sees a password. The screen, where they're kept, and how to change one: [save your passwords](passwords.md).

Back to [development](README.md).
