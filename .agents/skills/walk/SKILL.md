---
name: walk
description: Walk the deployed staging preview in a real browser and show what the change actually does — the on-demand evidence verb. Runs /save first (push, wait for CI, resolve the per-commit preview URL), scouts the change's own OpenSpec scenarios into browser journeys, drives them with Playwright against a remote browser on Cloudflare Browser Run (reached with the pack's CLOUDFLARE_API_TOKEN — no local browser exists or is looked for), capturing a screenshot per step and a video per journey, grades each against the scenario's written THEN, and posts the evidence as a PR comment on every verdict. Gates nothing — /ship merges on CI alone — so run it as often as you like, mid-change or right before shipping. Use when you want to walk the app, see it working, check whether it looks right, watch the change in a browser, screenshot or record the UI, get browser evidence onto the PR, or confirm a change does what its scenarios promised. Opt-in and detected, never configured — playwright-core (or playwright) in the app's devDependencies is the entire consent. Stack-pack repos only. Never installs anything, never writes inside the repo, and never merges.
user-invocable: true
---

# /walk

Walk runbook. Invoking it authorizes the `/save` in Step 1 — the commit, push, and PR that come with it — and the staging reset in Step 5. Confirm anything outside this runbook.

`/walk` produces **evidence, on request**: the change's own OpenSpec scenarios driven through a real browser against the deployed preview, graded against what those scenarios said would happen, with screenshots and video on the pull request.

It sits **outside** the loop (`/explore → /plan → /apply → /save → /continue → /ship`) rather than inside it — reach for it whenever you want to see the thing working. Mid-change, twice in a row, or right before `/ship`. There is no wrong moment and no limit.

## What `/walk` is not

- **Not a gate.** No verdict blocks anything. `/ship` merges on CI-green alone and never consults a walk — see [the gate](../../../wiki/development/the-change-loop.md#the-gate).
- **Not a test suite.** Nothing is saved; coverage never accumulates. Regression tests belong in CI as real tests — a different and good decision, deliberately not this one.
- **Not a regression sweep.** It walks *this change's* scenarios, not the whole `openspec/specs/` surface, so its cost stays flat as the app grows.

The full rationale, the adoption rungs, and the deliberately declined options live in [the runbook](../../../wiki/stack/staging-walkthrough.md).

## Step 1 — /save first

**Invoke the `save` skill** (via the Skill tool) and let it finish. It commits, pushes, opens or updates the PR, waits for CI, and returns the per-commit preview URL.

This ordering is load-bearing, not tidiness. **The preview alias only exists once CI has published *this* commit.** Walking before that walks the previous commit, or nothing. And never construct the URL by hand from a worker-name convention — a URL you built yourself can address a commit that was never deployed and still answer `200`.

`/walk` implements no git of its own; it delegates, the same way `/apply` hands completed work to `/save`.

## Step 2 — preflight

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/walk/scripts/walk-staging.sh" preflight
```

**`RESULT: NONE`** → report in one line which case it is (this repo hasn't adopted the walkthrough, or it has and there's nothing browser-observable to walk) and stop. Nothing failed.

**`RESULT: READY`** (also prints `APP_DIR`, `URL`, `RUN_DIR`, `SHA`, `ACCOUNT_ID`) → Step 3.

Preflight verifies the walk's browser can be had — the browser is a Cloudflare Browser Run session, opened with the pack's `CLOUDFLARE_API_TOKEN`, never a binary on this machine. A missing token, a token that lists no accounts, or an endpoint refusal are each `UNKNOWN` with the remedy named (most commonly: re-run `/wong-cloudflare`, whose widen grants Browser Rendering Edit).

## Step 3 — walk and grade

**Follow [`references/walkthrough.md`](references/walkthrough.md)** — it owns how a walk is performed: scouting the change's scenarios, writing the journeys, running them, and grading each against its written `THEN`. Come back here for what to do with the verdict.

## Step 4 — post the evidence, on every verdict

Post the comment **whatever the verdict** — `SUCCESS`, `FAILURE`, `UNKNOWN`, or `TIMEOUT`. There is no merge being blocked that would otherwise carry the news, and a failed walk's screenshots are the most useful thing this skill can put on a PR. § f of the reference owns the comment's shape and the media publishing.

One comment per invocation. Walking again appends another rather than editing the first — the PR should carry an honest log of attempts.

## Step 5 — on FAILURE, reset staging, then stop

```bash
(cd "$APP_DIR" && npm run db:reset:staging)   # only on FAILURE, never on a pass
```

Then **stop**. Don't fix, don't re-push, don't re-walk — report what failed and what to look at. The user fixes and invokes `/walk` again.

The reset isn't housekeeping: a walk that begins against the half-mutated database a failed walk left behind produces a *different* failure, and you end up debugging leftovers. A **passing** walk's data is left exactly where it is — staging is a fixture, not a preserve.

## Step 6 — report

- **Verdict**, and how many journeys were walked.
- The **PR comment link**.
- Anything **not walkable** and why (queue consumers, cron triggers — a preview alias serves HTTP only).
- On `UNKNOWN`, say plainly that the walk was **not verified**, and what would make it runnable.

## Verdicts

These describe what gets **reported**. None of them gates anything.

| Verdict | Meaning | What `/walk` reports |
|---|---|---|
| **NONE** | not adopted, or nothing browser-observable | one line naming which |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset + stop |
| **UNKNOWN** | the walk could not run or could not be trusted | **unverified** — the comment says so, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified** — what completed, and where it stopped |

**`UNKNOWN` is not `NONE`.** Once a repo has adopted the walkthrough, a walk that cannot run is *unverified*, not *absent*, and the report must use those words. This no longer decides a merge — it's now about honest reporting, and it matters most in the Cloudflare Access case: without the check, a walk screenshots a login form and a reader skimming the comment sees "a page rendered." The script exits `UNKNOWN` on that challenge by name. The same honesty applies to the browser itself: a missing `CLOUDFLARE_API_TOKEN`, a token Browser Run refuses (never widened into Browser Rendering Edit — re-run `/wong-cloudflare`), or an exhausted plan budget (free: ~10 browser-minutes/day) are each *unverified infrastructure*, reported with the specific fix, never graded as a failing app.

## Hard rules

- **Never install anything** to make a walk run — not playwright-core, not a browser, not on a prompt. There is no browser to install anyway — it runs on Cloudflare Browser Run — and a missing dependency or credential is a statement about what the repo chose, or a condition to report.
- **Never write inside the repo.** Journeys, screenshots, and video live in the temp run directory and leave with it, so the working tree is unchanged whatever the verdict. Run `cleanup` on **every** exit path — including stopping on `UNKNOWN` and pausing to ask the user a question.
- **Reset staging only after a failed walk.** A passing walk leaves its data alone.
- **"No exception was thrown" is not a pass.** A journey whose script completed cleanly but whose screenshot lacks what the `THEN` requires **fails**. That judgement is why the verdict is not in the script.
- **Genuinely ambiguous evidence stops and asks the user**, showing the screenshot and the `THEN` side by side. Never resolve it in either direction alone.
- **Never merge, never archive.** That's `/ship`.
