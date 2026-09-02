---
name: verify
description: Verify the deployed preview end to end — the on-demand evidence verb. Matches each OpenSpec scenario to the strongest probe (browser journey, HTTP request, or state probe), runs /save for a preview URL, drives the journeys, grades evidence against each scenario's THEN, and posts it as a PR comment; unreachable scenarios are named, never dropped. Gates nothing — run it anytime, mid-change or before shipping. Use to verify the change, walk the app, see it working, test an API end to end, screenshot the UI, or get evidence onto the PR.
user-invocable: true
---

# /verify

Verification runbook. Invoking it authorizes the `/save` in Step 2 — the commit, push, and PR that come with it — the machine-level browser install in Step 3, the staging reset in Step 6, and the Access service-token mint in Step 4. Confirm anything outside this runbook.

`/verify` produces **evidence, on request**: the change's own OpenSpec scenarios exercised end to end against the deployed preview — through a real browser where the scenario is about UI, through direct HTTP requests or existing commands where it is not — graded against what those scenarios said would happen, with the evidence on the pull request.

It sits **outside** the loop (`/explore → /plan → /apply → /save → /continue → /ship`) rather than inside it — reach for it whenever you want to see the thing working. Mid-change, twice in a row, or right before `/ship`. There is no wrong moment and no limit.

## What `/verify` is not

