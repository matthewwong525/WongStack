<!-- openspec-archive v1 2026-10-07-send-notes-to-chat -->
<!-- file proposal.md utf8 7608 -->
# Send plan notes straight to the chat

**Status:** ready-to-ship

**Branch:** beefy-moth

**Open questions:** none

## Why

When you review a plan, your notes take three steps to reach the chat: tap *Copy notes*, switch to the chat, paste. On a phone that is the slowest part of a review, and a copy that fails loses the trip. The plan page is a file on the computer the chat runs on, so it has no way to talk back.

The pieces for a way back already exist. The private links for keys and passwords open a web address that closes itself and wake the chat when you finish. A plan can open the same way.

## What Changes

- **A plan opens as a live link, and its button sends your notes to the chat.** The chat prints a web address instead of a file. *Send notes* puts your saved notes into the chat that made the plan, as if you had pasted them: the chat updates the plan and builds nothing.
  ```text
    BEFORE                 AFTER
  plan page (a file)     plan page (live link)
       │                      │
   Copy notes             Send notes
       │                      │
   switch to chat             │
       │                      │
     paste                    │
       ▼                      ▼
     chat                   chat
  ```
- **The button on the page changes with the link.** On an open live link it reads *Send notes*. Saving a note no longer copies anything there; one tap sends every note not yet sent, and each sent note is marked *Sent*. Opened as a file, the page works as it does today.
  ```text
    BEFORE                   AFTER
  ┌──────────────────────┐ ┌──────────────────────┐
  │ 2 notes [Copy notes] │ │ 2 notes [Send notes] │
  └──────────────────────┘ └──────────────────────┘
   toast after the tap:     toast after the tap:
   Copied 2 notes. Paste    Sent 2 notes to the
   them into chat.          chat.
  ```
- **A link stays open for 8 hours, and a closed one costs you nothing.** When the link has closed, or the chat can't be reached, the same tap copies your notes instead and says so, and you paste them as today. Say *new link* and the chat prints a fresh one.
  ```text
  ┌──────────────────────────────┐
  │ 2 notes         [Send notes] │
  └──────────────────────────────┘
   toast when the link has closed:
   This link has closed. Copied
   2 notes: paste them into chat.
  ```
- **Every plan gets one, at no cost after the first.** The first plan of the day takes 5 to 10 seconds longer to print its link. Later plans, from any chat on the same computer, share that one connection and print at once.
- **Where a chat can't be woken, nothing changes.** A host with no way to wake a chat, or a computer without Cloudflare's tunnel tool, still gets the file and *Copy notes*.
- **Key, password, and card links are untouched.** A plan link has its own place, so it never blocks one of those, and their rule stays: nothing typed into them reaches the chat.
- **Other pages can use the same part.** Any single page with a *Submit* button can open the same way and send its answers to the chat that made it. The mail review page in WongOS is the first that will; that page itself is built there, not here.

Non-goals: no hosting in your Cloudflare account, no link that lasts for days, and no change to what pasted notes do.

## Capabilities

### New Capabilities

- `reply-links`: a page opened through a live link can send its answers to the chat that made it; the link closes itself, has its own place beside private links, and is not opened where no chat can be woken.

### Modified Capabilities

- `ux-wireframes`: the review page may send notes when opened through a live link and still fetches nothing and works from disk; saving copies notes only when the page is not on an open live link; sent notes go to the chat that made the plan, once each.
- `asking-the-user`: the plan's link line carries the live link when one is open, else the file.

## Impact

- New script `.agents/skills/hand-over/scripts/reply-link.mjs` and its page-side contract; tunnel and wake-the-chat helpers move out of `hand-over.mjs` into `.agents/skills/hand-over/scripts/lib/` unchanged in behavior.
- `.agents/skills/plan/references/review-kit.html` (the send path, the *Sent* mark, the fallback) and `.agents/skills/plan/scripts/build-review.mjs` (a `--link` flag; prints the live link).
- Skill text: `plan/SKILL.md`, `hand-over/SKILL.md`, `explore/references/asking-the-user.md`, kept inside the context budget.
- Tests: `scripts/tests/reply-link.test.mjs` (new), `review.test.mjs`, `review-browser.test.mjs`, `hand-over.test.mjs`.
- Docs: a new `wiki/development/reply-links.md`, linked from the development hub and from browsing's private-link section; `.agents/skills/memory/references/areas.json` names the new spec.
- Payload release: `CHANGELOG.md` entry, **minor**: every install keeps the file and *Copy notes* where a live link can't open.

## Decision log

