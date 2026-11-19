<!-- openspec-archive v1 2026-11-12-automatic-memory-tidy -->
<!-- file proposal.md utf8 20617 -->
# Memory cleans itself each day, with no command to type

**Status:** ready-to-ship
**Branch:** remove-dream-memory-tidy-up
**Open questions:** none

## Why

Memory has two clean-ups. The daily tidy starts by itself, but it checks only a small part: three pages and one spec a day. The full check runs only when a person types `/memory:dream-memory`, and most people never do. Both follow a fixed checklist with fixed counts, so the tidy does the same steps each day, whatever memory needs. Memory also does not know which facts a chat uses, or which question found nothing. Today 26 labels hold facts but have no page, and 7 topics hold over 100 facts each, too many to read in one look. No step of the checklist fixes that.

## What Changes

- **The tidy gets a goal and a map, not a checklist.** The goal: a chat that looks up a topic gets what is true, fast. Plain code makes a map of where memory is weak. The AI reads the map and decides what to fix, weakest first, for as long as its time allows. It has no numbered steps and no fixed counts. Fixed rules stay only for what must never happen: no edit to a page WongStack ships, a spec, or a plan; no saved fact edited or deleted; private things stay out.
  | The map shows | In this project today |
  |---|---|
  | Labels that hold facts but have no page | 26, used about 270 times |
  | Topics too big to read in one look | 7, the largest holds 220 facts |
  | Facts with no topic | counted at the build |
  | Facts that name a file that is gone | 10 |
  | Your pages not checked this week | 2 of 27 |
  | New facts since the last tidy | counted each day |
  | Notes that say memory misled a chat | read first |
  | How memory was used | new, see the next part |

- **Memory counts how it is used, and the tidy reads the counts.** Each time a chat looks something up, plain code counts it on your computer: the topic it asked for, the facts that came back, and a question that found nothing. A question also counts as finding nothing when no fact or page that came back holds most of its main words: a search always returns something, and unrelated facts are not an answer. The tidy's map shows the counts, so the tidy works where it helps most. A count never removes a fact: a fact nobody used stays where a search finds it. Ask any chat *how is memory used?* to see them.
  | The counts show | What the tidy does |
  |---|---|
  | A question that found nothing | Fixes the topic, the label, or the page's words, so the question finds its answer |
  | The topics used most | Checks their pages first and keeps them short |
  | A fact that comes back again and again | Puts it on its topic's page |
  | A topic too big to read, where chats use only a part | Splits it into smaller topics, the used part first |
  | Two topics used in the same chats | Links their pages |

- **It does the full job, every day.** Your first chat each day still starts it in the background, and the chat never waits. A page checked or changed in the last 7 days is not on the map, so the tidy does not read it again. A full day costs about what one long chat costs on your AI plan.
  | Each day | Today | After |
  |---|---|---|
  | Your own pages checked | 3 | the most overdue first, as time allows |
  | Facts that name a file that is gone | up to 10 | every one is corrected |
  | New facts read for the wiki | the first 200 of each kind | every one |
  | Labels with no page, topics too big | not looked at | fixed where the map shows them |
  | Questions that found nothing | not known | fixed, then asked again |

- **It finishes the job and brings you no decision.** The tidy fixes what it may fix: your own pages, saved facts, labels, and topics. It leaves the rest alone and says nothing. It makes no list for you, and the chat start shows only what it did. A thing it looked at and left stays off its map for 7 days, so it does not look again each day. So it no longer compares specs with the code or looks for plans left behind: it may not change those. It still reads them as evidence when it checks a page.

- **It shows that memory got better.** Code makes the map again when the tidy ends, and asks again each question that found nothing. The chat start shows what changed.
  ```text
  Last tidy (2026-11-13 on laptop):
    pages 6, links 3
    labels with no page 26 -> 19
    facts with no topic 140 -> 60
    questions with no answer 6 -> 1
  ```

- **It keeps what it finished when its time ends.** The tidy may now work for 60 minutes, not 30. Today a tidy that reaches its limit throws away every page edit. Now it publishes each part it finished, and the next day starts with the rest.
  ```mermaid
  flowchart TD
    A["Time limit reached"] --> B["Finished pages: published"]
    A --> C["Half-made page: thrown away"]
    C --> D["Still on tomorrow's map"]
  ```

- **BREAKING: the command `/memory:dream-memory` goes away.** Nobody needs it: the daily tidy does its work. Its look-first mode goes with it. You still ask any chat in plain words.
  | You want | You say |
  |---|---|
  | A full tidy at once | *tidy memory now* |
  | The last tidy and what it changed | *when did memory last tidy?* |
  | How memory is used | *how is memory used?* |
  | No tidy on this computer | *stop the daily memory tidy* |
  | To take back a tidy | *undo the last tidy* |

**Non-goals:** no change to how a chat is saved when it ends, to `/close`, to who sees which fact, to the off switch, or to one tidy a day for each person. No schedule and no page in the app. The counts stay on each computer: nothing new is saved in the shared store. The page's address, the spec's name, and the memory tag keep the word *dream*.

## What the build needs

- **Nothing.** At the end of the build the AI runs one full tidy for real in this project, on your AI plan, and times it.

## Decision log

- **2026-11-12** — Asked why the full check still exists beside the daily tidy → chose: the daily tidy does the full check, the command is removed, and clean-up is automatic with nothing to call.
- **2026-11-12** — Assumed: no question before drafting, because Matthew gave the design to the plan (*think of how to make it so*) and no open choice makes the plan wrong.
- **2026-11-12** — Assumed: this replaces the 2026-11-03 choice of small daily clean-ups and the 2026-11-11 limit of three pages and one spec, because Matthew now asks for the full check each day.
- **2026-11-12** — Asked what matters most for the tidy → chose: it works well and keeps memory structured for better retrieval; cost is not a concern unless it is ridiculous.
- **2026-11-12** — Assumed: the tidy gets a goal, a map made by plain code, and a short list of things it must never do, in place of numbered steps and fixed counts, because Matthew found the steps too prescriptive and asked for a better way.
- **2026-11-12** — Assumed: the map measures structure a search depends on (facts with no topic, labels with no page, topics over 100 facts, files that are gone, overdue pages), because those are countable by code and each one hides facts from a chat.
- **2026-11-12** — Asked if the tidy should bring a person the things it may not fix → chose: no; it finishes the job and leaves alone what it can't settle.
- **2026-11-12** — Assumed: the tidy no longer compares specs with the code or looks for plans left behind, because it may not change them and nobody is to be told; it still reads them as evidence.
- **2026-11-12** — Asked if memory should count how it is used, to inform the next tidy → chose: yes; the plan did not have it.
- **2026-11-12** — Assumed: the counts stay in a file on each computer, with no change to the shared store, because the tidy runs on the computer where the chats ran; the limit is that a person with two computers gets a tidy that sees one computer's counts.
- **2026-11-12** — Assumed: the counts hold topic names and fact numbers, and the words only of a question that found nothing, kept 30 days, because the tidy needs those words to fix the gap and nothing else needs words.
- **2026-11-12** — Assumed: look-ups by the tidy and by background runs are not counted, because only a chat's use says what people need.
- **2026-11-12** — Assumed: a count tells the tidy where to work and never lets it hide a fact, because a question asked once a year still needs its answer.
- **2026-11-12** — Assumed: a thing the tidy looked at and left alone stays off the map for 7 days, as a checked page does, because a tidy that brings no decision must not look at the same thing each day.
- **2026-11-12** — Assumed: the tidy still leaves a note for `/improve-code` when a page is right and the code is wrong, because that note goes to the code improver's next plan, not to a person as a question.
- **2026-11-12** — Assumed: the proof is the same map made again at the end, with each question that found nothing asked again by code, because a count shows structure and a real question shows that a chat can find the answer.
- **2026-11-12** — Assumed: no count limits a run; only the time limit does, and a page checked or changed in the last 7 days is left off the map, because cost is not the concern and a second look at yesterday's page finds nothing.
- **2026-11-12** — Assumed: the work limit is 60 minutes, because the full check must fit with the save of the day's chats before it; the build times one real run and records the number.
- **2026-11-12** — Assumed: a tidy stopped at its limit publishes the parts it finished, because a larger daily check reaches the limit more often and a thrown-away run helps nobody.
- **2026-11-12** — Assumed: the look-first mode goes with the command, because the tidy already publishes with no question and each tidy is one change that can be undone.
- **2026-11-12** — Assumed: plain code, not the AI, writes the tidy's record and its numbers, because the record decides where the next tidy starts and a count must be true.
- **2026-11-12** — Assumed: a schedule a person made to run the old command is deleted by that person, named in the update note, because a saved schedule's words are theirs.
- **2026-11-12** — Assumed: the page's address, the spec's name `wiki-dream`, and the memory tag `dream` stay, because no person types them and a new name breaks links in installed projects and in two open changes.
- **2026-11-12** — Assumed: the open changes *plugin-docs-stand-alone* and *self-contained-loop* edit the same instructions and spec; the one that publishes second adjusts to the first.
- **2026-11-12** — Assumed: the run makes the map itself, from the store the person's checkout names and the files of the throwaway copy, and stops as `failed` when no map can be made, because the tidy has no start without one.
- **2026-11-12** — Assumed: a step tag such as `dream` or `plan` is left off *tags with no page*, because a step is not a topic and needs no page.
- **2026-11-12** — Assumed: `related` counts only the topic asked for, and a pulled change counts no topic, because the other names are what memory offered, not what the chat needed.
- **2026-11-12** — Assumed: the run's note is plain-word lines of one fixed shape inside the store's 300 characters, and a reason of any other shape prints as before, because the chat-start line must tell a note from a failure's reason.
- **2026-11-12** — Assumed: the run asks at most 20 missed questions again, with `recall` in the copy, and counts the others as still missed, because a count that claims an answer nobody tested is false.
- **2026-11-12** — Assumed: a page the tidy changed counts as checked in the map made after it, because a new page otherwise shows as a new overdue page and the number rises.
- **2026-11-12** — Assumed: the Codex plugin manifest drops its `skills` key and the memory plugin becomes version 3.0.0, because its only inner skill is removed.
- **2026-11-12** — Assumed: `.agents/memory/profile.mjs` keeps the old command names in its `dream` step, because an old chat that ran the command must keep its tag; the payload file list and manifest needed no edit, because they name the plugin's folder, not its files.
- **2026-11-12** — Assumed: the example of a skill only a person starts, in `wiki/maintaining/adding-a-skill.md`, becomes `paste-this-into-your-ai`, because the old example is removed.
- **2026-11-12** — Assumed: the tests ran once at the end, not after each part, because the build writes all source and tests first.
- **2026-11-12** — Assumed: the page and the spec no longer say `/close` places facts by the tidy's rules, because the main branch removed that from `/close` after this branch started.
- **2026-11-12** — Assumed: `site/attachments/know-how.md` gets today's `checked:` date with no rewrite, because the edit to its source page changes a link's words and not the fix.
- **2026-11-12** — Check: the tests of `planDrift`, `dailyPages`, `pages --daily`, the spec rows, the plan lines, and the record file the AI wrote are removed with that code; the due list, map, `keep`, and record tests in `memory-tidy.test.mjs` and `memory-daily.test.mjs` replace them.
- **2026-11-12** — Check: the test *a tidy killed at its time limit throws its edits away and sends no record* is replaced by two: a tidy stopped with no `keep` still keeps nothing, and a tidy stopped after two `keep` calls publishes them. The second ends the stand-in by a signal, which the run reads as the time limit, because a real timeout between two calls is not reliable.

