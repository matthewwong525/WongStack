## 1. Strip the diff engine and the contribute leg

- [x] 1.1 Delete Step 2 (three-way classification, the four-cell table, the no-base two-way fallback) and Step 3's conflict walk from `.claude/skills/wong-sync/SKILL.md`.
- [x] 1.2 Delete Steps 4 and 5 (curation, branch, release ritual, fork-aware push, PR, degraded path).
- [x] 1.3 Delete the fresh-mode (⑂) carve-outs threaded through Steps 0, 1, 2, 3, 4, 6, and 7 — fresh install is now the general rule, not a mode.
- [x] 1.4 Rewrite the opening flow diagram and the "Two rules hold throughout" section for the single behavior: refresh → copy what's absent → analyse what's present → ledger → report.
- [x] 1.5 Rewrite "Hard rules": add **never overwrite an existing file**, make the clone read-only in all cases, drop every contribute-gated and classification-gated rule.
- [x] 1.6 Add the retired-argument response — `/wong-sync contribute` stops and points at the contributing page rather than running a partial sync.
- [x] 1.7 Update the skill's YAML `description`, which currently sells three-way diffing and the contribute leg.

## 2. The copy-if-absent step

- [x] 2.1 Write the new step: for each in-scope manifest file, copy verbatim if and only if it is absent locally; hand every present file to the analysis. State the per-file threshold explicitly.
- [x] 2.2 Specify `CLAUDE.md`'s unit as the `WONG-STACK` block — no markers means insert (creating the file if needed, everything outside byte-identical); markers present means analyse, never rewrite in place.
- [x] 2.3 Specify that a skill installed under a different local name (`components.skills`) counts as **present**, so it is analysed rather than copied in again under the default name.
- [x] 2.4 Specify stack-pack scoping: pack files enter the file list only for `components.stackPack: true`, then follow the same copy-if-absent / analyse-if-present rule; the config fragments stay guided edits surfaced through the analysis.

## 3. The capability analysis

- [x] 3.1 Add the analysis step to `SKILL.md`, delegating the detail to a new reference page.
- [x] 3.2 Write `.claude/skills/wong-sync/references/adapt.md` — the pipeline in full: the two subagent briefs, the capability record shape, the four verdicts, the gap-analysis rules, the output contract, and the report format.
- [x] 3.3 In that reference, write the **cartographer** brief: reads only the clone; maps capabilities as "a thing WongStack lets you do plus what it assumes about your repo"; reads `wiki/` and the `WONG-STACK` block as first-class sources alongside `.claude/skills/`; assigns stable kebab-case ids from upstream content only; is given the existing ledger's ids to reuse; writes no files.
- [x] 3.4 In that reference, write the **surveyor** brief: reads only the target; scoped to process surfaces (skills, wiki/docs, `CLAUDE.md`, config, top-level structure), not application source; reports what the repo already does and how; writes no files.
- [x] 3.5 Specify the verdict table (`present` / `divergent` / `adopt` / `declined`), the one-line reason on each, that only `adopt` becomes a task, and that `divergent` findings get one report line each.
- [x] 3.6 Specify the stale-unmodified-file case: verdict `adopt`, task says take the upstream version verbatim, no separate verdict, never overwritten by the sync itself.
- [x] 3.7 Specify the output: `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/` with proposal + tasks; date-collision suffixing (`-2`, `-3`) that never overwrites; the concreteness bar (name the capability id, say what changes in this repo — a graft that can't be described concretely is `declined`, not a vague task); no change folder when nothing is `adopt`; inline-report fallback when the target has no `openspec/changes/`.

## 4. The capability ledger

- [x] 4.1 Add the `capabilities` map to the manifest schema in the rewritten final step: `{ <id>: { verdict, reason, asOfCommit } }`, written last, absent means nothing judged yet.
- [x] 4.2 Redefine `commit` in the skill and the schema block — the clone HEAD last synced against, driving the changelog walk and `asOfCommit`, explicitly no longer a diff base.
- [x] 4.3 Specify the re-raise rule: `declined` and `divergent` are not re-pitched unless the capability's upstream expression changed since its recorded `asOfCommit`, in which case it is re-raised naming what changed.
- [x] 4.4 Specify that a ledger id absent from a new map is reported as retired, not silently dropped.
- [x] 4.5 Specify that `upstream.fork` is preserved where present but never written.

## 5. The payload manifest reference

- [x] 5.1 Update `.claude/skills/wong-sync/references/payload-manifest.md`: the manifest bounds what the skill **copies**, not what the surveyor **reads** — state the boundary change explicitly rather than leaving it implied.
- [x] 5.2 Remove the "in both directions" / leak-upstream framing throughout and rewrite the `contributing.md` bullet to point at the manual route.
- [x] 5.3 Update the stack-pack section for the new rule (copy-if-absent / analyse-if-present) and drop its three-way-diff references.

## 6. Prose across the payload

- [x] 6.1 Rewrite `wiki/contributing.md` to the manual route — fork, branch, change, release ritual (semver `VERSION` bump + newest-first `CHANGELOG.md` entry), open the PR — keeping the generality bar as the human's test. No automated command anywhere on the page.
- [x] 6.2 Update the `WONG-STACK` block in `CLAUDE.md` and `AGENTS.md`: `/wong-sync` pulls in what's missing and proposes what's worth adopting; it never overwrites; contributing is manual.
- [x] 6.3 Update `README.md` (skill table and user story) and `wiki/README.md` for the same.
- [x] 6.4 Remove contribute-leg references and the distinct-fresh-mode framing from `.claude/skills/wong-setup/SKILL.md`; keep the `contribute-wong-stack` legacy-trace cleanup and the handoff itself.
- [x] 6.5 Sweep `wiki/development/README.md` and `wiki/development/required-tools.md` for contribute-leg assumptions (e.g. `gh` needed for the skill to open upstream PRs).

## 7. Release

- [x] 7.1 Bump `VERSION` to `7.0.0`.
- [x] 7.2 Add a newest-first `CHANGELOG.md` entry naming all three breaking parts: adaptation is now the default, files are never overwritten (copy only what's absent), and the contribute leg is gone with the manual route as its replacement.
- [x] 7.3 Re-read the whole `wong-sync` skill end to end as a target-repo user would, confirming no orphaned reference to three-way diffs, a base commit, conflicts, fresh mode, curation, candidates, forks, or a contribute argument survives.
