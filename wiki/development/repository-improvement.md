# Repository improvement

`/improve` is a bounded maintenance spot check that reviews recent work and one rotating older area, then sends one supported improvement through the [normal change loop](the-change-loop.md).

Run `/improve` when you want the repository to find and deliver one current documentation, consolidation, reliability, security, measured performance, or workflow improvement. Add a repository-relative area to narrow both review passes. Run `/improve --audit-only` to get ranked findings without edits, Git changes, delivery, or a durable report.

The command uses a deterministic tracked-file survey for inventory, weekly rotation, and bounded leads. The agent investigates those leads against actual callers, intended behavior, active work, history, and verification options. An empty heuristic result is not a clean bill of health. No supported worthwhile work is a valid `no change` result.

## Run it on a cadence

With [Paseo](https://paseo.sh), run [`/routine every Monday at 9am: /improve`](../../.agents/skills/routine/SKILL.md): each run gets its own worktree, and runs of one routine never overlap.

WongStack does not install a scheduler. For a weekly unattended run, use a trusted external scheduler that does all of these things:

1. Create a clean dedicated checkout at the current remote default-branch revision.
2. Serialize runs so two maintenance deliveries cannot overlap.
3. Supply explicit unattended context: `Run /improve unattended. Choose supported defaults within its eligible scope and report blockers.`
4. Capture the final output, including `shipped`, `no change`, or `blocked`, coverage limits, and delivery links.

Do not depend on silence to identify a scheduled job. Without explicit unattended context, the candidate question stays pending until a user answers it. A scheduler must refresh or replace its checkout itself; `/improve` does not fetch, reset, switch branches, or bypass active-work checks.

## Keep one delivery owner

A normal run records its surveyed revision and area in the OpenSpec change, then invokes [`/ship`](../../.agents/skills/ship/SKILL.md) with one explicit intent. The existing verbs still own exploration, planning, implementation, Git, CI, evidence, archive, and merge. If a gate fails, the result is `blocked`; `/improve` does not choose a second fix or use a weaker path.

Large maintenance work can use independently correct stages. Each shipped stage records its next stage in the normal change history. The last stage has a terminal marker and no next-stage instruction. This keeps continuation discoverable without a separate maintenance backlog.

Other WongStack development processes live in [Development](README.md).
