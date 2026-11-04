# Design: a guided first day for a new teammate

## Context

See [proposal.md](proposal.md) for why. Today a teammate joins in three steps, all already built:

1. The owner or an Admin adds them in [Access](../../../wiki/stack/employee-access.md#add-change-and-remove-people). The email goes on the sign-in list in the same save, and a popup gives the *Message to send them* (`welcomeNote()` in `app/src/apps/access/note.ts`).
2. The person pastes that message into their own assistant. [`scripts/employee-bootstrap.mjs`](../../../scripts/employee-bootstrap.mjs) signs them in, downloads the project into the folder, and connects memory ([install in one step](../../../wiki/stack/employee-project.md#install-in-one-step)).
3. The assistant repeats setup's `summary()`, which ends *Nothing else is needed.*

ClaymooApp's plan (`first-day-onboarding`, ClaymooApp branch `fresh-cobra`, not merged) adds a server-made "Start here" chat, an External Emails step, a GitHub sign-in, Paseo picker pictures and a `/lesson` skill. Most of its setup half is about ClaymooApp's per-person servers. In WongStack, Access already does the sign-in list, the person brings their own computer, and saves need no GitHub. What carries over is the lessons and a clear next step.

Facts checked on 2026-11-04:

- `summary()` gets `project: 'installed'` only on a first download into an empty folder; an update is `'up to date'`, an apps-only run has no `folder`.
- `measure-context.mjs`: instructions 26,862 of 27,148 words (about 280 left); start-up 2,181 of 2,200 words and 14,987 of 15,082 bytes. Every model-invoked skill's `description` counts toward start-up.
- `wiki/stack/employee-access.md` is at 2,788 words and `employee-project.md` at 2,717, near the 3,000-word cap, so the first day gets its own pages.
- A Project code holder can save a company knowledge page with `knowledge.mjs save` ([save a page](../../../wiki/stack/company-knowledge.md#save-a-page)).

## Goals / Non-Goals

**Goals:** every new teammate reads one clear next step at the end of setup; two lessons teach skills, one task per chat, and the change loop up to a save; the same words work with or without Paseo.

**Non-goals:** a chat that opens by itself; pictures; changing Access or the message to send; any new script beyond the summary line.

## Decisions

### 1. Setup's summary names the first lesson, only on a first install

In `summary()`, when `project === 'installed'` and the copy's tools found the sign-in (`found`), the last sentence becomes the next step instead of *Nothing else is needed*:

- Default: `Next: open a new chat in <folder> and type "lesson 1". It takes about 20 minutes and shows you how to work here.`
- When `PASEO_AGENT_ID` is set (setup ran inside a Paseo agent): `Next: in Paseo, open a new workspace on this project, choose New worktree from main, and type "lesson 1" there. …`

Every other case keeps today's words. A sentence to the *person*, not a command for the assistant, so it keeps the spec's rule that the report tells the assistant to run nothing.

- *Alternative:* add the lesson to Access's *Message to send them*. Rejected: the note is read before setup, when the project and its skills are not on the computer yet; and it would add a second place that names the next step.
- *Alternative:* continue into Lesson 1 in the setup chat. Rejected: that chat started before the project existed, so it loaded none of the project's rules or skills.

### 2. `lesson` is one short skill; the lessons are wiki pages

`.agents/skills/lesson/SKILL.md` maps `lesson 1` / `lesson 2` (and *teach me skills*, *teach me to make a change*) to [`wiki/development/first-day/use-skills.md`](../../../wiki/development/first-day/use-skills.md) or [`make-a-change.md`](../../../wiki/development/first-day/make-a-change.md), reads that page, and teaches it. It holds only the teaching rules: one step per reply; wait for the person; plain words; never do the step for them when the step is the lesson; any other number offers the two lessons. Its `description` stays about 12 words (about 75 bytes), for example *Teach a new teammate: lesson 1, using skills; lesson 2, a first change.*

- The pages are readable by the person and the owner, and are one copy of each lesson ([one topic, one page](../../../wiki/wiki-style.md#one-topic-one-page)). Wiki pages do not count toward the skills' instruction budget, so only `SKILL.md` needs room.
- *Alternative:* the lessons in `references/lesson-1.md` and `lesson-2.md`, as ClaymooApp does. Rejected: about 700 words would need an equal cut from other skills, and the owner could not read them as a page.
- The lessons name verbs (`/plan`, `/apply`, `/save`, `/continue`, `/close`), never their inner steps, so a later change to the loop teaches the new way with no lesson edit.

### 3. Lesson 1: who you are, skills, one task per chat

Steps on `use-skills.md`:

1. Find the person by `git config user.email`, else ask. If no company knowledge page lists the email, ask who they are and what they work on, and save `knowledge/people/<name>.md` (plus the hub) with `knowledge.mjs save`. With no knowledge repository, say it is skipped and go on.
2. What a skill is; type `/` to list them.
3. Ask in plain words; the chat picks the skill.
4. Answer a question card.
5. Run one real skill that fits their job and changes no project file: for example `/daily` *what's going on?*, a memory search, or a look-up in one of their apps through the company actions.
6. One task, one chat: with Paseo, one workspace each, and `/close` when done; without it, a new chat in the project's folder.
7. Open Lesson 2 the same way they opened this one, and type `lesson 2`.

### 4. Lesson 2: a real change, stopped at the save

Steps on `make-a-change.md`: pick a small real task (a skill for a task they repeat, or a small tool); with no idea, suggest two or three from their people page and the apps they hold. Ask for it in plain words, so `/plan` starts; open the plan's review page; `/apply`; `/save`. The save's own report ends with the link and who publishes ([who publishes](../../../wiki/stack/employee-project.md#who-publishes)); the lesson repeats it in one line.

The lesson always stops at the save. A person who asks to publish here is told who can, and that `/ship` works for them later if they hold *Can publish*; the lesson never runs `/ship`. The closing question offers `/close`, not *publish it?*. It ends with `/continue` for unfinished work.

### 5. Docs

New folder `wiki/development/first-day/`:

- `README.md`, *A teammate's first day*: add them in Access, send the message, setup, Lesson 1, Lesson 2, each a link. It names what the owner sees: one saved change from each new person.
- `use-skills.md`, *Use skills* (Lesson 1) and `make-a-change.md`, *Make your first change* (Lesson 2): the steps above, written for the person, in words for Paseo and for any other assistant.

The [development hub](../../../wiki/development/README.md) links the folder; one sentence in [add, change and remove people](../../../wiki/stack/employee-access.md#add-change-and-remove-people) and one in [install in one step](../../../wiki/stack/employee-project.md#install-in-one-step) link it, keeping both pages under the cap.

## Risks / Trade-offs

- **Start-up budget has 19 words left** → the description stays about 12 words; if a change merged first takes the room, cut an equal number of words from another skill's description in this change.
- **The lesson's own closing differs from the usual *publish it?*** → the lesson page says so, and `SKILL.md` keeps it as one rule with its reason: the owner sees each new person's first change.
- **`PASEO_AGENT_ID` is unset when setup runs in a plain terminal next to Paseo** → the person reads the default words, which still work: a new chat in the folder.
- **A person with no company knowledge repository** → step 1 skips the page and says so; nothing else depends on it.

## Migration Plan

Installs get it with `/wong-sync`. A teammate who already set up types `lesson 1` in a new chat once the update is live. Nothing to undo: removing the skill and the line restores today's behavior.
