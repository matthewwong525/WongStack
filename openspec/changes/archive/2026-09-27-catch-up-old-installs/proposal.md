# Updates catch up old, heavily edited installs

**Status:** ready-to-ship
**Branch:** aquatic-wolf
**Open questions:** none

## Why

A repo set up a few months ago is the normal case for a business owner, and it is badly served today. Release 19.0.0 says such installs must be set up again from scratch, which would throw away months of their own edits. Yet the update runs on them anyway, with no warning and none of the moves they need. The oldest install can't be checked at all. Hand steps from skipped releases hide in the release notes, and the latest real update plan read like an engineer's diff.

## What Changes

- **Old installs update in place.** A repo from before 19.0.0 gets one update plan that also makes the few moves it missed: the shared agent folder, the rules file both agents read, wiki pages moved back where they belong, and leftover old skills. Every edit the person made stays.
  ```text
  old repo (months behind)
        │
        ▼
  update check
    ├─ what changed upstream
    ├─ moves this repo missed
    └─ hand steps from skipped releases
        │
        ▼
  one plan to review
        │
        ▼
  build, merge check, publish
  ```
- **The oldest installs can be checked.** A repo from before WongStack kept a file list (SuccessStoryClub, on 7.2.0) now gets a plan instead of an error. Every WongStack file it has is treated as possibly edited, so nothing is overwritten.
- **Hand steps from every skipped release land in the plan.** A repo that skipped 40 releases gets each release's "do this yourself" note as a to-do in its plan, such as "run the memory upgrade once after publishing". Today those notes sit only in the release history.
- **Nothing new gets lost in a big merge.** After new WongStack text is merged into files the person edited, a check lists any new text that didn't make it in. The plan must take it or say why it left it out. An earlier merge once dropped a whole section with no warning.
- **Update plans read plainly.** The plan's page sorts an update into what you get, what changes in how you work, what of yours stays, what's left out and why, and what you do yourself. Counts, file names, and commands move to the details. The page builder warns when any plan's summary names more than 12 files or commands.
  ```text
  ┌ Update to 26.12 ────────────────┐
  │ What you get                    │
  │  • ...                          │
  │ What changes in how you work    │
  │  • ...                          │
  │ What of yours stays             │
  │  • your edits to 44 files       │
  │ Left out, and why               │
  │  • starter app: you have one    │
  │ What you do yourself            │
  │  • after publishing: ...        │
  └─────────────────────────────────┘
  ```
- **Tested on a real install.** Before publishing, a throwaway copy of WongOS (16.6.1, with its own edits in over 40 WongStack files) runs a full update to its plan page. The check also runs on all six real installs here. Nothing is published from the copy.

**Non-goals:** Repos with no install record (ClaymooHeadless) still go to setup. The old notes-folder move stays out, since each repo handles its own notes. One big update stays one plan, not several. Actually updating WongOS or any other real repo is its own later sync.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wong-sync`: *Sync never guesses a result* no longer errors when only the installed commit lacks a payload inventory; new requirements catch up installs from before 19.0.0 in place, carry every skipped release's by-hand steps into the plan, check merged files for dropped upstream text, and write the plan in the person's terms.
- `stack-pack` and `app-scaffold`: an earlier release's opt-out flag no longer means "set it up again"; the sync plan names that part as left out and the repo updates in place.
- `ux-wireframes`: a new requirement makes the review page builder warn when Why and What Changes name more than 12 files or commands.

## Impact

- `.agents/skills/wong-sync/scripts/preflight.mjs`: additive fields in schema 1 (`catchUp`, `updating`), and an empty baseline when the installed commit has no `payload-files.json`.
- New `.agents/skills/wong-sync/scripts/merge-check.mjs` and `.agents/skills/wong-sync/references/catch-up.md`.
- `.agents/skills/wong-sync/SKILL.md` and `references/payload-manifest.md`: the handoff names the catch-up page, the by-hand steps, the merge check, and the plain grouping.
- `.agents/skills/plan/scripts/build-review.mjs`: the code-span warning.
- `scripts/tests/wong-sync-preflight.test.mjs`, a new `scripts/tests/wong-sync-merge-check.test.mjs`, `scripts/tests/review.test.mjs`.
- `scripts/retired-names.json`: `allow` entries so the catch-up page may name retired record fields.
- `CHANGELOG.md`: a `## Next (minor)` entry, and the *Before 19.0.0* note points at the catch-up page.
- Overlaps the sibling part that shortens skill and wiki text, including `/wong-sync`'s; whichever publishes second catches up.

## Decision log

