# Run the dependency update as one watched script

**Status:** ready-to-ship
**Branch:** update-dependencies-automation
**Open questions:** none

## Why

Updating dependencies today means the agent follows a page of steps by hand: check each version, bump each one, move the OpenSpec version in four places. The steps are the same every time, so a script should do them, the same way each run, and the agent should only step in where judgment is needed.

## What Changes

- **One script does the whole update.** You type `/update-dependencies` and one script checks every tool and package, updates what is behind, majors included, and moves the OpenSpec version everywhere it is written.
  ```text
  /update-dependencies
          │
          ▼
  ┌──────────────────┐   step fails   ┌─────────┐
  │ script: check,   │───────────────▶│ agent   │
  │ update, report   │◀───────────────│ fixes   │
  └──────────────────┘   run again    └─────────┘
          │
          ▼ done
  agent: upgrade notes, publish, watch checks
  ```
- **The agent watches it run.** It follows the script's output. When a step fails, the script stops at that step and says what broke; the agent fixes it and runs the script again, which skips what is already done.
- **The agent still does the judgment parts.** For each big version jump, it reads the upgrade notes and changes the code to match. After a new OpenSpec, it checks WongStack still works with it. Then it publishes and fixes anything the checks catch.
- **You get the same report as before**, now read off the script: what moved, which big jumps needed code changes, and what the checks ran.
- **Nothing is left for you to do unless it needs you.** A computer tool that needs an admin password, such as `git` or Node, is named for you to approve, as today.

Non-goals: no schedule, no local test run as the gate, and no change to what gets updated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dependencies`: the on-demand update verb runs one rerunnable script for the survey and every mechanical update, with the agent watching it and doing only the migration, contract, and CI work.

## Impact

- New `.agents/skills/update-dependencies/scripts/update.mjs` (Node built-ins only).
- `.agents/skills/update-dependencies/SKILL.md` rewritten around running and watching the script.
- New `scripts/tests/update-dependencies.test.mjs`.
- Meta-repo only: the skill is outside the payload, so no release and no changelog entry.

## Decision log

- **2026-09-29** — Assumed: the agent running `/update-dependencies` watches the script itself, not a separate helper agent, because it already holds the context to fix a failure and a helper adds a handoff with nothing to gain.
- **2026-09-29** — Assumed: the script updates the tools it can install without a password (the OpenSpec and browser CLIs) and only reports `gh`, `git`, and Node, because those need the system package manager and the required-tools page says to ask first.
- **2026-09-29** — Assumed: the script runs no app test suite; CI stays the gate, because the delivery rule says nothing builds locally, and the `dependencies` spec already forbids a local suite as the gate.
- **2026-09-29** — Assumed: the script runs the OpenSpec contract test locally after a CLI update, because it needs only Node and the CLI, and the skill already checks the contract on a disposable folder.
- **2026-09-29** — Assumed: a major the agent cannot migrate is held back at its old version and named in the report, so the rest of the update still ships.
- **2026-09-29** — Assumed: `@types/node` stays on the Node major in `.nvmrc`, matching the Dependabot rule.
- **2026-09-29** — Assumed: the plan's "run /save" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-29** — Assumed: the survey asks `npm view` for each package instead of `npm outdated`, because with no `node_modules` installed `npm outdated` skipped every dev dependency.
- **2026-09-29** — Assumed: a `--hold <package>` flag keeps a major the agent could not migrate at its old range, because otherwise the next run bumps it again.
- **2026-09-29** — Archive checkpoint: archived by `/ship` and saved; no payload release, since the skill is source-only.
