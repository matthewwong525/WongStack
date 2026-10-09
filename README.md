# WongStack

[![Test](https://img.shields.io/github/actions/workflow/status/matthewwong525/WongStack/test.yml?branch=main&label=test)](https://github.com/matthewwong525/WongStack/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/github/license/matthewwong525/WongStack)](LICENSE)
[![Version](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmatthewwong525%2FWongStack%2Frefs%2Fheads%2Fmain%2FVERSION&query=%24&label=version)](VERSION)

**The most powerful AI tools, such as Claude Code and Codex, for people who don't code.** Out of the box, nothing in them is set up for a business: there is nowhere to put an app, no memory between chats, and no safe place for a key. WongStack is that setup. It is open source and yours to use and change, and everything it builds and learns stays in accounts you own.

With it, your assistant can:

- **Build.** Ask for a tool in plain words and it makes a real, working app: *"Build a packing checklist for my team."*
- **Remember.** It keeps what it learns about you and your work, so you never explain twice: *"From now on, orders ship on Fridays."*
- **Collaborate.** Your team shares the same tools and memory, each person with their own assistant, and you choose who can see and change what: *"Let Sam see the orders tool."*
- **Get things done.** It runs your errands, uses websites for you, and does jobs while you sleep: *"Every Monday, send me last week's profit."*

I'm Matt. I built WongStack to run Claymoo, my clay-kit company, and this is my setup, shared for you to change.

## Start in three steps

1. **Open your assistant.** Any assistant that can read and change files and run commands on your computer works. [What I use](#what-i-use) names mine.
2. **Paste this into a new chat:**

   ```
   Install WongStack from github.com/matthewwong525/WongStack. Read and follow https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md
   ```

3. **Answer a few questions.** The agent asks before it installs any free tool it needs. You open one [link](wiki/stack/cloudflare-credentials.md#create-the-token) in a [Cloudflare](https://cloudflare.com) account, where your apps run, and paste the key it shows you. Your files are kept in Cloudflare too, on its paid plan (about $5 a month, Mac or Linux), or in a free [GitHub](https://github.com/signup) account: [the two ways](wiki/stack/artifacts-route.md).

You end with a working assistant, a starter site online, and memory that carries over between chats. Open the site and paste its *Make it yours* message, and the assistant makes the page yours. [Getting started](wiki/stack/getting-started.md) says what it costs, what you do by hand, and what to do when something goes wrong.

Paste the message in any folder: if it already has files, setup makes a `wongstack` folder in your home folder.

## What you get

**Build**

- **Tools that fit your business, from one request.** A [mini app](wiki/stack/mini-apps.md) gets a plan and a link to try, and goes live at `/apps/<name>/` when you publish it.
- **Your own site, online.** Every change gets its own link to look at before it goes live.

**Remember**

- **One memory for the whole team.** Each chat starts with what earlier chats learned about your business and the people in it. [Memory](wiki/development/memory.md) is kept in your own Cloudflare account.
- **A notebook that grows.** What the assistant learns — how your business runs, who is who — goes into [a wiki](wiki/README.md) it reads next time.

**Collaborate**

- **One team, one memory.** Each person uses their own assistant. What one person teaches it, everyone gets.
- **Logins and access, taken care of.** You choose who on your team can see and change what: [employee access](wiki/stack/employee-access.md).

**Get things done**

- **Errands, from one message.** Research, a draft, a plan for your week: it does the work and answers. It asks before it sends or changes anything outside the chat.
- **Websites, used for you.** It opens a real browser, and sends you a link when a step needs you: [browsing](wiki/development/browsing.md).
- **Jobs while you sleep.** A [schedule](wiki/stack/host-schedules.md) starts agreed work on an existing clock. Your assistant checks where it runs and what must stay on.

**All of it is yours**

- **You own it.** Everything it builds and learns lives in accounts you own. Your keys stay on your computer and in your own accounts.
- **No lock-in.** It is plain files in a folder you own. Switch assistants, and the knowledge comes with you.

## What I use

I use [Claude Code](https://code.claude.com/docs/en/setup) in the free [Paseo](https://paseo.sh) app, on my laptop and my phone. [Codex](https://developers.openai.com/codex/cli) is set up too. WongStack works wherever your assistant works. Two things need one of these today:

- **A workspace for each assistant needs Paseo.** That is how several work at once. Without it, the parts of a request are done one at a time: [required tools](wiki/development/required-tools.md).
- **Memory loads by itself in Claude Code and Codex.** Another assistant reads the same files, and looks memory up when you ask: [memory](wiki/development/memory.md).

## Requirements

You bring an assistant on a plan of your own, such as Claude or ChatGPT, and a [Cloudflare](https://cloudflare.com) account. The free way to install adds a free [GitHub](https://github.com/signup) account, and works on Mac, Windows, or Linux; [step 3](#start-in-three-steps) says what the other way costs. Setup asks, then installs what is missing: `git`, [Node.js](https://nodejs.org/) 22, [OpenSpec](https://github.com/Fission-AI/OpenSpec), and, for the free way, GitHub's tool [`gh`](https://cli.github.com/). The one Cloudflare token you make stays on your computer; [`SECURITY.md`](SECURITY.md) says what each token can do. [Required tools](wiki/development/required-tools.md) says why each is needed, and what [Windows](wiki/development/required-tools.md#symbolic-links-in-the-agent-folder) adds.

## Learn more

- [Wiki](wiki/README.md): the guide to WongStack's process, and [the terms the agent may use](wiki/README.md#terms-the-agent-may-use).
- [AI knowledge centers](wiki/agent-knowledge-center.md): the six principles behind WongStack.
- [The change loop](wiki/development/the-change-loop.md): how work moves from idea to shipped record.
- [Make WongStack your own](wiki/stack/customizing-wongstack.md): start every new project from your own fork.
- [Maintaining WongStack](wiki/maintaining/README.md): how to change the toolkit itself, and [the contributing guide](.github/CONTRIBUTING.md) to send a change back.
- [Changelog](CHANGELOG.md): what changed between releases.

## License

WongStack is released under the [MIT License](LICENSE).