- **2026-10-07** — Asked when a plan should get a live link → chose every plan, over only on *Review the plan* and only when asked.
- **2026-10-07** — Asked how long a plan's live link stays open → chose 8 hours; after that the button copies and a new link is made on request.
- **2026-10-07** — Assumed: all plan links on one computer share one connection, because every plan now gets a link and one connection per plan would run a helper per plan for 8 hours and slow each one by 5 to 10 seconds.
- **2026-10-07** — Assumed: on a live link, saving a note does not send it, because each send wakes the chat and a review of five notes would update the plan five times.
- **2026-10-07** — Assumed: a note is sent once and then marked *Sent*, because a second tap would otherwise make the chat apply the same notes again.
- **2026-10-07** — Assumed: where no chat can be woken or the tunnel tool is missing, the chat prints the file with no prompt to install anything, because a plan must never wait on setup.
- **2026-10-07** — Assumed: the shared part ships here and the mail review page stays in WongOS, because WongStack owns the plan page and the link, and the mail page is that repo's own.
- **2026-10-07** — Assumed: the notes sent are capped in size and always arrive under the fixed line *Notes on the plan … Don't build yet.*, because anyone holding the link could otherwise put any instruction into the chat.
- **2026-10-07** — Walked from this host with a phone-sized browser, not a real phone: the page built with a live link, two notes saved, one tap on *Send notes*. The chat received the header line and both bullets once and built nothing. A sent note arrives at once and interrupts a step the chat is running.
- **2026-10-07** — After `close`, the address answered Cloudflare's error for both the page and a send, and nothing reached the chat. The copy fallback on a refused send is covered by the browser test, not by this walk.
- **2026-10-07** — The areas test fails before the archive, because it names the new spec the archive creates; it is rerun after.
- **2026-10-07** — Task 5.3 is the one checkpoint `/ship` makes after the archive; the merge waits on its result.
- **2026-10-07** — Archive checkpoint: every task ticked, the areas test passes with the new spec in place, numbered 37.4.0.

<!-- end proposal.md -->
<!-- file design.md utf8 8577 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5880 -->
# Tasks

Build sections 1–4 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no `/save`. The boxes in 1–4 are checked by source review; section 5 is the one gate.

## 1. Shared helpers (hand-over scripts)

- [x] 1.1 Move `freePort`, `hasCloudflared`, `startTunnel`, `tunnelOrigin`, `linkAnswers`, `killTunnel`, `alive`, and `keyMatches` from `.agents/skills/hand-over/scripts/hand-over.mjs` to `scripts/lib/tunnel.mjs`, taking the log and config paths as arguments ([design 1](design.md)); `hand-over.mjs` imports them and re-exports the ones its tests import. Verify by source review that no behavior changed and `hand-over.test.mjs` needs no new expectation.
- [x] 1.2 Move the `paseo send` call to `scripts/lib/wake.mjs` as `wakeChat(target, message)` returning `notified | unconfirmed | unavailable`; `notifyWorkspace` becomes a thin caller that still builds `completionMessage`. Author a unit test with a fake `paseo` for each of the three results.

## 2. The reply link (hand-over scripts)

- [x] 2.1 Write `.agents/skills/hand-over/scripts/reply-link.mjs` with `open <file> --header <line> [--hours N]`, `close <file>`, `list`, and the exported `openReplyLink()` ([design 2, 6, 7](design.md)): registrations under `~/.wong-stack/reply-link/pages/`, one shared tunnel and detached server, the outside probe before printing `REPLY_LINK=<url>`, and `REPLY_LINK=none` with `REPLY_REASON=` when no chat can be woken, `cloudflared` is missing, the tunnel is down, or `REPLY_LINK=off`. Verify by tests with a fake tunnel origin: a second `open` of another file starts no second tunnel; re-opening a file keeps its link and moves its deadline; each `none` reason exits 0 in under a second.
- [x] 2.2 Write the server's routes ([design 3, 4](design.md)): the file read from disk per request, keyed `alive` and `send`, the fixed header, the 20,000-character and 5-second bounds, 410 and the closed page for an unknown or expired id, the response headers, no logging, and exit with tunnel kill once no registration is unexpired. Author tests: a send with the key wakes the registered target with header plus text; no key is 403; an oversized or too-soon send is refused; an expired page is 410 and wakes nothing; an unconfirmed wake answers 502; a rebuilt file shows at the same address; the server exits when the last page expires.
- [x] 2.3 Author a test that an open hand-over link and an open reply link never touch each other's state: each opens while the other is open ([spec](specs/reply-links/spec.md)).

