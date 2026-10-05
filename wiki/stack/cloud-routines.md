# Cloud routines

A routine is a prompt on a schedule that runs in your own Cloudflare account, with your computer off. You make one with [`/routine`](../../.agents/skills/routine/SKILL.md), from any app your assistant runs in. This page says how a run works, what it costs, what a run is given, its limits, and how to remove it all.

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

1. **Your first routine installs the runner.** Setup adds nothing for routines. The first `/routine` shows what it adds and asks, then installs one Worker, `<base>-routines`, from [`scripts/routine-runner/`](../../scripts/routine-runner/worker.mjs) with the pack's own pinned tools. It holds the list of routines, their clock, and the short-lived computer. When the project lives on GitHub, [your token widens itself](cloudflare-credentials.md#how-two-permission-rows-become-enough) by `Workers Containers Write` and `Billing Read` first.
2. **You give the assistant a sign-in once**, through [the private key link](../development/secrets.md#receive-a-key-through-a-private-link), never in chat. It is kept in your `.env` and in your Cloudflare account, filed under your git email. [The secrets page](../development/secrets.md#api-token-website-steps) says how to make each kind.
3. **The clock starts a run** at the routine's time, in its timezone. A run gets a new computer, a fresh copy of the project's latest `main`, and a new assistant: Claude Code or Codex, whichever made the routine.
4. **The assistant reads a fixed notice, then your prompt word for word.** The notice says nobody can answer: take the recommended option, mark it assumed, and leave anything for you as a [memory](../development/memory.md) thread, which your next chat shows.
5. **The run ends and its computer is deleted.** What stays is what the run saved to the project, its memory, and its result.

`/routine` alone lists every routine with its next run and last result. `/routine logs <name>` shows the last 200 lines of the latest run's output, with every key's value replaced by its name.

| Last result | It means |
|---|---|
| `ok` | The assistant finished. |
| `failed` | The assistant ended with an error. Read the log. |
| `timed-out` | The run reached 30 minutes and was stopped. |
| `skipped` | The run before it was still going, so this one never started. |
| `needs-signin` | The sign-in is missing or was refused. [Renew it](#renew-a-sign-in). |
| `needs-project-access` | The runner can't reach the project. [Give it the project key again](#renew-a-sign-in). |
| `bootstrap-failed` | The computer could not copy the project or install the assistant. The log says which. |
| `lost` | The run was never heard from again. The next one starts as usual. |

## What it costs

Cloudflare's **Workers Paid plan, about $5 a month**. The short-lived computer is a [Cloudflare container](https://developers.cloudflare.com/containers/pricing/), which runs only on that plan. The plan includes an allowance of computer time; use beyond it is billed by Cloudflare. On a free account `/routine` says so, gives the cost, and adds nothing. An install on [the Artifacts route](artifacts-route.md#what-it-costs) already has the plan.

The assistant's own use is billed by its maker: your Claude subscription, or pay per use with Anthropic or OpenAI.

## What a run gets

The runner's code fixes a run's reach. Its prompt can't widen it.

| A run gets | From |
|---|---|
| The assistant sign-in of the person who made the routine | their `.env`, sent by `routine.mjs signin` |
| This one project, to read and to save to | Cloudflare: a key made for the run, good for an hour. GitHub: `WONG_ROUTINE_GITHUB_TOKEN`, a token for this one repository |
| The memory key | this install's `.env`, sent when the runner is installed |
| The keys its routine names with `--keys` | `.env`, sent when the routine is made |

A run never gets your Cloudflare token or the publishing key, so it can publish only by saving through the project's normal checks. Nothing outside can reach its computer.

**A run acts as the person who made the routine.** It runs on their sign-in and its commits carry their name. Its memory is filed under the computer that installed the runner, since [a memory key answers only its own installation](../development/memory-key.md).

**The routines key guards the list.** The first `/routine` makes `WONG_ROUTINES_KEY` and saves it in `.env` and in the runner. Whoever holds it can list and change this install's routines. Every other request gets the same answer as an address that does not exist, and no answer carries a key's value.

## The limits

- **A run can't ask you anything.** It takes the safe choice, says it assumed, and leaves you a note.
- **30 minutes a run.** A run still going is stopped and listed as `timed-out`.
- **One run per routine at a time.** A tick that arrives during a run is listed as `skipped`.
- **Two computers at once.** A third run waits its turn.
- **No browser logins.** A run can't use logins saved on your computer, or sign in to your company app as you.
- **A run that never started is quiet.** `needs-signin` shows only in the list, so check `/routine` after you renew a subscription.
- **Each routine keeps its last 10 results**, and an install holds 50 routines.
- **Schedule from a computer that holds this install's keys.** Another computer needs the same `.env`.
- **Schedules made in Paseo stay in Paseo.** `/routine` no longer lists or changes them. Make each again with `/routine`, then delete the old one in the Paseo app.

## Renew a sign-in

A sign-in can expire or be revoked. Its routines then list `needs-signin` and start no assistant. Ask your assistant to renew it: it sends the key link for a new value, then runs `routine.mjs signin --agent <claude|codex>`, which replaces the stored one. Run the routine once to check.

The project key of a GitHub install renews the same way: a new `WONG_ROUTINE_GITHUB_TOKEN` through the key link, then `routine.mjs setup` again. Setup is safe to repeat. It also updates the runner after a WongStack update.

## Tear it down

Removal is asked for by name and can't be undone. After [the stack's teardown](getting-started.md#teardown) lists and confirms, delete, with the same user token, what the first routine made:

1. The runner: `DELETE /accounts/{account_id}/workers/scripts/<base>-routines?force=true`. Its list of routines, every stored sign-in and key, and its address go with it.
2. Its container application and its Workflow, which outlive it: `DELETE /accounts/{account_id}/containers/applications/<id>` for the application named `<base>-routines`, and `DELETE /accounts/{account_id}/workflows/<base>-routines`.
3. On this computer: the `WONG_ROUTINES_KEY` and `WONG_ROUTINE_*` lines in `.env`, `components.routines` in `.claude/.wong-stack.json`, and `scripts/routine-runner/wrangler.jsonc`.
4. At each service: revoke the tokens you made for routines, since deleting the runner does not end them.

Read each one back as gone. **Left behind:** the two permissions the token gained, which you can [narrow back](cloudflare-credentials.md#narrowing-back). Nothing else in the account is touched: a name that does not match this install is skipped and named.

Back to [the Cloudflare stack](README.md).
