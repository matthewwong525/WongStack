# Shorter instructions, the same rules

**Status:** in-progress
**Branch:** jazzy-horse
**Open questions:** none

## Why

Every chat starts by reading about 3,600 words of instructions before you say anything, and each step of building something (planning, saving, publishing) reads 1,300 to 3,800 more. Long rulebooks cost money on every chat and get skimmed, so rules get missed. A peer review flagged it, and the people WongStack is for — business owners using AI across their whole business — should not pay for words that do no work.

## What Changes

- **Every chat starts lighter.** The main instructions, the wiki style and voice pages, and the one-line skill summaries shrink from about 3,600 words to at most 2,200. The style and voice pages still load in every chat, as you chose before; they just say it in fewer words.
  ```text
  Words read before you type
  before ████████████████████ 3,600
  after  ████████████         2,200
  ```
- **Each step reads less.** The page that explains how a change moves from idea to live (about 3,450 words, pointed to from 25 places) drops to about 2,000. The step-by-step instructions for each command drop by about a quarter in total: repeats are merged into one place, and the rest link to it.
- **No rule is dropped.** Only wording changes. Every rule in the old text is listed in the plan with where it now lives, so a reviewer can check nothing fell out. Commands, names, and section links stay the same, so links from your own pages keep working.
- **The saving is measured, and it stays.** A before-and-after count shows this change's own effect, not an old one. The start-up load gets a ceiling, and the automatic checks fail if a later change pushes past it.

Non-goals: no rule is removed or changed; the memory digest shown at the start of each chat is left to the memory work; the vendored browser skill and all scripts are untouched; how updates handle an install months behind is planned in its own workspace.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `context-economy`: the measurement covers the start-up load (block, style and voice pages, skill descriptions) and every WongStack-authored skill, compares against the change's own starting point, and holds the start-up load under a ceiling; a trim that claims to keep every rule shows where each one went.

## Impact

- `AGENTS.md` (the `WONG-STACK` block and the meta-repo half), `wiki/wiki-style.md`, `wiki/voice.md`, and every WongStack-authored skill's `description:`.
- `wiki/development/the-change-loop.md`, and every `SKILL.md` and `references/*.md` under `.agents/skills/` except `agent-browser`. Scripts are not edited.
- `scripts/measure-context.mjs`, `scripts/fixtures/context-baseline.json`, `scripts/tests/context-measurement.test.mjs`; `.github/workflows/payload.yml` already runs `--check`.
- A `rule-map.md` in this change's folder: every rule, old place → new place.
- Installed repos: `/wong-sync` brings the shorter text; a file adapted locally shows as a conflict, as it did for 25.17.0.
- A `## Next (minor)` `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked how hard to cut → chose cut words and keep every rule: merge repeats, shorten wording, move rare cases to pages read only when needed; no behavior changes.
- **2026-09-27** — Asked whether the wiki style and voice pages should keep loading in every chat → chose keep them loaded and shorten them, as decided on 2026-09-02.
- **2026-09-27** — Asked how to prove the shorter text still works → chose before/after word counts plus a map of every rule to its new line; no live side-by-side runs.
- **2026-09-27** — Asked where the check of months-behind, heavily customized updates goes → chose its own new workspace, "Update check for months-behind installs".
- **2026-09-27** — Assumed: "always loaded" means what each chat reads before the first message (the `WONG-STACK` block and meta half of `AGENTS.md`, the `@`-imported `wiki-style.md` and `voice.md`, and skill descriptions), about 3,615 words, because the peer review's ~70k "skills" figure counts scripts (about 45k words), which load only when a step runs them.
- **2026-09-27** — Assumed: the memory digest (~800 words) is out of scope, because the `memory` capability already bounds it and the "Memory security" workspace is changing the memory scripts.
- **2026-09-27** — Assumed: targets of ≤2,200 start-up words, ≤2,000 for the change-loop page, and about −23% (27,385 → ≤21,000) across authored skill Markdown, because 25.17.0 already cut the skills 14–24% without changing a rule, so the start-up load and the change-loop page hold most of what is left.
- **2026-09-27** — Assumed: every heading another file links to keeps its exact text, because installed repos' own pages may link those anchors and the payload link check does not verify anchors in shipped files.
- **2026-09-27** — Assumed: the measurement is re-baselined at this change's starting commit (`1f41711`), because a baseline from an older commit reports earlier changes' savings as this one's (it misled PR #97).
- **2026-09-27** — Assumed: the start-up ceiling is enforced by `measure-context.mjs --check` in CI, because a repeated check belongs in code, not in a reviewer's memory.
- **2026-09-27** — Assumed: a minor release, because nothing an installed repo relies on changes, but every skill file and three wiki pages arrive rewritten.
- **2026-09-27** — Asked at the review link whether to build → chose build (`/apply`).
- **2026-09-27** — Before number, from `node scripts/measure-context.mjs --check` right after `--write-baseline` at `1f41711`: start-up 3,601 words (22,717 bytes; ceiling 2,200); authored skill instructions 27,084 words; owner pages 12,054; skill descriptions 646; `active-save` route 5,773; `cold-resume` 6,577; `new-plan-save` 8,945. The plan's 3,615 counted the `description:` keys; the script counts values only.
- **2026-09-27** — Assumed: the four rules the block shares with the style and voice pages (name git, OpenSpec, or CI only when asked; keep code and quotations exact; the repeatable-knowledge test; a change's specifics stay in its proposal) stay in the `WONG-STACK` block, because Codex reads only `AGENTS.md` and loads those two pages only when editing `wiki/`. The style and voice pages link to the block for them instead.
- **2026-09-27** — After number: start-up 2,199 words (ceiling 2,200; −39%): `AGENTS.md` 905 → 695, `wiki-style.md` 1,709 → 857, `voice.md` 341 → 257, descriptions 646 → 390 (the vendored `agent-browser` description, about 140 words, is untouched).
- **2026-09-27** — Shortfall: `wiki/development/the-change-loop.md` is 3,447 → 2,537 words (−26%), not ≤ 2,000. What is left is doctrine a verb acts on (the gate, the loosened-check list, the offer rules, the chain of verbs), and every linked heading stays. Reaching 2,000 would mean moving that doctrine out of its owner page, which the design keeps as the one owner.
- **2026-09-27** — Shortfall: authored skill Markdown is 27,385 → 24,844 words (−9%), not ≤ 21,000. 25.17.0 already cut these files 14–24%, so most sentences are one rule, flag, or command each; about 2,400 words are fenced code, tables tests read, or templates, which stay byte-exact. Six helpers trimmed a skill group each and stopped short rather than drop a rule; a review pass per group then restored eight narrowed rules (credential checks in `/save`, a heal report on every `/verify` verdict, `/ship`'s omit-`--branch` on `main`, and others, each noted in `rule-map.md`).
- **2026-09-27** — Saved inside `/ship` for task 6.4 (the CI gate); main's 26.12.0–26.13.0 are merged after this checkpoint, then the overlapping files are re-trimmed.
