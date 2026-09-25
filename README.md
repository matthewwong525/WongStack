# WongStack

WongStack turns a repo into an AI knowledge center.

Agents need shared knowledge to do useful work. WongStack keeps a team's processes inside the repo, then gives agents a repeatable way to run those processes and write down what the work teaches.

This is one way of working, not the only one. [The principles behind it](wiki/agent-knowledge-center.md) explain the reasoning — adapt what fits your team.

## Start here

Make an **empty folder** and open it in Claude Code, Codex, Cursor, or another coding agent that can read files, edit files, run shell commands, and ask you questions. Have a free [Cloudflare](https://cloudflare.com) account ready. Then paste this:

```
Read and follow
https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md
to install WongStack in this folder and walk me through the first workflow.
```

The agent asks for one Cloudflare token first, with the [exact click path](wiki/stack/cloudflare-credentials.md#create-the-token). Then it uses the normal workflow: it asks how you work, plans the install, applies it, and saves the result. You end with the workflow, a starter app online at its own address, and session memory. Setup starts only from an empty folder; in a folder that already has files, it stops and says so.

## What you get

- **Process in the repo.** Your team's way of working lives in the repo, not scattered across chats, docs, and people's heads.
- **Commands agents can run.** Exploring, planning, implementing, saving, resuming, shipping, and recurring maintenance each have one.
- **A record written during the work.** Plans, decisions, shipped changes, and reusable lessons get written down as part of the workflow, not afterwards.
- **A reviewable work trail.** Work arrives as a package your team can inspect before it joins the main project.
- **More context for the next change.** Each finished change leaves the repo knowing more than it did.
- **No lock-in to one agent.** Claude Code is one way to run WongStack. The durable part is the files, instructions, and process in the repo.

## How the pieces fit

Keep the process in the repo, let agents run it, then improve the process from what the work teaches you.

```text
process in the repo
        |
        v
agents can run it
        |
        v
plans and decisions captured
        |
        v
reusable lessons kept
        |
        v
next change starts with more context
```

The code is one output. The other is a repo that makes the next change easier.

## The workflow

WongStack gives agents a small set of commands that match how work moves from idea to finished record:

```text
/explore -> /plan -> /apply -> /save -> /continue -> /ship
```

Those are the durable stages, but you do not have to invoke every one. After `/explore`, you can run `/apply` directly: if the current work has no apply-ready change, it runs `/plan` first and then implements that exact plan. Invoke `/plan` yourself when you want to review the artifacts before implementation. Every plan includes a standalone `review.html` where people can see each change, annotate it, and copy feedback. WongStack's skills call the OpenSpec CLI to maintain the plan and shipped records.

| Command | Plain-language meaning |
| --- | --- |
| `/explore` | Think through the idea before deciding what to do. |
| `/plan` | Write the plan, tasks, decisions, and interactive review page. |
| `/apply` | Ensure the current work has a plan, do it, then automatically save it once every task is complete. |
| `/save` | Save a checkpoint for review and future continuation at any time — including a plain conversation, whose facts go to the memory store with no branch or PR. |
| `/continue` | Pick work back up later, even from another machine or session. |
| `/ship` | Finish the change and preserve the record of what shipped. |
| `/improve [area]` | Review recent work and one rotating area, then ship one supported maintenance improvement. Add `--audit-only` for findings without edits. |
| `/wong-sync` | Get the latest WongStack source and plan the update, ending at a review page you can read. |

Setup also turns on [session memory](wiki/development/memory.md): a private store on your Cloudflare account that every session reads at start and that captures sessions you never saved. It puts the project online with the [Cloudflare stack](wiki/stack/README.md): every change gets its own preview link, and merging deploys it.

## Where the knowledge lives

- **Agent instructions** tell future agents how to work in the repo.
- **Session memory** keeps short facts from every session — saved or not — outside the repo, and loads a digest of them when the next session starts.
- **The wiki** holds reusable team process and conventions.
- **Active changes** hold the plan, tasks, status, and decisions for work in progress.
- **Archived changes** preserve what shipped and why.
- **Skills** are repeatable workflows agents can run.

For the principles behind these choices, read [AI knowledge centers](wiki/agent-knowledge-center.md). For the operational loop, read [the change loop](wiki/development/the-change-loop.md).

## A few terms the agent may introduce

You do not need these before starting, but they help explain what WongStack sets up:

- **Repo:** the project folder plus its saved history.
- **Pull request:** a reviewable package of work. It lets you or your team inspect what changed before it becomes part of the main project.
- **CI:** automated checks that may run on saved work, such as tests or linting. If your project has them, WongStack pays attention to them.
- **OpenSpec:** the planning layer WongStack uses to write down what is being built and what shipped.
- **Wiki:** the repo's place for reusable team knowledge and conventions.

## Learn more

- [Wiki](wiki/README.md) - the progressive-disclosure guide to WongStack's process.
- [AI knowledge centers](wiki/agent-knowledge-center.md) - the six principles behind WongStack, and the mechanism that applies each one.
- [The change loop](wiki/development/the-change-loop.md) - how work moves from idea to shipped record.
- [Working on WongStack](wiki/development/README.md) - how to change the toolkit itself.
- [Changelog](CHANGELOG.md) - what changed between releases.
- [Security](SECURITY.md) - how to report a vulnerability, and what each Cloudflare token can do.

## Requirements

The setup prompt can help with missing pieces, but WongStack is designed around:

- A coding agent that can read files, edit files, run shell commands, and ask questions.
- An empty folder. Setup creates the GitHub repo for it.
- A [Cloudflare](https://cloudflare.com) account (the free plan works) and one **user token** with two permissions. The token grants itself only the permissions each setup step needs, tells you what it granted, and can be narrowed back afterward. It stays in the git-ignored `.env` on your computer; CI gets a separate token that can only deploy. [The credentials page](wiki/stack/cloudflare-credentials.md) has the click path and the full list.
- [`gh`](https://cli.github.com/), authenticated. (That plus `git` and `openspec` is the whole toolchain — no `jq` or other tools required.)
- [Node.js](https://nodejs.org/) for the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI.

## Prefer to work from the source?

Clone this repo and the commands are live here:

```bash
git clone https://github.com/matthewwong525/WongStack && cd WongStack
```

## License

WongStack is released under the [MIT License](LICENSE).
