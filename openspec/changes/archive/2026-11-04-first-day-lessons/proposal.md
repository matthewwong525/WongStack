# A guided first day for a new teammate

**Status:** archived
**Branch:** shaggy-liger
**Open questions:** none

## Why

Adding a teammate already works: you add them in Access, send the message it gives you, and their assistant signs them in and gets the company's project. After that, nothing tells them what to do next. Setup ends with *Nothing else is needed*, and the person must find out alone what a skill is, how to start a new task, and how to make a change. ClaymooApp plans a guided first day with two lessons. Every WongStack business that adds a person has the same gap.

## What Changes

1. **Their first chat signs them in, then sends them to a new chat.** The person's first chat is the one they paste your message into: it is their "Start here". The message already names their email, so the chat asks for nothing. Setup shows a sign-in link, and they sign in to the app with that email. A person who is not in Access yet is stopped at the sign-in and asks you or an admin, as today. Setup then puts the project on their computer. Its last words now tell them to open a new chat in the project's folder and type `lesson 1`, not "nothing else is needed". With Paseo, the words say to open a new workspace on *New worktree* from *main*. The lesson needs a new chat, because the first chat started before the project was there and knows none of its skills. A later update, or a person who gets the apps only, sees the same words as today.
   ```mermaid
   flowchart TD
     paste[paste your message] --> link[sign-in link]
     link --> signin[sign in with their email]
     signin -->|not in Access| ask[ask you or an admin]
     signin --> setup[project on their computer]
     setup --> next["Next: new chat, type lesson 1"]
     next --> l1[Lesson 1 in a new chat]
   ```
2. **Lesson 1: use skills.** The lesson runs in its own chat, one step at a time. It waits for the person at each step. It first asks who they are and what they work on, and saves a short page about them in the company knowledge. It then shows what a skill is, how `/` lists them, and how asking in plain words picks the right one. It shows how to answer a question card. The person runs one real skill that fits their job, and nothing in the project changes. The lesson ends with one task per chat, how to close a finished chat, and how to open Lesson 2 the same way.
   ```text
   Lesson 1 — use skills          (~20 min)
    1. Who you are and what you work on
    2. What a skill is, and "/" to list them
    3. Ask in plain words; the chat picks one
    4. Answer a question card
    5. Run one real skill for your job
    6. One task, one chat; close when done
    7. Open Lesson 2 in a new chat
   ```
3. **Lesson 2: make a real change.** The person picks something small and real from their job: a skill for a task they repeat, or a small tool. With no idea, the lesson offers two or three from what they told Lesson 1. It takes them through the plan and its review page, the build, and the save. Then it shows the link to the saved change. The lesson always stops there: it names who makes the change live, the owner or an admin, or they themselves with `/ship` later. So you see each new person's first change before it goes live. It also shows how to come back to unfinished work.
   ```mermaid
   flowchart TD
     pick[a real task] --> plan["/plan + review page"]
     plan --> apply["/apply"] --> save["/save"]
     save --> stop[stop: link to the change]
     stop --> pub[the owner or an admin publishes]
   ```
4. **One wiki page for the first day.** A new page tells the owner and the new person the whole first day in order: add them in Access, send the message, setup, then the two lessons. Each lesson has its own page, which the person can read too. The steps are in words for every assistant, with no pictures, so they stay correct when Paseo changes its screen. The Access and setup pages link to it.
   ```text
   wiki/development/first-day/
     README.md        the first day, in order
     use-skills.md    Lesson 1
     make-a-change.md Lesson 2
   ```

**Non-goals:** pictures of the Paseo picker; a new "Start here" chat that opens by itself (a teammate brings their own computer and assistant, so no server sets one up); a GitHub sign-in step (saves go through the company app); connecting a person's own tools, which is a separate part; publishing from a lesson; changing what Access or the message to send says.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities
- `first-day-lessons`: the `lesson` skill and its two lessons: how a person opens each one, what each must teach, and what each leaves behind.

### Modified Capabilities
- `employee-onboarding`: setup's final report, after a first install of the project, names the first lesson as the next step.

## Impact

