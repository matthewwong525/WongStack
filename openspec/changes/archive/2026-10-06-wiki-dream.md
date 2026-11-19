<!-- openspec-archive v1 2026-10-06-wiki-dream -->
<!-- file proposal.md utf8 9779 -->
# A /dream skill that keeps the wiki current

**Status:** ready-to-ship

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
- **2026-10-06** — Assumed: the skill file holds only the commands and their order, and the dream's wiki page owns how it adds, cleans, and checks sources, because bringing in the latest published version left the skills' text limit 499 bytes over.
- **2026-10-06** — Archive checkpoint: built, dry run recorded in trial.md, filed for publishing as 35.3.0.
- **2026-10-06** — Asked how to clear the skills' text limit once pull request #302 had published and left 29 bytes of room → answered "for dream can't we just make it so that it is only invokable by calling it. also we can do that for a couple other skills to save space no?"; `/dream` is call-only, and the assistant never starts it itself.
- **2026-10-06** — Check: `scripts/measure-context.mjs` no longer counts a call-only skill (`disable-model-invocation: true`) toward the instruction total or the session's start-up descriptions; it reports those files as `on-call`. The reason: no session loads a call-only skill's description and the assistant can not pull its text in on its own. This also frees about 150 start-up words and about 1,400 instruction bytes that the three existing call-only skills were counted for.
- **2026-10-06** — Assumed: no other skill is made call-only in this change, because `/wong-setup` and `/update-dependencies` are the only candidates and changing how they start belongs in its own change.
- **2026-10-06** — Assumed: with `/dream` counted apart, its skill file carries all ten steps again, because the earlier cut to commands only was made for the limit and not for the reader.

<!-- end proposal.md -->
<!-- file design.md utf8 9877 -->
# Design

## Context

See proposal.md for why. What shapes the approach:

- **`/dream` is call-only.** Its frontmatter carries `disable-model-invocation: true`, `AGENTS.md`'s verb list does not name it, and `measure-context.mjs` counts call-only skills as `on-call`, apart from the instruction total and the start-up descriptions.
- **`/close` already holds a one-chat dream.** Its *Update the wiki* step gathers a chat's and its change's facts with `memory.mjs show` and `search`, places each repeatable one by `.agents/rules/wiki.md`, and publishes the edits alone through `/ship` minus its closing question. A workspace closed any other way gets no wiki update.
- **Facts from unclosed chats are already in memory.** The background run captures sessions idle for an hour. So "everything since the last dream" is a memory search by date, with no transcript reading.
- **A fact has a source.** `memory.mjs source <fact-id>` prints the reduced chat behind it, and `areas <path>` prints the live facts and files linked to a page.
- **The trial (trial.md) located the weak step.** Two small models wrote faithfully and cheaply once their thinking was turned down, but sent nearly every feedback fact to its author's page, restated facts marked *Interpretation, not his words* as preferences, and one named a private downstream repo. Deciding what to keep needs judgment and source checks.
- **Cognition's Agent Memory Repo (published 2026-10-04) makes Dreaming a dedicated agent** with two jobs: add patterns found across sessions, and clean up by merging duplicates, removing outdated entries, and checking sources to settle contradictions. Its published skill ships no dreaming, schedule, or review step. Spec: https://github.com/AgentMemoryRepo/agentmemoryrepo
- **`payload-files.json` lists what WongStack ships** and is itself shipped, so every install can tell a shipped page from its own.
- **Skill text is budgeted.** `scripts/measure-context.mjs --check` caps the skills' instruction words, each save route, and the startup route (2,200 words: `AGENTS.md`, `wiki-style.md`, `voice.md`, and every skill description).

## Goals / Non-Goals

**Goals:**

- One written rule for placing a fact on a page, used by `/dream` and `/close`.
- Judgment stays with the assistant; listing, dating, and telling own pages from shipped ones is code.
- Nothing added to memory's tables, the app, or Cloudflare.

**Non-Goals:**

