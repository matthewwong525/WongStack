# Design

## Context

See [proposal.md](proposal.md). `reply-link.mjs` serves every registered page from one server: keyed `alive` and `send`, a header line fixed at `open`, and `wakeChat`. `review-kit.html` turns live when `alive` answers; `build-review.mjs --link` opens the link with the notes header.

## Goals / Non-Goals

**Goals:** two taps at most from a read plan to a started build; nothing a page says can widen what the chat is told; the shared part carries actions for any page.

**Non-Goals:** build status on the page; a different time limit or a one-use link for pages with actions.

## Decisions

### 1. Actions live in the registration

`open` takes `--action <name>=<message>`, repeatable: name `[a-z][a-z0-9-]{0,30}`, message one line of at most 300 characters, at most 6 actions. `openReplyLink({ actions })` takes the same as an object. They are written into the page's registration beside `header`. Re-opening a file replaces its actions.

### 2. One new route

`POST /p/<id>/act` with the key and `{ action, version }`:

| Case | Answer |
|---|---|
| unknown action | 400 |
| `version` is not the file's current hash | 409 `{ changed: true }` |
| this action already accepted for this version | 409 `{ done: true }` |
| chat confirmed | 200 `{ sent: true }` |
| chat not confirmed | 502 `{ sent: false }`, and the action is not marked accepted |

It shares `send`'s 5-second gap. The message is the registered text alone: no header, nothing from the request. Accepted actions are kept in the server's memory per page id and version; a restarted server forgets them, which only allows a repeat the chat can see.

`alive` adds `actions` (the names) and `version` (SHA-256 of the file as it stands). The page keeps the version from its first `alive`, asked right after load; the gap between the two is the one window in which a rebuild goes unnoticed, and it is under a second.

*Alternative: the builder stamps a version into the page.* Rejected: other pages would each need their own stamp, and the server already reads the file.

### 3. The plan's two actions

With `--link`, the builder registers:

- `build`: `Build it now: run /apply for the plan <change>. Chosen on its review page.`
- `publish`: `Build and publish: run /ship for the plan <change>. Chosen on its review page.`

They read as the person's choice at the finished-plan question, so no skill text changes. The change name comes from the builder, never the page.

### 4. The page

A `<section id="ready">` after Decisions, hidden unless `alive` lists both actions. *Build it* is the primary button; *Build and publish* swaps the section for the confirm text with *Yes, publish* and *Cancel*. Before any request the page checks `unsent().length` and shows *Send or delete your notes first.* Answers: 200 → the section becomes *Asked the chat to build.* (or *…build and publish.*); 409 changed → *The plan changed. Reload to read it first.*; 409 done → *The chat was already asked.*; 429 → *Wait a few seconds, then tap again.*; anything else → *This link has closed. Choose in the chat.* and the section hides. A closed link's notes fallback is unchanged.

## UX

**Brief.** The reviewer, on a phone, has read the plan and has nothing to change. Done: the chat is building. Common: one tap on *Build it*. Edge: an old tab, unsent notes, a closed link. Mirrors the chat's own finished-plan choices.

**Shortest flow.** Open link → read → *Build it*.

**Hierarchy.** *Build it* is primary; *Build and publish* is secondary and confirms. The notes bar is unchanged.

**Components.** The kit's existing card and buttons; one new section.

### Review

[review.html](review.html): the second What Changes item sketches the section and its two later states.

## Risks / Trade-offs

- [The link can now publish] → the secret, 8 hours, a fixed message, one use per version, and a confirm on the page; the proposal says so in plain words.
- [The message interrupts whatever the chat is doing] → one use per version; the chat sees what arrived and from where.
- [A chat that has moved on to other work gets a build request] → the message names the change, so the chat can say it is already built or shipped.
