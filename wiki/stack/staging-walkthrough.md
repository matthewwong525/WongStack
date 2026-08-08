# Staging walkthrough

What [`/walk`](../../.claude/skills/walk/SKILL.md) does: the change's own OpenSpec scenarios walked against the deployed preview in a real browser, graded against what those scenarios said would happen. Screenshots, video, and the verdict land as a comment on the pull request.

It exists because CI answers *did it build and did the checks pass*. It doesn't answer *does this do what it promised*. The promise is already written down — every requirement in a change's delta specs is a `#### Scenario:` with a `WHEN` and a `THEN` — and the [deploy pipeline](d1-pipeline.md) already puts every branch on a real staging Worker with a per-commit URL. The walkthrough is the wire between the two.

**It gates nothing.** `/walk` is a verb you invoke because you want to see the thing working; `/ship` merges on CI-green alone and never consults a walk ([the gate](../development/the-change-loop.md#the-gate)). So run it whenever it's useful — halfway through a change, twice in a row, or right before shipping. There is no wrong moment and no limit.

**And nothing here is on by default.** A repo that doesn't adopt it has a `/walk` that reports `NONE` and stops. Adoption follows the [Cloudflare Access](cloudflare-access.md) pattern: you take the capability, and the capability is detected from what's there rather than from a flag.

## Adopting it — three rungs

Each rung degrades cleanly to the one below. Rung 1 is the whole opt-in; 2 and 3 are only needed if they apply to you.

### 1. Add playwright-core — this is the entire opt-in

```bash
cd app                        # wherever your package.json lives
npm i -D playwright-core
```

That's it — **no browser install, ever.** The browser is a [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/) session on Cloudflare's edge, reached over CDP with the same `CLOUDFLARE_API_TOKEN` the [stack pack provisions](cloudflare-credentials.md) (the `/wong-cloudflare` widen grants the Browser Rendering permission). `playwright-core` is the library half of Playwright with no bundled browsers, which is exactly why it's the right dependency: nothing about this opt-in touches your machine. Plain `playwright` also counts — repos that adopted before Browser Run keep walking without changing anything.

There is **no manifest field, no config file, and no flag.** The dependency in your app's `devDependencies` *is* the consent signal, and the next `/walk` walks. Remove it and `/walk` goes back to reporting `NONE`.

`/walk` will never install anything for you — not the dependency, not on a prompt. If the dependency is declared but `node_modules` isn't installed, or the token is missing or was never widened into Browser Rendering, the walk reports `UNKNOWN` and names the fix; it doesn't run it.

**Browser time is metered.** The free plan includes roughly 10 browser-minutes per day and 3 concurrent browsers; Workers Paid includes 10 browser-hours per month, then ~$0.09/hour ([limits](https://developers.cloudflare.com/browser-run/limits/), [pricing](https://developers.cloudflare.com/browser-run/pricing/)). A walk opens one session per journey, so concurrency is never the constraint — but a free-plan repo gets about one full-budget walk a day, and an exhausted budget reports as `UNKNOWN`, not as a failure. One caveat: an [Access](cloudflare-access.md) policy that filters by source IP would see Cloudflare's egress rather than yours — the payload's Access setup uses service tokens, not IPs, so this only matters if you added IP rules yourself.

**Prerequisite: your branch must publish a preview URL.** The walk targets the per-commit alias, discovered by asking GitHub what was deployed for this commit — never constructed from a naming convention. On Workers Builds, Cloudflare publishes that automatically; on GitHub Actions, the pack's workflow does it ([how the alias URL reaches the tooling](d1-pipeline.md#how-the-alias-url-reaches-the-tooling)). A repo whose CI doesn't deploy at all has no URL to walk, and the walkthrough reports `UNKNOWN` rather than guessing one.

**Prerequisite: your seed must make the app exercisable.** Staging is a [seeded fixture database](d1-pipeline.md#seeded-staging-production-untouched), and `schema/seed.sql` ships empty. Journeys need something to act on — a demo account, a couple of reference rows. An empty seed produces journeys that can't do anything, which grade as failures for a reason that isn't a bug.

### 2. Access service token — only if you have a login wall

If you adopted [Cloudflare Access](cloudflare-access.md), your preview URLs sit behind a login and a headless browser gets challenged. Put the service token's two values in the primary worktree's durable `.env` per the [secrets convention](../development/secrets.md); `/walk` resolves that file even when invoked from a linked worktree:

```
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

The walk sends them as `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers. **Without them it reports `UNKNOWN` — not a pass** — and does not screenshot the login form and call it green. That distinction is the single most important property here: a walkthrough that reports success against a login page is worse than no walkthrough, because it converts an unchecked assumption into a checked-looking one.

> **A `401` from your own app, with a valid service token, means the Worker is authenticating the wrong way.** Access strips the two headers above and sets **no email header** for a service token, so a Worker that reads `Cf-Access-Authenticated-User-Email` rejects the walk — and every other machine caller — while working fine in your browser. It looks like a walk problem and isn't. The symptom is distinctive: the walk gets *past* Access (no challenge) and then every journey fails on an app-rendered `401`. Verify the signed assertion instead — [`app/worker/access.ts`](cloudflare-access.md#the-auth-model-verify-the-signed-assertion) reads `email` for humans and `common_name` for service tokens, which is what makes one path serve both.

### 3. A public bucket — only if you want media in the comment

```
WALK_MEDIA_BUCKET=my-walkthrough-evidence
WALK_MEDIA_BASE_URL=https://pub-xxxx.r2.dev
```

With these set, screenshots and video are uploaded and linked from the PR comment. Without them, the comment cites local paths — **not a failure, and not reported as one.** The comment is written to stand on its own as prose; the media corroborates it.

**Video is always a link, never an inline player.** GitHub plays video inline only for `user-attachments` URLs, which are produced by dragging a file into the web UI — there is no API or CLI path to that endpoint. Don't go hunting for one.

## What actually happens

```
  /save ───── push, wait for CI, resolve the per-commit preview URL
     │        (CI green is what proves a version was published for THIS commit)
     │
     ├─ scout ──── the change's delta specs
     │             + specs whose files this diff touches
     │             → keep only what a browser can see
     │
     ├─ walk ───── one generated script per journey, in a temp dir
     │             screenshot every step · video every journey
     │
     ├─ grade ──── evidence read against the scenario's own THEN
     │
     └─ report ─── PR comment (every verdict), then delete the temp dir
```

`/walk` starts with `/save` because the preview alias only exists once CI has published *this* commit. Walking earlier walks the previous commit, or nothing — and a URL built by hand from a naming convention can address a commit that was never deployed and still answer `200`.

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

None of them gates anything — they describe what gets **reported**.

| | | |
|---|---|---|
| **NONE** | not adopted, or nothing browser-observable to walk | one line naming which |
| **SUCCESS** | every journey satisfied its `THEN` | the evidence comment |
| **FAILURE** | a journey contradicted its `THEN` | the evidence comment, then reset and stop |
| **UNKNOWN** | the walk couldn't run or couldn't be trusted | **unverified** — the comment says so, and why |
| **TIMEOUT** | the walk exceeded its budget | **unverified** — what completed, and where it stopped |

The line that matters: **before you adopt it, silence is normal; after you adopt it, silence is suspicious.** An un-adopted repo's empty walk is `NONE`. An adopted repo's un-runnable walk is `UNKNOWN` — unverified, which is not the same as absent.

That distinction survives even though nothing hangs on it any more. It's now about honest reporting rather than about a merge: a comment that reads like a pass because a login page rendered is exactly the outcome worth preventing, whether or not a merge was waiting on it.

## When a walk fails

The evidence is posted first — a failing walk's screenshots are the whole point — then staging is reset (`npm run db:reset:staging`) and `/walk` stops. It does not fix, re-push, or re-walk. You fix, and run `/walk` again when you want to.

The reset isn't housekeeping. A walk that starts against the half-mutated database a failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers instead of the bug. A **passing** walk's data is left alone — staging is a fixture, not something to preserve.

**Destructive journeys are walked, not skipped.** Deleting things is often the scenario most worth exercising, and with no merge riding on the verdict there's no pressure to quietly shed that coverage. Staging is a fixture database and a reset is [routine recovery](d1-pipeline.md#seeded-staging-production-untouched), so there's nothing to protect.

## What this deliberately isn't

Recorded so it isn't re-litigated:

- **Not a test suite.** Nothing is saved, so coverage never accumulates. If you want regression tests, write real ones and run them in CI — a different decision, and a good one, but not this. (If you do: the same Browser Run endpoint works from GitHub Actions with the `CLOUDFLARE_API_TOKEN` secret the pack already set, so a committed Playwright suite in CI needs no browser install either. Nothing in the payload wires this yet — it's a natural follow-up.)
- **Not automatic on `/save`.** `/walk` *begins* by invoking `/save` — that's how the preview URL comes to exist — but the reverse was declined: `/save` does not walk. Staging redeploys on every push, so walking there would fire N times per change, with the reseed and fix loop running while the surface is still changing. You choose the moments; the tool doesn't choose them for you.
- **Not automatic on `/ship` either.** It used to be — a gate between green CI and the merge. Making the walk a merge gate forced everything around it: a walk that couldn't run had to block, retries had to share `/ship`'s attempt budget, and the only moment you could see your app was the moment you were done with it. Invoking it deliberately costs one command and buys back all three.
- **No second judging agent.** The concern is real: an agent that plans a journey, drives it, and grades its own screenshots has every incentive to see success. The mitigation is *provenance* rather than redundancy — the `THEN` was written by [`/plan`](../../.claude/skills/plan/SKILL.md), before the walk existed, for reasons unrelated to passing it. Ambiguous evidence stops and asks a human rather than being resolved either way. A second judge is a clean addition later if the grading proves to rubber-stamp.
- **Not a regression sweep of `openspec/specs/`.** A delta-scoped walk stays flat while a full-surface walk grows with the app forever.
- **Nothing off the request path.** A preview alias serves HTTP only — queue consumers and cron triggers run on the [deployed staging Worker](d1-pipeline.md#why-staging-is-a-whole-worker), not on a version. Those scenarios are reported as not walkable rather than quietly counted as passing.

## Related

- [Deploy and data pipeline](d1-pipeline.md) — what publishes the preview URL this walks, and where `db:reset:staging` comes from.
- [Cloudflare Access](cloudflare-access.md) — the login wall, and the service token rung 2 needs.
- [Secrets](../development/secrets.md) — where the variables above live.
- [The change loop](../development/the-change-loop.md) — the loop `/walk` sits beside, and the gate ladder it is deliberately not part of.
- [Cloudflare stack](README.md) — the section hub.
