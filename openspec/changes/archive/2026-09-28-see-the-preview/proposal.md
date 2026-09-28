# A "See the preview" choice after a build

**Status:** ready-to-ship
**Branch:** apply-preview-link
**Open questions:** none

## Why

After a build, the agent writes the preview link and then asks *publish it?*. Some apps hide the text written just before a question box, so you never see the link and can't look at what was built. The plan's page had the same problem, and *Review the plan* fixed it.

## What Changes

- **A *See the preview* choice.** When a build finishes with a preview, its last question offers *See the preview* next to *Publish it*, *Change it more*, and *Save it*. Picking it shows the link as plain text, with nothing asked after it, so no box hides it. Nothing is built, saved, or published; your next message decides.
  ```text
       BEFORE                  AFTER
  ┌────────────────┐     ┌────────────────┐
  │ (link hidden)  │     │ (link hidden)  │
  │ Publish it?    │     │ Publish it?    │
  │ ○ Publish it   │     │ ○ Publish it   │
  │ ○ Change more  │     │ ○ Change more  │
  │ ○ Save it      │     │ ○ Save it      │
  │                │     │ ● See preview  │
  └────────────────┘     └───────┬────────┘
                                 ▼
                         ┌────────────────┐
                         │ Click here to  │
                         │ see the        │
                         │ preview:       │
                         │ https://…      │
                         └────────────────┘
  ```
- **The link opens the page you changed.** The preview link goes straight to the page that shows the change, such as a mini app's own page or the settings page, not the home page. It shows on its own line as *Click here to see the preview:*, like the plan's link. The home page is used only when the change has no page of its own.
- **A gap under the plan's link.** When a plan waits for you, a blank line now separates its link from *When you're ready, type `/apply` to build it.*, so the chat no longer runs them together.
- **The same everywhere a preview shows.** Any reply that prints a preview link and then asks a question offers the choice, such as a save you ran yourself.

Non-goals: no change to how the preview is made; no change to the live link after publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the plan's next-step line sits after a blank line; a reply that prints a preview link to the page showing the change above a closing question offers *See the preview* as the allowed fourth option; picking it ends the next reply with the link and no question.
- `apply`: the finished-change question offers *See the preview* after a preview upload.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: the fourth-option line, the no-question reply, and a *Print the preview's link* section beside *Print the plan's link*.
- `.agents/skills/plan/scripts/build-review.mjs` and `scripts/tests/review.test.mjs`: a blank line between the link line and the next-step line.
- `.agents/skills/apply/SKILL.md` *Finish with a preview* step 4: print the link line and offer *See the preview*.
- `openspec/specs/asking-the-user/spec.md` and `openspec/specs/apply/spec.md` via deltas.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Assumed: the choice mirrors *Review the plan*: it shows the link as plain text, asks nothing, and starts nothing, because the person asked for the same fix as the plan's page.
- **2026-09-28** — Assumed: the rule lives once in the shared ask convention and covers any reply that prints a preview link before a question, such as a directly run `/save`, because one rule in one place can't drift.
- **2026-09-28** — Asked for a gap between the plan's link and the line under it → chose a blank line, printed by the page builder.
- **2026-09-28** — Asked for the preview link to open where the change can be seen → chose the page that shows the change, the home page only when none does.
- **2026-09-28** — Assumed: the live link after publishing stays as is, because the person asked about the build step, and `/ship`'s report ends with no link-hiding problem reported.
- **2026-09-28** — Assumed: archived and checkpointed by `/ship` for merge, because every task was done and checks passed locally.
