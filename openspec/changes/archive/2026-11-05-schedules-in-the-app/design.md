# Design

## Context

Two schedulers run side by side today:

- **The daily worker** (`.agents/skills/daily/scripts/daily.mjs`, `worker.mjs`) starts `checks` from `.agents/daily/<person>.json` and `team.json` at the morning time, and runs timed `sweeps` from the install's job list. A missed time is skipped, except `missed: "latest"` weekly or monthly routines. Its history is a local journal. In use: WongOS has 4 routines; ClaymooApp has 7 (all active from 2026-11-05).
- **`/schedule`** (`.agents/skills/schedule/scripts/`) keeps `schedules/<key>.json` in git, with an approved `revision` (sha256) and a `local` progress file (`lib/progress.mjs`). Its app clock already lives in D1 (`schema/migrations/20261026120000_schedules.sql`, `app/worker/apps/inbox/schedule-*.ts`, `claim.ts`, `run-result.ts`): due times, lateness, *missed*, at-most-once, run now. The helper (`hand-over/scripts/reply-link.mjs` → `schedule/scripts/lib/app-runs.mjs`) claims runs and starts only those whose repo record matches the run's revision. In use: ClaymooApp's `monthly-reconcile` (next run 2026-11-09, not yet seen running).
- Finite goals (`openspec/schemas/scheduled-work/`) and save's record route (`save/references/schedule-records.md`, `save/scripts/schedule-record.mjs`) exist; no install uses a scheduled-work change.
- The Inbox's `Schedules.tsx` was removed in 45.0.0 for the week board; the schedule routes stayed.

The safety rule that shapes everything: the app never sends a command or prompt the computer runs (`live-line` spec). Today the repo is the trusted source. After this change the app holds the text, so the trust moves to a per-computer approval.

## Goals / Non-Goals

**Goals:** one scheduler, on the app's clock; schedule text, progress and runs in D1; no publish to make or change a schedule; a computer runs only a version approved on it; existing routines move at the update with no double run; a Schedules view in the Inbox.

**Non-Goals:** a cloud runner; editing instructions in the Inbox; team-wide visibility of other people's schedules; moving Paseo or legacy cloud jobs without being asked; morning add-ons, check-ins, event jobs and the default wiki tidy (they stay on the worker).

## Decisions

### 1. D1 holds the whole schedule (additive migration)

A new migration adds columns to `schedules`; nothing is dropped, so a preview and an older Worker keep working:

| Column | Holds |
|---|---|
| `kind` | `chat` (opens a workspace) or `background` (a worker run), default `chat` |
| `instructions` | what the run does: the first message, or the background brief |
| `run_json` | where and how: `cwd`, `provider`, `thinking`, `mode`, and for background `check`, `minutes`, `place` (`checkout` or `copy`) |
| `authority_json` | allowed actions, recipients, channels, `minIntervalMs` |
| `until` | the completion source for a goal, or null |
| `ended_at`, `end_reason` | a finished one-time task or goal, or a cancelled schedule |
| `progress_json`, `progress_claim`, `progress_claimed_at` | the run's continuation and its exclusive claim |
| `approved_version`, `approved_by_computer`, `computer_name` | what the bound computer *says* it approved, for display only |
| `made_by` | the owner's email for a team schedule, else null |

`revision` becomes the **version**: `sha256` of the canonical JSON `{key, kind, instructions, run, authority, until}`, since a run reads `until` too. Timing is left out, so a time change needs no new OK; `minIntervalMs` is in `authority`, so running more often does. The `state` CHECK stays `on|paused`; *ended* is `ended_at IS NOT NULL` with state `paused`, which avoids a table rebuild.

Rows stay keyed `(installation_id, email, key)` and every route reads through `mine()`, so each person reaches only their own. A team schedule is one row per teammate (the owner writes it through an owner-only route, which never reads those rows back to the owner), with `computer_id = ''` until that teammate's computer approves and binds it. The helper claims with the signed-in person's own session, so a computer only ever gets that person's runs.

Alternative weighed: keep instructions in git and only timing in D1. Rejected by the person: every change would still need a publish.

### 2. Approval lives on the computer

