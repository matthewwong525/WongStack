# Host schedules

A schedule starts agreed work later: a morning routine, a weekly report, a timed background job, or a task that ends when its goal is met. [`/schedule`](../../.agents/skills/schedule/SKILL.md) first checks whether a script can do the work, then saves the schedule in your company app after your OK.

## Script or routine

Prefer predictable code on an existing timed-job facility: an export, a fixed report, or a reminder that checks an invoice and sends an agreed message only while unpaid. A script can contain a narrow model call. Use an assistant session when each run must interpret changing information or choose its next step. Any new code follows [the change loop](../development/the-change-loop.md), including a [staging manual trigger](staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them).

## Where a schedule lives

Every schedule lives in your company app's database, in one list for each person. The app keeps what it does, when it runs, whether it is on, its progress, and every run. No schedule file goes in the repo, so a new or changed schedule needs no publish: you ask in a chat, and it is saved in seconds.

Each schedule belongs to the person who made it. You see, change, and run only yours, under your own [company sign-in](../development/memory.md#sign-in-and-expiry). The owner can make one schedule for everyone: each teammate then gets their own copy, which they approve and can pause for themselves. The owner can not see a teammate's copy after that.

You see your schedules in the Inbox's *Schedules* list, and in any chat through `/schedule`. You make or change one only in a chat.

## The OK on each computer

Your computer runs only a version of a schedule that you approved on that computer. The version is a fingerprint of what the schedule does, where it runs, what it may do, and when it ends. A change to the instructions, the folder, the allowed actions, how often it may run, or its end makes a new version. A change of time does not.

1. You ask: *check the orders every weekday at 9*.
2. The chat shows what the schedule will do and asks for your OK.
3. Your yes saves it in the app and notes that exact version as approved on this computer, in `~/.wong-stack/helper/approved.json`.

The approval stays on the computer, not in the app, because the app must not be the one that says what is approved. Someone who breaks into the app can change a schedule's text, but your computer then refuses it as *not approved*. A tap in the Inbox can not approve, because a break-in could send a tap too.

So a schedule changed somewhere else, a team copy, or any schedule on a new computer waits for your OK in a chat on that computer. The Inbox shows it as *Needs your OK*, with the computer's name. On a computer two people share, each person's OKs are kept apart.

The chat shows the app's text as a quote. It never acts on that text; only your answer approves it.

## Where it runs

The host is the clock that starts each run, independently of which model you use. New schedules add no cloud runner or model key.

- **Your company app's clock comes first** when this computer has [the helper](live-line.md#the-helper) running. At the due time the app says *look now* down [the live line](live-line.md). Your computer reads the schedule from the app and starts it only if its version matches the run and your approval. The app sends no prompt; your computer builds it.
- **Otherwise an existing host clock**: a Codex session inside Paseo can use Paseo's clock.

A schedule runs in one of two ways:

- **Chat:** it opens a new workspace in the schedule's folder, in a chat app that can open one, Paseo today.
- **Background:** the helper hands it to [the daily worker](../development/daily.md), which runs it with no chat, inside the worker's limits. An optional check can find that there is nothing to do; the run then shows as *Nothing to do*.

On the app's clock a run starts at most once. A run due while the computer is off starts once when it's back, if it is still in time, and otherwise shows as *Missed*. A morning routine stays in time until the end of its day; a weekly or monthly one set to catch up stays in time until its next run. A run your computer took but never reported shows as not started after 2 minutes and never goes again. Your computer also refuses a run it already started, and starts one schedule no more often than its `authority.minIntervalMs`, or every 10 minutes when that is unset ([its limits](live-line.md#what-it-carries)). Nothing runs while every computer is off. A chat run has no one there to allow a step, so it opens in its provider's full mode unless its `run.mode` says otherwise; its instructions and `authority` set what it may do. The assistant checks the actual tools and account before it offers a mode; a product's documentation alone does not prove this account can run it.

Before it saves a schedule, the chat reports the time zone, due time or cadence, working folder, model settings, required connections, and what must stay on. A loop tied to this chat cannot promise a fresh session after it closes.

**Memory follows where it runs.** A local schedule uses the person's own [company sign-in](../development/memory.md#sign-in-and-expiry), so it stops with a warning when that sign-in ends. Before it saves, the chat checks that the schedule can reach memory from where it will run.

## Goals with an end

Work with a finish line is a schedule with an end. Its plan names the completion source: for example, the invoice's payment status. Each run checks that source before any outreach. When a run proves the goal is met, it ends the schedule with its evidence: the schedule stops and a waiting run is cancelled. A one-time task with no goal ends when its run starts. Ended schedules sit under *Ended* in the Inbox. Saving the instructions does not mark the goal met.

## How a run works

Each fresh session reads the schedule's instructions and progress from the app, checks the version against your approval again, takes the progress claim, and then acts within your agreed scope. A changed version, an ended schedule, a missing folder, or revoked access blocks the run, and the Inbox shows why. A pending goal stays scheduled after the session ends. A successful ongoing routine keeps its next run.

Automatic contacting requires an agreed recipient, channel, message purpose, frequency, and end condition. It also requires saved progress that prevents overlapping sends. After an uncertain send, the next run checks the service's receipt; it waits for help if the result cannot be resolved. A schedule never grants itself permission to call, pay, refund, or publish code.

## When it needs your answer

When a call would help, the assistant offers it through a verified question surface and waits. One pending question and its deferred action survive later sessions. The dependent follow-up pauses; silence and elapsed time are never consent. Offering a call does not place one. Answer the identified question or use `/schedule resume` to continue within the agreed scope.

## Manage a schedule

In the Inbox's *Schedules* list you can pause, resume, run now, or cancel a waiting run, and tap a schedule to see its last ten runs and its instructions. In a chat, `/schedule` also lists, inspects, changes, approves, and ends your schedules. A change saves a new version, so it waits for your OK on each computer that runs it. A failed or uncertain change is inspected before a retry.

## Existing schedules

At the update that moves schedules into the app, the assistant moves your old ones right after the update is live: the routines in your daily settings file, the team's routines, timed background jobs, and the `schedules/` files in the repo. It approves each one on your computer, because you approved it when you saved it in the repo. It shows two that look like the same job and asks which to keep. Then it removes the old lists in a small save. Run twice, it moves nothing twice. A teammate's routines move on their own computer, at their next chat.

A Paseo schedule stays in Paseo until you ask to move it. `/schedule move` pauses the Paseo copy and reads it back, saves the app's copy and reads it back, then deletes the Paseo copy. A failure in between leaves Paseo paused and the move pending, never both running. Updates do not move a cloud job, rewrite its prompt, delete secrets, or remove cloud resources. [Legacy migration and teardown](legacy-cloud-schedules.md) explains how to inspect older jobs and move one without duplicate follow-ups.

Back to [the Cloudflare stack](README.md), or [development](../development/README.md).
