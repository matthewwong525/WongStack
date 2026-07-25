# AI knowledge centers

An AI knowledge center is a repo where the team's processes, active work, shipped decisions, and reusable lessons are written in forms that humans can review and agents can run.

Agents need shared knowledge to function well. If the process lives in chat history, scattered docs, or one person's head, the next agent starts cold. WongStack centralizes that process inside the repo, then gives agents repeatable workflows for running it and improving it as work happens.

## The model

```text
process scattered across people, chats, and tools
        |
        v
centralized process in the repo
        |
        v
agent-runnable workflow
        |
        v
knowledge captured during execution
        |
        v
better future work
```

This is the practical transition toward AI-native work: make the process visible, make it runnable, and let each project leave more context for the next teammate or agent.

## What each surface owns

- **Agent instructions** orient the agent before it acts. In WongStack, [`CLAUDE.md`](../CLAUDE.md) carries the repo-specific overview plus the generic WongStack rules. Repos that use other agents can add an `AGENTS.md` pointer to the same skills and process.
- **The wiki** owns reusable process and conventions. Its structure is governed by [the wiki rulebook](wiki-style.md): one topic per page, progressive disclosure, and generous links.
- **Active changes** own work in progress. Each [change loop](development/the-change-loop.md) plan lives under `openspec/changes/<name>/` with its tasks, status, and decision log.
- **Archived changes** own what shipped and why. They preserve the change-specific record after the work is done.
- **Skills** are repeatable workflows agents can run. They turn the process into commands such as `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/dream`, `/improve`, and `/wong-sync`.

## Why this compounds

Work gets faster when the next agent starts with more context than the last one. WongStack captures that context in two places:

- change-specific knowledge stays with the active or archived OpenSpec change;
- reusable process knowledge moves into the wiki through `/dream`.

That split keeps the knowledge center useful. A one-off implementation decision does not clutter the wiki, and a reusable convention does not stay buried in a finished change.

## Where to go next

Start with [the change loop](development/the-change-loop.md) to see how work moves from idea to shipped record. Use [the wiki rulebook](wiki-style.md) when adding or reorganizing reusable process knowledge.
