# Design

## Context

See [proposal.md](proposal.md) for why. Today:

- [`build-review.mjs`](../../../.agents/skills/plan/scripts/build-review.mjs) turns a proposal or `review.md` into one static page inside [`review-kit.html`](../../../.agents/skills/plan/references/review-kit.html). Every fence is checked and written back out by the builder; a `screen` fence's inputs are `inert`. A page is at most 500 KB (`PAGE_MAX`), because the Inbox keeps 512 KB an item (`LIMITS.bodyBytes` in `app/worker/apps/inbox/store.ts`).
- A page sends only text. Through a tunnel, [`reply-link.mjs`](../../../.agents/skills/hand-over/scripts/reply-link.mjs) takes `POST send` and `POST act` with the `x-reply-key` header, 128 KB a body and 20,000 characters of text. In the Inbox, `PlanView.tsx` frames the page with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` and hands it a `MessagePort` in `inbox:hello`; the page sends `inbox:tap` and gets `inbox:result`. The computer claims taps through [`lib/inbox.mjs`](../../../.agents/skills/hand-over/scripts/lib/inbox.mjs) and reports `tap-result`.
- The live line carries no page body, only wake-ups, so a larger page does not touch its message limit.
- [`prototype.mjs`](../../../.agents/skills/plan/scripts/prototype.mjs) prototypes app screens on the change's preview. Nothing prototypes a site the app does not run.

## Goals / Non-Goals

**Goals:** one new card kind for any chat-made page (`live`); one question fence (`form`); one section (`## What the build needs`); files through both send paths with the same limits; no new Cloudflare resource.

**Non-Goals:** network access from a live card; a live card that changes the page around it; resumable or chunked uploads from the browser; files kept after delivery; any change to private links.

## Decisions

### A `live` fence names a folder; the builder inlines it

````markdown
- **New home page.** The spring sale page.
  ```live
  folder: prototypes/home
  height: 640
  ```
````

The folder holds `index.html` and its files, inside the page's root (a plan: the change folder; other work: the `review.md` folder). The builder reads `index.html`, inlines each local `<link rel="stylesheet">`, `<script src>`, `src=`, `srcset=`, and CSS `url()` (pictures and fonts as data URIs, through the picture byte checks extended with GIF, SVG-as-text, WOFF and WOFF2), and stops on any `http:`, `https:`, or `//` address with *copy it into the folder*. The result goes into an `<iframe sandbox="allow-scripts" srcdoc="…">`, escaped as an attribute. The builder prepends, as the first element of `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'">
```

and a short shim that defines `review.answer(text)`. A live card is at most 800 KB inlined; a page rises to 1.5 MB (`PAGE_MAX`) and the Inbox's `bodyBytes` to 1.6 MB, under D1's 2 MB row limit.

*Alternative:* serve the prototype from the preview address with a *Try it* link, as app screens do. Rejected as the default: it needs a deploy for a static site, and the card would show only a picture. A *Full screen* view at true size covers the try-it-on-a-phone case.

### The card talks to the kit through its own port

On the frame's first `load`, the kit sends `review:hello` with a `MessagePort` to `frame.contentWindow`, target `'*'` (the frame's origin is opaque). The shim keeps the port; `review.answer(text)` posts `{ type: 'review:answer', text }`. The kit takes only messages on that port, keeps the newest answer per card (at most 2,000 characters), and shows it in the notes list as *Card #2 answer*. A second `load` event means the card navigated itself: the kit resets `srcdoc`, drops the port, and shows *This card tried to leave the page.*

The width switch renders the frame at 390 px (*Phone*) or 1280 px (*Computer*), scaled with a CSS transform to the card's width; *Full screen* opens it unscaled in the existing viewer.

### A `form` fence is questions, one a line

````markdown
```form
text: Shop name
choice: Sale ends | Sunday, Next Sunday
date: Launch day
tick: Free shipping over $50
file: Logo | image | 1
```
````

Kinds: `text`, `long`, `choice` (`| a, b`, several with `choices:`), `date`, `tick`, `file` (`| <types> | <count>`, count 1–5). Types are `image` (PNG, JPEG, WebP, GIF), `pdf`, `text` (TXT, CSV, MD, JSON), `office` (DOCX, XLSX, PPTX), `zip`. The builder stops on an unknown kind or type, more than 12 questions in one fence, and on a label matching `/password|passcode|api key|\bkey\b|token|secret|card number|cvv|cvc/i`, pointing at [the private key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link). Answers are saved with the notes in the browser (the Inbox's per-plan notes store already round-trips them) and go out in the existing text as `- Card #3, "Shop name": Corner Shop`.

### Files go first, then the send names them

Both paths upload each picked file at once, get an id, and the later send or action carries `files: [id…]`. A send names files; it never holds their bytes, so the 20,000-character text limit and the 128 KB body limit stay.

