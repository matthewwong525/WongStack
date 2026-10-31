---
title: It doesn't know how your business works
problem: Your AI guesses at your processes, because nobody wrote them down where it reads.
fix: Your know-how is written down once, in pages the AI reads before it works.
order: 2
checked: 2026-10-31
sources:
  - wiki/agent-knowledge-center.md
  - wiki/wiki-style.md
---
Add a knowledge base of how my business works to my AI setup. Build it in this project and ask me before anything you can't undo:

> Keep a folder of plain text pages in this project: how we work, our people, the company, the product, our customers
> One start page links down to every section, and each section page links down to its details
> The AI starts at the top and reads only as deep as the task needs
> Each topic lives on exactly one page; other pages link to it, so no copy goes stale
> Give every page a clear title and a first sentence that says what it is
> Title a page by its topic, not by its step in a process, so it can move without going stale
> Link every page, tool, or document where you name it
> Every page links up to its parent, and every parent links all its children
> Keep pages short, and split a long one by its sections
> Only write a fact that will help a future task, not just this one
> One-off decisions stay with the plan for that change, not in the pages
> Write it when you learn it, in the same chat, and cite the source
> Start empty: the first fact on a topic makes its page
> Each person gets a page with their email and how they like work done
> Different people's preferences are not contradictions: keep each on their own page
> Private life stays out of a shared knowledge base
> Edits to the pages go through the same review as code
> If a step runs the same way every time, write it as a script, not a page
> Keep the always-loaded instructions short, and put details in pages the AI opens when needed
> Short sentences, plain words, active voice: write for a reader who knows nothing
> A regular pass merges duplicates, fixes links, and prunes stale text: the newest fact wins
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/agent-knowledge-center.md)
