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
