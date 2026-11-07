# Name each chat for its current work

**Status:** planned
**Branch:** boring-lionfish
**Open questions:** none

## Why

When a step starts, the chat's name gets the new step word, but the words after it do not change. The chat picks those words once, at the start, and keeps them. Only a plan's title can replace them, and only when they came from the start of your first message. So many names stay long, cut off, or about something else:

- `DONE: make sure to update the skill for next time`
- `PLAN: why is it only hidden on mac?`
- `PLAN: For the name when we change states it should`

## What Changes

- **Each step gives the chat a short name for the work at that time.** When a step starts, the agent writes a few words for the work, and the name changes to them. The words come from the step's own work: the idea for EXPLORE, the plan's title for PLAN, APPLY, and SHIP, or the to-do's goal for a job that changes no file. DONE keeps the words it has.
  | When | Name today | Name after this change |
  |---|---|---|
  | You ask a question about chat names, then the plan starts | PLAN: For the name when we change states it should | PLAN: Name each chat for its current work |
  | A handed-over chat plans a change to add-ons | PLAN: why is it only hidden on mac? | PLAN: Add an add-on, then open its sign-in |
  | The same chat builds, then publishes | APPLY: why is it only hidden on mac? | APPLY: Add an add-on, then open its sign-in |
- **Any name that Paseo made gives way.** Today a Paseo name that is not a copy of your first message stays for the whole chat, even when Paseo took it from a handed-over chat or a later message. After this change, the first step's words replace it.
- **A name you give the chat in Paseo stays.** If you rename the chat after it has a step name, the next steps keep your words and change only the step word.
  | You rename it to | Next step | Name |
  |---|---|---|
  | Invoice fixes | the build starts | APPLY: Invoice fixes |
- **Names stay short.** Words longer than 60 characters are cut at a word, so the name stays easy to read in the list of chats.

Non-goals: no change to when the step word changes, to commands such as `/verify` that you type, or to the Daily chat, routines, and helper chats, which keep their names. Old chats are not renamed.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-loop`: a chat's task words follow the work at each step instead of staying with the words the chat started with; any host name gives way to a step's words, and only a name the person gave after the chat had a step name stays.

## Impact

- `.agents/skills/explore/scripts/step-title.mjs`: a given `--task` replaces any earlier words except a hand rename; the state records the words it wrote so a later Paseo name that matches none of them counts as the person's; given words are cut at a word to 60 characters.
- Skills: `explore`, `plan`, `apply`, and `ship` pass `--task` with each `set` that starts a step.
- Tests: `scripts/tests/step-title.test.mjs`.
- Docs: `wiki/development/the-change-loop.md`, the "A chat's name starts with the step at work" line.
- `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-07** — Asked whether each step should also rename the chat to a short name for the current work → chose plan the fix.
- **2026-11-07** — Assumed: the agent writes the words at each step and the script only stores and cuts them, because only the agent knows what the work is now; a fixed rule from the first message gave the stuck names above.
- **2026-11-07** — Assumed: once a plan exists, PLAN, APPLY, and SHIP use the plan's title, because one plan is one piece of work and a name that changes at each step is harder to find.
- **2026-11-07** — Assumed: any name Paseo had before the chat's first step name gives way, because the script can not tell Paseo's own names from yours at that point, and the stuck names were all Paseo's.
- **2026-11-07** — Assumed: a name you give in Paseo after the chat has a step name stays, because the change-loop spec already promises that a name you gave stays; in Claude Code and Codex alone the script can not read the name, so the step's words win there.
- **2026-11-07** — Assumed: words are cut at a word to 60 characters, the same length Paseo uses for a new chat's name, because longer names are cut in the list of chats.
- **2026-11-07** — Assumed: a `minor` release, because the names of chats change in a new way.
- **2026-11-07** — Assumed: the hook also keeps a name you gave, so a typed command such as `/verify` after a rename changes only the step word, because the spec says a name you gave keeps its words.
