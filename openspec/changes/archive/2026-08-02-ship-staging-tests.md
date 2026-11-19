<!-- openspec-archive v1 2026-08-02-ship-staging-tests -->
<!-- file proposal.md utf8 10825 -->
# ship-staging-tests

**Status:** ready-to-ship
**Open questions:** none — the media-bucket rung shipped as optional, and the preview-URL and staging-reset rehearsals were closed on this PR after provisioning this repo (design.md, "Reached after provisioning this repo")

## Why

Every gate `/ship` currently honors answers "did the code build and did the checks pass" — none of them answers "does the thing the change promised actually work when a person uses it." The change already wrote that promise down: each requirement in `openspec/changes/<slug>/specs/**` is a `#### Scenario:` with a `WHEN`/`THEN` in the author's own words, and the stack pack already deploys every branch to a real staging Worker with a per-commit URL. The two halves have never been connected. This connects them — the scenarios become a walkthrough, walked against staging, immediately before the merge that makes them true.

## What Changes

- **`/ship` gains one step between CI-green (Step 4) and merge (Step 5): a staging walkthrough.** A scout reads the change's OpenSpec scenarios, keeps the ones observable through a browser, and turns each into a journey. Each journey is walked against the per-commit staging alias by a throwaway Playwright script — screenshot after every step, video per journey — and graded against the scenario's own `THEN`. Green merges.
- **Opt-in is detected from state, never configured.** `playwright` in the app's `devDependencies` *is* the consent, following the Cloudflare Access precedent (a capability adopted by taking it, with no manifest field). Absent → `/ship` behaves exactly as it does today: no walk, no warning, no cost. The walkthrough SHALL never install its own dependency.
- **It gates.** A judged failure blocks the merge, resets staging via the pack's existing `npm run db:reset:staging`, then fixes, repushes, re-waits for CI and re-walks — sharing `/ship`'s existing cap of 3. A walk that *could not run* (browser missing, staging unreachable, a Cloudflare Access challenge page) is `UNKNOWN` and refuses to merge, extending the existing "unverified is not the same as absent" rule one surface over.
- **Nothing is saved.** The scripts are written to a temp directory and deleted. No test suite, no committed fixtures, no `tests/` directory — the walkthrough is an acceptance walk, not a regression suite.
- **Evidence goes up as a PR comment** — the journeys, their steps, and the verdicts as prose, with media linked when a host is configured (an optional public R2 bucket) and referenced by local path when one is not.
- **Destructive journeys are walked, not skipped.** Staging is a seeded fixture database by design; a reset is documented as routine recovery, and it fires only on failure.
- **A `wiki/stack/` runbook documents adoption**, and the payload's release discipline applies: `VERSION` bump plus a `CHANGELOG.md` entry.

**Non-goals:** running on `/save` (fast feedback at the cost of N runs per change — the walk is the final acceptance, not the inner loop); a saved or committed test suite; a second judging subagent (the scenario's written `THEN` is the external check); walking the full `openspec/specs/` surface as a regression suite; inline video playback in the PR comment (only GitHub's `user-attachments` can do that, and it is unreachable from the CLI); per-PR isolated environments (already declined in `2026-08-01-staging-worker-env`).

## Capabilities

### New Capabilities
- `ship-walkthrough`: the opt-in staging walkthrough — how consent is detected, how scenarios become journeys, what the walk produces, how it is graded, the five verdicts and what each does to the merge, failure recovery and reseeding, and where the evidence lands.

### Modified Capabilities
- `delivery-gate`: the "No local build fallback" requirement is narrowed rather than broken — it continues to forbid a local *build or test* gate, and gains an explicit boundary distinguishing that from exercising an already-deployed environment. The gate ladder is stated as CI-when-present → walkthrough-when-adopted → merge.

## Impact