- A schedule, a hook, or a digest line. Scheduling is `/routine <when>: /dream` once #302 is published, planned then.
- Changing memory's own consolidation procedure or its background timing; `/dream` only runs it on request.
- Per-statement sources written into wiki pages.

## Decisions

### 1. A new skill, `.agents/skills/dream/`

| File | Job |
|---|---|
| `SKILL.md` | The verb: preconditions, gather, add, clean, publish, record, report. About 300 words. |
| `wiki/development/wiki-dream.md#placing-a-fact-on-a-page` | How a fact earns a place on a page. Owned on the wiki page, outside the skill folder, because the skills' instruction-byte cap had no room for a reference file; `/dream` and `/close` link it. |
| `scripts/dream.mjs` | Two read-only commands, below. |

*Alternatives:* a flag on `/close` (close ends the chat and closes the workspace, which a dream must not); a mode of `/improve` (that picks one improvement to the project, not upkeep of knowledge); a step in memory's background run (it may only call the memory script and write to a temp folder, so it cannot edit or publish a page).

### 2. What code does: `dream.mjs`

- `dream.mjs since` prints the last dream: the newest live `project` fact on slug `wiki-dream` tagged `dream`, as its date, the highest fact id it read, and the pages it checked. None → the date 30 days back, so a first dream is bounded. A fact counts as a dream only when its body starts `Dream <date>:`, because memory's upkeep also tags `dream` any fact that names the skill's folder.
- `dream.mjs pages` prints each wiki page as `own|shipped`, its word count, and when it was last checked: the newer of its last commit date and its last mention in a dream fact. Own pages are those `payload-files.json` does not list, by file or folder. Sorted longest unchecked first.

Both only read. They take `isMain` and `parseCli` from `memory/scripts/lib/cli.mjs`.

*Alternatives:* a table in the memory store (a migration and an admin step in every install, for one date and a short list); the assistant working out shipped pages by reading the manifest each time (slow, and a wrong guess edits a page an update will overwrite).

### 3. What the assistant does, in order

1. **Stop early.** Uncommitted edits, or a branch holding a change → edit nothing; say to run it from a clean checkout or a new workspace. `--dry-run` skips this stop. An unreachable memory store stops a dream too: it has nothing to read.
2. **Tidy memory.** Follow step 3 of the memory skill's *Background run* (list `live`, merge and supersede through the write gate, `retag` where it takes judgment, then `finish-run --kind consolidation`), without asking `due`. The procedure has one copy, in the memory skill; `/dream` links it. Recording the run resets the background clock, so the next background consolidation waits its usual day.
3. **Gather.** `dream.mjs since`, then `memory.mjs search --since <date> --limit 200` for `project`, `reference`, and `feedback` facts. Facts from private chats never appear: the store drops them at capture.
4. **Add.** For each fact, apply *Placing a fact on a page*. Edit the owning page in place, or make the page and its hub line.
5. **Clean.** The main job. Take the own pages from `dream.mjs pages`: all of them at twenty or fewer, else the first twenty. For each, read `memory.mjs areas <page>` and the files the page links to, and compare it with the other own pages; correct contradictions newest first, merge duplicates into the owning page, move a misplaced fact, fix links, and keep each hub listing its pages, by *Keeping it tidy* in `wiki/wiki-style.md`. A discrepancy found on a shipped page while doing this is listed, not edited.
6. **Check sources.** Before replacing or removing a statement, run `memory.mjs source <fact-id>` on the fact that contradicts it and read what was said.
7. **Publish.** No edit → skip. Else `git fetch origin main`, `git switch -c dream-<date> origin/main`, and invoke `/ship` minus its closing question, as `/close` does. `/ship` owns the route, so GitHub and Artifacts both work.
8. **Record.** Through the write gate: one `project` fact on slug `wiki-dream`, tagged `dream`, with the date, the highest fact id read, and the pages checked; and at most one `thread` tagged `improve` listing every shipped-page discrepancy with its page and fact.
9. **Report** in plain words: each page changed and the fact behind each edit, then the shipped-page discrepancies as a list the person can ask to have fixed, and facts skipped only by count.

