# The browser tool reads its own current guide

**Status:** ready-to-ship
**Branch:** browser-agent-review
**Open questions:** none

## Why

WongStack uses agent-browser to check previews (`/verify`) and to use your saved web logins. Its short skill file says to load the tool's own guide first, since that guide always matches the installed version. But WongStack hides that skill file so only `/verify` uses the tool, which means no agent ever reads it, and so never loads the guide. Agents write browser steps from one example instead. The skill file is also one line behind the latest version.

## What Changes

- **The agent reads the tool's guide before it drives the browser.** Before `/verify` writes its browser steps, and before a task uses your saved logins, the agent loads the guide that comes with the installed tool. When the tool updates, the guide updates with it, so the steps never go stale.
  ```text
  browser task
      │
      ▼
  load the tool's guide
  (matches its version)
      │
      ▼
  write the browser steps
  ```
- **The skill file matches the latest version.** It gains the one new line the latest release added: a guide for Vercel's protected previews. It stays hidden, so it never shows in your menu.

Non-goals: no new browser features, no change to how `/verify` grades or reports, no switch to another browser tool.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a browser journey is written after loading agent-browser's version-matched guide.
- `browser-logins`: personal browsing loads the same guide before its first command.

## Impact

- `.agents/skills/agent-browser/SKILL.md`: refreshed from agent-browser 0.38.1's `skills/agent-browser/SKILL.md`, keeping `disable-model-invocation: true`.
- `.agents/skills/verify/references/walkthrough.md`: one line at *Browser journey → `<id>.batch.json`*.
- `wiki/development/home.md`: one line in *Saved browser logins*.
- `CHANGELOG.md` `## Next (patch)` entry.

## Decision log

- **2026-09-28** — Asked what to plan after finding the skill one line behind and never read → chose refresh it and point `/verify` and saved logins at the tool's own guide.
- **2026-09-28** — Assumed: the skill stays hidden (`disable-model-invocation: true`), because the payload rules keep it as its one local edit so it never crowds the menu or triggers on its own.
- **2026-09-28** — Assumed: point at `agent-browser skills get core`, not copy its content, because the CLI serves the guide for the installed version and a copy goes stale.
- **2026-09-28** — Assumed: a patch release, because nothing new is added; agents just follow the tool's existing guide.
- **2026-09-28** — Built: the skill file now equals agent-browser 0.38.1's plus `disable-model-invocation: true`; the walkthrough and *Saved browser logins* each point at `agent-browser skills get core`; the changelog entry. All four payload checks pass.
- **2026-09-28** — Distilled: no repeatable fact; the session wrote none, and the pointer now lives on the two pages that drive the browser.
- **2026-09-28** — Archived and checkpointed for merge by `/ship`.
