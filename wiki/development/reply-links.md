# Reply links

A reply link opens a page the agent made at a web address, and the page's one button sends what you wrote straight to the chat that made it, with nothing to copy and paste. A plan's review page is the first page that uses one; [`reply-link.mjs`](../../.agents/skills/hand-over/scripts/reply-link.mjs) opens them. Part of [development](README.md).

It is not a [private link](browsing.md#how-private-links-work). A private link takes a secret the agent must never see, and nothing typed into it reaches the chat. A reply link does the opposite: everything you send goes into the chat. **Never send a password, a key, or a card through one.**

## A plan's link

Each new or changed plan prints *Click here to see the plan:* with a reply link, when one can open ([print the plan's link](../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link)).

- **Send notes.** On the page, save your notes, then tap *Send notes*. Saving copies nothing there. One tap sends every note not yet sent, and each is marked *Sent*, so a second tap sends nothing twice. Change a sent note and it goes again.
- **The chat takes them as pasted notes.** They arrive under the line *Notes on the plan … Don't build yet.* The chat [updates the plan](../../.agents/skills/plan/SKILL.md#review-notes) and builds nothing.
- **The first plan of the day waits 5 to 10 seconds** for the connection. Later plans, from any chat on the same computer, share it and print at once.

## Eight hours, then a new link

A link stays open for 8 hours from when the chat printed it. Building the plan again moves the time on and keeps the same link.

- **A closed link costs you nothing.** When the link has closed, or the chat can't be reached, the same tap copies your notes and says so: *This link has closed. Copied 2 notes: paste them into chat.* The button then reads *Copy notes*, as on a file.
- **Say *new link*.** The chat runs the plan's build command again and prints a fresh link. Notes you saved at the old address stay there: send or copy them before you ask.
- **A dead connection shows Cloudflare's error page**, not ours. Say *new link*.

## Where no link opens

The chat prints the page's file, and the page copies notes as it always has. It asks you to install nothing. That happens when:

- the host has no way to send a chat a message (`REPLY_REASON=no-chat`);
- [Cloudflare's tunnel tool](required-tools.md#installing-cloudflared) is not installed (`no-cloudflared`);
- the tunnel did not come up within 30 seconds (`tunnel-down`);
- `REPLY_LINK=off` is set, as the tests do (`off`).

A page opened from the plan's file, or from a pull request, is the same page with *Copy notes*.

## Is a link safe?

- **The address alone only shows the page.** It is long and random, and what it shows is plan text, not a secret.
- **Sending needs the link's key.** The key rides after the `#`, which a browser never sends as part of an address, and goes back in a header.
- **A send reaches one chat, under one fixed line.** The chat and the first line are set when the link opens; the page can change neither. For a plan that line says *Don't build yet.*
- **A send is bounded:** 20,000 characters, and one every 5 seconds for each page.
- **The link is in the chat's text.** Anyone who can read it there can send notes to that chat until it closes.
- **It never blocks a private link.** A reply link keeps its own state, apart from [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs), so a key link opens at once during a review, and several pages hold links at the same time.

## Open one for another page

Any single self-contained HTML file can open this way: a form with one *Submit*, a list to approve.

```bash
node .claude/skills/hand-over/scripts/reply-link.mjs open "$page" --header "Answers from the intake form."   # prints REPLY_LINK=<url>
node .claude/skills/hand-over/scripts/reply-link.mjs close "$page"
node .claude/skills/hand-over/scripts/reply-link.mjs list
```

`--header` is the fixed first line of every message the page sends; write it so the chat knows what to do with the text. `--hours N` changes the 8 hours. On `REPLY_LINK=none`, offer the file and take the answers in chat.

The page reads the key from its own address and asks two routes beside itself:

| Route | Does |
|---|---|
| `GET alive` | `200 {closesAt}` while the link is open |
| `POST send` with `{"text": "…"}` | `200 {"sent": true}` once the chat has it; anything else means it did not arrive |

Both need the key in an `x-reply-key` header. A closed link answers `410`, a second send inside 5 seconds `429`.

```js
const key = new URLSearchParams(location.hash.slice(1)).get('key');
async function submit(text) {
  const response = await fetch('send', { method: 'POST', headers: { 'content-type': 'application/json', 'x-reply-key': key }, body: JSON.stringify({ text }) });
  return response.ok && (await response.json()).sent === true;
}
```

When `submit` is false, show the text for the person to copy: the page must never say *sent* on anything but `sent: true`. The file is read from disk on every visit, so a rebuilt page shows at the same link.

One server and one tunnel serve every open page, and both stop once no page is open. The chat is woken through [`lib/wake.mjs`](../../.agents/skills/hand-over/scripts/lib/wake.mjs), the one place that names how: a host with another way to wake a chat adds it there.
