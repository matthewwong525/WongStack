## MODIFIED Requirements

### Requirement: Every install ships the project's Paseo file
The payload SHALL include a root `paseo.json` whose worktree setup copies the primary worktree's secrets files and its local chat settings file into each new workspace and runs nothing else. A workspace that already has its own local chat settings SHALL keep them. When a target already has its own `paseo.json`, install and sync SHALL merge WongStack's entries into it, keeping every command and setting the target already has, and SHALL NOT replace the file.

#### Scenario: A fresh install
- **WHEN** setup installs WongStack into an empty folder
- **THEN** the repo has `paseo.json`, and a new Paseo workspace of it opens with its own copies of `.env`, `app/.dev.vars` and the primary worktree's `.claude/settings.local.json`

#### Scenario: A repo with its own setup step
- **WHEN** a sync reaches a repo whose `paseo.json` already runs `npm ci` on worktree setup
- **THEN** the plan keeps `npm ci` and adds the secrets copy beside it
