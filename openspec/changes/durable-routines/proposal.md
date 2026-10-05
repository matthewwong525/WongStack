# Schedules that run in your Cloudflare account, on any model key

**Status:** in-progress

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
- **A run gets only what it needs.** It gets this one project, the memory key, the model key, and any keys you name for it. It never gets your Cloudflare sign-in or the publishing key.
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
