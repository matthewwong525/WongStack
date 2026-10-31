---
title: What one person teaches it, the team never gets
problem: Each teammate's AI learns alone, so the rest of the team starts from zero.
fix: One shared memory and knowledge base that every teammate's AI uses.
order: 5
checked: 2026-10-31
sources:
  - wiki/development/memory.md
  - wiki/wiki-style.md
  - .agents/skills/close/SKILL.md
---
Add shared team learning to my AI setup. Build it in this project and ask me before anything you can't undo:

> Keep one shared memory store for the project that every teammate's AI reads and writes
> Each person's AI reaches it with that person's own access, checked on every call
> Decisions, open questions, and links are shared with the whole team
> Personal preferences and chat transcripts stay with their owner; an admin can see everything
> Removing a person from the project ends their memory access at once
> Every chat starts with a short digest of the team's open questions and recent decisions
> Every fact names who wrote it, when, and in which chat
> Keep the team's lasting know-how as plain pages in the project, reviewed like code
> Each teammate gets a page: their email, their preferences, and how they like work done
> When a chat ends, write its result and what is left as facts, then move lasting facts onto the pages
> Those page edits go through their own review, so a person checks them
> Catch chats nobody wrapped up with a background run, so nothing is lost
> Open questions name who checks them next, so the next teammate picks them up
> Newest wins between facts about the same person or the whole team
> Different people's preferences are not contradictions: keep each on their own page
> A regular pass merges duplicate facts and moves lasting ones to the pages
> Something personal said in a work project stays in that project, where an admin can read it
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/development/memory.md)
