# Staging walkthrough

An **opt-in** gate on [`/ship`](../../.claude/skills/ship/SKILL.md): before the merge, the change's own OpenSpec scenarios are walked against the deployed preview in a real browser, and graded against what those scenarios said would happen. Screenshots, video, and the verdict land as a comment on the pull request.

It exists because every other gate answers *did it build and did the checks pass*. None of them answers *does this do what it promised*. The promise is already written down — every requirement in a change's delta specs is a `#### Scenario:` with a `WHEN` and a `THEN` — and the [deploy pipeline](d1-pipeline.md) already puts every branch on a real staging Worker with a per-commit URL. The walkthrough is the wire between the two.

**Nothing here is on by default.** A repo that doesn't adopt it sees no change in `/ship` at all — no walk, no warning, no added second. Adoption follows the [Cloudflare Access](cloudflare-access.md) pattern: you take the capability, and the capability is detected from what's there rather than from a flag.

## Adopting it — three rungs

Each rung degrades cleanly to the one below. Rung 1 is the whole opt-in; 2 and 3 are only needed if they apply to you.

### 1. Install Playwright — this is the entire opt-in

```bash
cd app                        # wherever your package.json lives
npm i -D playwright
npx playwright install chromium
```

That's it. There is **no manifest field, no config file, and no flag.** `playwright` in your app's `devDependencies` *is* the consent signal, and the next `/ship` walks. Remove the dependency and `/ship` goes back to exactly what it was.

`/ship` will never install this for you — not on a prompt, not as a convenience. Installing a browser modifies your machine rather than your repo, and a merge gate is the wrong place for that decision. If the dependency is declared but the browser is missing, the walk reports `UNKNOWN` and tells you the command; it doesn't run it.

**Prerequisite: your branch must publish a preview URL.** The walk targets the per-commit alias, discovered by asking GitHub what was deployed for this commit — never constructed from a naming convention. On Workers Builds, Cloudflare publishes that automatically; on GitHub Actions, the pack's workflow does it ([how the alias URL reaches the tooling](d1-pipeline.md#how-the-alias-url-reaches-the-tooling)). A repo whose CI doesn't deploy at all has no URL to walk, and the walkthrough reports `UNKNOWN` rather than guessing one.

