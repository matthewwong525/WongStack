# Design

## Context

See proposal.md for why. `/explore`'s *The exit round* is the runbook for questions before planning; `/plan`, `/wong-sync`, `/improve`, and `wiki/development/the-change-loop.md` each restate the one-round limit. A 16.x install's own `/wong-sync` hands the preflight report to `/explore` with fixed text (memory #382), so its agent can end at standalone explore's *Plan it?* question. Every sync, however old, reads `payload-manifest.md` *Planning an update* from the source and adds its lines to the handoff word for word.

## Goals / Non-Goals

**Goals:**
- One page owns when follow-up questions are allowed: `/explore`'s *The exit round*. The others link it and drop their "one round" wording.
- A sync with an update always lands at a plan, in current and old installs.

**Non-Goals:**
- Changing the ask format, the question tool order, standalone explore's *Plan it?* ending when the person ran `/explore` themselves, the one new-workspace question, or review notes.

## Decisions

- **Follow-ups keep the bar.** Each group holds only choices a wrong guess would make the plan *wrong*, no more questions than the tool holds, and nothing already answered. A follow-up is allowed only when the last answers opened such a choice; with nothing open, asking stops. Minor gaps stay recorded assumptions. Alternative: no bar, which invites filler rounds on a phone.
- **Keep the heading *The exit round*.** Installs link `#the-exit-round` and `check-payload-links.mjs` fails a missing anchor. The section's first line says it may take follow-up groups.
- **Bounded mode loses "one chance to ask"** and the "no second group" line becomes "never re-ask a settled choice", so a nested `/plan` from `/apply` or `/ship` may still ask what is genuinely open.
- **Old installs through the manifest.** Add one line to *Planning an update*: go straight into `/plan`; when the installed skill says `/explore`, run it as `/plan`'s bounded pass and never stop at *Plan it?*. The current `/wong-sync` gets the same sentence in its own words.
- **Build and publish runs `/ship`.** It sits second, under *Build it now (Recommended)*, so publishing unseen work stays a deliberate pick. Four options fit every question tool WongStack uses. `/ship` already builds an unfinished change through `/apply`, so no new chain is needed.
- **Spec shape.** `asking-the-user` drops a scenario (*A gap after the round*), so the requirement is REMOVED and ADDED under a new name per the CLI contract; the other two are MODIFIED.

## Risks / Trade-offs

- [More rounds slow a plan down] → each round must pass the same "wrong, not different" bar, and a settled choice is never re-asked.
- [An old install's agent may still follow its own skill's *Plan it?* ending] → the manifest line is read and added to the handoff word for word; check on the next real old-install sync.
- [PR #187 edits nearby paragraphs] → rebase whichever merges second.
