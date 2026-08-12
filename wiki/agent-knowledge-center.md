# AI knowledge centers

An AI knowledge center is a repo where the team's processes, active work, shipped decisions, and reusable lessons are written in forms that humans can review and agents can run.

WongStack is one way to build one — a set of working principles and the files that apply them. Take what fits your team and adapt the rest.

## The principles

1. **Building in-house isn't about saving money.** It's about a faster, better process.
2. **Most process improvements shouldn't use AI.** They should just be code.
3. **Consolidate the processes and the data in one place you own.**
4. **Using AI shouldn't need a complicated setup.**
5. **Context has to survive the session.**
6. **Give AI as much access as you can, and as little autonomy as it needs.**

### Building in-house isn't about saving money

A tool you buy makes your process fit its shape. A tool you build fits the process you actually run, and you can change it the day the process changes. The aim is a process that runs ten times faster at higher quality — a smaller software bill is a side effect, not the reason.

### Most process improvements shouldn't use AI

If a step runs the same way every time, write it as code. Code is fast, costs nothing to run again, and gives the same answer twice. An AI step costs a model call every time and can drift. Keep AI for the parts that need judgment — reading an unclear request, weighing options, writing the first draft.

[`/explore` and `/plan`](development/the-change-loop.md) ask this question before a plan is written: can this be a script instead?

### Consolidate the processes and the data in one place you own

A process written as code is also the record of how the work is done. The business data sits behind that code. When both live in one place you own, an agent can read the process and the records together — that is where it gets its power.

Data split across separate tools is a set of disconnected exports, and no agent reasons well across those. The optional [Cloudflare stack](stack/README.md) is one cheap way to own the place where both live: Workers for the code, [D1](stack/d1-pipeline.md) for the data. Any stack works if you own it.

### Using AI shouldn't need a complicated setup

Nothing builds locally. [CI is the gate](development/the-change-loop.md#the-gate) when the repo has checks, PR review when it doesn't, and every commit gets a deployed preview — so work continues from any machine, and a new one needs no setup.

Keep the dependencies few. WongStack needs `git`, [`gh`](https://cli.github.com/), [Node.js](https://nodejs.org/), and the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI. Fewer moving parts break less often and survive longer.

### Context has to survive the session

A session ends and everything it worked out goes with it, unless a file keeps it. So the work writes its own record: the plan and the decisions behind it, the session note, and the reusable lesson that comes out of both.

Give that context by [progressive disclosure](wiki-style.md) — one place to start, each page breaking down into more detail — so an agent reads what the task needs and no more. `/dream` consolidates notes into the wiki and gardens it, so the tree cleans up after itself. Because it all lives in the repo, the next teammate starts where the last one stopped.

### Give AI as much access as you can, and as little autonomy as it needs

The more an agent can reach, the more it does for you, and the more damage a wrong step causes. The failure mode is not disobedience: an agent will not refuse your instruction, it will misinterpret it. So keep the access wide and put humans at standard points in the loop:

- **Read the plan before it runs.** `/plan` writes the change and stops; `/apply` implements only what you approved.
- **Review the pull request.** Every code change arrives as a reviewable package.
- **Let tests and CI catch what review misses.**
- **Put the app behind a login wall.** [Cloudflare Access](stack/cloudflare-access.md) keeps a preview private if you took that stack, and [secrets stay out of the repo](development/secrets.md) either way.

## What each surface owns

- **Agent instructions** orient the agent before it acts. [`CLAUDE.md`](../CLAUDE.md) carries the repo-specific overview plus the generic WongStack rules. Repos that use other agents can add an `AGENTS.md` pointer to the same skills and process.
- **The wiki** owns reusable process and conventions, in the shape [the rulebook](wiki-style.md) sets and the sentences [voice](voice.md) asks for.
- **Active changes** own work in progress. Each [change loop](development/the-change-loop.md) plan lives under `openspec/changes/<name>/` with its tasks, status, and decision log.
- **Archived changes** own what shipped and why.
- **Skills** turn the process into commands an agent runs: `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/dream`, `/improve`, `/wong-sync`.

Claude Code is one way to run these. The durable part is the files: any agent that reads files, edits files, runs shell commands, and follows the skill runbooks can do the same work.

## Why the capture pays off

Knowledge capture happens through the work, not as a separate writing chore afterwards. The plan, the decision log, the archived change, and `/dream` each write down one part of what the work taught, while the work is happening.

The split keeps it useful: change-specific knowledge stays with the active or archived change, and reusable process knowledge moves into the wiki. A one-off decision does not clutter the wiki, and a reusable convention does not stay buried in a finished change. Each change therefore starts with more context than the last one.

## Where to go next

Start with [the change loop](development/the-change-loop.md) to see how work moves from idea to shipped record. Use [the wiki rulebook](wiki-style.md) when you add or reorganize reusable process knowledge.
