# Repository improvement

`/improve` finds and ships one supported improvement that makes the project more useful, reliable, or easier to maintain through the [normal change loop](the-change-loop.md).

Run [`/improve [focus]`](../../.agents/skills/improve/SKILL.md) when you want a useful improvement. A focus can name an area, such as `wiki/development`, or a desired outcome, such as `make the key link easier to use`. The agent chooses its investigation using the project's goals, remembered problems when available, and current work, then explains the evidence and what was checked.

Run `/improve --audit-only [focus]` for findings and recommendations without edits, Git changes, delivery, or a saved report. No supported worthwhile work is a valid `no change` result; the report explains material limits.

## Struggle notes come first

Before it chooses, `/improve` loads memory's open [struggle notes](memory.md#how-facts-are-captured), each a `thread` tagged `improve`. Trouble a real chat recorded comes before a problem found by reading the project alone, most of all in parts that change often.

- **A note is evidence, not an order.** The choice still needs proof of value and a way to check the result.
- **A fix closes its note.** The report names the note it answered, and the save's fact supersedes it. The other notes stay open.
- **`--audit-only` reads notes and writes none.**
- **No memory, no stop.** The run says memory was not loaded and chooses from its other evidence.

## A check before an instruction

When the trouble is a mistake a machine could catch, such as a link to a page that does not exist, the fix is a check that fails, added to the project's own checks, not one more written instruction. An instruction can be skipped; a failing check can not. Keep a written rule for a judgment call no check could make, on the page that owns it.

Before removing a piece, ask whether its work would only move somewhere else. If it would, removing it improves nothing.

Both ideas are adapted from Matt Pocock's [`retro`](https://github.com/mattpocock/skills/tree/main/skills/engineering/retro) and [`improve-codebase-architecture`](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture) skills (MIT); no text is copied.

## Run it on a cadence

Run [`/routine every Monday at 9am: /improve`](../../.agents/skills/routine/SKILL.md): it runs in your Cloudflare account, each run gets a fresh copy of the project, and runs of one routine never overlap ([cloud routines](../stack/cloud-routines.md)).

Any other scheduler must provide a clean, current checkout and serialize runs so two improvement deliveries cannot overlap. Capture the result and delivery links. Existing area prompts and unattended wording remain usable; invoking `/improve` authorizes one supported improvement, while unresolved choices follow the normal change loop.

## Keep one delivery owner

[`/ship`](../../.agents/skills/ship/SKILL.md) and its nested skills own planning, implementation, Git, checks, verification, archive, and publishing. `/improve` hands them one selected problem with its evidence, intended result, scope, and verification. Normal gates and scope boundaries apply, including preserving unrelated unfinished work. If delivery stops, report the blocker.

Other WongStack development processes live in [Development](README.md).