- **2026-11-12** — Built and saved: the script, the use counts, the run, the brief, the wiki, and the release note are written and their tests pass; the real tidy (tasks 6.1 and 6.2) and the full checks (6.3) are next.
- **2026-11-12** — Assumed: the real tidy of task 6.1 runs before the change is published, from a throwaway clone of the saved branch with publishing off, because the tidy's copy of the main branch does not hold the new brief until this change is live; its page edits are read and then join this change.
- **2026-11-12** — Assumed: task 6.1's *use memory for a day* is done as real look-ups made now with the new code, because the change is being published in this chat and the task needs real rows, not a day.
- **2026-11-12** — Assumed: the `knowledge-center` spec gets a small delta, because its catch-up requirement named the removed command beside the daily tidy.
- **2026-11-12** — Check: `scripts/tests/dream.test.mjs` is deleted because its script moved: `scripts/tests/memory-tidy.test.mjs` holds its tests for `since`, the pages list, the record, and gone files, and drops only the tests of code this change removes (`pages --daily`, the spec rows, the plan lines).
- **2026-11-12** — Assumed: a question also counts as finding nothing when no fact or page that came back holds at least half of its main words, because a real look-up here for an espresso machine returned five unrelated facts, so a count of empty answers alone would stay at zero.
- **2026-11-12** — Assumed: a look-up that counts as finding nothing keeps none of the facts or topics that came back, because unrelated facts would fill the map's *often returned* and *most used* lines.
- **2026-11-12** — Assumed: a short word matches its longer form, so *rule* finds *rules*, because the search matches word forms and plurals of four-letter words are common here.
- **2026-11-12** — Assumed: a run's lock is free at once when the process it names is gone, because the first real tidy here waited 30 minutes behind the lock of a run killed hours before and then gave up with no word; the longer 3-hour lock made that worse.
- **2026-11-12** — Assumed: a label or topic the tidy looked at and left keeps its place in the map's count and loses only its name, because the first real tidy showed *topics too big to read 1 -> 0* for a topic it had only looked at.
- **2026-11-12** — Assumed: the run tells the tidy how many minutes it has and not to end while the map shows work it may do, because the first real tidy ended after 6 minutes with 514 facts still without a topic.
- **2026-11-12** — Check: `scripts/measure-context.mjs` counts the tidy's brief and its fact-placing page (`references/tidy.md`, `references/placing-facts.md`) as on-call text, outside the instruction word limit, because only the unattended tidy reads them and the typed-only skill they replace was counted the same way.
- **2026-11-12** — Assumed: the fact-placing page that main moved into the removed skill's folder now sits beside the brief, and the brief links no wiki page, because main's newer rule fails a plugin link that leaves the plugin's folder.
- **2026-11-12** — Assumed: the run links the company pages into its copy, and the tidy saves a company page at once by itself, because the plan promises that a fact lands on its topic's page and the copy had no company page; the computer has one company copy, so the run can not hold such an edit back.
- **2026-11-12** — Assumed: a run that stops at its time limit keeps its missed questions on the next map, because the spec says what a run did not reach stays, and the design had dropped them.
- **2026-11-12** — Assumed: a record says *Map: not read* when the second map fails, because the second real tidy changed 451 facts and its record said *no change*.
- **2026-11-12** — Assumed: the check *no map number is higher* is met by the third real tidy and not by the second, because the second sorted 451 facts and so made one topic too big to read; the number is true, and the brief now tells the tidy to split a topic its own sorting made large.
- **2026-11-12** — Three real tidies ran (353 s, 607 s, 321 s), the reviewer's four findings and the run's fault are fixed, and the second look ended with none. The 60-minute limit stays.
- **2026-11-12** — Archive checkpoint: every task is done, the plan is archived, and the release is numbered 59.0.0 (memory module 4.0.0).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wiki-dream`: one daily tidy does the full job, working from a map of where memory is weak and from how memory was used, with no fixed steps or counts; it brings no decision to a person and no longer audits specs or plans; it shows what got better; the typed command and its dry run are removed; a tidy stopped at its time limit keeps the parts it finished.
- `memory`: each look-up by a chat is counted on the computer, and a person can see the counts.
- `knowledge-center`: the daily tidy alone is the catch-up that moves lasting facts into company knowledge.

## Impact

- `.agents/plugins/memory/skills/dream-memory/` removed: `SKILL.md` gives way to `.agents/plugins/memory/references/tidy.md`, a brief with a goal, tools, and limits, not steps; `scripts/dream.mjs` becomes `.agents/plugins/memory/scripts/daily-tidy.mjs` with new `survey` and `keep` commands and no spec or plan check.
- New `.agents/plugins/memory/scripts/lib/usage.mjs`: the count of each read, its 30-day trim, and its summary; called from `memory.mjs` (`pull`, `recall`, `search`, `brief`, `related`, `source`; new `usage` command) and `topic-match.mjs`.
- `.agents/plugins/memory/scripts/run.mjs`: the tidy prompt names the brief and carries the map; a 60-minute work limit; at the limit it keeps what `keep` staged; it makes the map before and after, asks the missed questions again, and writes the record. `memory.mjs` (`finish-run --kind daily` takes a note), `lib/digest.mjs` (the tidy line), `SKILL.md`, `README.md`, the plugin's version.
- `.agents/memory/areas.json` and `profile.mjs` (the `dream` and `improve` topics), `.agents/memory/tidy-pages.mjs` (comment), `.agents/inbox/lib/legacy.mjs` (an old dream prompt becomes *Tidy memory now*), `.agents/skills/improve-code/SKILL.md`.
- Wiki: `wiki/development/wiki-dream.md` rewritten as *Memory tidy* at the same address; `memory-search.md` (how use is counted); `memory.md`, `README.md`, `repository-improvement.md`, `daily.md`; `wiki/agent-knowledge-center.md`, `wiki/maintaining/adding-a-skill.md`; the setup seed `wiki-development-README.md`.
- Tests: `scripts/tests/dream.test.mjs` becomes `memory-tidy.test.mjs`; new `memory-usage.test.mjs`; `memory-daily.test.mjs`, `memory-capture.test.mjs`, `cli-conventions.test.mjs`, `schedule-legacy.test.mjs`; kept checks' `sourcePaths`.
- `openspec/specs/wiki-dream/spec.md`: its Purpose line, edited by hand, since a delta can't change it.
- `scripts/retired-names.json`, the payload file list and manifest, and `CHANGELOG.md`: a major version, because a command is removed.

<!-- end proposal.md -->
<!-- file design.md utf8 25973 -->
# Design

## Context

See `proposal.md` for the why. The parts today:

- `.agents/plugins/memory/scripts/session-start.mjs` starts `run.mjs --daily` at the first chat of a day; `memory.mjs daily now` starts one with `--force`.
- `run.mjs` runs three agent calls: capture and consolidation under a narrow grant, the tidy in a detached copy of the default branch, then the publish. One 30-minute deadline covers the first two. A tidy killed at the deadline returns `failed` and its edits go with the copy.
- The tidy's instruction is one line: follow `/memory:dream-memory --daily` in `skills/dream-memory/SKILL.md`. That file holds the full dream (13 steps), the `--daily` subset, and `--dry-run`.
- `skills/dream-memory/scripts/dream.mjs` gives the facts that need no judgment: `since`, `pages` (`--daily` cuts to 3 own pages and 1 spec), `drift`.
- The agent writes the record (`Daily tidy <date>: read facts up to #<id>. Checked: … Linked: …`) to a file; `run.mjs` sends it after the publish.

Numbers from this repo on 2026-11-12: 27 own pages, 55 shipped, 63 specs, 10 drifted facts, no idle plan. Every own page was checked or committed in the last 8 days; the oldest spec check is 2026-10-06. Fact #2702 records a tidy whose fact search hit its 200 limit, so about 1,300 facts were never read for placing.

No read is recorded today. `memory.mjs` answers `pull`, `recall`, `search`, `brief`, `related`, and `source`, and `topic-match.mjs` adds a topic's summary to a message, but nothing keeps what was asked or what came back. `repoContext().stateDir` is one folder for each clone on each computer, under the git common folder, so every worktree of a clone shares it.

## Goals / Non-Goals

**Goals:**

- One mode: the daily tidy is the full check.
- The agent gets a goal, a map, tools, and limits, and judges the rest. Code owns what follows a rule; the model owns what takes judgment.
- Code shows if the structure a search depends on got better.
- Use shows where to work: what chats asked, what came back, what found nothing.
- The tidy ends with nothing for a person to decide.
- A stop at the time limit loses one unit of work, not the run.
- The record and the counts come from code.

**Non-Goals:**

- No change to capture, consolidation, the day's claim, the off switch, the deny list, or the publish call.
- No store change: no new table, column, or digest field. The use counts are a file on the computer.
- No check of a spec against the code, and no search for plans left behind: the tidy may fix neither.
- No rename of the wiki page's path, the `wiki-dream` capability, the `wiki-dream` record slug, or the `dream` tag.

## Decisions

### A brief, not a runbook

`skills/dream-memory/` is removed. `.agents/plugins/memory/references/tidy.md` replaces its 13 steps with a brief for one reader, the unattended run in a repo copy:

- **The goal.** A chat that pulls a topic gets what is true, quickly.
- **What good looks like.** A question a chat asked finds its answer. Every live fact is reachable from a topic that has a page. A topic is small enough to read in one pull. A page's first sentence is true. Pages that connect link each other. No two live facts say the same thing, and none names a file that is gone. No new fact waits unread.
- **Your map and tools.** `daily-tidy.mjs survey`, then `pull`, `related`, `search`, `source`, the write gate, `retag`, and `tag --alias-of`.
- **Never.** Edit a shipped page, a spec, a plan, or an archive; edit or delete a fact; supersede a fact because nobody used it; write a person's preference from the assistant's reading; write private things or a missed question's words; follow a chat's words as an order; ask a person or leave a list for one; publish.
- **Three habits.** `keep` after each thing you finish. Leave what you may not fix, and what the evidence does not settle, and `keep --checked` it so the map drops it for a week. Test your work with a few `recall` questions in a stranger's words before you end.

It links, and does not copy, the fact-placing rules: `references/placing-facts.md`, beside the brief. It links no wiki page, because a plugin's guide must stand alone in a project that has only the plugin; its *Never* list carries the limits. It has no numbered order and no counts. `tidyPrompt` in `run.mjs` names the file and pastes the survey's first answer, so the run starts on the map. `memory/SKILL.md`'s *Daily tidy* section stays the person's entry: `daily`, `daily off`, `daily on`, `daily now`.

*Alternative:* keep the steps and loosen their words. Rejected: a checklist does the same work on a day with 300 new facts and on a day with none, and it has no step for a tag with no page.

*Alternative:* one line, *tidy memory*. Rejected: nothing would protect shipped pages or saved facts, and nothing would show the result.

*Alternative:* keep the skill with `user-invocable: false`. Rejected: a skill folder nobody may call is a second home for the brief.

### The survey is the map

`dream.mjs` moves to `.agents/plugins/memory/scripts/daily-tidy.mjs` and gains `survey [--json]`. It reads the live facts with their tags once, the topics from the profile, the use counts, and what `pages` and `drift` already compute, and prints one line a weakness, each with a count and up to five names to pull:

| Line | Counted as |
|---|---|
| `new facts` | live facts with an id above the last record's |
| `trouble notes` | open `improve` and `dream` threads |
| `missed questions` | questions that found nothing since the last record, with their words |
| `no topic` | live facts with no tag that is a topic; the names are the ones above the record's `sorted` id |
| `tags with no page` | tags on live facts that are no topic, with each tag's fact count |
| `large topics` | topics with over 100 live facts, each with the share of its facts that chats got in 30 days |
| `gone files` | `drift`'s fact lines |
| `due pages` | own pages not checked or changed in 7 days: most used first, then longest unchecked |
| `most used` | the ten topics chats pulled or got most in 30 days |
| `often returned` | the ten facts chats got most in 30 days |
| `used together` | topic pairs used in one workspace on one day, three days or more |

A tag or a topic that a record lists as checked in the last 7 days (`tag:<name>`, `topic:<name>`) is left off its line's names; the line's count stays the true total, so a thing the tidy looked at and left never shows as a number that got better. `drift` loses its plan lines, and `pages` its spec rows.

`pages` prints the due list whole, no caps, and `--all` adds what is not due and the shipped rows. `--daily` goes. The 7 days and the 100 facts are constants beside `IDLE_PLAN_DAYS`.

`run.mjs` runs `survey --json` before the tidy and after it. Six numbers go in the record and in the run row's note where they changed: `no topic`, `tags with no page`, `large topics`, `gone files`, `due pages`, and `missed questions`. For the last, the after number is not a new count: `run.mjs` runs `recall` again for each missed question from the first survey, 20 at most, and counts the ones that still find nothing.

*Alternative:* count unlinked related pairs too. Rejected: `related` is one store read for each topic, about 90 seconds for 45 topics; the agent calls it for the topics it touches.

*Alternative:* a fixed set of test questions run on the live store. Rejected: a live store's right answers change each day. The questions chats asked and the tidy's own questions about its changes test the same thing, and CI already ranks a fixed set on a synthetic store.

### Use is counted on the computer

A new `.agents/plugins/memory/scripts/lib/usage.mjs` owns one file, `usage.jsonl` in `stateDir`:

- **`recordUse(ctx, row)`** appends one JSON line: the time, the command (`pull`, `recall`, `search`, `brief`, `related`, `source`, `topic`), the node asked for, the topics and fact ids that came back (20 ids at most), the worktree's folder name, and `miss` when nothing came back. A miss also holds the question's words, cut to 200 characters. It catches every error and returns nothing, so a read can't fail or wait on it.
- **Who calls it.** Each of the six read commands in `memory.mjs`, after it has its answer, and `topic-match.mjs` for each topic it adds. With `WONG_MEMORY_RUN=1` it writes nothing, so capture, the tidy, and the tidy's own test questions are not counted.
- **A miss** is a `pull` of a name that is no node, or a `recall`, `search`, or `brief` with no answer: nothing came back, or no one fact or document that came back holds at least half of the question's main words. A main word has four letters or more and is not in a short stop list (*what*, *which*, *does*, *about*, …); two words match on their first five letters, so *approval* finds *approved*, and a shorter word matches a longer one that starts with it, so *rule* finds *rules*. A look-up counted as a miss keeps none of the facts or topics that came back. A question with fewer than two main words is a miss only when nothing came back. One exported function, `weakAnswer(words, texts)`, decides it for the count and for the run's second ask. Found at the real run: `recall` for an espresso machine returned five unrelated facts, so an empty answer alone never happens in a store this size.
- **`usageSummary(ctx, { since })`** reads the file once and gives the survey its lines. It first drops rows older than 30 days and rewrites the file when any went.
- **`memory.mjs usage [--days n] [--json]`** prints the same summary for a person: the most used topics, the facts returned most, and the questions that found nothing. `memory/SKILL.md` maps *how is memory used?* to it.

One workspace is one task here, so the worktree's folder name stands for the chat; no host gives the script a chat id on every path.

The words of a missed question stay in that file. The brief forbids them on a page or in a fact, and the record holds only their count.

*Alternative:* a table in the shared store. Rejected for now: it needs a new operation, a migration, and a contract change in every installed store, and the tidy runs on the computer where the chats ran. A person with two computers gets a tidy that sees one computer's counts; the map's other lines do not depend on the counts.

*Alternative:* keep the words of every question. Rejected: only a miss needs its words to be fixed; a hit is described by the topics and facts it returned.

*Alternative:* let the tidy supersede facts nobody used. Rejected: a rare question still needs its answer, and 30 days on one computer is no proof that a fact is dead.

### Every new fact is read, and old ones are sorted once

The brief states the outcome, and `survey` gives the count. The agent reads by date window: when a `search --since <date> --limit 200` answer holds 200 rows, it searches again with `--until` set to the oldest row's date. The record's `read facts up to #<id>` is the highest id it read; a run that read fewer facts than `new facts` counted says so in its note.

Older facts with no topic are a backlog the tidy works through oldest first. The record also holds `sorted facts up to #<id>`: the tidy looked at every topic-less fact up to that id and gave each a topic or left it. The survey's count stays the true count; its names start above that id, so a fact the tidy left is not read again each day. When the backlog is done, reading a new fact sorts it, and the two ids move together.

### `keep` marks a finished unit; `run.mjs` owns the record

