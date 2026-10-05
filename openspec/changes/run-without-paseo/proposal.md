# Run WongStack anywhere, with or without Paseo

**Status:** in-progress

**Branch:** remove-paseo

**Open questions:** How far "any AI coding agent" goes (one neutral way plus per-assistant extras, named assistants set up now, or wording only), and whether it is built in this change, partly here with memory next, or after this publishes. Asked 2026-10-05, not yet answered.

## Why

WongStack tells you to get the Paseo app first, and three things only work inside it: schedules, a new workspace for each part of a big request, and closing a workspace. That ties the stack to one chat app. It should run the same wherever Claude Code or Codex runs, with Paseo as one nice place to chat.

## What Changes

- **Nothing asks you to get Paseo.** The README, the getting-started page and setup say to chat wherever your assistant runs: Claude Code or Codex, in its own app or a terminal. Paseo is named once, as one optional app. Setup no longer tells you Paseo is missing. The landing page keeps its pictures and lists Paseo as an add-on for phone chat and side-by-side work, no longer for schedules.
  ```text
                │ any app  │ with Paseo
  ──────────────┼──────────┼────────────
  every step    │ yes      │ yes
  schedules     │ cloud    │ cloud
  new workspace │ a folder │ own agent
  phone         │ its own  │ paired
  ```
- **A new workspace works without Paseo.** When a request has several parts, each other part gets a ready folder: a fresh copy of the project, your keys, and a short brief. You open the folder in your assistant and paste one line. No assistant starts by itself, because nobody would be there to answer it. With Paseo, a new workspace still opens with its own assistant, as today.
- **Closing and tidy-up work without Paseo.** *Close this workspace* is offered in those folders too. The folder goes at the next tidy-up, once its work is saved and nothing is running in it. Idle, saved folders are tidied after three days, as Paseo workspaces are today. A folder you made yourself is never touched.
- **Schedules run in your own Cloudflare account, for everyone.** A clock there starts a short-lived cloud computer, which gets a fresh copy of the project and runs your assistant with the prompt you gave. It works with your computer off.
  ```text
   /routine every weekday at 9: …
              │
              ▼
   a clock in your Cloudflare account
              │ 9:00
              ▼
   a short-lived cloud computer
   gets the project, runs the assistant
              │
              ▼
   saves its work, leaves you a note
  ```
- **Your first schedule sets this up.** The assistant asks for a one-time sign-in for itself through the private key link, and keeps it in your Cloudflare account. Each run acts as the person who made the schedule. Nothing is installed until you ask for a schedule.
- **Schedules need Cloudflare's paid plan, about $5 a month.** The cloud computer only runs there. On a free account, `/routine` says so, gives the cost, and makes nothing.
- **A scheduled run can't ask you anything.** It takes the safe choice, marks it as assumed, and leaves a note you see in your next chat. It can't use browser logins saved on your computer. A run stops after 30 minutes, and a schedule never runs twice at once.
- **BREAKING: `/routine` no longer makes or manages Paseo schedules.** Schedules you made before keep running in Paseo until you delete them in the Paseo app. The update tells you to make each one again with `/routine`.
- **Unchanged with Paseo:** workspaces with their own assistant, phone pairing, the four assistant presets, and the file that names things for Paseo.

**Non-goals:** A scheduled run that signs in to your company app as you, or uses saved browser logins. A schedules page in the app. Scheduling from a computer that lacks this install's keys. Moving existing Paseo schedules for you. Running schedules with your computer's own timer. Removing Paseo support.

## Capabilities

### New Capabilities

- `cloud-routines`: `/routine` schedules run in the person's own Cloudflare account: first-use setup, the paid-plan stop, the stored sign-in, what a run gets and may not get, unattended behavior, limits, results, and teardown.

### Modified Capabilities

- `paseo-routines`: retired; every requirement is removed and `cloud-routines` replaces it.
- `multi-part-workspaces`: new workspaces are offered and opened without Paseo, as ready worktrees the person opens; only an unattended run or an unanswering Paseo opens none.
- `workspace-cleanup`: `/close`, the close offer, and the background tidy-up cover worktrees WongStack made without Paseo, and never a worktree it did not make.
- `install-onboarding`: the README sends the person to Claude Code or Codex, not Paseo; the walkthrough's manual steps drop Paseo; setup reports no chat app as missing.
- `change-loop`: the routine offer no longer depends on Paseo.
- `dependencies`: installing the routine runner joins the check runner as an allowed use of the pack's pinned tools on the person's computer.

## Impact

