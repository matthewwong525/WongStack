# Staging walkthrough

What [`/verify`](../../.agents/skills/verify/SKILL.md) does: the change's own OpenSpec scenarios exercised end to end against the deployed preview and graded against what those scenarios said would happen. The evidence and verdict land as a comment on the pull request.

It exists because CI answers *did it build and did the checks pass*. It doesn't answer *does this do what it promised*. The promise is already written down — every requirement in a change's delta specs is a `#### Scenario:` with a `WHEN` and a `THEN` — and any branch that publishes a preview URL already puts the change somewhere a probe can reach. The walkthrough is the wire between the two.

**Its own run gates nothing** ([the gate](the-change-loop.md#the-gate) owns the rule), so run it whenever it helps: halfway through a change, twice in a row, or right before shipping.

**It works in any repo, on any stack.** The browser is a standalone CLI on your machine, not a project dependency ([required tools](required-tools.md)), and request probes ride on `curl`. There is no opt-in to perform and no flag to set.

This page owns the reasons. [The walkthrough reference](../../.agents/skills/verify/references/walkthrough.md) owns how a walk runs: the scout, the journeys, the grading, and the comment.

## The probe ladder

[The scout](../../.agents/skills/verify/references/walkthrough.md#a--scout-the-scenarios) gives each scenario the strongest probe that can observe it, and the browser is one probe among three, so an API-only change still gets evidence.

A scenario **no probe reaches** is **listed by name as unverified**, never silently dropped: excluding it silently is how an unchecked assumption starts to look checked. Its e2e home is a CI test; the walk exercises what CI deployed, and only that.

## What a walk needs

- **A browser, only for a UI journey.** `/verify` installs it on the machine and says so ([required tools](required-tools.md)).
- **A preview URL.** The walk asks GitHub what was deployed for this commit, so Vercel, Netlify, Cloudflare, Render, Fly, and GitHub Pages previews are found the same way. It never builds a URL from a naming convention: that URL can address a commit that was never deployed and still answer `200`. A repo whose CI doesn't deploy gets `UNKNOWN`.
- **Optional: a public bucket** (`WALK_MEDIA_BUCKET`, `WALK_MEDIA_BASE_URL`) to show screenshots in the comment. Without it the comment cites local paths, which is not a failure. The `WALK_` names stay, because renaming a variable users already set breaks them silently.
- **An Access service token**, provisioned automatically when [Cloudflare Access](../stack/cloudflare-access.md#5-create-the-service-token-do-it-now) gates your previews. `/verify` mints one if you have none: [when the walk can't get in](#when-the-walk-cant-get-in).
- **A seed, on a seeded stack.** Where staging is a [seeded fixture database](../stack/d1-pipeline.md#seeded-staging-production-untouched), `schema/seed.sql` ships empty. Journeys then have nothing to act on, and fail for a reason that isn't a bug.

## Why a walk runs the way it does

- **The scout runs first, so having nothing to verify costs nothing.** A change with no deployed surface reaches `NONE` after a few file reads: no push, no CI wait, no browser.
- **`/verify` runs `/save` before it walks,** because the preview exists only once CI has published *this* commit. Verifying earlier verifies the previous commit, or nothing.
- **Journeys come from scenarios, not routes,** because the scenarios are what the change promised.
- **Journeys hold no assertions,** because an assertion written moments before it is deleted encodes a guess at correctness, and "nothing errored" is not "the thing worked".
- **Every navigating step waits before its screenshot,** because a screenshot taken before the page paints captures the page you left: one two-step journey produced two byte-identical screenshots of it.
- **Every report names each journey's probe and where it ran.** A walk driven on one machine depended on that machine, and a reader comparing two walks needs to know.
- **A pass says how much it showed.** A journey with a claim no probe can observe is marked *partly shown*, naming the claim, because a plain pass hides the gap: 14 of 21 passed journeys on six real walks left a claim unshown. It doesn't change the verdict; most real promises hold a part a preview can't show, and failing them would make every walk fail.
- **Evidence is scrubbed before it leaves the machine.** The driver adds the Access token to every request, so a journey that lists requests copies it into evidence; one did. Every `.env` value and token-shaped string in the run folder's text is replaced before the comment is posted. Pictures can't be read, so a journey never captures request headers.
- **A plain check posts nothing unless you ask.** A screenshot or a click-through with no change behind it has no promise to grade, and a pull-request comment reports a change's verdict.

### Walk the app the way a person does

A journey should reach a behavior the way its user reaches it — a UI scenario clicks the thing that calls the API rather than navigating straight to the API route. That isn't style advice; on a static-asset-fronted stack it changes the answer:

```
Sec-Fetch-Mode: navigate   →  index.html   (the SPA fallback; your server code never runs)
anything else              →  your application's response
```

Cloudflare's static-asset layer — and equivalents elsewhere — intercept **browser navigations** and serve the SPA fallback *before* your code executes. So `curl /api/` returns JSON while typing `/api/` into an address bar returns the app, and a browser journey that navigates directly to an API route is testing the asset layer, not the API.

The same fact read the other way is why request probes work: a non-navigation request reaches your application's response directly, which is exactly what an API scenario's `THEN` is about. The two probes exercise the two paths a real caller uses — match the probe to who the scenario's user is.

## The verdicts

[The skill's verdict table](../../.agents/skills/verify/SKILL.md#verdicts) owns the five verdicts. None of them gates anything on `/verify`'s own run; [`/ship`'s walk step](../../.agents/skills/ship/SKILL.md#step-4--verify-the-preview-evidence-not-a-gate) owns what a failed walk does there. An un-runnable walk is `UNKNOWN`, never `NONE`, [the same rule as the git gate](../../.agents/skills/save/references/git-gate.md): a comment that reads like a pass because a login page rendered is the outcome worth preventing.

## When the walk can't get in

An [Access](../stack/cloudflare-access.md) login wall stops a walk before it sees the app. Where a Cloudflare API token exists, `/verify` [heals it itself](../../.agents/skills/verify/SKILL.md#when-a-block-stops-the-walk) rather than sending you on an errand. The repair is already authorized: pasting a token *is* [the authorization to widen it](../stack/cloudflare-credentials.md#the-widen-is-pre-authorized). With no token, the verdict is `UNKNOWN` naming the wall, never a graded login page.

**One heal and one retry**, never a loop. A block that survives its repair is `UNKNOWN` with the attempt named, so an unverified walk never looks like an untried one.

## When a walk fails

[`/verify`](../../.agents/skills/verify/SKILL.md#order) posts the evidence before it resets staging, because a failing walk's evidence is the whole point.

The reset isn't housekeeping. A walk that starts against the half-mutated database a failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers instead of the bug. A **passing** walk's data is left alone — staging is a fixture, not something to preserve.

It fixes only an [in-scope](../../.agents/skills/verify/references/walkthrough.md#e--after-a-failure) failure, and says which way it judged, so you can disagree. The two-attempt bound is what keeps the loop from becoming a grinder: a walk that can't fix its own change in two tries has found something worth a human reading, and chasing an unrelated bug is how a walk quietly turns into a different change.

## What it is not

- **Not a test suite.** Nothing is saved, so coverage never accumulates. Regression tests belong in CI as real tests.
- **Not automatic on `/save`.** Staging redeploys on every push, so a walk there would fire many times per change while the surface still changes. You choose the moments.
- **Not a gate.** A gate would force an unrunnable walk to block, and you could only see your app when you were done with it. `/ship` runs one walk for evidence; a `FAILURE` puts the decision in front of you.
- **No second judging agent.** An agent that grades its own walk has every reason to see success, so the check is *provenance*: [`/plan`](../../.agents/skills/plan/SKILL.md) wrote the `THEN` before the walk existed, and ambiguous evidence goes to a human. Measured on 2026-10-03: fresh agents walked 20 past journeys again and disagreed with none, and the walk passed none of 30 mistakes planted on a practice site. A second judge would have changed no verdict.
- **Not a regression sweep of `openspec/specs/`.** A delta-scoped walk stays flat; a full-surface walk grows with the app forever.
- **Not an unbounded fix loop.** An agent that fixes and re-verifies until something passes will eventually pass something. The walk's value is its willingness to report a failure.
- **No local execution, and no invented tooling.** A scenario that only local code or new tooling could observe is reported as unverified, by name, rather than counted as passing.

**Why this engine.** [`agent-browser`](https://github.com/vercel-labs/agent-browser) beats Playwright and Playwright MCP because those are *repo* dependencies, which would force a Node toolchain into repos that have none. The agent's own browser is desktop-only and plan-gated, and it grades its own work. The engine is pre-1.0; the exit is that journeys are declarative command arrays, the driver is one shell script, and `agent-browser get cdp-url` keeps a plain CDP path open. For a browser somewhere else, `agent-browser` supports remote providers (Browserless, Browserbase, Browser Use) through its own settings; WongStack adds no variable for it.

## Related

- [The change loop](the-change-loop.md) — the loop `/verify` sits beside, and the gate ladder it is deliberately not part of.
- [Required tools](required-tools.md) — what the toolkit needs, and what `/verify` adds to that.
- [Secrets](secrets.md) — where the optional variables above live.
- [Cloudflare Access](../stack/cloudflare-access.md) — the login wall, and the service token the heal produces.
- [Deploy and data pipeline](../stack/d1-pipeline.md) — what publishes the preview URL, and where `db:reset:staging` comes from.

Part of [development](README.md).
