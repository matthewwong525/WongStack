# Design

## Context

See [proposal.md](proposal.md) for why. What shapes the approach:

- `review.html` is one self-contained file built by `build-review.mjs` from `review-kit.html`. Its spec says it loads nothing from the network and works from disk; it is committed, archived, and linked from the PR body. All of that stays.
- `hand-over.mjs` holds a working route back: a Cloudflare quick tunnel to a loopback page, a secret key in the link's fragment, and `notifyWorkspace()`, which runs `paseo send <agent> <message> --no-wait`. It allows one link at a time, keeps state in `~/.wong-stack/hand-over/`, and promises that no page content reaches the chat.
- Notes are `localStorage` data keyed per change, so they belong to the origin the page was opened at.
- Skill text is under a measured budget (`scripts/measure-context.mjs --check`).

## Goals / Non-Goals

**Goals:**

- One tap sends saved notes to the chat that made the plan.
- The file page and *Copy notes* keep working everywhere, unchanged.
- One shared part that any single-file page can use.
- Private links keep their lock, their state, and their no-content rule.

**Non-Goals:**

- A stable address, or one that outlives the computer's tunnel. A Worker relay in the person's Cloudflare account would give that, but needs an installed account and a poller on the computer; revisit if 8 hours proves short.
- Sending anything but text the person chose to send.
- The WongOS mail page.

## Decisions

### 1. A separate script, `reply-link.mjs`, beside `hand-over.mjs`

`reply-link.mjs` lives in `.agents/skills/hand-over/scripts/` with its own state directory, `~/.wong-stack/reply-link/`. It never reads or writes hand-over's lock, so neither kind of link can block the other.

Not a fourth `hand-over.mjs` mode: that script's contract is one link at a time and result-only messages, and a mode that breaks both would weaken the rule for the other three.

The helpers both need move, with no behavior change, to `scripts/lib/tunnel.mjs` (`freePort`, `hasCloudflared`, `startTunnel`, `tunnelOrigin`, `linkAnswers`, `killTunnel`, `alive`, `keyMatches`) and `scripts/lib/wake.mjs` (the `paseo send` call, taking the target and the message). `hand-over.mjs` imports them and keeps `completionMessage` and its result-only wording.

### 2. One server and one tunnel serve every page

A plan per chat, each open for 8 hours, would mean many tunnels. Instead:

- `open <file>` writes a registration, `~/.wong-stack/reply-link/pages/<id>.json`: the file's absolute path, a 32-byte key, the fixed `header` line, the wake target (`PASEO_AGENT_ID`, host, home, cwd), and a deadline.
- If the server is alive and its public address still answers, `open` prints the link at once. Otherwise it starts the tunnel and a detached server, waits for the address to answer from outside (the same probe hand-over uses, 30 seconds at most), then prints.
- The server reads registrations on each request, so a new page needs no signal. It exits, and kills its tunnel, when no registration is unexpired.
- Opening a file already registered keeps its id and key and moves the deadline, so the link in the chat stays the same while the tunnel lives.

Alternative: one tunnel per page. Simpler, but 5 to 10 seconds on every plan and a `cloudflared` process per plan.

### 3. Routes

All under `/p/<id>/`, where `<id>` is 16 random bytes:

| Route | Needs the key | Does |
|---|---|---|
| `GET /p/<id>/` | no | the registered file, read from disk each time, so a rebuilt plan shows at the same link |
| `GET /p/<id>/alive` | yes | `200 {closesAt}` |
| `POST /p/<id>/send` | yes | wakes the chat with `header` + the text; `200 {sent:true}` or `502 {sent:false}` |

The key rides in the fragment (`#key=<hex>`) and returns in an `x-reply-key` header, compared in constant time. An unknown or expired id answers 410 with a small *This link has closed* page. The page is served `no-store`, `no-referrer`, and frame-denied, as hand-over's pages are. The server logs nothing.

The id alone lets someone read the page; that is plan text, not a secret, and the id is unguessable. The key is what lets someone write into the chat.

