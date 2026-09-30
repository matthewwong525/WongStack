# Repository improvement

`/improve` finds and ships one supported improvement that makes the project more useful, reliable, or easier to maintain through the [normal change loop](the-change-loop.md).

Run [`/improve [focus]`](../../.agents/skills/improve/SKILL.md) when you want a useful improvement. A focus can name an area, such as `wiki/development`, or a desired outcome, such as `make the hand-over easier to use`. The agent chooses its investigation using the project's goals, remembered problems when available, and current work, then explains the evidence and what was checked.

Run `/improve --audit-only [focus]` for findings and recommendations without edits, Git changes, delivery, or a saved report. No supported worthwhile work is a valid `no change` result; the report explains material limits.

## Run it on a cadence

With [Paseo](https://paseo.sh), run [`/routine every Monday at 9am: /improve`](../../.agents/skills/routine/SKILL.md): each run gets its own worktree, and runs of one routine never overlap.

WongStack does not install a scheduler. An external scheduler must provide a clean, current checkout and serialize runs so two improvement deliveries cannot overlap. Capture the result and delivery links. Existing area prompts and unattended wording remain usable; invoking `/improve` authorizes one supported improvement, while unresolved choices follow the normal change loop.

## Keep one delivery owner

[`/ship`](../../.agents/skills/ship/SKILL.md) and its nested skills own planning, implementation, Git, checks, verification, archive, and publishing. `/improve` hands them one selected problem with its evidence, intended result, scope, and verification. Normal gates and scope boundaries apply, including preserving unrelated unfinished work. If delivery stops, report the blocker.

Other WongStack development processes live in [Development](README.md).
