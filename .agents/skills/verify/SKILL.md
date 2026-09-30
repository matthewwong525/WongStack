---
name: verify
description: Check the live preview end to end, grade the evidence, post it to the PR; also walks the app, tests an API, or screenshots.
user-invocable: true
---

# /verify

Show, with evidence from this commit's deployed preview, **whether the change does what its scenarios promise**, and name what you could not check. You choose how to probe each scenario: [the walkthrough reference](references/walkthrough.md) holds the tools and the grading bar, and [the staging walkthrough](../../../wiki/development/staging-walkthrough.md) the reasons. `/verify` runs any time, in any repo, and gates nothing.

Invoking `/verify` authorizes, without a prompt: `/save` with its commit, push, and PR; the machine-level browser install; the Access service-token mint; and the staging reset after a failure. Confirm anything else in [the shared ask format](../explore/references/asking-the-user.md).

## Order

Keep this order, so an empty walk costs nothing and the walk sees this commit:

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight   # --no-browser with no browser journey
```

1. **Scout.** Pick the change by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs) `explicit` (including the archive path `/ship` passes), `session`, `changed-active`, `recorded-branch`, then `changed-archive`; if you ask, list each candidate's scenarios. On `scout-check`'s `READY`, match the scenarios to probes by [§ a](references/walkthrough.md#a--scout-the-scenarios), reading local files only. Nothing reachable → `NONE` in one line saying what was there instead; stop.
2. **Save, then preflight.** Invoke the `save` skill and let it finish; then `preflight`. `UNKNOWN` → report **unverified** with its remedy; stop.
3. **Walk, grade, and post** by [§§ b–f](references/walkthrough.md#b--write-the-journeys): one comment on every verdict.
4. **On `FAILURE`**, reset staging in a stack-pack repo (`node "$ROOT/scripts/reset-staging-d1.mjs"`), then judge scope by [§ e](references/walkthrough.md#e--after-a-failure). In scope → fix, `/save`, and walk again, **at most twice**. Out of scope → report what failed and stop.
5. **Report** the verdict, each journey's probe and **where it ran**, the comment link, anything **installed**, **healed**, or **fixed** (each fix commit), your scope judgement, and each **unverifiable** scenario with why. On `UNKNOWN`, say it was **not verified** and what would make it runnable. Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step): ship it, fix what the walk found, or walk again. Inside `/ship`, return the verdict instead.

## When a block stops the walk

Heal one block **once per invocation**, then walk again. **`BLOCK=access-challenge` (exit 3)** means Cloudflare Access with no stored service token. With a Cloudflare API token, mint a service token named for this repo through the Access API (widening into the Access groups first if needed), confirm the owned app’s separate machine policy accepts it without changing human permissions, and store the pair in the **primary worktree's** durable `.env` ([secrets](../../../wiki/development/secrets.md); [Access](../../../wiki/stack/cloudflare-access.md), [credentials](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). The heal is pre-authorized and covers request probes too. Machine walks do not prove email login; privacy changes need a separate real human login and revocation check. **No Cloudflare token** → `UNKNOWN`, naming the Access wall and the missing credential. Say what you minted; never print or commit a credential value, or store it anywhere else.

A block that survives its retry → `UNKNOWN`, naming what you tried.

## Plain checks

A screenshot, a request, or a click through the app with no change behind it skips the scout. Probe the address the person names, in a run folder from `mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX"`; with none, save and `preflight`, and report a missing preview as not checked. Show the evidence in the chat, post nothing unless asked, and run `cleanup`.

## Verdicts

| Verdict | Meaning | What `/verify` reports |
|---|---|---|
| **NONE** | no scenario reachable by any probe | one line on what was there instead |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset + fix-in-scope or stop |
| **UNKNOWN** | the walk could not run or be trusted, after any heal | **unverified**, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified**: what completed, where it stopped |

[`UNKNOWN` is not `NONE`](../save/references/git-gate.md#2--wait-for-checks-auto-fix-on-failure) ([why](../../../wiki/development/staging-walkthrough.md#the-verdicts)).

## Hard rules

- **Install the tool, never a repo dependency**: [`agent-browser`](../agent-browser/SKILL.md) and its Chrome go on the machine, only for a browser journey. A **language runtime** asks first.
- **Exercise the deployment, never the working tree**: [no local execution, no invented tooling](../../../wiki/development/staging-walkthrough.md#what-it-is-not).
- **Never write inside the repo.** Run `cleanup` on **every** exit, including a stop on `UNKNOWN` and a pause to ask.
- **Never merge or archive**: that's `/ship`.
