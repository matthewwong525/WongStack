---
title: It builds something you never asked for
problem: You ask for one thing, and your AI guesses the rest and builds it.
fix: It shows you a plan, with its guesses listed, and waits for your go.
order: 3
checked: 2026-10-31
sources:
  - wiki/development/the-change-loop.md
  - .agents/skills/plan/SKILL.md
---
Add a plan-first workflow to my AI setup. Build it in this project and ask me before anything you can't undo:

> Every code change starts as a plan in its own folder: why, what changes, design, and tasks
> Before writing the plan, read the code, the notes, and past decisions, then ask only what you can't find out
> Ask each question with a recommended answer first and two or three choices
> Log every answer in the plan's decision log, with the date
> Log every guess too, as an assumption with its reason, so I can see what you decided for me
> Write the why and what in plain words: what I will see or do, no file names
> Add a simple drawing or screen sketch for each change, so I can check it at a glance
> Turn the plan into one review page I can open on my phone
> Show each change as close to the real result as you can, so my go means I know what I get
> For a new or changed screen, build a quick throwaway copy with sample data and show a picture of each state beside today's screen
> Give each item on the review page an OK and a Change button, and let me note any spot or any words
> Before the tasks, ask whether a plain script could do the job instead of AI
> Stop at the plan: change no code until I say build
> Planning may change plans and notes only; building may change anything
> A message about a waiting plan updates the plan, not the code
> Build only what the plan says, in a fresh helper with no planning chatter
> Write all the code and its tests first, then run the checks once at the end
> Fix a problem alone only when the plan already settles what is right
> Ask me when a fix goes past the plan, weakens a check, can't be undone, or still fails after two tries
> A second agent reviews the build before I see it
> After the build, show me a preview and ask: publish it?
> The plan travels with the code, so any chat on any computer can pick it up
> Once published, archive the plan as the record of what shipped and why
> Work outside the code gets a short to-do instead, and asks before each step that leaves the chat
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/development/the-change-loop.md)
