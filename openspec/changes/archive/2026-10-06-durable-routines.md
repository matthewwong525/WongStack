<!-- openspec-archive v1 2026-10-06-durable-routines -->
<!-- file proposal.md utf8 15225 -->
# Schedules that run in your Cloudflare account, on any model key

**Status:** ready-to-ship

**Branch:** pi-durable-zai-subscriptions

**Open questions:** none

## Why

A schedule only works through the Paseo app, on a computer that stays on. A clock in your own Cloudflare account runs the same schedule with your computer off, from any chat app, and on whichever model you already pay for.

## What Changes

- **Schedules run in your Cloudflare account, not through Paseo.** `/routine` works the same in any app your assistant runs in.
- **Scheduled work takes one of two shapes, and `/routine` picks.** The test is who decides the steps. The same steps every time make a script. Work that finds its own way gets an assistant. `/routine` says which it picked before it makes anything, and you can change it.
  ```text
             │ script         │ routine
  ───────────┼────────────────┼─────────────────────
  steps      │ fixed          │ the assistant decides
  AI         │ a model call   │ an assistant
             │ at most        │
  runs in    │ a Worker,      │ a container,
             │ in your app    │ started by a clock
  example    │ nightly export │ find news, /improve
  Cloudflare │ free           │ paid, ~$5/mo
  ```
- **Fixed steps become a script.** When what you ask for is the same steps every time, `/routine` says so and builds it into your app the usual way: a plan, a preview, then *publish it?* A step can still call an AI model through Cloudflare, such as *summarise these five emails*. Nothing new is installed for a script.
- **A routine is an assistant in a short-lived cloud computer.** A clock in your Cloudflare account wakes at the routine's time and starts a container with a fresh copy of the project. The assistant there can search the web, read and change files, and run commands, so it can find news articles or run `/improve`. It saves through the normal checks, and the computer is deleted when it ends.
- **A run sets up its tools each time it starts.** That measured 23 seconds on this server, on a run that lasts minutes and that nobody is waiting for. Every run's start-up time shows beside its result. If the real trial on Cloudflare shows more than 60 seconds, runs will start from a saved copy with the tools already in place, built before this publishes.
- **Routines need Cloudflare's paid plan, about $5 a month.** A container only runs there. On a free account `/routine` says so, gives the cost, and makes nothing. Scripts stay free.
- **You pick the model, and it runs through Cloudflare.** Your first routine asks which model to use, from a short list with one recommended. It is reached through Cloudflare's own AI service with the sign-in you already have, so you paste no key and Cloudflare bills its use. Some models there, such as Claude and GPT, need credit in your Cloudflare account. `/routine` tests your pick with one small request and says so if it is refused. Ask any time to change it.
- **Or paste your own model key.** Ask for the key link and paste one key: a Z.ai subscription key, Anthropic, OpenAI, Google, OpenRouter, and others. The assistant works out whose key it is, tests it with one small request, and tells you which service and model your routines now use. Paste another to replace it.
  ```text
  paste a key ─▶ whose? ─▶ test ─▶ in use
                   │ unknown  │ refused
                   ▼          ▼
              asks which   says why,
              service      keeps the old one
  ```
- **Your first routine installs it.** Nothing is added until you ask for a routine. The first one lists what it adds to your Cloudflare account and asks first.
- **A scheduled run can't ask you anything.** It takes the safe choice, marks it as assumed, and leaves a note you see in your next chat. A run stops after 30 minutes, and a routine never runs twice at once.
- **A run gets only what it needs.** It gets this one project, the memory key, the model key, and any keys you name for it. It never gets your Cloudflare sign-in or the publishing key. The memory key is one made for runs: it can read and add the project's shared notes, but not your private facts or your chats.
- **BREAKING: `/routine` no longer makes or manages Paseo schedules.** Schedules you made before keep running in Paseo until you delete them in the Paseo app. The update tells you to make each one again with `/routine`. An install with no Cloudflare account, or on its free plan, can no longer schedule an assistant.

