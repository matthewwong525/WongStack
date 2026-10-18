# Design

## Context

Three private input pages live in `.agents/skills/hand-over/scripts/`: the key link (`keys-page.html`/`.mjs`), the password link (`passwords-page.html`/`.mjs`), and the private form (`form-page.html`/`.mjs`). `hand-over.mjs` serves each at `/` and `/page.mjs` through `pages()`, with `no-store`, `no-referrer`, and `frame-ancestors 'none'`. Each page carries its own inline `<style>` with the same base rules copied three times. The key guide's fields are checked by `GUIDE_FIELDS` and `LIMITS` in `keys.mjs` and handed to the page by `describeKeys`. `timeLeft` is copied in `keys-page.mjs` and `form-page.mjs`; the password page has no clock. See proposal.md for why.

## Goals / Non-Goals

**Goals:** one shared look across the three pages; the key page reads as a short guided task; no new network fetch, route behavior, or stored data.

**Non-Goals:** the live view page (`view-page.html`); what any route accepts or returns, beyond the optional `why` guide field; link lifetime; key tests; a clock on the password page.

## Decisions

1. **One stylesheet, served by the link.** Add `private-page.css` beside the pages and serve it at `/page.css` from `pages()` for every mode, with the same headers as the other files and `text/css`. The three pages link it and drop their inline base rules; page-only rules stay inline. *Alternative:* keep three inline copies and edit each — rejected, the copies already drift (passwords has a sticky bar, the others don't). The test harnesses inline the stylesheet the way they inline `page.mjs`, or ignore it: JSDOM tests check text and state, not paint.
2. **Look.** Light and dark through `color-scheme` and custom properties set again in a `prefers-color-scheme: dark` block (not `light-dark()`, which iOS before 17.5 drops, leaving white text on a white button): a soft tinted page background, one white (or dark) card per key, 12px radii, 16px body text, the existing blue as the one primary button, green for a tick, amber-red for a refusal paired with a `!` mark so color is never alone. Step numbers sit in filled circles. The lock is an inline SVG in each HTML file: nothing is fetched.
3. **Key page layout.** Header: label, `h1` title, the `why` line, the privacy line. Each key becomes a card: label (several keys) or the page title (one key), an `<ol>` of steps whose last item is *Paste it here* holding the field, Paste, Show, file pick, and the test line (*We'll check it with <host>*). Several keys show `N of M saved` above the cards, updated in `markSaved`. Finish screen: a large tick, *All set*, the per-key results, and the existing notified/unconfirmed hint. The closed screen keeps its words.
4. **The `why` guide field.** `GUIDE_FIELDS` gains `why`, one line up to `LIMITS.why = 140`, refused like `title` when too long or multi-line. `describeKeys` passes it through like `title`; the page sets it as text. With several keys, each card shows its own `why` under its name.
5. **Readable name.** `readableName('MAPS_API_KEY')` → `Maps API key`: split on `_`, keep a short list of upper-case words (`API`, `URL`, `ID`, `AWS`, `SMTP`, `OAUTH`→`OAuth`, `JSON`), sentence-case the rest, lower-case `key`. The code name shows beneath in small monospace. Exported for tests.
6. **Clock.** `timeLeft(closesAt, now, zone)` returns `Open until <h:mm a>` while more than ten minutes remain, else `Closes in N min`, else null. The device's local close time is `closesAt - ahead`, where `ahead` is the watcher-clock offset `countdown` already computes, formatted with `toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})`. Kept as two small copies in the key and form scripts, as today: a shared script would need another route and test plumbing for three lines.
7. **Not now.** The close buttons on all three pages read *Not now* and call `done` exactly as before. Docs and tests that name the old words change with them.

## Risks / Trade-offs

- [A guide author writes a `why` that oversells the key] → `secrets.md` asks for one plain sentence of what the assistant will do with it.
- [`toLocaleTimeString` formats differ by device] → tests assert the shape with a fixed locale and time zone; the page accepts whatever the device prints.
- [A missed old button name in docs] → `rg "Close without (continuing|sending)"` is part of the docs task.

## UX

### Use-case brief

A business owner or teammate, often on a phone, sometimes for the first time, connects a service: the assistant sends a link, they open the service in another tab, make a key, copy it, and paste it here. Done is a green tick and *All set*, then back to the chat. Common case: one key with a guide. Edge cases: several keys, no guide, a refused key, a key file, a closed link. Assumed frequency: a few times per install, mostly in the first week; passwords and private forms less often. Mirrors today's key page, keeping its order of steps.

### Flow

Open link → read what it's for → tap step 1, make and copy the key at the service → come back → *Paste* → *Save and continue* → tick and *All set*. A refusal branches to *copy it again* or *Save anyway*; *Not now* exits from any state.

### Hierarchy

One primary action per page: *Save and continue* (keys, passwords) or the form's own submit label. Step 1's link to the service is a secondary outlined button. *Not now*, Show, file pick, and the time are muted.

### Review

[review.html](review.html): What Changes 1 (key page before and after), 2 (refused and all set), 3 (several keys), 5 (password page and private form). Item 4 is a table of the time text.

### Components

No component library: plain HTML pages. New: `private-page.css`, an inline lock SVG, step circles, key cards, the progress line.
