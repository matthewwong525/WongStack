# Focus /improve on code and /dream on memory

**Status:** ready-to-ship

**Branch:** redesign-improve-dream

**Open questions:** none

## Why

The improve and dream skills blur into each other. Improve will ship any kind of improvement, so its last run added a feature, and nothing reliably looks after how the code is built. Dream tidies saved facts and your own wiki pages, but never reads the specs or past plans, so two of the four places your project remembers things go unchecked. Their names don't say what each one works on.

## What Changes

- **Two clearer names. BREAKING.** The new names are in the picture. Each name says what it works on.
  ```text
    BEFORE          AFTER
  /improve  ─▶  /improve-code
  /dream    ─▶  /dream-memory
  ```
- **Schedules you already made keep running.** A schedule that still uses an old name runs the renamed skill, so nothing stops on the day you update.
- **The code skill works only on how the code is built.** It makes the code simpler and safer to change. A new feature or a wording fix is a normal request, and trouble with memory or the wiki goes to the memory skill.
- **It plans, then stops for you.** It no longer builds or publishes on its own. It finds one improvement, writes the plan with the reason and the evidence, and ends at the plan's link, where you choose to build it, change it, or drop it. A scheduled run does the same and leaves the plan waiting for you.
  ```text
    BEFORE                AFTER
  find ─▶ build         find ─▶ plan ─▶ you
            │                          │ yes
            ▼                          ▼
         publish                build ─▶ publish
  ```
- **It looks where the trouble is.** It starts from where past chats struggled and where the code changes most, not from a checklist. It asks of each piece: if this were deleted, would the mess vanish or come back in every place that uses it?
- **Its plan proves the change is safe, or undoes it.** Every plan first locks in what the code does today with a test, then reshapes it. If the built result is not easier to read, the build undoes it and says so.
- **It remembers a no.** An idea it weighed and turned down, or a plan you dropped, is saved with the reason, so a later run does not suggest it again.
- **Every run ends one of three ways**: clean (nothing worth changing), planned (one plan waiting for you), or blocked (what stopped it).
- **The memory skill reads everything your project remembers.** It compares the wiki, saved facts, the specs, and past plans with each other and with the code. It fixes wiki pages and saved facts itself. A spec that is wrong, or a plan left half done, it lists for your yes.
  ```text
  wiki ────────┐
  saved facts ─┤          ┌▶ fixes: wiki, facts
  specs ───────┼▶ compare ┤
  past plans ──┘          └▶ lists: specs, plans
  ```
- **A stricter test for what goes on the wiki.** A fact is kept only if it will still be true in six months and would change what someone does. Guidance that exists but is buried gets moved or reworded, not written a second time.
- **A fault in the product is reported, not hidden.** When a page says one thing and the product does another, and the product is the one that is wrong, the memory skill leaves the page alone and passes the fault to the code skill.

**Non-goals.** No new schedule: both still run only when you type them or schedule them yourself. The memory skill does not rewrite specs, past plans, or the pages WongStack ships. No outside skill is adopted whole.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repository-improvement`: the command is `/improve-code`; it writes a plan and stops instead of publishing; scope narrows to code structure; selection uses struggle notes and change hot spots; behaviour is pinned before restructuring; ruled-out ideas are recorded; a run ends clean, planned, or blocked.
- `wiki-dream`: the command is `/dream-memory`; it reads specs and plans as well as the wiki and facts; it corrects stale facts; it lists spec and plan mismatches; product faults go to `/improve-code`; the lasting-fact test is stricter.
- `cloud-routines`: a routine whose prompt names `/improve` or `/dream` runs the renamed skill.
- `memory`: the struggle-notes requirement is renamed, since two skills now read those notes; its behaviour is unchanged.

## Impact

- Skill folders `.agents/skills/improve/` and `.agents/skills/dream/` are renamed; `dream.mjs` gains a read-only `drift` command and spec rows in `pages`.
- `scripts/routine-runner/run.mjs`, memory's verb tags and slash-command re-tagging, `areas.json`, `payload-files.json`, the payload manifest, `retired-names.json`, `measure-sessions.mjs`, the context baseline, and their tests.
- `AGENTS.md`, `wiki/development/repository-improvement.md`, `wiki/development/wiki-dream.md`, `wiki/development/memory.md`, `wiki/maintaining/adding-a-skill.md`, `.agents/skills/routine/SKILL.md`.
- A major release: the typed commands change.

## Decision log

- **2026-10-06** — Asked what the two skills should be called → chose `/improve-code` and `/dream-memory`, with the old names kept working for existing schedules.
- **2026-10-06** — Asked how narrow the code skill should be → chose code structure only; features and wording fixes go through a normal request.
- **2026-10-06** — Asked what the memory skill does with a wrong spec or past plan → chose: fix wiki pages and saved facts itself, list wrong specs and stale plans for a yes.
- **2026-10-06** — Asked whether the code skill should consult before changing anything → chose: it goes straight into making a plan and ends there.
- **2026-10-06** — Assumed: a scheduled run saves its plan so it waits for a yes, because a schedule's copy of the project is thrown away when the run ends.
- **2026-10-06** — Asked whether the memory skill should also stop for a yes → chose: it goes all the way through to publishing on its own.
- **2026-10-06** — Assumed: "db" in the request means the saved-facts database, because it is the only database that holds memory.
- **2026-10-06** — Assumed: this is one change, not two, because the two skills share one boundary and one rename.
- **2026-10-06** — Assumed: the old names keep working in schedules only, not as typed commands, because a schedule breaks silently while a person who types the old name sees at once that it is gone.
- **2026-10-06** — Assumed: trouble notes about memory or the wiki go to `/dream-memory`, because the code skill no longer handles them.
- **2026-10-06** — Assumed: the wiki pages and specs keep their file names and get new titles, because installed projects link to them.
- **2026-10-06** — Assumed: ideas are taken from poteto's pstack and Matt Pocock's skills a sentence at a time with no text copied, because Matthew chose that over adopting them whole on 2026-10-04.
- **2026-10-06** — Assumed: the first real memory dream runs after the publish and is not a build task, because it needs the published skill and a plan with an open task can not be published.
- **2026-10-06** — Assumed: the stale-fact list counts a path only when the project once held it and the fact does not itself say it was removed, because the trial's first list was mostly false alarms (6 of the 10 read).
- **2026-10-06** — Assumed: a scheduled run's waiting plan is marked by a note that starts `Improve plan:`, because the trial could not tell which waiting note was the code skill's own.
- **2026-10-06** — Asked how to clear a publish blocked by Dependabot's failed update job on main → chose: fix the publish check in this change, so it counts only the project's own checks.
- **2026-10-06** — Archive checkpoint: built, three trial runs recorded in trial.md, local checks pass, numbered 37.0.0; the first real memory dream runs after the publish.
