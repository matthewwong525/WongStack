# Design

## Context

See proposal.md for why. What shapes the approach:

- **Nothing breaks without Paseo today**, by reading the code; no session has been tried on a computer without it. Paseo is reached only through `.agents/skills/routine/scripts/`: `routine.mjs` (schedules, through Paseo's private schedule client), `workspace.mjs` (`paseo run --new-workspace`), `tidy.mjs` (`paseo wait`, `workspace archive`, `ls`), `presets.mjs`, and `lib/paseo.mjs`. `other-work.mjs` and `hand-over.mjs` import `lib/paseo.mjs`; `session-start.mjs` starts `tidy.mjs sweep`.
- **`lib/paseo.mjs` also holds host-neutral helpers** (`git`, `parseCommand`, the exit codes) that non-Paseo code uses.
- **The app can't host the clock.** `app/wrangler.jsonc` is the install's own and no update writes it, the app has no Durable Object, no secret store, and a 100% coverage suite with no Worker runtime. So schedules get their own Worker, as the check runner did.
- **The check runner is the model, not the base.** `scripts/check-runner/` is built on `@cloudflare/ci`, whose stages take fixed commands, a read-only repository token, and no extra secrets. It runs only on Artifacts installs. A routine run needs a write token, the agent's sign-in, and a long single command, so it uses the Sandbox SDK directly.
- **The Cloudflare user token widens itself**, pre-authorized by `wiki/stack/cloudflare-credentials.md`, and `provision.mjs` already checks the paid plan (`paidPlan`), fills a runner config (`runnerConfig`), runs `npm ci` and `wrangler deploy` from a pack folder, and `PUT`s Worker secrets.
- **Keys reach the computer only through the private key link**, for names declared blank in `.env.example`.
- **Not proven:** Claude Code or Codex running headless in Cloudflare's Sandbox image on a subscription sign-in; how a Worker gets a write token for an Artifacts repository. The trial in task group 6 settles both before anything publishes.

## Goals / Non-Goals

**Goals:**

- No script, skill, or page treats Paseo as needed; with Paseo, today's behavior is unchanged except schedules.
- One schedule path for every install and every chat app, with deterministic code for the clock, the list, the credentials a run gets, and the limits.
- A run's reach is fixed by code, not by its prompt.

**Non-Goals:**

- Moving `workspace.mjs`, `tidy.mjs`, and `presets.mjs` out of the routine skill's folder; a rename touches every caller for no behavior.
- A schedules screen, per-teammate scheduling from another computer, or run notifications beyond the memory thread and the list.
- Changing `paseo.json`, `presets.mjs`, or the hand-over wake-up, which already do nothing without Paseo.

## Decisions

### 1. Split the shared helper; add a host check

`lib/paseo.mjs` keeps `findPaseo`, `runPaseo`, `paseo`, and `PaseoError`. A new `lib/cli.mjs` beside it takes `EXIT`, `parseCommand`, `git`, and a host-neutral `CliError` that `PaseoError` extends. `other-work.mjs`, `hand-over.mjs`, and `routine.mjs` import the neutral helpers from there; only code that calls Paseo imports `lib/paseo.mjs`.

A new `lib/host.mjs` answers one question: `workspaceHost(env)` returns `'paseo'` when `paseo` is on PATH (or its override is set), else `'plain'`. An installed Paseo whose daemon is down stays `'paseo'` and fails as today: a person who uses Paseo should hear that it is down, not get a folder made silently.

*Alternative:* a pluggable adapter with a registry of hosts. Two hosts and three call sites do not earn it.

### 2. A plain workspace is a marked worktree

`workspace.mjs open` on a `'plain'` host:

1. Fetches the default branch and picks the base exactly as today.
2. Runs `git worktree add <dir> -b <slug> <base>` (or checks out `--checkout <branch>`), where `<dir>` is `<primary>-workspaces/<slug>`, a sibling of the primary checkout. A sibling keeps the copy out of the primary's searches and checks; a taken name gets `-2`, `-3`.
3. Seeds secrets with `ship/scripts/worktree-secrets.mjs seed`.
4. Writes the brief to `<dir>/.scratch/brief.md` (git-ignored by `tidy.mjs scratch`'s rule).
5. Writes the marker `wong-workspace.json` (`{ title, madeAt, closedAt: null }`) in the worktree's own git directory, next to the secrets baseline, so it is never in the working tree and goes when the worktree goes.
6. Prints `{ ok, host: 'plain', path, branch, base, title, paste }`, where `paste` is the one line: `Read .scratch/brief.md and do what it says.`

No agent starts. `new-workspace.md` tells the agent to report the folder and the line, and drops the "new workspaces need Paseo" sentence. The marker is the only thing that makes a worktree "WongStack's": a worktree without it is never closed or swept.

### 3. `/close` and the sweep on a plain host

- **`tidy.mjs close`** in a marked worktree with no `PASEO_AGENT_ID`: runs the same saved check, then sets `closedAt` in the marker and exits 0 with `message: 'This folder goes at the next tidy-up.'` It starts no detached child, because nothing says when a chat in another app has ended. `--discard` throws the work away first, as today. In an unmarked linked worktree it refuses with exit 2, as the main checkout does.
- **`tidy.mjs sweep`** gains a plain pass that runs whether or not Paseo is installed: for each worktree of this repo with a marker, skip the current one; remove it (`git worktree remove`, then delete its branch when merged at tip or discarded) when it is saved, no process of this user has its working folder inside it (the check `stopOrphans` already makes), and either `closedAt` is set or its `HEAD` is 3 or more days old. Unsaved ones are reported as left, as today. With Paseo installed, a Paseo workspace keeps Paseo's pass; a marked worktree Paseo also lists is left to Paseo.
- **The close offer** (`asking-the-user.md`, `new-workspace.md`, `close/SKILL.md`) says "in a workspace", meaning `PASEO_AGENT_ID` set in a linked worktree or a marked worktree; `tidy.mjs close --dry-run` is the one test for both.
- **`other-work.mjs`** reads the marker's `title` as a plain workspace's name, and adds no note when Paseo is absent: a normal state is not news.

### 4. One Worker owns schedules: `scripts/routine-runner/`

A pack folder, shipped like the check runner, deployed as `<base>-routines` into the person's account:

| Piece | Kind | Job |
|---|---|---|
| `Routines` | Durable Object, one instance | The list (SQLite storage) and the clock (one alarm at the earliest `nextRunAt`). |
| `Run` | Workflow | One run: sign-in check, container, bootstrap, agent, result. |
| `RoutineSandbox` | Sandbox container | The short-lived computer; stock `docker.io/cloudflare/sandbox` image at the SDK's pinned version, `max_instances: 2`. |
| `fetch` | HTTP | The management API; everything without the key answers 404. |

Files: `worker.mjs` (wiring only), `schedule.mjs` (pure: next run of a five-field cron in an IANA timezone), `routines.mjs` (pure: create, change, pause, due, skip, record result, over a storage interface), `run.mjs` (pure: the bootstrap script, the agent command, the env a run gets, log redaction), `wrangler.template.jsonc`, `package.json`, `package-lock.json`. Pure modules carry the logic so `node --test` covers it with stand-ins, as `check-runner.test.mjs` does.

*Alternatives:* a cron trigger polling every minute (a fixed trigger in config can't follow a list that changes, and burns invocations); the clock in the app (see Context); GitHub Actions on a schedule (works only for GitHub installs, and the person chose Cloudflare).

### 5. The management API and its key

`routine.mjs` calls `https://<base>-routines.<subdomain>.workers.dev` with `Authorization: Bearer <WONG_ROUTINES_KEY>`, compared in constant time. The key is 32 random bytes minted at install, stored as a Worker secret and in the primary `.env`; `.env.example` declares it. The address and Worker name go in `.claude/.wong-stack.json` as `components.routines`. Routes take and return JSON: create, list, change, pause, resume, run, delete, logs. No route returns a secret, and a wrong or missing key gets the same 404 as an unknown path.

*Alternative:* driving the Worker through Cloudflare's Workflows REST API with the user token, with no public address. It needs no new key, but turns every list into a Workflow instance and ties scheduling to holding the root token forever.

### 6. First use installs it: `routine.mjs setup`

`create` calls `setup` when `components.routines` is absent. Setup, in order, stopping at the first failure with nothing half-made:

1. Widen the user token by `Workers Containers Write` and `Billing Read` when it lacks them (an Artifacts install has both): the plan can't be read without the second.
2. `paidPlan` → not paid: exit 3, `needs: 'paid-plan'`, the cost and the upgrade link. Nothing is created.
3. Fill `wrangler.template.jsonc`, `npm ci --ignore-scripts`, `npx --no-install wrangler deploy`, as `artifactsDelivery` does. Shared steps move into `routine/scripts/lib/cloudflare.mjs`, which ships to every install; `provision.mjs` imports and re-exports them, since setup's own scripts are not installed in a project.
4. Mint and `PUT` `ROUTINES_KEY`; `PUT` `MEMORY_TOKEN` from `.env`; write `.env` and `components.routines`.
5. Route-specific project access (Decision 8).

`--dry-run` prints what would be added. `/routine` shows that list and confirms before the first real `setup`, in the ask format.

### 7. Sign-in: per person, through the key link

`.env.example` declares three optional names, mapped inside the container to the name each CLI reads:

| `.env` name | In the run | For |
|---|---|---|
| `WONG_ROUTINE_CLAUDE_TOKEN` | `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code on a subscription (`claude setup-token`) |
| `WONG_ROUTINE_ANTHROPIC_KEY` | `ANTHROPIC_API_KEY` | Claude Code, pay per use |
| `WONG_ROUTINE_OPENAI_KEY` | `OPENAI_API_KEY` | Codex, pay per use |

The `WONG_ROUTINE_` prefix keeps a pay-per-use key in `.env` from changing how the person's own local assistant bills. `routine.mjs signin --agent <claude|codex>` reads the first set name for that agent and `PUT`s it as Worker secret `SIGNIN_<AGENT>_<id>`, where `<id>` is the first 12 hex of SHA-256 of the lowercased `git config user.email`. A routine stores its maker's email, name, and `<id>`. `create` without a stored sign-in exits 3 with `needs: 'signin'` and the key names; `/routine` then sends the key link, runs `signin`, and retries. `wiki/development/secrets.md`'s human steps gain how to make each token.

The trial decides whether the subscription row stays: if Cloudflare's container can't run on it, the row and its wording are removed and the paid-key rows remain.

### 8. What a run does

`Run`, for one routine and one tick:

1. **Gate.** Missing `SIGNIN_*` secret → result `needs-signin`, no container. Last run still going → result `skipped`.
2. **Project.** Artifacts install: the Worker mints a write token for this one repository (the way the trial, task 6.4, proves) and clones over an auth header. GitHub install: the Worker uses secret `GITHUB_TOKEN`, a fine-grained token for this one repository (contents and pull requests, read and write) that `setup` asks for through the key link as `WONG_ROUTINE_GITHUB_TOKEN`; it is also the run's `GH_TOKEN`. The token never appears in a URL or a log.
3. **Bootstrap** (`run.mjs`, fixed text): install the pinned agent CLI and `openspec`, and `gh` on a GitHub install; set git author to the maker; write `.env` holding `CLOUDFLARE_MEMORY_TOKEN` and the routine's named keys (Worker secrets `RUN_<NAME>`), and nothing else.
4. **Agent.** `claude -p` in `bypassPermissions`, or `codex exec` with approvals off, on the default branch. The prompt is a fixed notice, then the routine's prompt verbatim: *"This is a scheduled run and nobody can answer. Take the recommended option wherever you would ask, mark it assumed, and record anything left for the person as a memory thread."*
5. **Result.** Exit status, duration, and the last 200 output lines, with every secret value the run held replaced by its name. The DO keeps each routine's last 10 results.

Limits: 30 minutes a run; one run per routine at a time; two containers at once, later runs waiting their turn through the DO. The Worker holds no Cloudflare user token and no deploy token, so a run can't publish except by saving through the project's normal checks.

### 9. `/routine` and its client

`routine.mjs` becomes the cloud client: `setup`, `signin`, `create`, `ls`, `pause|resume|run|logs|delete`, `change`, each printing one JSON object. Exit codes keep their meaning by position: 0 ok, 2 bad input, 3 not ready (`needs: 'paid-plan' | 'setup' | 'signin' | 'project-access'`), 4 the runner does not answer, 5 its answers have changed. Cron validation stays in the client; the Worker validates again. `SKILL.md` drops every Paseo line, gains the first-use flow and the confirm that names whose sign-in a routine runs with, and stays within the context baseline by replacing text, not adding it.

`routine.mjs` no longer imports Paseo's `dist/commands/schedule/shared.js`. Nothing lists or edits Paseo schedules.

### 10. Wording

- **README:** step 1 is "Get Claude Code" (or Codex); step 2 "Open it and paste this". *Where you chat* lists Claude Code or Codex in their own apps first, Paseo as an optional app for phone pairing and a workspace per part, then other agents. The schedule example and the `/routine` row say it runs in your Cloudflare account and needs the paid plan. The `paseo.json` row says it is for people who use Paseo.
- **Setup:** `tools.md`'s Paseo section goes; `cloudflare.md`'s closing report says *"Next time, open <target> in your assistant to chat"* and keeps the pair-a-phone line only when `paseo` is on PATH. `wong-setup/SKILL.md` reports presets only when Paseo is present.
- **Wiki:** `required-tools.md`'s two Paseo paragraphs become one short "Paseo is optional" paragraph that links `cloud-routines.md` for schedules. New `wiki/stack/cloud-routines.md` owns how routines run, what they cost, what a run gets, the limits, renewing a sign-in, and teardown; `wiki/stack/README.md`, `getting-started.md` (costs, manual steps, teardown), `cloudflare-credentials.md` (the widen's new groups), `the-change-loop.md`, `repository-improvement.md`, `development/README.md`, `secrets.md`, and `wiki/README.md` link to it instead of repeating it.
- **Site:** `install.ts`'s add-on line and `Landing.tsx`'s credit line stop saying Paseo runs schedules. Pictures and structure stay.
- **Retired names:** `paseo-routines` → the `cloud-routines` spec; `ROUTINE_PASEO_BIN` → none.

### 11. Release and update note

`major`: `/routine` stops managing Paseo schedules. The **Updating.** note, in plain words: schedules now run in your Cloudflare account and need its paid plan; any schedule you made before keeps running in Paseo until you delete it there; to move one, ask for it again with `/routine` and delete the old one in the Paseo app; nothing else needs doing, and Paseo still works as a place to chat.

## Risks / Trade-offs

- **[The subscription sign-in may not work in the container, or may not be allowed there]** → The trial tries it on a real account before anything publishes; the fallback is a pay-per-use key, already in the design, and the wording is cut to what worked.
- **[A full-permission agent runs unattended with credentials]** → Its reach is fixed by code: one repository, the memory key, named keys only, no Cloudflare user or deploy token, 30 minutes, no inbound access to the container. A test asserts the env list. The first-use confirm says full permissions in plain words, as `/routine` does today.
- **[A public address guards the routines]** → 256-bit key, constant-time compare, 404 for everything else, no route returns a secret. The Worker is absent until the first routine.
- **[A failed run is quiet]** → The list shows the last result, and a run that started leaves a memory thread. A run that never started (`needs-signin`) is seen only in the list; the wiki says to check `/routine` after renewing a subscription.
- **[Schedules now cost about $5 a month on GitHub installs]** → Said in the proposal, the README row, getting-started's costs, and the changelog; `/routine` says it before making anything.
- **[Bootstrap adds about a minute to each run and depends on npm]** → Versions are pinned in `run.mjs`; a failed bootstrap is its own result, distinct from a failed prompt.
- **[Two runner Workers on an Artifacts install]** → Kept separate on purpose: the check runner's SDK forbids extra secrets and write tokens, and a routine must never hold the deploy token the check runner has.
- **[One change holds three parts]** → The person chose it. The workspace and wording groups don't depend on the trial, so a failed trial sends back only the schedule groups, and is reported before anything publishes.
- **[Context baseline]** → `routine/SKILL.md` and `new-workspace.md` replace Paseo text with shorter text; `measure-context.mjs --check` runs in each skill task.

## Migration Plan

Installs take the update through `/wong-sync`: scripts and pages replace in place, `scripts/routine-runner/` arrives with the pack, and nothing in Cloudflare changes until a person asks for a routine. Paseo schedules are untouched. Rollback is the previous release; a runner already installed is removed by the teardown steps in `cloud-routines.md`.

## Open Questions

- Which container instance size keeps a typical `/improve` run inside 30 minutes at the lowest cost. Start with the check runner's size; the trial's timings decide, and no spec depends on it.