- **Payload skills:** `.claude/skills/ship/SKILL.md` (a new Step 4.5, the verdict table, the extended fix loop, and the hard rules). `.claude/skills/wong-setup/SKILL.md` and `.claude/skills/wong-sync/SKILL.md` gain the recommendation path.
- **Payload docs:** a new `wiki/stack/` runbook; `wiki/development/the-change-loop.md` and `CLAUDE.md` where they state what `/ship` does.
- **Scripts:** a walkthrough helper alongside `.claude/skills/save/scripts/`, reusing `preview-url.sh` for the target URL and `wait-for-checks.sh`'s existing result vocabulary.
- **Target repos:** none, unless they install `playwright` deliberately. Repos that do inherit a slower `/ship` and a prerequisite that `schema/seed.sql` hold enough rows for the app to be exercisable.
- **Adjacent conventions:** Cloudflare Access service-token headers (`CF-Access-Client-Id` / `CF-Access-Client-Secret`) become a walkthrough prerequisite on Access-protected repos, documented through the existing `.env.example` convention.
- **Release:** `VERSION` + `CHANGELOG.md`.

## Decision log

- **2026-08-02** — Explored, planned and implemented in one session; all 34 tasks complete, VERSION 8.2.0. **The reframe that made it tractable:** "find the test scenarios" is mostly already done — a change's delta specs *are* `WHEN`/`THEN` scenarios, written by `/plan` before any code, so the scout selects and translates rather than inventing coverage. That provenance is also what makes the gate able to say no, which replaced the originally-considered second judging agent. **Probed the environment before specifying anything** (the `staging-worker-env` precedent) and two assumptions were wrong: there is **no Playwright MCP server**, so the agent cannot live-drive a browser click-by-click — the walk is script-driven while the *verdict* is not; and GitHub renders inline media only for `user-attachments` URLs, which need a browser session, so **video is a link at every rung** and no implementer should go hunting for an API. Playwright 1.61.1 + chromium + `ffmpeg` are present, so video came free. **Opt-in by state** — `playwright` in devDependencies is the consent, modelled on Cloudflare Access having no manifest field — which is what dissolves the "every downstream repo inherits a slower `/ship`" objection: unadopted repos measure 34ms and print nothing. **Ruled out:** a manifest field (a second copy of a fact that can disagree with the dependency); running on `/save` (N runs per change against a surface still changing — the walk is final acceptance, `/save` is the inner loop); a saved test suite; a second judging subagent (recorded as declined, a clean addition later if the gate rubber-stamps); walking all of `openspec/specs/` (unbounded cost per ship); skipping destructive journeys (a must-pass gate would shed exactly the coverage that matters); an orphan evidence branch or release assets for media (both save artifacts). **Deviation from the spec's letter, recorded in design.md:** the throwaway script split into a committed harness (`walk-runner.mjs`) plus generated per-run journeys — regenerating the Access probe every run is the one place a silent mistake reads as a passing gate. `delivery-gate`'s "No local build fallback" was **narrowed rather than broken**, with an explicit building-vs-exercising boundary fenced by three properties: runs only after CI, never installs, absent unless adopted.
- **2026-08-02** — **Rehearsed before shipping**, and it earned its keep. Verified: every verdict path (unadopted `NONE` in 34ms with no output, adopted-no-journeys `NONE`, missing-browser `UNKNOWN`, no-URL `UNKNOWN`, `WALKED`, cleanup refusing a path outside the run dir); **both Access branches** against a server gating on the service-token header — `UNKNOWN` without it, a normal walk with it, which is the single most important safety property here; a thrown journey captured as evidence without aborting the ones after it; and a walk against a **real deployed Cloudflare Worker over TLS** (`wongstack-d1-test`), screenshot and video and evidence, graded by reading the screenshot against its `THEN`. **Three fixes came out of it:** a `git rev-parse` fatal leaking from a repo with no commits; a top-level git-root check that stranded `run`/`cleanup` outside a repository (only `preflight` needs the repo); and Playwright's 30s default timeout burning the budget on one bad selector, now 15s. **Still unverifiable from this repo:** `preview-url.sh` resolving a real per-commit URL, and `db:reset:staging` firing on failure — both because the meta-repo *ships* the stack pack without having *taken* it (no repo secrets, no `env.staging`/`d1_databases` in `app/wrangler.jsonc`, no pack npm scripts), so its CI builds but never deploys. User decided to ship this first and provision separately via `/wong-cloudflare`, keeping the payload change and the infra change in separate PRs.
- **2026-08-02** — Merged `origin/main` (which had taken 8.2.0 and 8.3.0 while this branch was open) and renumbered to **8.4.0**. Then **provisioned this repo by hand** with the user's user-scoped token — two D1 databases, the `env.staging` block, the pack's `package.json` scripts, and both repo secrets — which turned the two "unverifiable from here" items into verified ones **and exposed a defect in this change**: `preview-url.sh`'s four discovery methods all read GitHub-side artifacts that only *Cloudflare Workers Builds* publishes, so on the pack's **GitHub Actions** backend the URL died in a job log and the walkthrough could only ever return `UNKNOWN` — the gate was unreachable for every Actions repo. Fixed in group 7 (`cf-deploy.sh` harvests the URL from wrangler's own output, never constructs it; `deploy.yml` publishes a GitHub Deployment carrying it), with a `stack-pack` delta and docs. **Verified on this PR:** CI built, migrated, deployed `wongstack-staging`, published the URL; `preview-url.sh` resolved it (deployment 5710516663); `db:reset:staging` rebuilt the real staging D1; and Step 4.5 ran for real — `READY` → journeys → `WALKED` → graded from screenshots — reverting to a silent `NONE` once the temporary `playwright` devDependency was removed. **The walk immediately caught a real divergence:** Cloudflare's asset layer serves the SPA fallback to any request with `Sec-Fetch-Mode: navigate`, *before* the Worker runs — so `curl /api/` returns JSON while a browser navigating there returns the app. A curl smoke test in CI passes that; a browser does not. Documented in the runbook. Caveat recorded honestly: the journey that failed had a hand-written `THEN` asserting something the app never promised, which is the predicted back-pressure on `/plan` rather than an app bug.

<!-- end proposal.md -->
<!-- file design.md utf8 15840 -->
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

**Reached after provisioning this repo (task 7.5):**

Provisioning turned the two open items into verified ones, and turned up a defect in the change itself along the way.

- **The defect.** `preview-url.sh`'s four discovery methods all read GitHub-side artifacts, which exist because *Cloudflare Workers Builds* publishes them. The pack's **GitHub Actions** workflow published nothing — wrangler printed the URL into a job log and it died there. So on the Actions backend the walkthrough could only ever return `UNKNOWN`, making the whole gate unreachable for those repos. Fixed in group 7: `cf-deploy.sh` harvests the URL from wrangler's own output and the workflow publishes it as a GitHub Deployment.
- **Verified end to end on this PR:** CI built, migrated, deployed the staging Worker, and published the URL; `preview-url.sh` resolved it (deployment 5710516663); `db:reset:staging` rebuilt the real staging D1 from seed; and Step 4.5 ran for real — `READY` → journeys → `WALKED` → graded from screenshots — then reported `NONE` again the moment the temporary `playwright` devDependency was removed.
- **The walk caught a real divergence on its first live run.** Cloudflare's static-asset layer intercepts requests with `Sec-Fetch-Mode: navigate` and serves the SPA fallback *before* the Worker runs. `curl /api/` returns the Worker's JSON; a browser navigating to `/api/` gets the SPA. A curl-based CI smoke test passes this; a browser does not. Documented in the runbook as guidance for journey authors — walk the app the way a person does.
- **Honest caveat on that result:** the failing journey's `THEN` was hand-written for the rehearsal, not derived from a spec, and it asserted something the app never promised. It is a true failure of a badly chosen expectation — which is itself the back-pressure on `/plan` the design predicts: a vague or wrong `THEN` produces an unwalkable journey, and you find out at ship time.

## Open Questions

- Is a public object-storage bucket acceptable apparatus for inline media, or should rung 3 be dropped and the comment stay prose-plus-local-paths? Assumed acceptable-as-optional here; nothing else depends on it.
- Should the first `/ship` on a UI-touching change in an unadopted repo emit a one-time nudge toward the runbook? Assumed no — silence is the promise the opt-in makes.
- ~~Where should the walkthrough helper live?~~ **Resolved: `.claude/skills/ship/scripts/`.** `save/scripts/` holds helpers `/save` owns and `/ship` borrows; the walkthrough is `/ship`-only, so a new directory beside the skill that uses it beats growing another skill's toolbox.

### Resolved during implementation: a committed harness, generated journeys

The spec says each journey is driven by a script generated for the run and deleted with it. Implementation split that in two, and the split is worth recording because the spec's letter permits either reading:

- `walk-runner.mjs` (committed payload) owns the plumbing — resolving the repo's own `playwright`, the Access probe and headers, one recorded context per journey, screenshot-per-step, the evidence manifest, cleanup.
- `<run-dir>/journeys/*.mjs` (generated per run, deleted with the run) own the steps.

Regenerating the plumbing every run would mean an agent re-deriving browser setup under time pressure on the one code path where a silent mistake reads as a passing gate — the Access probe in particular. The steps genuinely differ every run and stay throwaway. Nothing generated is ever written inside the repository, which is the property the requirement is protecting.

<!-- end design.md -->
<!-- file tasks.md utf8 6221 -->
## 1. The walkthrough script

- [x] 1.1 Decide the helper's home (`ship/scripts/` vs alongside `save/scripts/`) and record it in design.md's Open Questions as resolved
- [x] 1.2 Write the adoption probe: read the app's `package.json` for a `playwright` devDependency, using the pack's existing app-directory discovery rather than assuming `app/`; absent → exit `NONE` silently
- [x] 1.3 Resolve the target URL by calling `save/scripts/preview-url.sh`; undiscoverable in an adopted repo → `UNKNOWN`
- [x] 1.4 Probe the browser binary without installing anything; missing → `UNKNOWN` naming the install command as the fix, never running it
- [x] 1.5 Detect a Cloudflare Access interstitial on the first navigation and exit `UNKNOWN` naming the service-token headers, so a login page is never graded as a journey
- [x] 1.6 Send `CF-Access-Client-Id` / `CF-Access-Client-Secret` as extra HTTP headers when both are present in the environment, per the existing secrets convention
- [x] 1.7 Emit results in the `RESULT: <VERDICT>` shape `wait-for-checks.sh` already uses, so `/ship` reads both gates the same way
- [x] 1.8 Create and clean up the temp run directory, guaranteeing nothing is written under the repository root and the working tree is unchanged on every exit path

## 2. The /ship skill

- [x] 2.1 Add Step 4.5 to `.claude/skills/ship/SKILL.md` between the CI wait and the merge, invoking the helper and stating the position's rationale (CI green is what proves the per-commit alias exists)
- [x] 2.2 Document the scout: inputs are the change's delta specs plus the scenarios of any `openspec/specs/` capability the branch diff touches; filter to browser-observable; exclude queue/cron scenarios with a recorded reason
- [x] 2.3 Document journey construction — the scenario's `WHEN` becomes the steps, its `THEN` is carried verbatim as the pass criterion
- [x] 2.4 Document the throwaway script contract: generated per run outside the tree, screenshot after every step, video per journey, deleted at the end
- [x] 2.5 Document grading — evidence read against the written `THEN`; "no exception thrown" is explicitly not a pass; ambiguity stops and asks the user with the screenshot
- [x] 2.6 Add the five-verdict table and each verdict's effect on the merge, including that `NONE` is silent when unadopted and one line when adopted-but-empty
- [x] 2.7 Extend the failure loop: `db:reset:staging` before the retry, then fix → repush → re-wait CI → re-walk, sharing the existing cap of 3
- [x] 2.8 Extend the Hard rules with: never merge on a walkthrough `UNKNOWN`; never install a dependency; never write into the repo; a passing walk leaves its data
- [x] 2.9 Update Step 6's report to include the walkthrough verdict, the journey count, and the PR comment link when one was posted

## 3. Evidence reporting

- [x] 3.1 Compose the PR comment so it is complete as prose — per journey: steps, verdict, and the `THEN` it was judged against
- [x] 3.2 Post it with `gh pr comment`, one comment per `/ship` run rather than one per journey
- [x] 3.3 Implement the optional media host: upload screenshots and videos to a configured public bucket and link them; absent host → local paths with no failure reported
- [x] 3.4 Present video as a link at every rung, with a comment in the source recording why (`user-attachments` is the only inline path and needs a browser session)

## 4. Documentation

- [x] 4.1 Write the `wiki/stack/` runbook: the three adoption rungs (playwright install → Access service token → optional bucket), each degrading to the one below
- [x] 4.2 Document the `schema/seed.sql` prerequisite — an empty seed makes journeys unwalkable
- [x] 4.3 Record the declined options with reasons (running on `/save`, a saved suite, a second judging agent, walking the full spec surface, inline video)
- [x] 4.4 Link the runbook from `wiki/stack/README.md` and from `wiki/development/the-change-loop.md` where `/ship` is described
- [x] 4.5 Add the walkthrough's variables to `.env.example` with comments on what they are and where they come from
- [x] 4.6 Update `CLAUDE.md` where it states what `/ship` does and where it states the never-build-locally rule, per the `delivery-gate` delta's building-versus-exercising boundary

## 5. Offer paths

- [x] 5.1 Add the recommendation to `.claude/skills/wong-setup/SKILL.md` as a stack-pack-style offer, where declining writes nothing
- [x] 5.2 Ensure `/wong-sync` can surface it as an adaptable capability, and add the runbook to the payload manifest
- [x] 5.3 Confirm no manifest field is introduced anywhere — the `playwright` devDependency is the only consent signal

## 6. Verification and release

- [x] 6.1 Rehearse the helper — every verdict path locally, plus a walk against a **real deployed Cloudflare Worker** (screenshot, video, evidence, grading). Two pieces initially unreachable — `preview-url.sh` on a real per-commit URL and `db:reset:staging` — were **closed in task 7.5** after provisioning this repo
- [x] 6.2 Rehearse the Access path against a protected URL with and without the service token, confirming `UNKNOWN` rather than a green login page
- [x] 6.3 `openspec validate ship-staging-tests --strict`
- [x] 6.4 Bump `VERSION` (minor — an additive, opt-in capability) and add the newest-first `CHANGELOG.md` entry

## 7. Preview-URL publication (found while verifying 6.1)

- [x] 7.1 `cf-deploy.sh` harvests the alias URL from `wrangler versions upload` output — never constructs it — and writes it to `$GITHUB_OUTPUT`, guarding every extraction against `set -e`
- [x] 7.2 `deploy.yml` publishes it as a GitHub Deployment with `environment_url`, gated on a non-empty URL, with `deployments: write`
- [x] 7.3 Add the `stack-pack` delta requiring publication, harvest-not-construct, and no-op under Workers Builds
- [x] 7.4 Document it in the pipeline docs and the walkthrough runbook
- [x] 7.5 Provisioned this repo manually (two D1s, `env.staging`, pack scripts, repo secrets); CI deployed, published the URL, and `preview-url.sh` resolved it via deployment 5710516663. `db:reset:staging` verified against the real staging D1. Full Step 4.5 walked the live preview — **closing 6.1's gap entirely**

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 1872 -->
## MODIFIED Requirements

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping.

**The boundary is building versus exercising.** Driving a browser against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`ship-walkthrough`) is therefore permitted as a `/ship` gate, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only after CI has published the build it walks, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it.

