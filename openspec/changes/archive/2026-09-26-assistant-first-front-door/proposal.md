# Put the assistant first, in short plain messages

**Status:** ready-to-ship
**Branch:** explore-open-source-nontechnical
**Open questions:** none

## Why

WongStack already works like a personal assistant: it does plain requests directly, it remembers across sessions, and it builds small apps on request. But the front door reads like a developer tool. The README opens with coding agents, then shows six commands, a comparison with spec tools, and a list of tools to install. The always-loaded rules also ask for ASD-STE100 Simplified Technical English, which produces stiff, long text. A non-technical person who wants something like [Meta's Muse](https://www.explainx.ai/blog/openmuse-open-source-personal-agent-2026), where you sign in, chat, and it gets things done, leaves before they find out that WongStack can do this. The repo is already public, so this front door is the launch.

## What Changes

- **The README leads with the assistant.** The first screen says what you get: an assistant that remembers you and gets things done, with example requests. Next come three setup steps and where to chat. Everything for developers moves under one lower heading. It keeps the commands, the comparison, the requirements, the layout, and working from the source.
  ```text
  BEFORE                AFTER
  ───────────────────   ───────────────────
  Coding agents forget  Your own assistant
  review.html picture   What you can ask
  Start here (paste)    Start in 3 steps
  What you get          Where you chat
  The commands          What you get
  How it compares       ── For developers ──
  Repository layout     The commands
  Requirements          How it compares
  Work from source      Requirements
                        Repository layout
                        Work from the source
  ```
- **Short, plain messages replace STE100.** One rule in the `WONG-STACK` block replaces two: the ASD-STE100 rule and "Answer in a few lines". [`wiki/voice.md`](../../../wiki/voice.md) owns how the rule reads in practice. It gains a line on everyday words: say *saved* and *live*, not *pushed* and *merged*, unless the person asks. Code, commands, identifiers, and quotations stay exact. The line in [`asking-the-user.md`](../../../.agents/skills/explore/references/asking-the-user.md) that cites STE100 points to the voice page instead.
  ```text
  - Write user-facing prose in ASD-STE100
    Simplified Technical English ...
  - Answer in a few lines; ...
  + Keep messages short and plain: the
    point first, a few lines, everyday
    words. Name git, OpenSpec, or CI only
    when asked. Keep code exact.
  ```
- **The rules put the assistant first.** In the `WONG-STACK` block, "Do a plain request directly" moves to the top of the rules. The change loop comes after it, as the path for code. The meta intro of `AGENTS.md` (not shipped) now calls WongStack a personal assistant and knowledge center that lives in a repo.
- **The wiki's entry pages welcome a newcomer.** [`wiki/README.md`](../../../wiki/README.md) opens with what the assistant does, and links [getting started](../../../wiki/stack/getting-started.md) for a first-time reader. In getting started, "how you work" shows asking for anything first, and the change loop second.

**Non-goals:** No hosted service. It stays a separate repo, as decided on 2026-09-25. No Gmail, Calendar, or other connectors. No change to setup steps, skills behavior, scripts, or the version line beyond a minor bump. No mass rewrite of the skills or deeper wiki pages. No files removed, and no change to the archive or `CHANGELOG.md` history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simplified-technical-english`: The STE100 rule is removed. A short-and-plain message rule takes its place, and the exact-text exemption no longer names STE100.
- `install-onboarding`: The README's front door frames WongStack as a personal assistant and names a no-terminal place to chat.
- `open-source-release`: The README's first screen is for a non-technical reader. The developer material stays complete, in a later section.

## Impact

- **Always-loaded surfaces:** `AGENTS.md` (the `WONG-STACK` block and the meta intro).
- **Skills:** `.agents/skills/explore/references/asking-the-user.md` (one line).
- **Wiki:** `voice.md`, `README.md`, `stack/getting-started.md`.
- **Root:** `README.md`, `VERSION` (23.1.0), `CHANGELOG.md`.
- **Specs:** the three modified capabilities above. The `simplified-technical-english` capability keeps its path, and its Purpose is updated.
- Installed repos get the new rule and voice through `/wong-sync`.

## Decision log

- **2026-09-26** — Asked what "work like Muse" means for this repo → chose an assistant-first reframe of the existing engine, not a hosted service here and not new connectors.
- **2026-09-26** — Asked how far the repo cleanup goes → chose plain-language docs: the README, `AGENTS.md`, and the wiki entry pages. Removing maintainer-only files, pruning the archive, and resetting the version were not chosen.
- **2026-09-26** — Asked what replaces STE100 → chose concise, short messages.
- **2026-09-26** — Assumed the skills and deeper wiki pages keep their current prose, because a mass rewrite could change how skills behave and was not asked for.
- **2026-09-26** — Assumed the version goes to 23.1.0, because the rule and doc changes break no installed repo.
- **2026-09-26** — Assumed the `simplified-technical-english` capability keeps its path and gets a new Purpose, because moving a spec adds churn and breaks history links for no reader benefit.
- **2026-09-26** — Assumed the README names the Claude desktop app as the easiest place to chat, with any capable coding agent still supported, because a non-technical reader should not need a terminal and the front door must stay agent-agnostic.
- **2026-09-26** — Assumed the jargon rule lets the agent name git, OpenSpec, or CI when the person asks or must act on it, because some steps (a PR review, a CI failure) still need the person.
- **2026-09-26** — The bounded explore exit round is complete. Remaining details use the assumptions above.
- **2026-09-26** — Assumed the CI task is not a separate task, because `/ship` runs this change and merges only on its one checkpoint's `SUCCESS` or `NONE`.
- **2026-09-26** — Implementation checkpoint: version 23.1.0. `AGENTS.md` has the merged short-and-plain rule, after the plain-request rule; `voice.md` owns it and gained the everyday-words line; the README leads with the assistant and keeps the developer material under "For developers"; `wiki/README.md` and getting started welcome a newcomer. The payload link check, the OpenSpec config check, and the downstream-contract test pass. No STE100 text is left in `AGENTS.md`, `.agents/skills/`, the README, or the wiki.
- **2026-09-26** — Distill: the store holds no facts for this change or its branch; no repeatable fact to move into the wiki.
- **2026-09-26** — Archive checkpoint: archived as `openspec/changes/archive/2026-09-26-assistant-first-front-door/`; the CLI synced the three delta specs into `openspec/specs/`. `/ship`'s delegated `/save` commits the archive with the implementation.
