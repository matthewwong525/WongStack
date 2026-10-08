# Development

How this repo plans, builds, checks, and ships changes. Every WongStack install uses these pages; [Maintaining WongStack](../maintaining/README.md) covers editing the toolkit itself.

## Processes

- [The change loop](the-change-loop.md) — how work moves from idea to shipped, archived spec: `/explore → /plan → /apply → /save → /ship`, with `/continue` to pick saved work back up, each a thin verb over an OpenSpec step, with the change as a living handoff (Status header + append-only Decision log + PR-body mirror).
- [Reply links](reply-links.md) — a plan's page opens at a link whose *Send notes* button puts your notes straight into the chat: the 8 hours, *new link*, the fallback to copying, and how another page opens the same way.
- [Staging walkthrough](staging-walkthrough.md) — why `/verify` probes the deployed preview, what you need for it, and what it deliberately is not.
  - [Kept checks](kept-checks.md) — passed preview checks saved in the project and replayed, with no AI, before each publish.
- [Code improvement](repository-improvement.md) — run or schedule `/improve-code` to find one way to make the code simpler or safer to change; it writes the plan and stops for your yes.
- [Scheduled routines](../../.agents/skills/routine/SKILL.md) — `/routine` puts any prompt or verb on a schedule that [runs in your Cloudflare account](../stack/cloud-routines.md), with your computer off.
- [Required tools](required-tools.md) — the whole toolchain is `git`, `gh`, Node, `openspec`, and `curl`: why it stays that small, and how the payload handles JSON without a standalone `jq`.
- [Browsing](browsing.md) — how the agent uses websites as the person: saved logins, pictures of key moments, private links for what only the person can give or do, and what it does when a site refuses its browser.
  - [Save your passwords](passwords.md) — give the agent the logins you choose through a private link; it never sees a password.
  - [Login codes](login-codes.md) — the agent reads a one-time code from your email or asks for it in the chat, with no link.
  - [Live view](live-view.md) — at a robot check, a private link shows the agent's browser so you can tap through it: when it opens, what the link can do, and how the agent runs one.
- [Memory dream](wiki-dream.md) — type `/dream-memory` and the assistant checks the wiki, saved facts, specs, and plans against each other and the code: what it fixes, what it only lists, the dry run, and how to undo one.
- [Session memory](memory.md) — the private fact store: who sees what, the start-of-session digest, capture by `/save` and the background run, and consolidation.
  - [Document retrieval](document-retrieval.md) — task recall with cited wiki/OpenSpec passages, optional local semantic setup, scopes, freshness and fallback.
  - [Experimental extraction](memory-extraction.md) — bounded fact selection, supported hosts, task limits, and comparative evaluation.
  - [The memory key](memory-key.md) — the key that opens the store: the admin, member, and reader roles, machine ownership, trusted credential installation, login labels, and revocation.
- [Secrets and environment variables](secrets.md) — the `.env.example`-as-source-of-truth convention: blank declarations stay on the active branch, while real values persist outside git in the primary worktree across linked checkouts.
- [Contributing upstream](../contributing.md) — the other side of the payload: how a target repo sends an improvement back by hand, and the generality bar it has to clear before you'd merge it here.
- [Maintaining WongStack](../maintaining/README.md) — editing the toolkit itself: adding a skill, the folder links, and cutting a release.

Part of [the WongStack wiki](../README.md).
