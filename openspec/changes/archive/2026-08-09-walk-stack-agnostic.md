<!-- openspec-archive v1 2026-08-09-walk-stack-agnostic -->
<!-- file proposal.md utf8 11631 -->
# walk-stack-agnostic

**Status:** ready-to-ship
**Open questions:** none

## Why

`/walk` is the toolkit's evidence verb — "show me this change actually working" — but it ships only to repos that took the Cloudflare stack pack, and it drives a browser that exists only on Cloudflare. Both are accidents of how it was first built. Everything else is already stack-agnostic: the scout reads local OpenSpec files, the target URL comes from `/save`'s provider-neutral `preview-url.sh`, and the grading and evidence comment care about nothing but HTTP. A repo with no Cloudflare account cannot use the one verb whose whole job is proving a change works.

Playwright was the obvious replacement and is the wrong one: adding `playwright` to `devDependencies` assumes a `package.json`, so a Python, Rust, or Go repo — exactly the repos this change exists to serve — would gain a Node toolchain solely to walk. [`agent-browser`](https://github.com/vercel-labs/agent-browser) is a standalone binary that downloads its own Chrome and needs no Node or Playwright to run, so **nothing enters the repo at all**.

The same gap runs through testing. The `test` job added in v9.9.0 lives in the pack's `deploy.yml`, so a repo without Cloudflare has no test pipeline, and WongStack itself — a repo full of executable scripts — has no test suite of any kind.

Shipping v9.9.0 also exposed two defects in `/ship`: it is **core** yet invokes the **pack** skill `/walk` unconditionally, and its merge step deleted a base branch that an open pull request still targeted, which closed PR #59 outright. That loss is unrecoverable — the forge will neither reopen a pull request whose base is gone nor retarget a closed one.

## What Changes

- **`/walk` moves from `pack` to `core`.** Every repo receives it.
- **The browser engine becomes `agent-browser`.** **BREAKING (internal):** the Cloudflare Browser Run path is **removed entirely** — the CDP endpoint, account-id resolution, refusal diagnosis, and the Browser Rendering widen heal. Journeys become `agent-browser batch` command sequences instead of generated Playwright scripts; preflight becomes `agent-browser doctor --json`, which runs a live headless launch test.
- **The walk stops writing to the repo.** The rule that the walk is throwaway and saves nothing is **preserved rather than narrowed**: `agent-browser` installs as a machine-level binary, so there is no `devDependencies` entry, no lockfile change, and no `package.json` requirement. A repo in any language can walk.
- **Video is dropped; screenshots are the evidence.** **BREAKING (spec):** the per-journey video requirement is removed. `agent-browser` captures screenshots — including full-page and annotated — and no video.
- **Adoption stops being a concept.** The `playwright-core`-in-`devDependencies` opt-in signal is removed along with the dependency it detected, so `NONE` narrows to its one honest meaning: *no browser-observable scenarios in this change*.
- **WongStack no longer owns a browser-endpoint variable.** Remote-browser configuration belongs to `agent-browser`, which already supports Browserless, Browserbase, and Browser Use; the payload documents that it exists and defines nothing.
- **The `agent-browser` skill ships in the payload**, so the browser is available for ordinary work — looking at a page, filling a form, checking a rendered result — not only inside `/walk`. The upstream skill is a discovery stub that loads its own instructions from the installed CLI, so it cannot go stale.
- **`/wong-cloudflare` stops granting Browser Rendering Edit** — the permission existed only to serve Browser Run.
- **A real vitest suite** lands at the repo root with a root `package.json` exposing `npm test`, and a **core `test.yml`** workflow runs it in every repo. The `test` job leaves the pack's `deploy.yml` so no repo runs it twice.
- **`/ship` retargets dependent pull requests before deleting a branch**, and skips its walk step when the skill is absent.

## Capabilities

### New Capabilities

None. Every behavior here modifies a capability that already exists.

### Modified Capabilities

- `staging-walkthrough`: the walk is core, not pack; `agent-browser` replaces Cloudflare Browser Run; the walk provisions a machine-level tool instead of a repo dependency and keeps writing nothing to the repo; evidence is screenshots without video; the Access heal is gated on meeting an Access wall rather than on the repo's category; the runbook moves to a core-category page.
- `ci-tests`: the test pipeline becomes a core workflow every repo receives, with a shipped default vitest suite.
- `delivery-gate`: `/ship` retargets dependent pull requests before deleting a merged branch, and its walk step degrades when the skill is absent.
- `toolchain-dependencies`: `/walk` depends on the `agent-browser` binary — installed at the point of need, like every other tool — rather than on a language toolchain in the repo.
- `payload-single-source`: a vendored third-party skill is admitted, on the condition that it is a pointer to its own tool rather than a copy of that tool's documentation.
- `cloudflare-provisioning`: the Browser Rendering Edit grant is removed with the path it served.

## Impact

- **Skills** — `walk/SKILL.md`, `walk/references/walkthrough.md`, `walk/scripts/walk-staging.sh`, `ship/SKILL.md` (Steps 4–6), `wong-cloudflare/SKILL.md` and its `references/permission-groups.md`, `wong-setup/SKILL.md`; new vendored `agent-browser/SKILL.md`. `walk/scripts/walk-runner.mjs` is **deleted** and replaced by `walk-runner.sh`, so `/walk` needs no language runtime.
- **Payload manifest** — `walk` and `agent-browser` join `core.skillDirs`; new core entries for `.github/workflows/test.yml`, the root `package.json`, and the moved runbook; `deploy.yml` loses its `test` job.
- **New in this repo** — root `package.json`, vitest config, and `tests/` covering the scripts WongStack ships.
- **Wiki** — the walkthrough runbook moves to `wiki/development/`; `the-change-loop.md` and `required-tools.md` change where they describe the walk as pack-gated and the core toolchain.
- **No change** to `/save`, `preview-url.sh`, the verdict vocabulary, the scout, the bounded fix loop, or the fact that the walk gates nothing.

## Non-goals

The walk still **gates nothing** and does not become a regression suite. It gains no configuration file and no skill flag. `agent-browser`'s wider surface — accessibility audits, Web Vitals, HAR capture, network interception — is available but **not adopted** by this change; the walk keeps producing exactly the evidence it produces today, minus video. No Cloudflare capability is added, and the Access heal is kept as-is rather than extended.

## Decision log

- **2026-08-09** — Planned, revised twice, and implemented in one session; 38/38 tasks. Started as "move `/walk` from pack to core with a browser-resolution chain (explicit CDP endpoint → Cloudflare Browser Run → local Playwright)". The user rejected that shape twice, and both rejections improved it: **remove Browser Run entirely** rather than keep it as a rung, and **drop the "never installs anything" rule** rather than work around it. A third turn replaced Playwright with [`agent-browser`](https://github.com/vercel-labs/agent-browser) after the user raised it.
- **2026-08-09** — The engine choice turned on one argument that only surfaced late: `playwright` in `devDependencies` presumes a `package.json`, so the "stack-agnostic" plan was quietly Node-only and would have forced a toolchain into the Python/Rust/Go repos this change exists to serve. `agent-browser` is a machine-level binary, so the walk's **"writes nothing to the repo" rule survives intact** instead of being narrowed — which is why the final shape is *better* than the first draft rather than merely different. Verified before adopting: installed on Linux, `doctor` green, Chrome for Testing 151, real headless browse + accessibility snapshot + PNG on disk.
- **2026-08-09** — Implementation surfaced a design fork the artifacts had contradicted themselves on: a Node driver is unit-testable (what `ci-tests` assumed) but reintroduces a language runtime to a core verb (what `toolchain-dependencies` had just forbidden). Resolved to a **pure-bash driver** with journeys authored as raw `agent-browser` batch arrays, so `/walk` needs only `agent-browser`, `git`, and `gh`. `ci-tests` was amended to test shell by invoking it; `walk-runner.mjs` was deleted rather than rewritten.
- **2026-08-09** — Found a real defect while testing the driver end to end, now a hard rule in three places: **a screenshot taken before a navigation paints captures the previous page.** A two-step journey whose click navigated correctly produced two byte-identical screenshots of the page it had already left — a walk that would have graded confidently and wrongly. Every navigating step now carries an explicit wait; adding one made the second screenshot 121KB against 17KB.
- **2026-08-09** — Knock-on removals the ask didn't name but that follow: `/wong-cloudflare` no longer grants Browser Rendering Edit (its only consumer is gone), and `toolchain-dependencies` now names `agent-browser` as `/walk`'s one exception instead of being quietly false. `payload-single-source` gained a rule admitting vendored third-party skills **only as pointers**, which the upstream `agent-browser` skill already satisfies by loading its usage from the installed CLI.
- **2026-08-09** — v10.0.0 (major: adoption and video both removed). 19 tests green locally; link check clean in all four install shapes, with 16 conditional links, 5 of them newly created by the runbook move and all hedged pack-only in prose.
- **2026-08-09** — Shipped. `/ship` archived the change to `openspec/changes/archive/2026-08-09-walk-stack-agnostic/` and delegated this checkpoint; the six capability deltas were already folded into `openspec/specs/` during the previous save, so the archive step re-verified rather than re-synced. Two corrections landed just before shipping, both mine: the repo **does** have an app (`app/`, a provisioned Vite + React SPA with a Worker), and the earlier "no preview URL" reading came from calling `preview-url.sh` after the commit but *before* the push — the exact ordering mistake `/walk`'s own runbook warns about, made inside `/save`. With CI complete the preview resolved, and the new bash driver walked this repo's own deployed staging app end to end (`RESULT: WALKED`, one screenshot, browser local), which upgrades the engine's verification from a public test page to a real deployment. Still unproven: a *graded* multi-step journey, since this change's own scenarios are payload behaviour and none are browser-observable.
- **2026-08-09** — Merge conflict at ship time: v9.10.0 and v9.11.0 (`wong-sync`) landed on `main` from another worktree while this branch was in flight. Resolved as union of intent — `VERSION` takes `10.0.0` (this change is the major bump and supersedes both), `CHANGELOG.md` keeps all three entries newest-first, and every other file auto-merged with no overlap: their edits are `wong-sync/SKILL.md`, `references/adapt.md`, and the new `AGENTS.md` (with `CLAUDE.md` now a symlink to it), while this change touched `wong-sync/references/payload-files.json` and `payload-manifest.md`. Re-verified after merging: link check clean in all four install shapes, 19 tests green, and the manifest still carries `walk` and `agent-browser` in core with `walk` gone from pack. Nothing in the `WONG-STACK` block asserts anything this change falsified.

<!-- end proposal.md -->
<!-- file design.md utf8 14756 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 6363 -->
## 1. Walk driver — agent-browser replaces Browser Run

- [x] 1.1 Replace `.claude/skills/walk/scripts/walk-runner.mjs` with a thin driver that translates a journey into one `agent-browser batch --bail --json` call and reads its structured output (design.md D1); keep it small enough that swapping engines rewrites one script.
- [x] 1.2 Delete every Cloudflare browser path — the `api.cloudflare.com` CDP constant, `WALK_CF_ACCOUNT_ID`, the bearer header, `connectOverCDP`, the exit-4 refusal diagnosis, and their comments.
- [x] 1.3 Address elements through `snapshot` refs and semantic locators rather than hand-written selectors; capture a screenshot per step, using full-page or `--annotate` where it makes the evidence clearer.
- [x] 1.4 Remove all video capture and every claim about video, including the "video degraded honestly" path (design.md D2).
- [x] 1.5 Apply the Access service-token pair with `agent-browser set headers` when the heal runs, and keep interstitial detection exactly as it is.
- [x] 1.6 Report where the browser ran, and exit with a distinct signal when a browser could not be obtained.

## 2. Walk skill and preflight

- [x] 2.1 Rewrite `walk-staging.sh` preflight around `agent-browser doctor --json`; install the CLI and its Chrome when missing and report what was installed. Leave `scout-check` unchanged and credential-free.
- [x] 2.2 Keep the runtime boundary: tools install, runtimes ask (design.md D4).
- [x] 2.3 Replace the exit-code remedy table: drop the Browser Run refusal, keep the Access challenge, add "no browser could be obtained" naming the doctor check that failed.
- [x] 2.4 Rewrite `.claude/skills/walk/SKILL.md` — frontmatter and body — removing "stack-pack repos only", "the browser is remote", "never installs anything", the adoption signal, and video; state the engine, the machine-level install, and the where-it-ran reporting rule.
- [x] 2.5 Narrow `NONE` throughout the skill to "no browser-observable scenarios" and remove every "not adopted" meaning.
- [x] 2.6 Update `.claude/skills/walk/references/walkthrough.md` for all of the above, hedging the remaining Cloudflare Access passages as pack-only.

## 3. The agent-browser skill

- [x] 3.1 Keep the vendored `.agents/skills/agent-browser/SKILL.md` as the upstream pointer stub, unmodified, with its Apache-2.0 attribution intact (design.md D5).
- [x] 3.2 Add it to `core.skillDirs` in the payload manifest and record in the prose manifest that it is vendored, refreshed from upstream, and never edited in place.
- [x] 3.3 State in the runbook and `required-tools.md` that the browser is available for ordinary work, and that `/walk` is only the graded-evidence surface.

## 4. Manifest and category moves

- [x] 4.1 Move `walk` from `pack.skillDirs` to `core.skillDirs` in `.claude/skills/wong-sync/references/payload-files.json`.
- [x] 4.2 Add `.github/workflows/test.yml`, the root `package.json`, and the moved runbook to `core.files`.
- [x] 4.3 Update `.claude/skills/wong-sync/references/payload-manifest.md` so each category change and its reason is stated where a reader looks.
- [x] 4.4 Verify `/wong-sync` would copy `walk`, `agent-browser`, `test.yml`, and the runbook into a repo with `components.stackPack` absent or false, and that no Cloudflare file travels with them.

## 5. Runbook and wiki

- [x] 5.1 Move `wiki/stack/staging-walkthrough.md` to `wiki/development/staging-walkthrough.md` (design.md D7).
- [x] 5.2 Rewrite it for the engine, the machine-level install, declarative journeys, and screenshot-only evidence; mark every remaining Cloudflare section and link as pack-only.
- [x] 5.3 Record the reversed and dropped decisions with what each protected and what was traded — remote-only, adoption-by-dependency, and video — plus the engine alternatives considered and the replacement path.
- [x] 5.4 State that remote browsers are configured through the tool's own providers and that the payload defines no endpoint variable (design.md D3).
- [x] 5.5 Sweep the repo for inbound links to the old runbook path and repoint them.
- [x] 5.6 Update `wiki/development/the-change-loop.md` where it describes `/walk` as pack-gated, and `wiki/development/required-tools.md` for the browser-CLI-for-`/walk` split.

## 6. Test suite and pipeline

- [x] 6.1 Add a root `package.json` (`vitest`, `"test": "vitest run"`, no browser library) and a vitest config, and add them to the payload as copy-if-absent.
- [x] 6.2 Write real tests for the walkthrough scripts' phase contract by invoking them: verdict lines, the usage string, and the cleanup guard's refusal to remove a directory it did not create.
- [x] 6.3 Write real tests for `scripts/check-payload-links.mjs`: the dead-versus-conditional classification across install shapes, which this change stresses hardest.
- [x] 6.4 Write real tests for `scripts/lib-wrangler-config.mjs` across the layouts it claims to support.
- [x] 6.5 Add `.github/workflows/test.yml` in core: root-first suite discovery, the same double-fire collapse condition `deploy.yml` uses, honest-green when no `test` script exists (design.md D10).
- [x] 6.6 Remove the `test` job from the pack's `.github/workflows/deploy.yml` so a pack repo runs its suite once.
- [x] 6.7 Confirm `npm test` is green locally and that the new workflow runs green in this repo's own CI.

## 7. Ship skill and Cloudflare skill

- [x] 7.1 Add the availability check to `/ship` Step 4: absent `walk` skill → report unavailable in one line and continue to the merge (design.md D12).
- [x] 7.2 Change `/ship` Step 5 to list open pull requests based on the branch, retarget each to the default branch, then delete the remote branch (design.md D11).
- [x] 7.3 Add the retargeting to Step 6's report and to the hard rules, so the ordering is stated where it is easy to break.
- [x] 7.4 Remove Browser Rendering Edit from `/wong-cloudflare`'s widened permission set and its references, leaving the Access groups untouched.

## 8. Release

- [x] 8.1 Bump `VERSION` and add the `CHANGELOG.md` entry covering the engine swap, the category moves, the dropped video, the reversed rules, the vendored skill, the test suite and workflow, and the two `/ship` fixes.
- [x] 8.2 Run `node scripts/check-payload-links.mjs`; confirm zero dead links in all four install shapes and review each newly conditional link as intended and hedged.

<!-- end tasks.md -->
<!-- file specs/ci-tests/spec.md utf8 4632 -->
## RENAMED Requirements

- FROM: `### Requirement: The pack's CI runs the test suite in a parallel job`
- TO: `### Requirement: A core workflow runs the test suite in every repo`

## MODIFIED Requirements

### Requirement: A core workflow runs the test suite in every repo

The payload SHALL ship `.github/workflows/test.yml` in the **core** category, so a repo receives a test pipeline whether or not it took the stack pack. The workflow SHALL run the repo's `test` script, discovered root-first and then in each immediate subdirectory, so a repo whose application lives in a subdirectory is covered without configuration. When no `package.json` declares a `test` script, the job SHALL print why and exit green — a real check, never a permanently red one.

The workflow SHALL carry the same event condition the deploy workflow uses to collapse the `push`/`pull_request` double-fire, so one commit produces one test run.

`npm test` SHALL be the entire contract: any runner behind that script satisfies the job. Vitest SHALL be what the payload ships and configures by default, and SHALL NOT be required.

The pack's `deploy.yml` SHALL NOT contain a `test` job, so a pack repo runs its suite once rather than twice. The `deploy` job SHALL remain independent of the test result: a staging deploy of red code is harmless (staging is a fixture and the walk observes it), and red code cannot reach production because merges require green CI.

#### Scenario: A repo with no stack pack gets a test pipeline

- **WHEN** WongStack is synced into a repo whose `components.stackPack` is absent or false
- **THEN** `.github/workflows/test.yml` is among the files it receives
- **AND** the suite runs on the next push with no Cloudflare configuration present

#### Scenario: A pack repo runs its suite once

- **WHEN** a commit is pushed to a repo that has both workflows
- **THEN** exactly one job runs the test suite
- **AND** the deploy finishes no later than it would without it

#### Scenario: No test script is honest green

- **WHEN** a commit is pushed to a repo where no `package.json` declares a `test` script
- **THEN** the job states that no suite exists and exits green
- **AND** the check is not reported as a failure

#### Scenario: A different runner satisfies the job

- **WHEN** a repo's `test` script invokes a runner other than vitest
- **THEN** the job runs it unchanged
- **AND** nothing in the workflow assumes vitest

#### Scenario: A red suite holds the save, not the deploy

- **WHEN** the test job fails on a feature-branch push in a pack repo
- **THEN** the staging deploy still completes
- **AND** `/save`'s existing CI wait reports the failure and enters its auto-fix path, and `/ship` cannot merge until the check is green

## ADDED Requirements

### Requirement: The payload ships a working default suite

The payload SHALL ship a root `package.json` declaring `vitest` as a devDependency with a `test` script, copied only when the repo has no root `package.json` of its own. A repo that already has one SHALL be left untouched, and its existing `test` script SHALL be what the workflow runs. It SHALL NOT declare a browser library: the walkthrough's browser tool is installed at the machine level and is not a repository dependency.

WongStack SHALL use this suite on itself: the executable code it ships — the payload link checker's dead-versus-conditional classification, the wrangler-config helper's layout handling, and the walkthrough scripts' phase contract (verdict lines, refusal to remove a directory it did not create) — SHALL have real tests that run in its own CI. Where a shipped script is shell rather than JavaScript, the suite SHALL exercise it by invoking it, so coverage follows what is shipped rather than what is convenient to import. A toolkit that ships scripts and tests none of them cannot ask adopting repos to test theirs.

#### Scenario: A repo with no root manifest gets one

- **WHEN** WongStack is synced into a repo with no root `package.json`
- **THEN** the payload's root `package.json` is copied in, and `npm test` runs the shipped suite

#### Scenario: A repo with its own manifest keeps it

- **WHEN** WongStack is synced into a repo that already has a root `package.json`
- **THEN** that file is not modified or replaced
- **AND** the workflow runs whatever `test` script it declares

#### Scenario: WongStack tests its own shipped scripts

- **WHEN** WongStack's own CI runs
- **THEN** the suite exercises the link checker's classification, the wrangler-config helper, and the walkthrough scripts' phase contract
- **AND** a regression in any of them fails the check

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1006 -->
## REMOVED Requirements

### Requirement: The widen covers the walkthrough's browser

**Reason**: The permission existed for exactly one purpose — letting the provisioned `CLOUDFLARE_API_TOKEN` open Cloudflare Browser Run sessions for `/walk`. The walkthrough now drives a local Playwright browser and the Browser Run path is removed, so the grant serves nothing. Granting a permission with no consumer contradicts the narrow-token principle the widen and its narrow-back offer exist to serve.

**Migration**: No action is required of any repo. A token widened by an earlier version keeps the Browser Rendering Edit group; it is unused and harmless, and `/wong-cloudflare`'s existing narrow-back offer already removes it along with the other groups it granted. New provisioning runs simply do not request it. The Access permission groups are unaffected — `/walk` still mints an Access service token when it meets an Access wall, and that heal widens into the Access groups on demand exactly as before.

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 5006 -->
## MODIFIED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/walk` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/walk`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

The walk step SHALL check that the `walk` skill is present before invoking it. When the skill is absent, `/ship` SHALL report the walk as unavailable in one line and continue to the merge, consistent with the gate ladder's rule that a rung the repo lacks is skipped rather than failed. `/ship` SHALL NOT install, copy, or offer the skill to repair its absence.

Before deleting the merged branch from the remote, `/ship` SHALL find every open pull request that targets that branch as its base and retarget each to the default branch. Only then SHALL the branch be deleted, and the ship report SHALL name any pull request it retargeted. Deleting a base branch that an open pull request still targets closes that pull request, and the loss is unrecoverable: the forge will neither reopen a pull request whose base branch is gone nor retarget a closed one. `/ship` SHALL NOT rely on the forge retargeting dependents on its own, because that is a race with no completion signal.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation, note, and any safe example declaration land in the pushed checkpoint
- **AND** the commit tested by the resulting CI run is the commit `/ship` will merge

#### Scenario: Save recognizes the archived branch change

- **WHEN** `/save` runs for `/ship` after `openspec/changes/<name>/` moved into the archive
- **THEN** it resolves and mirrors the single archived record matching the current branch
- **AND** it does not invoke fallback planning or create a new active `openspec/changes/<name>/`

#### Scenario: Save returns a mergeable gate result

- **WHEN** the delegated save finishes with `SUCCESS` or `NONE`
- **THEN** `/ship` proceeds through the walk evidence step and, absent a walk `FAILURE`, merges without reopening the PR or waiting on the same checks itself

#### Scenario: Save returns an unmergeable result

- **WHEN** the delegated ordinary save returns `UNKNOWN`, `TIMEOUT`, or a checkpoint failure
- **THEN** `/ship` stops before merge and reports that result
- **AND** it does not bypass, repeat, or reinterpret the gate

#### Scenario: A failed ship-time walk pauses for the user

- **WHEN** the ship-time walk returns `FAILURE` with its fix attempts exhausted
- **THEN** `/ship` stops before merging, presents the evidence, and asks whether to fix or merge anyway
- **AND** merging anyway remains available and is recorded in the report

#### Scenario: An unrunnable ship-time walk never blocks

- **WHEN** the ship-time walk returns `UNKNOWN` or `TIMEOUT`
- **THEN** `/ship` reports the walk as unverified and merges on the save-gate result alone

#### Scenario: The walk skill is not present

- **WHEN** `/ship` reaches the walk step in a repo that does not have the `walk` skill
- **THEN** it reports the walk as unavailable in one line and proceeds to the merge
- **AND** it does not install, copy, or offer the skill

#### Scenario: A dependent pull request is retargeted before deletion

- **WHEN** `/ship` merges a branch that one open pull request uses as its base
- **THEN** that pull request is retargeted to the default branch before the branch is deleted
- **AND** the ship report names the retargeted pull request

#### Scenario: No dependent pull request exists

- **WHEN** `/ship` merges a branch that no open pull request targets
- **THEN** the branch is deleted directly with no retargeting step

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/payload-single-source/spec.md utf8 1747 -->
## ADDED Requirements

### Requirement: A vendored third-party skill is a pointer, never a copy

The payload MAY ship a skill authored outside this repository when the capability it describes belongs to an external tool. Such a skill SHALL be vendored **as a pointer to that tool's own instructions**, not as a copy of them: it carries the description and triggers an agent needs to discover the capability, and defers the usage content to the installed tool at run time.

A vendored skill that copies its tool's documentation SHALL NOT be shipped, because the copy and the installed tool version drift independently, and the reader has no way to tell which one is true. The pointer form has nothing to drift: the tool serves content matching its own version.

The vendored file SHALL be recorded in the payload manifest like any other payload file, SHALL keep its upstream licence and attribution intact, and SHALL be refreshed from upstream rather than edited in place, so a local edit is never mistaken for upstream behavior.

#### Scenario: The vendored skill defers to the tool

- **WHEN** an agent loads a vendored third-party skill
- **THEN** the file states what the capability is and how to reach it
- **AND** the usage instructions are loaded from the installed tool rather than read out of the payload

#### Scenario: A copied manual is rejected

- **WHEN** a proposed vendored skill reproduces its tool's command reference in the payload
- **THEN** it is not shipped in that form
- **AND** the pointer form is used instead

#### Scenario: The vendored file is refreshed, not edited

- **WHEN** the upstream skill changes
- **THEN** the payload copy is replaced from upstream
- **AND** no local modification is carried forward silently

<!-- end specs/payload-single-source/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 20721 -->
## RENAMED Requirements

- FROM: `### Requirement: The browser is remote, reached with the pack's credential`
- TO: `### Requirement: The browser is driven by a standalone CLI, installed on the machine`

- FROM: `### Requirement: Adoption is detected from state, never configured`
- TO: `### Requirement: The walk provisions its own tool, never a repo dependency`

- FROM: `### Requirement: Adoption is recommended and documented, never forced`
- TO: `### Requirement: The runbook ships in core and records what was declined`

## MODIFIED Requirements

### Requirement: Walkthrough credentials follow the durable worktree store

The walkthrough SHALL honor any credential already exported into its process, including the optional Cloudflare Access service-token pair. When a value it needs is not exported, it SHALL resolve the repository's primary worktree from Git metadata and read the durable ignored `.env` there, rather than assuming the active linked worktree contains a copy. It SHALL NOT print any resolved value or persist the primary worktree's absolute path in repository artifacts.

The walkthrough SHALL NOT define a browser-endpoint variable of its own. Where a browser must run somewhere other than this machine, that configuration belongs to the browser tool and SHALL be documented as the tool's, not restated or renamed by the payload.

#### Scenario: Walk runs from a linked worktree

- **WHEN** `/walk` runs from a linked worktree with no local `.env` and a required credential exists in the primary worktree's durable file
- **THEN** preflight uses the durable credential
- **AND** it does not report the value as missing or ask the user to copy it

#### Scenario: Exported credentials retain precedence

- **WHEN** the walk process already has a required value in its environment
- **THEN** preflight uses the exported value without replacing it from a file

#### Scenario: No durable credential exists

- **WHEN** neither the process environment nor the durable primary-worktree file supplies a credential the walk needs
- **THEN** the walkthrough retains its `UNKNOWN` missing-credential verdict and points to the secrets convention
- **AND** no linked-worktree copy is created as a side effect

#### Scenario: Remote browsers are the tool's business

- **WHEN** a reader asks how to run the walk's browser somewhere other than this machine
- **THEN** the payload points at the browser tool's own remote-provider configuration
- **AND** the payload defines no variable of its own for it

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached by invoking `/walk`, or by `/ship`, which invokes `/walk` once as a non-gating evidence step between its delegated `/save` checkpoint and its merge. No other skill SHALL run it: `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/walk` SHALL be invocable at any point in a change's life and any number of times. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error. `/ship`'s invocation SHALL be an ordinary walk — same scout, same verdicts, same PR evidence — not a variant.

`/walk` SHALL ship in the payload's **core** category, so every repo receives it regardless of `components.stackPack`. It SHALL NOT be gated on the stack pack, on Cloudflare, or on any hosting provider, and no capability of the walk SHALL require an account with any vendor.

The browser tool the walk uses SHALL also be available for ordinary browser work outside the walk. `/walk` SHALL remain the only surface that produces graded merge evidence; using the browser to look at a page, fill a form, or check a rendered result SHALL NOT require invoking `/walk`.

#### Scenario: Shipping walks as evidence

- **WHEN** `/ship` runs in a repo with browser-observable scenarios
- **THEN** `/walk` runs once after the delegated `/save` and before the merge, and its evidence lands on the PR
- **AND** a `NONE`, `UNKNOWN`, or `TIMEOUT` verdict changes nothing about the merge

#### Scenario: A repo with no stack pack receives the skill

- **WHEN** WongStack is installed or synced into a repo whose `components.stackPack` is absent or false
- **THEN** the `walk` skill is copied in with the rest of the core category
- **AND** no Cloudflare file, script, or config fragment is copied with it

#### Scenario: A repo in any language walks

- **WHEN** `/walk` runs in a repo with no `package.json`, no Node toolchain, and no vendor account
- **THEN** the walk drives its journeys and grades them normally
- **AND** nothing is added to the repository to make it possible

#### Scenario: The browser serves ordinary work

- **WHEN** a user asks to open a page or check something rendered, outside any change
- **THEN** the browser tool is available directly
- **AND** no walk is started, no journey is graded, and no PR comment is posted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/walk` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/walk` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

### Requirement: The walk provisions its own tool, never a repo dependency

`/walk` SHALL install what it needs to run rather than reporting its absence, and SHALL install it **at the machine level**. When the browser CLI or its browser is missing, the walk SHALL install them and state what it installed.

The walk SHALL NOT add a dependency to the repository to make itself possible — no `devDependencies` entry, no lockfile change, and no requirement that a `package.json` exist. A repository in a language with no Node toolchain SHALL be able to walk with nothing added to it. This is the property that keeps the walkthrough stack-agnostic in fact and not only in name.

A **language runtime** SHALL remain outside this rule: installing a runtime SHALL still happen only at the point of need and only with the user's consent, per the toolchain convention. The walk installs tools, not runtimes.

There SHALL be no adoption signal, manifest field, config file, or skill argument that enables or disables the walk. Nothing about the walk SHALL be switched on by configuration: what it does is decided by the change's scenarios and what it finds on the machine.

#### Scenario: A machine without the browser tool

- **WHEN** `/walk` runs on a machine where the browser CLI is not installed
- **THEN** the walk installs it and its browser, reports that it did, and walks
- **AND** the repository working tree is unchanged by the install

#### Scenario: A repo with no package manifest

- **WHEN** `/walk` runs in a repository that has no `package.json` at all
- **THEN** the walk runs normally
- **AND** no manifest is created and no dependency is added

#### Scenario: Nothing is switched on by configuration

- **WHEN** a reader looks for how to enable or disable the walk for a repo
- **THEN** no manifest field, config file, or skill flag exists for it

#### Scenario: A missing runtime still asks

- **WHEN** the walk needs a language runtime the machine does not have
- **THEN** it explains what is needed and asks before installing
- **AND** it does not install a runtime silently the way it installs a tool

### Requirement: The browser is driven by a standalone CLI, installed on the machine

The walk SHALL drive its browser through a standalone command-line tool installed on the machine, rather than through a vendor-hosted browser service or a browser library declared in the repository. No vendor-hosted browser endpoint SHALL be hardcoded in the runner, preflight, or skill, and no vendor credential SHALL be required to obtain a browser.

Preflight SHALL verify the browser by performing the tool's own environment check, which launches a browser headlessly, rather than by checking for a credential. A failed check SHALL produce `UNKNOWN` naming what failed — never a failing application.

Each journey SHALL be expressed as a declarative sequence of the tool's commands, executed as one batch that stops at the first failing step. Elements SHALL be addressed through the tool's accessibility snapshot or its semantic locators, rather than through selectors written without seeing the page.

The walk SHALL report **where the browser ran** in its user-facing report and in its pull-request comment, because a walk that ran on this machine depended on this machine and the reader is entitled to know it.

The driver SHALL be kept thin enough that replacing the browser tool means rewriting one script rather than the capability: journeys stay declarative, and grading SHALL consume the tool's structured output rather than its human-readable text.

#### Scenario: The default path needs no configuration

- **WHEN** `/walk` runs with the tool installed and no environment variable set
- **THEN** it launches a browser headlessly and walks
- **AND** the report names where the browser ran

#### Scenario: Preflight is a real launch, not a credential check

- **WHEN** preflight runs
- **THEN** it performs the tool's environment check, which includes launching a browser
- **AND** a failure is reported as `UNKNOWN` with the failing check named

#### Scenario: No vendor browser service remains

- **WHEN** the runner, preflight, and skill are read for a hardcoded browser-service endpoint, or a vendor credential used to obtain a browser
- **THEN** none exists

#### Scenario: A journey is declarative

- **WHEN** a journey of four steps runs
- **THEN** it is submitted as one ordered batch that stops at the first failing step
- **AND** no per-run browser script is generated inside the repository

#### Scenario: A session dies mid-walk

- **WHEN** a browser session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

### Requirement: The walk is throwaway and saves nothing

The walk SHALL leave the repository working tree exactly as it found it. It SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, a dependency entry, or any other artifact inside the repo — including the tool it installs, which is installed at the machine level for this reason.

Journey definitions and captured evidence SHALL be written outside the repository working tree and deleted when the run ends.

The run SHALL capture a screenshot after each step. Full-page and annotated capture SHALL be available where they make the evidence clearer. **No video SHALL be required or claimed**: the evidence is the screenshots and the written record, and the report SHALL NOT reference a recording that does not exist.

The journey definitions SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no journey definition, screenshot, or dependency entry remains under the repository root

#### Scenario: Installing the tool leaves the repo untouched

- **WHEN** a walk installs the browser tool because the machine lacked it
- **THEN** the working tree is still unchanged
- **AND** the install is reported as a machine change, not a repo change

#### Scenario: Evidence is captured per step

- **WHEN** a journey of four steps is walked
- **THEN** four screenshots exist for that journey in the run's temporary directory
- **AND** no video file is expected or reported as missing

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/walk` performs no merge and no other skill consults its result.

- **NONE** — this change has no browser-observable scenarios. Report why, in one line. `NONE` SHALL NOT be used to mean "not adopted": adoption no longer exists.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted after any permitted heal attempt: the browser could not be obtained, the preview URL is undiscoverable, staging is unreachable, or an access block survived or could not attempt its single heal-and-retry.
- **TIMEOUT** — the walk did not finish in its budget.

When the walk lands on a Cloudflare Access challenge, the heal SHALL be gated on the observed block rather than on the repo's category. With `CLOUDFLARE_API_TOKEN` available and no service-token pair in the durable store, `/walk` SHALL heal itself once before concluding `UNKNOWN`: mint a deterministically named service token through the Cloudflare Access API (widening into the Access permission groups first if needed, under the same standing authorization), ensure the Access policy accepts it, store the pair in the primary worktree's durable `.env` per the secrets convention without printing a value, apply it as request headers on the browser session, and retry. Without that token the heal SHALL be unavailable and the verdict SHALL be `UNKNOWN`, naming the Access wall and the missing credential. There SHALL be exactly one mint-and-retry per invocation.

`UNKNOWN` SHALL NOT be reported as `NONE`. A walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Nothing to walk

- **WHEN** the scout finds no browser-observable scenarios
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk
- **AND** the report does not describe the repo as unadopted

#### Scenario: An Access challenge heals once

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial, `CLOUDFLARE_API_TOKEN` is available, and the durable store has no service-token pair
- **THEN** `/walk` mints the service token, applies it as request headers, and retries the walk once
- **AND** no credential value is printed or committed

#### Scenario: An Access challenge with no Cloudflare credential

- **WHEN** a walk meets an Access interstitial and no `CLOUDFLARE_API_TOKEN` is available
- **THEN** the verdict is `UNKNOWN`, naming the Access wall and the credential that would allow the heal
- **AND** the interstitial is not reported as a rendered page or a failing journey

#### Scenario: An Access challenge that survives the heal

- **WHEN** the retry after the mint still lands on the Access interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the mint attempt and the surviving challenge

#### Scenario: Unverified is reported as unverified

- **WHEN** a walk cannot run because the browser could not be obtained
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: Evidence is posted on every verdict and degrades honestly

`/walk` SHALL post its result as a comment on the pull request on **every** verdict, including `FAILURE`, `UNKNOWN`, and `TIMEOUT` — not only on success. A failed walk's screenshots are the most useful evidence the walk can produce, and there is no merge being blocked that would otherwise carry the news.

Each comment SHALL cover each journey, its steps, its verdict, and the scenario's `THEN` it was judged against, and SHALL state where the browser ran. The written record SHALL be complete on its own, independent of whether any media renders.

One comment SHALL be posted per `/walk` invocation. Repeated invocations SHALL post additional comments rather than editing or replacing earlier ones, so the pull request carries a truthful log of attempts.

Screenshots SHALL be linked when a public object-storage host is configured and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run. The comment SHALL NOT claim or link a video, because the walk captures none.

#### Scenario: A failed walk still posts

- **WHEN** a walk returns `FAILURE`
- **THEN** a PR comment is posted containing the failing journey, its steps, its `THEN`, and its screenshots

#### Scenario: An un-runnable walk still posts

- **WHEN** a walk returns `UNKNOWN` because the preview URL could not be discovered
- **THEN** a PR comment is posted stating that the walk was not verified and why

#### Scenario: Repeated walks append

- **WHEN** `/walk` is invoked twice on the same pull request
- **THEN** two comments exist, in invocation order
- **AND** the first is not edited or deleted

#### Scenario: The comment claims no video

- **WHEN** any walk posts its evidence
- **THEN** the comment references screenshots and the written record only
- **AND** it neither links a video nor reports one as unavailable

### Requirement: The runbook ships in core and records what was declined

A runbook SHALL ship in the payload's **core** category, so it is present in every repo that receives the skill citing it. It SHALL cover what the walk needs, what it installs for itself, how journeys are expressed, and where evidence lands, plus the optional public host for inline screenshots.

Where the runbook documents provider-specific detail — the Cloudflare Access service token, the seeded `schema/seed.sql` fixture — it SHALL mark that detail as applying only to repos that took the stack pack, and any link into a stack-pack-only page SHALL be hedged as such, so a reader without the pack is never sent to a page their repo does not have.

The runbook SHALL record the deliberately declined options so they are not re-litigated: a saved test suite, a second judging agent, walking the full spec surface, and walking automatically on every push. It SHALL state that `/walk` invokes `/save` after scouting and why, distinguishing that from the declined option of walking automatically whenever `/save` runs.

It SHALL also record the decisions this capability **reversed or dropped, with the reason for each**: that the browser was once required to be remote so the walk behaved identically everywhere; that a repo dependency once served as the adoption signal; and that video was once captured per journey and is not, because the evidence a reviewer actually reads is a screenshot against a written expectation. It SHALL record which browser engines were considered and why the chosen one was chosen, including the engine-replacement path, so that choice can be revisited without being re-derived.

#### Scenario: The runbook reaches a repo with no stack pack

- **WHEN** WongStack is synced into a repo that declined the stack pack
- **THEN** the walkthrough runbook is among the files it receives
- **AND** its Cloudflare-specific sections are marked as pack-only

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walk does not run automatically on every `/save`
- **THEN** the runbook states the decision and its reason
- **AND** distinguishes it from `/walk`'s own `/save` step

#### Scenario: The reversed decisions are recorded, not erased

- **WHEN** a reader asks why the walk now runs a browser on this machine, installs its own tool, and captures no video
- **THEN** the runbook states each earlier decision, what it protected, and why it was traded

#### Scenario: The engine choice can be revisited

- **WHEN** a reader asks why this browser tool was chosen over the alternatives
- **THEN** the runbook names the alternatives, the deciding argument, and what replacing the engine would cost

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 2982 -->
## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/walk` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/dream`, `/improve`, `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/walk` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

No core payload script or skill outside `/walk` SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, the browser CLI scoped to `/walk`, and `curl` as a pack-gated skill dependency. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/walk` specifically
- **AND** the rest of the core payload is still stated to need only `git`, `gh`, and `openspec`

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/walk` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/walk`
- **THEN** no browser tool or browser is installed on its behalf

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
