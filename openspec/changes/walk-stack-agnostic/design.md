## Context

`/walk` drives a change's own OpenSpec scenarios through a browser against the deployed preview and posts the evidence to the pull request. Only one part of it is Cloudflare-specific:

| Part of the walk | Coupled to Cloudflare? |
|---|---|
| Scout (delta specs → journeys) | no — reads local OpenSpec files |
| Target URL | no — `/save`'s `preview-url.sh` is a **core** file matching Vercel, Netlify, Render, Fly, Pages, GitHub Pages |
| Grading, verdicts, evidence comment, fix loop | no |
| **Browser acquisition** | **yes** — a hardcoded Browser Run CDP endpoint |
| Access heal | yes, but only when an Access wall is actually met |

Yet the whole verb is gated on the stack pack, and `/ship` — which is core — invokes it unconditionally, which the repo's own `payload-single-source` rule calls a defect.

Two earlier decisions are reversed here, and the reversals are the substance of the change rather than side effects:

1. **Remote-only** — "no browser binary SHALL be launched, required, or looked for" made the walk identical everywhere, at the cost of making it Cloudflare-only.
2. **Adoption by dependency** — `playwright-core` in `devDependencies` was consent precisely because nothing would install it.

A third rule is deliberately **kept**, and it is what selects the engine: the walk writes nothing to the repo.

## Goals / Non-Goals

**Goals:**
- Any repo, in any language, on any stack or none, can run `/walk` with no repo-level setup.
- Any repo gets a test pipeline; WongStack's own shipped scripts are actually tested.
- The browser is available for ordinary work too, not only at merge time.
- `/ship` never destroys a pull request as a side effect of merging.
- Every removed rule is recorded with its reason.

**Non-Goals:**
- The walk does not gate and does not become a regression suite.
- `agent-browser`'s wider surface (a11y audits, Web Vitals, HAR, network interception) is available but not adopted here.
- No new Cloudflare capability; the Access heal is kept as-is.

## Decisions

### D1 — `agent-browser` is the engine, not Playwright

[`agent-browser`](https://github.com/vercel-labs/agent-browser) — Apache-2.0, v0.33.2, ~1.26M npm downloads/week — is a native CLI that downloads its own Chrome from Chrome for Testing and states it needs no Playwright or Node.js for the daemon.

The decisive argument is the rule it lets us keep. Playwright would be a **repo** dependency: `playwright` in `devDependencies`, which presumes a `package.json`. A Python, Rust, or Go repo — precisely the repos this change exists to serve — would gain a Node toolchain and a committed manifest entry solely to walk, and the walk's "writes nothing to the repo" rule would have to be narrowed to permit it. `agent-browser` installs at the machine level (`npm i -g`, Homebrew, or Cargo), so the rule survives untouched and a repo in any language walks with nothing added to it.

It also fits the walk's existing shape better at every step:

| Walk step | Today | With `agent-browser` |
|---|---|---|
| Preflight | check a Cloudflare credential | `doctor --json` — a live headless launch test |
| A journey | generate a Playwright script per run | `batch --bail --json`, a JSON array of commands the scout writes directly |
| Interaction | selectors written blind | `snapshot` → accessibility tree with `@eN` refs, plus role/text/label locators |
| Evidence | screenshots + video | screenshots, `--full`, `--annotate`, `--screenshot-dir` |
| Access headers | bespoke runner code | `set headers <json>` |
| Grading input | parse script output | `--json` on `snapshot`, `get`, `is` |

*Verified before adoption, not assumed:* installed on this Linux host, `doctor` passing, Chrome for Testing 151 fetched, `https://example.com` opened headless, an accessibility snapshot returned with refs, and a PNG written to disk.

**Rejected alternatives.** *Playwright*, for the repo-dependency reason above. *Playwright MCP* — same objection, plus an MCP server in a payload that configures none. *The agent's own browser* (Claude Code Desktop's in-app browser, computer use, Claude in Chrome): desktop-only with scripting documented as unavailable there, macOS/Windows so it cannot run where the walk runs, plan-gated, and no per-step artifact pipeline. Its deepest problem is evidentiary — an agent that drives a browser and reports what it saw is grading its own work, while the walk's value is a screenshot a reviewer checks against a `THEN` written before the walk existed.