## 3. The review page and its builder (plan skill)

- [x] 3.1 In `.agents/skills/plan/references/review-kit.html`, add the live path ([design 5](design.md)): read `#key=` at an `http(s)` origin, ask `alive`, label the bar button *Send notes*, post unsent notes' bullets, mark them *Sent* on pins and rows, stop copying on save while live, and on a failed send copy and toast the closed-link line, then act as a file page. Keep every line inline and fetch nothing else. Extend `scripts/tests/review-browser.test.mjs`: from disk nothing changed; on a fake live origin two notes send once and a second tap sends nothing; a 410 copies and marks nothing sent; `#/why` still jumps with a key in the fragment.
- [x] 3.2 Add `--link` to `.agents/skills/plan/scripts/build-review.mjs` ([design 6](design.md)): the CLI calls `openReplyLink()` with the plan's header line and prints the link line with the live address, else the file path; `buildReview()` stays pure. Extend `scripts/tests/review.test.mjs`: without `--link` the output is byte-identical to today; with it and `REPLY_LINK=off` the file path prints; with a stubbed link the live address prints in the same line format.
- [x] 3.3 Pass `--link` in `/plan`'s build command and in each other place that prints a plan link (find them with `memory.mjs areas .agents/skills/plan/scripts/build-review.mjs` and a search for `build-review.mjs`); leave page-refresh-only runs without it. Verify by listing each caller and its choice in the save report.

## 4. Skill text, docs, and the release

