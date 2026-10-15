# Run each person's day with /daily

**Status:** parked
**Branch:** daily-routine-skill
**Open questions:** none

## Why

A business owner wants each person on the team to start the day the same reliable way, without re-explaining it every morning. Today WongStack has no shared start-of-day: each person types the same requests by hand, and Matt's daily in WongOS works for him alone.

## What Changes

- **One command starts the day.** A person types `/daily`. It checks who they are from their company sign-in, runs the team's steps, then their own, and replies with a short list of what it did and what is left for today.
  ```text
  /daily ─▶ who? ─▶ team steps ─▶ my steps ─▶ list
             │ signed out
             ▼
        sign-in link ─▶ wait ─▶ go on
  ```
- **Signed out, it asks you to sign in first.** It sends the company sign-in link and waits. Once you are in, it carries on by itself; nothing runs under a guessed name.
- **The team's steps and each person's steps live inside the daily skill.** The owner keeps the team part: the steps everyone runs. Each person has their own part, found by their sign-in email. A step is one plain line, such as `Mondays: plan the week with /team-plan`.
  ```text
  daily skill
   ├─ team steps     everyone, every day
   └─ people
       ├─ Sam        Sam's own steps
       └─ Jo         Jo's own steps
  ```
- **You teach it as you go.** Say "add checking yesterday's orders to my daily", and tomorrow it does that step for you. It shows the new list and saves it like any other edit. A new person with no steps yet gets the team part, then an offer to start their own.
- **A long step gets its own workspace where your app allows it.** A step like working through email opens its own workspace, so its questions don't take over the morning chat. Each one starts once a day: a second `/daily` opens nothing twice. Where the app can't open workspaces, the step runs right in the chat.
- **Updates never touch your steps.** A WongStack update brings the new `/daily` itself, but never copies over or removes the team's steps or anyone's own.

Non-goals: no timer (a person can ask for a morning run later through the usual schedule offer); no task board or day page like WongOS's (a team can add one as their own step); moving Matt's WongOS daily onto this comes later, in WongOS.

## Capabilities

### New Capabilities

- `daily-routine`: `/daily` identifies the person by company sign-in, runs the team's then the person's steps, lets a person change their own steps, opens long steps in their own workspace once per day where the host supports it, and keeps install-owned steps across updates.

### Modified Capabilities

None.

## Impact

- New skill `.agents/skills/daily/` (`SKILL.md`, `scripts/daily.mjs` and its test), started only by a person (`disable-model-invocation: true`).
- Reuses `memory/scripts/lib/store.mjs` (`signIn`, `memoryOrigin`) for identity, and `schedule/scripts/workspace.mjs` to open workspaces.
- `payload-files.json`: `daily` in `core.skillDirs`; `.claude/skills/daily/team.md` and `.claude/skills/daily/people` in `core.exclude`. `payload-manifest.md` says the install owns them.
- New wiki page `wiki/development/daily.md`, linked from the development hub.
- `areas.json` gains `daily-routine`; `CHANGELOG.md` gets a minor entry.

## Decision log

- **2026-10-15** — Asked where each person's own steps are kept → chose inside the daily skill, in subfolders.
- **2026-10-15** — Asked where the first version is built → chose WongStack, for every install; WongOS moves Matt's daily onto it after its next sync.
- **2026-10-15** — Asked whether a step opens its own workspace → chose only where the app supports it, else the same chat.
- **2026-10-15** — Assumed: a step is one plain line, with its days in words, not a settings file like WongOS's, because people edit it by saying what they want and the assistant reads words well.
- **2026-10-15** — Assumed: anyone may change their own steps and the owner reviews the team's, both through the usual save, because every repo edit already goes through it.
- **2026-10-15** — Assumed: no timer at first, because WongOS chose "you start it" and the usual routine offer covers a morning run.
- **2026-10-15** — Assumed: `/daily` is started only by a person, because it is a ritual, not something the assistant should pick on its own, and it keeps the always-loaded instructions inside their budget.
- **2026-10-15** — Assumed: a person's file is found by the emails listed in it, like wiki person pages, because one person can sign in with several emails.
- **2026-10-15** — Assumed: with no company app set up, `/daily` uses the git email and says so, because an install may run without the app.
- **2026-10-15** — Assumed: the team and people files ship empty (none seeded), because the wiki rule seeds no knowledge and each install grows its own.
- **2026-10-15** — Built: `wiki/development/daily.md` joins `core.files` and the setup seed's development hub, because a shipped skill links it and the install test needs every shipped page linked from its hub; the plan named only the source hub.
- **2026-10-15** — Built: `areas.json` names `openspec/specs/daily-routine/` as a path but not the spec as a doc yet, because `memory-areas.test.mjs` fails on a named doc that does not exist; the archive must add `openspec/specs/daily-routine/spec.md` to the area's `docs` in the same save, or the same test fails the other way.
- **2026-10-15** — Asked to publish → Matthew parked it: he wants to try `/daily` in WongOS first before it goes into WongStack. Built and checked, with a live run; resume with `/continue daily-routine`.
