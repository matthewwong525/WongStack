---
name: verify
description: Check previews or CI behavior, report results and remaining help; also tests APIs or screenshots.
user-invocable: true
---

# /verify

Check **this saved revision's scenarios**; finish safe checks/simulations before one help/skip handoff. [Reference](references/walkthrough.md): how; [wiki](../../../wiki/development/staging-walkthrough.md): why. Gates nothing.

Authorized: `/save`, browser installation, the Access heal and disposable staging checks. Seed resets require FAILURE and [§ e](references/walkthrough.md#e--after-a-failure) isolation. Existing authorization stands; other permissions join the handoff.

## Order

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight
```

1. **Scout.** [Rungs](../save/references/checkpoint-evidence.md#selection-rungs): `explicit` (including `/ship`'s archive), `session`, `changed-active`, `recorded-branch`, `changed-archive`. Asks name candidates' scenarios. READY → match probes/recipes/consumers by [§ a](references/walkthrough.md#a--scout-the-scenarios); nothing reachable → NONE, name exclusions and stop.
2. **Save, prepare independently.** `/save`, then `preflight`; no browser journeys → `--no-browser`. CI-only/missing preview → `--no-preview --no-browser`, then [collect](references/ci-evidence.md). Blocks pause dependents; never guess URLs. Recheck head before posting; changes require fresh evidence.
3. **Walk/grade** by [§§ b–f](references/walkthrough.md#b--write-the-journeys); finish independent safe checks before repairs.
4. **FAILURE** → restore data safely; [judge scope](references/walkthrough.md#e--after-a-failure). In scope → fix, `/save`, re-walk **at most twice**; otherwise report. Consumers grant no repair scope.
5. **Simulate/report** by [§ f](references/walkthrough.md#f--post-the-evidence-then-clean-up); one report covers surfaces/retries, heals/fixes/installs and scope/limits. [Next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step); inside `/ship`, return the verdict.

## When a block stops the walk

Heal **once per invocation**; retry dependents only. Move completed inputs outside `journeys/` to avoid replay.

**BLOCK=access-challenge (exit 3)**: with a Cloudflare API token, mint a repo-named service token; widen groups if needed. Confirm the owned app's machine policy accepts it; preserve human permissions. Store the pair in **primary worktree** `.env` only ([secrets](../../../wiki/development/secrets.md), [Access](../../../wiki/stack/cloudflare-access.md), [authorized widen](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). Name the mint; never print/commit credentials. Privacy changes need human login/revocation checks; machine access proves no email login.

No token/surviving block → unverified; name credentials/repair gaps.

## Plain checks

Named screenshot/request/click-through: skip scout, use its address and `mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX"`; otherwise save/preflight. Same safeguards/handoff. Past pictures: `verify-staging.sh pictures <pr>`. Show evidence; post only if asked; `cleanup`.

## Verdicts

| Verdict | Meaning | Report |
|---|---|---|
| **NONE** | no scenario reachable | what was there instead |
| **SUCCESS** | no contradiction or blocked reachable check | evidence, including each [partly shown](references/walkthrough.md#d--grade-against-the-written-expectation) claim |
| **FAILURE** | evidence contradicts a `THEN` | evidence, safe cleanup, fix only in scope |
| **UNKNOWN** | reachable check blocked or ambiguous | unverified, why and needed help |
| **TIMEOUT** | budget exceeded | unverified, what completed and where it stopped |

Precedence: FAILURE, TIMEOUT, UNKNOWN; inherently unobservable claims stay partly shown. [`UNKNOWN` is not `NONE`](../save/references/git-gate.md#2--wait-for-checks-auto-fix-on-failure) ([why](../../../wiki/development/staging-walkthrough.md#the-verdicts)).

## Hard rules

- [`agent-browser`](../agent-browser/SKILL.md)/Chrome only for browser journeys. New probe runtimes ask first; bundled collector authorized. No repo dependencies.
- Saved-source previews/validated CI captures; [no local repo execution/invented tooling](../../../wiki/development/staging-walkthrough.md#what-it-is-not). Read-only recipes; written expectations judge.
- Keep journeys/evidence outside the repo; `cleanup` on **every** exit, including UNKNOWN/handoff.
- Never merge/archive: `/ship` owns that.