The gate ladder is: **CI when present → the walkthrough when adopted → merge.** Each rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo's `/ship` runs the staging walkthrough
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI but has not adopted the walkthrough
- **THEN** `/ship` merges on green CI alone, reporting no gap

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/ship-walkthrough/spec.md utf8 12850 -->
## ADDED Requirements

### Requirement: Adoption is detected from state, never configured

The staging walkthrough SHALL be opt-in, and consent SHALL be inferred from observable repo state rather than from a flag: `playwright` present in the app's `devDependencies` means this repo adopted the walkthrough. There SHALL be no manifest field, no config file, and no skill argument that enables or disables it — following the Cloudflare Access precedent, where a capability is adopted by taking it and detected by what is there.

The walkthrough SHALL NEVER install `playwright`, a browser, or any other dependency — not as a convenience, not on a prompt, not "while we're here." A missing dependency is a statement that the repo did not opt in, or (once it has) a condition to report, never a condition to fix.

When `playwright` is absent, `/ship` SHALL behave exactly as it does without this change: no walk, no prompt, no warning, and no added latency.

#### Scenario: A repo that never opted in

- **WHEN** `/ship` runs in a repo whose app has no `playwright` devDependency
- **THEN** no walkthrough runs and `/ship` proceeds from CI-green directly to the merge
- **AND** no warning, prompt, or "consider installing" notice is emitted

