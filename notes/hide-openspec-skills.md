---
slug: hide-openspec-skills
started: 2026-09-14
updated: 2026-09-14
---

# Hiding the generated OpenSpec skills

The user opened with "re-explore hiding the openspec skills" — *re*-explore, because a prior session
had already reached this territory and closed it. Finding that prior work first is what made this
session short: the branch `explore/hide-openspec-skills` existed, and
[`notes/extract-walk-skill.md`](extract-walk-skill.md) held the whole spike.

## What the earlier session had already settled

The 2026-08-02 session tried to make most skills command-only to reclaim context, and **killed the
idea with a spike rather than an opinion**. Two probe skills — one flagged, one control — proved
`disable-model-invocation: true` blocks the **Skill tool**, not just autonomous triggering:
`Skill spike-flagged cannot be used with Skill tool due to disable-model-invocation`. Since every
WongStack verb is both a human entry point and a handoff target, setting it would sever the
mandated handoffs.

That session also recorded the lever this one needed: **`user-invocable: false` hides from the `/`
menu and keeps model invocation.** Documented, but never probed.

The reason the old idea failed and this one works is worth keeping: the earlier attempt tried to
hide the **WongStack verbs**, which are both doors and handoff targets. This one hides the
**generated `openspec-*` skills**, which are *only* handoff targets. Same mechanism, opposite
outcome, because the set of skills is different.

## What the user decided this session

Three forks, asked as one round before anything was drafted:

- **Reach → payload, targets too.** Not meta-repo-only. Targets are where the menu clutter costs
  something; a user there has no reason to want the raw OpenSpec steps.
- **Mechanism → a script the skills call.** A `PostToolUse` hook was rejected on a hard constraint,
  not taste: it needs `.claude/settings.json`, which the payload manifest **excludes from the
  payload**, so a hook could never reach a target and would have defeated the reach decision.
- **Drift gate → patch only.** The user explicitly declined both a `--check` mode and a CI job. Do
  not re-propose these; a missed run is cosmetic and self-evident in the menu.

## Things discovered by building, not planning

- **`.claude` is a symlink to `.agents`** in this repo, and `.agents/skills/.openspec-target`
  contains `agents` — the CLI generates into `.agents/`. Any script globbing skill directories must
  handle both paths and dedupe by real path, or it double-counts.
- **Plain `openspec update` is a no-op when the CLI is already current** and leaves local frontmatter
  intact. Only `openspec update --force` rewrites the generated skills. The wipe-and-restore loop
  could not be proven without `--force` — the first attempt looked like a pass and had tested
  nothing.
- **Skills hot-reload, but not instantly.** The first `Skill(probe-control)` call failed with
  `Unknown skill`; the same call succeeded moments later once the harness picked the file up. A
  failed invocation immediately after writing a SKILL.md is not evidence about the frontmatter.
- **`hidden: true` is not the same lever.** `agent-browser` ships it and still appears in the
  agent's own skill listing, so it governs something other than model visibility. Undocumented here;
  `user-invocable: false` was preferred because its contract is written down.
- **An agent cannot verify the `/` menu.** The skill listing an agent sees is a different surface —
  a `user-invocable: false` skill still appears there, which is the flag working, not failing. The
  user had to confirm the menu, and that stayed an open task until they did.

## The constraint that reshaped the design mid-implementation

`/wong-sync` **proposes and never implements** — it writes no payload file and opens no PR, so a
user reviews the gap before anything changes. The plan had it calling the patch script like the
other two callers. **A script run is a write**, so that would have broken the guarantee. It now adds
the run as a task in the plan it proposes; `/apply` performs it. The fresh-install path (seed
manifest) is the exception, because there the copy *is* the install and no plan exists to carry a
task.

Generalizable: when wiring anything new into `/wong-sync`, ask whether the step *writes*. If it
does, it belongs in the proposed plan, not in the sync.

## Open threads

- `hidden: true`'s actual semantics are still unknown. It is the design's named fallback if
  `user-invocable: false` ever stops working, but nobody has probed what it does.
- Regeneration outside a WongStack skill (a user running `openspec update --force` by hand) leaves
  the six visible until a skill that owns the patch runs again. Accepted by decision, not mitigated.