`--dry-run` does gather, add, clean, and check sources without writing a file or tidying memory, prints the edits, and skips the stop, publish, and record steps.

### 4. *Placing a fact on a page* in `wiki/development/wiki-dream.md`: the keep test, sharpened by the trial

It links `wiki-style.md` for the rule and adds only what the trial showed goes wrong:

- **A preference is how a person wants work done, again and again.** A choice about one product feature is that change's decision and stays in its plan: *measure a speed-up before recommending it* is a preference; *Connect your assistant uses the app's login* is not.
- **An interpretation is not a quote.** A fact marked *Interpretation, not his words* goes on a page only when its source shows the person said as much, and then in their words.
- **One new line per idea, folded into the bullet that already owns it** where one does. A page that would grow by more than a third in one dream is a sign the test was too loose: re-apply it.
- **Never a private name.** No downstream repo, customer, or account detail the repo's own checks would refuse; no health, family, or money.
- **Already said is not new.** A fact the page states is skipped.

`/close`'s *Update the wiki* step swaps its inline *place each repeatable one by the wiki rules* for a link to this section, at no added words.

### 5. Wiring

By `wiki/maintaining/adding-a-skill.md`: `dream` joins `core.skillDirs` in `payload-files.json`; `areas.json` gains the `wiki-dream` spec and the skill folder; `AGENTS.md`'s verb list gains `/dream`. `wiki/development/wiki-dream.md` owns what a dream is, when to run one, the dry run, own and shipped pages, and how to undo one; linked from `wiki/development/README.md`, `memory.md`'s Consolidation section, and the change loop's `/close` bullet.

Release level `minor`. The **Updating.** note in plain words: you can now type `/dream` to bring your wiki up to date from what your chats learned; it runs only when you ask, and `/dream --dry-run` shows what it would change first.

## Risks / Trade-offs

