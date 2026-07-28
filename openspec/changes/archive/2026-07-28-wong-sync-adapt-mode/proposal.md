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
