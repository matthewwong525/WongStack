# New workspaces are named after their part

**Status:** ready-to-ship
**Branch:** add-custom-workspace-naming
**Open questions:** none

## Why

When a request splits into parts and the agent opens a new workspace for each, Paseo's list shows a random name like *green-cow* or *nifty-leopard*, not the part. You can't tell which workspace holds which work. The agent inside already has the right name (*Release collisions*); the workspace just never gets it.

## What Changes

- **A new workspace shows its part's name.** Right after it opens, the workspace takes the same short name the agent got, so Paseo's list reads *Release collisions*, not *nifty-leopard*. This also covers a workspace opened to pick up saved work.
  ```text
  Before            After
  ─────────────     ──────────────────
  ● green-cow       ● Docs, specs, and
                      checks cleanup
  ● nifty-leopard   ● Release collisions
  ```
- **A failed rename still opens the workspace.** If Paseo won't take the name, the workspace and its agent still run, and the agent tells you it kept Paseo's name.
- **The two open ones are already renamed.** *green-cow* is now *Docs, specs, and checks cleanup*, and *nifty-leopard* is now *Release collisions*.

**Non-goals:** the folder and branch names stay Paseo's (*innocent-fox*); only the name you see in the list changes. Workspaces a schedule opens for each run are out too.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-part-workspaces`: adds a requirement that each workspace the agent opens is titled after its part, and that a failed rename is a warning, not a failure.

## Impact

- `.agents/skills/routine/scripts/workspace.mjs`: after `paseo run`, calls `paseo workspace rename <workspaceId> <title>`; reports the applied title, or a warning.
- `scripts/tests/workspace.test.mjs`: the fake `paseo` answers `workspace rename`; new cases for the rename and its failure.
- `.agents/skills/plan/references/new-workspace.md`: the Report section says the workspace carries the title.
- `openspec/specs/multi-part-workspaces/spec.md` (delta), `VERSION`, `CHANGELOG.md`.

## Decision log

- **2026-09-27** — Asked whether to rename the two open workspaces now → chose to rename both, to their agents' titles; done with `paseo workspace rename` before drafting.
- **2026-09-27** — Assumed: the fix is a rename right after `paseo run`, because Paseo 0.9.2's `run --new-workspace` has no workspace-title flag and its source leaves workspace titling as a to-do; `paseo workspace rename` sets the title the sidebar shows.
- **2026-09-27** — Assumed: a failed rename is a warning with exit 0, because the workspace and agent already run; failing would hide a live agent from the report.
- **2026-09-27** — Assumed: the folder and branch keep Paseo's names, because the person pointed at the list's name; a long slug makes long paths, and Paseo may rename the branch later anyway.
- **2026-09-27** — Assumed: `/continue`'s workspace keeps the change name as its title, because it already passes `--title '<change name>'` and gets the rename for free.
- **2026-09-27** — Assumed: schedule-run workspaces stay out, because Paseo's scheduler creates them without this script.
- **2026-09-27** — Assumed: ships as 26.2.0, a minor release, because it adds behavior and changes no command.
- **2026-09-27** — Assumed: task 2.3's save is `/ship`'s one checkpoint, because the change ships in the same run; a failing gate stops the merge.
- **2026-09-27** — Distilled: no repeatable fact. The change and branch had no live facts, and the Paseo behavior found here (`paseo run --title` names only the agent) is written into `workspace.mjs`'s header comment.
- **2026-09-27** — Archive checkpoint: `workspace.mjs` renames each new workspace to its part's title after `paseo run`, a refused rename is a warning, and the 18 workspace tests pass locally. The two open workspaces were renamed by hand. Ships as 26.2.0.
