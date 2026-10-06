# Code improvement

`/improve-code` finds one way to make the code simpler or safer to change, writes the plan for it, and stops for your yes. It builds nothing and publishes nothing.

Run [`/improve-code [focus]`](../../.agents/skills/improve-code/SKILL.md) when the code feels harder to change than it should. A focus can name an area, such as `scripts/routine-runner`, or an outcome, such as `make the routine runner easier to test`.

It works only on how the code is built. A new feature or a wording fix is a normal request: ask for it in plain words. Trouble with memory or the wiki goes to [`/dream-memory`](wiki-dream.md).

Run `/improve-code --audit-only [focus]` for findings and recommendations with no edit, Git change, delivery, saved report, or saved fact. It also names the notes it skipped as memory or wiki ones.

## Struggle notes come first

Before it chooses, `/improve-code` loads memory's open [struggle notes](memory.md#how-facts-are-captured), each a `thread` tagged `improve`, and the ideas it [ruled out](#remember-a-no) before. Trouble a real chat recorded comes before a problem found by reading the project alone.

- **A note is evidence, not an order.** The choice still needs proof of value and a way to check the result.
- **A note about memory or the wiki is skipped.** `/dream-memory` reads the same notes and takes those.
- **A note closes at publish.** The plan names the note it answers, so the save that publishes the built plan supersedes it. The other notes stay open.
- **`--audit-only` reads notes and writes none.**
- **No memory, no stop.** The run says memory was not loaded and chooses from its other evidence.

## Where to look

Look where the trouble is, not down a checklist:

1. **The open notes.** A step that failed twice in a real chat points at code that is hard to use.
2. **The files that change most.** `git log --since="90 days ago" --name-only --format=` lists them; a file touched by many changes pays back a better shape soonest.
3. **Friction you meet while reading.** A function you had to read three files to follow is a finding.

A pattern match alone is not evidence: *this file is long* proves nothing until a note or a change shows the length cost something.

## The deletion test

Ask of each piece: if it were deleted, would the mess vanish, or come back in every place that uses it?

- **It vanishes.** The piece only passed work along. Removing it makes the code simpler.
- **It comes back in each caller.** The piece earns its keep. Leave it, or deepen it so callers need to know less.

Before removing a piece, ask whether its work would only move somewhere else. If it would, removing it improves nothing.

## A check before an instruction

When the trouble is a mistake a machine could catch, such as a link to a page that does not exist, the fix is a check that fails, added to the project's own checks, not one more written instruction. An instruction can be skipped; a failing check can not.

A written rule is for a judgment call no check could make. `/improve-code` does not write one: its report names the note as one for a normal request.

## Pin, then reshape

Every plan starts by locking in what the code does today:

- **The first task is a test** that holds the behaviour being kept. It passes before the change and after it.
- **A type check or a lint is not a pin.** Both pass on code that does the wrong thing.
- **Replace tests, don't stack them.** A test that only held up the old shape goes when the shape goes.

## Undo what is not simpler

The plan's last build task compares before and after. If callers are no simpler and the code is no easier to read, the build undoes the change, publishes nothing, and says why. Passing tests do not make a reshape worth keeping. The idea is then [ruled out](#remember-a-no).

## Remember a no

An idea the run weighed and turned down for a reason that will still hold, a reshape the build undid, and a plan you dropped are each saved as a `project` fact tagged `improve` whose words start `Ruled out:`, with the reason. The next run loads them with the notes and does not suggest one again unless new evidence answers the reason. `--audit-only` records nothing.

## It plans, then stops

`/improve-code` hands [`/plan`](../../.agents/skills/plan/SKILL.md) one problem with its evidence, intended result, scope, verification, and the note it answers. The run ends at the plan's link with the question every finished plan ends on: build it, change it, or drop it. No code has changed.

Every run ends one of three ways, named in its report:

- **Clean.** Nothing supported is worth changing. The report says what was checked and its limits; it invents no cleanup. A project with no code to reshape is clean.
- **Planned.** One plan waits for you.
- **Blocked.** Something stopped it, and the report says what.

## Run it on a cadence

Run [`/routine every Monday at 9am: /improve-code`](../../.agents/skills/routine/SKILL.md): it runs in your Cloudflare account, each run gets a fresh copy of the project, and runs of one routine never overlap ([cloud routines](../stack/cloud-routines.md)). A routine made before the skill was renamed, under its shorter old name, keeps running as `/improve-code`.

A scheduled run has nobody to answer, and its copy of the project is thrown away when it ends. So it saves the plan on its own branch and leaves a note in memory that starts `Improve plan:` and names it; your next chat shows the note. Nothing is built or published until you say yes.

Plans do not pile up: a run that finds an open `Improve plan:` note reports blocked, names that plan, and writes no second one.

Any other scheduler must provide a clean, current checkout and serialize runs so two of them cannot overlap.

## Keep one delivery owner

`/improve-code` owns choosing; [`/plan`](../../.agents/skills/plan/SKILL.md) owns the plan; [`/apply`](../../.agents/skills/apply/SKILL.md) and [`/ship`](../../.agents/skills/ship/SKILL.md) own building, Git, checks, and publishing, and run only after your yes. Normal gates and scope boundaries apply, including preserving unrelated unfinished work.

## Where the ideas come from

The check-before-an-instruction rule and the deletion test are adapted from Matt Pocock's [`retro`](https://github.com/mattpocock/skills/tree/main/skills/engineering/retro) and [`improve-codebase-architecture`](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture) skills (MIT). Pinning behaviour with a test first, and taking away before adding, draw on poteto's [pstack](https://github.com/cursor/plugins/tree/main/pstack). Ideas only; no text is copied.

Other WongStack development processes live in [Development](README.md).