#### Scenario: Installing playwright is the whole opt-in

- **WHEN** a repo adds `playwright` to its app's `devDependencies` and installs a browser
- **THEN** the next `/ship` runs the walkthrough with nothing else configured

#### Scenario: The walkthrough never installs its own dependency

- **WHEN** the walkthrough finds `playwright` declared but its browser binary missing
- **THEN** it does not download or install the browser
- **AND** it reports the condition as a verdict rather than repairing it

### Requirement: The walkthrough runs on /ship only, between CI-green and the merge

The walkthrough SHALL be a step of `/ship` positioned after the CI wait and before the merge. `/save`, `/apply`, and `/continue` SHALL NOT run it.

The position is load-bearing: CI green is what proves the branch's staging deploy published a version for this commit, so the walkthrough SHALL target the per-commit staging alias discovered by the existing preview-URL helper rather than a URL supplied by the user or assumed from a naming convention.

When the repo has no CI (`NONE`), the walkthrough SHALL still run if adopted — PR review being the gate does not remove the walk — but SHALL treat an undiscoverable preview URL as a condition to report rather than a URL to guess.

#### Scenario: Ordering relative to CI

- **WHEN** `/ship` runs in an adopted repo with CI configured
- **THEN** the walkthrough begins only after the checks report `SUCCESS`
- **AND** the merge happens only after the walkthrough returns a passing verdict

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walkthrough needs a URL to walk
- **THEN** it uses the per-commit preview URL produced by the existing preview-URL helper for the current head SHA
- **AND** it does not ask the user for a URL or construct one from a worker-name convention