**Prerequisite: your seed must make the app exercisable.** Staging is a [seeded fixture database](d1-pipeline.md#seeded-staging-production-untouched), and `schema/seed.sql` ships empty. Journeys need something to act on — a demo account, a couple of reference rows. An empty seed produces journeys that can't do anything, which grade as failures for a reason that isn't a bug.

### 2. Access service token — only if you have a login wall

If you adopted [Cloudflare Access](cloudflare-access.md), your preview URLs sit behind a login and a headless browser gets challenged. Put the service token's two values in `.env` per the [secrets convention](../development/secrets.md):

```
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

The walk sends them as `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers. **Without them it reports `UNKNOWN` and refuses to merge** — it does not screenshot the login form and call it green. That distinction is the single most important safety property here: a walkthrough that reports success against a login page is worse than no walkthrough, because it converts an unchecked assumption into a checked-looking one.

### 3. A public bucket — only if you want media in the comment

```
WALK_MEDIA_BUCKET=my-walkthrough-evidence
WALK_MEDIA_BASE_URL=https://pub-xxxx.r2.dev
```

With these set, screenshots and video are uploaded and linked from the PR comment. Without them, the comment cites local paths — **not a failure, and not reported as one.** The comment is written to stand on its own as prose; the media corroborates it.

**Video is always a link, never an inline player.** GitHub plays video inline only for `user-attachments` URLs, which are produced by dragging a file into the web UI — there is no API or CLI path to that endpoint. Don't go hunting for one.

## What actually happens

```
  Step 4   CI green ─────── the deploy published a version for THIS commit
     │
  Step 4.5 ┌─ scout ──── the change's delta specs
     │     │             + specs whose files this diff touches
     │     │             → keep only what a browser can see
     │     │
     │     ├─ walk ───── one generated script per journey, in a temp dir
     │     │             screenshot every step · video every journey
     │     │
     │     ├─ grade ──── evidence read against the scenario's own THEN
     │     │
     │     └─ report ─── PR comment, then delete the temp dir
     │
  Step 5   merge
```

Journeys are derived from **scenarios, not from your routes**. The scenario's `WHEN` becomes the steps; its `THEN` is carried across verbatim as the pass criterion and is what the screenshots are judged against.

The generated scripts contain **no assertions**. Their job is to produce evidence; the verdict is a separate act of reading it. That's deliberate — assertions written moments before being deleted encode a guess at correctness, and "the script didn't throw" is not the same as "the thing worked." A journey that completes cleanly but whose screenshot lacks what the `THEN` describes **fails**.

Nothing is saved. The scripts, screenshots, and video live in a temp directory and leave with it. Your working tree is unchanged whatever the verdict.

### Walk the app the way a person does

A journey should reach a behavior the way a user reaches it — click the thing that calls the API, don't navigate straight to the API route. That isn't style advice; on this stack it changes the answer:

```
Sec-Fetch-Mode: navigate   →  index.html   (the SPA fallback; your Worker never runs)
anything else              →  your Worker's response
```

Cloudflare's static-asset layer intercepts **browser navigations** and serves the SPA fallback *before* the Worker executes. So `curl /api/` returns JSON while typing `/api/` into an address bar returns the app — and a journey that navigates directly to an API route is testing the asset layer, not the API.

This is also the clearest illustration of why the walkthrough exists: a `curl`-based smoke test in CI passes this case, and a real browser does not.

## The five verdicts

| | | |
|---|---|---|
| **NONE** | not adopted, or nothing browser-observable to walk | merge proceeds |
| **SUCCESS** | every journey satisfied its `THEN` | merge proceeds |
| **FAILURE** | a journey contradicted its `THEN` | **no merge** — reset, fix, re-walk |
| **UNKNOWN** | the walk couldn't run or couldn't be trusted | **no merge** — stops |
| **TIMEOUT** | the walk exceeded its budget | **no merge** — stops |

The line that matters: **before you adopt it, silence is normal; after you adopt it, silence is suspicious.** An un-adopted repo's empty walk is `NONE`. An adopted repo's un-runnable walk is `UNKNOWN` — unverified, which is not the same as absent. It's the same rule `/ship` already applies when it can't ask about CI checks.

## When a walk fails

Staging is reset (`npm run db:reset:staging`) **before** the retry, then the fix is pushed, CI re-runs, and the walk repeats — sharing `/ship`'s existing cap of three attempts rather than adding a second budget.

The reset isn't housekeeping. A retry against the half-mutated database a failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers instead of the bug. A **passing** walk's data is left alone — staging is a fixture, not something to preserve.

**Destructive journeys are walked, not skipped.** Deleting things is often the scenario most worth exercising, and a gate that must pass creates quiet pressure to shed exactly that coverage. Staging is a fixture database and a reset is [routine recovery](d1-pipeline.md#seeded-staging-production-untouched), so there's nothing to protect.

## What this deliberately isn't

Recorded so it isn't re-litigated:

- **Not a test suite.** Nothing is saved, so coverage never accumulates. If you want regression tests, write real ones and run them in CI — a different decision, and a good one, but not this.
- **Not part of `/save`.** Staging redeploys on every push, so `/save` would give earlier feedback — at N runs per change, with the reseed and fix loop firing while the surface is still changing. The walk is final acceptance; `/save` is the inner loop.
- **No second judging agent.** The concern is real: an agent that plans a journey, drives it, and grades its own screenshots has every incentive to see success. The mitigation is *provenance* rather than redundancy — the `THEN` was written by [`/plan`](../../.claude/skills/plan/SKILL.md), before the walk existed, for reasons unrelated to passing it. Ambiguous evidence stops and asks a human rather than being resolved either way. A second judge is a clean addition later if the gate proves to rubber-stamp.
- **Not a regression sweep of `openspec/specs/`.** `/ship` runs once per change; a delta-scoped walk stays flat while a full-surface walk grows with the app forever.
- **Nothing off the request path.** A preview alias serves HTTP only — queue consumers and cron triggers run on the [deployed staging Worker](d1-pipeline.md#why-staging-is-a-whole-worker), not on a version. Those scenarios are reported as not walkable rather than quietly counted as passing.

## Related

- [Deploy and data pipeline](d1-pipeline.md) — what publishes the preview URL this walks, and where `db:reset:staging` comes from.
- [Cloudflare Access](cloudflare-access.md) — the login wall, and the service token rung 2 needs.
- [Secrets](../development/secrets.md) — where the variables above live.
- [The change loop](../development/the-change-loop.md) — where `/ship` sits in the flow.
- [Cloudflare stack](README.md) — the section hub.
