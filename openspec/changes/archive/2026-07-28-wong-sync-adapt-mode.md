<!-- openspec-archive v1 2026-07-28-wong-sync-adapt-mode -->
<!-- file proposal.md utf8 8535 -->
# wong-sync-adapt-mode

**Status:** ready-to-ship
**Open questions:** none

## Why

`/wong-sync` moves files. Every decision it makes is byte-level and file-scoped, so it can only tell a repo "your copy of `save/SKILL.md` is behind" — never "upstream's `/save` now auto-fixes CI failures and yours doesn't; here's how that would look in *your* repo." Anything upstream that lives outside the payload manifest is invisible by construction, and a locally customized skill produces a three-way diff rather than a recommendation. Users experience this as the sync "only grabbing surface-level features."

The fix is to change the premise: **incorporate, not replicate**. Convergence isn't byte-equality with upstream — it's the *capability* being present, expressed in whatever form fits the repo it lands in. That requires reading both sides for meaning, which a file diff can't do.

The three-way diff earns its keep in exactly one situation: the target doesn't have the file at all. There's nothing to reason about, no local form to respect, and nothing to overwrite — copying is strictly correct. Everywhere else it's the wrong tool, so it goes.

At the same time, the `contribute` leg is removed. Automating an outbound PR earns its complexity only if it runs often; contributing is rare, deliberate, and better done by hand. Removing it also resolves a tension the adapt model creates: adaptation must read the target repo broadly to understand it, and the manifest's "never read outside the list" rule existed precisely to stop local content leaking upstream. With no outbound path, that rule is no longer load-bearing on the read boundary.

## What Changes

- **Adaptation becomes the default and only analysis path.** A bare `/wong-sync` runs the capability analysis. There is no `adapt` argument and no second mode — the skill has one behavior.
- **The three-way diff, conflict walk, and diff base are removed.** No `git show <base>:<path>`, no four-cell classification, no keep-local/take-upstream prompts, no fresh-install mode as a distinct branch.
- **Absent files are copied directly; present files are analysed.** Any payload file missing locally is pulled verbatim — the safe, exact case. Any file that exists locally goes to the capability analysis, whatever state it's in. A fresh install is simply the degenerate case where every file is absent, so it needs no special mode.
- **BREAKING: `/wong-sync` never overwrites an existing file.** This is the new load-bearing guarantee, and it replaces every conflict-resolution mechanism. A stale-but-untouched skill is no longer silently refreshed; it becomes a proposed task that may say "replace with the upstream file verbatim." The exactness isn't lost — it's proposed rather than performed.
- **Two-subagent capability analysis.** A *cartographer* reads the refreshed clone and maps what WongStack lets you **do** — deliberately not file-shaped or skill-shaped, since the load-bearing capabilities (CI is the gate, branch name = change name, progressive-disclosure wiki) live in the `WONG-STACK` block and the wiki, not in `.claude/skills/`. A *surveyor* reads the target repo — what's installed, what's solved differently, what the repo's stack and shape are. Neither agent's raw output reaches the user; the main thread synthesizes the gap.
- **The analysis proposes; it never implements.** Its output is an OpenSpec change under `openspec/changes/adopt-wongstack-<date>/` — proposal + tasks, one task per capability to graft. The graft goes through `/apply → /save → CI → /ship` like any other work. This preserves "no git in this repo" and makes the sync safely re-runnable: worst case you delete a change folder.
- **A capability ledger in the manifest.** `.claude/.wong-stack.json` gains a `capabilities` map recording each capability's verdict, reason, and the clone commit it was judged at. Without it, every run re-litigates every decline. With it, the sync is idempotent *in judgment* even though it is not idempotent in bytes — and a later run can say "you declined the stack pack in March; upstream has since made it stack-agnostic — reconsider?"
- **BREAKING: the `contribute` leg is removed.** No curation, no fork handling, no upstream branch, no release ritual, no PR. The clone becomes read-only in every path.
- **`wiki/contributing.md` survives as prose.** It is how a target repo learns upstream exists at all, so the page stays in the manifest — with the `/wong-sync contribute` mechanics replaced by the manual route (fork, PR, the generality bar, the VERSION + CHANGELOG expectation).
- **Release ritual:** major bump to `7.0.0` with a newest-first `CHANGELOG.md` entry.

## Capabilities

### New Capabilities
- `wong-sync-adapt`: the capability-adoption analysis — the two subagents, the verdicts, the ledger that records them, and the OpenSpec change it proposes as its only output.

