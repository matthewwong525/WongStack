# Tasks — wong-sync-plans-via-plan

## 1. /wong-sync — delegate authoring to /plan

- [x] 1.1 In `.claude/skills/wong-sync/SKILL.md`, rewrite Step 3's output paragraph and the hard rules: the run's second artifact is a change **authored by the repo's plan skill, invoked by the sync with one fully composed instruction** (resolved name `sync-wongstack-<YYYY-MM-DD>` with the sync applying the `-2`/`-3` suffix itself before invoking, verbatim proposal and tasks bodies, spec scoping). Keep the hand-rolled write only as the named degraded mode when no plan skill exists. Keep "the run writes two paths", "no git", "the approval decision is never a prompt", and the seed-manifest exception intact. `/plan` and `/apply` are not edited.
- [x] 1.2 In `.claude/skills/wong-sync/references/adapt.md`, rewrite "The output" section around the invocation: the flow (research → clarification → verdicts → invoke `/plan`), what the instruction carries (name, verbatim proposal body, tasks body, spec scoping), plan-skill resolution via `SKILLMAP` (local renames), the blocker path (returns to the sync, which reports — never prompts), and the degraded mode. Preserve the after-picture and task-shape content as the specification of the composed bodies.
- [x] 1.3 Add the delta-spec scoping rule to `adapt.md`: delta specs for `adopt` grafts only; never for vendored payload copies/updates, with the staleness rationale — stated in the instruction because `/plan`'s default is to emit them broadly. State that `design.md` is an optional per-run snapshot and `.claude/wong-sync-verdicts.md` stays the only authoritative store.

## 2. Release

- [x] 2.1 Bump `VERSION` (minor) and add the `CHANGELOG.md` entry describing the delegation (sync composes, `/plan` authors), the sync-side collision resolution, and the graft-only delta-spec rule.
- [x] 2.2 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports.
