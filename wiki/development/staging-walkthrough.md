# Staging walkthrough

What [`/verify`](../../.agents/skills/verify/SKILL.md) does: the change's own OpenSpec scenarios exercised end to end against the deployed preview and graded against what those scenarios said would happen. Each scenario gets the strongest probe that can observe it — a real browser where the scenario is about UI, a direct HTTP request where it is about the request path, an existing command reading deployed state where the effect lands somewhere else — and the evidence and verdict land as a comment on the pull request.

It exists because CI answers *did it build and did the checks pass*. It doesn't answer *does this do what it promised*. The promise is already written down — every requirement in a change's delta specs is a `#### Scenario:` with a `WHEN` and a `THEN` — and any branch that publishes a preview URL already puts the change somewhere a probe can reach. The walkthrough is the wire between the two.

**It gates nothing** ([the gate](the-change-loop.md#the-gate) owns the rule), so run it whenever it helps: halfway through a change, twice in a row, or right before shipping.

**It works in any repo, on any stack.** The browser is a standalone CLI installed on your machine, not a dependency added to your project, so a Python, Rust, or Go repo walks with nothing added to it — and a change with no UI journeys needs no browser at all, because request probes ride on `curl`. There is no opt-in to perform and no flag to set.

## The probe ladder

The scout matches each scenario to the **strongest probe that can observe it end to end**: a browser journey for something rendered, a request probe for the request path, or a state probe where an existing command reads deployed state. [The walkthrough reference](../../.agents/skills/verify/references/walkthrough.md#a--scout-the-scenarios) owns the ladder. The browser is one probe among three, so an API-only change still gets evidence.

A scenario **no probe reaches** is **listed by name as unverified**, never silently dropped: excluding it silently is how an unchecked assumption starts to look checked. Its e2e home is a CI test; the walk exercises what CI deployed, and only that.

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

With these set, screenshots are uploaded and rendered in the PR comment. Without them the comment cites local paths — **not a failure, and not reported as one.** The comment is written to stand on its own as prose; the pictures corroborate it. Request- and state-probe evidence is text and is quoted inline either way. (The `WALK_` names stay: renaming a variable users already set breaks them silently.)

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

The journeys contain **no assertions**. Their job is to produce evidence; the verdict is a separate act of reading it. Assertions written moments before being deleted encode a guess at correctness, and "nothing errored" is not the same as "the thing worked."

Nothing is saved. The journeys and evidence live in a temp directory and leave with it. Your working tree is unchanged whatever the verdict.

### Wait after anything that navigates

A screenshot taken before the destination has painted captures the **previous page**, and a grader reads it as evidence. This is not theoretical: a two-step journey whose click navigated correctly produced two byte-identical screenshots of the page it had already left. The walk would have graded confidently and wrongly.

So every navigating step gets an explicit wait before its screenshot ([the mechanics](../../.agents/skills/verify/references/walkthrough.md#b--write-the-journeys)). It is the easiest way to produce a confidently wrong walk, which is why it is a rule rather than a tip.

### Walk the app the way a person does

A journey should reach a behavior the way its user reaches it — a UI scenario clicks the thing that calls the API rather than navigating straight to the API route. That isn't style advice; on a static-asset-fronted stack it changes the answer:

```
Sec-Fetch-Mode: navigate   →  index.html   (the SPA fallback; your server code never runs)
anything else              →  your application's response
```

Cloudflare's static-asset layer — and equivalents elsewhere — intercept **browser navigations** and serve the SPA fallback *before* your code executes. So `curl /api/` returns JSON while typing `/api/` into an address bar returns the app, and a browser journey that navigates directly to an API route is testing the asset layer, not the API.

The same fact read the other way is why request probes work: a non-navigation request reaches your application's response directly, which is exactly what an API scenario's `THEN` is about. The two probes exercise the two paths a real caller uses — match the probe to who the scenario's user is.

## The verdicts

[The skill's verdict table](../../.agents/skills/verify/SKILL.md#verdicts) owns the five verdicts. None of them gates anything.

**`UNKNOWN` is not `NONE`.** An un-runnable walk is *unverified*, which is not the same as *absent*. A comment that reads like a pass because a login page rendered is exactly the outcome worth preventing, whether or not a merge was waiting on it. There is no opt-in, so `NONE` means only that the change has nothing any probe can reach.

Every report also says **each journey's probe and where it ran**. A walk driven on the machine that invoked it depended on that machine, and a reader comparing two walks is entitled to know that. Scenarios excluded as unverifiable appear in the same report, by name, with the reason.

## When the walk can't get in

An [Access](../stack/cloudflare-access.md) login wall stops a walk before it sees the app. Where a Cloudflare API token exists, `/verify` mints a service token, stores it, and retries once, rather than sending you on an errand ([the heal step](../../.agents/skills/verify/SKILL.md#step-4--verify-healing-the-block-you-can-fix)). The repair is already authorized: pasting a token *is* [the authorization to widen it](../stack/cloudflare-credentials.md#the-widen-is-pre-authorized). With no token, the verdict is `UNKNOWN` naming the wall, never a graded login page.

**One heal and one retry**, never a loop. A block that survives its repair is `UNKNOWN` with the attempt named, so an unverified walk never looks like an untried one.

## When a walk fails

The evidence is posted first, because a failing walk's evidence is the whole point. Then staging is reset where the repo has that command.

The reset isn't housekeeping. A walk that starts against the half-mutated database a failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers instead of the bug. A **passing** walk's data is left alone — staging is a fixture, not something to preserve.

Then `/verify` fixes the failure only when it is [in scope](../../.agents/skills/verify/references/walkthrough.md#e--after-a-failure), at most twice. The report states which way it judged, so you can disagree. The two-attempt bound is what keeps the loop from becoming a grinder: a walk that can't fix its own change in two tries has found something worth a human reading, and chasing an unrelated bug is how a walk quietly turns into a different change.

## What it is not

- **Not a test suite.** Nothing is saved, so coverage never accumulates. Regression tests belong in CI as real tests.
- **Not automatic on `/save`.** Staging redeploys on every push, so a walk there would fire many times per change while the surface still changes. You choose the moments.
- **Not a gate.** A gate would force an unrunnable walk to block, and you could only see your app when you were done with it. `/ship` runs one walk for evidence; a `FAILURE` puts the decision in front of you.
- **No second judging agent.** An agent that grades its own walk has every reason to see success. The check is *provenance*: [`/plan`](../../.agents/skills/plan/SKILL.md) wrote the `THEN` before the walk existed. Ambiguous evidence goes to a human.
- **Not a regression sweep of `openspec/specs/`.** A delta-scoped walk stays flat; a full-surface walk grows with the app forever.
- **Not an unbounded fix loop.** An agent that fixes and re-verifies until something passes will eventually pass something. The walk's value is its willingness to report a failure.
- **No local execution, and no invented tooling.** A scenario that only local code or new tooling could observe is reported as unverified, by name, rather than counted as passing.

**Why this engine.** [`agent-browser`](https://github.com/vercel-labs/agent-browser) beats Playwright and Playwright MCP because those are *repo* dependencies, which would force a Node toolchain into repos that have none. The agent's own browser is desktop-only and plan-gated, and it grades its own work. The engine is pre-1.0; the exit is that journeys are declarative command arrays, the driver is one shell script, and `agent-browser get cdp-url` keeps a plain CDP path open.

## Related

- [The change loop](the-change-loop.md) — the loop `/verify` sits beside, and the gate ladder it is deliberately not part of.
- [Required tools](required-tools.md) — what the toolkit needs, and what `/verify` adds to that.
- [Secrets](secrets.md) — where the optional variables above live.
- [Cloudflare Access](../stack/cloudflare-access.md) *(stack-pack repos)* — the login wall, and the service token the heal produces.
- [Deploy and data pipeline](../stack/d1-pipeline.md) *(stack-pack repos)* — what publishes the preview URL, and where `db:reset:staging` comes from.

Part of [working on WongStack](README.md).