### Modified Capabilities
- `wong-sync`: the three-way classification, fresh-install mode, conflict resolution, and the entire contribute leg are removed; the pull is narrowed to absent files only; the never-overwrite guarantee is added; the manifest schema gains `capabilities` and `commit` is redefined from diff base to last-considered upstream commit.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — the majority of the file is rewritten: Steps 2–5 removed, the copy-if-absent step and the analysis pipeline added (the latter likely in `references/`).
- `.claude/skills/wong-sync/references/payload-manifest.md` — the manifest now bounds what may be *copied*, not what may be *read*; the both-directions framing goes.
- `.claude/skills/wong-setup/SKILL.md` — the fresh-mode handoff no longer names a distinct mode, and contribute references go.
- `wiki/contributing.md`, `wiki/README.md`, `README.md`, the `WONG-STACK` block in `CLAUDE.md`/`AGENTS.md`.
- `openspec/specs/wong-sync/spec.md` — via delta.
- `VERSION` → `7.0.0`, `CHANGELOG.md`.
- No code, no tests, no build: the payload is prose.

## Non-goals

The sync does not implement anything, does not touch the working tree beyond copying absent files and writing its change folder, and never modifies an existing file. Contribution is not re-automated in any form. The clone lifecycle, the source-repo refusal, and the opt-in gating of the stack pack are unchanged.

## Decision log

- **2026-07-28** — Implemented in full (34/34 tasks); `VERSION` → `7.0.0`. Explored from the complaint that `/wong-sync` "only grabs surface-level features," which turned out to be three separate gaps: manifest scope (a keyhole by construction), depth (a conflict walk is a diff, not a recommendation), and reporting. First design was a **layer** — keep the fast three-way pull, add `/wong-sync adapt` beside it. Reversed on user direction: adaptation became the default and the three-way diff was deleted outright, with a direct copy kept only where there's nothing to reason about. Chose **per-file absence** over a repo-level threshold as that boundary; the payoff was unplanned — **fresh install stopped being a mode**, since a seed manifest is just a repo where every file is absent. That let us delete the empty-tree base, the install-time collision walk, the keep-under-another-name option, and the ⑂ carve-outs threaded through six steps. The load-bearing guarantee is now **never overwrite an existing file**, which is what every removed conflict mechanism existed to manage. `contribute` removed entirely (user's call; reverses v6.7.0's two-commits-ago split) — contributing is a manual PR, and removing the outbound leg is precisely what frees the surveyor to read the target repo broadly, which is what makes adaptation work. `commit` was **redefined rather than removed** — no longer a diff base, still the changelog walk's anchor and the ledger's `asOfCommit` baseline. Ruled out: re-automating contribution in any form (including a "prepare a patch" half-measure); letting adapt implement rather than propose; a separate verdict for stale-unmodified files (the distinction lives in the task text, not the taxonomy). Accepted cost, stated in the CHANGELOG: a stale-but-untouched payload file no longer refreshes silently — it becomes a task saying "take upstream verbatim," costing a review it didn't before. The 7.3 sweep caught three orphaned references the task list hadn't named, the important one being `AGENTS.md`'s git-ownership rule still claiming `/wong-sync` "owns full git in the WongStack clone — branch, commit, push, PR."

<!-- end proposal.md -->
<!-- file design.md utf8 14231 -->
## Context

`/wong-sync` today is a three-way file differ. It resolves a cached clone (`$WS`), reads a base commit from `.claude/.wong-stack.json`, and for every file in the payload manifest compares base→upstream and base→local, then copies whole files into the target's working tree. Its guarantees are byte-shaped: convergence means the target's copy equals upstream's copy, and "never read outside the manifest" is what stops app content leaking into the outbound PR.

Both break under the model this change adopts. A capability can be present in a repo in a form that shares no bytes with upstream's expression of it, and understanding what a repo already has requires reading far more of it than the manifest lists. Meanwhile the outbound leg — the only reason the read boundary had to be tight — is removed.

```
   BEFORE                            AFTER
   ──────                            ─────
   for each manifest file:           for each manifest file:
     base→upstream, base→local         absent locally?
     4-cell classification               → copy it. done.
     copy / conflict-walk / skip       present locally?
                                          → hand to the analysis
   convergence: bytes equal
   guarantee: manifest bounds READS  convergence: capability present
                                     guarantee: never overwrite
```

The repo has no build or test suite — the payload is prose — so "implementation" means editing skill markdown, the manifest reference, the wiki, the `WONG-STACK` block, `VERSION`, and `CHANGELOG.md`.

## Goals / Non-Goals

**Goals:**
- One mode. A bare `/wong-sync` is the whole skill; no arguments, no legs, no branches the user has to know about.
- Keep the file copy only where it is trivially correct — the file isn't there.
- Make the analysis capability-shaped rather than file-shaped, so cross-cutting conventions (which live in the wiki and the `WONG-STACK` block, not in `.claude/skills/`) are first-class subjects.
- Produce exactly one analysis artifact — an OpenSpec change folder — and nothing else.
- Record verdicts durably so repeat runs don't re-pitch declined capabilities.
- Remove the contribute leg completely, leaving contributing as documented manual practice.

