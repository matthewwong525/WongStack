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
- [The 60-minute default is a guess] → Task 6.1 measures it before the change ships.

## Migration Plan

A major release. The update removes `skills/dream-memory/` from an install through the payload file list. The first tidy after the update reads the last dream or tidy record and goes on from there. Rollback is the previous version: the records it wrote still read as tidy records.

After the merge, `/ship` checks one thing the build can't: the next day's first chat here starts a tidy, and its `Last tidy` line shows counts and map numbers from the full check.