- **2026-09-27** — Asked, in the parent request, where these ideas came from and who they serve → a peer review (witty-cobra); business owners using AI across their business.
- **2026-09-27** — Asked, in the parent request, how to test → drive a real old install, not a fixture, where practical.
- **2026-09-27** — Asked what an update does with installs older than 19.0.0 → chose catch them up in place, keeping every local edit.
- **2026-09-27** — Asked which real install to drive through a full update → chose WongOS, on a throwaway copy.
- **2026-09-27** — Asked whether to add a check for upstream text dropped in a merge → chose yes, a check after merging.
- **2026-09-27** — Assumed: the preflight keeps schema version 1 and only adds fields, because an old install runs its own installed `/wong-sync` text against the source's preflight, and that text rejects an unknown schema version.
- **2026-09-27** — Assumed: catch-up needs are detected by the preflight from the repo's layout and record, not judged by the agent, because the same inputs should always give the same list.
- **2026-09-27** — Assumed: an old record's opt-out flags (such as no starter app) are the person's earlier choice, so the plan lists those parts as left out rather than adding them, because an old choice should suppress work until the person reverses it.
- **2026-09-27** — Assumed: leftover generated `openspec-*` skills are listed for removal in the plan, not matched by the old hash script, because the review page is the check and restoring the script brings back code 19.0.0 removed.
- **2026-09-27** — Assumed: the plain-words warning fires above 12 code spans in Why and What Changes, because this repo's recent plans use at most 8 and the last real update plan used 38.
- **2026-09-27** — Assumed: one big update stays one plan, because the install record advances once and the merge check covers the risk of a large merge.
- **2026-09-27** — Assumed: the WongOS run uses a local clone with its remote removed and background memory capture off, because a headless run in a WongStack checkout otherwise starts a real capture and could push.
- **2026-09-27** — Assumed: no UX section, because the review page keeps its layout; only a sync plan's wording changes, as the second drawing shows.
- **2026-09-27** — Assumed: a missing `.codex` link also raises `codex-folder`, because WongOS has the new folder layout but no `.codex`, so Codex would miss its hooks and nothing else plans the link.
- **2026-09-27** — Assumed: `deploy-token` asks the plan to check for an existing `<repo>-deploy` token first, because WongOS made the 18.0.0 folder move by hand while its record still says 16.6.1.
- **2026-09-27** — The new preflight ran read-only on all six installs (source 26.11.0 at `1f41711`), 0.5–1.2 s each, with no errors. ClaymooApp 16.6.0: 155 changed, 31 adapted; agent-folder, codex-folder, rules-file-reversed, wiki-elsewhere, opted-out. ClaymooStore 15.0.0: 147 changed, 22 adapted; agent-folder, codex-folder, rules-file, generated-openspec. WongOS 16.6.1: 155 changed, 47 adapted; codex-folder, deploy-token. CarolOS 16.3.0: 155 changed, 37 adapted; agent-folder, codex-folder, rules-file, deploy-token. SuccessStoryClub 7.2.0: `update`, 148 changed (all added), 16 adapted; agent-folder, codex-folder, rules-file, generated-openspec, no-baseline. wongstack-cloud 26.1.0: 52 changed, 6 adapted, no catch-up needed. Each pre-19 install gets 52 `updating` entries, 39 with a hand-step note; wongstack-cloud gets 11.
- **2026-09-27** — Assumed: the four handoff lines live in the payload manifest, linked from `SKILL.md`, because an old install runs its own installed `/wong-sync` and reads only the source's manifest, so guidance kept in the source `SKILL.md` would never reach it.
- **2026-09-27** — Assumed: the `stack-pack` and `app-scaffold` specs get deltas, because both still said a repo with an old opt-out flag must be set up again, which this change reverses.
- **2026-09-27** — Ran `/wong-sync` headless on a throwaway WongOS clone (no remote) against this branch. First run: the plan made both catch-up moves, carried the memory upgrade once, and named left-out parts with reasons, but its summary named 32 files or commands, because the installed 16.x skill hands `/explore` its own fixed text. The manifest's *Planning an update* lines now say to add them word for word, whichever skill gets the report. Rerun: five plain groups, no builder warning.
- **2026-09-27** — `merge-check.mjs` on the WongOS clone, with three edited files merged by hand (a `/save` reference, `wiki/voice.md`, the rules block): all three clean; with a section cut from two of them, it named each file, line range, and first line; clean again once restored.
- **2026-09-27** — Assumed: task 5.1 is complete once its local checks pass, because its CI part is `/ship`'s own `/save` gate, which stops the merge on failure.
- **2026-09-27** — Distilled: `.agents/rules/payload.md` now says a changelog **Updating.** note becomes a to-do in every sync plan, so hand steps are written plainly; the other change facts are open threads or already in the manifest.
- **2026-09-27** — Archive checkpoint: built all tasks, merged 26.13.0 and the sibling's 26.14.0 (shorter wording kept, this change's lines added), numbered 26.15.0, and saved for `/ship`.