#### Scenario: Other verbs do not walk

- **WHEN** `/save` runs in an adopted repo
- **THEN** no walkthrough runs

### Requirement: Scenarios become journeys, scoped to the change

A scout SHALL derive the walkthrough's journeys from the change's own OpenSpec scenarios rather than from the application's routes or components. Its inputs SHALL be the delta specs under `openspec/changes/<slug>/specs/**`, plus the scenarios of any capability in `openspec/specs/` that the branch diff touches. The full synced spec surface SHALL NOT be walked — the walkthrough is acceptance for this change, not a regression suite whose cost grows with the app.

The scout SHALL keep only scenarios observable through a browser against an HTTP-serving preview. Scenarios whose behavior lives outside the request path — queue consumers, cron triggers, alarms — SHALL be excluded, because a version alias serves HTTP only.

Each journey SHALL carry the scenario's `WHEN` as its steps and the scenario's `THEN`, verbatim, as its pass criterion.

#### Scenario: Scope is the change plus what the diff touches

- **WHEN** the scout runs on a change with delta specs for one capability, whose diff also edits files covered by a second capability's spec
- **THEN** the journeys cover the delta scenarios and the second capability's scenarios
- **AND** capabilities unrelated to both are not walked

#### Scenario: Non-browser scenarios are excluded

