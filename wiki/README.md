# WongStack wiki

WongStack is an assistant that remembers you and gets things done. Ask it anything: research, a reminder, a plan for your week, or a small app. This wiki is what it has learned: how you work, who is who, and how the project runs. Each page stands on its own, so follow the links down to what you need.

New here? Start with [getting started](stack/getting-started.md): from an empty folder to a working assistant and a live site, with three things you do by hand.

The rest is for people who shape how WongStack works. [AI knowledge centers](agent-knowledge-center.md) gives the six principles behind it. [Wiki style](wiki-style.md) says how a page is shaped, [voice](voice.md) how its sentences read, and [contributing](contributing.md) how to send an improvement upstream. Building UI? [UX principles](ux-principles.md) says what a screen should *be* before any component is picked.

## Where to find things

- [AI knowledge centers](agent-knowledge-center.md) — the six working principles, and why WongStack keeps process knowledge in the repo and makes it runnable by agents.
- [Contributing upstream](contributing.md) — how to send a workflow improvement back to WongStack by hand, and the generality bar it has to clear.
- [People](people/README.md) — who is who, their emails, and how each likes work done.
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
- **Pull request:** a reviewable package of work. You or your team inspect what changed before it joins the main project. The agent calls it *the change on GitHub*.
- **CI:** automated checks, such as tests, that run on saved work. When your project has them, WongStack waits for them.
- **OpenSpec:** the planning layer that records what is being built and what shipped. [The change loop](development/the-change-loop.md) shows where it fits.
- **Wiki:** the repo's place for reusable team knowledge and conventions. You are in it.
- **Review page:** the page a plan ends with. You read each change and its drawing, and tap **+ Note** to comment before anything is built ([the steps](development/the-change-loop.md#the-steps)).
- **Preview link:** a separate copy of your site with the change in it, running on practice data. Anyone with the link can open it; your real site is untouched.
- **Mini app:** a small page or tool, such as a bill splitter, that lives at `/apps/<name>/` on your site ([mini apps](stack/mini-apps.md)).
- **Routine:** a request the assistant runs on a schedule, such as every weekday at 9. It needs the optional [Paseo](https://paseo.sh) app ([`/routine`](../.agents/skills/routine/SKILL.md)).
- **Save:** keep the work so far without making it live. Every save, a wiki page included, gets a pull request you publish when ready ([the gate](development/the-change-loop.md#the-gate)).
- **Publish:** make the change live on your real site, after its checks pass.
