# The private form

The private form takes a sensitive detail from you to a website without the agent seeing it. Every card payment goes through it, and nothing you type in it is saved. Its helper reads only the page's address, whether a named part or named words show, a dropdown's choice before your pick, to restore it if a box can't be filled, and, as the form opens and at your press before anything is typed, a snapshot of the page's text and each box's role and name, to check the boxes are still there; it records step times, never a value. It is one of the [private links](browsing.md#how-private-links-work) in [browsing](browsing.md), in the [development](README.md) docs.

## What you see

The form shows a title, a line saying what it's for, and one picture of the site's page. Below come one box per detail, labelled as on the site, and one button with the site's own label, such as *Pay $45.00*.

- **The picture** is the site's whole page, taken as the link opens, before you type anything. It shows what you are paying or signing into. Tap it to open it full screen: pinch or use **+** and **−** to zoom up to 4×, drag to move around, and *Close* to go back. A page the browser couldn't picture shows none. The picture opens only with the link's key, and goes when the link closes.
- **Each box says what it holds** (card number, expiry, security code), so 1Password or your phone's autofill can fill the form in one tap.
- **The button** types the details into the site and presses the site's button once. That tap is your yes for that action alone, so the chat asks nothing more.

When you press the button, the same link shows the site itself, live, under one status line: *Paying DigiKey · 4 s*. You watch it load, so it never looks broken. If the site stops on a step, such as DigiKey's *Continue*, tap through it there. The page keeps its own size, scaled to your screen: pinch to zoom. The live part is the [live view](live-view.md), on this computer only; where none can open, such as on a Mac or while another chat holds the view, the form shows the same line and counter over its steps: *Typing your details…*, then *Paying DigiKey · 12 s*.

The form never sends twice, and ends one of these ways:

- **Accepted:** the site reached its finish. The line says *DigiKey accepted. Done.*, and the site's last picture stays on your screen, so you see the finished page.
- **Not finished in a minute:** the line says *DigiKey hasn't finished. Don't pay again unless it shows an error.* With the live view, keep watching or tap *Done*; without it, the form watches for ten minutes. Your chat says how it went.
- **Page changed:** *DigiKey's page changed. Nothing was sent.* The site reset its page after the form opened, so nothing was typed. Your chat sends a new form.
- **Not sent:** a box could not be filled, so nothing was pressed. The form empties the boxes it typed into.

**After the press, the boxes keep what you typed.** The site may have taken the card and check its box again on its next step. On 2026-11-04 the old form emptied DigiKey's hidden card frame, `iframe#ccFrame`, after DigiKey had saved the card. DigiKey's *Continue* runs `VerifyContinue()`, which checks that frame, and it opened the card boxes again. A fresh page with no frame took the same click at once. So a pressed send never ends as not accepted.

## Open a private form

