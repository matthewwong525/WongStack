# The landing page and README say: Claude Code and Codex, for people who don't code

**Status:** in-progress

**Branch:** open-source-any-ai

**Open questions:** none

## Why

The front pages pitch WongStack as "one place to build, collaborate, and get things done", beside a table that measures it against Muse and Grok Bot. That reads as one more product to pick instead of theirs. WongStack is something else: an open-source setup that makes the most powerful AI tools work for a business, in accounts the owner keeps. The people it helps most already use AI, may be trying Claude Code or Codex, and aren't getting full value from it.

## What Changes

- **The landing page's headline becomes "___ for people who don't code."** The name at the front slides up from Claude Code to Codex and back, the way the old "Grok Bot, Muse, or Dots, but yours" headline moved. A visitor who asks for less motion sees Claude Code, still. Grok is not in the headline yet: it has never been set up or tested as a working assistant here.
  ```text
    BEFORE                 AFTER
  ┌───────────────────┐  ┌────────────────────┐
  │ One place to      │  │ +▲ Claude Code ▲   │
  │ build,            │  │ +  (then Codex)    │
  │ collaborate, and  │  │ +for people who    │
  │ get things done.  │  │ +don't code.       │
  │                   │  │                    │
  │ You own           │  │ +The most powerful │
  │ everything...     │  │ +AI tools, set up  │
  │ [Install]         │  │ +for you. Yours.   │
  │                   │  │ [Install]          │
  └───────────────────┘  └────────────────────┘
  ```
- **The line under the headline says what WongStack is.** It sets up the most powerful AI tools for your business, for you to use and change, with security built in. It is open source, and everything it builds and learns stays in accounts you own. It says you own the record, never that the AI company can't see your chats.
- **The comparison table goes, and a "works with" section takes its place.** It shows the AI tools WongStack sets up and what each gets on day one, and says your skills, memory, and apps come with you when you switch. No page compares WongStack with another company's product any more.
  ```text
    BEFORE                 AFTER
  ┌───────────────────┐  ┌────────────────────┐
  │ How WongStack     │  │ +Works with the AI │
  │ compares          │  │ +you already use   │
  │                   │  │                    │
  │      W  G  M  O  L│  │ +Claude Code       │
  │ row  ✓  ✓  –  ✓  –│  │ + set up, memory   │
  │ row  ✓  –  –  –  ✓│  │ + loads by itself  │
  │ row  ✓  –  –  ✓  –│  │ +Codex             │
  │ ...               │  │ + the same         │
  │                   │  │ +Another assistant │
  │ Checked Sept 2026 │  │ + same files, asks │
  │                   │  │ + memory by hand   │
  │ [Install]         │  │ +Switch any time.  │
  │                   │  │ [Install]          │
  └───────────────────┘  └────────────────────┘
  ```
- **Build, remember, collaborate, and get things done stay, as what you get.** They are no longer the headline. The rest of the page keeps its sections: why Matthew built it, the phone screens, the setup that is already done, the sample apps, what it is built on, the install steps, and the questions.
- **The README opens the same way.** Its first lines say: the most powerful AI tools, such as Claude Code and Codex, for people who don't code; out of the box nothing is set up for a business; WongStack is that setup, open source, yours to use and change. The four bullets, the line about Matthew and Claymoo, and the install steps stay as they are.
- **A shared link shows the new line.** The text and the picture a shared wongstack.com link shows change to match the headline.

**Non-goals:** setting up or testing Grok as a working assistant, or adding it to the headline; switching to another AI by itself when one runs out; new pictures; any change to how WongStack installs or what it costs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-site`: the headline and shared-link text may now name the assistants WongStack sets up, only ones that work as a working assistant on the day the page is published; the page compares WongStack with no other company's product.

## Impact

- `site/src/`: `Landing.tsx`, a restored `Rotator.tsx`, a new works-with section replacing `Compare.tsx` and `compare.ts`, `index.css`, and their tests (`App.test.tsx`, `Site.test.tsx`, `shareCard.test.ts`).
- `site/index.html`, `site/brand/share-image.svg`, `site/public/share.png`; four logos under `site/public/logos/` that nothing loads afterwards.
- `README.md` opening.
- `wiki/maintaining/landing-page.md`: the headline rule and the comparison-table note. It ships, so `CHANGELOG.md` gets a `patch` entry.
- `openspec/specs/landing-site/spec.md` through the delta.

## Decision log

- **2026-10-07** — Asked who the new pitch is written for → chose "business owners already using AI maybe diving into codex / claude code but don't know how to get the most value out of it".
- **2026-10-07** — Asked what "rotating made easy" means → chose the names "sliding up in the headline like what we had before in our landing page", not WongStack switching AI for you.
- **2026-10-07** — Asked what happens to the comparison table that lists Grok Bot and Muse → chose to swap it for a "works with" section.
- **2026-10-07** — Asked what the fixed half of the headline says → chose "Get the most out of ___."
- **2026-10-07** — Asked how the headline treats Grok, never tested here as a working assistant → chose to leave Grok out for now; adding it is later, separate work.
- **2026-10-07** — Assumed: the README opening and the shared-link text and picture change to match, because yesterday's change kept the three in step and a visitor meets all three.
- **2026-10-07** — Assumed: "your data is yours" is worded as everything it builds and learns staying in accounts you own, because chats still pass through the AI company's model and only the record is yours.
- **2026-10-07** — Assumed: yesterday's promise that the headline names no other product is replaced, because naming the tools is now the point; the install steps still say any assistant first and name one only as an example.
- **2026-10-07** — Assumed: the README says "the AI you already use, such as Claude Code or Codex", neutral words first, because the README's own promise is that a named assistant comes after neutral wording.
- **2026-10-07** — Assumed: the works-with section shows Claude Code, Codex, and "another assistant" with its true limit, because memory loads by itself only in the first two today.
- **2026-10-07** — Assumed: the sliding names use the page's own font with each tool's logo, because the page loads no font file and three lookalike fonts for two names are not worth bringing back.
- **2026-10-07** — Assumed: the closing line "GitHub is for engineers. This is the next one, for everyone else." stays, because the page is still for business owners and it is one line to change at the preview.
- **2026-10-07** — Assumed: the wiki's own opening line keeps "one place to build, remember, and get things done", because it describes the wiki inside an install, not the public pitch.
- **2026-10-07** — Assumed: this is a `patch` release, because the one shipped edit is wording on the landing page's maintaining guide.
- **2026-10-07** — After the plan was written, Matthew wrote "our headline can be Use Claude Code / Codex without knowing how to code or something along those lines" → the headline reads "Use ___ without knowing how to code.", replacing "Get the most out of ___."; the README opening and shared-link text follow.
- **2026-10-07** — Matthew wrote "try to make it more impactful and concise"; asked which shorter headline → chose "___ for people who don't code.", replacing "Use ___ without knowing how to code."
- **2026-10-07** — Built: the headline's smallest size went from 2.5rem to 2rem, so "Claude Code" with its logo fits one line on a 320 px phone.
- **2026-10-07** — Built: the share picture was rendered with the Geist font read from another checkout's files; nothing was installed.
- **2026-10-07** — Built: task 1.4's search still finds the removed products' names in `site/src/Site.test.tsx`, where the new guard test must name them; no page names one.
- **2026-10-07** — Check: `site/src/Site.test.tsx` now expects more than 5 drawings on the site, not more than 10, because removing the four comparison logos leaves exactly 10.
- **2026-10-07** — Saved: everything is written and the checks on this computer pass; the spec carries the new promise. The look at the saved landing page preview (task 4.4) is still to do.