- **WHEN** a change's scenarios describe a queue consumer's behavior
- **THEN** the scout excludes them from the journeys and records why

#### Scenario: The pass criterion is the scenario's own words

- **WHEN** a journey is built from a scenario
- **THEN** its expected outcome is the scenario's `THEN` text, not a restatement invented by the scout

### Requirement: The walk is throwaway and saves nothing

Each journey SHALL be driven by a Playwright script generated for that run, written outside the repository working tree, and deleted when the run ends. The walkthrough SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, or any other artifact inside the repo, and SHALL leave the working tree unchanged.

The run SHALL capture a screenshot after each step and a video for each journey.

#### Scenario: Nothing lands in the repo

- **WHEN** a walkthrough completes, whatever its verdict
- **THEN** `git status` reports the same working tree as before it started
- **AND** no generated script, screenshot, or video remains under the repository root

#### Scenario: Evidence is captured per step and per journey

- **WHEN** a journey of four steps is walked
- **THEN** four screenshots and one video exist for that journey in the run's temporary directory

### Requirement: The verdict is graded against the written expectation

The pass or fail call for each journey SHALL be made by reading the captured evidence against the scenario's `THEN`. The judgement SHALL NOT rest on the absence of an exception, an HTTP status alone, or the agent's impression that the page "looks fine": a journey whose script completed without error but whose screenshots do not show what the `THEN` describes SHALL fail.

