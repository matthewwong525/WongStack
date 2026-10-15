# WongStack

[![Test](https://img.shields.io/github/actions/workflow/status/matthewwong525/WongStack/test.yml?branch=main&label=test)](https://github.com/matthewwong525/WongStack/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/github/license/matthewwong525/WongStack)](LICENSE)
[![Version](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmatthewwong525%2FWongStack%2Frefs%2Fheads%2Fmain%2FVERSION&query=%24&label=version)](VERSION)

**Self-drive your business.** WongStack sets up the software foundation for running your business, in accounts you own.

AI works best with three things together:

- **Processes.** Repeatable work becomes code, with guides for your team.
- **Data.** Building those tools connects the data they need: orders, stock, analytics.
- **Reasons.** Saved chats and memories keep the why behind decisions.

All three build up as you work, so the next task, and the next teammate, starts with more context. Ask *Can we run this promotion?* and the answer is informed by marketing, finance, and operations.

## Start in three steps

1. **Open your assistant.** Any assistant that can read and change files and run commands on your computer works. [What I use](#what-i-use) names mine.
2. **Paste this into a new chat:**

   ```
   Install WongStack from github.com/matthewwong525/WongStack. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md
   ```

3. **Answer a few questions.** It asks before installing any free tool it needs. You open one [link](wiki/stack/cloudflare-credentials.md#create-the-token) in a [Cloudflare](https://cloudflare.com) account, where your apps run, and paste the key it shows.

You end with a working assistant, a starter site online, and memory that carries between chats.

- **Make it yours.** Open the site and paste its *Make it yours* message.
- **Your files** live in a free [GitHub](https://github.com/signup) account, or in Cloudflare on its paid plan (about $5 a month, Mac or Linux): [the two ways](wiki/stack/artifacts-route.md).
- **Any folder works.** If yours already has files, setup makes a `wongstack` folder in your home folder.
- **More:** [Getting started](wiki/stack/getting-started.md) covers costs, what you do by hand, and fixes when something goes wrong.

## What you get

- **Tools and a site you own.** Build a [mini app](wiki/stack/mini-apps.md) around your process. Review a plan and try a separate preview before publishing at `/apps/<name>/`.
- **Knowledge between tasks.** [Memory](wiki/development/memory.md) carries what earlier chats learned; [your wiki](wiki/README.md) keeps reusable business knowledge. Both stay in your own accounts.
- **Team access.** Each person uses their own assistant. Choose who can see and change what through [employee access](wiki/stack/employee-access.md).
- **Work beyond apps.** Ask for research, drafts, and errands. Your assistant can [use websites](wiki/development/browsing.md), asking when a step needs you. A [schedule](wiki/stack/host-schedules.md) starts agreed work on an existing clock, after checking what needs to stay on.
- **Freedom to change.** Your tools and knowledge stay yours. Switch assistants and take the context with you.

## What I use

I use [Claude Code](https://code.claude.com/docs/en/setup) in the free [Paseo](https://paseo.sh) app, on my laptop and my phone. [Codex](https://developers.openai.com/codex/cli) is set up too. WongStack works wherever your assistant works. Two things need one of these today:

- **A workspace for each assistant needs Paseo.** That is how several work at once. Without it, the parts of a request are done one at a time: [required tools](wiki/development/required-tools.md).
- **Memory loads by itself in Claude Code and Codex.** Another assistant reads the same files, and looks memory up when you ask: [memory](wiki/development/memory.md).

## Requirements

- **An assistant on a plan of your own**, such as Claude or ChatGPT.
- **A [Cloudflare](https://cloudflare.com) account.** The one token you make stays on your computer; [`SECURITY.md`](SECURITY.md) says what each token can do.
- **A free [GitHub](https://github.com/signup) account, for the free way to install**, on Mac, Windows, or Linux. [Start in three steps](#start-in-three-steps) says what the other way costs.
- **A few free tools.** Setup asks, then installs what is missing: `git`, [Node.js](https://nodejs.org/) 22, [OpenSpec](https://github.com/Fission-AI/OpenSpec), and, for the free way, GitHub's tool [`gh`](https://cli.github.com/). [Required tools](wiki/development/required-tools.md) says why each is needed, and what [Windows](wiki/development/required-tools.md#symbolic-links-in-the-agent-folder) adds.

## Learn more

- [Wiki](wiki/README.md): the guide to WongStack's process, and [the terms the agent may use](wiki/README.md#terms-the-agent-may-use).
- [AI knowledge centers](wiki/agent-knowledge-center.md): the six principles behind WongStack.
- [The change loop](wiki/development/the-change-loop.md): how work moves from idea to shipped record.
- [Make WongStack your own](wiki/stack/customizing-wongstack.md): start every new project from your own fork.
- [Maintaining WongStack](wiki/maintaining/README.md): how to change the toolkit itself, and [the contributing guide](.github/CONTRIBUTING.md) to send a change back.
- [Changelog](CHANGELOG.md): what changed between releases.

## License

WongStack is released under the [MIT License](LICENSE).
