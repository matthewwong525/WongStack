# The private form

The private form takes a sensitive detail from you to a website without the agent seeing it. Every card payment goes through it, and nothing you type in it is saved. It is one of the [private links](browsing.md#how-private-links-work) in [browsing](browsing.md), in the [development](README.md) docs.

## What you see

The form shows a title, a line saying what it's for, and one picture of the site's page. Below come one box per detail, labelled as on the site, and one button with the site's own label, such as *Pay $45.00*.

- **The picture** is the site's whole page, taken as the link opens, before you type anything. It shows what you are paying or signing into. Tap it to open it full screen: pinch or use **+** and **−** to zoom up to 4×, drag to move around, and *Close* to go back. A page the browser couldn't picture shows none. The picture opens only with the link's key, and goes when the link closes.
- **Each box says what it holds** (card number, expiry, security code), so 1Password or your phone's autofill can fill the form in one tap.
- **The button** types the details into the site and presses the site's button once. That tap is your yes for that action alone, so the chat asks nothing more.

While it sends, the form shows each step: *Typing your details…*, *Pressing Pay $45.00…*, *Waiting for the site…*. It never sends twice, and ends one of three ways:

- **Sent:** the site reached its finish.
- **Sent, waiting for the site:** the site hasn't answered within a minute of the press. *Don't pay again*: the form keeps watching for ten minutes, and your chat says how it went.
- **Not accepted:** nothing was pressed, or the site kept the same page for the whole watch. It doesn't say you weren't charged.

## Open a private form

1. **Finish the rest of the page first.** The agent types the ordinary answers, from [saved details](#saved-details) after a yes or asked in the chat, and shows a picture of the page with the *Ready?* question.
2. **Name the boxes.** From its own snapshot, the agent writes a form file outside the repo: each box's label as on the site, its autofill kind, and its field as a snapshot ref or a selector. A dropdown lists the site's own choices, each with its `text` exactly as the site shows it: the pick goes by that text, and a mismatch stalls 30 seconds and fails. No value goes in the file.

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

   Name the page the site reaches once it accepts, not "left the card page": an error page would count too. The form works on the page this task has open; a task that passes `--session <name>` to `browse.mjs` passes it here too. `open` takes the page's picture itself. `FORM_FILE=` (exit 2) names the fault in the file. Exit 1 means the page already meets the finish, the task has no page open, or another link is open.
4. **Hands off while it's open.** From `open` until `wait` prints the final result, the agent sends its browser no commands and takes no pictures, through any watch. A page it changed would also renumber the refs the form uses. Once a minute its helper makes one call that types, presses, and reads nothing, to keep the page open.
5. **Read how it ended.**
   - `done`: the site moved on. The agent takes a fresh snapshot, shows the picture, say of the receipt, and carries on.
   - `unconfirmed` with `HANDOVER_WATCHING=10`: the site hasn't answered a minute after the press, and the form watches it for ten more minutes. The link has closed. The agent tells you *still checking, don't pay again*, runs `wait` again in the background, and still sends its browser nothing. That second `wait`, and a second chat notice, bring the final result. When you report a decline, `close` ends the watch early by the same rule.
   - `not-accepted`: a box could not be filled, so nothing was pressed, or the page kept its address and card boxes for the whole watch. The form has emptied the boxes it typed into and put each dropdown back, so the agent may look. It reads the site's message, tells you what it said, and offers a new form. It never sends a new form unasked.
   - `unconfirmed` with no `HANDOVER_WATCHING`: the page went somewhere other than the finish, or the browser couldn't read it. Nothing was emptied, since a box on a changed page may be a different one. The agent reads the address first, and takes a snapshot only once the card frames are gone. It says the payment isn't confirmed and asks you to check your email or bank before paying again.
   - `timeout` or `closed`: the agent says so and offers a new form.

Each send adds to a timing record, `~/.wong-stack/hand-over/timings.jsonl`, readable by your user alone and trimmed to its last 500 lines: one line per box, the press, the wait for the site, and the watch, each with its time in milliseconds, plus what ended each link (`send`, `close-command`, `cancel-route`, `deadline`, `gave-way`, `watch`, `error`, or a signal). It names a box by its position and autofill kind, never its value or an error's text. Read it when a send feels slow, or a link closed by itself.

A site whose fields take no typing from the form ends as `not-accepted` with nothing sent. The step is then yours, with [steps to finish it yourself](browsing.md#steps-for-you-to-finish).

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