- **Not a gate.** No verdict blocks a merge. `/ship` runs one walk for evidence and merges on CI-green regardless — except on `FAILURE`, where it asks the user to fix or merge anyway. See [the gate](../../../wiki/development/the-change-loop.md#the-gate).
- **Not a test suite.** Nothing is saved; coverage never accumulates. Regression tests belong in CI as real tests — a different and good decision, deliberately not this one.
- **Not a regression sweep.** It walks *this change's* scenarios, not the whole `openspec/specs/` surface, so its cost stays flat as the app grows.
- **Not a local run of the repo's code.** Every probe exercises the deployment CI already published. Nothing is compiled, installed into the repo, or executed from the working tree — a scenario only observable that way is reported as unverified, and its e2e home is a CI test.
- **Not stack-specific.** No vendor account, hosting provider, or language toolchain is required.

The full rationale, the engine choice, and the deliberately declined options live in [the runbook](../../../wiki/development/staging-walkthrough.md).

## Step 1 — scout first, before spending anything

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
```

**`RESULT: READY`** → scout the change's scenarios into candidate journeys now, per [§ a of the reference](references/walkthrough.md). This reads local files only — no push, no install, no network.

Match each scenario to the **strongest probe** that can observe it end to end against the deployed preview:

- **Browser journey** — the `THEN` is about something rendered. Driven with `agent-browser`.
- **Request probe** — the `THEN` is about the request path with no UI: an endpoint's status or body, a webhook, a redirect, a header. Driven as direct HTTP requests; no browser needed.
- **State probe** — the `THEN` is an effect an **existing** machine-level or stack-pack command can read from deployed state (for example: a triggering request, then a staging-database query). Never add tooling to the repo to make a scenario observable.

A scenario **no probe can reach** — no deployed surface, or observable only by building or executing the repo's code locally — is excluded and **listed by name** in the report as unverified. Excluding silently is how an unchecked assumption starts looking checked.

**No scenario reachable by any probe** → verdict `NONE`. Say in one line what was there instead and stop.

This order is the whole reason an unobservable change is cheap: `/save` and preflight are the expensive steps, and neither runs until at least one journey exists. The scout reads the same working tree `/save` is about to commit, so the journeys and the deployed commit describe the same change.

## Step 2 — /save

**Invoke the `save` skill** (via the Skill tool) and let it finish. It commits, pushes, opens or updates the PR, waits for CI, and returns the per-commit preview URL.

This ordering is load-bearing, not tidiness. **The preview alias only exists once CI has published *this* commit.** Verifying before that verifies the previous commit, or nothing. And never construct the URL by hand from a naming convention — a URL you built yourself can address a commit that was never deployed and still answer `200`.

`/verify` implements no git of its own; it delegates, the same way `/apply` hands completed work to `/save`.

## Step 3 — preflight

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight
```

Pass `--no-browser` when the scout produced **no browser journeys** — an all-probe walk needs no browser, so preflight skips the browser install and check rather than failing the walk over a tool it will not use.

**`RESULT: READY`** (prints `URL`, `RUN_DIR`, `SHA`, `BROWSER` — or `BROWSER=none (not needed)` — and `INSTALLED` when it installed something) → Step 4.

**`RESULT: UNKNOWN`** → the walk cannot run. Report it as **unverified** with the remedy the script named, and stop.

Preflight installs what it needs and then proves it works: `agent-browser doctor` launches a browser headlessly, so a green preflight means the walk *has* a browser rather than hoping for one. The install is **machine-level** — nothing is added to the repository, which is what lets a repo in any language walk. A **language runtime** is different and still asks first.

## Step 4 — verify, healing the block you can fix

**Follow [`references/walkthrough.md`](references/walkthrough.md)** — it owns how a walk is performed: writing the journeys (browser, request, and state probes alike), running them, and grading each against its written `THEN`. Come back here for what to do with the verdict.

One failure is neither the app's fault nor the user's errand, when you hold the credential that fixes it. Heal **once per invocation**, then walk again:

| The script says | What it means | Heal, then retry once |
|---|---|---|
| `BLOCK=access-challenge` (exit 3) | the preview sits behind Cloudflare Access and no service token is stored | With a Cloudflare API token: mint a service token named for this repo through the Access API, confirm the policy accepts it, and store the pair in the **primary worktree's** durable `.env` per [the secrets convention](../../../wiki/development/secrets.md). Widen into the Access groups first if the token lacks them — part of the same single heal. Stack-pack repos: [Access](../../../wiki/stack/cloudflare-access.md), [credentials](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized). |

The heal applies to browser journeys and request probes alike — the same service-token pair rides as browser headers on one and request headers on the other. It is pre-authorized where the token exists: the user pasting a token *is* the authorization to widen it. **With no Cloudflare token the heal is unavailable** — report `UNKNOWN` naming the Access wall and the missing credential, and never grade a login page as a rendered one. Say what you minted; never print or commit a credential value.

**If the block survives its retry → `UNKNOWN`**, naming what you attempted and what still failed. One heal and one retry — never a loop.

## Step 5 — post the evidence, on every verdict

Post the comment **whatever the verdict** — `SUCCESS`, `FAILURE`, `UNKNOWN`, or `TIMEOUT`. There is no merge being blocked that would otherwise carry the news, and a failed walk's evidence is the most useful thing this skill can put on a PR. § f of the reference owns the comment's shape and the screenshot publishing.

Say **each journey's probe and where it ran**. A walk driven on this machine depended on this machine, and the reader is entitled to know that. List every scenario the scout excluded as unverifiable **by name** — what was not checked must be as visible as what was.

One comment per invocation. Verifying again appends another rather than editing the first — the PR should carry an honest log of attempts.

## Step 6 — on FAILURE: reset, then fix in scope or stop

In a stack-pack repo, reset staging first — only on `FAILURE`, never on a pass:

```bash
npm run db:reset:staging
```

The reset isn't housekeeping: a walk that begins against the half-mutated database a failed walk left behind produces a *different* failure, and you end up debugging leftovers. A **passing** walk's data is left exactly where it is — staging is a fixture, not a preserve. A repo with no such command skips this and loses nothing else.

Then judge scope, and **say which way you judged it** in the report either way:

- **In scope** — the contradicted `THEN` belongs to this change's own scenarios *and* the fix plausibly lives in files this branch already touches. Fix the code, invoke `/save` (so the fix is pushed and gated normally), and verify again. **At most two fix attempts** per invocation; after that, report like any failure and stop.
- **Out of scope** — pre-existing behavior, infrastructure, or another capability's scenario. Report what failed and what to look at, then stop. Do not fix, re-push, or re-verify.

The bound is what keeps this from becoming a grinder. A walk that cannot fix its own change in two tries has found something worth a human reading it, and widening the change to chase an unrelated bug is how a walk quietly becomes a different change.

## Step 7 — report

- **Verdict**, how many journeys ran and by which probe, and **where the browser and probes ran**.
- The **PR comment link**.
- Anything **installed** (the browser CLI, its Chrome), **healed** (a service token minted), or **fixed** (each fix commit).
- Anything **unverifiable** and why, by scenario name — no deployed surface, or observable only by running the repo's code locally.
- On `UNKNOWN`, say plainly that the walk was **not verified**, and what would make it runnable.

## Verdicts

These describe what gets **reported**. None of them gates anything.

| Verdict | Meaning | What `/verify` reports |
|---|---|---|
| **NONE** | no scenario in this change is reachable by any probe | one line saying what was there instead |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset + fix-in-scope or stop |
| **UNKNOWN** | the walk could not run or could not be trusted, after any heal | **unverified** — the comment says so, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified** — what completed, and where it stopped |

**`UNKNOWN` is not `NONE`.** A walk that cannot run is *unverified*, not *absent*, and the report must use those words. It matters most in the Access case: without the check, a walk screenshots a login form and a reader skimming the comment sees "a page rendered." A block that survived its heal is still `UNKNOWN`, and the report names the heal that did not take.

**`NONE` never means "this repo did not opt in."** There is no opt-in: the browser is a machine-level tool the walk installs, so the only reason to report `NONE` is that this change has nothing any probe can reach.

## Hard rules

- **Install the tool, never a repo dependency.** The browser CLI and its Chrome install on the machine — and only when a browser journey exists. Nothing is added to `package.json`, no lockfile changes, and no manifest is created — that promise is what makes the walk stack-agnostic. Installing a **language runtime** still asks first.
- **Exercise the deployment, never the working tree.** No probe builds, installs, or executes the repo's own code locally. A scenario only observable that way is unverified, by name, in the report.
- **Wait after anything that navigates, before screenshotting.** A screenshot taken before the destination paints captures the *previous* page, and a grader reads it as evidence. Every navigating step gets an explicit wait — this is the single easiest way to produce a confidently wrong walk.
- **One heal and one retry; two fix attempts per walk.** No loop anywhere. A heal that does not take is `UNKNOWN`, not a second attempt.
- **Never print or commit a credential value.** A minted service token goes to the primary worktree's durable `.env` and nowhere else — not to a linked worktree, a note, a comment, or the report.
- **Never write inside the repo.** Journeys and evidence live in the temp run directory and leave with it. Run `cleanup` on **every** exit path — including stopping on `UNKNOWN` and pausing to ask the user a question.
- **Reset staging only after a failed walk**, and only where the repo has that command.
- **"No error was reported" is not a pass — and neither is a bare `200`.** A journey whose batch completed cleanly but whose screenshot lacks what the `THEN` requires **fails**; a request probe whose response answered `200` without showing what the `THEN` describes **fails**. That judgement is why the verdict is not in the script.
- **Genuinely ambiguous evidence stops and asks the user**, showing the evidence and the `THEN` side by side. Never resolve it in either direction alone.
- **Never merge, never archive.** That's `/ship`.