**Non-Goals:**
- The sync does not implement, modify any existing file, or run git in the target.
- No re-automation of contribution in any form, including a "prepare a patch" half-measure.
- No change to the clone lifecycle, the source-repo refusal, or the opt-in gating of the stack pack.

## Decisions

### Adapt is the default; there is no second mode

The skill takes no arguments. Every run refreshes the clone, copies absent payload files, analyses the rest, writes the ledger, and reports.

*Why not the layered "`/wong-sync` fast, `/wong-sync adapt` smart" design considered first:* two modes means two truths to keep in sync, two sets of prose, and a user who has to know which one to reach for — while the fast mode's only genuinely safe operation (copying a file that isn't there) can simply be kept in the single mode at no cost. Collapsing to one mode removes the entire classification apparatus rather than preserving it beside a second path.

*Cost, accepted:* refreshing a stale-but-untouched skill is no longer a silent copy. It becomes a proposed task. The exactness is preserved — such a task can and should say "replace with the upstream file verbatim" — but it now costs a review and an `/apply`. That is the price of the never-overwrite guarantee, and it is worth it: the silent-refresh case is precisely where the old sync quietly clobbered work people thought was theirs.

### The threshold is per-file absence, not per-repo

Any manifest file missing locally is copied verbatim. Any file present locally goes to the analysis, whatever state it's in.

*Why per-file rather than "only a brand-new install pulls":* a repo-level threshold would send a brand-new upstream skill the target has never seen through a full capability analysis to conclude "yes, take it" — analysis with no local form to weigh it against. Per-file absence is the precise statement of "there is nothing to reason about here."

*Consequence, and the reason this simplifies rather than complicates:* **fresh install stops being a mode.** A seed manifest is just a repo where every manifest file is absent, so the install falls out of the general rule. The `commit: null` branch, the empty-tree base, the install-time collision walk, and the "contribute leg is idle" carve-out all disappear. `wong-setup`'s handoff doesn't change — it still hands off to `/wong-sync` — but there is no longer a distinct mode on the other side.

*The unit for `CLAUDE.md` is the block, not the file.* No `WONG-STACK` markers → insert the block (creating the file if needed), touching nothing outside it. Markers present → the block goes to the analysis and is never rewritten in place.

### Never overwrite

This is the guarantee that replaces conflict resolution. `/wong-sync` writes only: files that did not exist, the `WONG-STACK` block where no markers existed, its change folder, and the manifest.

*Why state it as a guarantee rather than a consequence:* it's what makes the sync safe to run without reading the diff first, and it's the thing a user needs to believe. Every removed mechanism (three-way view, keep/take prompts, batch approval, the fresh-mode rename option) existed to manage the risk this guarantee eliminates outright.

### `commit` is redefined, not removed

`.claude/.wong-stack.json` keeps `commit`, but it is no longer a diff base — nothing diffs. It records the clone HEAD the repo last synced against, and it drives the changelog walk ("what's new since you last looked") and seeds `asOfCommit` reasoning.

*Why keep it:* deleting it would break the changelog walk and cost the ledger its notion of "since when." Redefining is cheaper than removing and re-adding.

### The unit of analysis is a capability, not a file or a skill

The cartographer maps capabilities defined as "a thing WongStack lets you do, plus what it assumes about your repo." Each carries a stable kebab-case `id`, what it lets you do, where upstream expresses it (which may be several files, a wiki page, or a paragraph of the `WONG-STACK` block), what it assumes about a repo, and what it depends on.

*Why:* a skill-shaped map would miss exactly the cross-cutting things the file sync already missed — "CI is the gate when present," "branch name = change name," "the wiki is progressive disclosure" — and we'd have built a slower version of the same keyhole. The cartographer therefore reads `wiki/` and the `WONG-STACK` block as first-class sources alongside `.claude/skills/`.

*Stable ids matter* because the ledger keys on them. Ids come from upstream content only, never from the target, so the same upstream commit yields the same ids in every repo.

### Two subagents, independent, neither surfaced raw

The cartographer reads only `$WS`. The surveyor reads only `$ROOT`. They share no context and run concurrently. Both return structured findings to the main thread, which does the gap analysis itself.

*Why two and not one:* a single agent holding both sides tends to pattern-match target files onto upstream files — which is the file-shaped failure being escaped. Independent reads force the comparison to happen at the level the main thread frames it.

*Why the main thread synthesizes:* the verdict is a judgment about this user's repo and needs the conversation's context. Subagent output is evidence, not conclusion.

### Four verdicts

| Verdict | Meaning | Ledger | Becomes a task? |
|---|---|---|---|
| `present` | the repo already has this, current | yes | no |
| `divergent` | solved differently here; the local solution is legitimate | yes, with the local form | no |
| `adopt` | missing, stale, or wanted — and expressible here | yes | yes |
| `declined` | wrong for this repo, or the user said no | yes, with reason | no |