- Skills: `.agents/skills/routine/` (SKILL.md; `routine.mjs` rewritten as the cloud client; `workspace.mjs`, `tidy.mjs`; `lib/paseo.mjs` split), `.agents/skills/close/`, `.agents/skills/continue/`, `.agents/skills/plan/references/new-workspace.md`, `.agents/skills/explore/` (`asking-the-user.md`, `other-work.mjs`), `.agents/skills/hand-over/scripts/hand-over.mjs` (import only), `.agents/skills/wong-setup/` (SKILL.md, `references/tools.md`, `references/cloudflare.md`, `scripts/provision.mjs` exports), `.agents/skills/wong-sync/references/` (manifest, file list), `.agents/skills/memory/references/areas.json`.
- New pack folder `scripts/routine-runner/`: one Worker with a Durable Object, a Workflow, and a Sandbox container, at pinned versions.
- Config: `.env.example` (five new names), `.claude/.wong-stack.json` (`components.routines`), `scripts/retired-names.json`.
- Docs: `README.md`, new `wiki/stack/cloud-routines.md`, `wiki/stack/README.md`, `wiki/stack/getting-started.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/development/` (`required-tools.md`, `the-change-loop.md`, `repository-improvement.md`, `README.md`, `secrets.md`), `wiki/README.md`, `CHANGELOG.md` (major).
- Site: `site/src/install.ts`, `site/src/Landing.tsx` and their tests (copy only).
- Tests: `scripts/tests/` (`routine`, `workspace`, `tidy`, `other-work`, `hand-over`, new `routine-runner` and payload tests), the retrieval fixture copies of changed wiki pages.
- Cloudflare, per install that schedules: one more Worker, a container application, a Workflow, and Worker secrets. The token widens itself by `Workers Containers Write` and `Billing Read` on a GitHub install.

## Decision log

- **2026-10-05** — Asked how far removing Paseo should go → chose one choice among several: nothing asks for it, and each Paseo-only feature gets a way that works anywhere.
- **2026-10-05** — Asked how this fits the open "Simplify the README" workspace → chose keep going here, README wording included.
- **2026-10-05** — Asked what should run a schedule without Paseo → chose the cloud, such as a Cloudflare Durable Object, over the computer's own scheduler.
- **2026-10-05** — Asked where the assistant runs when the cloud clock fires → chose a short-lived computer in Cloudflare, signed in as the person who set the schedule up.
- **2026-10-05** — Asked what happens to Paseo schedules once cloud ones exist → chose cloud for everyone.
- **2026-10-05** — Asked whether to split wording, workspaces, and schedules into parts → chose one change, and kept that after hearing the cloud part needs a real trial before anything publishes.
- **2026-10-05** — Assumed: a workspace without Paseo starts no assistant, because a background assistant with full permissions would have nobody to answer it.
- **2026-10-05** — Assumed: without Paseo the parts question recommends one at a time here, because opening each folder by hand costs the person more than Paseo's one tap.
- **2026-10-05** — Assumed: `/close` without Paseo marks the folder and the next tidy-up removes it, because nothing can tell when a chat in another app has ended.
- **2026-10-05** — Assumed: the clock, the list, and the cloud computer live in one new Worker beside the app, not in the app, because an install owns its app's settings file and an update can't add a clock to it.
- **2026-10-05** — Assumed: the first `/routine` installs the cloud pieces, not setup, because the person said on 2026-10-04 to install a tool only when a task needs it.
- **2026-10-05** — Assumed: schedules need the paid plan on every install, because Cloudflare's cloud computers run only there and the person chose Cloudflare over GitHub's computers.
- **2026-10-05** — Assumed: whoever holds this install's keys can schedule, and nobody else, because a schedule runs an assistant with full permissions and stored sign-ins.
- **2026-10-05** — Assumed: a run gets the assistant's sign-in, the project, the memory key, and only the extra keys its schedule names, because a run needs no more and a leaked run should reach no more.
- **2026-10-05** — Assumed: the build's first task tries a real run in Cloudflare on a subscription sign-in, and falls back to a pay-per-use key if that is refused, because nothing else in the schedule part is worth building on an unproven run.
- **2026-10-05** — Assumed: the presets and the Paseo naming file stay as they are, because they do nothing on a computer without Paseo.
- **2026-10-05** — Moved: the real-account trial (now tasks 6.2 to 6.5) waits until all code and tests are written, with the live routine test after it. The cloud part is built at the check runner's pinned versions and stays unproven until the trial runs; nothing publishes before it.
- **2026-10-05** — Assumed: the Cloudflare steps both runners share live in the routine skill and setup imports them, not the other way round, because setup's scripts are not installed in a person's project and `/routine` must work there.
- **2026-10-05** — Assumed: setup widens the token before it reads the plan, because the plan can't be read without Billing Read; on a free account the token gains two permissions and nothing is added to the account.
- **2026-10-05** — Assumed: a run takes on the installation identity of the memory key it is given, because memory answers a key only on the installation it was issued to.
- **2026-10-05** — Assumed: what setup generates in the runner's folder is kept out of git by this clone's own exclude file, not `.gitignore`, because an install's `.gitignore` is its own and the config carries the account's id.
- **2026-10-05** — Asked how far "any assistant" should go and where to build it → not answered yet. The person said mid-build that WongStack must work with any AI coding agent on any harness, so the non-goal that left other assistants out is removed; what is built so far still starts only Claude Code or Codex in a scheduled run. Saved with all code and tests written, before the real Cloudflare trial.