1. **Finish the rest of the page first.** The agent types the ordinary answers, from [saved details](#saved-details) after a yes or asked in the chat, and shows a picture of the page with the *Ready?* question.
2. **Name the boxes.** From its own snapshot, the agent writes a form file outside the repo: each box's label as on the site, its autofill kind, and its field as a snapshot ref or a selector. A dropdown lists the site's own choices, each with its `text` exactly as the site shows it: the pick goes by that text, and a mismatch stalls 30 seconds and fails. No value goes in the file.

   ```json
   { "title": "Pay City of Markham", "site": "City of Markham",
     "note": "$45.00 · ticket P0178390",
     "fields": [
       { "label": "Card number", "kind": "cc-number", "target": "e12" },
       { "label": "Expiry month", "kind": "cc-exp-month", "target": "e13",
         "options": [{ "value": "03", "text": "03 - March" }] },
       { "label": "Security code", "kind": "cc-csc", "target": "e15" }
     ],
     "submit": { "label": "Pay $45.00", "target": "e31" } }
   ```

   `site` is the name the status line shows, such as *DigiKey*; left out, it is the page's host. `kind` is an HTML autofill name, left out for a box with none, such as a backup code. [`form.mjs`](../../.agents/skills/hand-over/scripts/form.mjs) owns the limits, 12 boxes among them. A ref is written `e12`; `@e12` works too. A ref reaches a field inside a payment provider's embedded box, where a selector can't.
3. **Open it with the finish**, run `wait` in the background, and then [end your turn with the `HANDOVER_LINK` it prints](browsing.md#how-private-links-work):

   ```bash
   node .claude/skills/hand-over/scripts/hand-over.mjs open --form "$form" --until "**/receipt/**"   # where the site goes once it accepts
   node .claude/skills/hand-over/scripts/hand-over.mjs open --form "$form" --until-gone "#card-form"  # a page that changes in place
   node .claude/skills/hand-over/scripts/hand-over.mjs open --form "$form" --until-text "Review your order"  # words shown once it accepts
   node .claude/skills/hand-over/scripts/hand-over.mjs wait                                           # prints HANDOVER_RESULT=...
   ```

   Name the page the site reaches once it accepts, not "left the card page": an error page would count too. `--until-gone` counts only what shows: a hidden card frame is gone. DigiKey saves a card in place and hides its frame, so `--until-gone "iframe#ccFrame"` or `--until-text` with its next page's words fits it. Every finish you name must hold. The form works on the page this task has open; a task that passes `--session <name>` to `browse.mjs` passes it here too. `open` takes the page's picture itself. `FORM_FILE=` (exit 2) names the fault in the file. Exit 1 means the page already meets the finish, the task has no page open, or another link is open in this chat. Before it types, the form checks that every box and the button are still on the page, when it opens and at the press.
4. **Hands off while it's open.** From `open` until `wait` prints the final result, the agent sends its browser no commands and takes no pictures, through any watch or live view. A page it changed would also renumber the refs the form uses. Once a minute its helper makes one call that types, presses, and reads nothing, to keep the page open.
5. **Read how it ended.**
   - `done`: the site moved on. The agent takes a fresh snapshot, shows the picture, say of the receipt, and carries on.
   - `unconfirmed` with `HANDOVER_VIEWING=yes`: the site hasn't finished a minute after the press, and you still see it live, for up to 30 minutes. The agent tells you *still checking, don't pay again*, runs `wait` again in the background, and sends its browser nothing. The second `wait` brings `done`, or `unconfirmed` with `HANDOVER_REASON=viewed` once you tapped *Done*, said done (`close`), or the 30 minutes passed. Then it runs [the after-check](#check-an-unclear-payment).
   - `unconfirmed` with `HANDOVER_WATCHING=10`: the same with no live view; the form watches the site for ten more minutes. The link has closed. The second `wait`, and a second chat notice, bring the final result. When you report a decline, `close` ends the watch early.
   - `not-accepted` with `HANDOVER_REASON=page-changed`: before anything was typed, a box or the button was gone, or another box stood at its ref, as when a cookie banner comes in above it. Nothing was sent, and your *Ready* still covers this payment: the agent gets the page ready again and sends a new form with no second question.
   - `not-accepted` with `HANDOVER_REASON=fill`: a box could not be filled, so nothing was pressed. The form has emptied the boxes it typed into and put each dropdown back. The agent reads the site's message, tells you what it said, and offers a new form. It never sends a new form unasked.
   - `unconfirmed` with `HANDOVER_REASON=no-answer`, after a watch: the page kept its address and card boxes for the whole watch. The site may have saved the card in place, as DigiKey does, so the boxes keep what was typed. The agent runs [the after-check](#check-an-unclear-payment).
   - `unconfirmed` with no reason, after a watch: the page went somewhere other than the finish, or the browser couldn't read it. The agent runs [the after-check](#check-an-unclear-payment).
   - `timeout` or `closed`: the agent says so and offers a new form.

### Check an unclear payment

After any `unconfirmed`, the agent finds out what the site did, without seeing a card:

1. It reads the address, then a snapshot. A snapshot is safe with card boxes on the page: each card box and each box in a payment frame reads `[hidden]`. A picture is not safe: it takes none while a card box still holds a value.
2. It tells you one of three things: accepted (a receipt, an order number, a review page, or a saved card such as *Amex ••1001*), declined (the site's own error words), or *I still can't tell*.
3. It may press a next step that pays nothing, such as *Continue*, by selector when it has no ref ([browsing](browsing.md#saved-browser-logins)). It asks before the press that pays, naming the purchase. A step that stays stuck, or a `BROWSE_CLICK=script` click, gets [the live view that stays open](live-view.md#when-it-opens), not more clicks.
4. When the page can't tell and it can read your email, it looks there for the store's receipt first. Then it says *not confirmed, don't pay again until we know*. It never sends a new form while the payment may have gone through.

Each send adds to a timing record, `~/.wong-stack/hand-over/timings.jsonl`, readable by your user alone and trimmed to its last 500 lines: one line for the page check, each box, the press, the wait for the site, and the watch or view, each with its time in milliseconds, plus what ended each link (`send`, `close-command`, `cancel-route`, `finished-route`, `deadline`, `gave-way`, `watch`, `error`, or a signal). It names a box by its position and autofill kind, never its value or an error's text. Read it when a send feels slow, or a link closed by itself.

A site whose fields take no typing from the form ends as `not-accepted` with nothing sent. The step is then yours, with [steps to finish it yourself](browsing.md#steps-for-you-to-finish).

## Other ways to pay

- **PayPal**, where the site takes it: the pay question offers *Pay $84.00 with PayPal (you sign in, live)* beside the card. The agent presses the store's PayPal button, which pays nothing, then opens a [live view](live-view.md#how-the-agent-runs-one) with `--until` the store's page after PayPal returns, such as its review page. You sign in to PayPal and approve there. If PayPal's window does not show in the view, the agent opens PayPal's address in the same tab.
- **Google Pay and Apple Pay** stay out: Google blocks the agent's browser, and Apple Pay needs your device.

## Saved details

Saved details are everyday answers you gave in the chat and chose to keep, such as an email, a name, an address, or a phone, so a later form fills them after one yes. A card is never saved: it goes through a private form every time. They sit in one plain file on the agent's computer, `~/.wong-stack/details.json`, beside [your saved logins](passwords.md) and never in your repo. Only your own user can read it. The agent reads and changes it only through [`details.mjs`](../../.agents/skills/hand-over/scripts/details.mjs).

After typing the answers you gave for a form, the agent asks once, showing them: *Keep these for next time? me@x.com, 1 Main St.* `Keep them / Not now`. On yes:

```bash
node .claude/skills/hand-over/scripts/details.mjs save --name home --field email=me@x.com --field street-address="1 Main St"
```

`--field` takes an autofill kind. A card, a password, or a code never saves: `save` refuses it.

### Use a saved set

1. **Find one.** The agent runs `details.mjs list`: each set's name, hint, kinds, and values.
2. **Ask first**, showing the answers: *Use me@x.com and 1 Main St?* `Use them / Use others / Not now`. *Use others* asks in the chat.
3. **Type them.** On yes, the agent types each value into the site's box with `browse.mjs`, as it types any answer from the chat. A card on the same page still goes through [a private form](#open-a-private-form).

### Forget one

Say *forget my address* and the agent runs `details.mjs forget home`, or `forget --all` for everything, then confirms by name. Say *what have you saved?* and it names each set from `details.mjs list`. The next form after forgetting asks in the chat.

Back to [browsing](browsing.md).
