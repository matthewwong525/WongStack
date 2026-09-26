# Design

## Context

24.0.0 (#130) made the starter landing page a tutorial message plus the mini-app list. `app/src/Tutorial.tsx` is one static `<section>` telling the person to type `remove the tutorial message`; `App.test.tsx` checks its four steps. The `WONG-STACK` block already makes a plain request run the loop with two stops: at the plan's review link ("build it now?") and after the preview ("publish it?"). So the teaching only needs the request to ask for explanations.

## Goals / Non-Goals

**Goals:**
- One copy and one paste start the first change.
- The agent explains each step because the message asks it to; nothing new is installed.
- The tutorial stays removable in one step, and an update never brings it back.

**Non-Goals:**
- No lessons, progress, or tutorial skill.
- No change to any verb or gate.

## Decisions

**The message is plain words.** `Remove the tutorial from my home page. Walk me through each step and explain what it does.` It is a constant in `Tutorial.tsx`, shown in a `<pre>`-like block (`<blockquote>` with `user-select: all` is fine) and copied as-is. A `/plan …` command was rejected: it stops after the plan and teaches a verb the person does not need to know.

**Copy uses the Clipboard API with a visible fallback.** `navigator.clipboard.writeText(message)`; on success the button reads `Copied` and stays so; on rejection or a missing API it reads `Select the message and copy it`. The button has `type="button"` and an `aria-live="polite"` status so screen readers hear the result.

**Tests move with the tutorial.** A new `Tutorial.test.tsx` covers the heading, the exact message, copy success, and copy failure (mocked clipboard rejecting, and absent). `App.test.tsx` keeps one check that the tutorial region comes before the app list. Deleting the tutorial deletes its test and leaves `App.test.tsx` passing once that one check goes too. Coverage stays at 100%.

**Setup points to the box.** `wong-setup/references/cloudflare.md` Step 5 ends on the URL and one line: open it and copy the message in the box at the top. That is "the one next command" the step already asks for.

**Sync keys on `<Tutorial />`.** The payload manifest's scaffold paragraph gains one sentence: copy or update `app/src/Tutorial.tsx` and `Tutorial.test.tsx` only when the target's `app/src/App.tsx` renders `<Tutorial />`; otherwise leave them missing and say so in one line of the plan. Preflight still reports them as `missing`; the sentence tells the planning agent not to add them. A preflight code path was rejected: sync already adapts scaffold files by judgment.

## Risks / Trade-offs

- **The agent explains too much or too little.** → The message asks for each step; the `WONG-STACK` voice rule keeps it short. Accepted: the words are cheap to tune later.
- **Clipboard blocked in some in-app browsers.** → The fallback text and selectable message cover it.

## UX

### Brief

- **Who:** a non-technical person who just finished setup and opened their site. Mirrors the current landing page.
- **Job:** make a first change and learn how changes work.
- **Done:** the change is live and the box is gone.
- **Context:** often a phone, beside the chat app. Common case: copy works. Edge: copy is blocked.
- **Frequency:** once per person.

### Flow

Open the site → press Copy → paste into chat → read the plan, say yes → try the link, say yes → reload: the box is gone.

### Hierarchy

The one primary action is Copy. The box lists no steps; the chat explains them. The app list stays below, unchanged.

### Components

- `Tutorial`: a `<section>` titled "Learn the development loop"; one intro line; the message block; and the Copy button with its live status.

### Review

[review.html](review.html) — What Changes item 1 sketches the landing page on a phone; item 2 draws the chat that follows.
