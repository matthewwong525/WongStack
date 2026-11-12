---
title: You explain your business again every day
problem: Each new chat starts from zero, so you explain your business again.
fix: Each chat saves what it learned, and the next one starts knowing it.
order: 1
checked: 2026-11-12
sources:
  - wiki/development/memory.md
  - .agents/plugins/memory/SKILL.md
---
Add a memory system to my AI setup. Build it in this project and ask me before anything you can't undo:

> Keep short facts from each chat in a small database outside the project files
> Each fact is one short line with a type: who I am, how I want work done, a decision, a pointer, or an open question
> Each fact names its topic, its author, its date, and the chat it came from
> Never edit or delete a fact: a newer fact replaces it, and the old one stays searchable
> Keep each chat's transcript too, with keys and passwords blanked out, so every fact traces back
> Decisions and open questions are shared with the team; personal facts stay with their owner
> At the start of each chat, load a short digest of threads, not facts: open questions on this task, the topic list, the topics that moved this week, and my new preferences
> Build the digest with plain code, no AI, so it is fast and the same every time
> Keep the digest small, and say how many facts it left out
> Before the first edit in a folder, show that folder's open questions and newest facts
> Map folders to topic tags in one file, so a fact about code reaches the next change there
> Treat each company page as a topic: list them in the digest, one line each, and when a message names one, show its summary
> Before big work, run one search across facts and documents, then read the originals it cites
> Pull one topic, folder, plan, or fact to see everything it links to: pages, plans, open questions, decisions, and related topics
> Find related topics fresh on each pull, from the facts and plans they share, so no saved list goes stale
> For a task that spans topics, a helper follows those links within set limits and returns a short brief
> When a chat ends, save its facts in the background, and catch up chats that never ended cleanly
> Before each write, show the closest existing facts: add, replace, or drop
> Every open question names who checks it next, so none is left without an owner
> Note where the assistant struggled, so a regular review can fix the cause
> Close an open question nobody answered after 30 days, with a note saying so
> The first chat each day starts a background tidy, once a day per person, with an off switch
> The tidy merges duplicates and settles contradictions: the newest fact wins
> It moves facts that stay true into the written guides, links related topics there in one sentence, and retires stale ones
> It works in a throwaway copy, has a time limit, and publishes only through the normal checks
> A fact is dated context: when it disagrees with the code, the code wins
> Search by keywords and tags first; add meaning-based search only when keyword search misses
> Keep a set of test questions that search must answer, and run it on every change
> If the memory store is down, say facts were not loaded and carry on
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/development/memory.md)