`divergent` is what makes the model worth building: it's how the sync says "you already solve this, leave it alone" instead of pitching a redundant graft. It is distinct from `present` so the ledger records *that* the forms differ, which matters when upstream later changes the capability.

A stale-but-unmodified file is an ordinary `adopt` whose task says to take the upstream version verbatim. No separate verdict — the difference is in the task text, not the taxonomy.

### The output is an OpenSpec change, and only that

The sync writes `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/` containing a proposal (why these capabilities, what each buys this repo) and a tasks list (one task per `adopt`, each naming the capability id and describing the graft *in this repo's terms*).

*Why:* it fits the repo's grain exactly — the change *is* the plan, the archive *is* the record — and it inherits `/apply → /save → CI → /ship` for free. It keeps "no git in this repo" intact and makes the run trivially reversible.

*Naming collision:* if today's folder exists, append `-2`, `-3`. Never overwrite a prior adoption change — it may be mid-flight.

*Repos without OpenSpec:* WongStack installs it at setup, so this is near-universal. If `openspec/changes/` is absent, report the analysis inline and say why the change couldn't be written.

### The ledger lives in the manifest

```json
"capabilities": {
  "<capability-id>": {
    "verdict": "present|divergent|adopt|declined",
    "reason": "one line",
    "asOfCommit": "<clone HEAD when judged>"
  }
}
```

*Why in the manifest:* it's install state about this repo's relationship to WongStack — exactly what the manifest is for. One file to read, one to write; older manifests just gain the key, the same lazy migration as `commit` and `upstream`.

*Why `asOfCommit`:* a decline recorded against commit X is not a decline of the capability as it exists at commit Y. Without this the ledger would silently bury genuinely new information.

### The read boundary moves; the write boundary replaces it

The manifest's "nothing outside this list is ever read or copied" existed to guarantee nothing local could leak upstream. With no outbound leg, it is restated: **the surveyor reads the target's process surfaces broadly and nothing leaves the machine; the manifest continues to bound what may be copied *in*.** The skill's write scope is absent files, the `WONG-STACK` block, one change folder, and the manifest.

This is a real change to the security story and is stated as such in the payload prose, not buried.

### Removing contribute

Delete the curation step, the fork-aware PR machinery, and the release-ritual-in-the-clone. `upstream.fork` stays readable in existing manifests (harmless) but is never written. The clone becomes read-only, so its dirty guard simplifies to warn-and-confirm for cleanliness only. `wiki/contributing.md` is rewritten to the manual route.

*Version:* `7.0.0`. Removing shipped user-facing behavior is breaking regardless of how rarely it was used.

## Risks / Trade-offs

- **The sync is now non-deterministic where it used to be exact.** → Contain it: it never modifies an existing file, every verdict carries a one-line reason, and the artifact is reviewable before `/apply`. The one deterministic operation left (copy what's absent) stays deterministic.
- **Stale untouched files no longer refresh silently.** → Accepted, and the point. The proposed task says "take upstream verbatim," so the outcome is reachable in one `/apply`; the report states how many such files there are so the volume is visible rather than surprising.
- **Every run costs two broad-reading subagents.** → The surveyor is scoped to process surfaces (skills, wiki/docs, `CLAUDE.md`, config, top-level structure), not application source. A repo already fully in sync yields a short report and no change folder, which is the common steady state.
- **Capability ids could drift between runs, breaking the ledger.** → Ids derive from upstream content only, and the cartographer is given the ledger's existing ids to reuse. An id in the ledger with no counterpart in the new map is reported as retired, not silently dropped.
- **The ledger could bury genuinely new upstream work behind an old decline.** → `asOfCommit` plus an explicit re-raise rule for capabilities whose upstream expression changed since the recorded commit.
- **`adopt` tasks could be too vague for `/apply`.** → Each task must name the capability id and state what changes in this repo — which file, which convention, what done looks like. A graft that can't be described concretely is a signal the verdict should be `declined`, not a task.
- **Removing contribute strands anyone mid-flow.** → v6.7.0 shipped two commits ago and contributions are rare; the CHANGELOG and the rewritten `wiki/contributing.md` both name the manual route. A contribution branch parked in a clone by an earlier version is untouched.

## Migration Plan

1. Ship the skill and prose edits together with `VERSION` → `7.0.0` and the CHANGELOG entry (one change, per the release rule).
2. Existing targets pick this up through their next ordinary `/wong-sync` — the skill syncs itself, so the new behavior arrives as a normal payload update. Their first post-upgrade run is an analysis, not a pull.
3. No manifest migration: `capabilities` is absent until the first run, and `commit` keeps its field name while changing meaning — no reader breaks.
4. Rollback is a revert of the payload commit; no target-side state exists beyond manifests that gained a `capabilities` key, which older skill versions ignore.

## Open Questions

- Should `divergent` findings be listed in the report by default, or only on request? Leaning: one line each — cheap and reassuring — never as tasks.
- Does the adoption change get a `design.md`, or is proposal + tasks enough? Leaning: proposal + tasks, letting the target's own `/plan` deepen a graft that turns out large.
- Should a run that finds only stale-verbatim `adopt`s skip the change folder and offer the copies inline instead? Leaning: no — one output shape is easier to trust than two.

<!-- end design.md -->
<!-- file tasks.md utf8 6622 -->
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

<!-- end tasks.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 9210 -->
## ADDED Requirements

### Requirement: Capability adaptation is the default and only analysis path

Every `/wong-sync` run SHALL, after refreshing the clone and copying absent payload files, run the capability analysis over the payload files that already exist locally. The skill SHALL take no arguments and SHALL expose no alternative mode. The analysis SHALL NOT modify any existing file in the target and SHALL NOT run any git command in the target.

#### Scenario: An ordinary run analyses rather than diffs

- **WHEN** the user runs `/wong-sync` in an installed repo
- **THEN** no three-way diff is performed and no file is overwritten
- **AND** the capability analysis runs over the payload surfaces the repo already has

#### Scenario: A fully-absent repo needs no analysis of what it lacks

- **WHEN** every payload file is missing locally (a fresh install)
- **THEN** the files are copied directly and the analysis has nothing present to weigh them against

#### Scenario: No manifest at all

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json`
- **THEN** it stops and points at `/wong-setup`

### Requirement: Two independent subagents, synthesized by the main thread

The analysis SHALL spawn exactly two subagents that run independently and share no context:

- A **cartographer** that reads only the refreshed clone and returns a map of WongStack's capabilities.
- A **surveyor** that reads only the target repo and returns what that repo already is and already does.

Neither subagent's raw output SHALL be presented to the user; the main thread SHALL perform the gap analysis and own every verdict. Neither subagent SHALL write any file.

#### Scenario: Agents are independent

- **WHEN** the analysis runs
- **THEN** the cartographer is given no information about the target repo and the surveyor is given no information about upstream

#### Scenario: Raw findings stay internal

- **WHEN** both subagents return
- **THEN** the user sees the synthesized capability gap, not either agent's report verbatim

### Requirement: The unit of analysis is a capability, not a file or a skill

The cartographer SHALL map capabilities defined as "a thing WongStack lets you do, plus what it assumes about your repo" — explicitly not one-per-file and not one-per-skill. It SHALL read the wiki and the `WONG-STACK` block as first-class sources alongside `.claude/skills/`, so that cross-cutting conventions are mapped as capabilities in their own right. Each mapped capability SHALL carry a stable kebab-case id, what it lets you do, where upstream expresses it, what it assumes about a repo, and what it depends on.

Capability ids SHALL be derived from upstream content only — never from the target — so the same upstream commit yields the same ids in every repo. The cartographer SHALL be given the ids already in the repo's ledger and SHALL reuse a matching id rather than minting a new one.

#### Scenario: A convention is a capability

- **WHEN** the cartographer maps upstream
- **THEN** conventions expressed only in the wiki or the `WONG-STACK` block — such as "CI is the gate when present, else PR review" — appear as capabilities, not merely as file contents

#### Scenario: Ids are reused across runs

- **WHEN** the analysis runs a second time in a repo whose ledger already records a capability id
- **THEN** the same capability is mapped under that same id

#### Scenario: A ledger id disappears from the map

- **WHEN** an id in the ledger has no counterpart in the new map
- **THEN** it is reported as retired rather than silently dropped from the ledger

### Requirement: Four verdicts, one per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current.
- **divergent** — the repo solves it differently and the local solution is legitimate; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here, and expressible in this repo.
- **declined** — wrong for this repo, or the user said no.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` findings SHALL be listed one line each in the report and SHALL NOT be proposed as work.

A payload file that exists locally, was never modified, and is behind upstream SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. There SHALL NOT be a separate verdict for this case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved differently is left alone

- **WHEN** the repo already achieves a capability through its own mechanism
- **THEN** the verdict is `divergent`, the local form is named, and no adoption task is written

#### Scenario: Stale unmodified file

- **WHEN** a payload file exists locally unmodified and upstream has moved on
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability and no task for any other verdict

### Requirement: The analysis proposes and never implements

The sole artifact the analysis writes SHALL be an OpenSpec change folder at `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/`, containing a proposal (why these capabilities and what each buys this repo) and a tasks list. The graft is performed later through the normal loop (`/apply` → `/save` → `/ship`).

Each task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like. A capability whose graft cannot be described concretely SHALL be verdicted `declined` rather than written as a vague task.

#### Scenario: Nothing else is touched

- **WHEN** a run completes
- **THEN** the only paths written are absent payload files, the change folder, and the manifest
- **AND** the user is directed to review the change and run `/apply`

#### Scenario: Existing adoption change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: Nothing to adopt

- **WHEN** no capability is verdicted `adopt`
- **THEN** no change folder is created and the report says the repo is current

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the capability gap is reported inline with an explanation that the change could not be written

### Requirement: The capability ledger makes the sync idempotent in judgment

`.claude/.wong-stack.json` SHALL gain a `capabilities` map keyed by capability id, each entry recording `verdict`, a one-line `reason`, and `asOfCommit` — the clone HEAD at which the judgment was made. The map SHALL be written last, with the rest of the manifest.

A capability whose ledger verdict is `declined` or `divergent` SHALL NOT be re-pitched on a later run **unless** its upstream expression changed since the recorded `asOfCommit`, in which case it SHALL be re-raised with what changed. An absent `capabilities` key means nothing has been judged yet and is not an error.

#### Scenario: Declines are not re-litigated

- **WHEN** the sync runs again and upstream has not changed a previously declined capability
- **THEN** that capability is not proposed again

#### Scenario: Upstream moved since the decline

- **WHEN** a declined capability's upstream expression changed after its recorded `asOfCommit`
- **THEN** it is re-raised, stating that it was declined earlier and what has changed since

#### Scenario: Older manifest

- **WHEN** the sync runs on a manifest with no `capabilities` key
- **THEN** it proceeds normally and writes the key for the first time

### Requirement: The read boundary is broad; the write boundary is narrow

With no outbound contribution path, the payload manifest SHALL bound what the skill **copies**, not what the surveyor may **read**. The surveyor SHALL read the target's process surfaces broadly — skills, wiki or docs, `CLAUDE.md`, configuration, and top-level structure — and SHALL NOT be limited to manifest files. It SHALL NOT be required to read application source. Nothing the surveyor reads SHALL leave the machine. The payload prose SHALL state this boundary change explicitly rather than leave it implied.

#### Scenario: Surveyor sees the whole repo's process surface

- **WHEN** the surveyor runs in a repo with skills and docs outside the payload manifest
- **THEN** it reads them, so that a capability already solved locally is correctly verdicted `divergent` rather than proposed as missing

#### Scenario: Nothing is sent anywhere

- **WHEN** the surveyor has read the target
- **THEN** no read content is written to the clone, pushed, or included in any outbound request

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 15920 -->
## ADDED Requirements

### Requirement: Never overwrite an existing file

`/wong-sync` SHALL NOT modify or replace any file that already exists in the target repo. Its entire write scope SHALL be: payload files that were absent, the `WONG-STACK` block where no markers existed, the OpenSpec change folder the analysis proposes, and `.claude/.wong-stack.json`. This guarantee replaces every conflict-resolution mechanism the skill previously carried — there SHALL be no three-way view, no keep-local / take-upstream prompt, no batch approval of overwrites, and no rename-on-collision option, because no overwrite is ever attempted.

#### Scenario: Locally customized skill is safe

- **WHEN** a repo has heavily edited its copy of a payload skill and upstream has also changed it
- **THEN** the file is left byte-identical and the difference is handled by the capability analysis

#### Scenario: No prompts about clobbering

- **WHEN** any `/wong-sync` run completes
- **THEN** the user was never asked to choose between a local and an upstream version of a file

### Requirement: Absent payload files are copied directly

For each file in the payload manifest, `/wong-sync` SHALL copy it into the target verbatim **if and only if** it does not exist locally. A file that exists locally SHALL NOT be copied, and SHALL instead be handed to the capability analysis. The threshold is per file, not per repo: a fresh install is simply the case where every manifest file is absent, and SHALL NOT be a distinct mode.

For `CLAUDE.md`, the unit is the `WONG-STACK` block rather than the file: absent markers (or an absent file) SHALL cause the block to be inserted with its markers, creating the file if needed and leaving all other content byte-identical; present markers SHALL send the block to the analysis and SHALL NOT be rewritten in place.

#### Scenario: New upstream skill arrives

- **WHEN** upstream ships a payload skill the target does not have
- **THEN** it is copied in directly, with no analysis needed to decide

#### Scenario: Existing file is never copied over

- **WHEN** a payload file exists locally in any state
- **THEN** it is not copied, whether or not it matches upstream

#### Scenario: Fresh install falls out of the general rule

- **WHEN** `/wong-sync` runs in a repo where no payload file exists yet
- **THEN** every manifest file is copied in as the install, with no separate fresh-mode branch

#### Scenario: CLAUDE.md with the user's own content and no markers

- **WHEN** the target's `CLAUDE.md` has content but no `WONG-STACK` markers
- **THEN** the block is inserted with its markers and everything outside them is byte-identical

## MODIFIED Requirements

### Requirement: One behavior, no arguments

`/wong-sync` SHALL take no arguments and expose exactly one behavior. A run SHALL: refresh the clone, copy absent payload files, run the capability analysis specified by the `wong-sync-adapt` capability, rewrite the manifest, and report. There SHALL be no contribute leg, no curation of local drift, no prompt about contributing, and no pull request opened by the skill in any circumstance.

An invocation carrying the retired `contribute` argument SHALL stop with a short explanation pointing at the contributing page's manual route, rather than silently running an ordinary sync.

#### Scenario: A sync never mentions contributing

- **WHEN** the user runs `/wong-sync`
- **THEN** it copies absent files, analyses the rest, rewrites the manifest, and reports
- **AND** it neither curates local drift nor asks whether to contribute anything

#### Scenario: Retired contribute argument

- **WHEN** the user runs `/wong-sync contribute`
- **THEN** the skill explains that the leg was removed and points at the contributing page's manual route, without running a partial sync

#### Scenario: Refuses to run in the WongStack source

- **WHEN** `/wong-sync` is invoked inside a WongStack clone itself (the resolved clone equals the current repo)
- **THEN** the skill stops without changing anything, explaining the source has nothing to sync with itself

### Requirement: No git in the target; full git in the clone

`/wong-sync` SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): copied files and the proposed change folder land in the working tree for the user to review and `/save`. The clone SHALL be treated as **read-only** — the skill fetches, checks out, and resets it to the upstream default branch, and SHALL NOT create branches, commits, or pushes there. A dirty clone MUST NOT be reset without warning and confirmation.

#### Scenario: A run finishes

- **WHEN** absent files have been copied and a change folder written
- **THEN** they exist only as working-tree edits and the skill directs the user to `/save`, having made no target-side commits

#### Scenario: Clone is never written to

- **WHEN** any `/wong-sync` run completes
- **THEN** the clone is on the upstream default branch with no branch, commit, or push created by the skill

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else arrives through the sync's copy-if-absent step. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting the manual route for sending a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — in scope **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be copied or analysed.

The manifest bounds what the skill **copies**. It SHALL NOT bound what the analysis's surveyor **reads**, which is specified by the `wong-sync-adapt` capability; no read content leaves the machine. A payload skill installed under a different local name SHALL be recognized under that name via the manifest's skills mapping, so it counts as present rather than absent.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill and the target already has one
- **THEN** the update is handled by the capability analysis, not by overwriting the file

#### Scenario: Non-manifest files are never copied

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never copies over them

#### Scenario: Renamed skill counts as present

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills`
- **THEN** it is treated as present and analysed, not copied in a second time under the default name

#### Scenario: Pack files are in scope only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never copied or analysed
- **AND** in a repo with `components.stackPack: true`, those files are copied if absent and analysed if present

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other copied docs, so the way to contribute is discoverable

### Requirement: The opt-in pack follows the same rules as any payload file

For a repo with `components.stackPack: true`, the pack's drop-in files SHALL follow the general rule — copied if absent, analysed if present, never overwritten. The pack's guided config fragments (merges into target-owned files such as `package.json` scripts, the `wrangler.jsonc` `d1_databases` block, `.env.example` variables, and the `.gitignore` `.dev.vars` entry) SHALL be offered as guided edits following the `CLAUDE.md`-block precedent — shown, applied only on confirmation, never blind-written — and SHALL be surfaced through the analysis when upstream changes one.

#### Scenario: Missing pack file arrives

- **WHEN** a repo took the pack and lacks `scripts/cf-build.sh`
- **THEN** the file is copied in directly

#### Scenario: Locally edited pack file is not clobbered

- **WHEN** a repo edited its copy of a pack script and upstream also changed it
- **THEN** the file is left untouched and the difference is handled by the capability analysis

### Requirement: Manifest schema, lazily migrated

`.claude/.wong-stack.json` SHALL carry `version`, `commit`, `upstream { repo, fork, clone }`, `components`, and `capabilities` (specified by the `wong-sync-adapt` capability). `commit` SHALL record the clone HEAD the repo last synced against — it is no longer a diff base, since nothing diffs — and SHALL drive the changelog walk and the ledger's notion of "since when." Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes and writes `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** the sync proceeds by the general rule (every manifest file is absent, so every one is copied) and fills in the real `version` and `commit` last

#### Scenario: Manifest carrying a stale fork URL

- **WHEN** a manifest recorded `upstream.fork` under a previous version
- **THEN** the value is preserved as-is and never used or updated

### Requirement: Installer defers updates to wong-sync

`wong-setup` SHALL handle fresh integrations only. When a manifest with a real `commit` already exists, it skips the consultation, installs/updates nothing except ensuring the `wong-sync` skill is present, then directs the user to run `/wong-sync`. Its legacy-traces step SHALL offer to remove an installed or symlinked `contribute-wong-stack` (superseded by `/wong-sync`). `wong-sync`'s source-repo detection SHALL identify a WongStack source by `VERSION` alongside `.claude/skills/wong-setup/`. No `wong-setup` prose SHALL describe a contribute leg, and its handoff SHALL NOT name a distinct fresh mode — it hands off to the one `/wong-sync` behavior.

#### Scenario: Re-run on an installed repo

- **WHEN** `/wong-setup` runs in a repo whose `.claude/.wong-stack.json` has a real `commit`
- **THEN** it skips the pitch, ensures `wong-sync` is installed, makes no other changes, and says to run `/wong-sync`

#### Scenario: Leftover contribute-wong-stack

- **WHEN** the skill or sync finds an installed/symlinked `contribute-wong-stack`
- **THEN** it offers to remove it, noting `/wong-sync` supersedes it

#### Scenario: No manifest during sync

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json` at all
- **THEN** it stops and points at `/wong-setup` for the fresh integration

### Requirement: Contributing is documented rather than prompted

The payload SHALL include a contributing page at the wiki root explaining how to send a payload improvement upstream **by hand**: fork the upstream repo, branch, make the change, apply the release ritual (semver `VERSION` bump plus a newest-first `CHANGELOG.md` entry), and open the PR. The page SHALL state the generality bar — "does this belong in every WongStack repo?" — and SHALL NOT describe any automated contribution command. Payload prose SHALL NOT describe `/wong-sync` as contributing improvements back — descriptions, skill openers, the `WONG-STACK` block, and the README SHALL frame it as pulling in what's missing and proposing what's worth adopting, with contributing named as a separate, manual action.

#### Scenario: A reader finds how to contribute

- **WHEN** someone wants to send a workflow improvement upstream
- **THEN** the contributing page gives them the manual fork-branch-ritual-PR route and states the generality bar

#### Scenario: No payload prose implies an automated contribution

- **WHEN** a reader reviews the `wong-sync` description and opener, the `WONG-STACK` block, the README skill table, and the wiki
- **THEN** none of them mention a `contribute` argument or describe any sync as contributing anything upstream

## REMOVED Requirements

### Requirement: Three-way classification against a recorded base

**Reason**: Nothing diffs any more. Files absent locally are copied verbatim; files present locally go to the capability analysis, which reasons about meaning rather than bytes. The four-cell classification, the `git show <base>:<path>` base lookup, the conflict walk, and the two-way fallback for manifests without a base all have no remaining role.

**Migration**: `commit` survives with a new meaning (the clone HEAD last synced against, driving the changelog walk and the ledger's `asOfCommit`), so no manifest edit is required. Behavior the classification used to provide — noticing a file is behind upstream — is now an `adopt` verdict whose task says to take the upstream version verbatim.

### Requirement: Fresh-install mode via seed manifest

**Reason**: Fresh install is no longer a mode. With the copy threshold set per file, a repo where every manifest file is absent is simply the degenerate case of the general rule, so the empty-tree base, the install-time collision walk, the keep-under-another-name option, and the skipped-changelog carve-out are all redundant.

**Migration**: A seed manifest (`version` and `commit` null) still works — every manifest file is absent, so every one is copied, and the real `version`/`commit` are written last. `wong-setup`'s handoff is unchanged; it simply no longer names a distinct mode on the other side.

### Requirement: CLAUDE.md block insertion when no markers exist

**Reason**: Folded into the general copy-if-absent rule, which now states the `WONG-STACK` block as its own unit — absent markers means insert, present markers means analyse.

**Migration**: None; the behavior is identical and specified in "Absent payload files are copied directly."

### Requirement: Fork-aware upstream PR

**Reason**: The contribute leg is removed entirely; the skill no longer opens pull requests, forks repositories, or writes to the clone.

**Migration**: Contribute by hand — fork the upstream repo, branch, apply the release ritual (`VERSION` bump + newest-first `CHANGELOG.md` entry), and open the PR yourself. The route is documented on the payload's contributing page. A contribution branch parked in the cached clone by an earlier version is untouched and can still be pushed manually.

### Requirement: Curation bar for contributions

**Reason**: With no contribute leg there are no contribution candidates to curate, and with no classification there is no notion of "local drift" to curate from.

**Migration**: The generality bar ("does this belong in every WongStack repo?") survives as guidance on the contributing page, applied by the human opening the PR rather than by the skill.

## RENAMED Requirements

- FROM: `### Requirement: One-pass round trip, pull before contribute`
- TO: `### Requirement: One behavior, no arguments`

- FROM: `### Requirement: Manifest schema v2, lazily migrated`
- TO: `### Requirement: Manifest schema, lazily migrated`

- FROM: `### Requirement: The opt-in pack refreshes through the existing three-way diff`
- TO: `### Requirement: The opt-in pack follows the same rules as any payload file`

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-28

~~~
<!-- end .openspec.yaml -->
