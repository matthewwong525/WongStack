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