- [x] 4.1 Write `wiki/development/reply-links.md`: what a reply link is, the 8 hours, *new link*, the fallback, the page-side contract with a short snippet for another page's *Submit*, and what never goes through one (a secret). Link it from `wiki/development/README.md`, from the private-link section of `wiki/development/browsing.md`, and from `hand-over/SKILL.md`. Verify with `node scripts/check-payload-links.mjs`.
- [x] 4.2 Update `plan/SKILL.md` (the command's flag; sent notes arrive as pasted notes do) and `explore/references/asking-the-user.md` (the link is the reply link when open, else the file; *new link*), cutting as many words as are added. Verify with `node scripts/measure-context.mjs --check`.
- [x] 4.3 Name `openspec/specs/reply-links/spec.md` in `.agents/skills/memory/references/areas.json` under the browser area and add `reply-link.mjs` to the payload file list if scripts are listed singly. Verify that `scripts/tests/memory-areas.test.mjs` would find the spec.
- [x] 4.4 Add the `## Next (minor) — …` entry to `CHANGELOG.md` in plain words, with an **Updating.** note: nothing to do by hand; plans made before the update keep *Copy notes* until rebuilt; WongOS's mail page can now open the same way. Verify that `VERSION` is unchanged.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate send-notes-to-chat --strict --no-interactive`; fix what fails.
- [x] 5.2 Walk it for real from this host: build this change's page with `--link`, open the link on a phone, save two notes, tap *Send notes*, and confirm the chat receives them once and builds nothing; then `close` the link and confirm the same tap copies. Record both results in the Decision log.
- [x] 5.3 `/save`, and confirm CI passes.

<!-- end tasks.md -->
<!-- file specs/asking-the-user/spec.md utf8 2014 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. The link SHALL be the page's reply link when one is open, else the page's file. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and, after a blank line, *When you're ready, type `/apply` to build it.*, with no question, and SHALL start nothing. No other reply SHALL print that line: a closing question that offers to build is the one way on. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full link, a blank line, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

#### Scenario: A standalone plan finishes

- **WHEN** `/plan` finishes and its closing question offers *Build it now*
- **THEN** the reply prints the plan's link above the question and no line telling the person to type `/apply`

#### Scenario: No chat can be woken

- **WHEN** a plan finishes on a host that can not open a reply link
- **THEN** the link line carries the full path of the page's file

<!-- end specs/asking-the-user/spec.md -->
<!-- file specs/reply-links/spec.md utf8 2977 -->
# Spec Delta

## Purpose

Lets a page the assistant made send the person's answers straight to the chat that made it, through a link that closes itself, so nothing has to be copied and pasted.

## ADDED Requirements

### Requirement: A page sends its answers to the chat that made it

A page opened through a reply link SHALL be able to send text the person chose to send to the chat that opened the link, and to no other chat, including when that chat is idle. The message SHALL begin with a line fixed when the link was opened, never one the page supplies. The page SHALL be told whether the chat received it, and SHALL never be told it was sent when that is unconfirmed.

#### Scenario: The person submits

- **WHEN** the person taps the page's send control on an open reply link
- **THEN** the chat that opened the link receives the fixed line and the text, and starts on it without another message from the person

#### Scenario: The chat can not be reached

- **WHEN** the chat that opened the link is closed or the send is unconfirmed
- **THEN** the page is told the send failed, and nothing is reported as sent

### Requirement: A reply link closes itself and holds a secret

A reply link SHALL open at an address through Cloudflare's tunnel and SHALL be given to the person only once it answers from outside the computer. Sending SHALL need a secret that only the link carries and that is never sent as part of an address. A link SHALL stop accepting sends at its time limit or when closed, even if the assistant's session has ended, and a send SHALL be bounded in size and rate.

#### Scenario: The time limit passes

- **WHEN** a reply link's time limit has passed and the person taps send
- **THEN** nothing reaches the chat and the page is told the link has closed

#### Scenario: A send without the secret

- **WHEN** a request to send arrives without the link's secret
- **THEN** it is refused and nothing reaches the chat

### Requirement: Reply links and private links stay apart

An open reply link SHALL never stop a key link, a password link, or a private form from opening, nor the reverse, and several pages MAY hold reply links at once. A reply link SHALL never be used to collect a secret, and nothing in this capability SHALL let a private link's page content reach the chat.

#### Scenario: A key is needed during a review

- **WHEN** a plan's reply link is open and the assistant needs a key
- **THEN** the key link opens at once, and the plan's link keeps working

### Requirement: No reply link where no chat can be woken

When the host gives no way to wake the chat, or the tunnel tool is missing, or the tunnel does not come up, opening a reply link SHALL end quickly with no link and no request to install anything, so the caller can fall back to its file.

#### Scenario: A host with no way to wake a chat

- **WHEN** a plan is made on a host that can not be sent a message
- **THEN** no link is opened and the plan's file is offered as before

<!-- end specs/reply-links/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 3018 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Every change carries a standalone review page

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`, committed and archived with the change. The page SHALL fetch no script, style, font, or picture from the network and SHALL work opened from disk; it SHALL use the network only to send notes when opened through a reply link. A change that adds or restructures a screen SHALL also keep a `## UX` section in `design.md` that links the page rather than repeating its sketches.

#### Scenario: Opened from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** every section, drawing, zoom, and note control works

#### Scenario: A change with no screen

- **WHEN** `/plan` drafts a worker, CLI, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: Copied notes name the plan and each place

Copy notes SHALL put a block on the clipboard whose first line is `Notes on the plan <change-name> from the review page. Don't build yet.`, then one bullet per saved note with its place and a short quote. When the page is not on an open reply link, every note save SHALL copy that block too: before a save the page SHALL say that saving copies all notes, and a failed copy on save SHALL keep the note saved and say to tap Copy notes. The page SHALL word notes as either a question or a change, never assuming a change. After a copy, it SHALL say to paste the notes into chat.

#### Scenario: Two notes copied

- **WHEN** the reviewer copies with two saved notes
- **THEN** the block holds the header line and two bullets, each with a place such as `Change #2`

#### Scenario: Saving copies every note

- **WHEN** the reviewer saves a second note on a page opened from disk
- **THEN** the clipboard holds the header line and both bullets, and the page says it saved and copied 2 notes

## ADDED Requirements

### Requirement: Notes go straight to the chat through a reply link

On an open reply link, the page's one notes control SHALL send every saved note not yet sent to the chat that made the plan, in the same wording copied notes use, and SHALL mark each as sent; saving a note SHALL send and copy nothing. Sent notes SHALL be handled as pasted notes are: they update the plan and build nothing. When a send fails or the link has closed, the same tap SHALL copy those notes, say that the link has closed and to paste them, and leave them unsent.

#### Scenario: Two notes sent

- **WHEN** the reviewer taps the notes control with two saved notes on an open reply link
- **THEN** the chat receives the header line and both bullets, the page says it sent 2 notes, and a second tap sends nothing

#### Scenario: The link closed overnight

- **WHEN** the reviewer taps the notes control after the link's time limit
- **THEN** the notes are on the clipboard, the page says the link has closed and to paste them into chat, and no note is marked sent

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-07

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 43485 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), its one request sends the saved notes to the chat.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-07-send-notes-to-chat</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-07-send-notes-to-chat">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-07-send-notes-to-chat</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When you review a plan, your notes take three steps to reach the chat: tap <i>Copy notes</i>, switch to the chat, paste. On a phone that is the slowest part of a review, and a copy that fails loses the trip. The plan page is a file on the computer the chat runs on, so it has no way to talk back.</p>
<p data-note="why-2" tabindex="0">The pieces for a way back already exist. The private links for keys and passwords open a web address that closes itself and wake the chat when you finish. A plan can open the same way.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A plan opens as a live link, and its button sends your notes to the chat.</b> The chat prints a web address instead of a file. <i>Send notes</i> puts your saved notes into the chat that made the plan, as if you had pasted them: the chat updates the plan and builds nothing.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">plan page (a file)     plan page (live link)</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">     │                      │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> Copy notes             Send notes</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">     │                      │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> switch to chat             │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">     │                      │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">   paste                    │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">     ▼                      ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">   chat                   chat</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The button on the page changes with the link.</b> On an open live link it reads <i>Send notes</i>. Saving a note no longer copies anything there; one tap sends every note not yet sent, and each sent note is marked <i>Sent</i>. Opened as a file, the page works as it does today.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                   AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────┐ ┌──────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ 2 notes [Copy notes] │ │ 2 notes [Send notes] │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">└──────────────────────┘ └──────────────────────┘</span>
<span class="ln" data-note="item-2-line-5" tabindex="0"> toast after the tap:     toast after the tap:</span>
<span class="ln" data-note="item-2-line-6" tabindex="0"> Copied 2 notes. Paste    Sent 2 notes to the</span>
<span class="ln" data-note="item-2-line-7" tabindex="0"> them into chat.          chat.</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A link stays open for 8 hours, and a closed one costs you nothing.</b> When the link has closed, or the chat can't be reached, the same tap copies your notes instead and says so, and you paste them as today. Say <i>new link</i> and the chat prints a fresh one.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ 2 notes         [Send notes] │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">└──────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-4" tabindex="0"> toast when the link has closed:</span>
<span class="ln" data-note="item-3-line-5" tabindex="0"> This link has closed. Copied</span>
<span class="ln" data-note="item-3-line-6" tabindex="0"> 2 notes: paste them into chat.</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Every plan gets one, at no cost after the first.</b> The first plan of the day takes 5 to 10 seconds longer to print its link. Later plans, from any chat on the same computer, share that one connection and print at once.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Where a chat can't be woken, nothing changes.</b> A host with no way to wake a chat, or a computer without Cloudflare's tunnel tool, still gets the file and <i>Copy notes</i>.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Key, password, and card links are untouched.</b> A plan link has its own place, so it never blocks one of those, and their rule stays: nothing typed into them reaches the chat.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Other pages can use the same part.</b> Any single page with a <i>Submit</i> button can open the same way and send its answers to the chat that made it. The mail review page in WongOS is the first that will; that page itself is built there, not here.</div></div></li>
</ol>
<p class="aside">Non-goals: no hosting in your Cloudflare account, no link that lasts for days, and no change to what pasted notes do.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked when a plan should get a live link → chose every plan, over only on <i>Review the plan</i> and only when asked.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked how long a plan's live link stays open → chose 8 hours; after that the button copies and a new link is made on request.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: all plan links on one computer share one connection, because every plan now gets a link and one connection per plan would run a helper per plan for 8 hours and slow each one by 5 to 10 seconds.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: on a live link, saving a note does not send it, because each send wakes the chat and a review of five notes would update the plan five times.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a note is sent once and then marked <i>Sent</i>, because a second tap would otherwise make the chat apply the same notes again.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: where no chat can be woken or the tunnel tool is missing, the chat prints the file with no prompt to install anything, because a plan must never wait on setup.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the shared part ships here and the mail review page stays in WongOS, because WongStack owns the plan page and the link, and the mail page is that repo's own.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the notes sent are capped in size and always arrive under the fixed line <i>Notes on the plan … Don't build yet.</i>, because anyone holding the link could otherwise put any instruction into the chat.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Walked from this host with a phone-sized browser, not a real phone: the page built with a live link, two notes saved, one tap on <i>Send notes</i>. The chat received the header line and both bullets once and built nothing. A sent note arrives at once and interrupts a step the chat is running.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>After <code>close</code>, the address answered Cloudflare's error for both the page and a send, and nothing reached the chat. The copy fallback on a refused send is covered by the browser test, not by this walk.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>The areas test fails before the archive, because it names the new spec the archive creates; it is rerun after.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Task 5.3 is the one checkpoint <code>/ship</code> makes after the archive; the merge waits on its result.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Archive checkpoint: every task ticked, the areas test passes with the new spec in place, numbered 37.4.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) { if (r.ok) setLive(key); }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
