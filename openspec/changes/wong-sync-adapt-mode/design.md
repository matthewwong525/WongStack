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
