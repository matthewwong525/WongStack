# Live view

A live view is a private link that shows the agent's browser on one page, for your turn: you sign in, type a card or a backup code, pass a robot check, or tap through a stuck step, on the real site. It is the one place you type something sensitive, and one of the two [private links](browsing.md#how-private-links-work) in [browsing](browsing.md).

## When it opens

Every live view is the same turn: one line under the site says what to do now, and you tap *Hand back* when you're done. The view never closes because the page changed: a signed-in page or a receipt leaves it open, so you can check a setting or fix a mistake first. It opens for these steps only:

| Step | The line says |
|---|---|
| A sign-in | Sign in to Netflix, then tap Hand back. |
| A payment | Type your card and press Pay $45.00, then tap Hand back. |
| A backup code | Type your backup code for Google, then tap Hand back. |
| A robot check | Show Messenger you're a person, then tap Hand back. |
| A stuck step | Tap DigiKey's Continue, then tap Hand back. |

- **A sign-in:** a site asks you to log in, and the browser isn't signed in. You type your password on the site's own page, paste it from your password manager, or fill it from [your password manager in the browser](password-manager.md). The browser keeps the session, so a later task doesn't ask again: [sign in](#sign-in).
- **A payment or a backup code:** card details, a backup or recovery code, or another lasting secret the page asks for. The agent fills the rest of the page first, and you press the site's own *Pay*: [pay or type a code](#pay-or-type-a-code). PayPal is [the same turn](#other-ways-to-pay).
- **A robot check:** a tick box such as *I'm not a robot*, or a picture puzzle. It can stand at a site's front door or come right after a sign-in. The agent never ticks, solves, or answers one itself, even when asked.
- **A stuck site step**, such as DigiKey's *Continue*, when the agent's clicks don't move it after [a 30-second wait](browsing.md#saved-browser-logins) or print `BROWSE_CLICK=script`. A view you [ask for](browser-window.md#ask-for-the-browser) is the same turn.
- **Connecting your tools** on a server: [the watch link](watch-link.md), for a sign-in, or when you ask to watch.

What you type goes to the site a key press at a time. The view saves nothing, and the agent sees none of it.

