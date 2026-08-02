## 1. The adapt reference — `.claude/skills/wong-sync/references/adapt.md`

- [x] 1.1 Rewrite the verdict table in "The gap analysis" to five verdicts — `present`, `divergent`, `adopt`, `not-applicable`, `declined` — with a "becomes a task?" column that reads `yes` only for `adopt`, and a lead-in stating the split axis is **who decided**: `not-applicable` is the skill's judgment, `declined` is only ever the user's.
- [x] 1.2 Replace the "Check `assumes` before proposing" paragraph so an unmet assumption resolves to `not-applicable` with the assumption named, not `declined`.
- [x] 1.3 Update "The concreteness bar" so a graft that can't be described concretely is `not-applicable` rather than `declined`, keeping the existing ✗/✓ example.
- [x] 1.4 Rewrite "The ledger" section: only `declined` suppresses; `present`/`divergent`/`adopt`/`not-applicable` are recomputed from scratch each run and their entries are a last-computed snapshot for reporting and retirement detection, not authority. State explicitly that `not-applicable` turns on the *target's* shape, so an upstream `asOfCommit` must not freeze it. Keep the re-raise rule for `declined` and the retired-id rule unchanged.
- [x] 1.5 Add the lazy-migration line: a `declined` entry written by an earlier version is honored as a user refusal (the conservative read), per design.md Decision 2 and its Risks entry.
- [x] 1.6 Rewrite "The output" section to name two artifacts — `.claude/wong-sync-verdicts.md` (every run) and the change folder (only when something is `adopt`) — keeping the never-overwrite-a-change-folder and no-empty-change rules, and correcting the no-OpenSpec case to note the verdict record is still written.
- [x] 1.7 Add a new section specifying `.claude/wong-sync-verdicts.md`: the generated-file header, the per-verdict groups, one line per capability (`id` — reason), checkbox lines for every non-`adopt` entry, the re-raised and retired sections, and that it is committed rather than ignored. Include a short worked example matching design.md Decision 4.
- [x] 1.8 Add the promotion rule: each run reads the existing verdict file first, collects ticked ids, force-verdicts them `adopt` for that run, clears any `declined` ledger entry among them, shows them under the adopted group on regeneration, and names them in the report.
- [x] 1.9 Rewrite "The report" section as a summary that points at the verdict file — adopt items and the change folder, a count for divergent/not-applicable/present, promoted-by-tick named, re-raised and retired named — and keep "never show either subagent's report verbatim".
- [x] 1.10 Update the ASCII pipeline diagram at the top so the verdict box lists all five verdicts and the output shows both artifacts.

## 2. The skill — `.claude/skills/wong-sync/SKILL.md`

- [x] 2.1 Update the Step 3 summary paragraph: five verdicts, and the two artifacts the step writes.
- [x] 2.2 Update Step 4's `capabilities` bullet so the ledger's suppression rule reads "only `declined`", with the recompute-everything-else statement and the `asOfCommit` clarification for `not-applicable`.
- [x] 2.3 Update the Step 4 JSON sketch's `verdict` enum to `present|divergent|adopt|not-applicable|declined`.
- [x] 2.4 Rewrite Step 5's **Adapted** bullet to point at `.claude/wong-sync-verdicts.md` as the deliverable, and amend the closing "nothing copied and nothing to adopt" line so it says the verdict record is written regardless.
- [x] 2.5 Amend the Step 2/Step 3 preamble bullet "Never overwrite" (and the matching Hard rule) to the authorship-scoped form: the skill may rewrite files it generates — the manifest and the verdict record — and never rewrites authored content. Add `.claude/wong-sync-verdicts.md` to the stated write scope in both places.
- [x] 2.6 Add a Hard rule that `declined` is only ever written from an actual user decision.

## 3. Release

- [x] 3.1 Bump `VERSION` from 8.2.0 to 8.3.0.
- [x] 3.2 Add a newest-first `CHANGELOG.md` entry for 8.3.0 covering the `not-applicable` split, suppression narrowing to `declined` alone (noting `divergent` entries stop suppressing), the new `.claude/wong-sync-verdicts.md`, the tick-to-promote path, and the lazy migration for pre-8.3.0 `declined` entries.

## 4. Consistency pass

- [x] 4.1 Grep the payload for stale references to the four-verdict taxonomy or to `declined` meaning "wrong for this repo" (`.claude/skills/`, `CLAUDE.md`'s `WONG-STACK` block, `README.md`) and reconcile any hit; report if there are none.
- [x] 4.2 Confirm `.claude/skills/wong-sync/references/payload-manifest.md` needs no entry — the verdict record is generated per-repo, not shipped — and state that conclusion rather than leaving it unchecked.
- [x] 4.3 Run `openspec validate wong-sync-verdict-transparency` and fix anything it flags.