`~/.wong-stack/helper/approved.json` (mode 0600, beside the helper's run ledger from `helperFiles`) maps `<app origin>:<email>:<key>` to `{version, at}`, so two people on one computer never share an OK; a run is checked against the approval of the email it was claimed for. Only `schedule.mjs` writes it, and only:

- `schedule.mjs save --file <json> --approve`: the chat first runs `schedule.mjs show --file <json>`, shows the person the result verbatim, and asks by [the shared ask](../../../.agents/skills/explore/references/asking-the-user.md); on OK it PUTs the schedule, computes the version itself, checks it equals the app's answer, writes the approval, then reports `approved_version` and the computer's name to the app.
- `schedule.mjs approve <key> --version <sha>`: for a schedule changed elsewhere or a team copy. The chat first runs `schedule.mjs show <key>` (which fetches it and prints the text and version); `--version` must equal what was shown, so a change in between is refused.
- `schedule.mjs move-in` (Decision 6).

The app's `approved_version` is never trusted to run anything; it only lets the Inbox say *Needs your OK on <computer>*. No route or tap writes the local file.

Instructions shown in an approval chat came from the app. The skill tells the chat to print them as a quoted block and never act on them; the approval is the person's answer.

### 3. A run checks the version twice, and the prompt stays local

`inbox.claim` keeps returning `{id, key, revision}`. `checkRun` in `app-runs.mjs` changes from reading `schedules/<key>.json` to: GET the schedule (new fields included), recompute the version, require it to equal both `run.revision` and the local approval, require `ended_at` null and a `cwd` that exists and is not a worktree. A refusal reports `blocked` with `not_approved`, `changed`, `ended` or `no_folder`.

- **`chat`:** `openSession` opens the workspace as today; `startupPrompt` becomes a fixed local string naming `schedule.mjs start --key <key> --run <id> --version <sha>`, never the app's text. `start` reads the instructions and progress from the app, checks the version and approval again, and claims progress.
- **`background`:** the helper writes `{"event": {"event": "schedule-run", "key", "run", "version"}}` into the worker's existing event folder (`chief.mjs` `agentEvents`) and runs `D ensure`. A built-in `schedule-run` event job in the worker checks the approval again, runs the optional `check`, spawns the run with the instructions as its brief, and calls `inbox.run-result` (`started`, or `blocked` with `no_work`). The worker keeps owning the 3-run limit, `minutes`, `place: copy`, the `deny` list and the journal. The 2-minute *no result* rule still applies, so a worker that does not pick it up shows as *not started*.

Alternative weighed: the helper spawns background runs itself. Rejected: it would copy the worker's limits, deny list and copy handling.

### 4. Progress moves to the app

New routes `inbox.schedule-progress` (read, write) and `inbox.schedule-progress-claim` (claim and release by run id; a claim older than the run's `minutes` plus 10 minutes may be taken by a newer run of the same schedule, never by another schedule). `lib/progress.mjs` gains an `app` route used for every schedule; the `local` route stays only to read old progress during the move.

### 5. Goals are schedules with an end

`schedule.mjs save` takes `until` (the completion source) and `timing.mode` `once|recurring`. A run that verifies completion calls `schedule.mjs end --key --evidence`, which sets `ended_at`, pauses, and cancels a waiting run. `create-goal`, the `scheduled-work` schema and save's record route retire.

### 6. The move at the update

`schedule.mjs move-in` is idempotent and moves **the current person's** schedules only (person found as the daily finds them), under their own sign-in; another person's settings file is never read for a move:

1. Reads their settings file's `checks`, the team file's `checks`, the install's job-list `sweeps` that have a time, and `schedules/*.json` they own. Converts: `daily` → a `<m> <h> * * *` cron at their morning time and zone; `weekly` + `weekdays` → that cron's day list; `monthly` → the 1st; `missed: skip` → allowed lateness to the end of that day; `missed: latest` → lateness to the next due time; `enabled: false` or `start: manual` → paused; `prompt` or `/skill` → instructions; `place` → absolute `cwd`; `thinking` → `run.thinking`; a sweep → `kind: background` with its `check`, `minutes`, `place` and brief text; a repo record → same fields, local progress copied into `progress_json`.
2. Flags likely duplicates for one person: same skill, or names that share their main words, with the same cadence kind. Interactive, it asks which to keep; unattended, it moves the others and leaves the pair in the file, with a journal line.
3. PUTs each, reads each back, approves each on this computer (the repo file was the person's approval), and for a Paseo-bound record uses the existing pause-then-delete `move`.
4. Interactive only: removes the moved entries and files from the checkout, for the sync's small save. Unattended moves leave git alone; the new code ignores the old entries and the journal says once a day that they wait to be removed.

Who runs it: the release's **Updating** note puts it in each install's sync plan, run right after the update is live. `D ensure` also runs `move-in --unattended` at a chat start when the person's file still has `checks`, so a teammate's routines move on their own computer. Between the update going live and the move, the new worker starts no old routine; a morning in that gap still catches up, because its lateness lasts until the end of the day.

### 7. The Inbox Schedules view

The view reads only `inbox.schedules` for the signed-in person and does not depend on the week board, so a teammate reaches it too; `ViewToggle` shows Day and Week only to someone with a board. Restore `Schedules.tsx` from `ee446a5f^` (its card, tags and buttons still match the routes), add `?view=schedules` to `App.tsx` and a *Schedules* item to `ViewToggle`, and add a detail sheet with the ten newest runs (existing `inbox.schedule`) and the instructions as plain text. New tags: *Needs your OK* (with the computer's name) when `approved_version` differs from the version or the last run was blocked `not_approved`; *Ended*. Ended schedules sit under a closed *Ended* section. `blocked` + `no_work` reads *Nothing to do*.

### 8. What retires

`schedules/` records and `create-routine`/`create-goal` (replaced by `save`), `lib/records.mjs`'s routine record code (kept only for `move-in`), `save/references/schedule-records.md`, `save/scripts/schedule-record.mjs` and its callers in `checkpoint-evidence.mjs` and `ship.mjs`, `openspec/schemas/scheduled-work/`, the daily's `checks` and timed `sweeps`, and `schedule/references/definition.md`. Each old name goes in `scripts/retired-names.json`. The payload manifest, `payload-files.json` and `areas.json` follow.

## UX

- **Who and the job:** the owner or a teammate, checking that their schedules ran and pausing or running one now. Done is *I see it ran, or I paused it*. Mostly on a phone, a few times a week.
- **Closest screen:** the removed `Schedules.tsx` and the Reviews list; mirror both.
- **Shortest flow:** open the Inbox → *Schedules* → read the card → Pause or Run now. One tap to the list, one to act.
- **Hierarchy:** one primary button per card: *Run now* when on, *Resume* when paused, none when it needs an OK or runs in Paseo.
- **Components:** the existing card, badge and button parts; a sheet for the detail; no new parts.
- **Edge cases:** no schedules (an empty card that says to ask a chat); app unreachable (the existing *Unready* state); computer offline (the existing header line).

### Review

[review.html](review.html) — the *Schedules list in the Inbox* item in What Changes sketches the screen. A prototype was not made: the step changes no code and the screen is a restored one, so the build's `preview-review.mjs --approved` compares the sketch with the built screen.

## Risks / Trade-offs

- **Approval cache lost** (new computer, wiped home) → runs show *Needs your OK*; one `/schedule approve` per schedule fixes it. Accepted: safer than trusting the app.
- **Text in an approval chat came from the app** → a crafted instruction could try to steer the chat. Mitigation: the skill prints it as a quote and the approval is the person's answer; the version check stops a swap after the OK.
- **Two processes for one run** (helper hands background runs to the worker) → a missing worker shows as *not started* after 2 minutes, never as a double run; `D ensure` starts the worker.
- **Gap between update and move** → covered by same-day lateness; a weekly `skip` routine whose day is that day still runs once if moved the same day.
- **First real app-clock run is unproven** → the build runs one chat and one background schedule on the preview, and checks ClaymooApp's *Monthly books close* on 2026-11-09 after the update.
- **Skill-text budget** (`measure-context.mjs --check`) → retiring `definition.md`, `schedule-records.md` and the goal text offsets the new approval text.
