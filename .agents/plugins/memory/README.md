# Memory

Memory gives your AI assistant a private store of short facts that each chat learns and the next chat reads at start: decisions, preferences, open questions, and the topics your repo is about. It works in Claude Code and Codex, and it never names a database: your repo connects it to a store through one profile file.

## Add it to your project

Paste this message into a chat in your project, in any AI tool:

> Add WongStack's memory to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/memory/references/setup.md

The AI copies this folder into your project, finds or builds a store, writes the profile, runs the store check, and saves the work. It asks you before each step that costs money or makes something public, and before it pushes. Until then, each new chat asks you once: *Memory isn't set up yet. Set it up now?*

A [WongStack](https://github.com/matthewwong525/WongStack) project already has memory: it comes with each update. The guide stops there and changes nothing.

## Update it

Paste this message:

> Update WongStack's memory in this project. Follow the update steps at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/memory/references/setup.md#update

It keeps your own edits to this folder. When one of your edits and a new change touch the same lines, it changes nothing and names each file.

## What you get

- **A digest at chat start**: open questions on your current work, your topics and the ones that changed lately, your own page, and the preferences you stated since the last tidy.
- **Capture**: when a chat ends, a background run saves what it set out to do, what got done, and what is left.
- **Topics that link**: a message that names a topic gets the topic's one-line summary. `memory.mjs pull <topic>` shows its page, related topics, changes, open questions, and decisions, each a name you can pull next.
- **A memory helper**: for a task that spans topics, a helper follows [these steps](references/recall-helper.md) and gives back a short brief with sources.
- **A warning before the first edit in a folder**, from the facts about that folder.
- **A daily tidy**: your first chat each day starts it in the background. It merges facts, puts lasting facts on their topic's page, links topics that connect, and checks a few old pages. `/memory:dream-memory` runs a full check at any time.

Who sees which fact is the store's decision, never the plugin's.

## What it needs

- **Node 20 or newer** on each computer.
- **This folder** at `.claude/skills/memory/`, as a real folder. Claude Code loads it from there, with no install step.
- **A profile**: `.agents/memory/profile.mjs`, outside this folder, so an update never touches it. It says which store to use and how this computer signs in.
- **A store** that passes the check in [`store/contract.mjs`](store/contract.mjs): your own server, a route in your app, or a new one.
- **For Codex**, one install on each computer, run from your project's folder:

  ```bash
  codex plugin marketplace add <this project's folder>
  codex plugin add memory@wongstack
  ```

[How WongStack uses memory](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/memory.md) explains the store, who sees what, and capture in full.
