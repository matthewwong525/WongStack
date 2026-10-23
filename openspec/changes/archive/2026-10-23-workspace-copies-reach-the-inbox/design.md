# Design

## Context

- `scripts/employee-bootstrap.mjs` `companyClient` picks its sign-in folder in this order: a project locator (`connectionState`), then `installed()`, the per-app folder `installState(origin)` for the origin the copy's `.claude/.wong-stack.json` records under `components.companyApi.origin`, then a folder keyed by the copy's own path. Installs set up before that field, and this source repo, record no `companyApi`, so each worktree falls to its own path-keyed folder, which is empty. `login` from the main copy wrote the main copy's path-keyed folder; the per-app folder for the live origin also exists on this computer.
- Every install records `components.memory.worker`, `https://<app>/_memory`; /daily's `who` already reads the app origin from it (`memoryOrigin`).
- `.claude/skills/schedule/scripts/workspace.mjs` builds `paseo run … --mode <mode> <brief>` and appends `--json`; it refuses a brief starting with `-` so the brief is never parsed as an option. `chief.md`'s brief is a five-part list starting `- **Goal**`.

## Goals / Non-Goals

**Goals:** a worktree reaches the inbox with the main copy's sign-in; a list-shaped brief opens its workspace.

**Non-Goals:** changing first-time login, the locator format, or the inbox.

## Decisions

- **`installed()` falls back to the memory record's origin.** When `companyApi.origin` is absent, take the origin of `components.memory.worker` and look up `installState(origin)`, which must hold a `target.json` for that same origin, exactly as today. Only the lookup gains the fallback; `target()`'s *recorded company origin changed* guard keeps reading `companyApi.origin` alone, so an older install whose memory runs on a separate host never trips it. Alternative: write `companyApi.origin` into each record during `/wong-sync`; rejected as a second, slower path that leaves this source repo and un-synced installs broken.
- **When the path-keyed folder is empty, the per-app folder for the main copy's sign-in is the one used.** If `login` ran only from the main copy (path-keyed), a worktree still finds nothing. So `login` also writes the per-app `installState(origin)` folder when the copy records an app (either field), the folder `install` already uses. One sign-in per app per computer then serves every copy. Check during the build whether `login` already writes there; the per-app folder on this computer suggests `install` made it.
- **A workspace borrows its main copy's sign-in as a last resort.** A main copy signed in before this change holds the sign-in only in its path-keyed folder. A workspace finds its main copy from its `.git` file and `commondir`, Node built-ins only, and uses that folder when it holds a sign-in for the same app. A `login` from the workspace writes its own folder and the app's, never the main copy's.
- **The launcher ends options before the brief.** Put `--json` before the brief and pass `--` ahead of it, so commander reads any text as the prompt; drop the `-` refusal. Confirm `paseo run` honours `--` with a harmless call (e.g. an invalid `--provider`, which fails before any agent starts) before relying on it. If it doesn't, prefix the brief file's text with one title line instead, never changing the person's words.

## Risks / Trade-offs

- A shared computer: the per-app folder is the same one `install` already shares across copies, so no new sharing is introduced; a different app's sign-in is never used, by the origin match.