No second judging subagent is required. The external check is that the expectation was written by `/plan`, before the walk existed, for reasons unrelated to passing it.

Where the evidence is genuinely ambiguous, the walkthrough SHALL stop and ask the user, presenting the screenshot and the `THEN` side by side, rather than resolving the ambiguity in either direction on its own.

#### Scenario: A silent wrong result fails

- **WHEN** a journey's script completes with no error, but the screenshot shows no validation message where the scenario's `THEN` requires one
- **THEN** the journey fails

#### Scenario: Ambiguity is escalated, not resolved

- **WHEN** the captured evidence neither clearly satisfies nor clearly contradicts the scenario's `THEN`
- **THEN** the walkthrough stops and asks the user, showing the screenshot and the expectation
- **AND** it does not merge on its own judgement

### Requirement: The walkthrough gates the merge, with five verdicts

The walkthrough SHALL resolve to exactly one of five verdicts, reusing the vocabulary the check-waiting script already establishes, and each SHALL determine what happens to the merge:

- **NONE** — not adopted, or adopted with no browser-observable scenarios. Proceed to the merge. When not adopted this SHALL be silent; when adopted it SHALL be one line naming why there was nothing to walk.
- **SUCCESS** — every journey satisfied its `THEN`. Proceed to the merge.
- **FAILURE** — at least one journey contradicted its `THEN`. Do not merge; enter recovery.
- **UNKNOWN** — the walk could not run or could not be trusted: the browser is missing, the preview URL is undiscoverable, staging is unreachable, or the walk landed on a Cloudflare Access challenge page. **Do not merge**, and stop.
- **TIMEOUT** — the walk did not finish in its budget. Do not merge; report and stop.

`UNKNOWN` SHALL NOT be treated as `NONE`. Once a repo has adopted the walkthrough, a walk that cannot run is unverified rather than absent — the same distinction `/ship` already draws for an unaskable CI check.

#### Scenario: Adopted but nothing to walk

- **WHEN** the scout finds no browser-observable scenarios in an adopted repo
- **THEN** the verdict is `NONE`, one line explains why, and the merge proceeds

#### Scenario: A blocked walk does not merge

- **WHEN** the preview URL cannot be discovered, or the browser binary is missing, in an adopted repo
- **THEN** the verdict is `UNKNOWN` and `/ship` stops without merging

#### Scenario: An Access challenge is not a page

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the missing service-token credentials as the likely cause

### Requirement: Failure resets staging, then re-walks under the existing cap

On `FAILURE`, `/ship` SHALL reset the staging database using the stack pack's existing staging reset command before retrying, so the retry begins from the seeded fixture rather than from the partial state the failed walk left behind. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one.

`/ship` SHALL then fix, repush, re-wait for CI, and re-walk. These attempts SHALL share `/ship`'s existing cap of 3 rather than introducing a second independent budget, and `/ship` SHALL never merge on a red walk.

#### Scenario: Reset precedes the retry

- **WHEN** a journey fails and `/ship` prepares to retry
- **THEN** the staging reset command runs before the fix is walked again

#### Scenario: A passing walk leaves its data

- **WHEN** a walkthrough returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: Destructive journeys are walked

- **WHEN** a scenario describes deleting a record
- **THEN** the scout includes it as a journey rather than skipping it as unsafe

