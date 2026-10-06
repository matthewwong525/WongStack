# Cloud routines

A routine is an assistant on a schedule that runs in your own Cloudflare account, with your computer off. You make one with [`/routine`](../../.agents/skills/routine/SKILL.md), from any app your assistant runs in. This page says when a schedule is a script instead, how a run works, which model it uses, what it costs, what a run is given, its limits, and how to remove it all.

## Script or routine

Scheduled work takes one of two shapes. The test is **who decides the steps**, not whether AI is used.

| | Script | Routine |
|---|---|---|
| Steps | the same every run | the assistant decides |
| AI | one model call at most | an assistant |
| Runs in | your app | a short-lived cloud computer |
| Example | a nightly export | find news, `/improve` |
| Cloudflare | free | paid plan, about $5 a month |

- **Fixed steps become a script.** `/routine` says so and makes no routine. It builds the script into your app the usual way: a plan, a preview, then *publish it?* ([the change loop](../development/the-change-loop.md)). A step may still call an AI model, such as *summarise these five emails*. Nothing new is installed.
- **Work that finds its own way gets a routine.** The assistant searches, reads, and chooses as it goes, so it needs a computer to work in.

`/routine` says which it picked before it makes anything. Say *use a routine anyway* to change it.

## How a routine runs

```text
 /routine every weekday at 9: /improve
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

1. **Your first routine installs the runner.** Setup adds nothing for routines. The first `/routine` shows what it adds and asks. Then it installs one Worker, `<base>-routines`, from [`scripts/routine-runner/`](../../scripts/routine-runner/worker.mjs) with the pack's own pinned tools. The Worker holds the list of routines, their clock, and the short-lived computer. Setup also makes one AI Gateway of the same name and a key for it. [Your token widens itself](#the-permissions-it-adds) first, where it lacks a permission.
2. **You pick a model once.** The first routine [asks which](#pick-a-model-through-cloudflare). Every routine in this install uses it.
3. **The clock starts a run** at the routine's time, in its timezone. A run gets a new computer and a fresh copy of the project's latest `main`.
4. **The computer sets up its tools.** It installs the assistant, [Pi](https://pi.dev)'s command-line one, and OpenSpec from the runner's own locked list, so every run gets the same files. Each result shows how long this start took.
5. **The assistant reads a fixed notice, then your prompt word for word.** The notice says nobody can answer: take the recommended option, mark it assumed, and leave anything for you as a [memory](../development/memory.md) thread, which your next chat shows. A prompt that starts with a verb, such as `/improve`, is told to read that skill's own file and follow it.
6. **The run ends and its computer is deleted.** What stays is what the run saved to the project, its memory, and its result.

`/routine` alone lists every routine with its next run and last result. `/routine logs <name>` shows the last 200 lines of the latest run's output, with every key's value replaced by its name.

| Last result | It means |
|---|---|
| `ok` | The assistant finished. |
| `failed` | The assistant ended with an error. Read the log. |
| `timed-out` | The run reached 30 minutes and was stopped. |
| `skipped` | The run before it was still going, so this one never started. |
| `needs-model` | No model is picked. [Pick one](#pick-a-model-through-cloudflare). |
| `needs-model-key` | The runner holds no key for the model in use. [Paste it again](#or-paste-your-own-key), or pick a model. |
| `model-refused` | The model's service refused the request: a key that ended, or no credit left. Pick or paste again. |
| `needs-project-access` | The runner can't reach the project. [Give it the project key again](#renew-a-key). |
| `bootstrap-failed` | The computer could not copy the project or install its tools. The log says which. |
| `lost` | The run was never heard from again. The next one starts as usual. |

## Pick a model through Cloudflare

Your first routine asks which model to use, from a short list with one recommended. Ask for the full list to see the rest. The model is reached through Cloudflare's own AI service, with the sign-in you already have. You paste no key, and Cloudflare bills its use.

- **Models Cloudflare runs itself**, such as Kimi and GLM, are billed as Workers AI use. The recommended pick is one of them.
- **Claude and GPT models need credit** loaded in your Cloudflare account. Without it Cloudflare answers *402 Insufficient wholesale credits*, and `/routine` keeps the model you had.

`/routine` tests your pick with one small request before it uses it. A refused pick changes nothing: routines keep the model they had, and the reply says why. Ask any time to change the model.

## Or paste your own key

A key you already pay for works too: a Z.ai Coding Plan subscription, Anthropic, OpenAI, Google, OpenRouter, and others. Ask your assistant for the key link and paste one key, [never in chat](../development/secrets.md#receive-a-key-through-a-private-link).

```text
paste a key ─▶ whose? ─▶ test ─▶ in use
                 │ unknown  │ refused
                 ▼          ▼
            asks which   says why,
            service      keeps the old one
