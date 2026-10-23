# Reply links

A reply link opens a page the agent made at a web address, and the page's buttons reach the chat that made it: one sends what you wrote, with nothing to copy and paste, and others send a fixed action with optional notes. A plan's review page is the first page that uses one; [`reply-link.mjs`](../../.agents/skills/hand-over/scripts/reply-link.mjs) opens them. Part of [development](README.md).

It is not a [private link](browsing.md#how-private-links-work). A private link takes a secret the agent must never see, and nothing typed into it reaches the chat. A reply link does the opposite: everything you send goes into the chat. **Never send a password, a key, or a card through one.**

## A plan's link

Each new or changed plan prints *Click here to see the plan:* with a reply link, when one can open ([print the plan's link](../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link)). A finished plan's reply ends there, with *Review the plan, then tap Build it or Build and publish on its page.* and no question.

- **Send notes.** On the page, save your notes, then tap *Send notes*. Saving copies nothing there. One tap sends every note not yet sent, and each is marked *Sent*, so a second tap sends nothing twice. Change a sent note and it goes again.
- **The chat takes them as pasted notes.** They arrive under the line *Notes on the plan … Don't build yet.* The chat [updates the plan](../../.agents/skills/plan/SKILL.md#review-notes) and builds nothing.
- **Three choices stay visible at the bottom.** *Send notes*, *Build it*, and *Build and publish* are directly available, including on small phones. Either build choice includes your saved unsent notes in the same request: the chat updates the plan, answers question notes, then continues into the chosen action without another build choice. Drafts stay out. *Build it* shows the result before anything goes live. *Build and publish* asks once more above the bar. Escape or an outside tap dismisses that question; Escape returns focus to *Build and publish*.
- **Only acknowledged notes become Sent.** A saved edit made while a request waits remains unsent. Failures keep notes available for retry or copying. If the plan changed after you opened it, reload to read it first. Each action works once per version; a duplicate request cannot mark new notes sent.
- **A tap shows progress.** Connecting to the chat shows *Connecting…*. Sending notes or asking for a build shows a spinner until the chat answers. Sending and building wait together, so another tap cannot send a duplicate request. The result appears above the bar; its height stays the same. A success message appears only after the chat acknowledges the request.
- **The first plan of the day waits 5 to 10 seconds** for the connection. Later plans, from any chat on the same computer, share it and print at once.

## In your inbox first

When this computer is signed in to [your company app](../stack/company-api.md) and you can open its Inbox, a plan's link opens there, at `/apps/inbox/?item=<id>`, behind your company sign-in. No tunnel starts. Otherwise, it opens through a tunnel, as the rest of this page says. Only a plan's review page opens inside the inbox. Another page keeps its tunnel, and waits under *Needs you* with an *Open* button, as [a private link](browsing.md#how-private-links-work) does.

- **The inbox is a list of your agents,** one card each, in three groups: *Needs you*, *Working* and *Done*. A card holds everything its agent waits on you for: [the chief of staff](daily.md#the-chief-of-staff)'s questions and approvals, its [morning plan](daily.md#plan-the-day-first), your open private links and forms, and plans to review. A *Working* card shows its latest step; a chat nothing watches gets a card of its own. Each item belongs to the person signed in; no one else sees it.
- **You answer questions and approvals in one go.** Each card shows its choices one per line, then a box for your own answer. A tap picks one, sends nothing, and folds the card to your answer; *Change* opens it again. Words you type are the answer instead: a later pick sets them aside, and later words replace the pick. A question that allows several answers shows tick boxes, and your ticks and words go together. A link in a question opens in a new tab and picks nothing. One *Send* at the bottom passes on every card you answered, one tap each; the rest wait. Your answers stay on that device until you send them, and drop once their item closes or changes. On a computer, `J` and `K` move, `1` to `6` pick, `N` types an answer, `Z` clears, and `Ctrl/⌘ Enter` sends.
- **A tap waits in the app until this computer takes it.** The computer checks in every 10 seconds, takes the taps on its own items, wakes the chat, and reports back. The page shows *Waiting…*, or *Waiting for your computer* when it hasn't checked in for a minute, then *Sending…* once the computer has it, then *Sent* once the chat has it.
- **A plan leaves once the chat has your answer.** Notes, *Build it* or *Build and publish* close the plan as soon as the chat gets them, as an answered question or approval does. A send that doesn't arrive keeps the plan, so you can try again. Once the chat makes your changes and rebuilds the plan, the updated version comes back under *Needs you* at a new link.
- **A tap never fires late or twice.** *Cancel* stops a tap until the computer takes it. One still waiting when its item closes is dropped. A taken tap whose result doesn't come back in 2 minutes shows *Didn't arrive* and never goes again. A plan rebuilt since you opened it says *This plan changed* and asks you to reload.
- **One tap per item every 5 seconds.** The app refuses a faster one, and the computer wakes a chat at that pace too, as a tunnel page's sends are paced.
- **The page runs sealed.** It sits in a frame that can run its own script but can't reach the app's sign-in or data. It talks to the inbox only on a private channel handed to it when it first loads, and its notes only under its own plan's name. Its links open in a new tab, so the frame never shows another site; a page that loads there later gets no channel.
- **The app never holds the chat or its messages.** It keeps the page, its button names and your taps; the chat and each button's message stay on this computer. So a tap in the app can send only the messages this computer fixed.

## A day, then a new link

A link stays open for 24 hours from when the chat printed it, in the inbox and at a tunnel alike. Building the plan again moves the time on and keeps the same link while the plan waits on you; once you've sent your answer, the rebuilt plan comes back at a new link.

- **A closed link costs you nothing.** When the link has closed, or the chat can't be reached, the same tap copies your notes and says so: *This link has closed. Copied 2 notes: paste them into chat.* The button then reads *Copy notes*, as on a file. The build buttons go, and you choose in the chat.
- **Say *new link*.** The chat runs the plan's build command again and prints a fresh link. Notes you saved at the old address stay there: send or copy them before you ask.
- **A dead connection shows Cloudflare's error page**, not ours. Say *new link*.

## Where no link opens

The chat prints the page's file, and the page copies notes as it always has. It asks you to install nothing. That happens when:

- the host has no way to send a chat a message (`REPLY_REASON=no-chat`);
- [Cloudflare's tunnel tool](required-tools.md#installing-cloudflared) is not installed (`no-cloudflared`);
- the tunnel did not come up within 30 seconds (`tunnel-down`);
- `REPLY_LINK=off` is set, as the tests do (`off`).

A page opened from the plan's file, or from a pull request, is the same page with *Copy notes* and no build buttons.

## Is a link safe?

- **The address alone only shows the page.** It is long and random, and what it shows is plan text, not a secret.
- **Sending needs the link's key.** The key rides after the `#`, which a browser never sends as part of an address, and goes back in a header.
- **A send reaches one chat, under one fixed line.** The chat and the first line are set when the link opens; the page can change neither. For a plan that line says *Don't build yet.* The send arrives as your own message, never under another chat's name.
- **A send is bounded:** 20,000 characters, and one every 5 seconds for each page.
- **A button names a fixed action and may attach notes.** The opener fixes its instruction and chat target; reviewer text follows that instruction and is limited to 20,000 characters. Invalid or oversized notes never reach the chat. So the most a plan's link can do is send notes, start that plan's build, or start its publish.
- **The link is in the chat's text.** Anyone who can read it there can send notes to that chat, and start that build or publish, until it closes.
- **It never blocks a private link.** A reply link keeps its own state, apart from [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs), so a key link opens at once during a review, and several pages hold links at the same time.
- **A key, a password or a card never goes to the inbox.** Only a private link's address, kind, title and closing time do, and a test holds that line.

## Open one for another page

Any single self-contained HTML file can open this way: a form with one *Submit*, a list to approve.

```bash
node .claude/skills/hand-over/scripts/reply-link.mjs open "$page" --header "Answers from the intake form."   # prints REPLY_LINK=<url>
node .claude/skills/hand-over/scripts/reply-link.mjs close "$page"
node .claude/skills/hand-over/scripts/reply-link.mjs list
```

`--header` is the fixed first line of every message the page sends; write it so the chat knows what to do with the text. `--hours N` changes the 24 hours. On `REPLY_LINK=none`, offer the file and take the answers in chat.

The page reads the key from its own address and asks three routes beside itself:

| Route | Does |
|---|---|
| `GET alive` | `200 {closesAt, actions, version}` while the link is open |
| `POST send` with `{"text": "…"}` | `200 {"sent": true}` once the chat has it; anything else means it did not arrive |
| `POST act` with `{"action": "…", "version": "…", "text": "optional notes"}` | `200 {"sent": true}` once the chat has [the button's message](#give-a-page-a-button) |

All need the key in an `x-reply-key` header. A closed link answers `410`, a second send inside 5 seconds `429`.

```js
const key = new URLSearchParams(location.hash.slice(1)).get('key');
async function submit(text) {
  const response = await fetch('send', { method: 'POST', headers: { 'content-type': 'application/json', 'x-reply-key': key }, body: JSON.stringify({ text }) });
  return response.ok && (await response.json()).sent === true;
}
```

When `submit` is false, show the text for the person to copy: the page must never say *sent* on anything but `sent: true`. The file is read from disk on every visit, so a rebuilt page shows at the same link.

One server and one tunnel serve every open page, and both stop once no page is open. Inbox items get their own small process, [`reply-link.mjs serve-inbox`](../../.agents/skills/hand-over/scripts/reply-link.mjs), which delivers taps and stops once no item is open. The chat is woken through [`lib/wake.mjs`](../../.agents/skills/hand-over/scripts/lib/wake.mjs), the one place that names how: a host with another way to wake a chat adds it there.

### Give a page a button

A button sends one message you fix when the link opens: *Send all* on a list of drafts, *Approve* on a quote.

```bash
node .claude/skills/hand-over/scripts/reply-link.mjs open "$page" --header "Changes to the drafts." \
  --action "send-all=Send every draft in $page as it stands."
```

`--action <name>=<message>` repeats, 6 at most. A name is lowercase letters, digits, and hyphens; a message is one line of 300 characters at most. Opening the file again replaces them all. **The page sends the name and optionally reviewer text.** The chat receives the registered instruction, then a newline and the notes; the fixed header is not included. Omitted or empty text sends the instruction alone. The page cannot replace that instruction or the chat target.

```js
const state = await (await fetch('alive', { headers: { 'x-reply-key': key } })).json();   // once, right after load
async function act(action) {
  const response = await fetch('act', { method: 'POST', headers: { 'content-type': 'application/json', 'x-reply-key': key }, body: JSON.stringify({ action, version: state.version }) });
  return response.ok && (await response.json()).sent === true;
}
```

Show a button only when `state.actions` lists its name. `version` names the file as the page read it, and `act` refuses what the person has not seen:

| Answer | Means |
|---|---|
| `409 {"changed": true}` | the file was rebuilt since the page loaded: ask the person to reload |
| `409 {"done": true}` | the chat already got this button's message for this version |
| `400` | the link has no such button |
| `502 {"sent": false}` | the chat did not get it; the tap can be tried again |

`act` shares `send`'s 5 seconds. Confirm on the page before a button that can't be undone, as [a plan's *Build and publish*](#a-plans-link) does.
