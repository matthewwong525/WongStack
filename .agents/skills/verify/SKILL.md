---
name: verify
description: Verify the deployed preview end to end: probe each OpenSpec scenario, grade the evidence, and post it to the PR. Gates nothing. Use to verify a change, walk the app, test an API, or screenshot the UI.
user-invocable: true
---

# /verify

Verification runbook. Invoking it authorizes, without a prompt, the `/save` in Step 2 with its commit, push, and PR, the machine-level browser install in Step 3, the Access service-token mint in Step 4, and the staging reset in Step 6. Confirm anything outside this runbook, in [the shared ask format](../explore/references/asking-the-user.md).

`/verify` produces **evidence, on request**: the change's own OpenSpec scenarios exercised against the deployed preview, graded against their `THEN`, and posted on the pull request. It sits beside [the change loop](../../../wiki/development/the-change-loop.md#verifying-the-app), runs at any moment, and gates nothing. [The staging walkthrough](../../../wiki/development/staging-walkthrough.md) owns why it works this way and what it deliberately is not; [the walkthrough reference](references/walkthrough.md) owns how a walk is performed.

## Step 1 — scout first, before spending anything

Select the change by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit` (including the exact archive path `/ship` hands off), `session`, `changed-active`, `recorded-branch`, then `changed-archive` for a manual walk after archive. When you ask, give each candidate with the scenarios it would walk.

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
```

**`RESULT: READY`** → scout the change's scenarios into journeys, per [§ a of the reference](references/walkthrough.md#a--scout-the-scenarios): match each to its strongest probe (browser journey, request probe, or state probe), and list each scenario no probe reaches by name as unverified. This reads local files only.

**No scenario reachable by any probe** → verdict `NONE`. Say in one line what was there instead and stop.

## Step 2 — /save

**Invoke the `save` skill** and let it finish. It commits, pushes, opens or updates the PR, waits for CI, and returns the per-commit preview URL. `/verify` implements no git of its own.

## Step 3 — preflight

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight
```

Pass `--no-browser` when the scout produced **no browser journeys**, so preflight skips the browser install and check.

**`RESULT: READY`** (prints `URL`, `RUN_DIR`, `SHA`, `BROWSER` — or `BROWSER=none (not needed)` — and `INSTALLED` when it installed something) → Step 4.

**`RESULT: UNKNOWN`** → the walk cannot run. Report it as **unverified** with the remedy the script named, and stop.

## Step 4 — verify, healing the block you can fix

**Follow [the walkthrough reference](references/walkthrough.md)** to write, run, and grade the journeys. Come back here for what to do with the verdict.

Heal one block **once per invocation**, then walk again:

| The script says | What it means | Heal, then retry once |
|---|---|---|
| `BLOCK=access-challenge` (exit 3) | the preview sits behind Cloudflare Access and no service token is stored | With a Cloudflare API token: mint a service token named for this repo through the Access API, confirm the policy accepts it, and store the pair in the **primary worktree's** durable `.env` per [the secrets convention](../../../wiki/development/secrets.md). Widen into the Access groups first if the token lacks them, as part of the same heal. Stack-pack repos: [Access](../../../wiki/stack/cloudflare-access.md), [credentials](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized). |

The heal applies to browser journeys and request probes alike. It is pre-authorized where the token exists. **With no Cloudflare token the heal is unavailable**: report `UNKNOWN` naming the Access wall and the missing credential. Say what you minted; never print or commit a credential value, and never store it outside the primary worktree's `.env`.

**If the block survives its retry → `UNKNOWN`**, naming what you attempted and what still failed.

## Step 5 — post the evidence, on every verdict

Post one comment per invocation **whatever the verdict**, in the shape [§ f of the reference](references/walkthrough.md#f--post-the-evidence-then-clean-up) gives. Verifying again appends another comment.

## Step 6 — on FAILURE: reset, then fix in scope or stop

In a stack-pack repo, reset staging first, only on `FAILURE`:

```bash
npm run db:reset:staging
```

Then judge scope by [§ e of the reference](references/walkthrough.md#e--after-a-failure), and **say which way you judged it** in the report:

- **In scope** → fix the code, invoke `/save`, and verify again. **At most two fix attempts** per invocation; then report like any failure and stop.
- **Out of scope** → report what failed and what to look at, then stop. Do not fix, re-push, or re-verify.

## Step 7 — report

- **Verdict**, how many journeys ran and by which probe, and **where the browser and probes ran**.
- The **PR comment link**.
- Anything **installed** (the browser CLI, its Chrome), **healed** (a service token minted), or **fixed** (each fix commit).
- Anything **unverifiable** and why, by scenario name.
- On `UNKNOWN`, say plainly that the walk was **not verified**, and what would make it runnable.

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) the verdict calls for: ship it, fix what the walk found, or walk again after a change. A walk inside `/ship`'s chain returns its verdict and lets the chain continue.

## Verdicts

These describe what gets **reported**. None of them gates anything.

| Verdict | Meaning | What `/verify` reports |
|---|---|---|
| **NONE** | no scenario in this change is reachable by any probe | one line saying what was there instead |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset + fix-in-scope or stop |
| **UNKNOWN** | the walk could not run or could not be trusted, after any heal | **unverified** — the comment says so, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified** — what completed, and where it stopped |

**`UNKNOWN` is not `NONE`.** Report a walk that cannot run as *unverified*, and name any heal that did not take. `NONE` means only that this change has nothing any probe can reach; there is no opt-in.

## Hard rules

- **Install the tool, never a repo dependency.** The browser CLI, [`agent-browser`](../agent-browser/SKILL.md), and its Chrome install on the machine, and only when a browser journey exists. Nothing is added to `package.json` or a lockfile. Installing a **language runtime** still asks first.
- **Exercise the deployment, never the working tree.** No probe builds, installs, or executes the repo's own code locally, and no tooling is added to the repo to observe a scenario.
- **Never write inside the repo.** Journeys and evidence live in the temp run directory. Run `cleanup` on **every** exit path, including a stop on `UNKNOWN` and a pause to ask the user.
- **Never merge, never archive.** That's `/ship`.