### 4. What reaches the chat

`send` takes `{text}`, at most 20,000 characters, at most one send per 5 seconds per page. The message is the registration's `header` line, a newline, then the text. The page never supplies the header or the target.

For a plan the header is `Notes on the plan <change> from the review page. Don't build yet.`, so the chat takes it through the existing review-notes path, which builds nothing. The server reports `sent` only when `paseo send` confirms the same agent got it; anything else is `502`, and the page falls back to copy.

### 5. The page: one file, two behaviors

`review-kit.html` keeps all its code inline. At load it looks for an `http(s)` origin and a `#key=`; with both it keeps the key in memory and `sessionStorage`, and asks `alive`.

- **Live:** the button reads *Send notes*. Save saves only. A tap posts the bullets of every note without a `sent` mark; on `sent:true` it marks them and toasts *Sent 2 notes to the chat.*
- **Not live** (a file, no key, `alive` failed): today's behavior, unchanged: *Copy notes*, and each save copies.
- **A send that fails:** the page copies the same notes and toasts *This link has closed. Copied 2 notes: paste them into chat.*, then switches to *Copy notes*.

The existing `#/why` jump links ignore a `#key=` fragment, and the page never writes the key into a link.

### 6. The builder prints the link

`build-review.mjs` gains `--link`. With it, after writing the page, the CLI calls `openReplyLink()` and prints the link line with the live address; with no link it prints the file path as today. `buildReview()` itself stays pure. `/plan`'s command, and the other places that print a plan link, pass `--link`; a run that only refreshes the page does not.

`openReplyLink()` returns `null`, quickly and quietly, when `PASEO_AGENT_ID` or the `paseo` command is missing, `cloudflared` is missing, the tunnel does not come up, or `REPLY_LINK=off` is set (tests set it).

*New link* is the same command again: a dead tunnel is noticed by the probe and replaced.

### 7. Any page can use it

`reply-link.mjs open <file> --header "<line>" [--hours N]` serves any single self-contained HTML file. The page-side contract is the three routes above; `wiki/development/reply-links.md` documents it with a short snippet. `close <file>` ends one page; `list` prints open pages and deadlines, never a key.

### 8. Waking a chat is behind one function

`lib/wake.mjs` is the only code that names Paseo. A host with another way to wake a chat adds it there; with none, there is no live link and the file path is the neutral route.

## UX

**Brief.** Who: the person reviewing a plan, most often on a phone. The job: tell the chat what to change. Done: the chat has the notes and is updating the plan. Common case: two to five notes, sent once, within the hour. Edge cases: the link has closed overnight; the page was opened from the PR. Mirrors: the page's own *Copy notes* bar.

**Shortest flow.** Tap the link → note, note → *Send notes* → back to the chat, which is already working.

**Hierarchy.** One primary action, the bar's button; its label says which of the two things it will do.

**Components.** The bar button (label by state), the toast (three messages above), a *Sent* mark on a sent note's pin and list row. No new screen, dialog, or setting.

### Review

[review.html](review.html): the second and third What Changes items sketch the bar and its toasts.

## Risks / Trade-offs

- [Notes saved on a live link live at that address; a new tunnel is a new address, so unsent notes do not follow] → a failed send copies them first, and sent notes are already in the chat. The closed-link toast is the warning; no new banner.
- [A quick tunnel has no uptime promise and can die inside the 8 hours] → the page falls back to copy; the next `--link` run replaces it.
- [The link, with its key, is in the chat's text] → it writes only to that one chat, only under the fixed header, for 8 hours; the review-notes path builds nothing.
- [A dead tunnel shows Cloudflare's error page, not ours] → *new link* in the chat; the wiki page says so.
- [Skill text budget] → the plan skill's command gains one flag and one clause; the detail goes to the wiki page.
- [Tests run inside a chat that has `PASEO_AGENT_ID`] → `REPLY_LINK=off` in the test environment, and the link tests use a fake tunnel origin as hand-over's do.