- `scripts/employee-bootstrap.mjs` (`summary()`), `scripts/tests/employee-bootstrap.test.mjs`.
- New `.agents/skills/lesson/SKILL.md`; `.agents/skills/wong-sync/references/payload-files.json` (`core.skillDirs`).
- New `wiki/development/first-day/` (`README.md`, `use-skills.md`, `make-a-change.md`); links from `wiki/development/README.md`, `wiki/stack/employee-access.md#add-change-and-remove-people` and `wiki/stack/employee-project.md#install-in-one-step`.
- `openspec/specs/employee-onboarding/spec.md`, new `openspec/specs/first-day-lessons/spec.md`, `.agents/skills/memory/references/areas.json`.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-11-04** — Asked whether the lessons show pictures of Paseo's "New workspace" picker → chose words only: the steps in words for Paseo and other assistants, so nothing goes out of date and WongStack needs no Paseo.
- **2026-11-04** — Asked whether a person allowed to publish may publish in Lesson 2 → chose stop at saved: the lesson always stops at the saved change and names who publishes.
- **2026-11-04** — Assumed: setup's last words start the first day, not a separate "Start here" chat, because WongStack makes no server for the person: their own assistant runs setup, and setup's report is the one thing every person reads.
- **2026-11-04** — Assumed: Lesson 1 opens in a new chat, not in the setup chat, because the setup chat started before the project was on the computer and knows none of its skills or rules.
- **2026-11-04** — Assumed: the "who are you" step moves into Lesson 1 and saves the person's page in the company knowledge, because the wiki rules already ask for a page for each new person, and a Project code holder can save one.
- **2026-11-04** — Assumed: there is no sign-in or GitHub step, because setup has already signed the person in, and saves go through the app with no GitHub account.
- **2026-11-04** — Assumed: Lesson 2 makes a skill or a small tool, not a how-to page, because a company knowledge page saves at once with no plan, so it would not teach the plan, build and save steps.
- **2026-11-04** — Assumed: the lesson steps live on wiki pages and the skill stays short, because a person and the owner can read the same pages, and the skills' word budget has about 280 words left.
- **2026-11-04** — Assumed: the skill is `lesson`, opened by typing `lesson 1` or `lesson 2` in plain words, because a new chat must know which lesson to run with no setup, and plain words work in every assistant.
- **2026-11-04** — Asked whether step 1 should show the first chat's order (sign in by email, then a new chat for Lesson 1) → chose to show it: step 1 now names the first chat as "Start here" and draws the order; no behavior changed.
- **2026-11-04** — Assumed: the setup test that bans *next* in the report now bans only a `"next":` field, because the lesson sentence starts with *Next:* and is words for the person, not a command; the packaged test still checks there is no `next` field.
- **2026-11-04** — Assumed: the three first-day pages ship as one folder in `core.dirs`, and setup's seeded development hub links `first-day/`, because an installed wiki's hub check fails on a folder its hub does not link.
- **2026-11-04** — Assumed: `areas.json` names `openspec/specs/first-day-lessons/spec.md` now, so the area test fails locally until `/ship` archives the change and writes that spec; with the spec in place the test passes.
- **2026-11-04** — Assumed: the Team access attachment's `checked:` moves to today, because its source page only gained a link sentence and the fix is unchanged; `employee-project.md` step 4 now names the lesson, since *nothing else is needed* is no longer true after a first install.
- **2026-11-04** — Assumed: 5.1's local checks count as passed before the archive, because every check passed with the new spec in place except the area test, which waits for the archive to add `openspec/specs/first-day-lessons/spec.md`; `/ship` reruns them after the archive.
- **2026-11-04** — Assumed: 5.3 is `/ship`'s own checkpoint save, because CI can not pass before the archive adds the new spec; `/ship` stops before the merge if CI fails.
- **2026-11-04** — Seen in a new chat on this checkout: `lesson 3` said there are two lessons and offered both; `lesson 1` stopped after step 1 (who you are), step 2 (type `/`) and step 3 (plain words), each waiting for an answer; it wrote no page when asked not to, and no project file changed.
- **2026-11-04** — Archive checkpoint: archived by `/ship` on branch shaggy-liger; the new spec's Purpose was written after the archive so the spec check passes.
