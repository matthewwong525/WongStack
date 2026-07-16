## Why

WongStack tells you *how* to work (the change loop, the skills) but says nothing about *what to run it on*. People adopting it keep asking "what stack do you actually use for AI-driven dev?" A single opinionated recommendation doc answers that — the app stack, the tool that drives Claude Code, and hard-won tips on the skills — without compromising WongStack's stack-agnostic core.

**Non-goals:** Not a requirement or a default — the doc is explicitly framed as "a recommendation, take it or leave it." WongStack's skills and installer stay stack-agnostic; nothing here couples the toolkit to React/Vite/Cloudflare/Paseo. No new skills, hooks, or code.

## What Changes

- Add an **optional, opinionated recommendation doc** to the payload (`docs/`) covering:
  - **Core stack** — React + Vite SPA on **Cloudflare Workers** (D1/R2), and why this combo suits AI-driven dev (merge = deploy, one runtime, cheap previews).
  - **Paseo** — the open-source tool for driving Claude Code across parallel git-worktree agents; how it fits the change loop (branch = change, isolated worktree per agent).
  - **Slash-skill tips & tricks** — practical, day-to-day guidance on the WongStack verbs (`/explore /plan /apply /save /continue /ship`, `/document`, `/improve`): when to reach for each, how they chain, common gotchas.
- Frame it clearly as **optional** at the top and link it from `docs/README.md` as an appendix, not part of the core process tree.
- Follow the progressive-disclosure rulebook (topic titles, strong openers, linked up/down/sideways).

## Capabilities

### New Capabilities
- `stack-guide`: An optional, opinionated recommendation doc in the payload — core stack (React + Vite + Cloudflare), Paseo, and slash-skill tips — framed as a recommendation, not a requirement.

### Modified Capabilities
<!-- None. -->

## Impact

- **Docs:** a new page (e.g. `docs/recommended-stack.md`) + a link/framing line in `docs/README.md`; possibly split into a small `docs/recommended-stack/` section if the three topics each want their own page.
- **Root payload:** `CHANGELOG.md` entry + `VERSION` bump (minor — additive doc).
- **No code, skills, hooks, or installer behavior change** (the doc ships with the payload like any other `docs/` page; the installer already copies `docs/`).
- **Coordinates with `evolve-change-loop`:** if that change lands first, the tips reference the six-verb loop (incl. `/apply`) and can point at the new secrets-convention page.