- [It runs only when someone remembers] → the person chose this; the page says when a dream is worth running, and scheduling follows #302.
- [A capable model still over-adds to a person's page] → the sharpened test in Decision 4, the dry run, and the acceptance run in task 5.2 against the trial's known-bad edits.
- [A wrong edit publishes unread] → every edit names its fact in the report and the pull request, the wiki checks and the private-names test still gate it, and one dream is one commit to undo.
- [The skill text passes the context cap] → about 550 new words against about 1,350 of headroom measured on 2026-10-06; task 4.3 checks it and cuts in the dream's own files first.
- [A first dream reads a month of facts] → `since` bounds it to 30 days and `search` to 200 facts; the rest are named by count in the report.

<!-- end design.md -->
<!-- file tasks.md utf8 3087 -->
# Tasks

## 1. The script

- [x] 1.1 Write `.agents/skills/dream/scripts/dream.mjs` with `since` and `pages` by design Decision 2, and `scripts/tests/dream.test.mjs`: no earlier dream, an earlier dream fact, a page shipped by file, a page shipped by folder, an own page, and the longest-unchecked order. Done when the test file is written and reads correctly against the design.

## 2. The skill

- [x] 2.1 Write the *Placing a fact on a page* section of `wiki/development/wiki-dream.md` by design Decision 4, linking `wiki/wiki-style.md` for the rule and holding no second copy of it. Done when each of the trial's four faults in `trial.md` maps to one line in the section.
- [x] 2.2 Write `.agents/skills/dream/SKILL.md` by design Decision 3: frontmatter with a one-line description and `user-invocable: true`, the eight steps, and `--dry-run`. Done when every scenario in `specs/wiki-dream/spec.md` is covered by a step.
- [x] 2.3 In `.agents/skills/close/SKILL.md`, link `wiki/development/wiki-dream.md#placing-a-fact-on-a-page` from *Update the wiki* in place of the inline rule, adding no words. Done when the close skill's word count has not grown.

- [x] 2.4 Add the memory tidy-up as the dream's second step, linking the memory skill's consolidation procedure without copying it, and say so on `wiki/development/wiki-dream.md`, in `memory.md`'s Consolidation section, and in the changelog entry. Done when `node scripts/measure-context.mjs --check` passes and the wiki check passes.

## 3. Pages

- [x] 3.1 Write `wiki/development/wiki-dream.md` and link it from `wiki/development/README.md`, `wiki/development/memory.md`'s Consolidation section, and `/close`'s bullet in `wiki/development/the-change-loop.md`. Done when the page opens with a title and a sentence and each of the three pages links it.

## 4. Payload and release

- [x] 4.1 Add `dream` to `core.skillDirs` in `payload-files.json`, one line to the payload manifest, the skill folder and the `wiki-dream` spec to `areas.json`, and `/dream` to the verb list in `AGENTS.md`. Done when each file names it once.
- [x] 4.2 Add the `## Next (minor)` entry to `CHANGELOG.md` with the Updating note from design Decision 5. Done when the entry is at the top of the entries.
- [x] 4.3 Run `node scripts/measure-context.mjs --check` and, if it reports an `ISSUE:`, cut words in the dream's own files first. Done when it passes.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree`, which includes the script tests, the wiki check, the payload links, and the context cap, and fix what it finds. Done when it passes.
- [x] 5.2 Acceptance: run `/dream --dry-run` in this repo and read its edits against `trial.md`: the person page gains the lasting preferences and none of the product decisions, no interpretation is stated as a preference, no private name appears, every own page is re-checked, and shipped-page discrepancies are listed and not edited. Record the result in `trial.md`. Done when the dry run meets each point, or the fault is fixed in *Placing a fact on a page* and the run repeated.

<!-- end tasks.md -->
<!-- file specs/wiki-dream/spec.md utf8 4981 -->
# Spec Delta

## Purpose

`/dream` brings an install's own wiki pages up to date from memory when a person asks: it adds the repeatable facts memory has gained since the last dream, re-checks a few old pages, and publishes the result through the project's checks.

## ADDED Requirements

### Requirement: A dream tidies memory before it updates the wiki

A dream SHALL first consolidate the memory store, whenever it was last consolidated: facts that say the same thing merge, a contradicted fact is superseded by the newer one, and an answered open thread closes. The wiki SHALL then be updated only from live facts. On a teammate's key the tidy-up SHALL change only that installation's own facts.

#### Scenario: A contradicted fact does not reach the wiki

- **WHEN** two facts added since the last dream contradict each other
- **THEN** after the dream the older is superseded in memory and only the newer is on the wiki

### Requirement: A dream adds what memory has gained since the last one

When a person runs `/dream`, the assistant SHALL place each repeatable fact added to memory since the last dream on the wiki page that owns it, by the wiki's own rules, and SHALL leave every other fact in memory. A fact on a topic with no page SHALL make that page, linked from its hub.

#### Scenario: A lasting preference lands on its page

- **WHEN** a person stated a lasting preference about how work is done in a chat that was never closed with `/close`, and then runs `/dream`
- **THEN** the preference is on that person's page after the dream

#### Scenario: A one-off decision stays in memory

- **WHEN** a new fact records one change's decision, a date, or finished work
- **THEN** no page gains it

### Requirement: A dream removes discrepancies from the install's own pages

Each dream SHALL re-check the install's own pages, longest unchecked first and up to a stated limit, against live memory, the files each page links to, and each other. It SHALL correct what they contradict, merge duplicates, move a fact to the page that owns it, and leave every hub listing its pages.

#### Scenario: A stale statement is corrected

- **WHEN** a re-checked page states something a newer live fact contradicts
- **THEN** the dream replaces the statement with the newer fact

#### Scenario: Two pages disagree

- **WHEN** two own pages state the same thing differently
- **THEN** after the dream one page owns it and the other links there

### Requirement: A claim changes only after its source is read

Before a dream replaces or removes a statement already on a page, the assistant SHALL read the source of the fact that contradicts it. A fact recorded as the assistant's interpretation SHALL NOT be written as the person's own preference.

#### Scenario: An interpretation is not promoted

- **WHEN** a fact about a person is marked as an interpretation and not their words
- **THEN** the person's page does not state it as their preference

### Requirement: Pages WongStack ships are never edited

A dream SHALL edit only pages the install owns. A fact that belongs on or contradicts a page WongStack ships SHALL be listed in the dream's report and left as a note, each naming the page and the fact.

#### Scenario: A fact contradicts a shipped page

- **WHEN** a new fact contradicts a page WongStack ships
- **THEN** the page is unchanged and the dream's report and a memory thread name the page and the fact

### Requirement: A dream publishes alone, through the project's checks

A dream's edits SHALL be published apart from any other work, through the same checks as any wiki edit, on either delivery route, with no closing question. A checkout holding unfinished work SHALL stop the dream before it edits anything. The report SHALL name each page changed and the fact behind each edit.

#### Scenario: Unfinished work in the checkout

- **WHEN** `/dream` is run where a change is half built
- **THEN** it edits nothing and says where to run it instead

#### Scenario: Nothing to add

- **WHEN** no new fact passes the keep test and no re-checked page needs an edit
- **THEN** the dream publishes nothing, says so, and still counts as the last dream

### Requirement: A dry run shows the edits and publishes nothing

`/dream --dry-run` SHALL list each edit it would make with the fact behind it, and SHALL change no file, tidy no memory, publish nothing, and not count as the last dream.

#### Scenario: Looking first

- **WHEN** a person runs `/dream --dry-run`
- **THEN** they see the pages and edits, and the repository and memory are unchanged

### Requirement: A dream runs only when asked and keeps private things out

No dream SHALL run unless a person or a schedule they made invokes `/dream`. A dream SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki.

#### Scenario: An update arrives

- **WHEN** an install updates to a WongStack version that has `/dream` and nobody runs it
- **THEN** the wiki is unchanged

<!-- end specs/wiki-dream/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 43820 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-wiki-dream</title>
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
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-wiki-dream">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-wiki-dream</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The wiki only updates when a chat notices something or is closed the proper way. A chat closed any other way leaves what it learned in memory, and a page nobody reads stays wrong. <code>/close</code> already moves one chat's facts onto the wiki; nothing does the same for everything else. A trial of a free nightly script on a small model showed the weak step is judging what is worth keeping, which is work for a capable assistant: the way Devin's makers do it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>You can type <code>/dream</code>.</b> Your assistant, on the model you already use, goes back over what memory has gained since the last dream and brings the wiki up to date. Nothing runs unless you ask.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">/dream</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">   │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">   ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">new facts ─┐</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">           ├▶ keep? ─▶ edit pages ─▶ checks ─▶ live</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">old pages ─┘   │ no</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">               ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        stays in memory</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>It tidies memory first.</b> Duplicate facts merge, a contradicted fact gives way to the newer one, and an answered open thread closes. The wiki is then updated from the tidied facts. Memory still tidies itself in the background between dreams.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>It adds what is worth keeping.</b> Each new fact is tested by the wiki's own rule: will this help a future task that is not this one? Those that pass go on the page that owns them; the first fact on a new topic makes its page. The rest stay in memory.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>It cleans up and removes discrepancies.</b> This is the main job. It re-reads your own pages against memory, the files they link to, and each other, longest unchecked first: all of them when there are twenty or fewer, else the twenty most overdue. It corrects what is out of date, merges duplicates, moves a fact to the page that owns it, fixes links, and keeps each hub listing its pages.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>It checks the source before it changes a claim.</b> Before it replaces or removes a statement, it reads the chat the newer fact came from. A fact that was the assistant's reading of you, not your words, is not written as your preference.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>It publishes through the normal checks</b>, the way <code>/close</code> does today, on GitHub or in your Cloudflare account. Then it tells you each page it changed and why.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>It edits only a project's own pages.</b> People, the company, customers, the product, and in this repo the maintaining guides. It never rewrites a page WongStack ships. A discrepancy it finds on a shipped page goes in its report as a list, each with the page and the fact, so you can say <i>fix those</i> and they go out as a normal change.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>You can look first.</b> <code>/dream --dry-run</code> lists the edits it would make and publishes nothing.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>It never writes private things.</b> Chats marked private stay out, and so do health, family, and money.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b><code>/close</code> uses the same rules.</b> What a chat's close puts on the wiki, and what a dream does, are judged one way, written once.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Running on a schedule or at the start of a chat (a follow-up once schedules in your Cloudflare account are published). A small free model. Rewriting pages WongStack ships. Checking pages against the whole project's code. Changing how memory's own tidy-up works or when it runs in the background. Adopting Agent Memory Repo's file layout.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what a dream should leave behind → chose that it publishes itself when the checks pass, over a change waiting for an OK or notes for the next chat.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what it should look at → chose new memory plus a few of the least recently checked pages.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what happens when Cloudflare's free AI allowance runs out mid-dream → chose to stop and carry on the next night; this applied to the nightly script and no longer applies.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether the dream should rewrite the pages WongStack ships → chose a project's own pages only; a fact that contradicts a shipped page becomes a note.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked about projects kept on Cloudflare instead of GitHub → answered &quot;It's just a comit it should work on both&quot;.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked which model a nightly script should run on → chose to trial GLM 5.3 Flash and the full GLM 5.3 on the same pages.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do while pull request #302 is still open → chose to run the writing trial at once.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how to re-run the trial after its first run returned almost nothing → chose to run both models past the day's free allowance; it cost about 15 cents and is recorded in trial.md.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do after the trial showed the small model adds too much → answered to rethink: look at how Devin's makers do it, and &quot;maybe we just make a skill for dream first then we continue here&quot;.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether the plan should change from the nightly small-model script to a <code>/dream</code> skill on the person's own assistant → chose the skill; the script, its cap, its clock, and its dependency on #302 are dropped.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked when a dream should run before any cloud schedule exists → chose only when the person types <code>/dream</code>.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to build → answered &quot;I want it to like basically just remove discrepancies and clean up and make sure wiki is just up to date / organized&quot;; the clean-up became the main job and covers every own page up to twenty a dream, not three.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether <code>/dream</code> should also tidy memory before it updates the wiki → chose yes: one verb for all knowledge upkeep, with <code>/improve</code> for the project itself.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: discrepancies on shipped pages are listed in the report, not edited, because the person chose own pages only and a shipped page's edit is a release that should go through the normal loop.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: <code>/dream</code> publishes with no closing question, because the person chose that a dream publishes itself and <code>/close</code> already publishes its wiki edits that way.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the last dream is remembered as a memory fact, not a new table, because a fact needs no database change and the next dream only needs the date and the pages checked.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a dry run is included, because the trial showed an over-eager edit to a person's page and looking first is how trust in it gets built.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: Agent Memory Repo's file layout is not adopted, because memory facts with their source chat, the digest, and the wiki already do the same jobs.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: <code>/dream</code> stops when the checkout holds unfinished work, because its edits must publish alone and <code>/close</code> keeps wiki edits apart from a change for the same reason.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the rules for placing a fact live on the dream's wiki page, not in a skill file, because the skill text limit left about 1,370 bytes and the rules are repeatable knowledge about the wiki that <code>/close</code> and <code>/dream</code> both link.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the skill file holds only the commands and their order, and the dream's wiki page owns how it adds, cleans, and checks sources, because bringing in the latest published version left the skills' text limit 499 bytes over.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: built, dry run recorded in trial.md, filed for publishing as 35.3.0.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how to clear the skills' text limit once pull request #302 had published and left 29 bytes of room → answered &quot;for dream can't we just make it so that it is only invokable by calling it. also we can do that for a couple other skills to save space no?&quot;; <code>/dream</code> is call-only, and the assistant never starts it itself.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>scripts/measure-context.mjs</code> no longer counts a call-only skill (<code>disable-model-invocation: true</code>) toward the instruction total or the session's start-up descriptions; it reports those files as <code>on-call</code>. The reason: no session loads a call-only skill's description and the assistant can not pull its text in on its own. This also frees about 150 start-up words and about 1,400 instruction bytes that the three existing call-only skills were counted for.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: no other skill is made call-only in this change, because <code>/wong-setup</code> and <code>/update-dependencies</code> are the only candidates and changing how they start belongs in its own change.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: with <code>/dream</code> counted apart, its skill file carries all ten steps again, because the earlier cut to commands only was made for the limit and not for the reader.</li>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
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
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
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
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file trial.md utf8 8102 -->
# Trial record

These two runs tested a nightly script on a small model, the plan's first shape. They are why the plan became a `/dream` skill on the person's own assistant: the small models wrote well and cheaply but judged poorly what was worth keeping.

## Writing trial, first run (2026-10-06): no verdict on writing, a clear one on cost

Task 1.2, run ahead of task 1.1 at the person's choice. Both models through the Workers AI REST API on account ending `d442`, with the prompts of design Decision 4, 60 recent live facts, and this repo's 10 own pages. The run was capped at 9,000 neurons and stopped there.

| Step | Model | Tokens in | Tokens out | Neurons | Seconds | Answer |
|---|---|---|---|---|---|---|
| Place 60 facts | `@cf/zai-org/glm-5.3-flash` | 10,085 | 8,000 (limit) | 501 | 170 | none: the limit was reached while thinking |
| Place 60 facts | `@cf/zai-org/glm-5.3` | 10,085 | 8,000 (limit) | 4,484 | 86 | none: same |
| Rewrite `maintaining/README.md` | flash, whole page | 2,906 | 9,000 (limit) | 449 | 192 | none: same |
| Rewrite `maintaining/README.md` | full, changed lines | 2,945 | 5,000 (limit) | 2,375 | 46 | none: same |
| Rewrite `maintaining/adding-a-skill.md` | flash | 3,170 | 1,126 | 94 | 25 | `UNCHANGED` |
| Rewrite `maintaining/adding-a-skill.md` | full | 3,209 | 2,962 | 1,593 | 35 | `{"edits": []}` |

Total 9,496 neurons: 496 over the run's cap, because the cap was checked before each call and not against the call's own cost.

**What it shows.**

- **Both models think before they answer, and thinking is billed as output.** Each answer carried 4,000 to 39,000 characters of reasoning. Four of six calls spent their whole output limit thinking and returned nothing.
- **The plan's cost figures were wrong.** They counted the page and the answer, not the thinking. An answer of one word cost 94 neurons on Flash and 1,593 on the full model, against the planned 300 and 950 for a real edit.
- **The full GLM 5.3 does not fit the free allowance as called here.** Six no-edit answers would spend a day's 10,000 neurons.
- **Nothing is known yet about writing quality.** No page was rewritten. The two `unchanged` answers were given facts found by keyword, not placed facts, so they prove little.
- **The response reports its own neurons** (`usage.neurons`), so the dream needs no rate table.

**Thinking switches, one tiny question each on Flash (too few to conclude):** no parameter removed the reasoning. `reasoning_effort: "low"` gave the shortest (21 characters against 116 with none set); `chat_template_kwargs.enable_thinking: false` gave the longest and no answer.

**Before the next run:** set `reasoning_effort: "low"` and measure it on the real prompts; place facts ten at a time, not sixty; raise the output limit so a call that thinks still answers; count a call's cost against the cap before it is sent, from the last call of its kind.

## Writing trial, second run (2026-10-06): Flash is cheap and safe but over-eager; the full model is richer, dearer, and leaked a private name

Same prompts, facts, and pages, with `reasoning_effort: "low"`, facts placed ten at a time, and larger output limits. The person chose to run it past the day's free allowance. 38 calls, 13,900 neurons, about 15 cents; every call finished.

| Step | GLM 5.3 Flash (whole page) | GLM 5.3 (changed lines) |
|---|---|---|
| Place 10 facts | 90 neurons, 10 s | 735 neurons, 11 s |
| Rewrite one page | 56 on average, 121 at most, 6 s | 439 on average, 924 at most, 13 s |
| Re-check one page with its linked files | 142, 10 s | 1,189, 15 s |
| A night of 100 facts, 10 pages, 3 re-checks | about 1,900 | about 15,300 |

**Thinking.** `reasoning_effort: "low"` cut reasoning from thousands of characters to under a thousand on every call.

**Placing 60 facts.** Both returned valid JSON for every batch and agreed on 54 of 60. Flash: 38 `none`, 15 on `wiki/people/matthew-wong.md`, 6 on shipped pages, 1 on an own hub. Full: 39 `none`, 16 on the person page, 4 on shipped pages, and 1 new own page for the repo's Cloudflare addresses.

**Rewriting 10 own pages.**

| | Flash | Full |
|---|---|---|
| Pages changed | 2 | 4 |
| Pages left unchanged | 8 | 6 |
| Passed the wiki check | all | all |
| Changed-line edits that landed in exactly one place | n/a | all 8 |
| Sentences with no fact behind them | none found | none found |
| Private detail | none | none in rewrites |

**Re-checking 3 pages.** Flash: one sound addition, two unchanged. Full: four additions, of which one named a private downstream repo and its database on a public page (the repo's private-names test would have failed the change), and one carried no fact id.

**Against the bar.**

- **Flash: safe, not yet publishable unread.** Nothing invented, quotes kept exact, voice matched. Its one large edit, the person page, went from 478 to 912 words in a night: ten new bullets from twelve facts, about four of them one change's product decisions and not lasting preferences. It restated two facts marked *Interpretation, not his words* as his preference, and put blank lines between list items where the page has none.
- **Full: better edits, fails the bar.** It merged into existing bullets, kept the page's format, and found more real additions on the maintaining pages. It also leaked the private name above, rewrote one sentence no fact contradicted, and costs eight times as much: a night does not fit the free allowance.

**The weak step is deciding what is worth keeping, on both models,** not the writing. Placing sent nearly every feedback fact to its author's page.

**Not run:** a new page and its hub line; a page near the 3,000-word limit; facts by more than one author.

## Acceptance: `/dream --dry-run` on the person's own assistant (2026-10-06)

Task 5.2, run in this repo by the steps of `.agents/skills/dream/SKILL.md`. No file, publish, or memory write.

**Gathered.** No earlier dream, so facts from 2026-09-06: 29 feedback, 32 reference, and 200 project facts (the search limit). The feedback and reference facts were each judged; the project facts were not read one by one in this run. `dream.mjs pages` listed 12 own pages and 37 shipped.

**Edits it would make, own pages.**

| Page | Edit | Fact |
|---|---|---|
| `wiki/people/matthew-wong.md` | The staging bullet gains its exception: memory and kept pictures stay live-only | #1054; source read: *staging doesn't need memory and kept pictures that's fine* |
| same | New bullet: ask in the chat; a private form only for sensitive things, and one form, not two | #1108, #1116, both his words |
| same | New bullet: a step handed back to the person comes with numbered steps and links | #1088, his words |
| same | New bullet: one ready draft to react to, not a menu | #900; source read: *why is this so much work* |
| same | The stray blank lines between bullets go | format |
| `wiki/maintaining/adding-a-skill.md` | A step for the text budget and the spec's area, which this build hit and the page does not name | this change's own build |

**Left in memory, from the same 29 feedback facts:** 8 product decisions (#1132, #1133, #1109, #1092, #1091, #1089, #1077, #1075), 11 interpretations his words do not carry (#1093, #1110, #1161, #1150, #1156, #1041, #999, #993, #939, #908, #1017), and 5 the page already says (#1011, #1010, #1074, #1076, #934 in part).

**Shipped pages, listed and not edited.** `wiki/development/required-tools.md` does not say *download a tool only when a task needs it, never during setup* (#934). `wiki/stack/cloudflare-credentials.md` does not say the user token can mint a short-lived token for a permission it lacks (#957).

**The other ten own pages:** read against their linked files and each other; no discrepancy found.

**Against the trial's faults.** The person page would grow from 478 to about 600 words, not 912; no product decision and no interpretation is written as a preference; no private name appears; every own page was read.

**Limit of this run.** The 200 project facts were not judged, so a first real dream will take longer and may find more for the maintaining pages.

<!-- end trial.md -->
