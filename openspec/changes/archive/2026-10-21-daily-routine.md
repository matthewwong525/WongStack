<!-- openspec-archive v1 2026-10-21-daily-routine -->
<!-- file proposal.md utf8 12243 -->
# Run each person's day with /daily, a chief of staff that keeps agents moving

**Status:** ready-to-ship
**Branch:** daily-routine-skill
**Open questions:** none

## Why

A business owner wants each person on the team to start the day the same reliable way, without re-explaining it every morning. Today WongStack has no shared start-of-day: each person types the same requests by hand, and Matt's daily in WongOS works for him alone.

Once the day starts, the person becomes the bottleneck. Each agent they start stops between turns and waits for them, even though most stops need only *keep going*, and most choices have an obvious best answer. WongOS's daily already says *Needs you* each time an agent stops, so every stop still lands on the person. A chief of staff should judge each stop first and bring the person only what needs them.

Each person also carries things that come back on their own: a weekly report, the books on the first of the month, a call to return on Friday. Today they keep those in their head. The chief of staff should hold them: repeating jobs it runs on their days, and reminders it checks each time it starts. Everyone on the team runs their own `/daily`, with their own steps, reminders and agents, so each person's day is fitted to them.

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
- **Repeating jobs run on their own days.** A step's days are plain words: *every day*, *Mondays*, *weekdays*, *the first of the month*. `/daily` runs each one only on its day, like a schedule you set by talking.
- **You teach it as you go.** Say "add checking yesterday's orders to my daily", and tomorrow it does that step for you. It shows the new list and saves it like any other edit. A new person with no steps yet gets the team part, then an offer to start their own.
- **It keeps your reminders and checks them every time it starts.** Say *remind me Friday to call Kim back about the kits*, in the daily chat or after `/daily`. It saves the reminder as your own private note, which teammates never see, with no edit to save. Each `/daily` starts by listing what's due today or overdue, along with work you left open, before the day's steps. Say *done* and it drops off.
  ```text
  /daily ─▶ who? ─▶ reminders ─▶ steps ─▶ list
                    due today
                    + overdue
                    + left open
  ```
- **A long step gets its own workspace where your app allows it.** A step like working through email opens its own workspace, so its questions don't take over the morning chat. Each one starts once a day: a second `/daily` opens nothing twice. Where the app can't open workspaces, the step runs right in the chat.
- **The daily chat stays on all day as your chief of staff.** After the morning steps, it keeps watching every agent it started, for up to 10 hours. Talk to it any time: *get someone to research packaging suppliers* starts a new agent, *watch flashy-crab* adds a chat you started yourself, *what's going on?* lists each agent and where it stands. It never steps into a chat you didn't start through it or hand to it.
  ```text
  you ──▶ chief of staff ──┬─▶ agent: email
           (daily chat)    ├─▶ agent: research
                           └─▶ agent: flashy-crab
  ```
- **Each time an agent stops, the chief sorts it into one of three buckets.** Most stops never reach you.
  ```text
  agent stops ─▶ chief reads it
                   │
     ┌─────────────┼──────────────┐
     ▼             ▼              ▼
  keep going   obvious pick   needs you
  it replies   safe: answers  pings you
               risky: list    right away
  ```
  1. **Keep going.** The agent finished a step and named its next one, or asked *shall I continue?* The chief replies *keep going* itself.
  2. **Obvious pick.** The agent asked a choice with a clear best answer. When that answer stays inside the work, such as *build it now* or *fix the failing test*, the chief picks it. When it sends, pays, publishes, deletes or signs up for something, the chief adds it to one approval list you clear in a single tap.
  3. **Needs you.** No clear answer, an agent stuck on the same thing twice, a login only you can do, or anything the chief isn't sure of. It tells you at once, in the chat and as a phone notification where your app sends them.

  Each thing the chief does on its own shows as one line in the chat, such as `Kept going: email` or `Picked "Build it now": research`, so you can step in.
- **Agents start with their choices already made.** Before the chief starts an agent, it writes a short brief: the goal, what *done* looks like, the choices already settled, and what the agent may do without asking. A choice only you can make, it asks you then, not halfway through the work.
- **Done means checked.** An agent's *done* reaches you only with proof the chief looked at: a link that opens, checks that passed, or the file or message it made. Without proof, the chief asks the agent for it once, then tells you.
- **Where the app can't watch other chats, `/daily` still works.** It runs each step in the morning chat and reports, with no watching.

Non-goals: no timer (a person can ask for a morning run later through the usual schedule offer); no task board or day page like WongOS's (a team can add one as their own step); the chief never approves sending, paying, publishing or deleting on its own; moving Matt's WongOS and ClaymooApp dailies onto this comes later, in each of those.

## Capabilities

### New Capabilities

- `daily-routine`: `/daily` identifies the person by company sign-in, lists the person's due reminders and open work, runs the team's then the person's steps on the days they name, saves new reminders as private memory facts, lets a person change their own steps, opens long steps in their own workspace once per day where the host supports it, keeps install-owned steps across updates, then stays on as a chief of staff: it watches the agents it started or was handed, sorts each stop into keep going, obvious pick or needs you, briefs each agent with its decisions up front, and reports *done* only with proof.

### Modified Capabilities

None.

## Impact

