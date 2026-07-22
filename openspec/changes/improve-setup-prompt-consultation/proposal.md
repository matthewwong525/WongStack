## Why

The README's one-paste setup prompt opens with "**Set up** WongStack in this repo…", which reads as a decision-already-made install command. `wong-setup`'s Step 3 has a fast path that skips the consultation when "the user … came in having read the README and named what they want" — so an agent handed that paste jumps straight to setup and skips the fit verdict entirely. The front door's whole point (assess fit, including "not a good fit", *before* installing) never runs for the exact users the README is written for.

## What Changes

- **Reword the README paste prompt** so it asks the agent to *evaluate fit and walk the user through it*, not to install outright — the paste should be the trigger for the consultation, not a bypass of it. Keep the URL-read mechanism (still points at `wong-setup/SKILL.md`) and the beginner-friendly, one-line shape.
- **Tighten `wong-setup` Step 3's fast-path trigger** so the consultation is the *default*: the fast path fires only on an explicit skip signal ("just install it", "skip the questions"). Merely asking to "set up WongStack" — the natural reading of the README paste — SHALL run the consultation. Remove/soften the "read the README and named what they want" clause that currently catches the paste.
- Keep the fast path a real, no-toll-gate escape hatch for users who genuinely arrive decided.
- Payload edit → bump `VERSION` and add a newest-first `CHANGELOG.md` entry.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `install-onboarding`: the "Warm one-paste front door" requirement (prompt now invites the consultation rather than commanding an install) and the "Consultation is skippable" requirement (fast path fires only on an explicit skip signal; the default paste runs the consultation).

## Impact

- `README.md` — the setup-prompt code block and its surrounding sentence.
- `.claude/skills/wong-setup/SKILL.md` — Step 3 fast-path wording (and the "Hard rules" line that restates it, if it drifts).
- `VERSION`, `CHANGELOG.md` — release ritual.
- No behavior change to already-installed repos (Step 1 still short-circuits on a real manifest).
