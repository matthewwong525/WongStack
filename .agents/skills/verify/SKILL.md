---
name: verify
description: Check previews or CI behavior, report results and remaining help; also tests APIs or screenshots.
user-invocable: true
---

# /verify

Check fresh scenarios on the exact saved revision. [Reference](references/walkthrough.md): how; [wiki](../../../wiki/development/staging-walkthrough.md): why. Gates nothing.

Authorized: needed `/save` (kept checks' too), browser install, Access heal, staging preparation and § a's writes; other permissions join the handoff.

## Order

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" scout-check
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" preflight
```

1. **Scout** the change this chat or the caller named, else the branch's own, archived included ([rungs](../save/references/checkpoint-evidence.md#selection-rungs)). Asks name candidates' scenarios. READY → match probes/recipes/consumers by [§ a](references/walkthrough.md#a--scout-the-scenarios); nothing reachable → NONE, name exclusions and stop.
2. **Bind.** Run `node "$ROOT/.claude/skills/save/scripts/saved-revision.mjs"` with the caller's `--checkpoint <file>`. NEEDS_SAVE → `/save`; SAVED → reuse its matching receipt or read the existing [gate](../save/references/git-gate.md#saved-revision-handoff). UNKNOWN → unverified. Never save to find out, edit records, or rerun settled checks: each starts another round of checks. **Prepare independently.** Then `preflight` (allow 12 minutes for the staging turn); no browser journeys → `--no-browser`. `SEEDED=no` beside a `TURN` line → staging-data checks unverified, with its reason; report `TURN=unavailable`. CI-only/missing preview → `--no-preview --no-browser`, then [collect](references/ci-evidence.md). A blocked or failed prerequisite pauses only its dependents; never guess URLs: one can answer for a commit never deployed. Recheck head before posting; changes require fresh evidence.
3. **Walk/grade** by [§§ b–f](references/walkthrough.md#b--write-the-journeys); finish independent safe checks before repairs. Inside `/ship`, add [kept checks](references/walkthrough.md#g--kept-checks).
4. **FAILURE** → [judge scope](references/walkthrough.md#e--after-a-failure). In scope → collect failures, fix once, `/save`, `preflight`, repeat affected checks **at most twice**; retain independent evidence only with unchanged dependencies; otherwise report.
5. **Simulate/report** by [§ f](references/walkthrough.md#f--post-the-evidence-then-clean-up); one report covers surfaces/retries, heals/fixes/installs and scope/limits. Ask [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) with the question tool; inside `/ship`, return the verdict.

## When a block stops the walk

Heal **once per invocation**, never on `BLOCK=not-own-site`; retry dependents only.

**BLOCK=access-challenge (exit 3)**: mint a repo-named service token with the Cloudflare API token, widening if needed. Confirm the preview app's machine policy accepts it; keep human permissions. Store it as `CF_ACCESS_STAGING_CLIENT_ID`/`SECRET` in the primary worktree's `.env` only ([secrets](../../../wiki/development/secrets.md), [Access](../../../wiki/stack/cloudflare-access.md), [authorized widen](../../../wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)). Name the mint; never print/commit credentials. Privacy changes need human login/revocation checks; machine access proves no email login.

No token/surviving block → unverified; name credentials/repair gaps.

## Plain checks

Named screenshot/request/click-through: skip scout, use its address and `mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX"`; otherwise bind/preflight. Same safeguards/handoff. Past pictures: `verify-staging.sh pictures <pr>`. Show evidence; post only if asked; `cleanup`.

## Verdicts

| Verdict | Meaning | Report |
|---|---|---|
| **NONE** | no scenario reachable | what was there instead |
| **SUCCESS** | no contradiction or blocked reachable check | evidence, including each [partly shown](references/walkthrough.md#d--grade-against-the-written-expectation) claim |
| **FAILURE** | evidence contradicts a `THEN` | evidence, fix only in scope |
| **UNKNOWN** | reachable check blocked or ambiguous | unverified, why and needed help |
| **TIMEOUT** | budget exceeded | unverified, what completed and where it stopped |

Precedence: FAILURE, TIMEOUT, UNKNOWN. [`UNKNOWN` is not `NONE`](../save/references/git-gate.md#2--wait-for-checks-auto-fix-on-failure) ([why](../../../wiki/development/staging-walkthrough.md#the-verdicts)).

## Hard rules

- [`agent-browser`](../agent-browser/SKILL.md)/Chrome only for browser journeys. New probe runtimes ask first; bundled collector authorized. No repo dependencies.
- Saved-source previews/validated CI captures; [no local repo execution/invented tooling](../../../wiki/development/staging-walkthrough.md#what-it-is-not). Read-only recipes; written expectations judge.
- Keep journeys/evidence outside the repo, bar `/ship`'s kept checks; `cleanup` on **every** exit, including UNKNOWN/handoff.
- Never merge/archive: `/ship` owns that.