**Non-goals:** An assistant that runs without a container. A run that signs in to your company app as you, or uses browser logins saved on your computer. Sign-ins that need a browser login instead of a pasted key, such as a ChatGPT plan. Running a script on the clock without a publish. Alerts by email or phone. A schedules page in the app. Changing the unpublished "run anywhere" work (pull request #291), which drops its own schedule part later. Removing Paseo's other uses.

## Capabilities

### New Capabilities

- `cloud-routines`: `/routine` schedules run in the person's own Cloudflare account: script or routine and how one is picked, first-use install, the paid-plan stop, the model pick through Cloudflare, the optional pasted key and how it is recognised, what a run gets, unattended behavior, limits, results, and teardown.

### Modified Capabilities

- `paseo-routines`: retired; every requirement is removed and `cloud-routines` replaces it.
- `change-loop`: the routine offer no longer depends on Paseo.
- `dependencies`: installing the routine runner joins the check runner as an allowed use of the pack's pinned tools on the person's computer.
- `install-onboarding`: setup's Paseo sentence no longer lists schedules.

## Impact

- Skills: `.agents/skills/routine/` (`SKILL.md`; `routine.mjs` rewritten as the cloud client; new `lib/cloudflare.mjs`), `.agents/skills/wong-setup/` (`references/tools.md`, `scripts/provision.mjs` exports), `.agents/skills/memory/references/areas.json`, `.agents/skills/wong-sync/references/` (manifest, file list).
- New pack folder `scripts/routine-runner/`: one Worker with a list-and-clock Durable Object, a Workflow, and a Sandbox container.
- Dependencies, pinned in that folder only: `@cloudflare/sandbox`, `@earendil-works/pi-ai`, `wrangler`; `@earendil-works/pi-coding-agent` installed inside a run's computer.
- Config: `.env.example` (`WONG_ROUTINES_KEY`, `WONG_ROUTINE_MODEL_KEY`, `WONG_ROUTINE_GITHUB_TOKEN`), `.claude/.wong-stack.json` (`components.routines`), `scripts/retired-names.json`.
- Docs: new `wiki/stack/cloud-routines.md`; `wiki/stack/` (`README.md`, `getting-started.md`, `cloudflare-credentials.md`), `wiki/development/` (`README.md`, `required-tools.md`, `the-change-loop.md`, `repository-improvement.md`, `secrets.md`), `wiki/README.md`, `CHANGELOG.md` (major).
- Tests: `scripts/tests/` (`routine` rewritten; new runner, schedule, list, run, model-key, and payload tests).
- Cloudflare, per install that makes a routine: one more Worker, a container application, a Workflow, an AI Gateway, and Worker secrets. The token widens itself for containers, plan reading, AI Gateway, and Workers AI where it lacks them.

## Decision log

- **2026-10-05** — Asked how this plan sits beside the unpublished pull request #291, which already built cloud schedules → chose keep going here: plan schedules fresh, and #291 drops its schedule part later.
- **2026-10-05** — Asked what a scheduled run should be able to do → chose light and code jobs together, over light jobs now and code jobs next. Replaced below by two shapes.
- **2026-10-05** — Asked what a schedule needs before its first run → chose nothing: a key is optional, and schedules start on Cloudflare's own models.
- **2026-10-05** — Asked where a fixed-steps schedule should run, after the person's review note that such a job should be a plain script in a Worker → chose in the app, the usual way, over adding scripts to the clock on the spot.
- **2026-10-05** — Asked where scheduled skills that run commands should run, after the person asked whether the Durable Object could hold the project → chose a cloud computer for them, with the project held in the clock for the rest. Replaced below by two shapes.
- **2026-10-05** — Asked: review note on Change #2 → a script may call an AI model through Cloudflare for a step, and only work that decides its own steps, such as finding news articles, gets an assistant.
- **2026-10-05** — Asked: review note on Change #4, whether scheduled work should be only Workers or containers → chose two shapes: a script in a Worker, or an assistant in a container. The assistant inside the Durable Object is dropped, so every routine needs the paid plan.
- **2026-10-05** — Asked: review note on Change #7 → by default the first routine asks which model to use and reaches it through Cloudflare's AI service; a pasted key stays as the other way.
- **2026-10-05** — Asked whether a run's container should install its tools each time or start from a ready-made image → chose explore it, then update the plan.
- **2026-10-05** — Assumed: a run installs its tools at the start from a locked list, with no image of our own, because a cold install measured 23 seconds on 2026-10-05 against a run of minutes nobody waits on, and a published image costs a release step, a Docker Hub account, and every install's trust in it.
- **2026-10-05** — Assumed: 60 seconds is the start-up limit, and over it the saved start is built in this change, because the person wants a slowness that measuring finds fixed in the same change.
- **2026-10-05** — Assumed: `/routine` stops managing Paseo schedules for everyone, because the person chose cloud for everyone on 2026-10-05 for #291 and a second scheduler would go untested.
- **2026-10-05** — Assumed: the assistant in the container is Pi's command-line assistant, because it takes a key from any of about 40 services, Z.ai's subscription included, and needs no sign-in of its own.
- **2026-10-05** — Assumed: the clock is a Durable Object that only keeps the list and starts each run, because a clock set in a settings file can't follow a list that changes.
- **2026-10-05** — Assumed: an install has one model key, not one per person, because whoever holds this install's keys can already schedule.
- **2026-10-05** — Assumed: the key's service is worked out by fixed code, from its shape and then one test request sent from the person's own Cloudflare account, because the code there already speaks to every service and a refused key is caught before it is stored.
- **2026-10-05** — Assumed: a run reaches Cloudflare's AI service through a key setup makes that can only run models, because a run must never hold the Cloudflare sign-in. If the trial shows no such key can be made, a routine asks for a pasted model key first.
- **2026-10-05** — Assumed: the model list comes from the pinned Pi catalog for Cloudflare's AI service, three shown and the rest on request, because a hand-kept list goes stale.
- **2026-10-05** — Assumed: the clock, list, run, and client code and tests already written on #291's branch are copied here, because they pass with stand-ins and rebuilding them buys nothing.
- **2026-10-05** — Assumed: a run's result shows in the list and as a note in the next chat, with no email or phone alert, because that is what a Paseo-free install can already show.
- **2026-10-05** — Assumed: the real-account trial runs after all code and tests are written and before anything publishes, because the person found a trial-first build slow on #291. It needs a paid Cloudflare account.
- **2026-10-05** — Assumed: each task's own tests ran once at the end, with the local checks, not after each task, because the build writes all code and tests before it runs any. No test was dropped.
- **2026-10-05** — Assumed: the token widens by `AI Gateway Write`, `AI Gateway Run`, and `Workers AI Read` beside the two for containers and the plan, and the key a run holds has only the last two, because those are the names Cloudflare's own list gives the groups that make a gateway and run a model. The trial proves they are enough.
- **2026-10-05** — Assumed: a refused pasted key reports only the service's status, never its words, because a service can quote part of a key back; a refused Cloudflare pick reports what Cloudflare said.
- **2026-10-05** — Assumed: a run copies the project's whole history, not only its latest commit, because skills such as `/improve` read past commits; the trial's start-up time includes it.
- **2026-10-05** — Assumed: the landing site's line about Paseo no longer says "run jobs on a schedule", because it stopped being true; the site was outside the plan's file list.
- **2026-10-05** — Assumed: the first save comes before the GitHub half of the trial and the real model key, because both wait on a key from the person and the checks can run meanwhile. The Cloudflare half of the trial passed, and `trial.md` holds the record.
- **2026-10-05** — Asked how to finish the two trial checks that wait on a key → chose a new key link for the GitHub token and a model key, over publishing without them.
- **2026-10-05** — Asked which memory key a run should get, since the owner's own is the admin key that reads every fact and transcript → chose a lesser key made for runs, over the install's own key.
- **2026-10-05** — Assumed: the trial's Cloudflare pieces and the runs' memory key were deleted before the two keyed checks, because two key links closed unused and a live key and a public address should not sit waiting. Installing them again takes about a minute.
- **2026-10-05** — Assumed: a run's note is written with no chat session named, because a scheduled run has none and the memory script otherwise holds the note for a next chat that never comes; the trial lost one note that way.
- **2026-10-06** — Asked whether to test with a real pasted model key, after the person asked if Cloudflare's free model use could serve → chose no model key: the trial's runs already used Cloudflare's own models, and the pasted-key path ships tested with a refused key and stand-ins.
- **2026-10-06** — Asked whether to try saving to GitHub before publishing → chose test GitHub first, with one token for the empty test repository.
- **2026-10-06** — Assumed: setup tests a GitHub token for write access before sending it to the runner, because the person gave a read-only one and a run would only have found out at its first push.
- **2026-10-06** — Asked how to finish the GitHub check → the person gave the token on file write access on GitHub, and the run on the GitHub route then passed. That token is also the one another change stores as its read-only key; the person was told.
- **2026-10-06** — Asked whether to publish → chose publish it. Archived and numbered 36.0.0, after bringing main in at 35.2.0; the routine skill's wording was trimmed by 484 bytes so the shared budget for skill text still holds with main's own additions.

<!-- end proposal.md -->
<!-- file design.md utf8 18677 -->
# Design

## Context

See proposal.md for why. What shapes the approach:

- **`/routine` reaches Paseo in one file.** `.agents/skills/routine/scripts/routine.mjs` calls Paseo's private schedule client. `workspace.mjs`, `tidy.mjs`, `presets.mjs`, and `lib/paseo.mjs` serve workspaces and are not touched here.
- **A script on a schedule already has a home.** The app's Worker takes a `scheduled()` function, and `.agents/rules/code.md` asks each one for a manual trigger on staging. It is built through the change loop like any code.
- **Pull request #291 (branch `remove-paseo`) already wrote a cloud scheduler**, tested only with stand-ins: a pure cron module, a pure list module, a run module for a Sandbox container, a Worker, the `/routine` client, the shared Cloudflare steps, and a wiki page. It runs Claude Code or Codex on a per-person sign-in. This change copies it and replaces the assistant and its sign-in.
- **Pi's command-line assistant takes any model key.** `@earendil-works/pi-coding-agent` (`pi`) runs headless with `-p` and reads its key from the environment. It is built on `@earendil-works/pi-ai`, which ships about 40 services at 1.0.3, including `zai`, pointed at the Coding Plan endpoint.
- **An assistant inside a Durable Object was weighed and dropped.** It can hold the project's files but run no command, it rests on beta packages, and it would make a second way to run an assistant. The person chose one way.
- **Containers run only on Workers Paid.** A Durable Object and its alarm run on any plan, but with no container there is nothing for the clock to start.
- **The app can't host the clock.** `app/wrangler.jsonc` is the install's own and no update writes it, so routines get their own Worker, as the check runner did.
- **Not proven, settled by the trial in task group 5:** `pi -p` following a WongStack skill from a fresh clone; a Cloudflare token that can only run models; which gateway models an account can use without credit; pi-ai making a test request from inside a Worker; a Worker minting a write token for an Artifacts repository; the Sandbox pin.

## Goals / Non-Goals

**Goals:**

- One way to run an assistant on a schedule, for every install on Cloudflare's paid plan, in any chat app.
- Fixed code for the clock, the list, the model choice, what a run gets, and the limits. A run's reach is fixed by code, not by its prompt.
- Any model key works without the person naming its service.

**Non-Goals:**

- New machinery for scripts. They use the app's existing scheduled functions.
- An assistant inside a Durable Object, or a free-plan routine.
- Per-person model keys, or more than one model key per install.
- Splitting `lib/paseo.mjs` or touching workspaces, tidy-up, or presets; #291 owns those.

## Decisions

### 1. One Worker owns routines: `scripts/routine-runner/`

A pack folder, shipped like the check runner, deployed as `<base>-routines` into the person's account.

| Piece | Kind | Job |
|---|---|---|
| `Routines` | Durable Object, one instance | The list (SQLite), the clock (one alarm at the earliest due time), the model choice, and the management API. |
| `Run` | Workflow | One run: gate, computer, bootstrap, assistant, result. |
| `RoutineSandbox` | Sandbox container | The short-lived computer, `max_instances: 2`. |

Files: `worker.mjs` (wiring only), `schedule.mjs`, `routines.mjs`, `models.mjs`, `run.mjs`, `wrangler.template.jsonc`, `package.json`, `package-lock.json`. Every module but `worker.mjs` imports nothing from Cloudflare, so `node --test` covers it with stand-ins.

*Alternatives:* a cron trigger polling each minute (a fixed trigger can't follow a list that changes); the clock in the app (see Context); the Agents SDK's own `schedule()` (no timezone, and the copied cron module is already tested across daylight-saving changes).

### 2. Copy from #291; never merge it

Read each file from #291's branch, `origin/remove-paseo`, without checking it out or merging it. Copy as written: `scripts/routine-runner/schedule.mjs`, `routines.mjs`, their tests and fixture. Copy and adapt: `run.mjs`, `worker.mjs`, `wrangler.template.jsonc`, `package.json`, `.agents/skills/routine/scripts/routine.mjs`, `lib/cloudflare.mjs` with the matching `provision.mjs` exports, `wiki/stack/cloud-routines.md`, and their tests. Leave behind: per-person sign-ins (`SIGNIN_*`, `signin`), the Claude Code and Codex pins, `lib/cli.mjs`, `lib/host.mjs`, and everything about workspaces. `routine.mjs` keeps importing `EXIT` and `parseCommand` from `lib/paseo.mjs`.

### 3. A script is not a routine

`/routine` builds nothing for fixed steps. `SKILL.md` tells the agent to say the work is a script and start `/plan` for a scheduled function in the app, by the code rule's manual-trigger convention. `the-change-loop.md` already sends fixed steps away from an assistant; this makes `/routine` itself do it. The person can still say to use an assistant, which makes a routine.

The test is who decides the steps, not whether AI is used. A script whose step needs a model calls one through a Workers AI binding in the app, added by that script's own change; this change adds none. Work that searches, reads, and chooses as it goes, such as finding news articles, is a routine.

### 4. A run is Pi's command-line assistant in a Sandbox container

`run.mjs` as #291 wrote it, with these changes:

- **Pins:** `@earendil-works/pi-coding-agent`, `@fission-ai/openspec`, and `gh` on a GitHub install.
- **Command:** `pi -p` with the provider and model from Decision 5, on the default branch of a fresh clone. The prompt is #291's fixed notice, then the routine's prompt word for word.
- **Verbs:** a prompt that starts with `/<name>` becomes *"Read `.agents/skills/<name>/SKILL.md` and follow it"* plus the rest, when that file exists in the clone. Fixed code, so it does not depend on how any assistant finds skills.
- **What it holds:** project access (Artifacts: a write token the Worker mints for the run; GitHub: secret `GITHUB_TOKEN` from `WONG_ROUTINE_GITHUB_TOKEN`), `CLOUDFLARE_MEMORY_TOKEN`, the routine's named keys, and the model key under the name pi-ai reads for its provider. Git author is the routine's maker.
- **Gate:** a GitHub install with no `GITHUB_TOKEN` ends as `needs-project-access` and starts no computer. There is no sign-in gate.
- **Tools:** the runner writes its own `tools/package.json` and `tools/package-lock.json` into the computer and runs `npm ci` there, so every run gets the same files, integrity-checked. The image stays Cloudflare's public Sandbox image, which the check runner already proves needs no Docker on the person's computer.
- **Start-up time:** each result records `startupMs`, from the computer starting to the assistant's first line, beside the run's own time.

Measured on this server on 2026-10-05, cold caches, 4 cores:

| Piece | Seconds | Removed by a ready image |
|---|---|---|
| Container cold start (Cloudflare's own figure) | 1 to 3 | no |
| Tools: Pi and OpenSpec, 176 MB | 23.4 | yes |
| `gh` | 0.7 | yes |
| Shallow clone of this project, 40 MB | 2.0 | no |
| The app's packages, when a skill runs its tests, 543 MB | 6.6 | no |

**The limit is 60 seconds of start-up in the trial.** Over it, this change adds a saved start before it publishes: setup installs the tools once and saves a Container snapshot, each run starts from it, and a run whose snapshot is gone installs as above and saves a new one. Snapshots are in public beta, need the 1.x Sandbox SDK, and expire 30 days after their last use, which is why they are the fallback and not the start.

*Alternatives:* one image WongStack publishes for every install (saves the same 24 seconds, but adds a publish step to each release, a Docker Hub account, a public image every install must trust, and an image tag that must match the SDK version); an image each install builds (needs Docker on the person's computer); a directory backup in R2 (a bucket and storage keys per install, and a three-day default life).

Limits as #291: 30 minutes, one run per routine, two computers at once, last 10 results, 50 routines, the last 200 output lines with every held value replaced by its name.

### 5. The model: picked, through Cloudflare by default; or any pasted key

**Through Cloudflare.** Setup makes one AI Gateway, `<base>-routines`, and mints `AI_RUN_TOKEN`, an account token with only the permission groups that run AI Gateway and Workers AI. A run uses pi-ai's `cloudflare-ai-gateway` provider with `CLOUDFLARE_API_KEY` set to that token, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_GATEWAY_ID`. Its catalog at 1.0.3 holds 54 models: Workers AI models such as GLM-5.3 and Kimi K2.7 Code, billed as Workers AI use, and Claude and GPT models, which the gateway serves on credit loaded in Cloudflare.

`routine.mjs model [<id>]`: with no id it prints `models.mjs`'s shortlist of three, the recommended one first, and the runner's `GET /models`, the pinned catalog. With an id it sends `POST /model/test`, one tiny request through the gateway, then `POST /model`; a refusal stores nothing and prints the status. `create` with no model stored exits 3 with `needs: 'model'` and the shortlist; `/routine` asks in the ask format, runs `model`, and retries.

**A pasted key.** `models.mjs` also holds key shapes and a default model per listed service, with no network code.

| Shape | Candidates, in order |
|---|---|
| `sk-ant-oat…`, `sk-ant-…` | `anthropic` |
| `sk-or-…` | `openrouter` |
| `sk-proj-…`, `sk-svcacct-…` | `openai` |
| `AIza…` | `google` |
| `gsk_…` | `groq` |
| `xai-…` | `xai` |
| 32 hex, a dot, then letters and digits | `zai` |
| bare `sk-…` | `openai`, `deepseek`, `moonshotai` |

`routine.mjs key [--provider <id>] [--model <id>]`:

1. Reads `WONG_ROUTINE_MODEL_KEY` from the primary `.env`; blank → exit 3, `needs: 'model-key'`, and `/routine` sends the key link.
2. Picks candidates from the shape. None and no `--provider` → exit 3, `needs: 'provider'`, with the listed services. `--provider` takes any pi-ai provider id that uses an API key; one outside the table also needs `--model`.
3. Sends the key and candidates to `POST /model/test`. The Worker makes one tiny request per candidate through pi-ai, in memory, and answers with the first that works, or each refusal's status.
4. On success: `PUT`s Worker secret `MODEL_KEY` through the Cloudflare API, then `POST /model` with `{ provider, model }`. Prints the service and model. On refusal nothing is stored.

`key --remove` deletes the secret and returns to the last Cloudflare pick.

*Alternatives:* a silent default model (the person asked to choose); Workers AI alone, with no gateway (no Claude or GPT without a pasted key); testing a key on the person's computer (a hand-kept test call per service, where pi-ai already speaks to all of them).

### 6. First use installs it

`create` calls `setup` when `components.routines` is absent; `/routine` shows `setup --dry-run`'s list and confirms first. Setup, stopping at the first failure with nothing half-recorded:

1. No Cloudflare account recorded → exit 3, `needs: 'cloudflare'`.
2. Widen the user token by the groups it lacks: `Billing Read`, `Workers Containers Write`, and the ones that make an AI Gateway and run it and Workers AI.
3. `paidPlan` → not paid: exit 3, `needs: 'paid-plan'`, the cost and the upgrade link. Nothing is created.
4. Fill `wrangler.template.jsonc` (a GitHub install drops the `artifacts` line), `npm ci --ignore-scripts`, `npx --no-install wrangler deploy`.
5. Make the AI Gateway; mint and `PUT` `ROUTINES_KEY` and `AI_RUN_TOKEN`; issue the runs' own memory key and `PUT` it as `MEMORY_TOKEN` (below); write `WONG_ROUTINES_KEY` to `.env` and `components.routines` to `.claude/.wong-stack.json`.
6. On a GitHub install, `needs: 'project-access'` until `WONG_ROUTINE_GITHUB_TOKEN`, a fine-grained token for this one repository (contents and pull requests, read and write), is given through the key link and `PUT` as secret `GITHUB_TOKEN`.

**The runs' memory key.** The install's own `CLOUDFLARE_MEMORY_TOKEN` never leaves the computer: on the owner's it is the admin key. Setup makes a new machine id for the runner, issues it a `member` key with `memory.mjs member add <id> --role member --label 'routine runs' --key-file <private temp file>`, `PUT`s the key, deletes the file, and records the id as `components.routines.memoryMachine`. A member reads and writes `project`, `thread`, and `reference` facts only, so a run's note reaches the next chat and no private fact or transcript reaches a run. A repeat setup reuses the id while the runner still holds the secret. An install with no memory store, or whose token can't issue keys, skips this with a to-do, and its runs leave their notes in the result. Teardown runs `member remove <id>`.

Setup is safe to repeat; it also updates the runner after a WongStack update. The management API and its key are #291's: bearer `WONG_ROUTINES_KEY`, constant-time compare, 404 for everything else, no route returns a secret. It gains `/models`, `/model`, and `/model/test`.

### 7. `/routine` and its skill

`routine.mjs` verbs: `setup`, `model`, `key`, `create`, `ls`, `pause|resume|run|logs|delete`, `change`. Exit codes keep their positions: 0 ok, 2 bad input, 3 not ready (`needs`), 4 the runner does not answer, 5 its answers have changed.

`SKILL.md` drops every Paseo line and stays inside the context baseline by replacing text. It adds:

- **Script or routine.** Fixed steps, with or without a model call → Decision 3. Otherwise a routine.
- **Model.** On `needs: 'model'`, ask which model in the ask format: the shortlist, the recommended one first, with the person's own words for any other, and say Cloudflare bills its use.
- **Confirm.** The name, cron and its plain meaning, timezone, prompt, and model, and that the run has full permissions inside its cloud computer.
- **First use.** What is added, then confirm.
- **Key.** *"Use my key"* or a `needs: 'model-key'` answer sends the key link, then runs `key`.

### 8. Pages

`wiki/stack/cloud-routines.md` owns script or routine, how a routine runs, picking a model, the pasted key, the cost, what a run gets, the limits, and teardown. Every other page links it: `wiki/stack/README.md`, `getting-started.md` (costs, teardown), `cloudflare-credentials.md` (the widen's groups), `wiki/README.md`'s routine line, `wiki/development/README.md`, `required-tools.md`, `the-change-loop.md` (drop the Paseo clause), `repository-improvement.md`, `secrets.md` (the two key guides), and `wong-setup/references/tools.md`'s Paseo sentence. Keep every linked heading's exact text.

Retired names: `paseo-routines` → the `cloud-routines` spec; `ROUTINE_PASEO_BIN` → none.

### 9. Release

`major`. The **Updating.** note, in plain words: schedules now run in your Cloudflare account and need its paid plan, about $5 a month; work that is the same steps every time becomes a script in your app and stays free; any schedule you made before keeps running in Paseo until you delete it there; to move one, ask for it again with `/routine` and delete the old one in the Paseo app; nothing else needs doing.

## Risks / Trade-offs

- **[`pi -p` may not follow a WongStack skill well, most of all on a weak model]** → The trial runs a real verb on a pasted key and on a Cloudflare pick; the confirm names the model; a run can publish only by saving through the project's checks.
- **[No model-only token can be minted]** → A routine then needs a pasted model key first (`needs: 'model-key'`), and the Cloudflare pick leaves the proposal, spec, and page before publishing.
- **[Claude and GPT through the gateway may need credit the account lacks, or may not be offered to it]** → The test request catches it and the reply says why; Workers AI models need no credit, and the shortlist's recommended pick is one of them.
- **[pi-ai may not run inside a Worker]** → The key test moves into a throwaway run in the computer, the second alternative in Decision 5.
- **[Start-up may be slower on Cloudflare than measured here]** → Every run records it; the trial holds it to 60 seconds, and the saved start is built in this change if it is over.
- **[A key's shape is shared by several services]** → Shape only orders the candidates; the test request decides, and `--provider` overrides.
- **[A subscription key may not be allowed from a server]** → The page says the service's own terms apply and names Z.ai's; the key is still the person's choice to paste.
- **[A model key sits in the run's computer]** → It holds no Cloudflare or publishing key, nothing outside can reach it, and its log hides every held value.
- **[A run that goes wrong, or a model tricked by a web page, holds a memory key]** → It is a member key made for runs: shared notes only, revoked by teardown or `member remove`.
- **[A full-permission assistant runs unattended]** → Its reach is fixed by code: one repository, the memory key, named keys only, 30 minutes. A test asserts the env list.
- **[A public address guards the routines]** → 256-bit key, constant-time compare, 404 for everything else. The Worker is absent until the first routine.
- **[A failed run is quiet]** → The list shows the last result, and a run that started leaves a memory thread.
- **[Every routine now costs the paid plan]** → Said in the proposal, the confirm, getting-started's costs, and the changelog; scripts stay free.
- **[#291 still holds its own scheduler]** → Whichever publishes second drops the overlap. This change's first `/save` records a memory thread saying #291 must cut its schedule groups, its `cloud-routines` spec, and its `routine.mjs` before it publishes.

## Migration Plan

Installs take the update through `/wong-sync`: scripts and pages replace in place, `scripts/routine-runner/` arrives with the pack, and nothing in Cloudflare changes until a person asks for a routine. Paseo schedules are untouched. Rollback is the previous release; a runner already installed is removed by the teardown steps in `cloud-routines.md`.

## Open Questions

- Which three models the shortlist shows and which is recommended. Start with Kimi K2.7 Code, GLM-5.3, and a Claude model; the trial's runs decide, and no spec names a model.
- Which default model each pasted key's service gets. Start from pi-ai's catalog at the pinned version; `--model` overrides.
- Whether a Z.ai pay-as-you-go key, which shares the Coding Plan key's shape but not its address, is worth a second candidate. Add it if the trial key needs it.
- Which container size keeps a typical `/improve` inside 30 minutes at the lowest cost. Start with the check runner's.

<!-- end design.md -->
<!-- file tasks.md utf8 9926 -->
# Tasks

Copy from pull request #291's branch, `origin/remove-paseo`, by design Decision 2: read its files, never check it out or merge it.

## 1. The keys a routine needs

- [x] 1.1 Declare `WONG_ROUTINES_KEY`, `WONG_ROUTINE_MODEL_KEY`, and `WONG_ROUTINE_GITHUB_TOKEN` blank in `.env.example`, each with a comment whose first sentence says what it is and where to get it, and add the human steps for the model key and the GitHub token to `wiki/development/secrets.md`. Done when `node scripts/check-payload-links.mjs` passes and the key link accepts the names.

## 2. The routine runner (pack)

- [x] 2.1 Copy `scripts/routine-runner/schedule.mjs` and `routines.mjs` with `scripts/tests/routine-schedule.test.mjs`, `routine-list.test.mjs`, and `fixtures/routine-runner.mjs`. In `routines.mjs` drop the per-person sign-in and add the stored model choice and the `/models`, `/model`, and `/model/test` routes. Extend the list tests for each. Done when both test files pass.
- [x] 2.2 Write `scripts/routine-runner/models.mjs` by design Decision 5 and `scripts/tests/routine-models.test.mjs`: the shortlist of three with the recommended one first, each key shape's candidates in order, an unknown shape, `--provider` and `--model` overrides, a provider outside the table without a model, the default model per listed service, and the name pi-ai reads for each. Done when the tests pass.
- [x] 2.3 Copy `scripts/routine-runner/run.mjs` and `scripts/tests/routine-run.test.mjs`, then change them by design Decision 4: the Pi pins, the `pi -p` command with the chosen provider and model, the `/<name>` expansion only when the skill file exists, the gateway's three names with the model-only token for a Cloudflare pick, the model key under its provider's name for a pasted key, the tools installed with `npm ci` from the runner's own `tools/package.json` and `tools/package-lock.json`, `startupMs` in each result, and no sign-in gate. Keep the tests that a run's env holds no Cloudflare user or deploy token, that a log hides every held value, and that a run past 30 minutes ends as timed out. Done when the tests pass.
- [x] 2.4 Copy and adapt `worker.mjs` (`Routines`, `Run`, `RoutineSandbox`, the key test through pi-ai), `wrangler.template.jsonc`, `package.json`, and `package-lock.json` at exact pins. Copy and extend `scripts/tests/routine-runner.test.mjs` with stand-ins: a request without the key gets the same 404 as an unknown path; the alarm starts due runs and sets the next alarm; a GitHub install without project access starts no computer; a key test stores nothing; the template's pins and bindings. Done when the tests pass.
- [x] 2.5 List the folder's files, `tools/` included, in `.agents/skills/wong-sync/references/payload-files.json`, name it in `payload-manifest.md` where that page says the `/routine` Paseo scheduler, and add `scripts/tests/routine-runner-payload.test.mjs` on the model of the check runner's. Done when it and `node scripts/check-payload-links.mjs` pass.

## 3. `/routine`: the client and first use

- [x] 3.1 Add `.agents/skills/routine/scripts/lib/cloudflare.mjs` with the steps both runners share (plan read, a widen that takes extra groups, config fill, pinned install and deploy, secret put, a scoped token mint), and have `.agents/skills/wong-setup/scripts/provision.mjs` import and re-export them with no change to an Artifacts install. Done when `provision.test.mjs` passes unchanged and a new case covers a widen by the routine groups alone.
- [x] 3.2 Rewrite `.agents/skills/routine/scripts/routine.mjs` as the cloud client by design Decisions 5 to 7, with no import of Paseo's schedule client. Rewrite `scripts/tests/routine.test.mjs` with the fake Cloudflare and a fake runner: `setup --dry-run`; no Cloudflare account; the free-plan stop makes nothing; a failure midway leaves nothing half-recorded; a GitHub install without the project key answers `needs: 'project-access'`; `create` with no model stored answers `needs: 'model'` with the shortlist; `model` with no id, a refused pick that stores nothing, and an accepted pick; `key` with a blank key, an unknown shape, a refused key that stores nothing, and an accepted key that prints the service and model and never the value; `key --remove`; list, pause, resume, run, logs, delete, change; exit 4 when the runner is silent and 5 when its answer has changed. Done when the tests pass.
- [x] 3.3 Record `components.routines` (Worker and address) in `.claude/.wong-stack.json`. Done when the secrets tests pass with the new names and a new worktree's seeded `.env` carries them.
- [x] 3.4 Rewrite `.agents/skills/routine/SKILL.md` by design Decisions 3 and 7: fixed steps, with or without a model call, go to a script in the app, work that decides its own steps gets a routine, and the first routine asks which model. Point the `routine` area in `.agents/skills/memory/references/areas.json` at `openspec/specs/cloud-routines/spec.md` and `scripts/routine-runner/`, keeping the retired spec listed until the archive deletes it. Add `paseo-routines` and `ROUTINE_PASEO_BIN` to `scripts/retired-names.json`, with an `allow` and a `why` for the retired spec and any frozen fixture the checker names. Done when `node scripts/measure-context.mjs --check` and `node scripts/check-retired-names.mjs` pass.
- [x] 3.5 Give runs their own memory key by design Decision 6: in `routine.mjs setup`, issue a `member` key for a new machine id with the memory script, `PUT` it as `MEMORY_TOKEN`, delete the private file, and record `components.routines.memoryMachine`; never send `CLOUDFLARE_MEMORY_TOKEN`. Extend `scripts/tests/routine.test.mjs`: the install's own memory key reaches no Cloudflare call; a repeat setup reuses the id while the secret is held and issues again when it is not; no memory store, or a refused issue, leaves a to-do and installs the rest; the private file is gone afterwards. Update `wiki/stack/cloud-routines.md` (what a run gets, teardown's `member remove`) and the `## Next` entry in `CHANGELOG.md`. Done when the tests and `node scripts/check-payload-links.mjs` pass.

## 4. Pages and release

- [x] 4.1 Write `wiki/stack/cloud-routines.md` from #291's page by design Decision 8 (script or routine, how a routine runs, picking a model through Cloudflare, the pasted key and the services it recognises, the cost, what a run gets, the limits, teardown), and link it from `wiki/stack/README.md`. Update `wiki/stack/getting-started.md` (costs, teardown) and `wiki/stack/cloudflare-credentials.md` (the widen's groups for routines). Done when the wiki checks pass.
- [x] 4.2 Update `wiki/README.md`'s routine line, `wiki/development/README.md`, `required-tools.md`, `the-change-loop.md`, `repository-improvement.md`, and the Paseo sentence in `.agents/skills/wong-setup/references/tools.md`, so none says a schedule needs Paseo. Keep every linked heading's exact text. Done when the wiki checks, `check-payload-links.mjs`, and `measure-context.mjs --check` pass.
- [x] 4.3 Add the `## Next (major)` entry to `CHANGELOG.md` with the **Updating.** note from design Decision 9. Done when `node scripts/payload-checks.mjs` accepts the entry.

## 5. Verification

The trial runs after all code and tests are written and before anything publishes. Record each result in `trial.md` in this folder. A design risk that comes true is fixed by its own mitigation, in the code, spec, proposal, and page, before 5.6.

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it finds. Done when it passes, or its only failures are the two a first `/save` clears by reconciling the new spec; it is a pre-check, not the gate.
- [x] 5.2 On a paid Cloudflare account, deploy the runner under a throwaway name. Pick a Workers AI model through `model`, then run one routine whose prompt is a `/<name>` verb with a script: it clones a throwaway project, runs `pi -p` through the gateway on the model-only token, and pushes a branch, once to an Artifacts repository with a minted token and once to a GitHub repository with a fine-grained token. Then pick a Claude or GPT model and record whether the account could use it and what the refusal said. Record the start-up seconds by piece (container, tools, clone, the app's packages), the run's time, whether the skill was followed, how each token was made, and that no token reached a URL or a log. Done when the record exists; no paid account is reported as a blocker with what it needs.
- [x] 5.3 Compare 5.2's start-up with the 60-second limit. Under it: record that. Over it: add the saved start by design Decision 4 with its tests, run 5.2's routine again, and record the new time. Done when the record shows a start-up under the limit, or a blocker saying why not.
- [x] 5.4 In the same trial, send a deliberately wrong key in a known shape and a key of no known shape through `key`. Record the service recognised, that the value appears in no output, and that nothing is stored. Done when the record exists. A real, working key was dropped on 2026-10-06 by the person's choice; the Decision log says why.
- [x] 5.5 Delete every throwaway Worker, container application, Workflow, AI Gateway, repository, and token. Done when Cloudflare's API, not the dashboard, lists none of them.
- [x] 5.6 `/save` after all implementation. Done when CI passes on the pull request.
- [x] 5.7 After `/save`, from this branch on a real paid account: ask for a fixed-steps schedule and confirm `/routine` offers a script in the app and makes no routine; ask for a routine, pick a model when asked, and let first use install the runner; run it once and read its result in the list; confirm the run's saved branch and its memory thread at the next session start; then delete the routine and tear the runner down by `cloud-routines.md`. Record the outcome in `acceptance.md` in this folder. Done when the record exists; a step that can't run is reported as a blocker with what it needs.

<!-- end tasks.md -->
<!-- file specs/change-loop/spec.md utf8 827 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A task that will come back gets one offer

When a task done by hand will clearly come back (the person says it recurs, or memory shows they asked before), the next-step question SHALL include one option for a routine or a mini app, named by its outcome. The agent SHALL NOT offer on a guess, after a code change it built, in an unattended run, or after a decline for that task.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a support email summary and says they need it every Monday
- **THEN** the next-step question includes doing it every Monday, beside stopping

#### Scenario: The person declines

- **WHEN** the person turns down the offer
- **THEN** the decline is recorded in memory and a later request for the same task gets no offer

<!-- end specs/change-loop/spec.md -->
<!-- file specs/cloud-routines/spec.md utf8 9087 -->
# Spec Delta

## Purpose

Let a person put any prompt or verb on a recurring schedule that runs in their own Cloudflare account, with their computer off, on any model key or none, and with no chat app needed.

## ADDED Requirements

### Requirement: Create a routine from a plain request

`/routine` SHALL turn a cadence in the person's words into a five-field cron schedule for any prompt, show the name, cron, timezone, prompt, and model before creating it, and report the next run time. It SHALL work the same in any app that runs the assistant.

#### Scenario: A weekday routine

- **WHEN** a person on Cloudflare's paid plan runs `/routine every weekday at 9am: /improve` on a computer without Paseo
- **THEN** one routine exists with cron `0 9 * * 1-5` and prompt `/improve`, and the reply gives its next run

### Requirement: Fixed steps become a script, not a routine

When the work asked for is the same steps on every run, `/routine` SHALL say so and build it as a script in the person's app through the usual plan, preview, and publish, with no assistant on a clock. A script's step MAY call an AI model; that alone SHALL NOT make the work a routine. Work that decides its own steps SHALL get a routine. The person SHALL be able to ask for a routine anyway.

#### Scenario: A nightly export

- **WHEN** the person runs `/routine every night at 2am: copy yesterday's orders into the archive table`
- **THEN** no routine is created, the reply says this is fixed steps and will be a script in the app, and a plan for that script follows

#### Scenario: Finding news articles

- **WHEN** the person runs `/routine every morning at 8: find new articles about our competitors and note the three that matter`
- **THEN** a routine is offered, not a script

### Requirement: The first routine installs the cloud pieces

Setup SHALL install nothing for routines. The first `/routine` that creates one SHALL say what it adds to the person's Cloudflare account, ask, then add it there and nowhere else. On an account without Cloudflare's paid plan it SHALL add nothing, create no routine, and say the plan is needed and what it costs.

#### Scenario: The first routine on a paid account

- **WHEN** a person on Cloudflare's paid plan creates their first routine
- **THEN** the routine pieces are added to their own account, the reply names them, and the routine is created

#### Scenario: A free account

- **WHEN** a person on Cloudflare's free plan runs `/routine every Monday at 9am: /improve`
- **THEN** nothing is added to the account, no routine exists, and the reply says routines need the paid plan and its cost

### Requirement: A run happens in a short-lived cloud computer

Each run SHALL start a new assistant in a short-lived computer in the person's Cloudflare account, on a fresh copy of the project's latest default branch, with full permissions inside it and the prompt exactly as written after a fixed notice that nobody can answer. A run SHALL NOT need the person's computer to be on and SHALL NOT touch any checkout on it. Nothing from a run SHALL remain afterwards except what it saved to the project, its memory, and its result.

#### Scenario: The computer is off

- **WHEN** a routine fires while the person's computer is switched off
- **THEN** the run starts, works on a fresh copy of the project, and its result is there when the person next lists routines

### Requirement: The person picks the model, through Cloudflare by default

The first routine SHALL ask which model to use, offering a short list with one recommended, and SHALL reach that model through Cloudflare's AI service in the person's own account, with no model key. A pick SHALL be tested with one request before it is used; a refused pick SHALL NOT replace a working one, and the reply SHALL say why. The person SHALL be able to change the model later.

#### Scenario: The first routine

- **WHEN** a person who has given no model key creates their first routine and picks a model from the list
- **THEN** the run finishes on that model through Cloudflare, and nothing asked for a key

#### Scenario: A model that needs credit

- **WHEN** the person picks a model their Cloudflare account has no credit for
- **THEN** routines keep the model they had, and the reply says the pick needs credit in Cloudflare or the person's own key

### Requirement: Any pasted model key is recognised and tested

The agent SHALL take a model key only through the private key link, never in chat. It SHALL work out which service the key belongs to, test it with one request, and only then put it in use, saying which service and model routines now use. When it cannot tell the service, it SHALL ask which. A key the service refuses SHALL NOT be stored in Cloudflare or replace a working one. No command, list, log, or reply SHALL show a key.

#### Scenario: A Z.ai subscription key

- **WHEN** the person pastes a Z.ai Coding Plan key into the key link
- **THEN** the reply says routines now use Z.ai and names the model, and the next run uses it

#### Scenario: A refused key

- **WHEN** the person pastes a key its service refuses
- **THEN** routines keep the model they had, and the reply says the key was refused

### Requirement: A run gets only what it needs

A run SHALL receive access to this one project, a memory key, the model key, and the keys its routine names, and nothing else. It SHALL NOT receive the person's Cloudflare user token or the publishing key. The memory key SHALL be one made for runs, which reads and writes the project's shared notes and never a person's private facts or chat transcripts; it SHALL NOT be the person's own memory key.

#### Scenario: A run prints its environment

- **WHEN** a run's prompt makes the assistant print every environment variable
- **THEN** the output holds no Cloudflare user token and no publishing key, and the saved log shows no secret value

#### Scenario: A run reads memory

- **WHEN** a run searches memory on an install whose owner has private facts
- **THEN** it finds the shared notes and none of the owner's private facts, and a note it leaves shows in the owner's next chat

### Requirement: A run never waits for an answer

A run SHALL take the recommended option wherever it would ask, mark it as assumed, and record anything left for the person as a memory thread. A run SHALL end within 30 minutes. A routine SHALL NOT run twice at once: a tick that arrives while its last run is still going SHALL be skipped and recorded as skipped.

#### Scenario: A run needs a decision

- **WHEN** a scheduled `/improve` reaches a choice it would normally ask about
- **THEN** it takes the recommended option, labels it assumed, and the person's next chat shows the open thread

#### Scenario: Still running at the next tick

- **WHEN** an every-15-minutes routine's run is still going when the next tick arrives
- **THEN** no second run starts, and the list shows one skipped tick

### Requirement: Manage this install's routines

`/routine` with no argument SHALL list this install's routines with cadence, status, next run, and last result with how long it took to start and to run, and SHALL pause, resume, run now, change, delete, or show the log of one by name or id. Only a caller holding this install's routines key SHALL be answered; any other caller SHALL learn nothing.

#### Scenario: An ambiguous name

- **WHEN** a name matches more than one routine
- **THEN** nothing changes and the reply lists the matching ids

#### Scenario: A caller without the key

- **WHEN** a request reaches the routine pieces without this install's routines key
- **THEN** it gets the same answer as an address that does not exist

### Requirement: When the cloud cannot be reached, nothing changes

When the routine pieces are not installed, do not answer, or answer in a shape `/routine` no longer understands, or the install has no Cloudflare account, `/routine` SHALL change nothing, say which, and say how to put it right.

#### Scenario: The cloud does not answer

- **WHEN** `/routine` runs while the routine pieces do not answer
- **THEN** nothing is created or changed, and the reply says they did not answer and to try again

### Requirement: Teardown removes the routine pieces

Teardown SHALL remove what the first routine added to the account, with its stored keys, and nothing else in the account.

#### Scenario: A shared account

- **WHEN** teardown runs in an account that holds other projects
- **THEN** only this install's routine pieces are removed, and anything Cloudflare will not remove is named as left behind

### Requirement: Paseo schedules are left alone

An update SHALL NOT delete, move, or change a schedule the person made in Paseo. The update's plan SHALL tell the person that those schedules keep running in Paseo and how to make each again as a routine.

#### Scenario: Updating an install with Paseo schedules

- **WHEN** an install with two Paseo schedules takes this update
- **THEN** both still run in Paseo, and the update's plan carries a to-do to make them again with `/routine` and delete the old ones in Paseo

<!-- end specs/cloud-routines/spec.md -->
<!-- file specs/dependencies/spec.md utf8 1289 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Stack-pack tools stay in the repo's build and CI

The Cloudflare stack pack's `node`, `npm`, and `wrangler` use SHALL run only in that repo's own build and CI, and provisioning SHALL use `curl` against the Cloudflare API so the person's machine needs no app dependency. The two exceptions are the check runner of an Artifacts install and the routine runner of an install that schedules: each is installed from the pack's own pinned and locked tools, outside the app, and adds nothing to the app's dependencies.

#### Scenario: Setup provisions Cloudflare

- **WHEN** setup provisions the app on a fresh computer
- **THEN** it reaches Cloudflare with `curl` and installs no app dependency

#### Scenario: Setup installs the check runner

- **WHEN** setup installs the check runner of an Artifacts install
- **THEN** it uses only the pack's pinned and locked tools, needs no container software on the computer, and leaves the app's dependencies unchanged

#### Scenario: The first routine installs the routine runner

- **WHEN** a person's first `/routine` installs the routine runner
- **THEN** it uses only the pack's pinned and locked tools, needs no container software on the computer, and leaves the app's dependencies unchanged

<!-- end specs/dependencies/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 853 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Setup points the person to Paseo

When getting the computer ready, setup SHALL check whether Paseo is installed. When it is missing, setup SHALL say in plain words what Paseo is for (chatting from the phone, a workspace per part) and where to get it, then continue; Paseo's absence SHALL NOT stop setup, and setup SHALL NOT install Paseo. Setup SHALL NOT say schedules need Paseo. When Paseo is present, the closing report SHALL say how to connect a phone.

#### Scenario: Paseo is missing

- **WHEN** setup runs on a computer without Paseo
- **THEN** it names Paseo, what it is for, and where to get it, without naming schedules, and finishes the install

#### Scenario: Paseo is present

- **WHEN** setup finishes on a computer with Paseo
- **THEN** the closing report says how to pair a phone

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/paseo-routines/spec.md utf8 946 -->
# Spec Delta

## REMOVED Requirements

### Requirement: Create a routine from a plain request
**Reason**: Routines no longer run through Paseo.
**Migration**: `cloud-routines` keeps this promise under the same name.

### Requirement: Runs start in their own worktree
**Reason**: A run now happens in a short-lived cloud computer, not a Paseo worktree, and no agent is kept for a pending question.
**Migration**: `cloud-routines`: *A run happens in a short-lived cloud computer* and *A run never waits for an answer*.

### Requirement: Manage this repo's routines
**Reason**: Routines are listed and managed in the person's Cloudflare account.
**Migration**: `cloud-routines`: *Manage this install's routines*. Schedules made in Paseo stay there; delete them in the Paseo app.

### Requirement: No Paseo, no change
**Reason**: `/routine` no longer needs Paseo.
**Migration**: `cloud-routines`: *When the cloud cannot be reached, nothing changes*.

<!-- end specs/paseo-routines/spec.md -->
<!-- file .openspec.yaml utf8 66 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05
retire_capabilities: true

~~~
<!-- end .openspec.yaml -->
<!-- file acceptance.md utf8 1752 -->
# Acceptance after the first save

Done on 2026-10-05 and 2026-10-06, from this branch's code, on the owner's paid Cloudflare account. [The trial record](trial.md) holds the numbers; this page says what each step of task 5.7 showed.

| Step | Outcome |
|---|---|
| A fixed-steps request | Given `/routine every night at 2am: copy yesterday's orders into the archive table`, a fresh assistant reading only the skill said it is a script, made no routine, and went to plan a timed job in the app. Given `find new articles about our competitors`, it chose a routine. It ran no command in either case. |
| A first routine installs the runner | With nothing installed, `create --dry-run` showed what would be added, the cost, and three models. `create` installed everything in 34 seconds and stopped for a model; after `model`, `create` made the routine. |
| A run and its result | Seven runs ended `ok`, each with its start-up and run time in the list and its output in `logs`. One started from the clock, 5 seconds after its set time. |
| The run's saved branch | Each run that changed a file pushed its own branch, with the maker as author, and `main` did not move: six times to a project in Cloudflare Artifacts, and once to a GitHub repository, where the run also opened a pull request. |
| The run's memory note | A run holding the key made for runs stored one thread, and it showed in a search from the owner's own checkout. The same key was shown none of the owner's private facts. |
| Delete and tear down | The routines were deleted, and every piece was removed by the page's steps and read back as gone, twice. The runs' memory key shows as revoked. |

## Not shown

- **A working pasted model key.** Dropped by the person's choice on 2026-10-06.

<!-- end acceptance.md -->
<!-- file review.html utf8 50272 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-durable-routines</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-durable-routines">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-durable-routines</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A schedule only works through the Paseo app, on a computer that stays on. A clock in your own Cloudflare account runs the same schedule with your computer off, from any chat app, and on whichever model you already pay for.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Schedules run in your Cloudflare account, not through Paseo.</b> <code>/routine</code> works the same in any app your assistant runs in.</div></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Scheduled work takes one of two shapes, and <code>/routine</code> picks.</b> The test is who decides the steps. The same steps every time make a script. Work that finds its own way gets an assistant. <code>/routine</code> says which it picked before it makes anything, and you can change it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">           │ script         │ routine</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">───────────┼────────────────┼─────────────────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">steps      │ fixed          │ the assistant decides</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">AI         │ a model call   │ an assistant</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">           │ at most        │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">runs in    │ a Worker,      │ a container,</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">           │ in your app    │ started by a clock</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">example    │ nightly export │ find news, /improve</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">Cloudflare │ free           │ paid, ~$5/mo</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Fixed steps become a script.</b> When what you ask for is the same steps every time, <code>/routine</code> says so and builds it into your app the usual way: a plan, a preview, then <i>publish it?</i> A step can still call an AI model through Cloudflare, such as <i>summarise these five emails</i>. Nothing new is installed for a script.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A routine is an assistant in a short-lived cloud computer.</b> A clock in your Cloudflare account wakes at the routine's time and starts a container with a fresh copy of the project. The assistant there can search the web, read and change files, and run commands, so it can find news articles or run <code>/improve</code>. It saves through the normal checks, and the computer is deleted when it ends.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A run sets up its tools each time it starts.</b> That measured 23 seconds on this server, on a run that lasts minutes and that nobody is waiting for. Every run's start-up time shows beside its result. If the real trial on Cloudflare shows more than 60 seconds, runs will start from a saved copy with the tools already in place, built before this publishes.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Routines need Cloudflare's paid plan, about $5 a month.</b> A container only runs there. On a free account <code>/routine</code> says so, gives the cost, and makes nothing. Scripts stay free.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>You pick the model, and it runs through Cloudflare.</b> Your first routine asks which model to use, from a short list with one recommended. It is reached through Cloudflare's own AI service with the sign-in you already have, so you paste no key and Cloudflare bills its use. Some models there, such as Claude and GPT, need credit in your Cloudflare account. <code>/routine</code> tests your pick with one small request and says so if it is refused. Ask any time to change it.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Or paste your own model key.</b> Ask for the key link and paste one key: a Z.ai subscription key, Anthropic, OpenAI, Google, OpenRouter, and others. The assistant works out whose key it is, tests it with one small request, and tells you which service and model your routines now use. Paste another to replace it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-8-line-1" tabindex="0">paste a key ─▶ whose? ─▶ test ─▶ in use</span>
<span class="ln" data-note="item-8-line-2" tabindex="0">                 │ unknown  │ refused</span>
<span class="ln" data-note="item-8-line-3" tabindex="0">                 ▼          ▼</span>
<span class="ln" data-note="item-8-line-4" tabindex="0">            asks which   says why,</span>
<span class="ln" data-note="item-8-line-5" tabindex="0">            service      keeps the old one</span></pre></div></details></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Your first routine installs it.</b> Nothing is added until you ask for a routine. The first one lists what it adds to your Cloudflare account and asks first.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>A scheduled run can't ask you anything.</b> It takes the safe choice, marks it as assumed, and leaves a note you see in your next chat. A run stops after 30 minutes, and a routine never runs twice at once.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>A run gets only what it needs.</b> It gets this one project, the memory key, the model key, and any keys you name for it. It never gets your Cloudflare sign-in or the publishing key. The memory key is one made for runs: it can read and add the project's shared notes, but not your private facts or your chats.</div></div></li>
<li class="item card" id="item-12"><span class="num">12</span><div class="body"><div class="text" data-note="item-12" tabindex="0"><b>BREAKING: <code>/routine</code> no longer makes or manages Paseo schedules.</b> Schedules you made before keep running in Paseo until you delete them in the Paseo app. The update tells you to make each one again with <code>/routine</code>. An install with no Cloudflare account, or on its free plan, can no longer schedule an assistant.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> An assistant that runs without a container. A run that signs in to your company app as you, or uses browser logins saved on your computer. Sign-ins that need a browser login instead of a pasted key, such as a ChatGPT plan. Running a script on the clock without a publish. Alerts by email or phone. A schedules page in the app. Changing the unpublished &quot;run anywhere&quot; work (pull request #291), which drops its own schedule part later. Removing Paseo's other uses.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how this plan sits beside the unpublished pull request #291, which already built cloud schedules → chose keep going here: plan schedules fresh, and #291 drops its schedule part later.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what a scheduled run should be able to do → chose light and code jobs together, over light jobs now and code jobs next. Replaced below by two shapes.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what a schedule needs before its first run → chose nothing: a key is optional, and schedules start on Cloudflare's own models.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked where a fixed-steps schedule should run, after the person's review note that such a job should be a plain script in a Worker → chose in the app, the usual way, over adding scripts to the clock on the spot.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked where scheduled skills that run commands should run, after the person asked whether the Durable Object could hold the project → chose a cloud computer for them, with the project held in the clock for the rest. Replaced below by two shapes.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked: review note on Change #2 → a script may call an AI model through Cloudflare for a step, and only work that decides its own steps, such as finding news articles, gets an assistant.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked: review note on Change #4, whether scheduled work should be only Workers or containers → chose two shapes: a script in a Worker, or an assistant in a container. The assistant inside the Durable Object is dropped, so every routine needs the paid plan.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked: review note on Change #7 → by default the first routine asks which model to use and reaches it through Cloudflare's AI service; a pasted key stays as the other way.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether a run's container should install its tools each time or start from a ready-made image → chose explore it, then update the plan.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a run installs its tools at the start from a locked list, with no image of our own, because a cold install measured 23 seconds on 2026-10-05 against a run of minutes nobody waits on, and a published image costs a release step, a Docker Hub account, and every install's trust in it.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: 60 seconds is the start-up limit, and over it the saved start is built in this change, because the person wants a slowness that measuring finds fixed in the same change.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <code>/routine</code> stops managing Paseo schedules for everyone, because the person chose cloud for everyone on 2026-10-05 for #291 and a second scheduler would go untested.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the assistant in the container is Pi's command-line assistant, because it takes a key from any of about 40 services, Z.ai's subscription included, and needs no sign-in of its own.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the clock is a Durable Object that only keeps the list and starts each run, because a clock set in a settings file can't follow a list that changes.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: an install has one model key, not one per person, because whoever holds this install's keys can already schedule.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the key's service is worked out by fixed code, from its shape and then one test request sent from the person's own Cloudflare account, because the code there already speaks to every service and a refused key is caught before it is stored.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a run reaches Cloudflare's AI service through a key setup makes that can only run models, because a run must never hold the Cloudflare sign-in. If the trial shows no such key can be made, a routine asks for a pasted model key first.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the model list comes from the pinned Pi catalog for Cloudflare's AI service, three shown and the rest on request, because a hand-kept list goes stale.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the clock, list, run, and client code and tests already written on #291's branch are copied here, because they pass with stand-ins and rebuilding them buys nothing.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a run's result shows in the list and as a note in the next chat, with no email or phone alert, because that is what a Paseo-free install can already show.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the real-account trial runs after all code and tests are written and before anything publishes, because the person found a trial-first build slow on #291. It needs a paid Cloudflare account.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: each task's own tests ran once at the end, with the local checks, not after each task, because the build writes all code and tests before it runs any. No test was dropped.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the token widens by <code>AI Gateway Write</code>, <code>AI Gateway Run</code>, and <code>Workers AI Read</code> beside the two for containers and the plan, and the key a run holds has only the last two, because those are the names Cloudflare's own list gives the groups that make a gateway and run a model. The trial proves they are enough.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a refused pasted key reports only the service's status, never its words, because a service can quote part of a key back; a refused Cloudflare pick reports what Cloudflare said.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a run copies the project's whole history, not only its latest commit, because skills such as <code>/improve</code> read past commits; the trial's start-up time includes it.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the landing site's line about Paseo no longer says &quot;run jobs on a schedule&quot;, because it stopped being true; the site was outside the plan's file list.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the first save comes before the GitHub half of the trial and the real model key, because both wait on a key from the person and the checks can run meanwhile. The Cloudflare half of the trial passed, and <code>trial.md</code> holds the record.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how to finish the two trial checks that wait on a key → chose a new key link for the GitHub token and a model key, over publishing without them.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked which memory key a run should get, since the owner's own is the admin key that reads every fact and transcript → chose a lesser key made for runs, over the install's own key.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the trial's Cloudflare pieces and the runs' memory key were deleted before the two keyed checks, because two key links closed unused and a live key and a public address should not sit waiting. Installing them again takes about a minute.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a run's note is written with no chat session named, because a scheduled run has none and the memory script otherwise holds the note for a next chat that never comes; the trial lost one note that way.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to test with a real pasted model key, after the person asked if Cloudflare's free model use could serve → chose no model key: the trial's runs already used Cloudflare's own models, and the pasted-key path ships tested with a refused key and stand-ins.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to try saving to GitHub before publishing → chose test GitHub first, with one token for the empty test repository.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: setup tests a GitHub token for write access before sending it to the runner, because the person gave a read-only one and a run would only have found out at its first push.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how to finish the GitHub check → the person gave the token on file write access on GitHub, and the run on the GitHub route then passed. That token is also the one another change stores as its read-only key; the person was told.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to publish → chose publish it. Archived and numbered 36.0.0, after bringing main in at 35.2.0; the routine skill's wording was trimmed by 484 bytes so the shared budget for skill text still holds with main's own additions.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
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
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
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
    fit(d);
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
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file trial.md utf8 8955 -->
# Trial on a real Cloudflare account

Run on 2026-10-05 on the owner's account (Workers Paid), from a Linux server with no Docker. Everything was made under the throwaway name `wong-rt-trial` and is listed under [Clean-up](#clean-up).

## What was set up

- **A throwaway install:** a copy of this branch in a temp folder, with its own name and only the two Cloudflare keys in its `.env`. It held no memory key.
- **A throwaway project** in Cloudflare Artifacts, `wongstack/wong-rt-trial`: a README, `AGENTS.md`, `NOTES.md`, and one skill, `.agents/skills/tidy/`, whose `SKILL.md` runs a Node script, appends its line to `NOTES.md`, and pushes a branch.
- **The runner**, installed by `routine.mjs setup`.

## Results

| What | Result |
|---|---|
| First `setup` | Worked in 35 seconds. The token gave itself `AI Gateway Write`, `AI Gateway Run`, and `Workers AI Read`; it already held the other two. It made the Worker with its container and Workflow, the AI Gateway, the model-only key, and the routines key. |
| Second `setup` | Worked in 26 seconds, made nothing new, and kept the list and the model. |
| The public Sandbox image, no Docker | Deployed as `docker.io/cloudflare/sandbox:0.12.5`. |
| pi-ai inside the Worker | Worked. `model` listed the 54 models of Cloudflare's AI service. |
| The model-only key | Worked: a test request and whole runs went through the AI Gateway on it. |
| Pick a Workers AI model | `kimi-k2.7-code`, `glm-5.3`, and `glm-5.3-flash` were all accepted. GLM-5.3's test took from 2 to more than 20 seconds. |
| Pick a Claude model | Refused: `402 Insufficient wholesale credits. Please add additional credits on the AI Gateway Cloudflare dashboard`. The model in use was kept. |
| A run on a `/<name>` verb with a script | Status `ok`. Pi on Kimi K2.7 Code read the skill, ran its script, appended the line, and pushed `routine/tidy-run`. `main` did not move. The commit carries the maker's name and email. |
| A run that finds its own way | Status `ok` in 110 seconds, 7.7 of them start-up. Asked for the three top stories on Hacker News, Pi chose the site's public API over reading the page, appended the titles to `NOTES.md`, pushed `routine/news-run`, left `main` alone, and listed what it assumed, as the notice asks. |
| A run on GLM-5.3 | Status `ok` in 109 seconds, 8.1 of them start-up. It followed the same skill, and took the branch name from the words after `/tidy`. |
| Teardown by the page's steps | The first runner's Worker, container application, Workflow, AI Gateway, and model-only key were each deleted and read back as gone. |
| A first routine installs the runner by itself | With nothing installed, `create --dry-run` showed what would be added, the cost, and the three models. `create` then installed everything in 34 seconds and stopped with `needs: model` and the shortlist. After `model`, `create` made the routine. |
| The clock | A routine set for 21:04:00 UTC started by itself at 21:04:04.8, and its next run moved to the same time the next day. |
| Never twice at once | A `run` asked for while a run was going answered `started: false, reason: running`, and recorded one skipped start. |
| The runs' own memory key | `setup` issued a `member` key for a new machine id against the real memory store, sent it to the runner, and recorded the id; `member list` showed it as `member, routine runs, active`. A second `setup` issued nothing. |
| A run can't see private facts | On a full copy of this project, a run searched memory for `shadcn` and `routine`. It was shown 3 and 23 facts, all `thread` or `project`. The owner's `feedback` facts on the same words were not there. |
| A run leaves a note | The run stored one `thread` fact tagged `routine`, and it showed in a search from the owner's own checkout. The first try was lost: see below. These two runs took 6 and 11 minutes on GLM-5.3. |
| The Worker minting an Artifacts write key | Worked with `env.ARTIFACTS.get(repo).createToken('write', ttl)`. The key outlives the run by up to an hour. |
| No key in a URL, a log, or a stored step | The run's log and every stored Workflow step were searched for the Artifacts key, a Basic or Bearer header, the routines key, and the Cloudflare token. None was there. |
| An install whose project lives on GitHub, with no project key | `setup` installed a second runner, `wong-rt-gh-routines`, in 36 seconds and answered `needs: project-access`. `create` then stopped with the same answer and made no routine. |
| No computer left running | After both runs, Cloudflare's container list showed no active or assigned instance for either runner. |
| A run on the GitHub route | Status `ok` in 48 seconds, 7.7 of them start-up (clone 0.7, tools and `gh` 4.5). With a fine-grained token for the one repository, Pi on Kimi K2.7 Code followed the skill, pushed `routine/tidy-run`, and opened pull request #1 with `gh`. `main` did not move, the commit carries the maker's name, and the token was in no log and no stored step. |
| A GitHub token that can read but not save | The person gave a read-only token. `setup` asked GitHub, did not send the token to the runner, and answered `needs: project-access` with *The GitHub token can read this project but not save to it*. The runner's secrets stayed `AI_RUN_TOKEN` and `ROUTINES_KEY`. |
| A wrong pasted key, in Z.ai's shape | Recognised as Z.ai, refused by Z.ai with 401, and nothing was stored: the runner's secrets stayed `AI_RUN_TOKEN` and `ROUTINES_KEY`. The key's text was in no output. |
| A pasted key of no known shape | Stopped with `needs: provider` and the nine services to choose from. |
| No pasted key | Stopped with `needs: model-key`. |

## Start-up time (task 5.3)

The first run, on the Artifacts route:

| Piece | Seconds |
|---|---|
| Container start, and writing the four files | about 3.4 |
| Clone of the project (tiny, full history) | 0.9 |
| Tools, `npm ci` of 184 packages | 7.1 |
| **Start-up, to the assistant's first line** | **11.3** |
| The whole run | 51.7 |

The second run started in 7.7 seconds: clone 1.4, tools 4.4.

Start-up is under the 60-second limit, so no saved start was built.

## What the trial changed in the code

- **The model test waited 20 seconds, and GLM-5.3 can take longer.** It now waits 60.
- **A refusal with no HTTP status read as "could not be reached".** The status is now taken from the refusal's own words, so a 402 says the account has no credit.
- **The first call after `setup` got an empty 404.** A new key takes a few seconds to reach every Cloudflare location. The client now tries an empty 404 again, twice.
- **The notice said to leave a memory thread, but not how.** In a project with no memory skill, the assistant called its own chat the memory record. The notice now says to write the thread through the project's memory skill when it has one, and otherwise to end its reply with what is left. A first wording made a one-word task spend three minutes on that bookkeeping, so the notice also says to do neither when nothing is left; the same task then replied with its one word.
- **A note written the memory skill's usual way never left the container.** The skill's example names the chat session, a scheduled run has none, and the script then holds the fact for a next chat that never comes. The notice now says to leave the session out and to check the script answers `stored`.
- **A read-only GitHub token was accepted and would have failed at a run's first push.** `setup` now asks GitHub to store the empty file with the token, which only a token with write access may do, and keeps a token that can't.

## Not tried

- **A working pasted model key** (task 5.4): dropped on 2026-10-06. The person chose to rely on Cloudflare's own models, which every trial run used; the pasted-key path ships tested with a refused key and stand-ins.

Six key links were sent on 2026-10-05 and 2026-10-06. Four timed out unused, one was closed by another chat's link 33 seconds after it opened, and one took a read-only token. The person then gave that same token write access on GitHub, and the run above used it.

## Clean-up

Everything the trial made is deleted and read back as gone, through Cloudflare's API and GitHub's:

- Workers `wong-rt-trial-routines` and `wong-rt-gh-routines`, each with its container application and its Workflow.
- AI Gateways `wong-rt-trial-routines` and `wong-rt-gh-routines`.
- Account tokens `wong-rt-trial-routines-ai` and `wong-rt-gh-routines-ai`.
- Artifacts repositories `wongstack/wong-rt-trial` and `wongstack/wong-rt-mem`, with their tokens.
- The runs' memory key: `member list` shows its machine id as revoked. The test note it wrote is closed.
- GitHub repository `matthewwong525/wong-rt-trial`, with its test pull request.
- The temp folder on this server.

**Left on purpose:** the three permissions the owner's Cloudflare token gave itself, and the GitHub token the person saved as `WONG_ROUTINE_GITHUB_TOKEN`; the real install needs both.

<!-- end trial.md -->
