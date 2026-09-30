---
name: verify
description: Check the live preview end to end, grade the evidence, post it to the PR; also walks the app, tests an API, or screenshots.
user-invocable: true
---

# /verify

Invoking `/verify` authorizes, without a prompt: Step 2's `/save` with its commit, push, and PR; Step 3's machine-level browser install; Step 4's Access service-token mint; and Step 6's staging reset. Confirm anything else in [the shared ask format](../explore/references/asking-the-user.md).

`/verify` produces **evidence, on request**, any time, and gates nothing. [The staging walkthrough](../../../wiki/development/staging-walkthrough.md) owns why; [the walkthrough reference](references/walkthrough.md) owns how.

## Step 1 — scout first, before spending anything

Select the change by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit` (including the exact archive path `/ship` hands off), `session`, `changed-active`, `recorded-branch`, then `changed-archive` for a manual walk after archive. If you ask, list each candidate's scenarios.

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
```

**`RESULT: READY`** → scout the scenarios into journeys by [§ a](references/walkthrough.md#a--scout-the-scenarios), reading local files only. **No scenario reachable by any probe** → verdict `NONE`: say in one line what was there instead, and stop.

## Step 2 — /save

**Invoke the `save` skill** and let it finish; it returns the per-commit preview URL. [Git stays with the git verbs](../../../wiki/development/the-change-loop.md).

## Step 3 — preflight

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight
```

Pass `--no-browser` when the scout found **no browser journeys**. **`RESULT: READY`** → Step 4. **`RESULT: UNKNOWN`** → report **unverified** with the script's remedy, and stop.

## Step 4 — verify, healing the block you can fix

**Follow [the walkthrough reference](references/walkthrough.md)** to write, run, and grade the journeys.

Heal one block **once per invocation**, then walk again. **`BLOCK=access-challenge` (exit 3)** means Cloudflare Access with no stored service token. With a Cloudflare API token, mint a service token named for this repo through the Access API (widening into the Access groups first if needed), confirm the owned app’s separate machine policy accepts it without changing human permissions, and store the pair in the **primary worktree's** durable `.env` ([secrets](../../../wiki/development/secrets.md); [Access](../../../wiki/stack/cloudflare-access.md), [credentials](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). The heal is pre-authorized and covers request probes too. Machine walks do not prove email login; privacy changes need a separate real human login and revocation check. **No Cloudflare token** → `UNKNOWN`, naming the Access wall and the missing credential. Say what you minted; never print or commit a credential value, or store it anywhere else.

**A block that survives its retry → `UNKNOWN`**, naming what you tried and what still failed.

## Step 5 — post the evidence, on every verdict

Post one comment **whatever the verdict**, shaped by [§ f](references/walkthrough.md#f--post-the-evidence-then-clean-up).

## Step 6 — on FAILURE: reset, then fix in scope or stop

In a stack-pack repo, reset staging first:

```bash
node "$ROOT/scripts/reset-staging-d1.mjs"
```

Then judge scope by [§ e](references/walkthrough.md#e--after-a-failure), and **report which way you judged**:

- **In scope** → fix the code, invoke `/save`, and verify again; **at most two fix attempts** per invocation, then report and stop.
- **Out of scope** → report what failed and what to look at, and stop: no fix, re-push, or re-verify.

## Step 7 — report

Give the **verdict**, journeys run by probe, **where the browser and probes ran**, the **PR comment link**, anything **installed**, **healed**, or **fixed** (each fix commit), and each **unverifiable** scenario by name with why. On `UNKNOWN`, say plainly the walk was **not verified**, and what would make it runnable.

Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) the verdict calls for: ship it, fix what the walk found, or walk again after a change. Inside `/ship`, return the verdict instead.

## Verdicts

| Verdict | Meaning | What `/verify` reports |
|---|---|---|
| **NONE** | no scenario reachable by any probe | one line on what was there instead |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset + fix-in-scope or stop |
| **UNKNOWN** | the walk could not run or be trusted, after any heal | **unverified**, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified**: what completed, where it stopped |

[`UNKNOWN` is not `NONE`](../save/references/git-gate.md#2--wait-for-checks-auto-fix-on-failure): report it as *unverified*, naming any heal that did not take ([why](../../../wiki/development/staging-walkthrough.md#the-verdicts)).

## Hard rules

- **Install the tool, never a repo dependency.** [`agent-browser`](../agent-browser/SKILL.md) and its Chrome install on the machine, only for a browser journey; nothing goes into `package.json` or a lockfile. A **language runtime** still asks first.
- **Exercise the deployment, never the working tree**: [no local execution, no invented tooling](../../../wiki/development/staging-walkthrough.md#what-it-is-not).
- **Never write inside the repo**; journeys and evidence live in the temp run directory. Run `cleanup` on **every** exit path, including a stop on `UNKNOWN` and a pause to ask.
- **Never merge or archive**: that's `/ship`.