- New skill `.agents/skills/daily/` (`SKILL.md`, `references/chief.md`, `scripts/daily.mjs` and its test), started only by a person (`disable-model-invocation: true`).
- Reuses `memory/scripts/lib/store.mjs` (`signIn`, `memoryOrigin`) for identity, `memory.mjs search` and `put-facts` for reminders (a `user` fact tagged `reminder`), `schedule/scripts/workspace.mjs` to open workspaces, and `schedule/scripts/lib/paseo.mjs` for `paseo ls`, `logs`, `send` and `permit` to watch and answer agents.
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
- **2026-10-21** — Asked how the chief of staff relates to the parked /daily → chose to grow /daily into it: one chat that starts the day, then stays on watching its agents.
- **2026-10-21** — Asked what the chief may answer on its own → chose obvious picks for safe steps only; anything that sends, pays, publishes or deletes goes to a one-tap approval list.
- **2026-10-21** — Asked which chats the chief looks after → chose only the ones it started or the person hands it.
- **2026-10-21** — Assumed: it watches for up to 10 hours, because WongOS's watcher uses that limit and a workday fits in it.
- **2026-10-21** — Assumed: *needs you* goes to the chat plus a phone notification where the app sends them, because the person may be away from the screen and a missed escalation stalls the work.
- **2026-10-21** — Assumed: a deterministic watcher with no model notices stops and the chief's model only judges each one, because polling with the model burns turns all day for nothing (the knowledge center's [deterministic-first principle](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)).
- **2026-10-21** — Assumed: when unsure, the chief escalates, and after 5 replies in a row to one agent with no word from the person it escalates too, because a wrong *keep going* loops quietly while a wrong escalation costs one tap.
- **2026-10-21** — Asked on the review page to cover repeating jobs (daily to monthly), saved reminders checked at each start, and a tailored daily for each person → added saved reminders and the start-of-day check; repeating jobs and each person's own daily were already planned, and the Why now says so.
- **2026-10-21** — Assumed: a reminder is a private memory fact (type `user`, tag `reminder`, body starting `Reminder for YYYY-MM-DD:`), not a line in the person's steps file, because it saves at once with no edit to publish, teammates never see it, and memory never closes it on its own the way it closes a 30-day-old open thread.
- **2026-10-21** — Assumed: the start-of-day check also lists the person's own open threads in memory, newest 5, because "work you left open" is the other stored fact a morning needs.
- **2026-10-21** — Assumed: the chief answers a question card by denying it with the chosen text as the message, because the probe (design decision 13) found Paseo's CLI hides the question that `permit allow --input` keys its answer by, while the agent went on with a denial's message.
- **2026-10-21** — Assumed: WongOS and ClaymooApp move their dailies onto this later, in their own changes after a sync, because their Notion and board steps are their own.
- **2026-10-21** — Assumed: the live run (task 6.2) passed with two throwaway agents: keep going, a safe pick, a risky send held back and answered as not approved, done checked against its file, an unhanded chat refused, the sixth unbroken reply refused, and today's reminder listed while tomorrow's was not; so the change is saved as built, not parked.
- **2026-10-21** — Assumed: archived for publishing at Matthew's *Publish it*; the context budget forced a trim of the payload manifest's install-owns paragraph to fit the daily line, meaning unchanged.

<!-- end proposal.md -->
<!-- file design.md utf8 15578 -->
# Design

## Context

