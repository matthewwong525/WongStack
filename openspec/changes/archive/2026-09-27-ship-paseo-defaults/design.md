# Design

## Context

See proposal.md — Why. Paseo 0.9.2 reads two kinds of settings:

- **Project, committed:** `paseo.json` at the repo root. Its schema (`@getpaseo/protocol` `PaseoConfigRawSchema`) allows `worktree.setup` / `teardown` / `terminals` / `servicePorts`, `scripts`, and `metadataGeneration.{title,branchName,commitMessage,pullRequest}.instructions`. This repo's file has only `worktree.setup` (the `worktree-secrets.mjs seed` command from [the secrets convention](../../../wiki/development/secrets.md)), and `paseo.json` is not in `payload-files.json`, so no install has it.
- **Machine, per user:** `~/.paseo/config.json`, including `daemon.agentProfiles` (`AgentProfileSchema`: `id`, `name`, `provider`, optional `icon`, `model`, `modeId`, `thinkingOptionId`, `notes`, passthrough). `paseo reload` rereads it without a restart.

The new-workspace dialog's isolation and starting ref are app state; the default ref is `origin/HEAD`'s branch (`resolveRepositoryDefaultBranch`), so `main` already.

## Goals / Non-Goals

**Goals:** one committed `paseo.json` in the payload; one deterministic, idempotent preset writer shared by `/wong-setup` and the server installer, and runnable by hand in any install.

**Non-Goals:** editing any other machine setting; an npm install on worktree setup; a session-start hook for presets; keeping preset model ids current (that stays a hand edit of one JSON file).

## Decisions

### `paseo.json` content

```json
{
  "worktree": { "setup": "node .claude/skills/ship/scripts/worktree-secrets.mjs seed" },
  "metadataGeneration": {
    "title": { "instructions": "…" },
    "branchName": { "instructions": "…" },
    "commitMessage": { "instructions": "…" },
    "pullRequest": { "instructions": "…" }
  }
}
```

Instruction text, each a few sentences:

- **title** — 2–5 plain everyday words for what the person wants (`Paseo defaults for installs`); no workflow word (explore, plan, apply), ticket number, or end punctuation.
- **branchName** — lowercase kebab-case topic slug, 2–5 words, no type prefix or workflow word (`ship-paseo-defaults`); it can become an OpenSpec change name.
- **commitMessage** — one line: `feat|fix|docs|chore: ` then what a person gets, in plain lowercase words, under 72 characters, no version (`merge.sh` adds it); then a blank line and `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **pullRequest** — title in the commit subject's form; body a few plain lines on what changed and why and how to check it, ending `🤖 Generated with [Claude Code](https://claude.com/claude-code)`; note that `/save` regenerates the body from an OpenSpec change when one exists.

Alternative: leave naming to the skills alone. Rejected by the exit round; Paseo's own buttons and its automatic branch rename (it renamed this worktree `explore-paseo-defaults`) otherwise ignore the conventions.

### Payload and merge

Add `paseo.json` to `core.files`. The manifest gains a short rule next to the hooks rule: a target with its own `paseo.json` gets `worktree.setup` normalised to an array with the seed command appended when absent, and each missing `metadataGeneration` entry added; its own keys win. This is the same "merge, never replace" handling as `.claude/settings.json`, so the preflight's `locally-adapted` class already protects it.

### Preset writer: `routine/scripts/presets.mjs`

Lives beside `routine.mjs` and `workspace.mjs`, reusing `lib/paseo.mjs` (`findPaseo`, exit codes). One command, `add`, with `--dry-run`. Data in `routine/scripts/paseo-presets.json` (the four current profiles, with stable ids `wongstack-claude-explore-plan`, `wongstack-claude-apply-ship`, `wongstack-codex-explore-plan`, `wongstack-codex-apply-ship`, and the owner's icons, models, modes, thinking, and notes).

1. No `paseo` on PATH → exit 3, nothing written. Home is `--home`, else `PASEO_HOME`, else `~/.paseo`; no `config.json` there → exit 3 ("Paseo is not set up yet"), nothing written.
2. For each preset: `kept` when a profile has its id or name; `skipped` when its provider's command (`claude`/`codex`) is not on PATH; else `added`.
3. Nothing added → no write. Else write `daemon.agentProfiles` appended, every other key untouched, through a temp file and rename in the same folder, keeping the file's mode.
4. Run `paseo reload`; a daemon that does not answer is reported (`reloaded: false`), not an error.
5. Print one JSON object `{added, kept, skipped, reloaded}` with names only.

Alternatives: write through the daemon's config RPC (private client, as `routine.mjs` already fears); edit only via docs (rejected in the exit round).

### Callers

- `/wong-setup`: the install intent adds "if Paseo is installed, run `presets.mjs add`"; the closing report names what it added. It runs in the target after the payload lands.
- `server/install-wongstack.mjs`: one step after the payload copy, running the target's `presets.mjs add`; any non-zero exit is logged and ignored, so the last line is unchanged. `server/README.md`'s end state names it.
- Wiki: `wiki/development/required-tools.md`'s Paseo paragraph gains what WongStack sets (project file, presets) and leaves (base branch, isolation, auto-archive, browser tools), and how a teammate adds presets: ask the agent to run the script.

## Risks / Trade-offs

- [Paseo renames or drops `metadataGeneration`] → the schema keeps unknown keys parseable (`passthrough`, `catch`); the worst case is ignored instructions.
- [Model ids age (`gpt-6-astra`, `claude-fable-5-1`)] → one JSON file to edit; an unknown model shows in Paseo as unavailable, not as a crash.
- [Writing while the daemon also writes the file] → atomic rename, and the daemon's own writes happen only on settings edits; `reload` follows immediately.
- [Instructions steer Paseo's generator but can't force it] → the skills still own the commits and PR bodies they make.

## Migration Plan

Installs take `paseo.json` and the script on their next `/wong-sync`; that plan ends with an optional task to run `presets.mjs add` on the owner's machine. Rollback: remove the entry from `payload-files.json`; presets already added stay, as the person's own.

## Open Questions

- Whether Paseo applies `branchName` instructions to its automatic worktree rename, or only to its own branch button. Check on the first workspace opened after merge; it changes no task.
