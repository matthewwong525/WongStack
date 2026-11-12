# Development

How this repo plans, builds, checks, and ships changes. Every WongStack install uses these pages; [Maintaining WongStack](../maintaining/README.md) covers editing the toolkit itself.

## Processes

- [The change loop](the-change-loop.md) — how work moves from idea to shipped, archived spec: `/explore → /plan → /apply → /save → /ship`, with `/apply <name>` to pick saved work back up, each a thin verb over an OpenSpec step, with the change as a living handoff (Status header + append-only Decision log + PR-body mirror).
  - [Loosened checks](loosened-checks.md) — what the loosened-check guard flags, when a kept check needs a reason, and the copy of the guard a pull request can not edit.
- [Reply links](reply-links.md) — a plan's page opens at a link whose *Send notes* button puts your notes straight into the chat, and whose *Build it* and *Build and publish* start the build: the inbox, the 24 hours, *new link*, the fallback to copying, and how another page opens the same way.
- [Staging walkthrough](staging-walkthrough.md) — why `/verify` probes the deployed preview, what you need for it, and what it deliberately is not.
  - [Kept checks](kept-checks.md) — passed preview checks saved in the project and replayed, with no AI, before each publish.
- [The daily routine](daily.md) — each morning the worker starts the team's routines, then your own; ask any chat for reminders and what's going on, and check-ins keep your chats moving.
  - [Your chats in line](chats-in-line.md) — the line-up reads every open Claude Code and Codex chat in the project, in Paseo or not, and sends each the notes that change its work: through Paseo, or at the chat's next stop or message.
- [A teammate's first day](first-day/README.md) — from the owner adding a person in Access to their first saved change: setup, then two lessons they open by typing `lesson 1` and `lesson 2` in a new chat.
  - [Use skills](first-day/use-skills.md) — Lesson 1: who you are, what a skill is, a question card, one real skill, and one task per chat.
  - [Make your first change](first-day/make-a-change.md) — Lesson 2: plan, build and save one small, real change; it stops at the save.
- [Code improvement](repository-improvement.md) — run or schedule `/improve-code` to find one way to make the code simpler or safer to change; it writes the plan and stops for your yes.
- [Host schedules](../stack/host-schedules.md) — `/daily:schedule` chooses predictable scripts first and verifies an existing host clock for assistant work; each schedule lives in the app and runs only after your OK on that computer.
- [Required tools](required-tools.md) — the whole toolchain is `git`, `gh`, Node, `openspec`, and `curl`: why it stays that small, and how the payload handles JSON without a standalone `jq`.
- [Browsing](../../.agents/plugins/browser/references/browsing.md) — how the agent uses websites as the person: the browser's own sign-ins, pictures of key moments, private links for what only the person can give or do, and what it does when a site refuses its browser.
  - [Saved details](../../.agents/plugins/browser/skills/hand-over/references/saved-details.md) — everyday answers you choose to keep, such as an email or an address, fill the next form after a yes; a card is never saved.
  - [Login codes](../../.agents/plugins/browser/references/login-codes.md) — the agent reads a one-time code from your email or asks for it in the chat, with no link.
  - [Steps for you to finish](finish-steps.md) — numbered steps, with links, when a login or check stops the agent.
  - [Shopping](../../.agents/plugins/browser/skills/shop/references/shopping.md) — the agent finds, compares, and buys products through Shop: no account to look, your yes to connect and to pay, one payment per purchase, and no card detail the agent can read.
  - [The browser window](../../.agents/plugins/browser/references/browser-window.md) — one window with a tab for each chat, shown on your screen by default; the Linux link setting, asking for the browser, and the window and proxy settings each computer keeps.
  - [Browser proxies](../../.agents/plugins/browser/references/browser-proxy.md) — with the proxy on, the browser goes through your home proxy, then a backup, then this computer's network; how to save them, check the route, and turn them off.
  - [Live view](../../.agents/plugins/browser/skills/hand-over/references/live-view.md) — the one place you type something sensitive: a private link shows the agent's browser for your turn to sign in, pay, type a backup code, pass a robot check, or tap through a stuck step, then *Hand back*; where the browser has a window, your turn happens there.
    - [Watch link](watch-link.md) — the live view the agent drives while it connects your tools on a server: *Take over*, *Hand back*, and a turn to sign in.
  - [Your password manager in the browser](../../.agents/plugins/browser/references/password-manager.md) — 1Password by default, and any other add-on the agent adds with checks when you ask; the agent asks before each sign-in with a login from it.
- [Memory dream](wiki-dream.md) — the daily tidy your first chat each day starts, and `/memory:dream-memory`, which checks the wiki, saved facts, specs, and plans against each other and the code: what it fixes, what it only lists, the dry run, and how to undo one.
- [Session memory](memory.md) — the private fact store: its three layers and the profile, the two installs, who sees what, the company sign-in and its expiry, the start-of-session digest, topics, capture, and consolidation.
  - [Memory search](memory-search.md) — which read to use for facts, with evidence; the pull, related topics, the memory helper, and when to add embeddings.
  - [Document retrieval](document-retrieval.md) — task recall with cited wiki/OpenSpec passages found by their words, scopes and freshness.
- [Secrets and environment variables](secrets.md) — the `.env.example`-as-source-of-truth convention: blank declarations stay on the active branch, while real values persist outside git in the primary worktree across linked checkouts.
- [Contributing upstream](../contributing.md) — the other side of the payload: how a target repo sends an improvement back by hand, and the generality bar it has to clear before you'd merge it here.
- [Maintaining WongStack](../maintaining/README.md) — editing the toolkit itself: adding a skill, the folder links, and cutting a release.

Part of [the WongStack wiki](../README.md).
