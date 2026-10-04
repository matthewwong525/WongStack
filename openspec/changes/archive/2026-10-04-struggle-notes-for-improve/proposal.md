# Learn from chats where the assistant struggled

**Status:** ready-to-ship

**Branch:** retro-skill-insights

**Open questions:** none

## Why

`/improve` picks what to fix by reading the project. It knows almost nothing about where the assistant really had trouble: memory keeps what was decided and drops how hard it was to get there. Your chats hold that trouble, and they are the best evidence of what to fix next.

## What Changes

- **A note when the assistant struggled.** When a chat is saved, by you or by the background save, the assistant also writes a short note for each real moment of trouble: you corrected it, you typed your own answer instead of picking a choice it offered, a step failed again and again, or it hunted a long time for something. The note says what happened and what it cost. A smooth chat gets none.
  ```text
  chat ─▶ saved ─▶ trouble? ─▶ note
                      │ no       │
                      ▼          ▼
                   no note    /improve
                              reads it
  ```
- **`/improve` reads those notes first.** A problem a real chat shows comes before one found by reading the project alone. You run it the same way as today.
- **A check before another rule.** When the trouble is a mistake a machine could catch, `/improve` builds a check that fails, not one more written instruction. A written rule is kept for judgment calls.
- **It looks where the project changes most.** Before it removes anything, it asks whether the work would only move somewhere else.
- **Notes tidy themselves.** Fixing a problem closes its note. A note nobody acts on closes by itself after 30 days.
- **Notes say nothing private.** Your team can read them, so a note describes the assistant's trouble, never your private matters.

**Non-goals:** A new command such as `/retro`, replacing `/improve`, a fixed list of things to look for, re-reading chats on every run, going back over older chats, or a tool that counts failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: a saved session's facts include one `improve` thread per moment where the assistant struggled, with no private detail and none for a smooth session; the rule that facts omit tool mechanics gains that one exception.
- `repository-improvement`: `/improve` loads open `improve` notes before choosing, prefers recorded trouble, closes the note it fixes, and turns a mechanical mistake into a failing check.

## Impact

Edit `.agents/skills/memory/references/writing-facts.md` (read by `/save` and by the background run) and `.agents/skills/improve/SKILL.md`, with offsetting cuts where a size check needs them (`wiki/development/secrets.md` wording), so `scripts/measure-context.mjs --check` passes. Update `wiki/development/memory.md` and `wiki/development/repository-improvement.md`. Add a minor `CHANGELOG.md` entry. No script, schema, migration, hook, or app change: the reduced chat the background run reads already keeps failed commands and what the person typed.

Ideas adapted from Matt Pocock's `retro` and `improve-codebase-architecture` skills (github.com/mattpocock/skills, MIT); no text is copied.

## Decision log

- **2026-10-04** — Asked whether to remove `/improve` and take Matt Pocock's `improve-codebase-architecture` and `retro` → chose keep `/improve` and fold the ideas in.
- **2026-10-04** — Asked how past chats should reach `/improve` → chose notes written when a chat is saved, over `/improve` reading chats each run or both with a one-time read of old chats.
- **2026-10-04** — Asked what next → chose plan it.
- **2026-10-04** — Assumed: a note is a `thread` fact tagged `improve`, because that tag is already a known verb tag, the session-start digest already counts it, and upkeep already closes a thread left 30 days.
- **2026-10-04** — Assumed: no new script detects struggles, because the reduced chat already carries failed commands and the person's words, and a count across 161 chats ranked an expected exit code as the top failure.
- **2026-10-04** — Assumed: *look where the project changes most* is guidance in the skill, not a spec requirement, because the spec forbids a mandatory survey.
- **2026-10-04** — Assumed: `--audit-only` reads notes and writes none, because it promises to change nothing.
- **2026-10-04** — Assumed: the new wording is tried on three past chats before it is kept, because the last reworded skill showed no measured gain.
- **2026-10-04** — Assumed: a minor release, because saving and `/improve` gain behavior and nothing breaks.
- **2026-10-04** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-04** — Assumed: the size check runs once in the final checks, not after the skill edit, because checks wait until all text is written; the later-check note is written by the save's facts step, not a task, because no build step can tick it.
- **2026-10-04** — Assumed: the note wording is the dry run's second version, because the first gave a smooth chat a note; the four kinds of trouble are now a closed list.
- **2026-10-04** — Assumed: the equal cut shrank to what the size checks need, because two changes published during the build freed 1,176 bytes of skill text. `/improve` grows 337 bytes with no offset; the save-with-a-key route was 56 bytes over and is paid for by rewording the writing rule and cutting 96 bytes of filler from the secrets page, with no rule dropped and no check exception recorded.
- **2026-10-04** — Archive checkpoint: all tasks done and the change archived; brought up to date with 31.0.1 and numbered 31.1.0; link, retired-name, config, size, and loosened-check scripts pass locally, with CI still to run.
- **2026-10-04** — Archive checkpoint: main reached 31.0.2 while the checks ran, so main was merged in, the release stays numbered 31.1.0 from 31.0.2, and the local size, link, and retired-name checks pass again.