#### Scenario: One shared attempt budget

- **WHEN** CI failures and walkthrough failures both occur across a single `/ship`
- **THEN** the total fix-and-repush attempts do not exceed the existing cap of 3

### Requirement: Evidence is reported as a PR comment that degrades honestly

The walkthrough SHALL post its result as a comment on the pull request: each journey, its steps, its verdict, and the scenario's `THEN` it was judged against. The written record SHALL be complete on its own, independent of whether any media renders.

Media SHALL be linked when a public host is configured — an optional public object-storage bucket — and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run.

The report SHALL NOT claim inline video playback. Only GitHub's browser-upload attachment path renders video inline, and it is unreachable from the command line; a hosted video SHALL be presented as a link.

#### Scenario: Comment without a media host

- **WHEN** an adopted repo with no configured media host completes a walkthrough
- **THEN** the PR comment contains the journeys, steps, and verdicts in full
- **AND** media is referenced by local path, with no failure reported for the missing host

#### Scenario: Comment with a media host

- **WHEN** a public bucket is configured
- **THEN** screenshots render inline in the comment and each journey's video appears as a link

### Requirement: Adoption is recommended and documented, never forced

A runbook SHALL ship in the payload's stack section covering what the walkthrough needs, in rungs that each degrade to the one below: the `playwright` install; the Access service-token headers when the repo is Access-protected; and the optional public bucket for inline media. It SHALL state the prerequisite that `schema/seed.sql` hold enough rows for the app to be exercisable, and SHALL record the deliberately declined options — running on `/save`, a saved test suite, a second judging agent, and walking the full spec surface — so they are not re-litigated.

Onboarding and sync SHALL be able to offer the capability the way the stack pack itself is offered, and declining SHALL leave `/ship` unchanged.

#### Scenario: Declining changes nothing

- **WHEN** a repo is offered the walkthrough and declines
- **THEN** no file is written and `/ship` behaves as before

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walkthrough does not run on every `/save`
- **THEN** the runbook states the decision and its reason

<!-- end specs/ship-walkthrough/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 2054 -->
## ADDED Requirements

### Requirement: The pack's CI publishes the preview URL it produced

The pack's deploy script SHALL surface the per-commit preview URL that `wrangler versions upload` produced, and the pack's GitHub Actions workflow SHALL publish it to GitHub as a Deployment carrying an `environment_url`.

The URL SHALL be **harvested from wrangler's own output, never constructed** from the documented `<alias>-<worker>-staging.<subdomain>.workers.dev` shape. A constructed URL is a guess that can answer `200` while pointing at a different commit, or at a Worker this deploy never touched — which defeats the purpose of a per-commit URL. When wrangler prints no URL, the scripts SHALL publish nothing and callers SHALL report that no preview URL exists, rather than emitting an unverified one.

Publication SHALL be a no-op outside GitHub Actions: under Cloudflare Workers Builds, Cloudflare's own GitHub integration already attaches the URL to the commit, and the deploy script SHALL NOT duplicate it.

Failure to publish SHALL NOT fail the deploy. The deploy has already succeeded by that point, and a missing URL degrades the tooling that reads it rather than the release.

#### Scenario: Actions publishes the URL wrangler printed

- **WHEN** the workflow deploys a non-production branch and `wrangler versions upload` prints a preview URL
- **THEN** the workflow creates a GitHub Deployment for the head SHA whose status carries that URL as `environment_url`
- **AND** `.claude/skills/save/scripts/preview-url.sh` resolves that same URL for the commit

#### Scenario: No URL printed is reported, not invented

- **WHEN** `wrangler versions upload` prints no `workers.dev` URL
- **THEN** the deploy script warns and publishes nothing
- **AND** the deploy itself still succeeds

#### Scenario: Workers Builds is left alone

- **WHEN** the deploy script runs under Cloudflare Workers Builds rather than GitHub Actions
- **THEN** it emits the URL for the log but publishes no GitHub Deployment, because Cloudflare's integration already did

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-01

~~~
<!-- end .openspec.yaml -->
