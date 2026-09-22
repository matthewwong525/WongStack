## 1. The shared convention

- [x] 1.1 Write `.claude/skills/explore/references/asking-the-user.md`: the anatomy of an ask — two or three real options, the recommended one first and labelled `(Recommended)`, a short tradeoff on each, the host's free-text path preserved, and a structured free-text question where options would be artificial (per `review.html#/anatomy/budget`).
- [x] 1.2 Add the host mechanism section to the same file: Codex `request_user_input` → Claude `AskUserQuestion` → another equivalent structured tool → numbered chat → recommended defaults labelled `assumed` only where nobody can answer, plus the rule that an asynchronous question stays pending (per `review.html#/mechanism`).
- [x] 1.3 Add the confirmations-and-offers section: a yes/no confirmation is a two-option question naming each consequence; a selection menu shows the identifying detail; several candidates are never resolved by a guess.
- [x] 1.4 Add the form-not-authorization rule: the convention decides how a question looks, never which actions need one; an authorized runbook action is taken and reported (per `review.html#/sites/authorized`).
- [x] 1.5 Add the closing next-step section: before finishing, answer *what does the user need to decide for this to continue?* and put it as the same kind of question; an authorized handoff inside a chain continues instead of asking (per `review.html#/next-step`).
- [x] 1.6 Keep the file short enough to read at an ask site, in [Simplified Technical English](../../../wiki/voice.md), with links up to `/explore` and sideways to the skills that cite it.

## 2. The explore skill

- [x] 2.1 Replace `/explore`'s `## Question mechanism` section with a link to the shared reference, keeping the 80/20 test, the small-group rule, the exit round, and the four-question ceiling in `/explore`.
- [x] 2.2 Update every in-repo link that points at `#question-mechanism` so it resolves after the edit (`/continue`, `/improve`, and any wiki page that cites it).

## 3. The workflow skills

- [x] 3.1 `/continue`: replace the restated tool order in the no-handle menu with a link to the convention, and give the dirty-tree stop, the ambiguous PR/index handle, and the several-candidates stop their options (per `review.html#/sites`).
- [x] 3.2 `/apply`: give the unresolved-candidate ask its options; end a blocked or partial report with the next step (per `review.html#/next-step/after`).
- [x] 3.3 `/plan`: end the standalone stop-for-review with the next step — apply, revise, or stop.
- [x] 3.4 `/save`: cite the convention where the runbook confirms an action outside its scope; end the checkpoint report with the next step.
- [x] 3.5 `/ship`: give the two-active-changes stop and the `FAILURE` fix-or-merge fork their options, and keep the standing authorization for the archive-and-merge chain unprompted.
- [x] 3.6 `/verify`: give the several-plausible-changes selection and the ambiguous-evidence stop their options; end the evidence report with the next step.
- [x] 3.7 `/improve`: point the selection round at the shared convention instead of repeating its rules, and end the report with the next step.

## 4. The install and stack skills

- [x] 4.1 `/wong-setup` and `/wong-sync`: confirm they delegate questions to `/explore`, and cite the convention for any ask they make themselves.
- [x] 4.2 `/wong-cloudflare`: turn the pack offer, the account pick, and the teardown delete confirmation into structured choices in the skill's plain-language voice; leave the token widen unprompted and keep the "ask before creating or deleting anything billable" rule.

## 5. Release

- [x] 5.1 Add the convention to [`.claude/rules/payload.md`](../../../.claude/rules/payload.md) as the one-line reminder for payload edits that touch an ask site.
- [x] 5.2 Bump `VERSION` (minor) and add a newest-first `CHANGELOG.md` entry.
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`; fix what they report.
- [ ] 5.4 Run `openspec validate "add-structured-asks" --strict --no-interactive` and rebuild the review page with `node .claude/skills/plan/scripts/build-review.mjs openspec/changes/add-structured-asks --require-current`.
- [x] 5.5 Confirm CI is green through `/save` — nothing builds locally, so the checkpoint is the means of completion.