See proposal.md for why. Two WongOS changes shaped this: `daily-decision-page` (PR #119), which reads Matt's board and sends a day page, and `populate-daily-work`, which opens each due routine in its own Paseo workspace once a day. Both are Matt-only: WongOS's `references/settings.md` says "there is no other-person setup or identity selection".

WongStack already has the pieces:

- **Identity.** `memory/scripts/lib/store.mjs` `signIn(origin)` reads the token `cloudflared` saved and returns `{state: missing|expired|near|valid, email}`; it never logs in. `memoryOrigin(loadConfig(ctx))` gives the app origin. `signInHelp(origin)` is the login command.
- **Workspaces.** `schedule/scripts/workspace.mjs open --title --brief` opens one Paseo workspace from the default branch; it fails outside Paseo.
- **Excluding files from a shipped skill.** `install.mjs` and `preflight.mjs` drop any path under a category's `exclude` list.
- **Budget.** `measure-context.mjs` has under 100 bytes of instruction headroom; `disable-model-invocation: true` skills count as `on-call`, apart.
- **Agent control.** `schedule/scripts/lib/paseo.mjs` finds and runs the `paseo` CLI. `paseo ls --json --global` gives each agent's `status` (`running`, `idle`, …); `paseo logs <id> --tail <n> --json` its timeline; `paseo send <id> --prompt-file <f> --no-wait` a message; `paseo permit ls --json` the pending permission and question requests; `paseo permit allow <agent> <req> --input <json>` answers one. `open` already records each workspace's `agentId`.
- **Prior art.** WongOS's `daily.mjs watch` polls every 5 minutes with no model and prints `Done`, `Needs you` or `Stopped` per started task; every stop goes to Matt. Alex Hillman's chief-of-staff pattern: about 90% of stops need *keep going*, 9% a multiple choice with an obvious best answer, 1% real judgment; the chief judges between turns, front-loads decisions and adds verification layers.

## Goals / Non-Goals

**Goals:** a general `/daily` every install gets; a script that owns the deterministic parts (who, which file, already opened today, which agents stopped, what the chief did) so the skill keeps only the steps and the judging; a chief of staff that brings the person only the stops that need them.

**Non-Goals:** no step parsing into a schema; no new app route or database; no change to `/schedule`; no chief action that sends, pays, publishes or deletes; no watching of chats the person didn't start through `/daily` or hand to it.

## Decisions

**1. Files: `team.md` and `people/<name>.md` inside the skill.** Each people file starts with YAML frontmatter `emails: [...]`, then a plain bullet list of steps; `team.md` is just the list. Name files like wiki person pages (`jo-lee.md`). *Over a JSON settings file (WongOS):* people edit by talking, and words carry "Mondays" or "the first of the month" without a cadence schema. *Over keying files by email:* one person signs in with several emails.

A step line reads `- [days:] <what to do>`, with `(own workspace)` at the end for a step that should not take over the chat:

```markdown
---
emails: [jo@example.com, jo.lee@gmail.com]
---
- Check yesterday's Shopify orders and flag refunds.
- Weekdays: /email (own workspace)
- Fridays: draft the week's update for the team.
```

**2. `scripts/daily.mjs` owns the deterministic parts.**

- `who` → `{state, email, origin, file, login}`: the sign-in from `signIn(memoryOrigin(config))`; with no app origin, `git config user.email` and `source: "git"`; `file` is the people file whose `emails` holds it (case-insensitive), or `null`; `login` is the `signInHelp` command when not `valid`/`near`.
- `opened --day <YYYY-MM-DD>` lists the workspaces opened today; `open --step <text> --title <t> --brief <file>` runs `workspace.mjs open` once per (person, step, local day), recorded in `<git common dir>/wong-daily/`, beside memory's `wong-memory/` state, so every worktree of this checkout sees it and git never tracks it, and returns `already` on a repeat. Outside Paseo it returns `unsupported` and opens nothing, so the skill runs the step in chat.

Which steps are due today stays with the assistant: it reads the day words against today's local date. *Over parsing days in code:* the words are open-ended, and a wrong read only skips or adds one step that the reply shows.

**3. Signing in waits on the person.** On `missing`/`expired`, the skill runs the `login` command in the background, shows the link it prints, waits for it to exit, then reruns `who`. Memory never runs a login because it must not wait on a person; `/daily` is started by one, so it can.

**4. Changing steps uses the change loop.** "Add X to my daily" edits the person's file (creating it with their sign-in email if missing), shows the new list, and offers to publish like any repo edit. Team steps change only through the owner's review. Steps are in a shared repo: the skill keeps private life out, by [the wiki's People rules](../../../wiki/wiki-style.md#people).

**5. Person-started only.** `disable-model-invocation: true`; no `AGENTS.md` line, which keeps startup words unchanged. The wiki page and changelog announce it.

**6. Ship the skill, not the steps.** `core.skillDirs` gains `daily`; `core.exclude` gains `.claude/skills/daily/team.md` and `.claude/skills/daily/people`. This repo keeps none of either, so nothing excluded exists here today.

**7. The chief is the same chat, staying on.** After the morning reply, `/daily` starts `watch` in the background and handles each line it prints, until it ends. *Over a separate skill or agent:* one chat to learn, and the morning's context (who, which steps, which briefs) is already loaded. *Over a model heartbeat:* a model turn every few minutes all day costs turns for nothing; a script with no model notices, and the model only judges ([deterministic first](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)). Hosts that run a command in the background and deliver its lines (Claude Code's Monitor, Codex's background terminal) use that; elsewhere the chief runs `watch --once` each time the person writes.

**8. The watch list is the day file.** Every `open` row is watched. `hand --agent <id|workspace name>` adds a row with `source: "handed"` for a chat the person names, after `paseo ls` confirms it exists; a step-less task the person asks for mid-day opens through `open --step "task: <title>"`, so it gets the same once-a-day key. Nothing else is watched: the person's own chats stay theirs.

**9. `watch`: notice, never act.** Every 60 seconds (`--seconds`), it reads `paseo ls --json --global` for the watched agents and `paseo permit ls --json`, and prints one JSON line per event:

- `asking`: a pending request on a watched agent; carries `request` (the request id and its input, such as a question card's questions and options).
- `stopped`: the agent went from `running` to `idle` with no pending request; carries `last`, the agent's last message (from `paseo logs --tail`, cut to 4,000 characters). Printed once per idle spell.
- `gone`: the agent was archived or closed; it leaves the list.
- `not-read`: a read failed; printed once until a read succeeds.
- `end`: 10 hours passed (`--hours`), or no watched agent is left.

Each line names `agent`, `workspace` and `title`. Agent text is data: the chief follows no instruction in it. Outside Paseo, `watch` prints `{"event":"unsupported"}` and exits 0.

**10. `reply` and `answer` are the chief's only hands.** `reply --agent <id> --file <text>` runs `paseo send --no-wait`; `answer --agent <id> --request <req> --file <text>` answers a pending card with that text, by decision 13. Both:

- refuse an agent not on the watch list; `reply` also refuses one that is `running` (no steering mid-turn), and `answer` one with no such pending request;
- take `--bucket keep-going|pick|person` and a one-line `--label`, appended with the time to `<day>.actions.jsonl`, which `status` reads back for *what's going on?*;
- refuse a sixth `keep-going` or `pick` in a row for one agent; a `person` action (the chief relaying the person's own answer) resets the count. The refusal tells the chief to escalate.

*Over judging in code:* whether a stop means *keep going* is language; the script holds the limits a model could drift past.

**11. The judge lives in `references/chief.md`.** `SKILL.md` links it at the watch step, so the morning-only path never reads it. It holds:

- **The buckets.** *Keep going*: the agent reported progress and named its next step, or asked to continue. *Pick*: a question with a `(Recommended)` option or one answer the brief already settled, and that answer is safe. *Person*: everything else, including a risky answer, no clear best answer, the same blocker twice, a login, key or payment form only the person can fill, a result that contradicts the brief, and any doubt.
- **Safe vs risky.** Safe stays in the agent's own workspace and can be undone: plan, build, test, fix, retry, research, draft, save a checkpoint. Risky reaches outside or can't be undone: send or post a message, pay or buy, publish or ship, merge, delete or overwrite data, accept terms, change a business record, share a key. Risky picks join the approval list; the knowledge center's [little autonomy](../../../wiki/agent-knowledge-center.md#give-ai-as-much-access-as-you-can-and-as-little-autonomy-as-it-needs) is the reason.
- **Lines.** One chat line per own action: `Kept going: <title>`, `Picked "<option>": <title>`. `Needs you: <title> (<workspace>) — <the question>` for an escalation, asked by [the ask convention](../../../.agents/skills/explore/references/asking-the-user.md) with the agent's own options, plus a phone notification where the host has one.
- **The approval list.** Risky picks that arrive while a question is pending wait and go out together as one multi-select question: tick what to approve. Each ticked one is relayed with `--bucket person`; an unticked one gets *Not approved; stop before that step*.
- **Proof before done.** An agent that says it's finished reaches the person as `Done: <title> — <proof>` only after the chief checked a link opens, checks passed (`gh pr checks`), or the made file or draft exists. No proof: one `keep-going` reply asking for it, then `Needs you`.

**12. Briefs front-load the decisions.** Every workspace the chief opens starts from a brief with five short parts: *Goal*, *Done looks like* (the proof), *Decided* (choices already made), *Free to do* (its safe steps), *Ask first* (its risky ones). Before opening, the chief asks the person, in one round, any choice the task can't start without; a choice it can settle by reading, it settles. A step's brief from the morning list gets the same parts.

**13. Answering a question card from outside: checked, by a denial's message.** A workspace agent's closing question may be a host question card. Task 4.1 tried it on 2026-10-21 on a real Claude workspace agent (Paseo CLI, `bypassPermissions`):

- `paseo permit ls --json` lists a card as `{id, agentId, agentShortId, name: "AskUserQuestion", description}`, where `description` is the option labels joined by ` / ` (`Red (Recommended) / Blue`). It carries neither the question text nor its header. The agent stays `running` while the card waits, so `asking` comes from `permit ls`, never from `status`.
- `paseo permit allow <agent> <req> --input '{"answers":{"<question text or header>":"<option label>"}}'` answers it: Paseo merges `answers` into the card's own input, and the agent went on with the choice. A key that is neither is refused (`PERMISSION_RESPONSE_UNCONFIRMED … requires updatedInput.answers keyed by a question's full text or header`), and the card stays pending. Since the CLI never shows that key, the chief can't build it.
- `paseo permit deny <agent> <req> --message 'Chosen: "Small (Recommended)". Go on with that choice.'` also answered it: the agent read the message and replied `Answer: Small (Recommended)`.

So `answer` sends the chosen text as a denial's message (`Answer: <text>`), and refuses only an unwatched agent or a request not pending on it, not a `running` one. Briefs keep question cards; the numbered-chat fallback isn't needed. An agent that reads the denial as a refusal stops and says so; that stop has no clear answer, so it goes to the person.

**14. Reminders are private memory facts.** `remind --day <YYYY-MM-DD> --text <words>` writes, through `memory.mjs put-facts`, one `user` fact tagged `reminder` with body `Reminder for <day>: <words>` (slug `daily-routine`); a `user` fact is only its owner's in a team ([who sees what](../../../wiki/development/memory.md#who-sees-what)) and upkeep never closes one. `reminders [--day]` runs `memory.mjs search --tag reminder --type user --json`, keeps the person's own whose date is on or before the day, oldest first, and adds `open`: their live `thread` facts, newest 5 (`--author <email>`). `done --id <n>` supersedes the reminder with `Done <day>: <words>`. The assistant turns *Friday* into a date; the script only accepts `YYYY-MM-DD`. Store unavailable → `{state: "not-read"}` and the morning goes on with `Not read: reminders`. *Over a dated line in the steps file:* every reminder and its removal would be a saved edit the whole team can read. *Over a `thread`:* threads close unchecked after 30 days and teammates can read them.

## Risks / Trade-offs

- [An update overwrites or deletes a team's files] → `install.mjs` only fills an empty folder, and sync's `preflight.mjs` lists only upstream paths outside `exclude`, so a target's own `team.md` and `people/` never appear as changes. Tests cover both: install leaves them out, and preflight never lists them even when this repo holds such files.
- [`cloudflared` missing] → `who` reports `missing` with the login command; the skill says the tool is needed and links [required tools](../../../wiki/development/required-tools.md).
- [A step misread as due] → the reply lists each step run and skipped, so the person sees it.
- [The workspace record lives on one computer] → a second computer may open a step again the same day; acceptable for a person-started command.
- [The chief answers something the person would have stopped] → only safe picks, each shown as a line the person can reverse in that agent's chat; risky ones always wait for a tick.
- [A *keep going* loop burns a day] → the sixth unbroken chief action on one agent is refused and escalates.
- [Agent text tries to steer the chief] → agent messages are data; the chief takes instructions only from the person and the brief.
- [The daily chat's context fills over a long day] → each event is one short line; `status` rereads the action log instead of the chat's memory; a fresh `/daily` the same day reopens nothing and picks up the watch list.
- [A reminder is missed because `/daily` didn't run that day] → overdue reminders stay listed until marked done.
- [The memory store is down at the start of the day] → the morning goes on and says `Not read: reminders`; nothing is lost, the facts wait in the store or its spool.
- [The host can't run `watch` in the background] → `watch --once` on each message from the person; stops wait until then, which is no worse than today.

## Migration Plan

Additive. Existing installs get the skill on their next sync with no hand step; WongOS and ClaymooApp can then move their dailies onto it, each in its own change: their routines into `people/` files, and their own Notion or board steps as steps.

<!-- end design.md -->
<!-- file tasks.md utf8 8199 -->
# Tasks

## 1. Script

- [x] 1.1 Add `.agents/skills/daily/scripts/daily.mjs` with `who`, `opened` and `open`, using `isMain`/`parseCli` from `memory/scripts/lib/cli.mjs`, `signIn`/`memoryOrigin`/`signInHelp` from `memory/scripts/lib/store.mjs`, and `schedule/scripts/workspace.mjs` to open a workspace. `who` matches the people file by its `emails` frontmatter, case-insensitive; with no app origin it uses `git config user.email` and `source: "git"`. `open` records one opening per (email, step, local day) in `<git common dir>/wong-daily/` and returns `opened`, `already` or `unsupported` (not in Paseo). Verify: `daily.test.mjs` with a fake sign-in and launcher covers valid, near, expired, missing and git-email `who`; a file listing two emails; no file; a second `open` the same day returning `already`; the next day opening again; and `unsupported` opening nothing.

## 2. Skill

- [x] 2.1 Add `.agents/skills/daily/SKILL.md` (`name: daily`, `user-invocable: true`, `disable-model-invocation: true`): run `who`; on a missing or ended sign-in run the `login` command in the background, show its link, wait, rerun `who`; read `team.md`, then the person's file; run each step due today, the `(own workspace)` ones through `open` and the rest in chat; reply with a short list of steps run, skipped and still to do, and offer to start a list to a person with none. With words after `/daily` ("add X to my daily"), edit the person's file through the change loop, creating it with their sign-in email; only the owner's review changes `team.md`. Keep private life out of the files. Link the ask convention rather than restating it. Verify: read-through against each spec scenario.
- [x] 2.2 Add `wiki/development/daily.md`: what `/daily` does, the two files and a step line's shape (the design's example), adding a step, own workspaces, and that updates keep the files. Link it from `wiki/development/README.md`. Verify: the wiki checks in `node .github/scripts/checks.mjs --worktree` pass.

## 3. Payload

- [x] 3.1 In `payload-files.json`, add `daily` to `core.skillDirs`, and `.claude/skills/daily/team.md` and `.claude/skills/daily/people` to `core.exclude`; in `payload-manifest.md`, say the install owns them, beside the `schedules/<name>.json` line. Verify: tests in the existing `install.mjs` and `preflight.mjs` suites show a fresh install leaves both out, and preflight never lists a target's `team.md` or `people/` file.
- [x] 3.2 Add `daily-routine` to `.agents/skills/memory/references/areas.json`, naming the skill, the wiki page and the spec. Verify: `memory-areas.test.mjs` passes.
- [x] 3.3 Add a `## Next (minor) — Run each person's day with /daily` entry to `CHANGELOG.md`, with an Updating note that no hand step is needed and how to add a first team step. Verify: `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` pass.

## 4. Chief of staff: script

- [x] 4.1 Probe before building: from this chat, open a throwaway workspace whose brief asks one question card, run `paseo permit ls --json`, and answer it with `paseo permit allow <agent> <req> --input <json>`. Record in design decision 13 whether the card was answered and the request's input shape. If it can't be answered, take the fallback in decision 13 for 4.3 and 5.1. Archive the throwaway workspace.
- [x] 4.2 Add `watch` to `daily.mjs` (design decision 9): poll the day file's agents with `paseo ls --json --global` and `paseo permit ls --json` through `schedule/scripts/lib/paseo.mjs`, every `--seconds` (default 60) for `--hours` (default 10); print one JSON line per `asking`, `stopped` (once per idle spell, with `last` from `paseo logs --tail`, cut to 4,000 characters), `gone`, `not-read` (once until a read succeeds) and `end`; `--once` reads one round and exits; outside Paseo print `unsupported` and exit 0. Take the Paseo calls as an injected dependency.
- [x] 4.3 Add `hand --agent <id|workspace name>`, `reply --agent --file`, `answer --agent --request --file` and `status` (design decisions 8 and 10): `hand` adds a `source: "handed"` row after `paseo ls` finds the agent; `reply` and `answer` refuse an unwatched or `running` agent, take `--bucket keep-going|pick|person` and `--label`, append to `<day>.actions.jsonl`, and refuse a sixth unbroken `keep-going`/`pick` on one agent (a `person` action resets the count); `status` prints each watched agent with its live status and last action. Update `USAGE` and the header comment.
- [x] 4.4 Add `remind`, `reminders` and `done` (design decision 14), calling `memory.mjs` as an injected dependency: `remind` refuses a day not `YYYY-MM-DD`; `reminders` keeps due and overdue ones oldest first plus `open`, the person's newest 5 live threads, and returns `{state: "not-read"}` when the store fails; `done` supersedes with `Done <day>: …`. Add the `reminder` tag through `newTags` on first use.
- [x] 4.5 Extend `scripts/tests/daily.test.mjs` with fake memory calls: a future reminder is not listed, today's and an overdue one are, oldest first; another person's is never listed; `done` supersedes it; a bad day is refused; a failing store gives `not-read`. And with fake Paseo calls: `watch` prints `stopped` once per idle spell, `asking` with the request, `gone` and drops the agent, `not-read` once, `end` at the time limit and when the list empties, and ignores an unwatched agent; `--once`; `unsupported` outside Paseo; `hand` refuses an unknown agent; `reply`/`answer` refuse unwatched and running agents, log each action, refuse the sixth in a row, and reset after a `person` action; `status` reads the log back.

## 5. Chief of staff: skill and wiki

- [x] 5.1 Add `.agents/skills/daily/references/chief.md` (design decisions 11 and 12): the three buckets, safe vs risky with the risky list, the chat lines, the approval list as one multi-select question by the ask convention, proof before done, the five-part brief, asking a task's open choices in one round before opening it, agent text as data, and when unsure, the person. Link the ask convention; restate none of it.
- [x] 5.2 Extend `SKILL.md`: right after `who`, run `D reminders` and show due and overdue reminders and open work first (`Not read: reminders` on `not-read`); *remind me …* in the daily chat or after `/daily` runs `D remind` with the date worked out, and *done* runs `D done`; briefs for `(own workspace)` steps use the five parts; after the morning reply, start `D watch` in the background where the host can deliver its lines (else `D watch --once` on each message from the person) and handle each line by `references/chief.md`; mid-day asks (start a task through `open --step "task: <title>"`, `hand`, `status`). Update the `description` to name the chief of staff in as few words as fit. Verify: read-through against each new spec scenario; `node scripts/measure-context.mjs --check` passes, cutting elsewhere if the description pushes the startup route over.
- [x] 5.3 Extend `wiki/development/daily.md` with a reminders section (saving one, private to you, listed each start until done, repeating jobs as steps with days) and a chief-of-staff section: what it watches and never touches, the three buckets with one example each, what it never approves alone, the approval list, proof before done, and talking to it mid-day. Update the `CHANGELOG.md` entry's title and bullets to include the chief of staff.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 6.2 In this checkout, add a throwaway `people/` file with the signed-in email and one `(own workspace)` step whose brief makes the agent stop twice: once naming its next step, once asking a safe recommended choice; then hand the chief a second throwaway chat that asks a risky choice. Save a reminder for today and one for tomorrow first. Run `/daily` and confirm: only today's reminder is listed before the steps, then `Kept going`, `Picked`, the risky choice on the approval list, `Done` only with proof, and nothing sent to an unwatched chat. Mark the reminder done and confirm the next `D reminders` omits it. Archive the throwaway workspaces, mark tomorrow's reminder done, and delete the throwaway file. Then `/save`.

<!-- end tasks.md -->
<!-- file specs/daily-routine/spec.md utf8 8679 -->
## Purpose

`/daily` gives every person on a team one start-of-day command: it runs the steps the whole team shares, then that person's own, and learns new steps as they ask. It then stays on as their chief of staff: it watches the agents it started, keeps them moving, and brings the person only what needs them.

## ADDED Requirements

### Requirement: Daily runs as the signed-in person

`/daily` SHALL know the person from their company sign-in before it runs any step. When they are signed out or the sign-in has ended, it SHALL give them the sign-in link, wait, and carry on once they are in; it SHALL run no step under a guessed person. An install with no company app SHALL use the repo's git email and say so.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` runs `/daily`
- **THEN** it runs the team's steps and then the steps in the file that lists `jo@example.com`

#### Scenario: Signed out

- **WHEN** a person whose company sign-in has ended runs `/daily`
- **THEN** it shows the sign-in link, runs no step until they sign in, then runs their day without a second `/daily`

### Requirement: Team steps run before the person's own

`/daily` SHALL run the team's steps first, then the person's own, and reply with a short list of what it did and what is left for today. A step SHALL run only on the days its line names; a line with no days runs every day. A person with no steps file SHALL get the team's steps and an offer to start their own.

#### Scenario: A weekly step on another day

- **WHEN** the team file says `Mondays: plan the week with /team-plan` and `/daily` runs on a Tuesday
- **THEN** that step does not run and the rest of the day's steps do

#### Scenario: A new person

- **WHEN** a signed-in person with no steps file runs `/daily`
- **THEN** it runs the team's steps and offers to start their own list

### Requirement: A person changes their own steps by asking

A person SHALL be able to add, change or remove their own steps by saying so, and the change SHALL go through the usual save, shown before it is saved. Only the owner's review SHALL change the team's steps.

#### Scenario: Adding a step

- **WHEN** Jo says "add checking yesterday's orders to my daily"
- **THEN** Jo's list gains that step, Jo sees the new list, and the next `/daily` runs it

### Requirement: A long step opens its own workspace once a day

A step marked to run on its own SHALL open in its own workspace where the host can open one, and SHALL run in the same chat where it cannot. A second `/daily` on the same day SHALL open no step's workspace twice, and SHALL name the ones already open.

#### Scenario: Run twice in a day

- **WHEN** a person runs `/daily` twice on one day and their email step opens its own workspace
- **THEN** the second run opens no new email workspace and names the one already open

#### Scenario: A host with no workspaces

- **WHEN** `/daily` runs where the host cannot open a workspace
- **THEN** the email step runs in the same chat

### Requirement: Updates keep each install's steps

A WongStack install or update SHALL deliver the daily skill without the team's steps or any person's steps, and SHALL never overwrite or remove them in an installed repo.

#### Scenario: An update after a team wrote its steps

- **WHEN** an install with a team file and two people files updates WongStack
- **THEN** the skill's instructions update and all three files are unchanged

### Requirement: The daily chat stays on as a chief of staff

Where the host can watch other agents, `/daily` SHALL keep watching, for up to 10 hours, every agent it started and every chat the person hands it, and SHALL watch no other chat. The person SHALL be able to ask it, at any time in that chat, to start a new agent for a task, to watch a chat they name, or to say where each watched agent stands. Where the host cannot watch, `/daily` SHALL run its steps in the chat and only report.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task, watches it, and names it in the chat

#### Scenario: A chat the person started alone

- **WHEN** the person is working in a chat they opened themselves and did not hand to `/daily`
- **THEN** the chief never sends anything to that chat

### Requirement: The chief sorts each stop into three buckets

Each time a watched agent stops or asks something, the chief SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the question has a clear best answer that is safe; or tell the person at once. A safe answer stays in the agent's own work and can be undone. An answer that sends or posts a message, pays, publishes, merges, deletes or overwrites data, accepts terms, or changes a business record SHALL never be given by the chief alone: it SHALL go on one approval list the person clears with a single answer. When unsure, the chief SHALL tell the person. Each thing the chief does alone SHALL show as one line in the daily chat.

#### Scenario: An agent names its next step

- **WHEN** a watched agent ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the chief replies *keep going* and shows `Kept going: <title>` in the daily chat, without asking the person

#### Scenario: A safe recommended choice

- **WHEN** a watched agent asks "Build it now (Recommended) / Review the plan / Stop"
- **THEN** the chief picks *Build it now* and shows the pick in the daily chat

#### Scenario: A risky recommended choice

- **WHEN** a watched agent asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the chief sends nothing, puts it on the approval list, and relays the person's answer

#### Scenario: No clear answer

- **WHEN** a watched agent asks which of two suppliers to order from, with no recommendation and nothing in its brief
- **THEN** the chief tells the person at once, with the agent's options, and a phone notification where the app sends one

### Requirement: The chief stops a loop

The chief SHALL take at most five actions in a row on one agent without the person's word; the next stop on that agent SHALL go to the person.

#### Scenario: The same stop again and again

- **WHEN** the chief has replied to one agent five times in a row and it stops again
- **THEN** the chief tells the person instead of replying

### Requirement: Agents start with their choices made

Every agent the chief starts SHALL begin from a brief that names the goal, what done looks like, the choices already made, what it may do without asking, and what it must ask first. Before starting it, the chief SHALL ask the person, in one round, any choice the task cannot start without.

#### Scenario: A task with an open choice

- **WHEN** the person asks for a task whose result depends on a choice only they can make
- **THEN** the chief asks that choice before it starts the agent, and the brief records the answer

### Requirement: Done is reported with proof

The chief SHALL tell the person a watched agent's task is done only with proof it checked: a link that opens, checks that passed, or the file, draft or record that was made. Without proof, it SHALL ask the agent for it once, then tell the person the task is unconfirmed.

#### Scenario: Done without proof

- **WHEN** a watched agent says "All done" and names no link, check or result
- **THEN** the chief asks it for the proof once, and reports `Done` only after checking what it gives

### Requirement: Reminders are kept and checked at each start

A person SHALL be able to save a dated reminder by asking, in the daily chat or after `/daily`. The reminder SHALL be visible only to that person and SHALL need no saved edit. Every `/daily` SHALL begin, before the steps, by listing the person's reminders due that day or overdue and their own open work in memory. A reminder SHALL stay listed each day until the person marks it done. When memory cannot be read, `/daily` SHALL say so and go on.

#### Scenario: A reminder for Friday

- **WHEN** Jo says on Tuesday "remind me Friday to call Kim back about the kits"
- **THEN** Friday's `/daily` lists it before the day's steps, and a teammate's `/daily` never shows it

#### Scenario: A missed day

- **WHEN** Jo does not run `/daily` on Friday and runs it on Monday
- **THEN** Monday's list shows the Friday reminder as overdue until Jo says it's done

#### Scenario: Memory unavailable

- **WHEN** the memory store cannot be read at the start of `/daily`
- **THEN** it says `Not read: reminders` and runs the day's steps

<!-- end specs/daily-routine/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-15

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 74704 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-21-daily-routine</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-10-21-daily-routine">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-21-daily-routine</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A business owner wants each person on the team to start the day the same reliable way, without re-explaining it every morning. Today WongStack has no shared start-of-day: each person types the same requests by hand, and Matt's daily in WongOS works for him alone.</p>
<p data-note="why-2" tabindex="0">Once the day starts, the person becomes the bottleneck. Each agent they start stops between turns and waits for them, even though most stops need only <i>keep going</i>, and most choices have an obvious best answer. WongOS's daily already says <i>Needs you</i> each time an agent stops, so every stop still lands on the person. A chief of staff should judge each stop first and bring the person only what needs them.</p>
<p data-note="why-3" tabindex="0">Each person also carries things that come back on their own: a weekly report, the books on the first of the month, a call to return on Friday. Today they keep those in their head. The chief of staff should hold them: repeating jobs it runs on their days, and reminders it checks each time it starts. Everyone on the team runs their own <code>/daily</code>, with their own steps, reminders and agents, so each person's day is fitted to them.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One command starts the day.</b> A person types <code>/daily</code>. It checks who they are from their company sign-in, runs the team's steps, then their own, and replies with a short list of what it did and what is left for today.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">/daily ─▶ who? ─▶ team steps ─▶ my steps ─▶ list</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">           │ signed out</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">           ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">      sign-in link ─▶ wait ─▶ go on</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Signed out, it asks you to sign in first.</b> It sends the company sign-in link and waits. Once you are in, it carries on by itself; nothing runs under a guessed name.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The team's steps and each person's steps live inside the daily skill.</b> The owner keeps the team part: the steps everyone runs. Each person has their own part, found by their sign-in email. A step is one plain line, such as <code>Mondays: plan the week with /team-plan</code>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">daily skill</span>
<span class="ln" data-note="item-3-line-2" tabindex="0"> ├─ team steps     everyone, every day</span>
<span class="ln" data-note="item-3-line-3" tabindex="0"> └─ people</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">     ├─ Sam        Sam's own steps</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">     └─ Jo         Jo's own steps</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Repeating jobs run on their own days.</b> A step's days are plain words: <i>every day</i>, <i>Mondays</i>, <i>weekdays</i>, <i>the first of the month</i>. <code>/daily</code> runs each one only on its day, like a schedule you set by talking.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>You teach it as you go.</b> Say &quot;add checking yesterday's orders to my daily&quot;, and tomorrow it does that step for you. It shows the new list and saves it like any other edit. A new person with no steps yet gets the team part, then an offer to start their own.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>It keeps your reminders and checks them every time it starts.</b> Say <i>remind me Friday to call Kim back about the kits</i>, in the daily chat or after <code>/daily</code>. It saves the reminder as your own private note, which teammates never see, with no edit to save. Each <code>/daily</code> starts by listing what's due today or overdue, along with work you left open, before the day's steps. Say <i>done</i> and it drops off.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">/daily ─▶ who? ─▶ reminders ─▶ steps ─▶ list</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">                  due today</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">                  + overdue</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">                  + left open</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>A long step gets its own workspace where your app allows it.</b> A step like working through email opens its own workspace, so its questions don't take over the morning chat. Each one starts once a day: a second <code>/daily</code> opens nothing twice. Where the app can't open workspaces, the step runs right in the chat.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>The daily chat stays on all day as your chief of staff.</b> After the morning steps, it keeps watching every agent it started, for up to 10 hours. Talk to it any time: <i>get someone to research packaging suppliers</i> starts a new agent, <i>watch flashy-crab</i> adds a chat you started yourself, <i>what's going on?</i> lists each agent and where it stands. It never steps into a chat you didn't start through it or hand to it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-8-line-1" tabindex="0">you ──▶ chief of staff ──┬─▶ agent: email</span>
<span class="ln" data-note="item-8-line-2" tabindex="0">         (daily chat)    ├─▶ agent: research</span>
<span class="ln" data-note="item-8-line-3" tabindex="0">                         └─▶ agent: flashy-crab</span></pre></div></details></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Each time an agent stops, the chief sorts it into one of three buckets.</b> Most stops never reach you. 1. <b>Keep going.</b> The agent finished a step and named its next one, or asked <i>shall I continue?</i> The chief replies <i>keep going</i> itself. 2. <b>Obvious pick.</b> The agent asked a choice with a clear best answer. When that answer stays inside the work, such as <i>build it now</i> or <i>fix the failing test</i>, the chief picks it. When it sends, pays, publishes, deletes or signs up for something, the chief adds it to one approval list you clear in a single tap. 3. <b>Needs you.</b> No clear answer, an agent stuck on the same thing twice, a login only you can do, or anything the chief isn't sure of. It tells you at once, in the chat and as a phone notification where your app sends them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-9-line-1" tabindex="0">agent stops ─▶ chief reads it</span>
<span class="ln" data-note="item-9-line-2" tabindex="0">                 │</span>
<span class="ln" data-note="item-9-line-3" tabindex="0">   ┌─────────────┼──────────────┐</span>
<span class="ln" data-note="item-9-line-4" tabindex="0">   ▼             ▼              ▼</span>
<span class="ln" data-note="item-9-line-5" tabindex="0">keep going   obvious pick   needs you</span>
<span class="ln" data-note="item-9-line-6" tabindex="0">it replies   safe: answers  pings you</span>
<span class="ln" data-note="item-9-line-7" tabindex="0">             risky: list    right away</span></pre></div></details></li>
</ol>
<p class="aside">Each thing the chief does on its own shows as one line in the chat, such as <code>Kept going: email</code> or <code>Picked &quot;Build it now&quot;: research</code>, so you can step in.</p>
<ol class="items">
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Agents start with their choices already made.</b> Before the chief starts an agent, it writes a short brief: the goal, what <i>done</i> looks like, the choices already settled, and what the agent may do without asking. A choice only you can make, it asks you then, not halfway through the work.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>Done means checked.</b> An agent's <i>done</i> reaches you only with proof the chief looked at: a link that opens, checks that passed, or the file or message it made. Without proof, the chief asks the agent for it once, then tells you.</div></div></li>
<li class="item card" id="item-12"><span class="num">12</span><div class="body"><div class="text" data-note="item-12" tabindex="0"><b>Where the app can't watch other chats, <code>/daily</code> still works.</b> It runs each step in the morning chat and reports, with no watching.</div></div></li>
</ol>
<p class="aside">Non-goals: no timer (a person can ask for a morning run later through the usual schedule offer); no task board or day page like WongOS's (a team can add one as their own step); the chief never approves sending, paying, publishing or deleting on its own; moving Matt's WongOS and ClaymooApp dailies onto this comes later, in each of those.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-15</p>Asked where each person's own steps are kept → chose inside the daily skill, in subfolders.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-15</p>Asked where the first version is built → chose WongStack, for every install; WongOS moves Matt's daily onto it after its next sync.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-15</p>Asked whether a step opens its own workspace → chose only where the app supports it, else the same chat.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-15</p>Assumed: a step is one plain line, with its days in words, not a settings file like WongOS's, because people edit it by saying what they want and the assistant reads words well.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-15</p>Assumed: anyone may change their own steps and the owner reviews the team's, both through the usual save, because every repo edit already goes through it.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-15</p>Assumed: no timer at first, because WongOS chose &quot;you start it&quot; and the usual routine offer covers a morning run.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked how the chief of staff relates to the parked /daily → chose to grow /daily into it: one chat that starts the day, then stays on watching its agents.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked what the chief may answer on its own → chose obvious picks for safe steps only; anything that sends, pays, publishes or deletes goes to a one-tap approval list.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked which chats the chief looks after → chose only the ones it started or the person hands it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: it watches for up to 10 hours, because WongOS's watcher uses that limit and a workday fits in it.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: <i>needs you</i> goes to the chat plus a phone notification where the app sends them, because the person may be away from the screen and a missed escalation stalls the work.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: a deterministic watcher with no model notices stops and the chief's model only judges each one, because polling with the model burns turns all day for nothing (the knowledge center's <a href="../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai">deterministic-first principle</a>).</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: when unsure, the chief escalates, and after 5 replies in a row to one agent with no word from the person it escalates too, because a wrong <i>keep going</i> loops quietly while a wrong escalation costs one tap.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked on the review page to cover repeating jobs (daily to monthly), saved reminders checked at each start, and a tailored daily for each person → added saved reminders and the start-of-day check; repeating jobs and each person's own daily were already planned, and the Why now says so.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: a reminder is a private memory fact (type <code>user</code>, tag <code>reminder</code>, body starting <code>Reminder for YYYY-MM-DD:</code>), not a line in the person's steps file, because it saves at once with no edit to publish, teammates never see it, and memory never closes it on its own the way it closes a 30-day-old open thread.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the start-of-day check also lists the person's own open threads in memory, newest 5, because &quot;work you left open&quot; is the other stored fact a morning needs.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the chief answers a question card by denying it with the chosen text as the message, because the probe (design decision 13) found Paseo's CLI hides the question that <code>permit allow --input</code> keys its answer by, while the agent went on with a denial's message.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: WongOS and ClaymooApp move their dailies onto this later, in their own changes after a sync, because their Notion and board steps are their own.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the live run (task 6.2) passed with two throwaway agents: keep going, a safe pick, a risky send held back and answered as not approved, done checked against its file, an unhanded chat refused, the sixth unbroken reply refused, and today's reminder listed while tomorrow's was not; so the change is saved as built, not parked.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: archived for publishing at Matthew's <i>Publish it</i>; the context budget forced a trim of the payload manifest's install-owns paragraph to fit the daily line, meaning unchanged.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    const row = el.tagName === 'TR', cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c)
      : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); }).join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
