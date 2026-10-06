# A /dream skill that keeps the wiki current

**Status:** planned

**Branch:** wiki-update-frequency

**Open questions:** none

## Why

The wiki only updates when a chat notices something or is closed the proper way. A chat closed any other way leaves what it learned in memory, and a page nobody reads stays wrong. `/close` already moves one chat's facts onto the wiki; nothing does the same for everything else. A trial of a free nightly script on a small model showed the weak step is judging what is worth keeping, which is work for a capable assistant: the way Devin's makers do it.

## What Changes

- **You can type `/dream`.** Your assistant, on the model you already use, goes back over what memory has gained since the last dream and brings the wiki up to date. Nothing runs unless you ask.
  ```text
  /dream
     │
     ▼
  new facts ─┐
             ├▶ keep? ─▶ edit pages ─▶ checks ─▶ live
  old pages ─┘   │ no
                 ▼
          stays in memory
  ```
- **It tidies memory first.** Duplicate facts merge, a contradicted fact gives way to the newer one, and an answered open thread closes. The wiki is then updated from the tidied facts. Memory still tidies itself in the background between dreams.
- **It adds what is worth keeping.** Each new fact is tested by the wiki's own rule: will this help a future task that is not this one? Those that pass go on the page that owns them; the first fact on a new topic makes its page. The rest stay in memory.
- **It cleans up and removes discrepancies.** This is the main job. It re-reads your own pages against memory, the files they link to, and each other, longest unchecked first: all of them when there are twenty or fewer, else the twenty most overdue. It corrects what is out of date, merges duplicates, moves a fact to the page that owns it, fixes links, and keeps each hub listing its pages.
- **It checks the source before it changes a claim.** Before it replaces or removes a statement, it reads the chat the newer fact came from. A fact that was the assistant's reading of you, not your words, is not written as your preference.
- **It publishes through the normal checks**, the way `/close` does today, on GitHub or in your Cloudflare account. Then it tells you each page it changed and why.
- **It edits only a project's own pages.** People, the company, customers, the product, and in this repo the maintaining guides. It never rewrites a page WongStack ships. A discrepancy it finds on a shipped page goes in its report as a list, each with the page and the fact, so you can say *fix those* and they go out as a normal change.
- **You can look first.** `/dream --dry-run` lists the edits it would make and publishes nothing.
- **It never writes private things.** Chats marked private stay out, and so do health, family, and money.
- **`/close` uses the same rules.** What a chat's close puts on the wiki, and what a dream does, are judged one way, written once.

**Non-goals:** Running on a schedule or at the start of a chat (a follow-up once schedules in your Cloudflare account are published). A small free model. Rewriting pages WongStack ships. Checking pages against the whole project's code. Changing how memory's own tidy-up works or when it runs in the background. Adopting Agent Memory Repo's file layout.

## Capabilities

### New Capabilities

- `wiki-dream`: `/dream` tidies memory and brings an install's own wiki pages up to date from it on request: the memory tidy-up, what it reads, the keep test, the clean-up of old pages, source checks, which pages it may edit, how it publishes and reports, and the dry run.

### Modified Capabilities

None.

## Impact

- **New skill** `.agents/skills/dream/`: `SKILL.md` and one small script with its test. The rules for placing a fact on a page live on the dream's wiki page.
- **`/close`**: its *Update the wiki* step links the new reference for how to place a fact; what it gathers and how it publishes are unchanged.
- **Payload**: `payload-files.json`, the manifest, `areas.json`, the verb list in `AGENTS.md`, a `minor` changelog entry, and the skills' context baseline.
- **Wiki**: a new `wiki/development/wiki-dream.md`, linked from the development hub, `memory.md`, and the change loop's `/close` line.
- **No dependency on pull request #302.** Scheduling `/dream` through `/routine` is a later change.
- **Cost**: the person's own model allowance, only when they run it.

## Decision log

- **2026-10-05** — Asked what a dream should leave behind → chose that it publishes itself when the checks pass, over a change waiting for an OK or notes for the next chat.
- **2026-10-05** — Asked what it should look at → chose new memory plus a few of the least recently checked pages.
- **2026-10-05** — Asked what happens when Cloudflare's free AI allowance runs out mid-dream → chose to stop and carry on the next night; this applied to the nightly script and no longer applies.
- **2026-10-06** — Asked whether the dream should rewrite the pages WongStack ships → chose a project's own pages only; a fact that contradicts a shipped page becomes a note.
- **2026-10-06** — Asked about projects kept on Cloudflare instead of GitHub → answered "It's just a comit it should work on both".
- **2026-10-06** — Asked which model a nightly script should run on → chose to trial GLM 5.3 Flash and the full GLM 5.3 on the same pages.
- **2026-10-06** — Asked what to do while pull request #302 is still open → chose to run the writing trial at once.
- **2026-10-06** — Asked how to re-run the trial after its first run returned almost nothing → chose to run both models past the day's free allowance; it cost about 15 cents and is recorded in trial.md.
- **2026-10-06** — Asked what to do after the trial showed the small model adds too much → answered to rethink: look at how Devin's makers do it, and "maybe we just make a skill for dream first then we continue here".
- **2026-10-06** — Asked whether the plan should change from the nightly small-model script to a `/dream` skill on the person's own assistant → chose the skill; the script, its cap, its clock, and its dependency on #302 are dropped.
- **2026-10-06** — Asked when a dream should run before any cloud schedule exists → chose only when the person types `/dream`.
- **2026-10-06** — Asked whether to build → answered "I want it to like basically just remove discrepancies and clean up and make sure wiki is just up to date / organized"; the clean-up became the main job and covers every own page up to twenty a dream, not three.
- **2026-10-06** — Asked whether `/dream` should also tidy memory before it updates the wiki → chose yes: one verb for all knowledge upkeep, with `/improve` for the project itself.
- **2026-10-06** — Assumed: discrepancies on shipped pages are listed in the report, not edited, because the person chose own pages only and a shipped page's edit is a release that should go through the normal loop.
- **2026-10-06** — Assumed: `/dream` publishes with no closing question, because the person chose that a dream publishes itself and `/close` already publishes its wiki edits that way.
- **2026-10-06** — Assumed: the last dream is remembered as a memory fact, not a new table, because a fact needs no database change and the next dream only needs the date and the pages checked.
- **2026-10-06** — Assumed: a dry run is included, because the trial showed an over-eager edit to a person's page and looking first is how trust in it gets built.
- **2026-10-06** — Assumed: Agent Memory Repo's file layout is not adopted, because memory facts with their source chat, the digest, and the wiki already do the same jobs.
- **2026-10-06** — Assumed: `/dream` stops when the checkout holds unfinished work, because its edits must publish alone and `/close` keeps wiki edits apart from a change for the same reason.
- **2026-10-06** — Assumed: the rules for placing a fact live on the dream's wiki page, not in a skill file, because the skill text limit left about 1,370 bytes and the rules are repeatable knowledge about the wiki that `/close` and `/dream` both link.
