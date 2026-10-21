# Proposal

**Status:** ready-to-ship
**Branch:** subtle-lion
**Open questions:** none

## Why

A teammate who can save changes through the app can hide their own code in a saved change. When the owner picks that change up with `/continue`, the assistant switches to it at once, and its background helpers run the teammate's code as the owner before anyone has looked, with the owner's keys, saved logins and cards in reach. The Cloudflare security check confirmed this as a high finding.

## What Changes

- **Picking up someone else's work stops and shows it first.** Before switching to a saved change that holds work this computer has never had, the assistant lists the files it changes, the ones that run code first, and asks. Nothing from that work runs, and nothing switches, until you say yes. Your own work on this computer picks up as today, with no ask.
  ```mermaid
  flowchart TD
    pick["/continue a saved change"] --> new{"work this computer<br/>has never had?"}
    new -->|no| switch["switch and build, as today"]
    new -->|yes| show["show the files it changes,<br/>code first, and ask"]
    show -->|"switch and look"| look["switch, recap, build nothing yet"]
    show -->|"don't switch"| stay["stay here; nothing runs"]
  ```

- **A yes covers only what you saw.** If the teammate saves more after you looked, the switch stops and shows the new part. After a yes, the assistant recaps the change and asks before building, because building runs the change's own tests.

- **A new workspace on that work needs the same yes.** Opening someone else's saved change in a new workspace, when this one is busy, asks first the same way, and the new workspace opens exactly what you saw.

- **"Someone else's" means new to this computer, not a name.** Anyone can type your email onto their work, so the check doesn't trust names. Your own work saved from another computer, or by a scheduled run in the cloud, gets the ask once too.

**Non-goals:** the background helpers keep running the copy that's switched in; a switch you make by hand, outside `/continue`, isn't checked ([design](design.md#decisions) says why). The mode a new workspace starts in, and which settings the local checks pass to a change's tests, stay as they are: both are separate hardening notes from the same check.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-loop`: `/continue` reviews work new to this computer before checkout, checks out only the reviewed commit, and does not start `/apply` in the same turn.
- `multi-part-workspaces`: opening a saved branch in a new workspace needs the same review, pinned to the reviewed commit.

## Impact

- New `.agents/skills/continue/scripts/pickup.mjs` (`check` and `switch`), with `scripts/tests/pickup.test.mjs` holding the finding's regression fixture.
- `.agents/skills/continue/SKILL.md` step 3 and step 4 route checkout through the script; `.agents/skills/plan/references/new-workspace.md` pick-up section.
- `.agents/skills/schedule/scripts/workspace.mjs` `open --checkout` requires `--reviewed <commit>`; `scripts/tests/workspace.test.mjs`.
- Docs: `wiki/development/the-change-loop.md`, `wiki/stack/employee-project.md` (who publishes); `CHANGELOG.md`; `.agents/skills/memory/references/areas.json` (continue's paths).
- Payload: the new script ships with the `continue` skill.

## Decision log

- **2026-10-21** — Asked whether to also make the background helpers always run the published copy → Matthew left it to the best long-term call; chose the check before pickup alone, because a change also carries the helpers' settings file, which a fresh chat reads, so pinning the helpers would not close the hole and would stop helper edits working on a change before it's published.
- **2026-10-21** — Asked how to tell work came from someone else → chose "new to this computer", because a name on the work can be faked; your own work from another computer gets one ask.
- **2026-10-21** — Assumed: a branch with new work asks whatever files it changes, plans and wiki pages included, listing code first, because `/apply` follows a plan's text with full permissions.
- **2026-10-21** — Assumed: work already published on the main branch counts as known, because only the owner, an Admin, or a publish-tick holder publishes, after the checks.
- **2026-10-21** — Assumed: after a yes, `/continue` recaps and asks before building, never starting `/apply` that turn, because building runs the change's own install and tests.
- **2026-10-21** — Assumed: the regression test is the security check's own fixture: a teammate branch that only edits the memory library shared by every hook, which must leave no marker after the pickup.
- **2026-10-21** — Built: a branch that exists only on this computer switches with no ask, because every commit on it is already here; the design had it stop. The pickup also fetches the main branch, so a teammate's merge of newly published work lists only the merger's files.
- **2026-10-21** — Built: a new workspace opened on reviewed work gets *ask before building* in its first message, so its own `/continue` doesn't start building there unasked.
- **2026-10-21** — Assumed: the pickup trusts only the branch origin publishes, read from origin/HEAD or asked of origin, and no remote branch when neither answers, because anyone who saves can push a branch named `main`, which the app protects only when it is the published one.
- **2026-10-21** — Assumed: the file list always includes a first commit's files and both sides of a rename, whatever the owner's settings, because a teammate's unrelated history merged in otherwise listed no files.
- **2026-10-21** — Assumed: the yes option reads *Switch to it* (then its code runs on this computer, with your keys), because switching starts the change's code at once; a cut duplicate clause in step 2 keeps the skill text in budget.
- **2026-10-21** — Assumed: `/continue` step 4 builds nothing when told *ask before building*, even with an instruction, rather than dropping the instruction from the new workspace's brief, because the brief already carries those words and one rule costs fewer bytes.
- **2026-10-21** — Assumed: when fetching, the pickup asks origin which branch it publishes before trusting the saved origin/HEAD, because a rename on the server leaves the saved one naming the old branch, which a teammate can then push.
- **2026-10-21** — Archive checkpoint: built, second look found six fixes over two rounds (a teammate's `main` on a repo publishing another branch, a stale saved origin/HEAD after a server rename, a file list hidden by the owner's git settings, the yes option not saying the code then runs, a new workspace's instruction building unasked, and a checkout pattern the text test missed), all fixed with tests; local pre-check passed; archived for ship.
