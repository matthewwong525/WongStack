# Staging walkthrough

What [`/verify`](../../.claude/skills/verify/SKILL.md) does: the change's own OpenSpec scenarios exercised end to end against the deployed preview and graded against what those scenarios said would happen. Each scenario gets the strongest probe that can observe it — a real browser where the scenario is about UI, a direct HTTP request where it is about the request path, an existing command reading deployed state where the effect lands somewhere else — and the evidence and verdict land as a comment on the pull request.

It exists because CI answers *did it build and did the checks pass*. It doesn't answer *does this do what it promised*. The promise is already written down — every requirement in a change's delta specs is a `#### Scenario:` with a `WHEN` and a `THEN` — and any branch that publishes a preview URL already puts the change somewhere a probe can reach. The walkthrough is the wire between the two.

**It gates nothing.** `/ship` runs one walk for the evidence and then merges on CI-green ([the gate](the-change-loop.md#the-gate)) whatever the verdict says — the single exception being a `FAILURE`, which stops to ask you whether to fix or merge anyway. A walk that can't run never blocks a thing. So run it whenever it's useful too — halfway through a change, twice in a row, right before shipping. There is no wrong moment and no limit.

**It works in any repo, on any stack.** The browser is a standalone CLI installed on your machine, not a dependency added to your project, so a Python, Rust, or Go repo walks with nothing added to it — and a change with no UI journeys needs no browser at all, because request probes ride on `curl`. There is no opt-in to perform and no flag to set.

## The probe ladder

The scout matches each scenario to the **strongest probe that can observe it end to end** against the deployed preview:

1. **Browser journey** — the `THEN` is about something rendered: a message appears, a list updates, a count drops. Driven with `agent-browser` in a real Chrome.
2. **Request probe** — the `THEN` is about the request path with no UI: an endpoint's status or body, a webhook's acknowledgement, a redirect, a header. Driven as plain HTTP requests against the preview URL, with each request and response captured as evidence.
3. **State probe** — the `THEN` is an effect something else can read: a queue consumer writes a row, a cron marks a record. Usable only where an **existing** machine-level or stack-pack command reads that deployed state — for a stack-pack repo, the staging-database query it already has. The walk never adds tooling to a repo to make a scenario observable.

A scenario **no probe reaches** — no deployed surface, or observable only by building or executing the repo's code locally — is excluded and **listed by name in the report as unverified**, never silently dropped. Its e2e home is a CI test ([the change loop](the-change-loop.md)); the walk exercises what CI deployed, and only that.

## What you need

Two things, and `/verify` provides the first for you.

### 1. A browser — installed for you, on the machine, when a UI journey needs one

The engine is [`agent-browser`](https://github.com/vercel-labs/agent-browser), a standalone CLI that carries its own Chrome. When a browser journey exists and the tool is missing, `/verify` installs it and says so:

```bash
npm i -g agent-browser && agent-browser install   # or: brew install agent-browser
agent-browser install --with-deps                 # Linux hosts, for the browser libraries
```

**Nothing is added to your repository.** No `devDependencies` entry, no lockfile change, no `package.json` created if you don't have one. That promise is the whole reason this engine was chosen: a repo dependency would have quietly required a Node toolchain in every repo that wanted to see its own app.

Preflight proves the browser works rather than assuming it: `agent-browser doctor` launches one headlessly, so a green preflight means the walk *has* a browser. When no journey is a browser journey, preflight skips the browser entirely — nothing is installed or launched for a walk that won't use it. A **language runtime** is the one thing `/verify` won't install silently — that still asks, per [required tools](required-tools.md).

**Need the browser somewhere else?** `agent-browser` supports remote providers (Browserless, Browserbase, Browser Use) through its own configuration, and `agent-browser doctor` reports which it can see. WongStack defines no variable of its own for this — the setting belongs to the tool.

### 2. A branch that publishes a preview URL

The walk targets the per-commit preview, discovered by asking GitHub what was deployed for this commit — never constructed from a naming convention. Vercel, Netlify, Cloudflare, Render, Fly, and GitHub Pages previews are all found the same way. A repo whose CI doesn't deploy has no URL to walk, and the walkthrough reports `UNKNOWN` rather than guessing one.

### Optional — a public bucket, if you want images in the comment

```
WALK_MEDIA_BUCKET=my-walkthrough-evidence
WALK_MEDIA_BASE_URL=https://pub-xxxx.r2.dev
```

With these set, screenshots are uploaded and rendered in the PR comment. Without them the comment cites local paths — **not a failure, and not reported as one.** The comment is written to stand on its own as prose; the pictures corroborate it. Request- and state-probe evidence is text and is quoted inline either way. (The variables keep their historical `WALK_` names from before the verb was renamed: renaming a variable users already set breaks them silently.)

### Optional — an Access service token *(stack-pack repos)*

If you adopted [Cloudflare Access](../stack/cloudflare-access.md), your preview URLs sit behind a login and a headless caller gets challenged. Two values live in the primary worktree's durable `.env` per the [secrets convention](secrets.md):

```
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

**You don't have to put them there yourself.** Where a Cloudflare API token is available, the first walk that meets the wall mints the pair, stores it, and retries — see [when the walk can't get in](#when-the-walk-cant-get-in). With no such token the heal is unavailable and the walk reports `UNKNOWN` naming the wall.

The walk sends them as `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers — on the browser session for a UI journey and on the request itself for a request probe. **If the wall survives the mint it reports `UNKNOWN` — not a pass** — and does not capture the login form and call it green. That distinction is the single most important property here: a walkthrough that reports success against a login page is worse than no walkthrough, because it converts an unchecked assumption into a checked-looking one.

> **A `401` from your own app, with a valid service token, means the app is authenticating the wrong way.** Access strips the two headers above and sets **no email header** for a service token, so code that reads `Cf-Access-Authenticated-User-Email` rejects the walk — and every other machine caller — while working fine in your browser. The symptom is distinctive: the walk gets *past* Access (no challenge) and then every journey fails on an app-rendered `401`. Verify the signed assertion instead — [`app/worker/access.ts`](../stack/cloudflare-access.md#the-auth-model-verify-the-signed-assertion) reads `email` for humans and `common_name` for service tokens, which is what makes one path serve both.

**Prerequisite for a seeded stack** *(stack-pack repos)*: journeys need something to act on. Where staging is a [seeded fixture database](../stack/d1-pipeline.md#seeded-staging-production-untouched), `schema/seed.sql` ships empty, and an empty seed produces journeys that can't do anything — which grade as failures for a reason that isn't a bug.

## What actually happens

```
  scout ───── the change's delta specs
     │        + specs whose files this diff touches
     │        → match each scenario to its strongest probe
     │          (browser journey · request probe · state probe · unverifiable, by name)
     │        nothing reachable? → NONE, and stop here. Cost so far: a few file reads.
     │
  /save ───── push, wait for CI, resolve the per-commit preview URL
     │        (CI green is what proves a version was published for THIS commit)
     │
     ├─ walk ───── one command batch or request list per journey, in a temp dir
     │             evidence every step: screenshots · captured responses · command output
     │             one browser session per UI journey
     │             blocked by an Access wall? heal once, retry once
     │
     ├─ grade ──── evidence read against the scenario's own THEN
     │
     └─ report ─── PR comment (every verdict), then delete the temp dir
```

**The scout runs first so that having nothing to verify costs nothing.** A change whose scenarios have no deployed surface at all — pure library code, behavior only local execution could show — reaches `NONE` after reading a few local files, with no push, no CI wait, and no browser. Only once at least one journey exists does the walk spend anything.

`/verify` then runs `/save`, because the preview only exists once CI has published *this* commit. Verifying earlier verifies the previous commit, or nothing — and a URL built by hand from a naming convention can address a commit that was never deployed and still answer `200`. The scout reads the same working tree `/save` is about to commit, so the journeys and the deployed commit describe the same change.

Journeys are derived from **scenarios, not from your routes**. The scenario's `WHEN` becomes the steps; its `THEN` is carried across verbatim as the pass criterion and is what the evidence is judged against. A browser journey is a declarative array of `agent-browser` commands and a request probe is a declarative list of HTTP steps — the driver hands both to the tools unread, so nothing sits between what was written and what ran.

The journeys contain **no assertions**. Their job is to produce evidence; the verdict is a separate act of reading it. That's deliberate — assertions written moments before being deleted encode a guess at correctness, and "nothing errored" is not the same as "the thing worked." A journey that completes cleanly but whose screenshot lacks what the `THEN` describes **fails** — and so does a request probe that answered `200` without the body its `THEN` describes.

Nothing is saved. The journeys and evidence live in a temp directory and leave with it. Your working tree is unchanged whatever the verdict.

### Wait after anything that navigates

A screenshot taken before the destination has painted captures the **previous page**, and a grader reads it as evidence. This is not theoretical: a two-step journey whose click navigated correctly produced two byte-identical screenshots of the page it had already left. The walk would have graded confidently and wrongly.

Every navigating step therefore gets an explicit wait before its screenshot — `["wait", "--load", "networkidle"]`, or a wait on text when the page updates without navigating. It is the single easiest way to produce a confidently wrong walk, which is why it is a hard rule rather than a tip.

### Walk the app the way a person does

A journey should reach a behavior the way its user reaches it — a UI scenario clicks the thing that calls the API rather than navigating straight to the API route. That isn't style advice; on a static-asset-fronted stack it changes the answer:

```
Sec-Fetch-Mode: navigate   →  index.html   (the SPA fallback; your server code never runs)
anything else              →  your application's response
```

Cloudflare's static-asset layer — and equivalents elsewhere — intercept **browser navigations** and serve the SPA fallback *before* your code executes. So `curl /api/` returns JSON while typing `/api/` into an address bar returns the app, and a browser journey that navigates directly to an API route is testing the asset layer, not the API.

The same fact read the other way is why request probes work: a non-navigation request reaches your application's response directly, which is exactly what an API scenario's `THEN` is about. The two probes exercise the two paths a real caller uses — match the probe to who the scenario's user is.

## The five verdicts

None of them gates anything — they describe what gets **reported**.

| | | |
|---|---|---|
| **NONE** | no scenario in this change is reachable by any probe | one line saying what was there instead |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset and fix-in-scope or stop |
| **UNKNOWN** | the walk couldn't run or couldn't be trusted, after any heal | **unverified** — the comment says so, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified** — what completed, and where it stopped |

**`UNKNOWN` is not `NONE`.** An un-runnable walk is *unverified*, which is not the same as *absent*. A comment that reads like a pass because a login page rendered is exactly the outcome worth preventing, whether or not a merge was waiting on it.

**`NONE` no longer means "this repo didn't opt in"** — there is no opt-in. It means this change has nothing any probe can reach.

Every report also says **each journey's probe and where it ran**. A walk driven on the machine that invoked it depended on that machine, and a reader comparing two walks is entitled to know that. Scenarios excluded as unverifiable appear in the same report, by name, with the reason.

## When the walk can't get in

One block stops a walk before it sees the app, and where the credential exists `/verify` fixes it rather than sending you an errand:

| Block | What `/verify` does | If the retry is blocked again |
|---|---|---|
| **The preview answers with an Access login wall** and no service token is stored | with a Cloudflare API token: mints a service token named for the repo, confirms the [Access](../stack/cloudflare-access.md) policy accepts it, writes the pair to the primary worktree's durable `.env`, then retries once | `UNKNOWN`, naming the mint that didn't help |

*(Stack-pack repos.)* The repair is already authorized: pasting a token *is* [the authorization to widen it](../stack/cloudflare-credentials.md#the-widen-is-pre-authorized), the same standing permission `/wong-cloudflare` runs on. The walk reports what it minted and never prints a credential value. **With no Cloudflare token the heal is simply unavailable** — the verdict is `UNKNOWN` naming the wall and the missing credential, never a graded login page.

**One heal and one retry** — never a loop. A block that survives its repair is `UNKNOWN` with the attempt named, so an unverified walk never looks like an untried one.

## When a walk fails

The evidence is posted first — a failing walk's evidence is the whole point — then staging is reset where the repo has that command (`npm run db:reset:staging`).

The reset isn't housekeeping. A walk that starts against the half-mutated database a failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers instead of the bug. A **passing** walk's data is left alone — staging is a fixture, not something to preserve.

Then `/verify` asks whether the failure is its own to fix. It is **in scope** only when both halves hold: the contradicted `THEN` is one of this change's own scenarios, *and* the fix plausibly lives in files this branch already touches. In scope, it fixes the code, runs `/save`, and verifies again — **at most twice**, then it stops and reports like any failure. Out of scope — pre-existing behavior, infrastructure, another capability's scenario — it stops after the reset and tells you what to look at.

The report states which way it judged, so you can disagree. The two-attempt bound is what keeps the loop from becoming a grinder: a walk that can't fix its own change in two tries has found something worth a human reading, and chasing an unrelated bug is how a walk quietly turns into a different change.

**Destructive journeys are walked, not skipped.** Deleting things is often the scenario most worth exercising, and with no merge riding on the verdict there's no pressure to quietly shed that coverage.

## What this deliberately isn't

Recorded so it isn't re-litigated:

- **Not a test suite.** Nothing is saved, so coverage never accumulates. Regression tests belong in CI as real tests, which the payload now ships a pipeline for — see [the change loop](the-change-loop.md). A different decision, and a good one, but not this.
- **Not automatic on `/save`.** `/verify` *begins* by invoking `/save` — that's how the preview URL comes to exist — but the reverse was declined: `/save` does not walk. Staging redeploys on every push, so walking there would fire N times per change, with the reseed and fix loop running while the surface is still changing. You choose the moments; the tool doesn't choose them for you.
- **Not a gate on `/ship` — though `/ship` does verify.** The walk was once a *merge gate* between green CI and the merge, and that is what was removed and stays removed. Making it a gate forced everything around it: a walk that couldn't run had to block, retries had to share `/ship`'s attempt budget, and the only moment you could see your app was the moment you were done with it. `/ship` now runs one walk as an **evidence step**: `NONE`, `UNKNOWN`, and `TIMEOUT` are reported and the merge proceeds on CI, so an unrunnable walk still blocks nothing. A `FAILURE` stops and asks you to fix or merge anyway, which is a decision handed to a human rather than a condition evaluated by a skill.
- **No second judging agent.** The concern is real: an agent that plans a journey, drives it, and grades its own evidence has every incentive to see success. The mitigation is *provenance* rather than redundancy — the `THEN` was written by [`/plan`](../../.claude/skills/plan/SKILL.md), before the walk existed, for reasons unrelated to passing it. Ambiguous evidence stops and asks a human rather than being resolved either way.
- **Not a regression sweep of `openspec/specs/`.** A delta-scoped walk stays flat while a full-surface walk grows with the app forever.
- **Not an unbounded fix loop.** `/verify` fixes a failure in *this change's own code*, twice at most, and repairs an access block once. Those bounds are the decision, not an implementation detail: an agent that keeps fixing and re-verifying until something passes will eventually pass something, and the walk's value comes entirely from being willing to report a failure.
- **No local execution, and no invented tooling.** Every probe exercises the deployment CI published. The walk never builds or runs the repo's own code to make a scenario observable, and never adds a tool to the repo to read state it can't otherwise reach — a scenario like that is reported as unverified, by name, rather than quietly counted as passing. (Scenarios *off the request path* used to be excluded wholesale; the request and state probes narrowed that exclusion to what genuinely has no deployed surface.)

## Decisions that were reversed, and why

Earlier rules were traded away deliberately. They're recorded here with what each protected, so the trade can be revisited rather than re-derived.

- **The browser used to be remote, and no local binary was ever looked for.** That made a walk behave identically on a laptop, in a container, and in CI — genuine machine-independence. It also made the walk *Cloudflare-only*, because the remote browser was Cloudflare Browser Run, which meant the one verb whose job is proving a change works was withheld from every repo that didn't buy that stack. Traded for: a walk that runs anywhere. What was lost is real, which is why every report now names where the browser ran.
- **The walk used to install nothing at all.** `playwright-core` in your `devDependencies` was the opt-in *precisely because* nothing would install it — consent detected from state, with no flag anywhere. Traded for: a walk that works with no setup. Once the browser became a machine-level tool there was no repo state left to read, so adoption stopped existing as a concept and `NONE` narrowed to its one honest meaning.
- **The walk used to record a video per journey.** `agent-browser` captures screenshots and not video. Little was lost: a reviewer reads a screenshot against a written `THEN`; nobody scrubs a video to check a merge, and GitHub never played them inline anyway. Full-page and annotated capture replace it.
- **The walk used to keep only what a browser could see.** That made the browser the definition of "observable", so an API-only change or a queue consumer with a queryable effect produced no evidence at all — `NONE`, with the scenarios silently outside the walk's world. Traded for: the probe ladder, where the browser is one probe among three and the exclusion narrowed to what genuinely has no deployed surface. What the old rule protected — never running the repo's code locally, never adding tooling — is kept as an explicit rule rather than as a side effect of the browser boundary. The verb was renamed `/walk` → `/verify` with this broadening, in 12.0.0.

**Why this engine.** [`agent-browser`](https://github.com/vercel-labs/agent-browser) was chosen over Playwright, Playwright MCP, and the agent's own built-in browser. Playwright and Playwright MCP are *repo* dependencies, which would force a Node toolchain into repos that have none — the exact problem being solved. The agent's own browser is desktop-only, plan-gated, and can't run where the walk runs; more importantly, an agent that drives a browser and reports what it saw is grading its own work, while this walk's value is a screenshot a reviewer checks against words written before the walk existed.

The engine is pre-1.0, and that risk is accepted with an exit: journeys are declarative command arrays rather than engine API calls, the driver is a single shell script, and `agent-browser get cdp-url` keeps a plain CDP path open. Replacing the engine means rewriting one script, not the capability.

## Related

- [The change loop](the-change-loop.md) — the loop `/verify` sits beside, and the gate ladder it is deliberately not part of.
- [Required tools](required-tools.md) — what the toolkit needs, and what `/verify` adds to that.
- [Secrets](secrets.md) — where the optional variables above live.
- [Cloudflare Access](../stack/cloudflare-access.md) *(stack-pack repos)* — the login wall, and the service token the heal produces.
- [Deploy and data pipeline](../stack/d1-pipeline.md) *(stack-pack repos)* — what publishes the preview URL, and where `db:reset:staging` comes from.