**Risk accepted, with an exit.** `agent-browser` is pre-1.0 and lives in an incubator org; Playwright is a decade-scale bet by comparison. The mitigation is structural: the driver stays behind a thin adapter, journeys are declarative command arrays rather than engine API calls, and `agent-browser get cdp-url` / `connect <port>` keep a plain CDP path open — so replacing the engine is a rewrite of one script, not of the capability.

### D1a — The driver is bash, so `/walk` needs no language runtime

Journeys are authored by the scout as `agent-browser` command arrays, screenshots included, so the driver has nothing to translate: it sets Access headers when they exist, runs one batch per journey, and stores the tool's `--json` output for the grader. That is around forty lines of shell.

The alternative — a Node module that injects screenshot steps, substitutes the base URL, and maps results — is more unit-testable but reintroduces a language runtime as a dependency of a core verb, immediately after this change removed one. Declarative journeys keep `/walk`'s dependency list at `agent-browser`, `git`, and `gh`, which is the strongest available reading of stack-agnostic. `walk-runner.mjs` is deleted rather than rewritten.

### D2 — Video is dropped; screenshots are the evidence

`agent-browser` captures screenshots and not video, so the per-journey video requirement is removed rather than softened, along with the "video degraded honestly" clause it needed. What replaces it is better suited to grading anyway: full-page capture and `--annotate`, which labels elements numerically in the image. Video was always the weakest evidence the walk produced — a reviewer reads a screenshot against a written `THEN`; nobody scrubs a video to check a merge.

### D3 — WongStack owns no browser-endpoint variable

The earlier draft invented `WALK_CDP_ENDPOINT` for machines that cannot run a browser locally. That is unnecessary: `agent-browser` already supports remote providers (Browserless, Browserbase, Browser Use) through its own configuration, which `doctor` reports on. The payload therefore **defines no variable** and documents only that remote providers exist and belong to the tool. One less payload fact to own, and no risk of a WongStack name drifting from the tool's own.

### D4 — The walk provisions a tool, not a dependency; adoption stops existing

When `agent-browser` or its Chrome is missing, `/walk` installs it and says so. The install is machine-level, so the working tree is untouched and the walk's throwaway rule holds exactly as written.

Adoption disappears as a concept. `playwright-core`-in-`devDependencies` was consent *because* nothing would install it; with a machine-level tool there is no repo state to read. So `NONE` narrows to its one honest meaning — **no browser-observable scenarios in this change** — and never means "not adopted". The "detected, never configured" rule survives where it still applies: nothing about the walk is switched on by a manifest field, config file, or flag.

*The runtime boundary is unchanged.* Installing a language runtime still asks first, per the existing toolchain rule. `agent-browser` is a tool, not a runtime, and installs like any other tool the walk needs.

### D5 — The `agent-browser` skill ships in the payload, as a pointer

The upstream skill is a **discovery stub**: it carries triggers and a description, then instructs the agent to load real usage from `agent-browser skills get core`, because the CLI serves content matching the installed version. Vendoring it therefore cannot go stale — the exact failure a vendored copy usually invites — and it satisfies `payload-single-source`'s rule that a fact has one owning store, the store here being the tool itself.

It ships in **core** and is useful well beyond `/walk`: opening a page, filling a form, checking a rendered result during ordinary work. `/walk` remains the only thing that produces graded merge evidence; the skill is for everything else.

### D6 — The Access heal is gated on the wall, not the stack

An Access interstitial can front a preview reached from anywhere, so the heal stays and its trigger is unchanged: the observed `*.cloudflareaccess.com` redirect. With `CLOUDFLARE_API_TOKEN` present, mint the service token once, apply it with `agent-browser set headers`, and retry. Without it the heal is **unavailable** and the verdict is `UNKNOWN` naming the wall and the missing credential — never a rendered-looking page, which is why the `UNKNOWN`/`NONE` distinction exists.

### D7 — The runbook moves to a core page; Cloudflare detail stays hedged

`wiki/stack/staging-walkthrough.md` sits in the pack-only `wiki/stack` directory, so a core `/walk` citing it cites an owner half its targets lack. It moves to **`wiki/development/staging-walkthrough.md`** in the core `files` list. What remains Cloudflare-specific (the Access service token, the seeded fixture) stays as marked pack-only sections whose links into `wiki/stack/*` are *conditional* — reported by the link checker, never dead.

*Consequence handled, not hidden:* `/wong-sync` never modifies an existing file, so a repo with the old page receives the new one and keeps both. That is the ordinary adapt path; no sync-time deletion is introduced.