Every other step keeps its route in [when a step needs you](browsing.md#when-a-step-needs-you): a one-time code comes through the chat or your email ([login codes](login-codes.md)), and an ordinary answer is asked in the chat. A passkey or an approval on your phone stays on your own device: neither can travel through a view of another computer's browser.

## What you see

The agent's browser fills the page, already on the step. One bar under it holds everything else: the line, the type box, and *Hand back*.

```text
┌──────────────────────────────┐
│ netflix.com/login            │
│  Email     [            ]    │
│  Password  [            ]    │
│                              │
├──────────────────────────────┤
│ Sign in to Netflix, then tap │
│ Hand back.                   │
│ [Tap a box…]     [Hand back] │
└──────────────────────────────┘
```

- **The line says what to do now.** It sits in the bar, right above the type box, so everything you need is in one place.
- **No light and dark switch.** The view always shows light, so the site looks as it does in your own browser.
- **It fits what you hold.** Narrow on a phone, wide on a laptop, with the whole puzzle and its button in view. The page gets its own size back when the link closes.
- **Tap straight on the browser.** Your taps go to it as they are. On a laptop your keyboard does too.
- **Type in the box and it types in the browser.** A phone's keyboard doesn't reach the browser. Tap a box in the browser, then type in ours: each letter, delete, Enter, and paste lands in the browser at once, with no send. Text already in the browser's box stays: you add to it, or keep deleting.
- **Paste anywhere.** A paste on the browser or in the box types the text into the browser, a key at a time, so a password from your password manager goes straight in. Nothing pasted goes to the link's helper.
- ***Hand back* ends your turn.** The browser goes back to the agent, and the chat carries on. Saying *done* in the chat closes the link too.
- **To give up, tap *Hand back* and say so in the chat.** If the step is not finished, the agent asks before it does more on that page.
- **It stays open until you end it.** After *Hand back*, the page says *Done. Go back to the chat.* A link that has closed says *This link has closed. Ask in the chat for a new one.*

## What the link can do

**While it's open, the link drives a browser signed in as you.** Anyone who gets it can use every account that browser is signed in to, address bar included. Send it to nobody.

- **The same guards as [every private link](browsing.md#how-private-links-work).** A new Cloudflare address and a secret only the link carries, one link per chat, and no screen without the secret. The screen's connection sends it as the WebSocket subprotocol, since a browser can send no header there, and the helper echoes it back ([`ws-bridge.mjs`](../../.agents/skills/hand-over/scripts/lib/ws-bridge.mjs)).
- **One live view on the computer.** The browser has one screen, so a second view, from any chat, can't open until the first closes. Its message names the chat that holds it: `A live view is already open in modest-toad.`
- **Open for up to 8 hours.** It closes only when you tap *Hand back*, when you say *done* in the chat, or at the limit, even if the chat stops. A closed link never works again.
- **The agent learns only how it ended.** It sees nothing you tapped or typed. Afterwards it reads the page afresh and trusts nothing from before.
- **Tasks share the window, a tab each.** While your turn is open, no other task shows its tab. If you tap another chat's tab or the blank first tab, yours comes back to the front by itself ([a tab for each chat](browser-window.md#a-tab-for-each-chat)). A tab that you or the site open during your turn, such as *Forgot password* or *Sign in with Google*, stays in front while it is open: the browser can not tell the agent which tab shows.
- **A pop-up stays open.** An add-on's toolbar pop-up, such as your password manager's, or a menu stays in front of the page until you pick from it or tap outside it. Tap its box to type in it. Then your tab comes back to the front.

## The watch link

The [watch link](watch-link.md) is the one live view the agent drives: for connecting your tools on a server, with *Take over* and *Hand back*.

## How the agent runs one

1. **Read the page once more.** A check that clears by itself in a few seconds needs no view.
2. **Ask first**, as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *Netflix wants you to sign in. I'll send a link that shows my browser.* `Ready, send it / Not now`. At a robot check: *Messenger wants to know you're a person. I'll send a link that shows my browser, for you to tap through.* A payment asks [the pay question](#pay-or-type-a-code) instead. A puzzle goes stale and the link can use your accounts, so it's sent only once you're there.
3. **Open it with the line**, run `wait` in the background, and then [end your turn with the `HANDOVER_LINK` it prints](browsing.md#how-private-links-work):

   ```bash
   H=.claude/skills/hand-over/scripts/hand-over.mjs
   node $H open --view --note "Sign in to Netflix, then tap Hand back."
   node $H open --view --note 'Type your card and press Pay $45.00, then tap Hand back.'   # single quotes keep the $
   node $H open --view --note "Show Messenger you're a person, then tap Hand back."
   node $H wait                                                                            # prints HANDOVER_RESULT=...
   ```

   `--note` is required: it is the one line the page shows. End it with *then tap Hand back*, since only you end the turn. A task that passes `--session <name>` to [`browse.mjs`](../../.agents/skills/browser/scripts/browse.mjs) passes it here too; `--minutes N` sets a shorter limit. Exit 2 means a usage fault, such as no `--note`, or a finish flag such as `--until`, which no view takes. Exit 1 means the task has no page open, another link is open in this chat, or a live view is open in any chat. No page open usually means you took a while to say *Ready* and the browser closed the idle page: the agent opens the site's page again, then the view.
4. **Hands off while it's open.** From `open` until `wait` prints, the agent sends its browser no commands and takes no pictures: the page is yours. The link's helper reads nothing from the page. It keeps your tab and its window in front, unless a pop-up shows, and once a minute sets the page's size again, since the browser closes a page left alone for 5 minutes and your taps don't count ([`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs)).
5. **Read how it ended.** After each result, the agent reads the page afresh.
   - `handed-back`: you tapped *Hand back*. The agent takes a fresh snapshot, shows [a picture](browsing.md#show-what-the-browser-is-doing), and carries on from what the page shows now. It says it's signed in only once the page shows it. If the step is not finished, it asks you in the chat before it does more on that page.
   - `closed` or `timeout`: you said *done*, or the limit passed. If the check or the login is still there and you never got to it, the agent offers a new link. If you tried and the site refused you, that was [the site's one view](#one-view-per-site).
   - `error`: the browser's screen stopped. The agent says so and gives [steps to finish it yourself](browsing.md#steps-for-you-to-finish).

   After a payment, every result but `error` goes to [the payment check](#check-the-payment).

## Sign in

At a login page the browser isn't signed in to, the agent opens a sign-in turn:

- **You end it.** The view stays open at the signed-in page, through a second step such as Messenger's approval, until you tap *Hand back*.
- **The line names the site:** `--note "Sign in to Netflix, then tap Hand back."`
- **A code or an approval during your turn is yours to finish there.** One that comes after *Hand back* goes through [login codes](login-codes.md). A robot check during your turn is yours too.
- **The browser keeps the session**, in its profile ([saved browser logins](browsing.md#saved-browser-logins)), so a later task needs no sign-in until the site logs you out.

The agent never asks for a password in the chat, and never reads, types, or saves one. If you start typing a password into the chat, it doesn't use it, and offers this turn instead.

## Pay or type a code

A card goes onto the site's own page, typed by you, and you press the site's own *Pay*. You see the real total, and the agent never presses a button that pays with your card.

1. **Fill the rest of the page first.** The agent types the ordinary answers, from [saved details](saved-details.md) after a yes or asked in the chat, and shows a picture of the page.
2. **Ask the pay question**, naming the purchase and its total: *Pay City of Markham $45.00?* `Ready, send it / Not now`. Your yes is your yes to buy.
3. **Open the turn** with the line *Type your card and press Pay $45.00, then tap Hand back.*
4. **You type the card and press *Pay* once.** The view stays open at the receipt until you tap *Hand back*.
5. **The agent checks the payment**, below.

A backup or recovery code is the same turn, with the line *Type your backup code for Google, then tap Hand back.* Never the chat: a backup code doesn't expire, so it must not sit in the stored chat.

### Check the payment

After `handed-back`, `closed` or `timeout`, the agent finds out what the site did, without seeing a card:

1. It reads the address, then a snapshot. A snapshot is safe with card boxes on the page: each card box and each box in a payment frame reads `[hidden]`. A picture is not safe: it takes none while a card box still holds a value.
2. It tells you one of three things: accepted (a receipt, an order number, a review page, or a saved card such as *Amex ••1001*), declined (the site's own error words), or *I can't tell*.
3. It may press a next step that pays nothing, such as *Continue*, by selector when it has no ref ([browsing](browsing.md#saved-browser-logins)). A press that pays stays yours: it asks first, naming the purchase. A step that stays stuck, or a `BROWSE_CLICK=script` click, gets [a stuck step's view](#when-it-opens), not more clicks.
4. When the page can't tell and it can read your email, it looks there for the store's receipt first. Then it says *not confirmed, don't pay again until we know*. It never opens a new payment turn while the payment may have gone through.

### Other ways to pay

- **PayPal**, where the site takes it: the pay question offers *Pay $84.00 with PayPal (you sign in, live)* beside the card. The agent presses the store's PayPal button, which pays nothing, then opens a turn with the line *Sign in to PayPal and approve $84.00, then tap Hand back.* You sign in and approve there. If PayPal's window does not show in the view, the agent opens PayPal's address in the same tab.
- **Google Pay and Apple Pay** stay out: Google blocks the agent's browser, and Apple Pay needs your device.

## One view per site

Each site gets one live view per task for a robot check or a sign-in: one real try. When your try doesn't clear the check or sign you in, or the site shows a second check after it, the agent stops and [gives you steps](browsing.md#when-a-site-refuses-the-browser) for your own device. A site that turns a real person away in this browser will do it again, and repeats can lock your account. A payment's turn or a stuck step's doesn't count: this rule guards against repeated checks and logins, not payments. A sign-in turn on [the watch link](watch-link.md) counts as that site's one view.

## The first one installs three small tools

On `HANDOVER_NEEDS=live-view` (exit 3), the agent asks once, naming [what the install needs](required-tools.md#installing-the-live-views-tools): three small tools, two with admin rights on the computer.

```bash
node .claude/skills/hand-over/scripts/hand-over.mjs install-view   # HANDOVER_INSTALLED=live-view, or HANDOVER_INSTALL=manual
```

- **Yes:** it installs them and opens the view.
- **`HANDOVER_INSTALL=manual`:** nothing was installed, because the computer wants a password for admin rights. The agent gives you the one command it printed to run yourself, or steps for the step instead.
- **No:** nothing is installed, and the step [ends with steps for you](browsing.md#steps-for-you-to-finish).

## On a computer with a screen

On a Mac, a Windows computer, or a Linux computer with a screen and the link setting off, your turn happens in [the browser window](browser-window.md#your-turn-in-the-window), with no link. A live-view link opens only on Linux: with the link setting on, or on a server with no screen ([where it shows](browser-window.md#where-it-shows)).

Back to [browsing](browsing.md).