- **Tunnel:** a new `POST file` on the reply-link server, with `x-reply-key`, `x-file-name`, `x-file-question`, and a raw body of at most 25 MB, written to disk as it streams in. It checks the first bytes against the name's type, writes `<uploads>/<id>-<safe name>` with mode `0600`, and answers `{ id }`. The opener passes `--uploads <dir>`; the default is `.scratch/<change or page name>-uploads/`. A send lists `Files:` lines with each question, name, size, and path after the text. At most 100 MB a link; a file never sent with a tap is deleted when the link closes.
- **Inbox:** the kit posts `inbox:file` with the bytes as a transferred `ArrayBuffer`; `PlanView.tsx` checks the size (25 MB a file, 100 MB an item) and calls a new `POST /api/inbox/items/:id/files`, then answers `inbox:file-result`. The worker stores the file in a new migration's two tables, `inbox_files` (id, item, installation, email, name, type, question, size, created) and `inbox_file_parts` (file, n, data BLOB of at most 1 MB), each statement scoped by `mine()`. The worker streams the body into parts, never holding a whole file in memory, and refuses a file once the install's waiting files pass 300 MB. `inbox:tap` gains `files`. The computer's claim returns each tap's file list; `lib/inbox.mjs` reads `GET /api/inbox/files/:id`, checks the bytes as the tunnel does, writes them where the tunnel would, and its `tap-result` of `sent` deletes them. Every inbox call deletes files older than 24 hours (`KEEP_MS`) and files of cancelled, failed, or expired taps; the plan's item lists the files the app still holds, so the page asks again for one it deleted. Each part the computer reads holds its check-in's taps a while longer.

*Alternative:* a new R2 bucket. Rejected for now: R2 needs a card on the Cloudflare account, staging has no bucket, and setup would need a new step. D1 in 1 MB parts holds 100 MB a send, no one can open a file after a day, and the next inbox call deletes it, and the 300 MB cap keeps a free database (500 MB) from filling.

### `## What the build needs` is a section of bullets

````markdown
## What the build needs

- **Shopify key**: Ready, `SHOPIFY_TOKEN` is in `.env`.
- **Your logo**: Needs you.
  ```form
  file: Logo | image | 1
  ```
- **Meta ads key**: Needs you. Get it: <https://….trycloudflare.com/…>
- **Nothing else.**
````

Each bullet's state is the word after the colon: `Ready` or `Needs you`. A *Needs you* item turns ready on the page once each of its questions has an answer; one with only a link turns ready only when the chat rebuilds the page. The kit counts open items and, while any is open, every bar button except *Send notes* reads *N things need you* and scrolls to the first open item. `/plan` writes the section for every plan: it checks keys with `company-api.mjs services` and `.env`, and logins with `browse.mjs logins`. A plan whose build needs nothing writes one bullet, `**Nothing.** The build needs nothing from you.`

### The build starts from an approved live card

`/apply` reads a plan's `prototypes/<site>/` as the source for that site's pages. Before publish, it takes the approved card's pictures (`browse.mjs screenshot` of the inlined page at 390 and 1280 px) and the built page's, and passes them to `preview-review.mjs --approved`, which already draws *Approved* beside *Built*.

## UX

### Use-case brief

The owner reviews a plan or an ads page, mostly on a phone, in the Inbox or from a link. The job: trust the go. Done means: they tried the real page, answered the few questions, sent the files, and tapped *Build it* once. Common case: one live card and two or three questions. Edge cases: a missing key, a file too big, a card that misbehaves. Assumed: a plan has at most one live card per site and at most a dozen questions.

### Flow

Open the page → try the live card (switch width, full screen) → answer questions and drop files → the needs count falls to zero → *Build it*. A key need branches to its private link; the page comes back rebuilt with it *Ready*.

### Hierarchy

The bar's primary button stays the page's go; while needs are open it reads *N things need you* and leads to them. In a live card, the card's own content leads; the width switch and *Full screen* are ghost buttons.

### Review

[review.html](review.html): What Changes items 1 (live card), 3 (form), and 5 (needs list) sketch the screens.

### Components

The kit's existing `card`, `btn-ghost`, `btn-primary`, `tag`, `tag-outline`, `field`, and viewer. New: the live card frame with its width switch, form inputs in the look's `field` style, a file drop box, and the needs list rows.

## Risks / Trade-offs

- [A live card's script navigates its own frame to a web address, carrying what the person picked] → CSP cannot stop a frame's own navigation. The kit catches the second `load`, resets the card, and says so. The card's code is the chat's own, on the person's own computer, so it is as trusted as the chat that wrote it.
- [A 1.5 MB page is slow to open on a phone] → the builder warns over 800 KB and asks for smaller pictures, as it does for pictures today.
- [Files in D1 grow the database] → unreadable after a day and deleted at the next inbox call, 100 MB a send, 300 MB waiting an install, one tap per 5 seconds; a check-in prunes. An install that often hits the cap moves to R2 in a later change.
- [A person sends a secret through a file] → the file box says *Never send a password, key, or card here*, and the label check stops the obvious questions.
- [The skill-text budget] → the `/plan` addition for the needs list needs an offsetting cut, checked by `measure-context.mjs --check`.

## Migration Plan

The new migration adds two tables and touches no existing row; the app's normal deploy runs it. A page built before this change has no live cards, forms, or needs list, and works as today. Roll back by reverting the release; the tables stay empty and harmless.
