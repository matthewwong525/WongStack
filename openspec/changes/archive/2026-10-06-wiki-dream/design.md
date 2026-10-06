# Design

## Context

See proposal.md for why. What shapes the approach:

- **The skill file is short on purpose.** After the skills' text limit was reached twice, `SKILL.md` keeps the commands and the order, and `wiki/development/wiki-dream.md` owns how a dream adds, cleans, and checks sources.
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
