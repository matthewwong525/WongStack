# The landing page tells the self-drive story

**Status:** parked

**Branch:** sweet-badger

**Open questions:** none

## Why

The landing page makes its points in five separate sections, and a visitor has to piece them together. Matthew's talk, *How to self-drive your business*, tells the same story in one line of thought: a self-driving car needs three things, and so does your business. The page should read like the talk, top to bottom, with the talk's pictures, and show that only WongStack keeps all three.

## What Changes

- **The headline says "Self-drive your business," over the car from the talk.** The assistant names that slide through the headline go, and so does the screenshot of the chat app.
  ```text
  Self-drive your business.
  A self-driving car sees the road,
  knows the rules, and knows where
  to go. Your business needs the same.
  [Install for free]  See it on GitHub →

     ((•))
   ▁▁/‾‾‾‾\▁▁   ·····📍
   ‾(o)‾‾(o)‾
  ```
- **The story follows the talk's slides, with their pictures.** One section each, a short heading and one line, as on the slides. The example tools and the team section go, so the page is shorter.
  ```text
  Your business has the same three
    Sensors   Rules     Navigation
      │         │           │
    Data     Process     Reason

  Data is what your business sees
    Ad spend ┐
    Creatives┼──▶ (◎) One place you own
    Sales    ┤
    Customers┘

  Process is how the work gets done
    Research ▶ Brief ▶ Creative ▶ Publish
    Code ✓   A skill ✓   An SOP ✗

  Reason is why you chose this road
    ~~•~~~~~•~~~~~•~~📍  (the road)
    Why ads? Why this audience?
    Why this message?

  One example: publishing an ad
    Your ad metrics ─────── Data
    Your campaign structure ─ Process
    Why you have this setup ─ Reason
  ```
- **A chart shows that only WongStack keeps all three.** Each other product gets a tick only where its own help pages say so, and *not stated* elsewhere, with the date checked.
  ```text
                 Wong  Open  Muse Grok Chat Claude
                 Stack Claw       Bot  GPT
  Data, in one
  place you own   ✓     –     –    –    –    –
  Process, as
  code you own    ✓     ✓     –    –    –    –
  Reason, saved
  from chats      ✓     ✓     ✓    ✓    ✓    ✓
  ✓ their docs say so · – not stated
  Checked Oct 2026
  ```
- **Reasons are saved without asking.** The *I'll remember why* exchange goes; the page says reasons are saved from your chats.
- **"The hardest part is the setup" leads into install.**
  ```text
  The hardest part is the setup
  Handled for you.
    Servers and databases · Security
    Collaboration · Memory
  ─────────────────────────
  Install it for free  1 · 2 · 3
  ```
- **What stays, in order.** Hero ▶ same three ▶ Data ▶ Process ▶ Reason ▶ ad example ▶ chart ▶ works with ▶ setup ▶ install ▶ questions ▶ *Make it yours*.
- **The README's top line and a shared link's text say the same headline.** The picture a shared link shows is redrawn with it.

**Non-goals:** changing what the page says about installing, costs, or privacy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-site`: the page tells the self-drive story in the talk's order under a headline that names no product, and may compare WongStack with named products, each mark backed by that product's own pages.

## Impact

- `site/src/Landing.tsx`, `site/src/Story.tsx`, new `site/src/compare.ts`, `site/src/index.css`; `site/src/Rotator.tsx` removed; `site/src/apps.tsx` and `site/src/mockups.tsx` removed if nothing else uses them.
- Slide pictures under `site/public/art/`; product logos under `site/public/logos/`.
- `site/index.html`, `site/brand/share-image.svg`, `site/public/share.png`, `README.md`, `CHANGELOG.md`, `wiki/maintaining/landing-page.md`.
- Tests: `site/src/App.test.tsx`, `site/src/Landing.test.tsx`, `site/src/Site.test.tsx`, `site/src/shareCard.test.ts`, `site/src/apps.test.tsx`.

## Decision log

- **2026-10-15** — Check: `site/src/Site.test.tsx` replaces the guard that failed on any comparison with another product, because the page now carries a sourced chart; the new test fails when a mark is other than *yes* or *not stated*, a *yes* has no source page and quote, the chart says a product lacks something, its checked month is missing, or a compared product is named outside the chart.
- **2026-10-15** — Check: `site/src/apps.test.tsx` and its snapshot `site/src/__snapshots__/apps.test.tsx.snap` are deleted with `site/src/apps.tsx`, the sample tools they tested, because the revision cuts them from the page; none of their tests guarded a file that stays.
- **2026-10-15** — Built: every chart mark was set from each product's own page, read word for word on 2026-10-15. Reason is *yes* for all five; Process is *yes* for OpenClaw only (its skills page keeps scripts with a skill in `<workspace>/skills`); every other mark is *not stated*. OpenAI's help page refuses direct requests, so it was read through a reader service that returns the page's text as is.
- **2026-10-15** — Parked: after the color-coded chart preview, Matthew said "I don't like it that much" and closed without publishing; no reason given. Before resuming, ask what felt off. Task 5.3's preview was seen at the self-drive-landing-page staging alias (order, no sideways scroll at 390 px, chart readable); the install copy button was not tried there.