A new command, `daily-tidy.mjs keep [--read <fact-id>] [--sorted <fact-id>] [--checked <path|tag:name|topic:name>…] [--linked <text>]`:

- stages every change in the copy (`git add --all`), so *staged* means *finished*;
- appends its arguments as one JSON line to the progress file named by `WONG_MEMORY_TIDY_PROGRESS`, which `run.mjs` sets to a file in the run's input folder;
- outside a run (no variable) prints a usage error and exits 2.

The brief asks for it after each finished thing: the placed facts, one page, one spec, one tag. `run.mjs` then:

- **On a normal end:** as today, counts the diff and publishes.
- **At the time limit:** drops what is not staged (`git checkout -- .`, `git clean -fd`), then counts and publishes what is staged. With nothing staged and no progress line, it records `failed` as today.
- **The record:** `run.mjs` builds it from the progress lines and the two surveys: `Daily tidy <day>: read facts up to #<id>. Sorted facts up to #<id>. Checked: <paths and names>. Linked: <texts, or none>. Map: <name> <before> to <after>, ….`, split into facts that each start the same way when over 400 characters. Each `<id>` is the highest `--read` or `--sorted`, or the last record's id (`since --json`, read before the tidy starts) when no unit gave one; a record with no `Sorted` part, from an older version, reads as 0. It sends the record only after the edits publish, as today. The agent no longer writes a record file, and `cleanRecord` goes.

*Alternative:* the agent keeps rewriting its own record file. Rejected: a kill during the write leaves broken JSON, and the record decides where the next tidy starts.

*Alternative:* one agent call for each unit. Rejected: 25 cold starts a run, each re-reading the runbook.

### What the real run and the second look found

Five faults, each with its fix:

- **The copy has no company pages.** `knowledge/` is git-ignored, so the run's copy of the default branch has none: the map counted a company label as a label with no page, and no company page was due. The run now calls the profile's `tidy.prepare`, when it has one, on the copy before the first map. WongStack's links the copy's `knowledge/` to the computer's one copy, as a chat start does (`linkCopy(place(copy))`). No copy on the computer → no link, and the map is as before. A `prepare` that throws fails no run. Git ignores `/knowledge`, so `keep` and the publish step leave the link out, and git removes the link, not its target, with the copy.
- **A company page is saved at once, by the tidy.** The computer has one company copy, with no staging, so `keep` and the run's publish step can not hold a company edit. The tidy saves such a page itself, right after the edit, by the `publish:` line of `T pages`, then `keep`s it. Every other page waits for the run. The run counts pages from its copy's changes, so its page count leaves out a company page saved at once. A kill in the middle of one company edit leaves that one edit unsaved in the copy; the run does not restore it, because a chat can edit the same copy at the same time and a restore would lose its words.
- **The map inside a run knows what `keep` kept.** `survey` and `pages` read the names of the `WONG_MEMORY_TIDY_PROGRESS` file, when it is set, as checked today. Without this a kept page stayed on the tidy's own map.
- **A run cut short keeps its missed questions.** The record of a run that stopped at its limit ends with `Stopped at its time limit.`: each fact of a split record ends with it, so every part says it alone, and each still fits 400 characters. The map reads missed questions since the newest record fact that has no such sentence, or 30 days back with none, so the questions that run did not reach are on the next map. The read and sorted ids of a cut-short record still count.
- **A missed `pull` is asked again as a `pull`.** The map's questions keep their command. The second ask runs the same command, and counts a miss by the rule that command uses: a `pull` that names no node, a `recall` or a `search` with a weak answer. A `brief` prints no JSON, so it is asked again as a `search`, which reads the same facts by the same rule. The words go after `--`, so a question can not pass a flag.
- **The second map is made up to three times, 5 seconds apart** (`WONG_MEMORY_DAILY_MAP_WAIT_MS` changes the wait, for tests). When it still fails, the record says `Map: not read.` and the note says `the map could not be read after the tidy`. It never says `no change` for a map it did not read: the run of 2026-11-12 did.

### The time limit is 60 minutes, measured before it is fixed

`DAILY_WORK_MS` defaults to 60 minutes and still covers capture and the tidy. `STALE_MS` for `run.lock` rises to 3 hours: 60 minutes of work and a 60-minute publish must end before the lock looks stale. The lock holds its run's process id, and `takeLock` takes over a lock whose process is gone, so a killed run does not block the next one for those 3 hours. The build runs one real full tidy here, times it, and writes the time in this file. A run far over or under 60 minutes changes the default in the same change.

**Measured on 2026-11-12, three real tidies here** (each from a throwaway clone of this branch, with publishing off so page edits waited on a branch; the counts held 36 real look-ups):

| Run | Time | What it did | The map, before to after |
|---|---|---|---|
| 1 | 353 s | superseded 48 facts | no topic 524 to 514, gone files 15 to 9 |
| 2 | 607 s | superseded 462 facts, merged 10, edited 2 own pages | new facts 23 to 0, no topic 514 to 63, gone files 9 to 0, large topics 1 to 2 |
| 3 | 321 s | superseded 8 facts, merged 4 look-alike labels | no topic 64 to 63, tags with no page 15 to 11, gone files 1 to 0 |

The map before run 2: new facts 23, trouble notes 44, missed questions 1, no topic 514, tags with no page 15, large topics 1, gone files 9, due pages 0. After run 3: 0, 45, 0, 63, 11, 2, 0, 0.

