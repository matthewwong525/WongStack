## 1. `wong-sync` SKILL.md — the run writes nothing

- [x] 1.1 Rewrite the opening flow diagram and the "Updating is adaptation, not replication" paragraph: the run analyses, writes one plan, and stops; `/apply` performs it and `/save` checkpoints. Keep the copy-if-absent / update-if-untouched / adapt-if-authored *classification* — only the writing moves.
- [x] 1.2 Rewrite the three rules under the diagram: the write scope becomes `.claude/wong-sync-verdicts.md` plus one change folder, with the seed-manifest copy named as the single exception. Keep never-overwrite-local-authorship, no-git-here, and read-only-clone intact.
- [x] 1.3 Replace "The self-update pass: first, and once" with the follow-without-installing rule: same blob-hash proof, read `SKILL.md` + `references/**` from `$WS`, discard the loaded text, re-run Step 0 against it, never re-fetch the clone, and install as an ordinary task. Drop the at-most-once rule and say why it is no longer needed. Keep the version-skew disclosure.
- [x] 1.4 Restructure Step 2 into classification-without-writing, and state the seed-manifest exception (`version` and `commit` both null → copy first, because the copy is the install). Keep the absent-manifest behaviour — stop, point at `/wong-setup` — unchanged.
- [x] 1.5 Fold Step 4's manifest rewrite into the plan as its last file task, and restate `version`/`commit` as payload state — which release this repo's files were brought to — per design.md decision 6.
- [x] 1.6 Update Step 3's summary to name the clarification stage, and update Step 5's report: which version's logic ran and why, any questions asked and how each resolved, the planned copies and updates, the change folder to review and `/apply`, and any pre-existing unapplied `sync-wongstack-*` folder.
- [x] 1.7 Rewrite the Hard rules block to match, adding the writes-nothing rule with its seed-manifest exception stated in the same place.

## 2. `wong-sync` references/adapt.md — the after-picture

- [x] 2.1 Rewrite "The output" so `proposal.md`'s contract is the four regions — After, Gain, Lose, Resolution — with the version span, file lists, and verdict-record pointer subordinate to them. Include the grouping rule (by capability, never a flat file list) and the empty-Lose justification rule.
- [x] 2.2 Rewrite the `tasks.md` contract: coarse tasks for copies, updates, self-install, then the manifest task ordered last among them, then one task per `adopt`. Remove the "review the N files this sync landed" task and say why it is gone.
- [x] 2.3 Rewrite the folder-writing trigger from "did or proposes anything" to "has anything to do", and add that an existing unapplied sync folder never suppresses a new one — the report names it instead.
- [x] 2.4 Add the `present` evidence bar to the gap-analysis rules, mirroring the `divergent` paragraph: name where this repo expresses it, or the verdict is `adopt`.
- [x] 2.5 Extend the verdict record's shape and Promotion section: every group is checkboxes including `adopt`; ticking a non-`adopt` line promotes, ticking an `adopt` line records `declined` with the clone commit. State that a deleted or unapplied task is not a refusal.
- [x] 2.6 Add the clarification stage to the gap-analysis section, positioned between the subagent reports and verdict assignment, per design.md decision 8: the three permitted question kinds, the forbidden ones (never "do you want X", never approval), the per-question admission test (changes the plan, unreadable from the repo, about intent) in place of any fixed count, one impact-ordered batch the user may abandon partway, unanswered-resolves-to-`adopt`, and answers recorded as the user's word with the clone commit so they are not re-asked.
- [x] 2.7 Rewrite the non-interactive rationale (currently framed as a trade against a per-capability prompt wall) as a trade now won: the run stays non-interactive *and* gates, because the gate is the repo's loop.
- [x] 2.8 Update the report format section for the new run shape, and correct every "landed" / "already in the working tree" phrasing left elsewhere in the file.

## 3. Release

- [x] 3.1 Bump `VERSION` to `11.0.0`.
- [x] 3.2 Add the newest-first `CHANGELOG.md` entry, marking the three breaking items (the run writes nothing, the proposal becomes an after-picture, the self-update pass is retired) and what a target repo must do — nothing.
- [x] 3.3 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports.

## 4. Consistency sweep (found during apply)

- [x] 4.1 Repoint `wong-setup`'s manifest-schema link from the retired `#step-4--rewrite-the-manifest-always-last` anchor to the new manifest section.
- [x] 4.2 Update the `WONG-STACK` block's "Stay in sync" rule and the two source-repo preamble sentences in `AGENTS.md` (`CLAUDE.md` is a symlink to it) — the block ships, so its description of the run had to stop saying it copies and updates during the run.
- [x] 4.3 Correct the one stale "copies in what's missing" sentence in `wiki/stack/d1-pipeline.md`.
