# Reply link pages

A reply link can open any page you write, or an inbox item with no page, so its buttons reach the chat that opened it. [Reply links](reply-links.md) owns how a plan's link works and [what keeps it safe](reply-links.md#is-a-link-safe). This page owns how you open one for your own page. Part of [development](README.md).

## Open one for another page

Any single self-contained HTML file can open this way: a form with one *Submit*, a list to approve.

```bash
node .claude/skills/reply-link/scripts/reply-link.mjs open "$page" --header "Answers from the intake form."   # prints REPLY_LINK=<url>
node .claude/skills/reply-link/scripts/reply-link.mjs close "$page"
node .claude/skills/reply-link/scripts/reply-link.mjs list
```

`--header` is the fixed first line of every message the page sends; write it so the chat knows what to do with the text. `--hours N` changes the 24 hours. The page opens in the person's inbox, titled by its `<title>`; in a project with no app, at a tunnel. On `REPLY_LINK=none`, offer the file and take the answers in chat. With `REPLY_REASON=signed-out`, also give the sign-in link from `node scripts/company-api.mjs login`, once. [Where no link opens](reply-links.md#where-no-link-opens) lists every reason.

The page reads its key, then asks three routes beside itself:

| Route | Does |
|---|---|
| `GET alive` | `200 {closesAt, actions, version}` while the link is open |
| `POST send` with `{"text": "…"}` | `200 {"sent": true}` once the chat has it; anything else means it did not arrive |
| `POST act` with `{"action": "…", "version": "…", "text": "optional notes"}` | `200 {"sent": true}` once the chat has [the button's message](#give-a-page-a-button) |

All need the key in an `x-reply-key` header. A closed link answers `410`, a second send inside 5 seconds `429`.

```js
const key = window.REPLY_KEY || new URLSearchParams(location.hash.slice(1)).get('key');
async function submit(text) {
  const response = await fetch('send', { method: 'POST', headers: { 'content-type': 'application/json', 'x-reply-key': key }, body: JSON.stringify({ text }) });
  return response.ok && (await response.json()).sent === true;
}
```

When `submit` is false, show the text for the person to copy: the page must never say *sent* on anything but `sent: true`. A rebuilt file shows at the same link while the link is still open. A tap that closes it, such as an action, makes the next rebuild open a new link: print that one.

### The page bridge

In the inbox, the page runs in a sealed frame with no address of its own, so its relative calls have nowhere to go. [`lib/bridge.js`](../../.agents/skills/reply-link/scripts/lib/bridge.js) fixes that: `reply-link.mjs` puts it first in the page's `<head>` in the copy it sends to the inbox, never in the file, so the file's version stays the same.

- **It sets `window.REPLY_KEY`.** Read the key as the samples here do: `window.REPLY_KEY` first, else the address after the `#`.
- **It answers `alive`, `send` and `act`** over the inbox's private channel, with the same answers as the table above. `alive` waits up to 10 seconds for the inbox, and answers `410` on a closed page. Every other call passes through.
- **It opens a link in a new tab**, and a `#` link scrolls the page.
- **No confirm box.** The frame blocks `confirm()` and `alert()`: ask with a second tap on the page instead.
- **No notes storage and no files.** A page that needs a file question is a [review page](../review-pages.md#a-page-for-other-work).

### Servers

In a project with no app, one server and one tunnel serve every open page, and both stop once no page is open. Inbox items get their own small process, [`reply-link.mjs serve-inbox`](../../.agents/skills/reply-link/scripts/reply-link.mjs), which holds [the live line](../stack/live-line.md), delivers taps, and stops once no item it can reach is open; run as [the helper](../stack/live-line.md#the-helper), it never stops. Each serves every project on the computer, whichever [company app](../stack/company-api.md) it uses: an item remembers the app it was put in, and is checked in, reported and closed there. An app the computer can't reach keeps its items waiting; the others' taps still go through. A closed chat's item closes through another folder signed in to its app; with none, each round tries again until its time runs out. A copy that changes either process raises `PROTOCOL` in that file past every other copy's number on the computer, so the next open replaces the one running. To try a changed copy beside the running one, give it a temporary `HOME` and a stand-in `paseo` in `HANDOVER_PASEO_BIN`. The chat is woken through [`lib/wake.mjs`](../../.agents/skills/reply-link/scripts/lib/wake.mjs), the one place that names how: a host with another way to wake a chat adds it there.

### Give a page a button

A [review page](../review-pages.md#a-page-for-other-work) gets labelled buttons from its builder; this section is for a page you write yourself.

A button sends one message you fix when the link opens: *Send all* on a list of drafts, *Approve* on a quote.

```bash
node .claude/skills/reply-link/scripts/reply-link.mjs open "$page" --header "Changes to the drafts." \
  --action "send-all=Send every draft in $page as it stands."
```

`--action <name>=<message>` repeats, 6 at most. A name is lowercase letters, digits, and hyphens; a message is one line of 300 characters at most. Opening the file again replaces them all. **The page sends the name and optionally reviewer text.** The chat receives the registered instruction, then a newline and the notes; the fixed header is not included. Omitted or empty text sends the instruction alone.

```js
const key = window.REPLY_KEY || new URLSearchParams(location.hash.slice(1)).get('key');
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

`act` shares `send`'s 5 seconds. Confirm on the page before a button that can't be undone, as [a plan's *Build and publish*](reply-links.md#a-plans-link) does.

### Put an item with no page

A chat that needs a button but no page puts an item straight in [the inbox](reply-links.md#in-your-inbox-first):

```bash
node .claude/skills/reply-link/scripts/reply-link.mjs item --title "Email watch" --header "Email watch" --hours 8 \
  --action "round=Take the new notes and picks." --hidden --keep-open --stop "The watch stopped after 8 hours."   # prints REPLY_ITEM=<id>
```

The Inbox lists only review pages, so an item with no page shows no card: something else must tap it, such as a mini app's Submit. The item takes the same taps as a page's button. An open item of the same chat with the same title is replaced, not doubled. On `REPLY_ITEM=none`, no chat can be woken here.

- `--hidden`: the inbox shows no card for it, but a tap still reaches the chat.
- `--keep-open`: a tap does not close it. Each tap wakes the chat again, and moves its close to `--hours` from that tap.
- `--stop "<message>"`: the one message the chat gets when the item runs out of time. A lost chat gets none.
