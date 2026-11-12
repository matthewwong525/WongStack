# Memory cleans itself each day, with no command to type

**Status:** in-progress
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
