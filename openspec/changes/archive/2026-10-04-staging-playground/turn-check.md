# Turn marker check

Checked 2026-10-04 on GitHub (`matthewwong525/WongStack`) with `verify-staging.sh turn take` then `turn give`:

- The push to `refs/wong/staging-turn` was accepted and `git ls-remote origin 'refs/wong/*'` showed it.
- `turn give` removed it; the remote then listed no `refs/wong/` ref.
- No workflow run started: the newest run's id was the same before and 20 seconds after.

Not checked: a hosted workspace without GitHub. None was free to test on. A refusal there follows the design's fallback: the walk goes ahead without a turn and says so.
