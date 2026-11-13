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
- **A daily tidy**: your first chat each day starts it in the background, with no command to type. It works from a map of where memory is weak: it merges facts, puts lasting facts on their topic's page, links topics that connect, and checks your pages. Ask *tidy memory now* for one at once.
- **Use counts**: memory counts on your computer what each chat looks up and which question found nothing, and the tidy works where that helps most. Ask *how is memory used?* to see them.

## Who sees what

Who sees which fact is the store's decision, never memory's. Each repo's memory is its own: nothing goes to or loads from another repo. The store gives each person a role, checked on every call: an admin, a member, or a reader.

| What | You | Teammates | Admin |
|---|---|---|---|
| Decisions, open questions, and links (`project`, `thread`, `reference`) | yes | yes | yes |
| Facts about you: likes, habits, your life (`user`, `feedback`) | yes | no | yes |
| A reader's facts, of any type | the reader | no | yes |
| Your chats (transcripts) | yes | no | yes |

- **The store holds back what a teammate may not see**, however they ask. Only an admin's `--everyone` on `search`, `brief`, `show`, or `live` shows all; their own digest and search start with just their private facts. Author emails and people pages are labels only.
- **Private memory belongs to the person**, by their sign-in's subject, not their email: an email change keeps it, and two computers share it. Notes from before sign-in wait unassigned, seen only by admins, until moved.
- **Something personal you say in a work chat stays in that repo**, where the admin can read it. For anything no one else should see, use a repo only you use: there, you are the admin.

## What it needs

- **Node 20 or newer** on each computer.
- **This folder** at `.claude/skills/memory/`, as a real folder, linked into `.agents/skills/memory` for Codex. Claude Code and Codex load it from there, with no install step.
- **Its hooks in your project's settings**, `.claude/settings.json` and `.codex/hooks.json`, so the digest loads in every chat. The setup guide adds them.
- **A profile**: `.agents/memory/profile.mjs`, outside this folder, so an update never touches it. It says which store to use and how this computer signs in.
- **A store** that passes the check in [`store/contract.mjs`](store/contract.mjs): your own server, a route in your app, or a new one.

[How WongStack uses memory](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/memory.md) explains the store, who sees what, and capture in full.
