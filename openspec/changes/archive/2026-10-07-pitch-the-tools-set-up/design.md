# Design

## Context

See proposal.md - Why. What shapes the approach:

- The moving headline existed until `00383322` as `site/src/Rotator.tsx` plus `.rotator*` rules in `site/src/index.css`; `git show 00383322^:site/src/Rotator.tsx` and `git show 00383322^:site/src/index.css` hold both. It also loaded three lookalike fonts, and `Site.test.tsx` now asserts the styles load no file.
- `site/src/install.ts` owns every word about installing, and `AGENTS` there already lists Claude Code and Codex with links. [The landing page guide](../../../wiki/maintaining/landing-page.md) says no other file under `site/src/` names an account, a system, a cost, or the message.
- What is true today: `.claude` and `.codex` both point at `.agents`, so one folder of skills serves both; memory loads by itself in Claude Code and Codex; another assistant reads the same files and looks memory up when asked ([README](../../../README.md#what-i-use)). Grok works only as a model for scheduled jobs (`scripts/routine-runner/models.mjs`).
- `install-onboarding` requires the README to name an assistant only after neutral wording, and `open-source-release` requires its first screen to say whose way of using AI this is. Neither changes.
- `wiki/maintaining/**` ships, so editing the guide is a release.

## Goals / Non-Goals

**Goals:**

- One source for the names the headline slides through, so adding Grok later is one entry.
- Every claim on the page true on the day it publishes.

**Non-Goals:**

- No new font, picture, or dependency.
- No change to `install.ts`'s message, steps, accounts, or costs.

## Decisions

1. **Restore `Rotator.tsx`, fed from `install.ts`'s `AGENTS`.** The headline reads a window that slides through the names, each with its logo, above the fixed line "for people who don't code." The window keeps one fixed height so the line under it never jumps. Give each `AGENTS` entry a `logo` (`claude`, `openai`) so the headline, the install step, and the works-with section read one list. The hidden screen-reader sentence is built from the same list: "Claude Code or Codex, for people who don't code." *Over a hard-coded list in the component:* the guide's rule that only `install.ts` names an assistant stays true, and the spec's scenario (headline names only what the install steps name) holds by construction.
2. **Two names, no lookalike fonts.** Rows are the names plus the first again for a seamless loop; the keyframes are generated for the row count in CSS by hand (two stops, then the wrap), with `prefers-reduced-motion` stopping on the first. The names use the page's font. *Over restoring the three font files:* the no-file assertion stays, and a brand font per tool does not scale to a growing list.
3. **A works-with section replaces the comparison.** New `WorksWith` component in `Landing.tsx`'s place for `<Compare />`, heading "Works with the AI you already use". One card per `AGENTS` entry saying what is set up for it (skills, memory that loads by itself), one card "Another assistant" with its limit (reads the same files, looks memory up when you ask), then one line: switch any time, and your skills, memory, and apps stay in your folder and accounts. Delete `Compare.tsx`, `compare.ts`, the `.compare` and `.legend` styles nothing else uses, and the logos nothing loads afterwards (`grok`, `meta`, `openclaw`, `lovable`). *Over keeping the table lower on the page:* Matthew chose the swap, and a table of rivals is the "alternative to Muse" reading this change removes.
4. **Copy.** `HEADLINE` becomes the fixed line, "for people who don't code."; `DESCRIPTION` becomes: "The most powerful AI tools, set up for your business, with security built in. Open source, and everything it builds and learns stays in accounts you own." The shared-link line: "Claude Code and Codex, for people who don't code. Set up for your business, in accounts you own. Free and open source." The share picture's three headline lines read "Claude Code and Codex, / for people who / don't code." over "In accounts you own." The hero's Supports row, the points, the questions, and the closing band keep their text; the closing band prints the new `DESCRIPTION`.
5. **README opening.** Replace the first paragraph and the "one place to do four things" lead-in with: a bold first sentence, "The most powerful AI tools, such as Claude Code and Codex, for people who don't code."; one sentence on the gap (out of the box nothing is set up for a business: nowhere to put an app, no memory between chats, no safe place for a key); one saying WongStack is that setup, open source, yours to use and change, with everything it builds and learns in accounts you own; then "With it, your assistant can:" above the four unchanged bullets. No developer term, per `open-source-release`.
6. **The guide.** In `wiki/maintaining/landing-page.md`, the fourth install rule's last sentence becomes: the headline and shared-link text name only assistants in `AGENTS`, each one tried as a working assistant first. The pictures list drops the comparison-table bullet. One sentence under the rules says the site compares WongStack with no other product, and why: a wrong claim about another company's product is a liability.

## UX

### Use-case brief

A business owner who already uses AI, perhaps trying Claude Code or Codex, lands from a shared link, mostly on a phone. The job: tell in one screen whether this helps with the tool they have, then install. Done is pressing *Install for free*. Common case: they use one of the two named tools. Edge case: they use another assistant, and must still see it works. Assumed: most visits are a first visit. Mirrors the hero as it was before `00383322`.

### Flow

Headline with their tool's name → one line on what WongStack is → *Install for free*. A visitor on another assistant scrolls to the works-with section, reads its card, and returns to the same button.

### Hierarchy

- Hero: the headline is the one loud element; *Install for free* is the one primary action; the Supports row and GitHub link stay quiet.
- Works-with section: the tool cards are equal; the switch line is quieter; *Install for free* closes it.

### Review

[review.html](review.html) sketches the hero in the first What Changes item and the works-with section in the third.

### Components

Existing: `InstallButton`, the `band`, `grid`, `card`, `lede`, and `note` styles. Restored: `Rotator`. New: `WorksWith`, a grid of cards, because no existing section lists the assistants with what each gets.

## Risks / Trade-offs

- [The claim "for people who don't code" overpromises] → the page already answers *Do I need to know how to code?* with no, and says what you do by hand; keep that answer and the install steps beside it.
- [Two names slide less smoothly than three] → look at the preview at phone and desktop width before publishing; the timing is one CSS block.
- [Naming two tools in the headline turns away a visitor on a third] → the works-with section and the install step both say any assistant works.
- [A later change adds a name that was never tried] → the spec scenario and the guide's rule both require a tried assistant, and the headline reads `AGENTS`, where the install step would expose it.
- [A long name wraps the headline on a narrow phone] → rows keep `white-space: nowrap`; check the 320 px width in the preview.
