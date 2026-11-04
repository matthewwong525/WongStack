---
title: Switch AI apps and you lose your whole setup
problem: Your instructions, memory, and tools live inside one AI app, so switching starts you over.
fix: Your setup lives in your own folder, in files any AI can read.
order: 7
checked: 2026-11-01
sources:
  - AGENTS.md
  - wiki/maintaining/repo-layout.md
  - wiki/development/required-tools.md
---
Make my AI setup portable. Build it in this project and ask me before anything you can't undo:

> Keep the whole setup in this project's folder, saved in version control
> One instruction file holds the rules every AI reads at the start of each chat
> Point each AI's own instruction file name at that one file, so there is no second copy
> Keep skills as plain text runbooks in one folder, and link each AI's skills folder to it
> Rules for one kind of file load only when the AI touches those files
> Keep the always-loaded text short, and measure it on every change, so it can't grow unnoticed
> Put details in pages and skills the AI opens only when a task needs them
> Memory lives in a store you own, reached by one script any AI can run
> Plans, decisions, and records are plain files beside the code
> Use few tools: version control, its command line, one runtime, and a plain web request tool
> Scripts use only the runtime's built-in parts, with no extra packages
> Install a tool only when a step needs it, and ask first
> Any AI that can read files, edit files, and run commands can do the work
> Name a chat app or an AI as an example, never as a requirement
> Keep your keys and data in accounts you own, never in the AI app
> Switching AI apps then means opening the same folder in the new one
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at AGENTS.md)
