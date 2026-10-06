# Staging walkthrough

[`/verify`](../../.agents/skills/verify/SKILL.md) checks a saved change against its written scenarios, using the deployed preview or behavior captured by existing automated checks. One pull-request comment holds the evidence, verdict and remaining gaps.

The promise is already written down: each scenario has a `WHEN` and a `THEN`. The walkthrough puts observed behavior beside that promise. A green automated check, successful command or `200` response alone cannot show that the promised result happened.

**Its own run gates nothing** ([the gate](the-change-loop.md#the-gate) owns the rule), so run it whenever it helps: halfway through a change, twice in a row, or right before shipping.

**Preview checks need no setup, on any stack.** The browser is a standalone CLI on your machine ([required tools](required-tools.md)); request probes use `curl`. CI behavior checks use a project-owned capture recipe and an existing workflow that keeps its observations.

This page owns the reasons. [The walkthrough reference](../../.agents/skills/verify/references/walkthrough.md) owns how a walk runs: the scout, the journeys, the grading, and the comment.

## The probe ladder

[The scout](../../.agents/skills/verify/references/walkthrough.md#a--scout-the-scenarios) selects the strongest existing browser, request, deployed-state or CI capture route for each scenario. An API-only or command-line change can therefore get evidence too.

A scenario **no probe reaches** is **listed by name as unverified**. Missing access or evidence for a known route holds up that check alone; independent checks still finish. Repository code never runs locally to fill a gap.

## Adopt a CI capture

Prove one real capture before making it reusable. Exercise the feature through its actual entry point in the existing automated checks, inspect raw results against the written scenario, and confirm evidence survives fixture cleanup. Start with what that working example needs.

The small [recipe contract](../../.agents/skills/verify/references/ci-evidence.md) names source paths, current scenarios, one owning capture guide and the workflow artifact. The guide owns commands, prerequisites, isolation and cleanup; the scenarios own expectations. Projects keep their recipes in `.agents/verification/`, outside copied skills. `/verify` reads them without edits. Missing references or prerequisites leave the affected check unverified; ordinary preview checks still work without a recipe.

Captured observations identify the repository, actual source revision, run and attempt, command and raw output. Collection checks their identity and integrity against the newest matching run. An old passing attempt cannot replace missing current evidence. Downloads are read as observations, never executed. [The CI reference](../../.agents/skills/verify/references/ci-evidence.md) owns collection commands and artifact-expiry limits; project-specific capture knowledge stays in that project's guide.

## Follow the promised result

For a fix or preservation claim, compare the named earlier revision and saved head using the same behavior, inputs, capture method and relevant environment. A missing or incompatible baseline leaves the comparison unverified while valid head observations remain usable. A head-only pass cannot prove a repair.

Follow confirmed callers or data contracts into the few consumers that could break, including another capability. Name the relationship and use its existing written expectation. A possible consumer with no confirmed connection cannot expand the walk; missing expectations remain coverage gaps. Extra checks grant no permission to repair unrelated code.

When a promise says a result lasts, observe it freshly through its real consumer: reload a saved record or independently read an exported file's bytes. Keep both the initiating response and readback. A success message followed by a missing value is a failure; unavailable readback stays unverified or partly shown under the existing limits. Read-only commands need no invented persistence check.

## What a walk needs

- **A browser, only for a UI journey.** `/verify` installs it on the machine and says so ([required tools](required-tools.md)).
- **A preview URL, for deployed checks.** The walk asks GitHub what was deployed for this commit, so Vercel, Netlify, Cloudflare, Render, Fly, and GitHub Pages previews are found the same way. It never builds a URL from a naming convention: that URL can address a commit that was never deployed and still answer `200`. A missing preview leaves its dependent checks unverified. CI-only checks need no preview or browser.
- **Nothing for its pictures.** A walk keeps its screenshots in the [memory store](memory.md)'s private bucket, in their own `walks/` folder, with no end date; the comment links each one. The live site serves them at `/_walk/` behind its login: anyone who can log in to the app can open a link, only the walk's own access token can add a picture, and none is replaced. The route is handed the bucket alone and builds every key under `walks/`, so no link reaches a transcript. They are not kept when the Cloudflare account has no storage ([without R2](memory.md#without-r2)), the site has no login yet (they would be open to anyone), the machine has no access token, or the live site doesn't serve them yet; the comment then says why and names no file, and the verdict stands. Ask in chat for a past check's pictures, and `/verify` fetches them from the comment's links. A public bucket (`WALK_MEDIA_BUCKET`, `WALK_MEDIA_BASE_URL`) shows them inline instead; the `WALK_` names stay, because renaming a variable users already set breaks them silently.
- **An Access service token**, provisioned automatically when [Cloudflare Access](../stack/cloudflare-access.md#5-create-the-service-token-do-it-now) gates your previews. `/verify` mints one if you have none: [when the walk can't get in](#when-the-walk-cant-get-in).
- **A seed, on a seeded stack.** Where staging is a [seeded fixture database](../stack/d1-pipeline.md#seeded-staging-production-untouched), each walk starts from `schema/seed.sql`, which ships empty. A journey with no sample data creates its records through the app's own screens. Where it can't, the scenario is unverified and the report names the missing sample data: the cue to [add the rows](../../.agents/rules/code.md#sample-data-and-timed-jobs).

## Why a walk runs the way it does

- **The scout runs first, so having nothing to verify costs nothing.** No deployed or existing CI capture route means `NONE` after a few file reads: no push, no CI wait, no browser. A known route with missing evidence stays unverified.
- **Finish the implementation before automatic verification.** Write tests with source; source-complete work is not a passing test result. Explicit early requests still work.
- **`/verify` saves only unsaved or unpushed work.** A read-only identity check binds the clean local and authoritative remote head to its newest gate. Reuse the final checkpoint without record-only commits or another settled wait. Unreadable or foreign identity stays unverified; a newer run attempt defeats old success. Every invocation still gathers fresh walkthrough evidence. Changed source, scenarios or relevant runtime require affected evidence again; repaired source gets a fresh gate.
- **Journeys come from scenarios, not routes,** because the scenarios are what the change promised.
- **Safe checks finish before you are asked to help.** A missing login or unclear result holds up only the checks that depend on it. You get one list of what remains, the exact help needed, and what the check should show. You can help, skip selected checks, or skip them all. Skipped checks stay unverified; the assistant does not ask again unless you reopen them. Once you help, the walk resumes those checks; it repeats completed checks only if their conditions changed.
- **Safe simulations show what they can before the handoff.** Existing deployed interfaces, disposable data, and test integrations may show part of a blocked check. Simulated evidence names what it supports and what remains unproven: a simulated message does not prove real delivery or a person's experience. Simulations keep the same staging safeguards and use no local app execution or invented tools. Skipping a remaining check cannot erase a failure or make an unchecked promise pass.
- **A walk takes a turn and rebuilds staging first.** Every branch shares one staging app and database, so two walks at once would trip over each other's data. A walk waits for [the staging turn](../stack/d1-pipeline.md#staging-is-shared-and-thats-the-trade), rebuilds staging from the seed, walks, and gives the turn back on every exit. Each walk then starts from the same known data. A walk that gets no turn or no rebuild in time leaves its staging-data checks unverified, says why, and finishes the rest.
- **Inside staging, the walk does anything.** It creates, edits, and deletes with no asking and no tidying up. That is safe because of a proof, not a judgement: the walk's setup confirms every database, queue, and bucket in staging is [its own twin](../stack/staging-bindings.md#twin-every-stateful-binding) and the database is not production's, and the next walk rebuilds it all. Without that proof, a write first needs disposable records the walk owns and can clean up, or the check stays unverified.
- **An outside service runs only on a staging-only key.** Staging gets the live app's keys unless you give it [its own](../stack/staging-bindings.md#same-values-by-default-diverge-where-writes-escape), so a staging email could reach a real customer. The walk reads which keys staging shares with the live app. A service on its own test key is used freely; one on a shared key is never triggered, and the report names it and says a staging-only key unlocks the check.
- **A timed job is run by hand.** The walk starts the job through the project's [manual trigger](../stack/staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them) on staging and grades what it did. The timetable itself stays partly shown; with no trigger, the scenario is unverified.
- **A fresh journey holds no assertions,** because an assertion written moments before it is deleted encodes a guess at correctness, and "nothing errored" is not "the thing worked". A [kept check](kept-checks.md) records only what a graded pass showed.
- **Every navigating step waits before its screenshot,** because a screenshot taken before the page paints captures the page you left: one two-step journey produced two byte-identical screenshots of it.
- **One report names each check's probe, environment and revision.** It includes raw results, fresh readbacks, consumer relationships, compared revisions and limits. Practice or simulated observations are labelled; a missing surface cannot hide completed checks.
- **A pass says how much it showed.** A journey with a claim no probe can observe is marked *partly shown*, naming the claim, because a plain pass hides the gap: 14 of 21 passed journeys on six real walks left a claim unshown. It doesn't change the verdict; most real promises hold a part a preview can't show, and failing them would make every walk fail.
- **Evidence is scrubbed before it leaves the machine.** The driver adds the Access token to every request, so a journey that lists requests copies it into evidence; one did. Every `.env` value and token-shaped string in the run folder's text is replaced before the comment is posted. Pictures can't be read, so a journey never captures request headers.
- **The comment links each picture and shows none inline,** because GitHub fetches a picture without the reader's login and would get nothing. Only a public bucket's pictures can sit in the comment.
- **A plain check posts nothing unless you ask.** A screenshot or a click-through with no change behind it has no promise to grade, and a pull-request comment reports a change's verdict.
- **A check only the published change can pass is a thread, not a task.** An unticked task stops [`/ship`](../../.agents/skills/ship/SKILL.md)'s archive, and this one can't be ticked before the merge: *a kept picture opens on the live site*. Record it as an open `verify` thread in [memory](memory.md), run it right after the merge, and write the result on the thread.

### Walk the app the way a person does

A journey reaches a behavior the way its user does: a UI scenario clicks the thing that calls the API, not the API route. On a static-asset-fronted stack that changes the answer:

```
Sec-Fetch-Mode: navigate   →  index.html   (the SPA fallback; your server code never runs)
anything else              →  your application's response
```

Cloudflare's static-asset layer, like its equivalents, intercepts **browser navigations** and serves the SPA fallback *before* your code runs. So `curl /api/` returns JSON while `/api/` in an address bar returns the app: a journey that navigates there tests the asset layer, not the API.

That is why request probes work: a non-navigation request reaches your application, as an API scenario's `THEN` expects. Match the probe to the scenario's user. A probe sends no `Origin` header, so a save that needs one, such as [Access](../stack/employee-access.md)'s, takes a browser journey.

## The verdicts

[The skill's verdict table](../../.agents/skills/verify/SKILL.md#verdicts) owns the five verdicts. None of them gates anything on `/verify`'s own run; [`/ship`'s walk step](../../.agents/skills/ship/SKILL.md#step-4--verify-the-preview-evidence-not-a-gate) owns what a failed walk does there. A reachable check blocked by access, safety, or ambiguous evidence makes the walk `UNKNOWN`, unless another check failed or the budget expired. A claim no probe can observe stays partly shown. An un-runnable walk is `UNKNOWN`, never `NONE`, [the same rule as the git gate](../../.agents/skills/save/references/git-gate.md): a comment that reads like a pass because a login page rendered is the outcome worth preventing.

## When the walk can't get in

An [Access](../stack/cloudflare-access.md) login wall stops a walk before it sees the app. Where a Cloudflare API token exists, `/verify` [heals it itself](../../.agents/skills/verify/SKILL.md#when-a-block-stops-the-walk) rather than sending you on an errand. The repair is already authorized: pasting a token *is* [the authorization to widen it](../stack/cloudflare-credentials.md#the-widen-is-pre-authorized). With no token, the affected checks stay unverified and join the final help list. Other safe checks still run; a login page never counts as the app working.

**One heal and one retry**, never a loop. A surviving block names the attempt in the help list. Completed writes are not replayed just because another check needed repair.

## When a walk fails

[`/verify`](../../.agents/skills/verify/SKILL.md#order) finishes independent safe checks and preserves their evidence through repairs and retries. It posts one final report after any bounded repairs. Otherwise the first failure could hide the results of everything else.

A failed walk cleans up nothing in a staging it may write freely: the walk after a fix rebuilds staging from the seed, under the same turn, so a retry never debugs leftovers from its own earlier checks. Elsewhere, cleanup restores only the walk's own disposable data, and shared data stays intact.

It fixes only an [in-scope](../../.agents/skills/verify/references/walkthrough.md#e--after-a-failure) failure, and says which way it judged, so you can disagree. Two attempts keep the loop from becoming a grinder: a walk that can't fix its own change in two tries has found something worth a human reading, and chasing an unrelated bug turns a walk into a different change.

When existing CI can cheaply reproduce an in-scope defect, keep a focused regression check. Inspect that same check failing for the observed defect on the exact earlier source and passing on the repaired head; the head's complete checks must still pass. If a lasting check is impractical, retain the available reproduction and name missing proof and setup limits. This calls for no new framework or weaker check.

## What it is not

- **Not a test suite.** The walk gathers and grades observations; a kept check only records a pass. Practical checks retained during repairs belong in the project's CI suite.
- **Not automatic on `/save`.** Staging redeploys on every push, so a walk there would fire many times per change while the surface still changes. You choose the moments. [Kept checks](kept-checks.md#when-it-replays) replay only before publishing, for the same reason.
- **Not a gate.** A gate would force an unrunnable walk to block, and you could only see your app when you were done with it. `/ship` runs one walk for evidence; a `FAILURE` puts the decision in front of you.
- **No second judging agent.** An agent that grades its own walk has every reason to see success, so the check is *provenance*: [`/plan`](../../.agents/skills/plan/SKILL.md) wrote the `THEN` before the walk existed, and ambiguous evidence goes to a human. Measured on 2026-10-03: fresh agents walked 20 past journeys again and disagreed with none, and the walk passed none of 30 mistakes planted on a practice site. A second judge would have changed no verdict.
- **Not a fresh walk of all of `openspec/specs/`.** The walk selects change scenarios and narrowly connected consumers; a full-surface walk grows with the app forever. Older promises replay from kept checks instead.
- **Not a check of the live app.** A walk writes, so it stays in staging. After publishing, [`/ship`](../../.agents/skills/ship/SKILL.md#look-at-the-live-app) takes one look at the live app instead: it waits for the release, opens the app, and saves, sends, or buys nothing. A failed release is said in the same chat, with one fix built and offered. A look that cannot run is one report line. **A planned check that needs the live app is open work in [memory](memory.md), not a task in the plan**: an unticked task stops the publish, and this one can not be ticked before it.
- **Not an unbounded fix loop.** An agent that fixes and re-verifies until something passes will eventually pass something. The walk's value is its willingness to report a failure.
- **No local execution, and no invented tooling.** A scenario that only local code or new tooling could observe is reported as unverified, by name, rather than counted as passing.

**Why this engine.** [`agent-browser`](https://github.com/vercel-labs/agent-browser) beats Playwright and Playwright MCP because those are *repo* dependencies, which would force a Node toolchain into repos that have none. The agent's own browser is desktop-only and plan-gated, and it grades its own work. The engine is pre-1.0; the exit is that journeys are declarative command arrays, the driver is one shell script, and `agent-browser get cdp-url` keeps a plain CDP path open. For a browser somewhere else, `agent-browser` supports remote providers (Browserless, Browserbase, Browser Use) through its own settings; WongStack adds no variable for it.

**Why no test framework.** On 2026-10-05 we looked at the [e2e](https://github.com/tester-army/e2e) test tool and declined it: it adds packages and test files to every project, its AI steps need a paid key a Claude subscription doesn't include, and its guide is two thirds the size of all our skill instructions. Only its replay idea was taken.

## Related

- [The change loop](the-change-loop.md) — the loop `/verify` sits beside.
- [Required tools](required-tools.md) — what `/verify` adds.
- [Secrets](secrets.md) — where the optional variables live.
- [Memory](memory.md) — where a walk's pictures are kept.
- [Cloudflare Access](../stack/cloudflare-access.md) — the login wall and its service token.
- [Deploy and data pipeline](../stack/d1-pipeline.md) — the preview URL and the staging rebuild.

Part of [development](README.md).
