# WongStack

[![Test](https://img.shields.io/github/actions/workflow/status/matthewwong525/WongStack/test.yml?branch=main&label=test)](https://github.com/matthewwong525/WongStack/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/github/license/matthewwong525/WongStack)](LICENSE)
[![Version](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmatthewwong525%2FWongStack%2Frefs%2Fheads%2Fmain%2FVERSION&query=%24&label=version)](VERSION)

**My opinionated way of using AI. Now yours.** I'm Matt. I run Claymoo, a clay-kit company, with a small team, and I use AI for almost everything: the business, the tools my team uses every day, and my own errands. WongStack is how I do it, set up for you to copy and change. Ask in plain words, the way you'd message a coworker. It does the work, builds the tools, and remembers how you work. Everything it builds and learns lives in accounts you own.

## Start in three steps

1. **Get Claude Code and Paseo.** [Claude Code](https://code.claude.com/docs/en/setup) is the AI agent; [Codex](https://developers.openai.com/codex/cli) works too. Its install page may open a terminal once, for one command. The free [Paseo](https://paseo.sh) app is where you chat with it.
2. **Open Paseo and paste this:**

   ```
   Install WongStack from github.com/matthewwong525/WongStack. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md
   ```

3. **Answer a few questions.** The agent asks before it installs any free tool it needs. You open one [link](wiki/stack/cloudflare-credentials.md#create-the-token) in a [Cloudflare](https://cloudflare.com) account, where your apps run, and paste the key it shows you. Your files are kept in Cloudflare too, on its paid plan (about $5 a month, Mac or Linux), or in a free [GitHub](https://github.com/signup) account: [the two ways](wiki/stack/artifacts-route.md).

You end with a working assistant, a starter site online, memory that carries over between chats, and the steps to connect your phone. Open the site and paste its *Make it yours* message, and the assistant makes the page yours. [Getting started](wiki/stack/getting-started.md) says what it costs, what you do by hand, and what to do when something goes wrong.

Paste the message in any folder: if it already has files, setup makes a `wongstack` folder in your home folder.

## What you get

- **One memory for the whole team.** Each chat starts with what earlier chats learned about your business and the people in it. [Memory](wiki/development/memory.md) is kept in your own Cloudflare account.
- **Tools that fit your business, from one request.** A [mini app](wiki/stack/mini-apps.md) gets a plan and a link to try, and goes live at `/apps/<name>/` when you publish it.
- **Your own site, online for free.** Every change gets its own link to look at before it goes live.
- **A notebook that grows.** What the assistant learns — how your business runs, who is who — goes into [a wiki](wiki/README.md) it reads next time.
- **No lock-in.** It is plain files in a folder you own. Switch agents, and the knowledge comes with you.

## Requirements

You bring a coding agent and a [Cloudflare](https://cloudflare.com) account. Setup asks, then installs what is missing: `git`, [`gh`](https://cli.github.com/), [Node.js](https://nodejs.org/) 22, and [OpenSpec](https://github.com/Fission-AI/OpenSpec). The one Cloudflare token you make stays on your computer; [`SECURITY.md`](SECURITY.md) says what each token can do. [Required tools](wiki/development/required-tools.md) says why each is needed, and what [Windows](wiki/development/required-tools.md#symbolic-links-in-the-agent-folder) adds.

## Learn more

- [Wiki](wiki/README.md): the guide to WongStack's process, and [the terms the agent may use](wiki/README.md#terms-the-agent-may-use).
- [AI knowledge centers](wiki/agent-knowledge-center.md): the six principles behind WongStack.
- [The change loop](wiki/development/the-change-loop.md): how work moves from idea to shipped record.
- [Make WongStack your own](wiki/stack/customizing-wongstack.md): start every new project from your own fork.
- [Maintaining WongStack](wiki/maintaining/README.md): how to change the toolkit itself, and [the contributing guide](.github/CONTRIBUTING.md) to send a change back.
- [Changelog](CHANGELOG.md): what changed between releases.

## License

WongStack is released under the [MIT License](LICENSE).
