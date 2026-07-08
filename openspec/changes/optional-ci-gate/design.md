## Context

The delivery mechanics already degrade gracefully without CI: `wait-for-checks.sh` prints `RESULT: NONE` when a repo reports no checks, and both `/save` (Step 4) and `/ship` (Step 4) treat `NONE` as "proceed." `README.md:66` already calls CI "optional." The problem is doctrine: several places assert CI as the *only* / *required* gate, contradicting the mechanics and the intended philosophy. This change is a coordinated wording pass — no logic changes — plus a release bump.

## Goals / Non-Goals

**Goals:**
- One consistent phrasing of the gate across the payload: **CI when present, else PR review; never a local build.**
- Name the durable pillars (PRs on any forge + version control + OpenSpec + repo-as-record) rather than CI.
- Keep the existing `NONE → proceed` mechanics; document them as the contract.

**Non-Goals:**
- No local-verify fallback.
- No forge-portability work — skills still use `gh` for PR mechanics; the doctrine is just worded forge-neutrally where natural.
- No change to the CI wait/auto-fix loop or merge steps.

## Decisions

**Canonical phrasings** (reuse verbatim so the payload reads as one voice):
- Gate: *"CI is the gate when the repo has checks; otherwise PR review is the gate. Either way, nothing builds locally."*
- Pillars: *"the plan and the record live in OpenSpec and the repo; delivery rides on pull requests (any forge) — CI is an optional accelerator, honored when present."*
- Replace "GitHub Actions is the build gate" / "CI is the only gate" / "GitHub Actions is the only gate" with the gate phrasing above, trimmed to fit each spot.

**Why keep `gh`/GitHub mechanics:** rewriting for GitLab/Gitea is a much larger change; the user's ask is the doctrine shift. Wording stays forge-neutral in doctrine, concrete (`gh`) in runbook steps.

**VERSION bump:** minor (`3.0.0 → 3.1.0`) — doctrine/wording shift, no breaking behavior change for existing green-CI repos.

## Risks / Trade-offs

- [A no-CI repo can merge unreviewed/broken code if the human skips review] → PR review is explicitly named as the gate; `/ship` still opens/updates a PR, so review is the natural checkpoint. Acceptable per the chosen "PR review only" gate.
- [Wording drift — some spot missed] → the tasks list enumerates every known location (grep-verified) so the pass is exhaustive; a final grep for the old phrases confirms none remain.
