# WongStack

WongStack turns a repo into an AI knowledge center.

Agents need shared knowledge to do useful work. WongStack helps teams centralize their processes inside the repo, then gives AI agents a repeatable way to run those processes, improve them, and capture new knowledge as work happens.

That is the first step toward becoming AI-native: make the process visible, make it runnable, and let every project leave the next person or agent smarter than the last one.

## Start here

Open your project folder in Claude Code, Codex, Cursor, or another coding agent that can read files, edit files, run shell commands, and ask you questions. An empty folder is fine. Then paste this:

```
Read and follow
https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.claude/skills/wong-setup/SKILL.md
to install WongStack in this repo and walk me through the first workflow.
```

The agent will take it from there. It will look at your project, explain what it is about to set up, ask before changing files, and leave you with the first process to run.

## What you get

- **Centralized process memory.** Your team's way of working lives in the repo, not scattered across chats, docs, and people's heads.
- **Agent-runnable workflows.** Agents get concrete commands for exploring, planning, implementing, saving, resuming, and shipping work.
- **Knowledge captured while work happens.** Plans, decisions, shipped records, and reusable lessons are written down as part of the workflow.
- **Faster future work.** Each finished change improves the context available to the next teammate or agent.
- **A reviewable work trail.** Work can be saved in a package your team can inspect before it becomes part of the main project.
- **Agent-agnostic foundations.** Claude Code is one way to run WongStack. The durable system is files, instructions, and process inside the repo.

## The compounding loop

WongStack is built around one idea: centralize the process, let agents run it, then improve the process from what the work teaches you.

```text
centralize process
        |
        v
make it agent-runnable
        |
        v
capture plans and decisions
        |
        v
preserve reusable lessons
        |
        v
future work starts with more context
```

The code is one output. The more durable value is the knowledge system that makes the next change easier.

## The workflow

WongStack gives agents a small set of commands that match how work moves from idea to finished record:

```text
/explore -> /plan -> /apply -> /save -> /continue -> /ship
```

| Command | Plain-language meaning |
| --- | --- |
| `/explore` | Think through the idea before deciding what to do. |
| `/plan` | Write the plan, tasks, and important decisions. |
| `/apply` | Do the planned work. |
| `/save` | Save the work for review and future continuation. |
| `/continue` | Pick work back up later, even from another machine or session. |
| `/ship` | Finish the change and preserve the record of what shipped. |
| `/dream` | Save reusable lessons and team conventions into the wiki. |
| `/improve` | Ask an agent to audit the project and write improvement plans without changing code. |
| `/wong-sync` | Update WongStack and, when useful, contribute general workflow improvements back upstream. |

## Where the knowledge lives

- **Agent instructions** tell future agents how to work in the repo.
- **The wiki** holds reusable team process and conventions.
- **Active changes** hold the plan, tasks, status, and decisions for work in progress.
- **Archived changes** preserve what shipped and why.
- **Skills** are repeatable workflows agents can run.

For the deeper philosophy, read [AI knowledge centers](wiki/agent-knowledge-center.md). For the operational loop, read [the change loop](wiki/development/the-change-loop.md).

## A few terms the agent may introduce

You do not need these before starting, but they help explain what WongStack sets up:

- **Repo:** the project folder plus its saved history.
- **Pull request:** a reviewable package of work. It lets you or your team inspect what changed before it becomes part of the main project.
- **CI:** automated checks that may run on saved work, such as tests or linting. If your project has them, WongStack pays attention to them.
- **OpenSpec:** the planning layer WongStack uses to write down what is being built and what shipped.
- **Wiki:** the repo's place for reusable team knowledge and conventions.

## Learn more

- [Wiki](wiki/README.md) - the progressive-disclosure guide to WongStack's process.
- [AI knowledge centers](wiki/agent-knowledge-center.md) - the philosophy behind the repo-native knowledge layer.
- [The change loop](wiki/development/the-change-loop.md) - how work moves from idea to shipped record.
- [Working on WongStack](wiki/development/README.md) - how to change the toolkit itself.
- [Changelog](CHANGELOG.md) - what changed between releases.

## Requirements

The setup prompt can help with missing pieces, but WongStack is designed around:

- A coding agent that can read files, edit files, run shell commands, and ask questions.
- A GitHub repo. If you are starting from an empty folder, setup can walk you through creating one.
- [`gh`](https://cli.github.com/) and `jq`.
- [Node.js](https://nodejs.org/) for the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI.

## Prefer to work from the source?

Clone this repo and the commands are live here:

```bash
git clone https://github.com/matthewwong525/WongStack && cd WongStack
```
