> Branch from `main` **after #43 merges** — this edits `/ship` Step 4.5 and the `/wong-sync` verdict record, both of which arrive with it.
> Every edit target is under `.agents/` — `.claude` is a symlink to it, and the Edit tool will not write through the link (task 6.2 documents this).

## 1. The vendored OpenSpec layer

- [x] 1.1 Diff each `.agents/commands/opsx/<verb>.md` body against its `.agents/skills/openspec-<verb>/SKILL.md` counterpart and record, per pair, any content the command has that the skill lacks
- [x] 1.2 Fold `archive.md`'s "Output On Success (No Delta Specs)" block and any other command-only content from 1.1 into the surviving `openspec-archive-change/SKILL.md`
- [x] 1.3 Confirm `openspec-explore/SKILL.md` already carries everything `commands/opsx/explore.md` has (the command's `**Input**` list and change-name note), folding in anything it doesn't
- [x] 1.4 Replace each of the five `.agents/commands/opsx/*.md` bodies with the pointer form — frontmatter unchanged, one line invoking the named `openspec-*` skill and directing the agent to follow it verbatim
- [x] 1.5 Verify the `/opsx:apply` drift is gone: no surface says "suggest archive" on completion, and no surface references `/opsx:continue`
- [x] 1.6 Grep the payload for any remaining reference to an `/opsx:*` command that does not exist

## 2. The /ship walkthrough runbook

- [x] 2.1 Create `.agents/skills/ship/references/walkthrough.md` holding Step 4.5a–4.5f verbatim: scouting scenarios, writing journeys, the `run` call, grading against the `THEN`, failure recovery and reseeding, evidence and cleanup
- [x] 2.2 Reduce `ship/SKILL.md` Step 4.5 to the `preflight` invocation, the `RESULT: NONE` → silence rule, the five-verdict table, and a link to the reference
- [x] 2.3 Keep the three walkthrough entries in `ship/SKILL.md`'s Hard rules (opt-in-by-state, never merge on `UNKNOWN`/`TIMEOUT`, never install and never write inside the repo) and confirm they are not restated in the reference
- [x] 2.4 Verify `ship/SKILL.md` still answers what the walkthrough does, when it refuses, and what each verdict means without opening the reference

## 3. The shared git-gate runbook

- [x] 3.1 Create `.agents/skills/save/references/git-gate.md` holding the PR open/update sequence, the change-mirror PR body template, the `wait-for-checks.sh 20` call with its five result outcomes, and the capped read-fix-repush loop
- [x] 3.2 Record the `UNKNOWN` fork in that file as a per-caller table — `/save` proceeds and reports, `/ship` stops and does not merge — rather than as prose in either skill
- [x] 3.3 Replace `save/SKILL.md` Steps 5 (PR half) and 6 with the invocation plus a link, keeping `/save`-specific behavior: the preview-URL discovery, the staging-by-path rule, and the prose variant
- [x] 3.4 Replace `ship/SKILL.md` Steps 3 and 4 with the invocation plus a link, keeping `/ship`-specific behavior: the default-branch-CI preflight and the shared cap across Step 4 and Step 4.5
- [x] 3.5 Verify the cap of 3 is now stated once and that both skills' auto-fix behavior still reads correctly end to end

## 4. One verdict store in /wong-sync

- [x] 4.1 Update `.agents/skills/wong-sync/references/adapt.md`: the verdict record is the single store, `declined` entries carry the clone commit they were judged against, and suppression reads from the record
- [x] 4.2 Delete adapt.md's "The ledger" section and the lazy-migration paragraph for the pre-split `declined`/`not-applicable` ambiguity, replacing them with the record-based suppression rule
- [x] 4.3 Add the one-time migration to adapt.md: fold an existing manifest `capabilities` map into the record, honoring each `declined` as a user refusal, then write the manifest without the key
- [x] 4.4 Update `wong-sync/SKILL.md` Step 4's manifest JSON to install state only (`version`, `commit`, `installedAt`, `updatedAt`, `upstream`, `components`) and remove the split-authority paragraph
- [x] 4.5 Update `wong-sync/SKILL.md`'s frontmatter description, Step 3 summary, Step 5 report, and Hard rules for the single store
- [x] 4.6 Update adapt.md's ASCII pipeline diagram so the ledger is no longer an output (already correct as of #43 — verified, no edit needed)

## 5. Doctrine ownership

- [x] 5.1 Make `wiki/development/the-change-loop.md` the canonical statement of the loop, the gate ladder (CI → walkthrough when adopted → merge), and the prose allowlist with its rationale
- [x] 5.2 Reduce `AGENTS.md`'s "Prose goes straight to `main`" and "Routing is by path prefix" rules to one summarizing line each plus a link to the owner
- [x] 5.3 Reduce `AGENTS.md`'s "CI is the gate when present" rule — including the walkthrough paragraph #43 added — to one line plus a link
- [x] 5.4 In `save/SKILL.md`, keep the allowlist stated inline once in Step 1 and replace the Step 2 table's restatement, the Step 5 prose-variant restatement, and the Hard-rules restatement with links to Step 1
- [x] 5.5 Delete the Step 2 tiebreaker sentence ("when they seem to disagree, the paths win") — it exists only because the rule was written twice in one file
- [x] 5.6 Point `dream/SKILL.md` and `notes/README.md` at the owner instead of restating the carve-out
- [x] 5.7 Decide the open question on `README.md`'s "The workflow" section (design.md leans keep — different audience) and record the decision in the proposal's Decision log
- [x] 5.8 Re-grep for `notes/**`, `CI is the gate`, and the loop diagram across the payload and confirm each surviving hit is either the owner or a link

## 6. Stale docs

- [x] 6.1 Fix `wiki/development/adding-a-skill.md`: replace the two retired-`document`-skill citations and their dead links with `dream` (no `references/`) and `improve` (has `references/`)
- [x] 6.2 Add `wiki/development/repo-layout.md` — the `.claude`→`.agents` and `CLAUDE.md`→`AGENTS.md` symlinks, that the Edit tool will not write through them, and that `grep -r` does not follow them so audits must target `.agents/`
- [x] 6.3 Link the new page from `wiki/development/README.md`'s Processes list and from `adding-a-skill.md` step 1

## 7. Manifest and release

- [x] 7.1 Add `ship/references/walkthrough.md` and `save/references/git-gate.md` to the payload manifest's description of those skills' contents
- [x] 7.2 Note in the payload manifest that `.claude/commands/opsx/` stays vendored in this repo and is not regenerated
- [x] 7.3 Bump `VERSION` (minor — payload restructure, no behavior change beyond the `/opsx:apply` fix)
- [x] 7.4 Add a newest-first `CHANGELOG.md` entry covering the pointer form, the two extracted runbooks, the single verdict store with its migration, and doctrine ownership
- [x] 7.5 Final pass: confirm no payload file states a rule another file owns, and that every link added in this change resolves
