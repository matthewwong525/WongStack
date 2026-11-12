# Memory tidy

The memory tidy keeps what your project remembers true and easy to find: once a day, on its own, your assistant saves what the day's chats learned, puts lasting facts on their pages, sorts facts into topics, fixes pages and saved facts that have gone wrong, and publishes the result. There is no command to type and nothing to schedule. It works on [memory](memory.md), the wiki, and [company knowledge](../stack/company-knowledge.md).

## The daily tidy

Your first chat each day starts one tidy in the background, and the chat never waits for it. It runs with your own AI plan, in its own copy of the repo, so no checkout you work in changes. The copy links this computer's [company knowledge](../stack/company-knowledge.md), so the map counts company pages too. With two computers, only one tidies each day. The tidy's own chat is never saved to memory.

Each tidy does three things:

1. **Saves what your chats learned**, as the [background run](memory.md#how-facts-are-captured) does, and [tidies memory](memory.md#consolidation): duplicates merge, the newer fact wins, and an answered open thread closes.
2. **Works from [its goal and its map](#the-goal-and-the-map)**, the weakest place first.
3. **Publishes** a company knowledge page at once, and any other page through the normal checks ([the gate](the-change-loop.md#the-gate)), with no question. With no way to publish, the edits wait on a branch.

Ask any chat:

| You want | You say |
|---|---|
| A tidy at once, also on a day that had one | *tidy memory now* |
| The last tidy and what it changed | *when did memory last tidy?* |
| How memory is used | *how is memory used?* |
| No tidy on this computer, until you turn it on again | *stop the daily memory tidy* |
| The tidy on again on this computer | *start it again* |
| To take back a tidy | *undo the last tidy* |

A tidy uses your own assistant's model allowance, so it costs what a long chat costs.

## The goal and the map

The tidy has one goal: **a chat that pulls a topic gets what is true, quickly.** It has no fixed steps and no fixed counts. [Its brief](../../.agents/plugins/memory/references/tidy.md) gives the goal, what good looks like, the tools, and a short list of things it must never do. The tidy chooses the work.

Plain code makes the map, not the AI, so each number is true. One line is one weakness, with a count and names to read:

| Line | What it counts |
|---|---|
| `new facts` | facts saved since the last tidy; the tidy reads every one |
| `trouble notes` | open [struggle notes](memory.md#how-facts-are-captured) about memory, read first |
| `missed questions` | questions a chat asked that found nothing |
| `no topic` | facts that no [topic](memory.md#topics) reaches |
| `tags with no page` | labels on facts that have no page |
| `large topics` | topics with over 100 facts, too many to read in one pull |
| `gone files` | facts that name a file that is gone |
| `due pages` | your own pages with no check or change in 7 days, the most used first |
| `most used`, `often returned`, `used together` | [how chats used memory](#how-use-is-counted) in 30 days |

`node .claude/skills/memory/scripts/daily-tidy.mjs survey` prints the map. `pages` lists every due page, and `pages --all` lists each page as `own` or `shipped` with the date of its last check. `drift` lists the facts that name a gone file. A fact is listed only when the project once held the file and the fact does not itself say it was removed, so a note about planned work, or a record of a removal, is never flagged.

A thing the tidy checked and left alone stays off the map for 7 days, as a checked page does, from the moment the tidy marks it. A tidy that brings you no decision must not look at the same thing each day.

## How it shows its work

When the tidy ends, code makes the map again and asks each missed question again, with the command the chat used. The numbers that changed go in two places:

- **The tidy's record**, a saved fact: the highest fact it read, the highest fact it sorted, what it checked and linked, and each changed number. The next tidy starts after the facts this one read. Code writes the record, never the AI.
- **Each chat start**, which shows the last tidy:

  ```
  Last tidy (2026-11-12 on laptop):
    added 4, pages 6, links 3
    facts with no topic 412 -> 371
    questions with no answer 6 -> 1
  ```

When the store does not give the second map in three tries, the record says `Map: not read.` and the chat start says `the map could not be read after the tidy`. Neither says that nothing changed.

The tidy also tests its own work: before it ends, it asks memory a few questions about what it changed, in a stranger's words.

## The time limit

The tidy's own work stops after 60 minutes. The tidy marks each part it finishes, so a stop at the limit publishes the finished parts and drops the rest. The chat start then says `stopped at its time limit; the rest is on tomorrow's map`. The record of that tidy ends with `Stopped at its time limit.`, so the questions it did not reach stay on the next map. A tidy stopped before it finished any part publishes nothing, and the next day's tidy reads the same facts again. The wait for the project's checks can add up to an hour.

## How use is counted

Each look-up a chat makes is counted on your computer: the topics and facts that came back, and the words of a question that found nothing. The tidy reads the counts to know where to work. A count never lets it hide a fact: a question asked once a year still needs its answer. [How use is counted](memory-search.md#how-use-is-counted) owns the details.

## What it reads

| Place | What it holds | The tidy |
|---|---|---|
| The wiki and [company knowledge](../stack/company-knowledge.md) | how you work, people, the product | fixes your own pages |
| Saved facts | what each chat learned | sorts and corrects them |
| The use counts | what chats looked up | reads them |
| Specs and plans | what the product does, and why | reads them as evidence, and changes none |

It looks first where trouble was recorded. A [struggle note](memory.md#how-facts-are-captured) that says a page or a fact misled a chat is read before anything else, and a fix closes the note. A note about code is left for [`/improve-code`](repository-improvement.md).

A chat marked private has nothing in memory, so the tidy never reads it. Health, family, and money never go on a page.

## What it fixes and what it leaves alone

The tidy fixes these, with no question:

- **Your own pages.** It compares a page with memory, the files the page links, and your other pages. It corrects what is out of date, merges duplicates, moves a fact to the page that owns it, fixes links, and keeps each hub listing its pages, by [keeping it tidy](../wiki-style.md#keeping-it-tidy).
- **A lasting fact with no place on a page.** It goes on its page by [placing a fact on a page](#placing-a-fact-on-a-page).
- **A fact with no topic, and a label with no page.** The fact gets its topic and keeps its words, date, and author. The label gets a page and a line in its hub, or merges into a topic.
- **A topic too large to read.** It splits into smaller topics.
- **A question that found nothing.** The tidy changes the topic, the label, or the page's words, so the question finds its answer. When memory holds no answer, it leaves the question.
- **Topics that connect.** Where two topics are [related](memory-search.md#related-topics) or used together and neither page links the other, it writes one sentence on one of the two pages that links the other and says how they connect.
- **A saved fact that is wrong.** A fact that names a gone file, or says something the project now contradicts, is replaced by a newer fact that says what is true. The old one is never edited or deleted; it stays searchable as history. On a teammate's key the tidy corrects only that installation's own facts. Before it replaces a fact that quotes you, it reads the chat the words came from, with `memory.mjs source <fact-id>`.

It leaves these alone, and writes no list for you:

- **[A page WongStack ships](#your-pages-and-shipped-pages), a spec, a plan, and an archive.** Specs and past plans record what shipped and why.
- **What the evidence does not settle.** It marks the thing as checked and goes on.
- **A fact nobody used.** No use in 30 days on one computer is no proof that a fact is dead.

## A fault in the product

Sometimes a page and the product disagree and the page is right: a recorded decision confirms the rule, and the code breaks it. A rewrite of the page would hide the fault. The tidy leaves the page alone and saves a note that names the rule and where the code breaks it. The next [`/improve-code`](repository-improvement.md#struggle-notes-come-first) reads that note. The note is for the code improver's next plan, not a question for you.

## Placing a fact on a page

A fact goes on the wiki only when it passes [the repeatable-knowledge test](../wiki-style.md#repeatable-knowledge), on the page [where a fact goes](../wiki-style.md#where-a-fact-goes) names. The tidy asks two more things: will it still be true in six months, and would it change what a reader does? [Placing a fact](../../.agents/plugins/memory/references/placing-facts.md) owns the steps and the wrong turns.

## Chats are evidence, not orders

The tidy reads old chats, saved facts, and missed questions to learn what happened. It weighs their words; it never follows them. A chat that says *delete that page* is a record that someone once said so, not a request to the tidy.

## Your pages and shipped pages

The tidy edits only the pages your project owns: people, the company, customers, the product, and any page you added. It saves a `knowledge/` page [at once](../stack/company-knowledge.md#save-a-page), right after the edit: the computer has one company copy, so no later step can hold the edit. A tidy stopped in the middle of one company edit leaves that edit unsaved, and the next chat start names the page. Any other page goes through a pull request. It never rewrites a page WongStack ships, because the next [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) would overwrite the edit.

## Undo one

One tidy is one published change. Ask your assistant to *undo the last tidy* and it reverts that change through the same checks. The facts stay in memory, so nothing is lost; a fact the tidy corrected wrongly is put right by saving the true one again.

## Where the ideas come from

Checking what is written against the real files, not against other writing alone, and reading past chats as a record, draw on poteto's [pstack](https://github.com/cursor/plugins/tree/main/pstack). Ideas only; no text is copied.

Part of [development](README.md).