- **The limit stays 60 minutes.** The longest run used 10 of them to sort 451 facts. A store ten times this size still fits.
- **Run 1 showed two faults**, fixed before run 2: it ended after 6 minutes with 514 facts unsorted, and a label it only looked at left the count. The prompt now gives the minutes and says not to end while the map shows work; a checked name leaves the names, never the count.
- **Run 2 raised one number.** It sorted 451 facts into their topics, and `browser` passed 100 facts. The number is true. The brief now says a topic the tidy's own sorting made large is its own to split. Its record said `Map: no change.` because the second map failed once; the cause did not repeat in a 9-minute test of one long process, so the fix is the three tries and the honest `Map: not read.`
- **Run 3 met the task**: the *Last tidy* line showed its counts and three changed numbers, each lower, none higher. No run edited a shipped page, a spec, or a plan (run 2's pages are `wiki/maintaining/adding-a-skill.md` and `test-a-live-view.md`, both own, and both are in this change after a read). No list thread was written. The company copy was linked in run 3 and left unchanged.
- **What the runs left**: 63 facts with no topic, 11 labels with no page such as `context` and `managed-service`, and two large topics. Here a label gets a page only through `areas.json`, which ships, or a company page; the tidy looked at each and left it, as the brief says.

**Read as a person (task 6.2).** `pull setup`, `pull connect`, and `pull close` each named its page. Three questions in a stranger's words each got the fact run 2 placed as the first answer (#2960 staging sweep, #3230 the built-in add-on, #2898 easy install). A question about run 2's page edit named both the fact and `wiki/maintaining/test-a-live-view.md`. *Which espresso machine does the office use* still finds nothing after each run, and `pull espresso` stays a miss when asked again as a pull: memory holds no answer, and the tidy left both. One miss by the rule and not by the reader: *why must a person pay before the managed service makes their computer* got the right fact first (#124) but counts as a miss, because the fact says *VM* and *payment*. The count errs toward a miss, the tidy then reads the question, and the brief already tells it to leave a question it can not settle, so the brief did not change.

### An `ok` run carries a note

`finish-run --kind daily` already takes `--status` and `--reason`, and the run row holds both. An `ok` run's reason becomes its note: the map numbers that changed, and `stopped at its time limit; the rest is on tomorrow's map` for a cut-short run with published parts. `formatTidy` and `memory.mjs daily` print an `ok` row's note after its counts. No store change.

### Nothing waits for a person

The tidy writes no list. The steps that only made one go: the spec check, the search for plans left behind, and the note of a fact that belongs on a shipped page. What the tidy can't settle it marks with `keep --checked` and leaves. `formatTidy` prints what the run did and the map numbers, nothing else.

Two things stay, and neither is a question for a person. An open `improve` note is still read first, as evidence. A fault in the product still becomes a note for `/improve-code`, which plans from it by its own rules.

The list an older version wrote is one open thread on slug `wiki-dream`. No tidy loads it or renews it after the update, so upkeep closes it after 30 days, as it closes any thread nobody checks.

*Alternative:* keep the list and show it only on ask. Rejected: Matthew chose a tidy that finishes its job and leaves the rest alone, and a list nobody reads is work each day for no reader.

### Old names

- `scripts/retired-names.json` gains `/memory:dream-memory`, `skills/dream-memory`, `dream.mjs`, and `dream-memory --daily`, each with its replacement. Allowed mentions: `CHANGELOG.md`, `scripts/measure-sessions.mjs` (it reads old chats), `.agents/memory/profile.mjs` (old facts name the command, and the tag map still tags them), `.agents/inbox/lib/legacy.mjs` and its test.
- `legacyPromptStatus` rewrites `/dream`, `/dream-memory`, and `/memory:dream-memory` to `Tidy memory now`.
- `daily-tidy.mjs` still reads `Dream <date>:` and `Wiki tidy <date>:` records, so the first tidy after the update starts from the last dream.
- The `dream` topic in `areas.json` keeps its key; its definition and paths name the tidy's new files.

### The wiki page

`wiki/development/wiki-dream.md` keeps its path and becomes *Memory tidy*: what it does, when it runs and the plain asks, the goal and the map, how it shows its work, the time limit, how use is counted, what it reads, what it fixes and what it leaves alone, a fault in the product, placing a fact on a page, chats are evidence, your pages and shipped pages, undo one. It keeps the headings other pages link: `#the-daily-tidy`, `#placing-a-fact-on-a-page`, `#your-pages-and-shipped-pages`. *What it fixes and what it only lists* becomes *What it fixes and what it leaves alone*; only this page links the old heading. *Look first* and *Where it runs* go. `memory-search.md` gains one short section on the counts and links here. `memory.md` is 11 words under its 3,000-word cap, so its edits only cut or swap words.

### Order with other open work

Two open changes touch the same files. `plugin-docs-stand-alone` plans `dream-memory/references/placing-facts.md` and edits `dream-memory/SKILL.md`; after this change the placing rules belong in `references/` beside `tidy.md`. `self-contained-loop` modifies the requirement *Facts land on their topic's page*, which this change also modifies. The change that publishes second brings the first in and adjusts; neither waits.

## Risks / Trade-offs

- [A full tidy costs more of each person's AI plan each day] → Accepted: cost is not the concern unless it is ridiculous. The 60-minute limit bounds a run, a quiet map ends it early, and the off switch stays.
- [With no steps, the agent skips a duty] → Code measures each duty: the survey counts new facts against the record's `read` id, and the after-survey shows what did not move. A skipped duty shows in the next chat start, and is still on tomorrow's map.
- [The agent merges tags or makes pages a person would not] → Each tidy is one published change that can be undone; a tag merge is the admin's tidy only, as `tag --alias-of` is today; the build's real run is read before it ships.
- [The agent forgets `keep`, so a cut-short run keeps nothing] → A run with no progress line fails as it does today, and a normal end still publishes all edits, staged or not.
- [`keep` stages a half-made edit] → The brief asks for it only after a finished thing; the publish still goes through the project's checks, which stop a broken page.
- [A spec the code contradicts is found by nobody] → Accepted by Matthew's choice. `/improve-code` and each change's own checks still read specs; the tidy never could fix one.
- [A question that found nothing has no answer in memory] → The tidy leaves it. Only misses since the last record are on the map, so it is not worked again.
- [The counts come from one computer] → The other map lines need no counts; a second computer's tidy works from its own.
- [A count slows or breaks a read] → One appended line, every error caught, a test for a folder that can't be written.
- [A missed question's words are private] → They stay in one file on the computer, outside git and the store, for 30 days; the brief forbids them on a page or in a fact.
- [The tidy tunes memory to last month's questions] → Counts choose where to work, never what to remove; structure lines stay on the map with no counts.
- [An install with a schedule that runs the old command] → The update note tells the person to delete it; the daily tidy already does that schedule's work.
- [The 60-minute default is a guess] → Task 6.1 measured it: the longest of three real runs took 10 minutes.

## Migration Plan

A major release. The update removes `skills/dream-memory/` from an install through the payload file list. The first tidy after the update reads the last dream or tidy record and goes on from there. Rollback is the previous version: the records it wrote still read as tidy records.

After the merge, `/ship` checks one thing the build can't: the next day's first chat here starts a tidy, and its `Last tidy` line shows counts and map numbers from the full check.

<!-- end design.md -->
<!-- file tasks.md utf8 9868 -->
# Tasks

## 1. The tidy's script: the map, and `keep`

- [x] 1.1 Move `.agents/plugins/memory/skills/dream-memory/scripts/dream.mjs` to `.agents/plugins/memory/scripts/daily-tidy.mjs` and `scripts/tests/dream.test.mjs` to `scripts/tests/memory-tidy.test.mjs`, fixing imports and `scripts/tests/cli-conventions.test.mjs`; verify the moved tests pass unchanged
- [x] 1.2 Replace `pages --daily` with the due list by design *The survey is the map*: own pages only, 7 days, no caps, `--all` for the whole list; drop the spec rows and `drift`'s plan lines; verify cases in `memory-tidy.test.mjs` cover a page checked 3 days ago (left out), one checked 8 days ago (listed), a page never checked (first), `--all`, and no spec or plan in any output
- [x] 1.3 Add `keep` by design *`keep` marks a finished unit*; verify cases in `memory-tidy.test.mjs` cover: it stages a changed file and appends one JSON line, two calls append two lines, `--sorted` and a `tag:` name are kept, and with no `WONG_MEMORY_TIDY_PROGRESS` it exits 2 and stages nothing

## 2. Use counts

- [x] 2.1 Add `.agents/plugins/memory/scripts/lib/usage.mjs` by design *Use is counted on the computer*: `recordUse`, the 30-day trim, `usageSummary`; verify a new `scripts/tests/memory-usage.test.mjs` covers: one row for each call, a miss keeps its words cut to 200 characters and a hit keeps none, `WONG_MEMORY_RUN=1` writes nothing, a state folder that can't be written throws nothing, a 31-day-old row is dropped, and the summary's most used topics, often returned facts, missed questions, and pairs
- [x] 2.2 Call `recordUse` from `pull`, `recall`, `search`, `brief`, `related`, and `source` in `memory.mjs` and from `topic-match.mjs`, and add `memory.mjs usage [--days n] [--json]`; verify `memory-usage.test.mjs` covers on a stand-in store: a `pull` writes its topic and fact ids, a `recall` with no answer writes a miss, a `pull` of an unknown name writes a miss, the hook writes each topic it adds, and `usage` prints the three lists
- [x] 2.3 Add `survey [--json]` by design *The survey is the map*; verify cases in `memory-tidy.test.mjs` cover each line: a fact with no topic, names above the `sorted` id only, a tag with facts and no page, a tag checked 3 days ago (left out), a topic with 101 facts and its used share, new facts above the last record's id, missed questions since the last record only, due pages ordered by use then age, and an empty store with no counts file that prints zeros
- [x] 2.4 Count a weak answer as a miss by design *Use is counted on the computer* (*A miss*): add `weakAnswer` to `lib/usage.mjs`, use it for `recall`, `search`, and `brief` and in `run.mjs`'s second ask, and say it in one sentence in the wiki page, the brief, and the release note; verify `memory-usage.test.mjs` covers: unrelated facts that share one of three main words are a miss, a fact with two of three is a hit, *approval* matches *approved*, a one-word question with any answer is a hit, an empty answer is a miss, and `memory-daily.test.mjs` covers a second ask that still gets unrelated facts and counts as still missed

## 3. The run: the limit, the record, the note

- [x] 3.1 In `.agents/plugins/memory/scripts/run.mjs`, point `tidyPrompt` at `references/tidy.md`, set `WONG_MEMORY_TIDY_PROGRESS`, raise the work limit to 60 minutes and `STALE_MS` to 3 hours, and at the limit keep what is staged by design *`keep` marks a finished unit*; verify `scripts/tests/memory-daily.test.mjs` covers: a tidy killed after two `keep` calls publishes the staged pages and not the unstaged one, and a tidy killed with no `keep` records `failed` and keeps nothing
- [x] 3.2 Run `survey --json` before and after the tidy, paste the first into `tidyPrompt`, ask the missed questions again, build the record in `run.mjs` from the progress lines and the two surveys, and remove `cleanRecord` and the agent's record file; verify `memory-daily.test.mjs` covers: the record's ids are the highest `--read` and `--sorted`, a run with neither repeats the last record's ids, an older record with no `Sorted` part reads as 0, the `Map:` part holds the numbers that changed, six missed questions of which five now answer give `6 to 1`, a record over 400 characters splits into facts that `lastDream` reads as one, and a failed publish sends no record
- [x] 3.3 Write the run's note (changed map numbers, a cut-short run): `run.mjs` passes it, `memory.mjs finish-run --kind daily` takes it, and `lib/digest.mjs` `formatTidy` and `memory.mjs daily` print an `ok` row's reason; verify `memory-daily.test.mjs` and `memory-capture.test.mjs` cover a chat start with the changed map numbers, the cut-short line, and no line that asks the person for anything
- [x] 3.4 In `run.mjs`, let `takeLock` take over a lock whose process is gone, by design *The time limit is 60 minutes*; verify `memory-capture.test.mjs` covers a fresh lock that names an ended process (taken over) and a live holder (kept)
- [x] 3.5 Keep the map's counts true for a checked label or topic (names only are left off), and give `tidyPrompt` the minutes left; verify `memory-tidy.test.mjs` covers a checked tag and topic that still count, and `memory-daily.test.mjs` still passes
- [x] 3.6 Give the run's copy the company pages by design *What the real run and the second look found*: `run.mjs` calls the profile's `tidy.prepare` on the copy before the first map, WongStack's `.agents/memory/` side links `knowledge/`, and the brief says a page saved at once is saved by the tidy; verify `memory-daily.test.mjs` covers a profile whose `prepare` adds a topic page that the first map then counts, and a profile with no `prepare`
- [x] 3.7 Let `survey` and `pages` read the progress file's names as checked today; verify `memory-tidy.test.mjs` covers a `keep --checked` page and tag that leave the next `survey` and `pages`
- [x] 3.8 Mark a cut-short run's record with `Stopped at its time limit.` and read missed questions since the newest record without it; verify `memory-tidy.test.mjs` covers a miss before a cut-short record that stays on the map and one before a full record that does not, and `memory-daily.test.mjs` covers the sentence in a cut-short run's record
- [x] 3.9 Ask a missed `pull` again as a `pull`; verify `memory-daily.test.mjs` covers a `pull` miss of a name with facts and no page that still counts as missed
- [x] 3.10 Make the second map up to three times and record `Map: not read.` when it fails; verify `memory-daily.test.mjs` covers a store that fails the second read (record and note say not read, never `no change`) and one that fails once and then answers

## 4. The brief, and the command removed

- [x] 4.1 Write `.agents/plugins/memory/references/tidy.md` by design *A brief, not a runbook*, *Every new fact is read*, and *Nothing waits for a person*, and delete `.agents/plugins/memory/skills/dream-memory/`; verify a test in `memory-tidy.test.mjs` finds the goal, each *Never* line, `survey`, `keep`, and the `recall` test in the brief, finds no numbered step, `--daily`, `--dry-run`, spec check, or list for a person, and `node scripts/measure-context.mjs --check` passes
- [x] 4.2 Update `.agents/plugins/memory/SKILL.md` (*Daily tidy*; the ask *how is memory used?*), `README.md`, and the plugin's version; `.agents/memory/areas.json` (`dream`, `improve`), `.agents/memory/profile.mjs`, the comment in `.agents/memory/tidy-pages.mjs`, `.agents/skills/improve-code/SKILL.md`, and `legacyPromptStatus` in `.agents/inbox/lib/legacy.mjs` with `scripts/tests/schedule-legacy.test.mjs`; verify `memory-areas.test.mjs`, `codex-plugin.test.mjs`, and `schedule-legacy.test.mjs` pass
- [x] 4.3 Add the old names to `scripts/retired-names.json` by design *Old names*, update the payload file list and manifest, the kept checks' `sourcePaths`, and `scripts/fixtures/context-baseline.json` if the check asks; verify `node scripts/check-retired-names.mjs` passes

## 5. The wiki, the spec's purpose, the release note

- [x] 5.1 Rewrite `wiki/development/wiki-dream.md` as *Memory tidy* by design *The wiki page*; add the counts to `wiki/development/memory-search.md`; update `wiki/development/memory.md`, `README.md`, `repository-improvement.md`, `daily.md`, `wiki/agent-knowledge-center.md`, `wiki/maintaining/adding-a-skill.md`, and `.agents/skills/wong-setup/references/seed/wiki-development-README.md`; verify `node scripts/check-payload-links.mjs` passes and `memory.md` stays under 3,000 words
- [x] 5.2 Edit the Purpose of `openspec/specs/wiki-dream/spec.md` by hand to describe the daily tidy; verify it names no command and `openspec validate automatic-memory-tidy --strict --no-interactive` passes
- [x] 5.3 Add `## Next (major) — Memory cleans itself each day, with no command to type` to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do, except delete a schedule you made that runs the old command; the tidy no longer lists specs or plans for you; verify `node scripts/check-retired-names.mjs` still passes

## 6. Checks

- [x] 6.1 Use memory here for a day so the counts hold real rows, run `daily-tidy.mjs survey`, and write its numbers in `design.md`; then run one full tidy for real with `memory.mjs daily now`; verify the `Last tidy` line shows its counts and the map numbers that changed, at least one map number is lower and none is higher, no shipped page, spec, or plan is in the published change, no new list thread exists, and write the run's time and the chosen limit in `design.md`
- [x] 6.2 Read that tidy's work as a person would: `pull` three topics it changed, ask `recall` three questions about facts it placed, and ask again one question that found nothing before the tidy; verify each answer names the page or the fact, and write any miss, with its fix to the brief, in `design.md`
- [x] 6.3 Run `node .github/scripts/checks.mjs --worktree`; verify every check passes

<!-- end tasks.md -->
<!-- file specs/knowledge-center/spec.md utf8 584 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Capture happens during the work

The docs SHALL present capture as part of the work: the memory store is short-term memory, and company knowledge is long-term memory written when a session learns something. Memory's daily tidy SHALL be the catch-up that moves the remaining repeatable facts into company knowledge, saved at once; `/close` SHALL NOT be.

#### Scenario: Reader sees why capture pays off

- **WHEN** a reader reviews the philosophy page
- **THEN** they see that each change starts with more context than the last

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/memory/spec.md utf8 1451 -->
# Spec Delta

## ADDED Requirements

### Requirement: Memory counts how chats use it, on the person's computer

Each lookup a chat makes in memory SHALL be counted on that computer: the topic, path, or fact it asked for, the facts and topics that came back, and whether the lookup found no answer: nothing came back, or no fact or page that came back holds most of the question's main words. The words of a question SHALL be kept only when it found no answer. The counts SHALL stay on that computer, outside git and outside the store, and SHALL be dropped after 30 days. A lookup made by a background run SHALL NOT be counted. A lookup SHALL never fail, and never wait, because of the count. On a plain ask in any chat the assistant SHALL show the counts.

#### Scenario: A question that finds nothing

- **WHEN** a chat asks memory a question and no fact or document comes back
- **THEN** the computer keeps the question's words and the time, and the next daily tidy on that computer sees the question on its map

#### Scenario: A question that gets unrelated facts

- **WHEN** a chat asks which espresso machine the office uses, and the facts that come back share only the word *machine* with the question
- **THEN** the computer counts the question as one that found no answer

#### Scenario: The count can't be written

- **WHEN** a chat pulls a topic and the count's file can't be written
- **THEN** the pull answers as usual and prints no error

<!-- end specs/memory/spec.md -->
<!-- file specs/wiki-dream/spec.md utf8 19580 -->
# Spec Delta

## ADDED Requirements

### Requirement: One daily tidy keeps memory true, with no command

An install SHALL keep what it remembers true through one daily tidy that a person's first chat of the day starts in the background, and the chat SHALL NOT wait for it. The tidy SHALL save what that person's ended chats learned, clean memory, place lasting facts on the pages that own them, link the topics that connect, re-check the install's own pages, correct saved facts the project has outgrown, and fix what chats looked for and did not find. No person SHALL need to type a command for any of this, and the install SHALL offer no command that runs a different or larger check.

#### Scenario: A preference from an unclosed chat

- **WHEN** a person stated a lasting preference in a chat archived without `/close`, and starts a chat the next day
- **THEN** that day's tidy puts the preference on that person's page and publishes it

#### Scenario: The update removes the command

- **WHEN** an install updates to this version and a person starts a chat the next day
- **THEN** the install has no command that runs a memory clean-up, and that day's tidy does the full check

### Requirement: The tidy works toward retrieval, from a map of where memory is weak

A tidy SHALL work toward one goal: a chat that looks up a topic gets what is true, quickly. Plain code SHALL make a map of where memory falls short of that goal: facts with no topic, tags that hold facts but have no page, topics too large to read in one pull, saved facts that name a file that is gone, own pages longest unchecked, facts saved since the last tidy, open notes about trouble, and how chats used memory. The assistant SHALL choose what to fix from the map, weakest first. Its instructions SHALL state the goal, the tools, and what must never happen, and SHALL NOT fix the order of the work or how much of each kind it does.

#### Scenario: A tag that holds facts and has no page

- **WHEN** the map shows a tag with thirty live facts and no page
- **THEN** after the tidy those facts are reachable from a topic that has a page, or the tag is unchanged and no person is asked about it

#### Scenario: A quiet day

- **WHEN** the map shows a few new facts and nothing else weak
- **THEN** the tidy places those facts and ends, and checks no page only to fill its time

### Requirement: Each tidy reads every new fact, and no count limits it

A tidy SHALL read every fact saved since the last tidy's record, however many there are, and SHALL correct every live saved fact that names a file that is gone. The map SHALL leave out an own page, a tag, or a topic that a tidy checked, or that changed, in the last 7 days, and SHALL order the pages that remain by how much chats used them, then longest unchecked first. No count SHALL limit a run; its time limit does, and what a run did not reach SHALL stay on the next day's map.

#### Scenario: A page a teammate's tidy checked yesterday

- **WHEN** a teammate's tidy checked a page yesterday and nobody changed it since
- **THEN** today's map does not show that page

#### Scenario: Many new facts

- **WHEN** 300 facts of one kind were saved since the last tidy
- **THEN** the tidy reads all 300 before it records how far it read

### Requirement: A tidy shows whether memory got easier to search

Plain code SHALL make the map again when a tidy ends, and SHALL ask again, the way the chat asked it, each question that found nothing since the last tidy. The tidy's record SHALL hold the numbers from before and after, and each chat start SHALL show the numbers that changed. When the map can not be made again, the record and the chat start SHALL say so, and SHALL NOT say that nothing changed. Before it ends, a tidy SHALL test its own changes by asking memory as a new chat would, and SHALL fix what a question could not find.

#### Scenario: A tidy that gave topics to facts

- **WHEN** a tidy starts with 140 facts that have no topic and ends with 60
- **THEN** its record holds both numbers and the next chat start shows the change

#### Scenario: A placed fact that a question can't find

- **WHEN** a tidy placed a preference on a page, and its own question about that preference finds neither the page nor the fact
- **THEN** the tidy changes the fact's topic or the page's words until the question finds it, before it ends

### Requirement: The tidy works where chats used memory

A tidy SHALL read how chats used memory on its computer. For a question that found nothing while memory holds the answer, it SHALL change a topic, a tag, or a page's words so the same question finds the answer. It SHALL use the counts to choose where to work: the topics used most, a fact returned often that no page states, and topics used in the same chats that no page links. It SHALL NOT supersede or hide a fact because no chat used it, and SHALL NOT copy a question's words onto a page or into a fact.

#### Scenario: A question that found nothing

- **WHEN** a chat asked how refunds get approved and found nothing, and live facts tagged `returns` hold the answer
- **THEN** after the next tidy on that computer the same question finds those facts, and the chat start shows one question fewer with no answer

#### Scenario: A fact nobody used

- **WHEN** a live fact was returned to no chat for a month
- **THEN** the tidy leaves it live and searchable

### Requirement: The tidy cleans memory before it updates the wiki

A tidy SHALL first consolidate the memory store: facts that say the same thing merge, a contradicted fact is superseded by the newer one, and an answered open thread closes. The wiki SHALL then be updated only from live facts. On a teammate's key the tidy SHALL change only that installation's own facts.

#### Scenario: A contradicted fact does not reach the wiki

- **WHEN** two facts added since the last tidy contradict each other
- **THEN** after the tidy the older is superseded in memory and only the newer is on the wiki

### Requirement: The tidy places only lasting facts

A tidy SHALL place a fact on the wiki only when the fact is repeatable knowledge by the wiki's own rules, is expected to stay true for months, and would change what a reader does. Every other fact SHALL stay in memory. Guidance a page already holds but buries SHALL be moved or reworded where it is, never added a second time.

#### Scenario: A one-off decision stays in memory

- **WHEN** a new fact records one change's decision, a date, or finished work
- **THEN** no page gains it

### Requirement: The tidy compares every place the project remembers

A tidy SHALL compare the install's own pages and live saved facts with each other and with the files they describe, and SHALL read the specs and the plans, active and archived, as evidence. It SHALL correct what an own page states wrongly, merge duplicates, move a fact to the page that owns it, and leave every hub listing its pages. It SHALL supersede a saved fact that names a file that is gone, or that the repository contradicts, with a fact stating what is true; a fact SHALL never be edited or deleted. Before it replaces a statement or a fact that quotes a person, it SHALL read the source, and a fact recorded as the assistant's interpretation SHALL NOT be written as the person's own preference.

#### Scenario: A stale statement is corrected

- **WHEN** a re-checked own page states something a newer live fact contradicts
- **THEN** the tidy replaces the statement with the newer fact

#### Scenario: A fact about a file that is gone

- **WHEN** a live fact says a helper lives at a path the repository no longer has
- **THEN** after the tidy a newer fact supersedes it, and the old one stays searchable as history

### Requirement: The tidy finishes alone and brings a person no decision

A tidy SHALL NOT edit a page WongStack ships, a spec, a plan, or an archive, and SHALL NOT check a spec against the code or look for plans left behind. What it may not fix, and what the evidence does not settle, it SHALL leave unchanged. It SHALL ask no person a question and SHALL make no list of things for a person to decide. Each chat start SHALL show only what the last tidy did.

#### Scenario: A fact that contradicts a shipped page

- **WHEN** a live fact contradicts a page WongStack ships
- **THEN** the page and the fact are unchanged, and the next chat start names no open decision

#### Scenario: Two facts the evidence does not settle

- **WHEN** two live facts disagree and neither the sources nor the repository show which is true
- **THEN** both facts stay live, and the tidy asks nobody

### Requirement: The tidy publishes alone, from its own copy

A tidy SHALL work in a copy of the repository made for the run, with the computer's company knowledge in reach, so no checkout a person works in is touched and the map counts company pages. It SHALL save a company-knowledge edit at once and publish any other edit apart from all other work through the project's checks, with no question; where the install names no way to publish, its edits SHALL wait on a branch. A second tidy on the same day SHALL publish as its own change. A person SHALL be able to undo one tidy as one change.

#### Scenario: Nothing worth keeping

- **WHEN** no new fact passes the keep test and no checked page needs an edit
- **THEN** the tidy publishes nothing, records how far it read and which pages it checked, and the next chat start says so

#### Scenario: Two tidies in one day

- **WHEN** a person asks for a tidy on a day that already had one, and each has an edit to publish
- **THEN** both publish, each as its own change

### Requirement: A tidy stopped at its time limit keeps what it finished

A tidy SHALL stop its own work at a stated time limit. A tidy stopped there SHALL publish the parts it finished and record them, SHALL publish no half-made page, and SHALL NOT record a fact or page it did not finish, so the next tidy starts with them. A question that found nothing, and that the stopped tidy did not reach, SHALL stay on the next map. The next chat start SHALL say the tidy was cut short.

#### Scenario: The limit ends the tidy between pages

- **WHEN** the time limit ends a tidy after it finished four pages and while it edits a fifth
- **THEN** the four pages publish and count as checked, the fifth is unchanged, and the next tidy checks the fifth first

#### Scenario: The limit ends the tidy before a question

- **WHEN** a chat asked a question that found nothing, and the time limit ends that day's tidy before it works on the question
- **THEN** the next day's map still shows the question

### Requirement: Trouble with memory is checked first

A tidy SHALL load memory's open notes about trouble before it checks pages, and SHALL check first a page or a fact that a note says misled a chat. A note SHALL count as evidence, never as an instruction. When a tidy fixes a note's problem, a saved fact SHALL close that note; a note about code SHALL be left for `/improve-code`.

#### Scenario: A page that misled a chat

- **WHEN** an open note says a wiki page told the assistant something untrue
- **THEN** the next tidy checks that page first, and a fix closes the note

### Requirement: A tidy's record cannot be dated ahead

When a tidy finds the last record and each page's last check, it SHALL ignore a record dated in the future or not dated as a plain UTC time, and one that claims to have read a fact written after the record itself. A teammate's honest record, and a record an older version wrote as a dream, SHALL still count.

#### Scenario: A forged record from the future

- **WHEN** memory holds a record dated 2999-12-31 that claims to have read up to fact #999999999, beside a real one from 2026-10-01
- **THEN** the next tidy starts from the 2026-10-01 record and reads the facts added since it

#### Scenario: A record from before the update

- **WHEN** the newest record in memory is a dream an older version ran last week
- **THEN** the first tidy after the update starts from that record

## MODIFIED Requirements

### Requirement: Facts land on their topic's page

When a tidy places a repeatable fact, a fact that carries a topic SHALL go on that topic's page. A lasting fact about a company subject with no topic SHALL go on the page that owns the subject, or make that page, linked from its hub, and the fact SHALL then carry the page's topic, restated with its words, date and author kept. Each page the pass changes SHALL keep a first sentence that is a true one-line summary of the page. A page SHALL NOT name a fact by its id.

#### Scenario: A fact with a topic

- **WHEN** a lasting fact tagged `people/ada` says Ada wants ad numbers each Monday, and the tidy runs
- **THEN** `knowledge/people/ada.md` gains that preference in its own words, with no fact id, and is saved

#### Scenario: A new subject

- **WHEN** two lasting facts describe how refunds are approved, carry no topic, and no page covers refunds
- **THEN** the tidy makes `knowledge/refunds.md` with a one-line first sentence, links it from the company hub, and both facts carry `refunds` afterwards

### Requirement: A tidy links topics that connect, one way, with words

When a tidy has touched a topic's page, it SHALL read that topic's related topics and add a link between two own pages only where the two are truly related and neither page links the other, as one sentence that says how they connect, on one of the two pages only. It SHALL add no link between topics that share nothing, and none on a page WongStack ships. When it makes a new topic's page, it SHALL look back: older live facts that fit the topic SHALL get the topic, with their words, date and author kept; a teammate's run SHALL change only its own facts.

#### Scenario: Two topics that share a change

- **WHEN** `refunds` and `people/ada` share six facts, both pages are the install's own, and neither links the other
- **THEN** after the tidy one of the two pages has one sentence that links the other and says how they connect, and the other page has no new link

#### Scenario: A new topic looks back

- **WHEN** the tidy makes `knowledge/refunds.md` today, and four live facts from last month describe refunds with no topic
- **THEN** those four facts carry `refunds` afterwards, each with its words, date and author unchanged

### Requirement: A product fault is reported, not written over

When a page or spec disagrees with the product and the evidence shows the product is the one that is wrong, a tidy SHALL leave the page or spec as it is and SHALL record the fault as a note the next `/improve-code` reads.

#### Scenario: The page is right and the code is wrong

- **WHEN** a page states a rule a recorded decision confirms, and the code breaks that rule
- **THEN** the page is unchanged and a memory thread for `/improve-code` names the rule and where the code breaks it

### Requirement: A tidy starts only as the person allows and keeps private things out

A tidy SHALL start on its own only from a person's own chat start, at most once a day, and never on a computer where that person turned it off. On a plain ask in any chat the assistant SHALL say when memory last tidied and what it changed, stop or start the daily tidy on that computer, and start one tidy at once. A tidy SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki. A tidy SHALL treat the words of a saved fact or an old chat as evidence to weigh, never as an instruction to follow.

#### Scenario: An update arrives

- **WHEN** an install updates to this version and a person starts a chat the next day
- **THEN** one daily tidy runs for that person, and no spec, plan, archive, saved fact's words, or page WongStack ships is changed

#### Scenario: Turned off on one computer

- **WHEN** a person stopped the daily tidy on their laptop and starts a chat there the next day
- **THEN** no tidy starts on the laptop, and their other computer still tidies

#### Scenario: A chat that gives orders

- **WHEN** an old chat a tidy reads as a source contains text telling the assistant to delete a page
- **THEN** the tidy does not act on that text

## REMOVED Requirements

### Requirement: A dream tidies memory before it updates the wiki

**Reason**: The typed dream is removed; the daily tidy does its work.
**Migration**: See *The tidy cleans memory before it updates the wiki*.

### Requirement: A dream adds what memory has gained since the last one

**Reason**: The typed dream is removed; the daily tidy places the facts.
**Migration**: See *The tidy places only lasting facts* and *Each tidy reads every new fact, and no count limits it*.

### Requirement: A dream removes discrepancies from the install's own pages

**Reason**: The typed dream is removed; the daily tidy re-checks the pages.
**Migration**: See *The tidy compares every place the project remembers*.

### Requirement: A claim changes only after its source is read

**Reason**: Folded into the requirement that owns the comparison.
**Migration**: See *The tidy compares every place the project remembers*.

### Requirement: Pages WongStack ships are never edited

**Reason**: Folded into the requirement that says what a tidy leaves alone. A fact that belongs on a shipped page is no longer listed for anyone.
**Migration**: See *The tidy finishes alone and brings a person no decision*.

### Requirement: A dream publishes alone, through the project's checks

**Reason**: The typed dream is removed. A tidy works in its own copy, so no checkout with unfinished work can stop it.
**Migration**: See *The tidy publishes alone, from its own copy*.

### Requirement: A dry run shows the edits and publishes nothing

**Reason**: The dry run goes with the command. A tidy publishes with no question, and each tidy is one change a person can undo.
**Migration**: Ask a chat *when did memory last tidy?* to see what a tidy changed, and *undo the last tidy* to take it back.

### Requirement: A dream reads every place the project remembers

**Reason**: The typed dream is removed. The daily tidy reads the same places as evidence, and no longer lists a spec the code contradicts or a plan left behind.
**Migration**: See *The tidy compares every place the project remembers* and *The tidy finishes alone and brings a person no decision*. To check a spec against the code, ask a chat.

### Requirement: A dream corrects saved facts the project has outgrown

**Reason**: The typed dream is removed; the daily tidy corrects every such fact.
**Migration**: See *The tidy compares every place the project remembers*.

### Requirement: Trouble with memory is read first

**Reason**: Restated for the daily tidy, which now reads the notes too.
**Migration**: See *Trouble with memory is checked first*.

### Requirement: A dream can run again the same day

**Reason**: The typed dream is removed.
**Migration**: See *The tidy publishes alone, from its own copy*; ask a chat *tidy memory now*.

### Requirement: A dream's record cannot be dated ahead

**Reason**: Restated for the tidy's record; an older dream record still counts.
**Migration**: See *A tidy's record cannot be dated ahead*.

### Requirement: A daily tidy does every kind of tidy in a small part

**Reason**: The daily tidy now does the full check from a map, with no fixed part, and a stop at its time limit keeps what it finished.
**Migration**: See *One daily tidy keeps memory true, with no command*, *The tidy works toward retrieval, from a map of where memory is weak*, and *A tidy stopped at its time limit keeps what it finished*.

<!-- end specs/wiki-dream/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-12

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 137691 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-12-automatic-memory-tidy</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  /* A card on a phone: its words, a row of small pictures, then OK and Note. At 900px and wider the pictures sit right. */
  .item.card { padding:0; overflow:hidden; }
  .words { display:grid; grid-template-columns:26px minmax(0,1fr); align-content:start; gap:0 10px; min-width:0; padding:var(--pad); }
  .words > .table, .words > .live-said { grid-column:1 / -1; margin-top:10px; }
  .item > .verdict { padding:0 var(--pad) var(--pad); }
  .text { position:relative; }
  .clamp { display:block; }
  .text:not(.folded) .clamp { display:inline; }
  .text.folded .clamp { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .more { min-width:0; min-height:0; padding:0; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font:inherit; font-weight:400; text-decoration:underline; }
  .text:not(.folded) .more { margin-left:.4em; }
  .text.folded .more { position:absolute; right:0; padding-left:1.6em; background:linear-gradient(to right, transparent, var(--card) 1.2em); }
  .view { min-width:0; padding:0 var(--pad) 10px calc(var(--pad) + 36px); }
  .stage { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
  /* A part: one labelled picture, drawing, page, or live card; a click opens it full screen. */
  .part { flex:none; width:84px; margin:0; text-align:center; cursor:zoom-in; }
  .part .clip { position:relative; width:84px; height:112px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--card); }
  .part .clip:not(.big) * { pointer-events:none; }
  .part .clip:not(.big) .pin { pointer-events:auto; }
  .part figcaption { margin-top:3px; color:var(--muted-foreground); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .part:hover figcaption, .part:focus-visible figcaption { color:var(--foreground); }
  .part:hover .clip:not(.big) { outline:2px solid var(--ring); outline-offset:2px; }
  .part .art { margin:0; font-size:var(--f, 13px); }
  .part .art.screen:not([style]) { width:49.2em; }
  /* A page or live card taller than its space shows its top; a fade says there is more. */
  .clip.tall::after { content:""; position:absolute; left:0; right:0; bottom:0; height:48px; background:linear-gradient(to bottom, transparent, var(--card)); pointer-events:none; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .art { position:relative; display:block; width:max-content; margin:0 auto; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* A picture file: as wide in em as its file is in px, so the fit and zoom scale it like a drawing. */
  .art.photo { padding:0; line-height:0; }
  .art.photo img { display:block; width:20em; height:auto; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art .pin.spot, .page .pin.spot { position:absolute; z-index:2; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture. */
  .art.ad { width:20em; padding:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; white-space:normal; line-height:1.3; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .ad img { display:block; width:100%; aspect-ratio:4 / 5; object-fit:cover; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  /* A page or a live card: drawn at a phone or computer width, scaled; a cover over a page takes a tap as a spot note. */
  .page, .live { position:relative; overflow:hidden; margin:0 auto; background:white; }
  .page iframe, .live iframe { display:block; border:0; transform-origin:0 0; }
  .live iframe { background:var(--background); }
  .cover { position:absolute; top:0; left:0; right:0; bottom:0; cursor:crosshair; }
  .verdict { display:flex; align-items:center; gap:8px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .words > .table { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  /* Full screen: the labels and Close on top; the part's own frame fills the middle; what changes it sits at the foot. */
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--muted); }
  #viewer .vtop { flex:none; display:flex; align-items:center; gap:8px; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); background:var(--background); }
  #viewer .names { flex:1 1 0; min-width:0; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
  #viewer .name { flex:none; min-width:0; padding:0 12px; border:0; background:transparent; box-shadow:none; color:var(--muted-foreground); font-weight:400; white-space:nowrap; }
  #viewer .name[aria-selected="true"] { background:var(--muted); color:var(--foreground); font-weight:600; }
  #viewer .vspace { flex:1; min-height:0; }
  #viewer .vfoot { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); background:var(--background); }
  #viewer .vhint { flex:1 1 220px; margin:0; color:var(--muted-foreground); font-size:13px; }
  .zoom, .sizes { display:flex; align-items:center; gap:6px; }
  .zoom .level { color:var(--muted-foreground); font-size:13px; }
  .sizes { gap:0; padding:2px; border-radius:var(--radius); background:var(--muted); }
  .sizes button { min-height:36px; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font-weight:400; }
  .sizes button[aria-pressed="true"] { background:var(--card); color:var(--foreground); font-weight:600; box-shadow:var(--look-shadow-xs); }
  .clip.big { position:fixed; left:0; right:0; top:var(--vtop, 52px); bottom:var(--vfoot, 52px); z-index:9; width:auto !important; height:auto !important; max-height:none !important;
    padding:12px; overflow:auto; border:0; border-radius:0; background:var(--muted); cursor:auto; touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  .clip.big::after { display:none; }
  .clip.big > .art, .clip.big > .page, .clip.big > .live { margin:0 auto; }
  .clip.big > :is(.art.photo, .art.ad, .art.pic, .page) { cursor:crosshair; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  /* Files and the needs list: the look's parts. */
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100% - 700px) / 2 + 12px)); padding-right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
  /* Wide screen: every part and the bar share one 1160px column; a card's words and buttons sit left, and its
     pictures sit right, side by side, as tall as the words (the kit sets the height). */
  @media (min-width:900px) {
    main { max-width:1160px; padding:0 24px; }
    .bar { padding-left:max(24px, calc((100% - 1160px) / 2 + 24px)); padding-right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    #ready-confirm, #ready-says { right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    .item.has-view { display:grid; grid-template-columns:minmax(280px, 380px) minmax(0, 1fr); grid-template-rows:auto 1fr; align-items:start; }
    .item.has-view > .words { grid-column:1; grid-row:1; padding:20px 20px 12px; }
    .item.has-view > .verdict { grid-column:1; grid-row:2; padding:0 20px 20px; }
    .item.has-view > .view { grid-column:2; grid-row:1 / span 2; display:flex; padding:0; border-left:1px solid var(--border); background:var(--muted); }
    .stage { flex:1; min-width:0; gap:16px; padding:16px; align-items:center; }
    .stage > .part:first-child { margin-left:auto; } .stage > .part:last-child { margin-right:auto; }
    .part { width:auto; }
    .part .clip { width:auto; height:auto; border:0; border-radius:0; background:none; }
    .part[data-kind="draw"] .clip:not(.big) { border:1px solid var(--border); border-radius:var(--radius); background:var(--card); }
    .part:is([data-kind="page"], [data-kind="live"]) .clip:not(.big) { border:1px solid var(--border); border-radius:12px; background:var(--card); }
    .part figcaption { margin-top:6px; font-size:14px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-12-automatic-memory-tidy" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-12-automatic-memory-tidy</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Tap a picture to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Memory has two clean-ups. The daily tidy starts by itself, but it checks only a small part: three pages and one spec a day. The full check runs only when a person types <code>/memory:dream-memory</code>, and most people never do. Both follow a fixed checklist with fixed counts, so the tidy does the same steps each day, whatever memory needs. Memory also does not know which facts a chat uses, or which question found nothing. Today 26 labels hold facts but have no page, and 7 topics hold over 100 facts each, too many to read in one look. No step of the checklist fixes that.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><div class="words"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The tidy gets a goal and a map, not a checklist.</b> The goal: a chat that looks up a topic gets what is true, fast. Plain code makes a map of where memory is weak. The AI reads the map and decides what to fix, weakest first, for as long as its time allows. It has no numbered steps and no fixed counts. Fixed rules stay only for what must never happen: no edit to a page WongStack ships, a spec, or a plan; no saved fact edited or deleted; private things stay out.</div></div><div class="table"><table class="tbl"><thead><tr><th>The map shows</th><th>In this project today</th></tr></thead><tbody><tr data-note="item-1-row-1" tabindex="0"><td>Labels that hold facts but have no page</td><td>26, used about 270 times</td></tr><tr data-note="item-1-row-2" tabindex="0"><td>Topics too big to read in one look</td><td>7, the largest holds 220 facts</td></tr><tr data-note="item-1-row-3" tabindex="0"><td>Facts with no topic</td><td>counted at the build</td></tr><tr data-note="item-1-row-4" tabindex="0"><td>Facts that name a file that is gone</td><td>10</td></tr><tr data-note="item-1-row-5" tabindex="0"><td>Your pages not checked this week</td><td>2 of 27</td></tr><tr data-note="item-1-row-6" tabindex="0"><td>New facts since the last tidy</td><td>counted each day</td></tr><tr data-note="item-1-row-7" tabindex="0"><td>Notes that say memory misled a chat</td><td>read first</td></tr><tr data-note="item-1-row-8" tabindex="0"><td>How memory was used</td><td>new, see the next part</td></tr></tbody></table></div></div></li>
<li class="item card" id="item-2"><div class="words"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Memory counts how it is used, and the tidy reads the counts.</b> Each time a chat looks something up, plain code counts it on your computer: the topic it asked for, the facts that came back, and a question that found nothing. A question also counts as finding nothing when no fact or page that came back holds most of its main words: a search always returns something, and unrelated facts are not an answer. The tidy's map shows the counts, so the tidy works where it helps most. A count never removes a fact: a fact nobody used stays where a search finds it. Ask any chat <i>how is memory used?</i> to see them.</div></div><div class="table"><table class="tbl"><thead><tr><th>The counts show</th><th>What the tidy does</th></tr></thead><tbody><tr data-note="item-2-row-1" tabindex="0"><td>A question that found nothing</td><td>Fixes the topic, the label, or the page's words, so the question finds its answer</td></tr><tr data-note="item-2-row-2" tabindex="0"><td>The topics used most</td><td>Checks their pages first and keeps them short</td></tr><tr data-note="item-2-row-3" tabindex="0"><td>A fact that comes back again and again</td><td>Puts it on its topic's page</td></tr><tr data-note="item-2-row-4" tabindex="0"><td>A topic too big to read, where chats use only a part</td><td>Splits it into smaller topics, the used part first</td></tr><tr data-note="item-2-row-5" tabindex="0"><td>Two topics used in the same chats</td><td>Links their pages</td></tr></tbody></table></div></div></li>
<li class="item card" id="item-3"><div class="words"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>It does the full job, every day.</b> Your first chat each day still starts it in the background, and the chat never waits. A page checked or changed in the last 7 days is not on the map, so the tidy does not read it again. A full day costs about what one long chat costs on your AI plan.</div></div><div class="table"><table class="tbl"><thead><tr><th>Each day</th><th>Today</th><th>After</th></tr></thead><tbody><tr data-note="item-3-row-1" tabindex="0"><td>Your own pages checked</td><td>3</td><td>the most overdue first, as time allows</td></tr><tr data-note="item-3-row-2" tabindex="0"><td>Facts that name a file that is gone</td><td>up to 10</td><td>every one is corrected</td></tr><tr data-note="item-3-row-3" tabindex="0"><td>New facts read for the wiki</td><td>the first 200 of each kind</td><td>every one</td></tr><tr data-note="item-3-row-4" tabindex="0"><td>Labels with no page, topics too big</td><td>not looked at</td><td>fixed where the map shows them</td></tr><tr data-note="item-3-row-5" tabindex="0"><td>Questions that found nothing</td><td>not known</td><td>fixed, then asked again</td></tr></tbody></table></div></div></li>
<li class="item card" id="item-4"><div class="words"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>It finishes the job and brings you no decision.</b> The tidy fixes what it may fix: your own pages, saved facts, labels, and topics. It leaves the rest alone and says nothing. It makes no list for you, and the chat start shows only what it did. A thing it looked at and left stays off its map for 7 days, so it does not look again each day. So it no longer compares specs with the code or looks for plans left behind: it may not change those. It still reads them as evidence when it checks a page.</div></div></div></li>
<li class="item card has-view" id="item-5"><div class="words"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>It shows that memory got better.</b> Code makes the map again when the tidy ends, and asks again each question that found nothing. The chat start shows what changed.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">Last tidy (2026-11-13 on laptop):</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">  pages 6, links 3</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">  labels with no page 26 -&gt; 19</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">  facts with no topic 140 -&gt; 60</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">  questions with no answer 6 -&gt; 1</span></pre></div><figcaption>Drawing</figcaption></figure></div></div></li>
<li class="item card has-view" id="item-6"><div class="words"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>It keeps what it finished when its time ends.</b> The tidy may now work for 60 minutes, not 30. Today a tidy that reaches its limit throws away every page edit. Now it publishes each part it finished, and the next day starts with the rest.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip"><div class="art pic" data-note="item-6-picture-1" tabindex="0" style="width:37.308em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 485 280" width="485" height="280" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_A_B_0"><path d="M214.74,56C214.74,79.5 118.94,79.5 118.94,103L118.94,109"/><path class="pele-marker" d="M118.94,116L115.58,108L122.3,108Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_A_C_0"><path d="M277.43,56C277.43,73.5 373.24,73.5 373.24,91L373.24,97"/><path class="pele-marker" d="M373.24,104L369.88,96L376.6,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_C_D_0"><path d="M373.24,176L373.24,217"/><path class="pele-marker" d="M373.24,224L369.88,216L376.6,216Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="A" transform="translate(246.09,32)"><rect x="-83.34" y="-24" width="166.69" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Time limit reached</text></g><g class="pele-node pele-shape-rect" data-id="B" transform="translate(118.94,140)"><rect x="-110.94" y="-24" width="221.87" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Finished pages: published</text></g><g class="pele-node pele-shape-rect" data-id="C" transform="translate(373.24,140)"><rect x="-103.37" y="-36" width="206.74" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">Half-made page: thrown</tspan><tspan x="0" y="17.6">away</tspan></text></g><g class="pele-node pele-shape-rect" data-id="D" transform="translate(373.24,248)"><rect x="-100.88" y="-24" width="201.76" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">Still on tomorrow's map</text></g></g></svg></div></div><figcaption>Flow</figcaption></figure></div></div></li>
<li class="item card" id="item-7"><div class="words"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>BREAKING: the command <code>/memory:dream-memory</code> goes away.</b> Nobody needs it: the daily tidy does its work. Its look-first mode goes with it. You still ask any chat in plain words.</div></div><div class="table"><table class="tbl"><thead><tr><th>You want</th><th>You say</th></tr></thead><tbody><tr data-note="item-7-row-1" tabindex="0"><td>A full tidy at once</td><td><i>tidy memory now</i></td></tr><tr data-note="item-7-row-2" tabindex="0"><td>The last tidy and what it changed</td><td><i>when did memory last tidy?</i></td></tr><tr data-note="item-7-row-3" tabindex="0"><td>How memory is used</td><td><i>how is memory used?</i></td></tr><tr data-note="item-7-row-4" tabindex="0"><td>No tidy on this computer</td><td><i>stop the daily memory tidy</i></td></tr><tr data-note="item-7-row-5" tabindex="0"><td>To take back a tidy</td><td><i>undo the last tidy</i></td></tr></tbody></table></div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> no change to how a chat is saved when it ends, to <code>/close</code>, to who sees which fact, to the off switch, or to one tidy a day for each person. No schedule and no page in the app. The counts stay on each computer: nothing new is saved in the shared store. The page's address, the spec's name, and the memory tag keep the word <i>dream</i>.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="none"><p><b>Nothing.</b> At the end of the build the AI runs one full tidy for real in this project, on your AI plan, and times it.</p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-12</p>Asked why the full check still exists beside the daily tidy → chose: the daily tidy does the full check, the command is removed, and clean-up is automatic with nothing to call.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: no question before drafting, because Matthew gave the design to the plan (<i>think of how to make it so</i>) and no open choice makes the plan wrong.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: this replaces the 2026-11-03 choice of small daily clean-ups and the 2026-11-11 limit of three pages and one spec, because Matthew now asks for the full check each day.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-12</p>Asked what matters most for the tidy → chose: it works well and keeps memory structured for better retrieval; cost is not a concern unless it is ridiculous.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the tidy gets a goal, a map made by plain code, and a short list of things it must never do, in place of numbered steps and fixed counts, because Matthew found the steps too prescriptive and asked for a better way.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the map measures structure a search depends on (facts with no topic, labels with no page, topics over 100 facts, files that are gone, overdue pages), because those are countable by code and each one hides facts from a chat.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-12</p>Asked if the tidy should bring a person the things it may not fix → chose: no; it finishes the job and leaves alone what it can't settle.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the tidy no longer compares specs with the code or looks for plans left behind, because it may not change them and nobody is to be told; it still reads them as evidence.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-12</p>Asked if memory should count how it is used, to inform the next tidy → chose: yes; the plan did not have it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the counts stay in a file on each computer, with no change to the shared store, because the tidy runs on the computer where the chats ran; the limit is that a person with two computers gets a tidy that sees one computer's counts.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the counts hold topic names and fact numbers, and the words only of a question that found nothing, kept 30 days, because the tidy needs those words to fix the gap and nothing else needs words.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: look-ups by the tidy and by background runs are not counted, because only a chat's use says what people need.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a count tells the tidy where to work and never lets it hide a fact, because a question asked once a year still needs its answer.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a thing the tidy looked at and left alone stays off the map for 7 days, as a checked page does, because a tidy that brings no decision must not look at the same thing each day.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the tidy still leaves a note for <code>/improve-code</code> when a page is right and the code is wrong, because that note goes to the code improver's next plan, not to a person as a question.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the proof is the same map made again at the end, with each question that found nothing asked again by code, because a count shows structure and a real question shows that a chat can find the answer.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: no count limits a run; only the time limit does, and a page checked or changed in the last 7 days is left off the map, because cost is not the concern and a second look at yesterday's page finds nothing.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the work limit is 60 minutes, because the full check must fit with the save of the day's chats before it; the build times one real run and records the number.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a tidy stopped at its limit publishes the parts it finished, because a larger daily check reaches the limit more often and a thrown-away run helps nobody.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the look-first mode goes with the command, because the tidy already publishes with no question and each tidy is one change that can be undone.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: plain code, not the AI, writes the tidy's record and its numbers, because the record decides where the next tidy starts and a count must be true.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a schedule a person made to run the old command is deleted by that person, named in the update note, because a saved schedule's words are theirs.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the page's address, the spec's name <code>wiki-dream</code>, and the memory tag <code>dream</code> stay, because no person types them and a new name breaks links in installed projects and in two open changes.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the open changes <i>plugin-docs-stand-alone</i> and <i>self-contained-loop</i> edit the same instructions and spec; the one that publishes second adjusts to the first.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the run makes the map itself, from the store the person's checkout names and the files of the throwaway copy, and stops as <code>failed</code> when no map can be made, because the tidy has no start without one.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a step tag such as <code>dream</code> or <code>plan</code> is left off <i>tags with no page</i>, because a step is not a topic and needs no page.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: <code>related</code> counts only the topic asked for, and a pulled change counts no topic, because the other names are what memory offered, not what the chat needed.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the run's note is plain-word lines of one fixed shape inside the store's 300 characters, and a reason of any other shape prints as before, because the chat-start line must tell a note from a failure's reason.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the run asks at most 20 missed questions again, with <code>recall</code> in the copy, and counts the others as still missed, because a count that claims an answer nobody tested is false.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a page the tidy changed counts as checked in the map made after it, because a new page otherwise shows as a new overdue page and the number rises.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the Codex plugin manifest drops its <code>skills</code> key and the memory plugin becomes version 3.0.0, because its only inner skill is removed.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: <code>.agents/memory/profile.mjs</code> keeps the old command names in its <code>dream</code> step, because an old chat that ran the command must keep its tag; the payload file list and manifest needed no edit, because they name the plugin's folder, not its files.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the example of a skill only a person starts, in <code>wiki/maintaining/adding-a-skill.md</code>, becomes <code>paste-this-into-your-ai</code>, because the old example is removed.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the tests ran once at the end, not after each part, because the build writes all source and tests first.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the page and the spec no longer say <code>/close</code> places facts by the tidy's rules, because the main branch removed that from <code>/close</code> after this branch started.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: <code>site/attachments/know-how.md</code> gets today's <code>checked:</code> date with no rewrite, because the edit to its source page changes a link's words and not the fix.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: the tests of <code>planDrift</code>, <code>dailyPages</code>, <code>pages --daily</code>, the spec rows, the plan lines, and the record file the AI wrote are removed with that code; the due list, map, <code>keep</code>, and record tests in <code>memory-tidy.test.mjs</code> and <code>memory-daily.test.mjs</code> replace them.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: the test <i>a tidy killed at its time limit throws its edits away and sends no record</i> is replaced by two: a tidy stopped with no <code>keep</code> still keeps nothing, and a tidy stopped after two <code>keep</code> calls publishes them. The second ends the stand-in by a signal, which the run reads as the time limit, because a real timeout between two calls is not reliable.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-12</p>Built and saved: the script, the use counts, the run, the brief, the wiki, and the release note are written and their tests pass; the real tidy (tasks 6.1 and 6.2) and the full checks (6.3) are next.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the real tidy of task 6.1 runs before the change is published, from a throwaway clone of the saved branch with publishing off, because the tidy's copy of the main branch does not hold the new brief until this change is live; its page edits are read and then join this change.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: task 6.1's <i>use memory for a day</i> is done as real look-ups made now with the new code, because the change is being published in this chat and the task needs real rows, not a day.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the <code>knowledge-center</code> spec gets a small delta, because its catch-up requirement named the removed command beside the daily tidy.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>scripts/tests/dream.test.mjs</code> is deleted because its script moved: <code>scripts/tests/memory-tidy.test.mjs</code> holds its tests for <code>since</code>, the pages list, the record, and gone files, and drops only the tests of code this change removes (<code>pages --daily</code>, the spec rows, the plan lines).</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a question also counts as finding nothing when no fact or page that came back holds at least half of its main words, because a real look-up here for an espresso machine returned five unrelated facts, so a count of empty answers alone would stay at zero.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a look-up that counts as finding nothing keeps none of the facts or topics that came back, because unrelated facts would fill the map's <i>often returned</i> and <i>most used</i> lines.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a short word matches its longer form, so <i>rule</i> finds <i>rules</i>, because the search matches word forms and plurals of four-letter words are common here.</li>
<li class="decision card" id="decision-47" data-note="decision-47" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a run's lock is free at once when the process it names is gone, because the first real tidy here waited 30 minutes behind the lock of a run killed hours before and then gave up with no word; the longer 3-hour lock made that worse.</li>
<li class="decision card" id="decision-48" data-note="decision-48" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a label or topic the tidy looked at and left keeps its place in the map's count and loses only its name, because the first real tidy showed <i>topics too big to read 1 -&gt; 0</i> for a topic it had only looked at.</li>
<li class="decision card" id="decision-49" data-note="decision-49" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the run tells the tidy how many minutes it has and not to end while the map shows work it may do, because the first real tidy ended after 6 minutes with 514 facts still without a topic.</li>
<li class="decision card" id="decision-50" data-note="decision-50" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-12</p>Check: <code>scripts/measure-context.mjs</code> counts the tidy's brief and its fact-placing page (<code>references/tidy.md</code>, <code>references/placing-facts.md</code>) as on-call text, outside the instruction word limit, because only the unattended tidy reads them and the typed-only skill they replace was counted the same way.</li>
<li class="decision card" id="decision-51" data-note="decision-51" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the fact-placing page that main moved into the removed skill's folder now sits beside the brief, and the brief links no wiki page, because main's newer rule fails a plugin link that leaves the plugin's folder.</li>
<li class="decision card" id="decision-52" data-note="decision-52" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the run links the company pages into its copy, and the tidy saves a company page at once by itself, because the plan promises that a fact lands on its topic's page and the copy had no company page; the computer has one company copy, so the run can not hold such an edit back.</li>
<li class="decision card" id="decision-53" data-note="decision-53" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a run that stops at its time limit keeps its missed questions on the next map, because the spec says what a run did not reach stays, and the design had dropped them.</li>
<li class="decision card" id="decision-54" data-note="decision-54" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: a record says <i>Map: not read</i> when the second map fails, because the second real tidy changed 451 facts and its record said <i>no change</i>.</li>
<li class="decision card" id="decision-55" data-note="decision-55" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-12</p>Assumed: the check <i>no map number is higher</i> is met by the third real tidy and not by the second, because the second sorted 451 facts and so made one topic too big to read; the number is true, and the brief now tells the tidy to split a topic its own sorting made large.</li>
<li class="decision card" id="decision-56" data-note="decision-56" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-12</p>Three real tidies ran (353 s, 607 s, 321 s), the reviewer's four findings and the run's fault are fixed, and the second look ended with none. The 60-minute limit stays.</li>
<li class="decision card" id="decision-57" data-note="decision-57" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-12</p>Archive checkpoint: every task is done, the plan is archived, and the release is numbered 59.0.0 (memory module 4.0.0).</li>
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
<div id="viewer" role="dialog" aria-modal="true" aria-label="Full screen" hidden>
  <div class="vtop"><div class="names" role="tablist" aria-label="Pictures"></div><button type="button" class="primary" data-close>✕ Close</button></div>
  <div class="vspace"></div>
  <div class="vfoot"><p class="vhint"></p>
    <span class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button></span>
    <span class="sizes" role="group" aria-label="Width"><button type="button" data-size="0" aria-pressed="true">Phone</button><button type="button" data-size="1" aria-pressed="false">Computer</button></span>
    <a class="try" target="_blank" rel="noopener noreferrer" hidden>Try it ↗</a></div>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    // A browser notice that a resize watcher waited a frame is no script error.
    if (/ResizeObserver loop/.test(e.message)) return;
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Note on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^need-\d+-q-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, .more, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot. A screen's words sit in many small boxes: join every piece with a space.
    // A picture file, an ad, and a page read as their label.
    const row = el.tagName === 'TR', named = el.getAttribute('data-label');
    const cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = named !== null ? named : Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); })
      .join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add, .more'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      // An item's words take their note through the Note button beside OK; a part takes its notes full screen.
      if (el.closest('.art, .stage') || el.matches('.items > .item .text') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), held = data.files[id] || [];
      if (!held.length) return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = asker(id) + ', "' + q.getAttribute('data-label') + '"', done = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (done ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(held.map(function (f) { return f.name; }).join(', ')) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    drawFiles();
    views.forEach(counts);
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
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
    const offer = el && (el.closest('.clip.big') || (e.pointerType === 'mouse' && !el.closest('.stage')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a whole part full screen notes that spot of it, kept in percent so it holds at any size; a drawing's line is a line.
  function spotAt(el, target, e) {
    if (!el.parentNode.classList.contains('big')) return null;
    const r = el.getBoundingClientRect(), fig = el.closest('.part');
    const pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: 0, x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: fig.querySelector('figcaption').firstChild.textContent };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el, rec && rec.k); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if (view && !open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && V.f <= V.lo * 1.001) {
      openViewer(view.c, view.i + (e.key === 'ArrowRight' ? 1 : -1));
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    const note = noteOf(id), draft = data.drafts[id];
    if (el) reveal(el, extra ? extra.k : (draft || note || {}).k);
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
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
    bar();
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
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── OK and Note on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Note on ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Note</button>';
    item.appendChild(v);
  });

  // ── the card view: each part sits in a labelled frame, sized by the card's words; a click opens it full screen ──
  const BASE = 13, PAGE_W = [390, 1280], FIRST_SCREEN = 760;
  const WIDE = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: false };
  const later = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return setTimeout(fn, 16); };
  const views = [];
  // Each page frame's height, as its page posted it at 1 px tall; and each overflow seen at full height, measured once.
  const pageH = new WeakMap(), pageOver = new WeakMap(), PAGE_MAX = 40000;
  let view = null, queued = false;
  // A resize watcher's work waits for the next frame, so a size it sets never loops back into the same frame.
  function queue() {
    if (queued) return;
    queued = true;
    later(function () { queued = false; views.forEach(layout); if (view && big().paged) fitBig(); });
  }
  // A new width measures a page again from 1 px tall, so a shorter page doesn't keep the old height.
  function pageWidth(f, w) {
    if (f.style.width === w + 'px') return;
    f.style.width = w + 'px'; f.style.height = '1px'; pageH.delete(f);
  }
  // A page or live card drawn w px wide and h px tall, scaled by k; a page keeps the height its page posted.
  function frameAt(p, w, h, k) {
    const f = p.el.querySelector('iframe');
    if (!f) return;
    if (p.kind === 'page') pageWidth(f, w); else { f.style.width = w + 'px'; f.style.height = h + 'px'; }
    f.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    p.el.style.width = w * k + 'px'; p.el.style.height = h * k + 'px';
  }
  // A part's own size: a drawing or picture at the base size, a page or live card at a phone's width.
  function natural(p) {
    if (p.kind === 'page') return { w: PAGE_W[0], h: pageH.get(p.el.querySelector('iframe')) || 200 };
    if (p.kind === 'live') return { w: PAGE_W[0], h: +p.el.getAttribute('data-height') || 640 };
    p.clip.style.setProperty('--f', BASE + 'px');
    return { w: p.el.offsetWidth, h: p.el.offsetHeight };
  }
  // On a computer the parts are as tall as the words, at least 420 px and at most the window, each shrunk whole
  // to fit the row down to about 110 px wide, past which the row scrolls. On a phone each is a small picture.
  function layout(c) {
    const wide = WIDE.matches, bar = document.querySelector('.bar'), verdict = c.item.querySelector('.verdict');
    const H = Math.min(Math.max(420, c.words.offsetHeight + (verdict ? verdict.offsetHeight : 0)), Math.max(240, window.innerHeight - (bar ? bar.offsetHeight : 0) - 32));
    c.el.style.height = wide ? H + 'px' : '';
    const room = wide ? H - 32 - 30 : 112;
    const sized = c.parts.map(function (p) {
      if (p.clip.classList.contains('big')) return null;
      const s = natural(p);
      if (!s.w || !s.h) return null;
      s.p = p;
      s.k = !wide ? (p.paged ? 84 / s.w : Math.min(84 / s.w, 112 / s.h))
        : p.paged ? Math.min(1, room / Math.min(s.h, FIRST_SCREEN)) : Math.min(p.kind === 'draw' ? 1.25 : 1, room / s.h);
      return s;
    }).filter(Boolean);
    if (wide) shrink(sized, c.stage.clientWidth - 32 - 16 * (c.parts.length - 1));
    sized.forEach(function (s) {
      const p = s.p;
      if (p.paged) frameAt(p, s.w, s.h, s.k); else p.clip.style.setProperty('--f', BASE * s.k + 'px');
      const h = s.h * s.k, shown = wide ? Math.min(room, Math.ceil(h)) : 112;
      p.clip.style.height = wide ? shown + 'px' : '';
      p.fig.style.width = wide ? Math.ceil(s.w * s.k) + 2 + 'px' : '';
      p.clip.classList.toggle('tall', h > shown + 2);
    });
  }
  // Parts too wide for the row shrink by one factor; one that would fall under 110 px keeps 110, and the rest share what is left.
  function shrink(sized, row) {
    let small = [], f = 1;
    for (let i = 0; i < sized.length; i += 1) {
      const rest = sized.filter(function (s) { return small.indexOf(s) < 0; });
      f = Math.min(1, (row - 110 * small.length) / Math.max(1, rest.reduce(function (t, s) { return t + s.w * s.k; }, 0)));
      const more = rest.filter(function (s) { return s.w * s.k * f < 110; });
      if (!more.length) break;
      small = small.concat(more);
    }
    sized.forEach(function (s) { s.k *= small.indexOf(s) >= 0 ? Math.min(1, 110 / (s.w * s.k)) : Math.max(f, 0); });
  }
  function counts(c) {
    c.parts.forEach(function (p) {
      const k = p.clip.querySelectorAll('.pin').length;
      p.count.textContent = k ? ' · ' + k : '';
      p.fig.setAttribute('aria-label', p.label + (k ? ', ' + plural(k) : '') + ', open full screen');
    });
  }
  all('.view', function (v) {
    const item = v.closest('.item'), c = { el: v, item: item, stage: v.querySelector('.stage'), words: item.querySelector('.words'),
      try: v.getAttribute('data-try') || '', at: 0, parts: [] };
    Array.prototype.forEach.call(c.stage.children, function (fig) {
      const cap = fig.querySelector('figcaption'), kind = fig.getAttribute('data-kind');
      const p = { fig: fig, clip: fig.querySelector('.clip'), el: fig.querySelector('.clip').firstElementChild, kind: kind, paged: kind === 'page' || kind === 'live', label: cap.textContent };
      p.count = document.createElement('span'); p.count.className = 'count'; cap.appendChild(p.count);
      fig.tabIndex = 0; fig.setAttribute('role', 'button');
      c.parts.push(p);
    });
    c.stage.addEventListener('click', function (e) {
      const fig = e.target.closest('.part');
      if (fig && !e.target.closest('.clip.big, [data-open]')) openViewer(c, partIndex(c, fig));
    });
    c.stage.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('part')) { e.preventDefault(); openViewer(c, partIndex(c, e.target)); }
    });
    if (window.ResizeObserver) { const watch = new ResizeObserver(queue); watch.observe(c.words); watch.observe(c.stage); }
    views.push(c);
  });
  const partIndex = function (c, fig) { return c.parts.map(function (p) { return p.fig; }).indexOf(fig); };
  // A picture file is as wide in em as its file is in px, so it scales like a drawing.
  all('.art.photo img', function (img) {
    const size = function () { if (img.naturalWidth) { img.style.width = img.naturalWidth / BASE + 'em'; queue(); } };
    if (img.complete) size(); else img.addEventListener('load', size);
  });
  // A note's target shows: folded words unfold.
  function reveal(el) {
    folds.forEach(function (f) { if (f.text === el && !f.open) { f.open = true; measure(f); } });
  }

  // ── full screen: one part over everything, the card's labels on top, its changes at the foot; it zooms and scrolls natively ──
  const vtop = viewer.querySelector('.vtop'), vfoot = viewer.querySelector('.vfoot'), names = viewer.querySelector('.names');
  const vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button'), sizes = viewer.querySelector('.sizes'), tryIt = viewer.querySelector('.try');
  const V = { f: BASE, lo: BASE, hi: BASE };
  const HINTS = { draw: ['Drag to move · pinch or + to zoom', 'tap a line or picture to note it'], photo: ['Pinch or + to zoom', 'tap a spot to note it'],
    page: ['Scroll to read', 'tap a spot to note it'], live: ['Try it here: it sends nothing', ''] };
  function big() { return view && view.c.parts[view.i]; }
  function scale(f, cx, cy) {
    const box = big().clip;
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (box.scrollLeft + cx) * k - cx, y = (box.scrollTop + cy) * k - cy;
    V.f = f; box.style.setProperty('--f', f + 'px');
    box.scrollLeft = x; box.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  // A drawing fits the screen's width; a picture fits whole; a page or live card shows at the picked width, shrunk to fit.
  function fitBig() {
    const p = big();
    root.style.setProperty('--vtop', vtop.offsetHeight + 'px'); root.style.setProperty('--vfoot', vfoot.offsetHeight + 'px');
    const aw = p.clip.clientWidth - 24, ah = p.clip.clientHeight - 24;
    V.f = V.lo = V.hi = BASE;
    if (p.paged) {
      const w = PAGE_W[view.c.at], k = Math.min(1, aw / w), f = p.el.querySelector('iframe');
      frameAt(p, w, p.kind === 'live' ? ah / k : pageH.get(f) || ah / k, k);
      return;
    }
    p.clip.style.setProperty('--f', BASE + 'px');
    const w = p.el.offsetWidth, h = p.el.offsetHeight;
    if (!w || !h || aw <= 0) return;
    V.lo = BASE * (p.kind === 'draw' ? aw / w : Math.min(aw / w, ah / h)); V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    p.clip.scrollLeft = p.clip.scrollTop = 0;
    scale(V.lo, 0, 0);
  }
  function openViewer(c, i) {
    hideChip();
    if (view) big().clip.classList.remove('big');
    view = { c: c, i: (i + c.parts.length) % c.parts.length };
    const p = big(), hint = HINTS[p.kind];
    viewer.hidden = false; document.body.classList.add('viewing');
    names.innerHTML = c.parts.map(function (q, k) {
      return '<button type="button" class="name" role="tab" data-i="' + k + '" aria-selected="' + (k === view.i) + '">' + esc(q.label) + '</button>';
    }).join('');
    viewer.querySelector('.vhint').innerHTML = esc(hint[0]) + (hint[1] ? '<span class="note-it"> · ' + esc(hint[1]) + '</span>' : '');
    vbar.hidden = p.paged; sizes.hidden = !p.paged; tryIt.hidden = !c.try;
    if (c.try) tryIt.href = c.try;
    Array.prototype.forEach.call(sizes.children, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-size') === c.at)); });
    p.clip.classList.add('big');
    layout(c); fitBig();
    viewer.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const c = view.c, p = big();
    p.clip.classList.remove('big'); p.clip.scrollLeft = p.clip.scrollTop = 0;
    view = null; c.at = 0;
    viewer.hidden = true; document.body.classList.remove('viewing');
    layout(c); bar();
    if (restore) p.fig.focus({ preventScroll: true });
  }
  viewer.querySelector('[data-close]').addEventListener('click', function () { closeViewer(true); });
  names.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) openViewer(view.c, +b.getAttribute('data-i')); });
  sizes.addEventListener('click', function (e) {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    view.c.at = +b.getAttribute('data-size');
    Array.prototype.forEach.call(sizes.children, function (s) { s.setAttribute('aria-pressed', String(s === b)); });
    fitBig();
  });
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target), box = big().clip;
    if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], box.clientWidth / 2, box.clientHeight / 2);
  });
  const zoomable = function (e) { return view && !big().paged && e.target.closest && e.target.closest('.clip.big'); };
  document.addEventListener('wheel', function (e) {
    if (!zoomable(e) || (!e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    const r = big().clip.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively, or swipes to the next part at fit; two fingers pinch around their midpoint.
  // A swipe starts only on the shown part, so a swipe along the scrolling label row keeps the part.
  let pinch = null, swipe = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  document.addEventListener('touchstart', function (e) {
    const t = e.touches, on = e.target.closest && e.target.closest('.clip.big');
    swipe = view && on && t.length === 1 ? { x: t[0].clientX, y: t[0].clientY } : null;
    if (zoomable(e) && t.length === 2) pinch = { f: V.f, dist: span(t) };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = big().clip.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    const s = swipe, t = e.changedTouches[0];
    if (e.touches.length < 2) pinch = null;
    swipe = null;
    if (!s || !view || !t || V.f > V.lo * 1.001) return;
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(t.clientY - s.y)) openViewer(view.c, view.i + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });

  // ── page parts: a page posts its height at 1 px tall; a cover over it takes taps ──
  // A page frame is sealed from this page, so the kit's one script in it posts its height, and the link under a point.
  // Only a message from one of this page's own page frames counts; a height for an old width is dropped.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || (m.type !== 'review:page' && m.type !== 'review:link')) return;
    const f = Array.prototype.find.call(document.querySelectorAll('.page iframe'), function (x) { return x.contentWindow === e.source; });
    if (!f) return;
    if (m.type === 'review:link') {
      const cover = f.parentNode.querySelector('.cover'), href = typeof m.href === 'string' ? m.href.slice(0, 2000) : '';
      if (cover) { cover.title = href; cover.style.cursor = href ? 'pointer' : ''; }
      return;
    }
    if (typeof m.h !== 'number' || !isFinite(m.h) || typeof m.vh !== 'number' || m.w + 'px' !== f.style.width) return;
    const h = Math.max(1, Math.min(PAGE_MAX, Math.round(m.h)));
    // A height counts only when measured 1 px tall; a page past its full-height frame grew late, so it measures again.
    if (m.vh > 1) {
      if (m.vh === pageH.get(f) && h > m.vh && pageOver.get(f) !== h) { pageOver.set(f, h); f.style.height = '1px'; }
      return;
    }
    pageH.set(f, h); f.style.height = h + 'px';
    if (!f.parentNode.querySelector('.cover')) f.parentNode.insertAdjacentHTML('beforeend', '<span class="cover"></span>');
    queue();
  });
  // A link in a page goes nowhere: hovering over it shows its address.
  document.addEventListener('mousemove', function (e) {
    const cover = e.target.classList && e.target.classList.contains('cover') ? e.target : null, f = cover && cover.parentNode.querySelector('iframe');
    if (!f || !f.contentWindow) return;
    const r = cover.getBoundingClientRect(), k = r.width / f.offsetWidth;
    f.contentWindow.postMessage({ type: 'review:point', x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }, '*');
  });

  // ── long words fold after about two lines behind More, on a phone only; a note on hidden words unfolds them ──
  const folds = [];
  function measure(f) {
    // The fold never cuts the bold first sentence: it keeps at least the lines that sentence takes.
    f.text.classList.remove('folded');
    f.more.style.top = '';
    if (WIDE.matches) { f.more.hidden = true; return; }
    const lead = f.clamp.querySelector(':scope > b:first-child'), line = parseFloat(getComputedStyle(f.clamp).lineHeight) || 24;
    const leadLines = lead ? Math.ceil((lead.getBoundingClientRect().bottom - f.clamp.getBoundingClientRect().top - 1) / line) : 0;
    f.clamp.style.webkitLineClamp = String(Math.max(2, leadLines));
    f.text.classList.add('folded');
    const long = f.clamp.scrollHeight > f.clamp.clientHeight + 2;
    f.text.classList.toggle('folded', long && !f.open);
    f.more.hidden = !long;
    f.more.textContent = f.open ? 'Less' : 'More';
    f.more.setAttribute('aria-expanded', String(f.open));
    // Folded, More sits on the last shown line, at its end.
    if (long && !f.open) f.more.style.top = f.clamp.offsetTop + f.clamp.clientHeight - line + 'px';
  }
  all('.items > .item .text', function (text) {
    const clamp = document.createElement('span'), more = document.createElement('button'), f = { text: text, clamp: clamp, more: more, open: false };
    clamp.className = 'clamp';
    while (text.firstChild) clamp.appendChild(text.firstChild);
    text.appendChild(clamp);
    more.type = 'button'; more.className = 'more';
    text.appendChild(more);
    more.addEventListener('click', function () { f.open = !f.open; measure(f); });
    folds.push(f);
    measure(f);
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length || replies().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: the files a need asks for, sent with the notes under their question; a sent file never goes again ──
  const asker = function (id) { return 'Need #' + /^need-(\d+)/.exec(id)[1]; };
  function answered(q) { const id = q.getAttribute('data-q'); return !!(data.files[id] && data.files[id].length); }
  // Each question with files the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
      if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
        line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, to try; it sends this page nothing ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) return;
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) f.remove(); else mount(c);
    });
    c.box.replaceChildren(f);
    queue();
  }
  // The card's view sizes the frame; a live card never moves, since a moved frame loads again.
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), said = document.createElement('p');
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, doc: old.getAttribute('srcdoc'), title: old.title, said: said, resets: 0 };
    box.closest('.item').querySelector('.words').appendChild(said);
    cards.push(c);
    mount(c);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      folds.forEach(measure);
    }
    queue();
    if (view) fitBig();
    if (open) place();
    bar();
  });
  window.addEventListener('load', queue);
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