```

1. **The assistant works out whose key it is** from its shape. These it recognises: Anthropic, OpenRouter, OpenAI, Google, Groq, xAI, Z.ai, DeepSeek, and Moonshot AI. When the shape fits none, it asks which service.
2. **It tests the key with one small request**, sent from your own Cloudflare account. A refused key is stored nowhere.
3. **It stores the key in your Cloudflare account** and tells you which service and model your routines now use. Say which model you want when the default doesn't suit.

Paste another key to replace it. Ask to remove it, and routines return to your Cloudflare pick. One install holds one model key.

**The service's own terms apply.** A subscription key runs here from a cloud computer, not from your own. Check that your plan allows it; [Z.ai's terms](https://z.ai) cover its Coding Plan.

## What it costs

Cloudflare's **Workers Paid plan, about $5 a month**. The short-lived computer is a [Cloudflare container](https://developers.cloudflare.com/containers/pricing/), which runs only on that plan. The plan includes an allowance of computer time; use beyond it is billed by Cloudflare. On a free account `/routine` says so, gives the cost, and adds nothing. An install on [the Artifacts route](artifacts-route.md#what-it-costs) already has the plan. Scripts stay free.

The model is billed by whoever runs it: Cloudflare for a pick through its AI service, or the service whose key you pasted.

## What a run gets

The runner's code fixes a run's reach. Its prompt can't widen it.

| A run gets | From |
|---|---|
| The model's key | A Cloudflare pick: a key setup made that can only run models. A pasted key: yours, under its service's own name |
| This one project, to read and to save to | Cloudflare: a key made for the run, good for an hour. GitHub: `WONG_ROUTINE_GITHUB_TOKEN`, a token for this one repository |
| A memory key of its own | Made for runs when the runner is installed. It reads and adds the project's shared notes, never your private facts or chats |
| The keys its routine names with `--keys` | `.env`, sent when the routine is made |

A run never gets your Cloudflare token or the publishing key, so it can publish only by saving through the project's normal checks. Nothing outside can reach its computer.

**A run acts as the person who made the routine.** Its commits carry their name.

**Runs hold their own memory key, not yours.** Your memory key never leaves your computer: on the owner's it reads every fact and chat. Setup makes an id for the runner, issues it a [member key](../development/memory-key.md#add-or-remove-a-teammate) labelled `routine runs`, sends that key to the runner, and deletes the private file it came in. The id is recorded as `components.routines.memoryMachine`, and a run's notes are filed under it. A member key reads and adds shared notes only, so a run's note shows in your next chat and no private fact reaches a run. Setup issues a new key only when the runner no longer holds one.

An install with no memory store, or whose Cloudflare token can't issue memory keys, gets a to-do instead. Its runs still work, and leave their notes in the result.

**The routines key guards the list.** The first `/routine` makes `WONG_ROUTINES_KEY` and saves it in `.env` and in the runner. Whoever holds it can list and change this install's routines. Every other request gets the same answer as an address that does not exist, and no answer carries a key's value.

## The permissions it adds

The first routine [widens your token](cloudflare-credentials.md#how-two-permission-rows-become-enough) by what it lacks of the first table, and makes a key with the second. The ids are read from the live API; the script looks each group up by name.

### What the first routine adds to your token

| Name | Scope | For | Id |
|---|---|---|---|
| `Workers Containers Write` | account | the short-lived computer | `bdbcd690c763475a985e8641dddc09f7` |
| `Billing Read` | account | reading the account's plan | `7cf72faf220841aabcfdfab81c43c4f6` |
| `AI Gateway Write` | account | making the AI Gateway | `6c8a3737f07f46369c1ea1f22138daaf` |
| `AI Gateway Run` | account | running a model through it | `644535f4ed854494a59cb289d634b257` |
| `Workers AI Read` | account | running Cloudflare's own models | `a92d2450e05d4e7bb7d0a64968f83d11` |

### The model-only key

Setup makes this key for the runner. A run holds it, so it can run a model and change nothing in your account.

| Name | Scope | Id |
|---|---|---|
| `AI Gateway Run` | account | `644535f4ed854494a59cb289d634b257` |
| `Workers AI Read` | account | `a92d2450e05d4e7bb7d0a64968f83d11` |

## The limits

- **A run can't ask you anything.** It takes the safe choice, says it assumed, and leaves you a note.
- **About 10 seconds to start, then minutes.** The computer, a copy of the project, and the tools are ready in about 10 seconds. On Cloudflare's own models a small task then takes 1 to 3 minutes, and one that searches memory and leaves a note can take 10.
- **30 minutes a run.** A run still going is stopped and listed as `timed-out`.
- **One run per routine at a time.** A tick that arrives during a run is listed as `skipped`.
- **Two computers at once.** A third run waits its turn.
- **No browser logins.** A run can't use logins saved on your computer, or sign in to your company app as you. A sign-in that needs a browser, such as a ChatGPT plan, can't run a routine.
- **A run that never started is quiet.** A result like `needs-model-key` shows only in the list, so check `/routine` after a key ends.
- **Each routine keeps its last 10 results**, and an install holds 50 routines.
- **Schedule from a computer that holds this install's keys.** Another computer needs the same `.env`.
- **Schedules made in Paseo stay in Paseo.** `/routine` no longer lists or changes them. Make each again with `/routine`, then delete the old one in the Paseo app.

## Renew a key

A model key can end or be revoked. Its routines then list `model-refused` and do no work. Ask your assistant to replace it: it sends the key link for a new value, tests it, and stores it. Run the routine once to check.

The project key of a GitHub install renews the same way: a new `WONG_ROUTINE_GITHUB_TOKEN` through the key link, then `routine.mjs setup` again. Setup tests the token first: one that can read the project but not save to it is kept on your computer, and setup says to make one with Contents and Pull requests set to Read and write. Setup is safe to repeat. It also updates the runner after a WongStack update.

## Tear it down

Removal is asked for by name and can't be undone. After [the stack's teardown](getting-started.md#teardown) lists and confirms, delete, with the same user token, what the first routine made:

1. The runner: `DELETE /accounts/{account_id}/workers/scripts/<base>-routines?force=true`. Its list of routines, every stored key, and its address go with it.
2. Its container application and its Workflow, which outlive it: `DELETE /accounts/{account_id}/containers/applications/<id>` for the application named `<base>-routines`, and `DELETE /accounts/{account_id}/workflows/<base>-routines`.
3. Its AI Gateway and the model-only key: `DELETE /accounts/{account_id}/ai-gateway/gateways/<base>-routines`, and `DELETE /accounts/{account_id}/tokens/<id>` for the token named `<base>-routines-ai`.
4. The runs' memory key, which deleting the runner does not end: `node .claude/skills/memory/scripts/memory.mjs member remove <id>`, with the id in `components.routines.memoryMachine`. `member list` shows it as revoked.
5. On this computer: the `WONG_ROUTINES_KEY` and `WONG_ROUTINE_*` lines in `.env`, `components.routines` in `.claude/.wong-stack.json`, and `scripts/routine-runner/wrangler.jsonc`.
6. At each service: revoke the model key and the GitHub token you made for routines, since deleting the runner does not end them.

Read each one back as gone. **Left behind:** the permissions the token gained, which you can [narrow back](cloudflare-credentials.md#narrowing-back). Nothing else in the account is touched: a name that does not match this install is skipped and named.

Back to [the Cloudflare stack](README.md).