### D8 — Removing Browser Run retires the permission that served it

`/wong-cloudflare` grants Browser Rendering Edit for exactly one reason: so `/walk` could open Browser Run sessions. With that path gone the grant is a permission with no consumer, and it is removed. Existing tokens keep the group harmlessly, and the skill's narrow-back offer already covers removing it.

### D9 — Tests: a root `package.json`, vitest, and real coverage

WongStack gains a root `package.json` declaring `vitest` with `"test": "vitest run"` — and **not** `playwright`, which D1 makes unnecessary. The suite covers shipped code with behavior worth pinning: `check-payload-links.mjs`'s dead-versus-conditional classification (the distinction this change stresses hardest), `lib-wrangler-config.mjs` across the layouts it supports, and the walkthrough scripts' phase contract, exercised by invoking them.

The driver is **bash, not Node** (D1a), so there is no JavaScript translation layer to unit-test — and that is the point: journeys are the tool's own command arrays, so nothing stands between the scout's intent and what runs. Shell is tested as shell.

The payload ships that root `package.json` **copy-if-absent**, so a repo with its own manifest keeps it and a repo without one gets a working `npm test`.

### D10 — The test pipeline becomes a core workflow

A `test` job inside the pack's `deploy.yml` cannot serve repos that never took the pack. It moves to `.github/workflows/test.yml` in **core**, carrying the same `if:` expression that collapses the `push`/`pull_request` double-fire, the same root-first discovery, and the same honest-green behavior. The job is **removed** from `deploy.yml` so a pack repo does not run it twice. `npm test` stays the whole contract, so any runner satisfies it; vitest is the shipped default, not a requirement.

### D11 — `/ship` retargets dependent pull requests before deleting a branch

`gh pr merge --squash` followed immediately by `git push origin --delete` races the forge's auto-retarget. When deletion wins, a dependent PR is **closed** and neither recovery exists. Fixed by prevention: list open PRs based on the branch, retarget each to the default branch, then delete, and name what was retargeted in the report. Waiting for the forge is a race with no completion signal; leaving branches accumulates them forever.

### D12 — `/ship` skips its walk step when the skill is absent

With `walk` in core the citation is legitimate, but a repo that has not synced since the move still lacks it. Step 4 opens with an availability check and, on absence, reports the walk as unavailable and continues — consistent with the gate ladder's rule that a rung the repo lacks is skipped, never failed.

## Risks / Trade-offs

- **`agent-browser` is pre-1.0 and could be abandoned** → thin adapter, declarative journeys, and a CDP escape hatch (D1); replacing the engine means rewriting one script.
- **A local browser makes a walk machine-dependent** → the walk reports where the browser came from, so a machine-dependent result says so.
- **Losing video removes evidence** → screenshots gain full-page and annotated modes; video was never what a reviewer actually read.
- **A machine-level install still mutates the machine** → it is a tool install at the point of need, the same category as `gh` or `openspec`, and it is reported; runtimes still ask first.
- **Vendoring a third-party skill invites drift** → the upstream file is a pointer to the CLI's own version-matched content, so there is nothing to drift (D5).
- **Shipping a root `package.json` into a repo that has none can change npm behavior in a subdirectory app** → copy-if-absent only.
- **Moving the runbook can strand inbound links** → link check plus a repo-wide sweep is a task, not left to review.

## Migration Plan

1. Rewrite the walk driver and preflight onto `agent-browser`; delete the Cloudflare browser path.
2. Manifest moves (`walk` and `agent-browser` → core, new core files), then the runbook move.
3. Sweep every payload surface asserting pack-only, remote-only, adoption, or video.
4. Root `package.json`, vitest config, and the tests; `test.yml` in core; the job removed from `deploy.yml`.
5. `/ship` Steps 4–6; `/wong-cloudflare` permission set.
6. Release: `VERSION`, `CHANGELOG.md`, `check-payload-links.mjs` clean in all four shapes, and this repo's own new suite green in CI.

**Rollback:** every piece is a single-point revert; no repo state, credential, or generated file is migrated. A machine keeps an `agent-browser` install it can remove by hand.

## Open Questions

None blocking. One judgement is deferred to use: whether the walk should adopt any of `agent-browser`'s extra evidence — the axe accessibility audit or Web Vitals — as standing per-journey capture. Until a change needs it, the walk captures exactly what it captures today, minus video.
