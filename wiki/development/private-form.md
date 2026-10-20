# The private form

The private form takes a sensitive detail from you to a website without the agent seeing it, and can save a card so the next payment needs only a yes in the chat. It is one of the [private links](browsing.md#how-private-links-work) in [browsing](browsing.md), in the [development](README.md) docs.

## What you see

The form shows a title, a line saying what it's for, and one picture of the site's page. Below come one box per detail, labelled as on the site, and one button with the site's own label, such as *Pay $45.00*.

- **The picture** is the site's whole page, taken as the link opens, before you type anything. It shows what you are paying or signing into. Tap it to open it full screen: pinch or use **+** and **−** to zoom up to 4×, drag to move around, and *Close* to go back. A page the browser couldn't picture shows none. The picture opens only with the link's key, and goes when the link closes.
- **Each box says what it holds** (card number, expiry, security code), so 1Password or your phone's autofill can fill the form in one tap.
- **Save for next time** sits under the boxes, unticked. Tick it to keep the card on the agent's computer: see [saved details](#saved-details). A form with only a backup code or a password shows no tick, since those are never kept.
- **The button** types the details into the site and presses the site's button once. That tap is your yes for that action alone, so the chat asks nothing more.

The form ends on *Sent* or *Not accepted*, and never sends twice.

## Open a private form

1. **Finish the rest of the page first.** The agent asks the ordinary answers in the chat, types them, and shows a picture of the page with the *Ready?* question. Before sending a form, it checks [saved details](#saved-details) for a set that fills it.
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
4. **Hands off while it's open.** From `open` until `wait` prints, the agent sends its browser no commands and takes no pictures. A page it changed would also renumber the refs the form uses. Once a minute its helper makes one call that types, presses, and reads nothing, to keep the page open.
5. **Read how it ended.**
   - `done`: the site moved on. The agent takes a fresh snapshot, shows the picture, say of the receipt, and carries on. When you ticked *Save for next time*, `wait` also prints `HANDOVER_SAVED=<name>` and `HANDOVER_SAVED_HINT=card ending 4242`, and the agent says *Saved your card ending 4242 for next time.*
   - `not-accepted`: the site kept its page within 60 seconds, or a box could not be filled. The form has emptied the boxes it typed into and put each dropdown back, so the agent may look. It reads the site's message, tells you what it said, and offers a new form. It never says a payment failed before reading the page: a slow site may still have taken it. It never sends a new form unasked. Nothing is saved.
   - `timeout` or `closed`: the agent says so and offers a new form.

A site whose fields take no typing from the form ends as `not-accepted` with nothing sent. The step is then yours, with [steps to finish it yourself](browsing.md#steps-for-you-to-finish).

## Saved details

Saved details are the form answers you chose to keep, so a later form fills from them after one yes. They sit in one plain file on the agent's computer, `~/.wong-stack/details.json`, beside [your saved logins](passwords.md) and never in your repo. Only your own user can read it, and nothing locks it beyond that: a copy of the file shows every card in it. The agent is told never to open it; only [`details.mjs`](../../.agents/skills/hand-over/scripts/details.mjs) and `hand-over.mjs fill` read it.

- **A card** is saved only from the private form: you tick *Save for next time*, and the site accepts it. The agent knows it by name and hint alone, such as *card ending 4242*, never its number, expiry, or code. Saving a form with the same title again replaces the old card.
- **An everyday answer**, such as an email, a name, an address, or a phone, is saved from the chat. After typing the answers you gave for a form, the agent asks once, showing them: *Keep these for next time? me@x.com, 1 Main St.* `Keep them / Not now`. On yes:

  ```bash
  node .claude/skills/hand-over/scripts/details.mjs save --name home --field email=me@x.com --field street-address="1 Main St"
  ```

  `--field` takes an autofill kind. A card or a password never saves this way. The agent may read an everyday set's values, since you gave them in the chat.

### Use a saved set

1. **Find one.** The agent runs `details.mjs list`: each set's name, hint, and kinds, and only an everyday set's values. A set fits when its kinds cover every box in the form file.
2. **Ask first**, naming the set and what the site's button does: *Pay City of Markham $45.00 with your card ending 4242?* `Use card ending 4242 / Use another card / Not now`. Your yes counts as your yes for that payment. *Use another card* sends a private form.
3. **Fill it** with the same form file and finish as a private form, and no link:

   ```bash
   node .claude/skills/hand-over/scripts/hand-over.mjs fill --form "$form" --use pay-city-of-markham --until "**/receipt/**"
   ```

   It types each box from the set by its kind and presses the site's button once. A dropdown takes the one choice that matches, so a saved `03` picks `3` and `2028` picks `28`. A card saved from a private form also keeps each dropdown's visible choice, such as *March*, and fills only a choice that agrees with it: another site's `2` for March never picks *02 - February*. While it types, `wait` and `close` say a fill is under way and print no result. No value crosses the command line or the output. The agent sends its browser nothing until it prints.
4. **Read how it ended**: `HANDOVER_RESULT=done` and `not-accepted` mean what they mean for [the form](#open-a-private-form), and a refused card leaves its boxes emptied. `missing`, with `HANDOVER_MISSING=<label>`, means a box the set can't fill or a dropdown with no matching choice: nothing was typed, and the agent sends a private form. Exit 1 means no page is open, the page already meets the finish, or a private link is open.

### Forget one

Say *forget my card* and the agent runs `details.mjs forget pay-city-of-markham`, or `forget --all` for everything, then confirms by name. Say *what have you saved?* and it names each set and its hint from `details.mjs list`. The next payment after forgetting sends a private form.

Back to [browsing](browsing.md).
