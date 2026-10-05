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
