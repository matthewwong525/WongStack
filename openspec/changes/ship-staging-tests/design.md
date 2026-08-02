## Context

`/ship` has three gates today: the default branch's own CI must be green, the branch's checks must pass, and — where no checks exist — a human must have reviewed the PR. All three answer *did it build and did the checks pass*. None answers *does the change do what it said it would*.

Two pieces already exist and have never been connected:

```
  openspec/changes/<slug>/specs/**        the change's promise, as WHEN/THEN,
                                          written by /plan before any code
  cf-deploy.sh --env staging              every branch deployed to a real
   + versions upload --preview-alias      Worker, with a per-commit HTTP URL
  save/scripts/preview-url.sh             ...which /save already discovers
```

The change turns the first into a walkthrough of the second, immediately before the merge.

**What the environment actually supports** (probed, not assumed — the `2026-08-01-staging-worker-env` rehearsal set the precedent that a payload change's assumptions are worth executing once):

- Playwright 1.61.1, two chromium builds and `ffmpeg` are present in a working Claude Code environment. A context opened with `recordVideo` produced screenshots and a `.webm` on the first try. **Video is free.**
- There is **no Playwright MCP server**. Live click-by-click browser driving by the agent is not available, so the walk is script-driven even though the *verdict* is not.
- **GitHub renders inline media in a comment only for `user-attachments` URLs**, which are produced by dragging a file into the web UI. There is no `gh` or REST path to that endpoint. Anything else is a link.

Constraints inherited from the repo: editing the payload is a release; `/ship` must stay a runbook rather than grow a testing engine; `CLAUDE.md`'s "never build/test locally" rule is load-bearing and must be narrowed deliberately rather than quietly bent.

## Goals / Non-Goals

**Goals:**
- Answer "does this work for a person" once per change, at the last moment it is still cheap to be wrong.
- Cost nothing — not latency, not a warning, not a line of output — for repos that did not opt in.
- Make the gate capable of saying no. A walk that always passes is worse than no walk, because it converts an unchecked assumption into a checked-looking one.
- Reuse what exists: the preview-URL helper, the check-result vocabulary, `db:reset:staging`, the Access service-token convention, `schema/seed.sql`.

**Non-Goals:**
- A regression suite. Nothing is saved; coverage does not accumulate.
- Fast feedback during implementation — that is `/save`'s territory and this deliberately stays out of it.
- Testing anything off the request path. A version alias serves HTTP; queues and crons run on the deployed Worker.
- Isolated per-PR environments. Declined in `2026-08-01-staging-worker-env` and not reopened.

## Decisions

### Consent is `playwright` in devDependencies, not a manifest field

Modeled directly on Cloudflare Access, which has **no manifest field at all**: it is adopted by taking it (a policy plus the Worker code change, together), documented in a runbook, and detected from state. The same shape applies here, and the install *is* the adoption.

- *Alternative: `components.shipWalkthrough` in the manifest.* Rejected — a new field is absent from every existing repo's manifest, so `/wong-sync` would have to migrate and offer it, and the field would then have to stay truthful against a `playwright` that may have been removed. The dependency is the fact; a flag would be a second copy of the fact that can disagree with it.
- *Alternative: detect capability (a browser exists) rather than consent.* Rejected — capability is not permission, and this gate can block a merge.

The payoff is that the objection "every downstream repo inherits a slower, flakier `/ship`" simply does not arise. They inherit nothing until they type the install.

### The walk is script-driven; the verdict is not

The original intent was an agent clicking through like a person. With no browser MCP available, the achievable shape keeps the part that matters:

```
   scout ──▶ journeys ──▶ throwaway script drives ──▶ screenshot per step
   (from the change's                                 video per journey
    OpenSpec scenarios)                                      │
                                                             ▼
                                            graded against the scenario's THEN
```

Assertions are not baked into the script. The script's job is to *produce evidence*; the pass/fail call is made by reading that evidence against the written expectation. This avoids the failure mode of generated end-to-end tests — brittle selectors encoding a guess at correctness — while keeping determinism where determinism is cheap (navigation, clicks, waits).

- *Alternative: full assertions in the generated script.* Rejected — the script would encode the agent's guess at correctness, then be deleted, so we would pay the cost of authoring tests and keep none of the value.

### The scenario's `THEN` is the judge; there is no second judging agent

The concern that motivated a judge panel is real: an agent that plans a journey, drives it, and grades its own screenshots has every incentive to see success. The mitigation chosen is not redundancy but **provenance** — the pass criterion was written by `/plan`, in the author's words, before this walkthrough existed, for reasons that had nothing to do with passing it. That is a genuinely external check, and it is free.

It also creates useful back-pressure: a vague `THEN` produces an unwalkable journey, and you discover that at ship time.

- *Alternative: a second subagent seeing only the screenshots and the `THEN`.* Deliberately declined for now, recorded so it is not re-litigated. It is a clean addition later if the gate proves to rubber-stamp; the escalate-on-ambiguity rule is the cheap interim.

### Scope is the change's deltas, plus specs the diff touches

`/ship` runs once per change, so a full-surface walk would grow with the app forever while a delta walk stays flat. The "plus what the diff touches" clause covers the real gap in a pure delta scope: editing a file covered by an existing capability without writing a delta for it.

- *Alternative: walk all of `openspec/specs/`.* Rejected on unbounded cost. If regression coverage is wanted later, it belongs in CI as saved tests — a different decision, deliberately not this one.

### Five verdicts, and `UNKNOWN` never merges

`wait-for-checks.sh` already speaks SUCCESS / NONE / UNKNOWN / FAILURE / TIMEOUT, and `/ship` already carries the exactly-right rule: *never merge on UNKNOWN — unverified is not the same as absent.* Extending that vocabulary rather than inventing one keeps the runbook readable and gets the hard case right by construction.

The sharp line the opt-in draws: **before consent, silence is normal; after consent, silence is suspicious.** An unadopted repo's empty walk is `NONE`; an adopted repo's un-runnable walk is `UNKNOWN`.

The Access interstitial is the sneakiest instance — without an explicit check, the walk screenshots a login form and reports green. It is `UNKNOWN` by name.

### Destructive journeys are walked; reset only on failure

Staging is a seeded fixture database by design (`stack-pack`: "never a prod mirror"), and `db:reset:staging` is already documented as "the routine recovery, not a heavyweight operation." So the destructive journey — usually the one most worth walking — needs no special handling.

Resetting only on failure is not tidiness. A retry against a half-mutated database produces a *different* failure than the first run, and the reset is what makes attempt 2 comparable to attempt 1.

- *Alternative: seed-and-clean around every run.* Rejected as cost with no benefit on a fixture database.
- *Alternative: mark destructive journeys and skip them.* Rejected — a gate that must pass would quietly shed exactly the coverage that matters.

### The PR comment carries the record; media degrades

Since inline media is unreachable from the CLI, the comment is designed to be complete as prose — journeys, steps, verdicts, and the `THEN` each was judged against. Media is corroboration layered on top:

| rung | media |
|---|---|
| none configured | local paths, no failure reported |
| public bucket | screenshots inline, video as a link |

Video is a link at every rung. Saying so in the spec prevents a future implementer from chasing the `uploads.github.com` endpoint, which needs a browser session.

- *Alternative: an orphan `ship-evidence` branch with raw.githubusercontent URLs.* Rejected — it commits artifacts, contradicting "save nothing."
- *Alternative: release assets.* Rejected — a release per ship is noise in a surface that means something else.

### `/ship` only

Staging redeploys on every push, so `/save` would give earlier feedback — at N runs per change, with the reseed and the fix loop firing mid-implementation, on a surface that is still changing. The walk is final acceptance; `/save` is the inner loop. Keeping them separate also keeps `/ship` a runbook with one added step rather than two skills sharing a testing engine.

## Risks / Trade-offs

- **A gate that always passes.** → Provenance of the `THEN`, an explicit rule that "no exception thrown" is not a pass, and escalate-on-ambiguity rather than resolve-on-ambiguity. Watch for it in practice; the second judge is the known next move.
- **Flake blocks a merge.** → Shared cap of 3 with the CI loop, reset before retry, and `TIMEOUT`/`UNKNOWN` stopping with a report rather than looping. A human can still merge deliberately.
- **Access repos report green against a login page.** → Named as `UNKNOWN` in the spec, with the service-token headers as the documented fix.
- **Shared staging: a reset stomps another branch mid-walk.** → Already documented as accepted in `d1-pipeline.md`; fires only on failure, so it is rare by construction.
- **An empty `schema/seed.sql` makes journeys unwalkable.** → A stated prerequisite in the runbook; the wiki already requires the seed hold "the few rows a preview needs to be exercisable."
- **`/ship` gets slower and more failure-prone.** → Only for repos that opted in, and only after CI has already passed.
- **A payload mistake multiplies across every adopting repo** — the lesson from the staging-worker change. → The opt-in bounds the blast radius to repos that deliberately took it, and the mechanism was probed before being specified rather than after.
- **Playwright and browser versions drift** in the environment the agent runs in. → The walkthrough never installs or pins; drift surfaces as `UNKNOWN`, which stops rather than merges.

## What the rehearsal reached, and what it could not

Rehearsed before shipping, per the precedent set by `2026-08-01-staging-worker-env` — where a ~15-minute run against real infrastructure found a bug no amount of local reasoning would have.

**Verified:**

- Screenshots, per-journey video (`ffmpeg` ships with Playwright), evidence manifest, and cleanup — including against a **real deployed Cloudflare Worker over TLS**, not just a local server.
- The grading loop end to end: a screenshot read against its scenario's `THEN` and judged, which is the mechanism the whole gate rests on.
- Every verdict path: unadopted `NONE` (34ms, no output), adopted-with-no-journeys `NONE`, missing-browser `UNKNOWN`, no-preview-URL `UNKNOWN`, `WALKED`, and the cleanup guard refusing a path outside the run directory.
- **Both Access branches**, against a server that gates on the service-token header: without it, `UNKNOWN` naming the fix; with it, a normal walk. This is the case worth the most — an unchecked Access wall is the one failure that reads as success.
- A journey that throws is captured as evidence and does not abort the journeys after it.

Two bugs were found this way and fixed: a `git rev-parse` fatal leaking out of an empty repo, and a top-level git-root check that stranded `run`/`cleanup` outside a repository. A third change came from watching a bad selector burn Playwright's 30s default inside a merge gate — the harness now sets 15s.

**Could not reach, and unverifiable from this repo:**

- **`preview-url.sh` resolving a real per-commit preview URL.** It needs a PR with a deployment attached; this repo's CI builds but does not deploy, because the meta-repo ships the stack pack without having taken it (no repo secrets, no `env.staging` or `d1_databases` in `app/wrangler.jsonc`, no pack npm scripts).
- **`db:reset:staging` firing on failure.** Same cause — there is no D1 binding here to reset.

Both close the moment a provisioned repo runs `/ship`. Deferred deliberately to a follow-up `/wong-cloudflare` change rather than bundling an infra change into a payload one; the walkthrough is opt-in, so nothing adopts it before then by accident.

## Open Questions

- Is a public object-storage bucket acceptable apparatus for inline media, or should rung 3 be dropped and the comment stay prose-plus-local-paths? Assumed acceptable-as-optional here; nothing else depends on it.
- Should the first `/ship` on a UI-touching change in an unadopted repo emit a one-time nudge toward the runbook? Assumed no — silence is the promise the opt-in makes.
- ~~Where should the walkthrough helper live?~~ **Resolved: `.claude/skills/ship/scripts/`.** `save/scripts/` holds helpers `/save` owns and `/ship` borrows; the walkthrough is `/ship`-only, so a new directory beside the skill that uses it beats growing another skill's toolbox.

### Resolved during implementation: a committed harness, generated journeys

The spec says each journey is driven by a script generated for the run and deleted with it. Implementation split that in two, and the split is worth recording because the spec's letter permits either reading:

- `walk-runner.mjs` (committed payload) owns the plumbing — resolving the repo's own `playwright`, the Access probe and headers, one recorded context per journey, screenshot-per-step, the evidence manifest, cleanup.
- `<run-dir>/journeys/*.mjs` (generated per run, deleted with the run) own the steps.

Regenerating the plumbing every run would mean an agent re-deriving browser setup under time pressure on the one code path where a silent mistake reads as a passing gate — the Access probe in particular. The steps genuinely differ every run and stay throwaway. Nothing generated is ever written inside the repository, which is the property the requirement is protecting.
