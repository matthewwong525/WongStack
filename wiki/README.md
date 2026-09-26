# WongStack wiki

This wiki is WongStack's process memory: the reusable knowledge a human or agent should read before acting. Start with [AI knowledge centers](agent-knowledge-center.md) — the six principles behind WongStack and the mechanism that applies each one — then follow the inline links down into whatever you need. Each page stands on its own and breaks down into more detail. How to add without breaking that: [wiki style](wiki-style.md) for a page's shape, [voice](voice.md) for how its sentences read, [contributing](contributing.md) for sending a payload improvement upstream. Building UI? [UX principles](ux-principles.md) for what a screen should *be* before any component is picked.

## Where to find things

- [AI knowledge centers](agent-knowledge-center.md) — the six working principles, and why WongStack keeps process knowledge in the repo and makes it runnable by agents.
- [Contributing upstream](contributing.md) — how to send a workflow improvement back to WongStack by hand, and the generality bar it has to clear.
- [Development](development/README.md) — working on WongStack itself: editing the payload and cutting a release.

> New section? Add a `wiki/<section>/README.md` hub, link it from the list above, and let
> it break its own process down page by page. Don't manufacture depth — add a layer only
> when there's genuinely more to break down.

## Stack

Where the app runs. The process above does not depend on it, but every new install uses it.

- [Cloudflare stack](stack/README.md) — the opinionated stack for AI-driven dev (React + Vite on Cloudflare Workers, D1, Access). Every install runs on it. The flow: `/wong-setup` once in an empty folder, which puts the app online, then `/wong-sync` to stay current.

## Terms the agent may use

You do not need these before you start. They explain what WongStack sets up.

- **Repo:** the project folder and its saved history.
- **Pull request:** a reviewable package of work. You or your team inspect what changed before it joins the main project.
- **CI:** automated checks, such as tests, that run on saved work. When your project has them, WongStack waits for them.
- **OpenSpec:** the planning layer that records what is being built and what shipped. [The change loop](development/the-change-loop.md) shows where it fits.
- **Wiki:** the repo's place for reusable team knowledge and conventions. You are in it.
