# New workspaces get a name you can read

**Status:** ready-to-ship
**Branch:** workspace-naming-defaults
**Open questions:** none

## Why

Some workspaces still show a code-style name in Paseo's list, like `customer-brain-confidence`, or a placeholder like `main` or `hello-world`, so you can't tell what each one is for. They come from two gaps: an agent that opens a workspace its own way skips the naming step, and picking up a saved plan names the workspace after the plan's short code instead of its title.

## What Changes

- **Every new workspace gets a plain-words name.** A code-style name is turned into words (`customer-brain-confidence` → *Customer brain confidence*), and picking up a saved plan uses the plan's title, such as *New workspaces get a name you can read*.
  ```text
  Before                       After
  ──────────────────────────   ────────────────────────────
  ● customer-brain-confidence  ● Customer brain: data-
                                 weighted confidence
  ● add-auth                   ● Sign in with Google
  ```
- **A placeholder name is refused.** A name like *main*, *test*, or *hello-world* stops before anything opens, and the agent picks one that says what the work is.
- **Agents open workspaces one way.** The instructions say every new workspace opens through the one helper that names it; opening one directly leaves it named after its branch.
- **The one open workspace with a code-style name is fixed.** ClaymooApp's `customer-brain-confidence` now reads *Customer brain: data-weighted confidence*.

**Non-goals:** folder and branch names stay as they are; workspaces you start yourself in Paseo keep the name Paseo gives them from your first message, which already reads well.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-part-workspaces`: a workspace's name is plain words: a code-style title is turned into words, a placeholder title is refused, and a picked-up plan is named by its title.

## Impact

- `.agents/skills/schedule/scripts/workspace.mjs`: `workspaceTitle()` turns a slug into words and refuses a placeholder (exit 2) before `paseo run`.
- `scripts/tests/workspace.test.mjs`: cases for the slug, the placeholder, and an ordinary title.
- `.agents/skills/plan/references/new-workspace.md`: a good title, open only through `workspace.mjs`, and `/continue`'s pickup titled by the plan's `#` heading.
- `wiki/development/the-change-loop.md`: one line that a raw `paseo run --new-workspace` leaves the branch as the name.
- `openspec/specs/multi-part-workspaces/spec.md` (delta), `CHANGELOG.md`.

## Decision log

- **2026-10-23** — Assumed: the cause is agents opening workspaces with a raw `paseo run --new-workspace` (ClaymooApp's `customer-brain-confidence`, plus two archived ones whose title is empty in Paseo's workspace list), because `paseo run --title` names only the agent and the list then falls back to the branch.
- **2026-10-23** — Assumed: a slug title is turned into words rather than refused, because `/daily` runs a refused hand-off in its own chat, and *Customer brain confidence* is already readable.
- **2026-10-23** — Assumed: only placeholder names (main, master, test, hello world, untitled, workspace and the like) are refused, with exit 2 before anything opens, because no conversion makes them descriptive.
- **2026-10-23** — Assumed: `/continue`'s workspace takes the plan's `#` title, not the change name, because the change name is exactly the slug the person can't read.
- **2026-10-23** — Assumed: the open `customer-brain-confidence` workspace was renamed to its agent's title before drafting, as the earlier naming change did for its two, because a rename is harmless and undone by another.
- **2026-10-23** — Assumed: ships as a patch, because it tightens existing naming and adds no command.
- **2026-10-23** — Archive checkpoint: `workspace.mjs` turns a slug title into words and refuses a placeholder; the pickup takes the plan's `#` title minus quotes and backticks, after the review found an apostrophe broke the quoted command. Workspace tests and local checks pass. Ships as 44.9.4.
- **2026-10-23** — Archive checkpoint: renumbered 44.10.1 after #445 took 44.10.0; trimmed the change loop's new line by a few words to fit the save route's size limit after `main` came in.
