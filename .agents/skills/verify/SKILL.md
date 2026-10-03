---
name: verify
description: Complete safe checks of the live preview, grade and post evidence, then group any needed login, permission, or manual checks; also tests APIs or screenshots.
user-invocable: true
---

# /verify

Check **this deployed commit's scenarios**. Finish safe checks and simulations before one handoff offering help or skipping. [The reference](references/walkthrough.md) owns how; [the wiki](../../../wiki/development/staging-walkthrough.md) owns why. Gates nothing.

`/verify` authorizes `/save`, machine browser installation, the Access heal below, and [disposable staging checks](references/walkthrough.md#a--scout-the-scenarios). Failure-only seed resets require [§ e](references/walkthrough.md#e--after-a-failure)'s isolation checks. Other permissions join the handoff; existing authorization stands.

## Order

Scout before spending; walk this commit:

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight   # --no-browser without browser journeys
```

1. **Scout.** Select by [the rungs](../save/references/checkpoint-evidence.md#selection-rungs): `explicit` (including `/ship`'s archive), `session`, `changed-active`, `recorded-branch`, `changed-archive`; selection asks name candidates' scenarios. On `READY`, read local files and match probes/dependencies by [§ a](references/walkthrough.md#a--scout-the-scenarios). Nothing reachable → `NONE`; name exclusions and stop.
2. **Save, then preflight.** Finish `/save`, then `preflight`. Browser unavailable → retry `--no-browser` for independent request/state probes. Missing preview → unverified; never guess a URL. With no `RUN_DIR`, make a temp report folder. List blocked scenarios in the handoff.
3. **Walk and grade** by [§§ b–f](references/walkthrough.md#b--write-the-journeys). Blocks pause only dependents. Finish independent safe checks before repairs.
4. **On `FAILURE`**, safely restore test data and judge scope by [§ e](references/walkthrough.md#e--after-a-failure). In scope → fix, `/save`, walk again, **at most twice**. Out of scope → report without fixing.
5. **Simulate, post, report** by [§ f](references/walkthrough.md#f--post-the-evidence-then-clean-up), with installs/heals/fix commits and scope judgement. Close with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step). Inside `/ship`, return the verdict.

## When a block stops the walk

Heal **once per invocation**; retry blocked journeys and dependents only. Keep completed inputs outside `journeys/` on retries: the driver runs every input there.

**`BLOCK=access-challenge` (exit 3)** means Cloudflare Access with no stored service token. With a Cloudflare API token, mint a repo-named service token through the Access API (widen into Access groups if needed), confirm the owned app's machine policy accepts it without changing human permissions, and store the pair only in the **primary worktree's** `.env` ([secrets](../../../wiki/development/secrets.md); [Access](../../../wiki/stack/cloudflare-access.md); [authorized widen](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). This covers request probes too. Name the mint; never print or commit credentials. Machine access does not prove email login: privacy changes need real human login and revocation checks in the final handoff.

No token or surviving block → unverified. Name missing credentials or attempted repairs in the handoff.

## Plain checks

A named screenshot, request, or click-through skips scout. Use its address and `mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX"`; otherwise save and `preflight`. Same safety/handoff rules. Fetch past pictures with `verify-staging.sh pictures <pr>`. Show evidence, post only if asked, then `cleanup`.

## Verdicts

| Verdict | Meaning | Report |
|---|---|---|
| **NONE** | no scenario reachable | what was there instead |
| **SUCCESS** | no contradiction or blocked reachable check | evidence, including each [partly shown](references/walkthrough.md#d--grade-against-the-written-expectation) claim |
| **FAILURE** | evidence contradicts a `THEN` | evidence, safe cleanup, fix only in scope |
| **UNKNOWN** | reachable check blocked or ambiguous | unverified, why and needed help |
| **TIMEOUT** | budget exceeded | unverified, what completed and where it stopped |

FAILURE takes precedence, then TIMEOUT, then UNKNOWN; inherently unobservable claims stay partly shown. [`UNKNOWN` is not `NONE`](../save/references/git-gate.md#2--wait-for-checks-auto-fix-on-failure) ([why](../../../wiki/development/staging-walkthrough.md#the-verdicts)).

## Hard rules

- **Machine tools only**: [`agent-browser`](../agent-browser/SKILL.md) and Chrome only for browser journeys. A **language runtime** asks first; never add repo dependencies.
- **Deployment only**: [no local execution or invented tooling](../../../wiki/development/staging-walkthrough.md#what-it-is-not).
- **Keep journeys and evidence outside the repo.** `cleanup` on **every** exit, including UNKNOWN and a handoff.
- **Never merge or archive**: `/ship` owns that.
