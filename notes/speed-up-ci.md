---
slug: speed-up-ci
started: 2026-09-21
updated: 2026-09-21
---

# Speed up CI

## What was asked

"Look at making this repo more efficient" — deliberately broad, given to `/plan`. The session read
"efficient" as **CI runner time**, because it is measurable and the fix is deterministic code. The
other readings (agent context, repo size) are named below and were not taken.

The session was **non-interactive**, so the `/explore` exit round asked nothing. Every material
choice was taken as a recommended default and marked `assumed` in the proposal Decision log.

## The survey and its numbers

Per-step durations read from the GitHub Actions API for the three runs on 2026-09-20:

| Workflow | Duration | Runs per commit on a PR branch |
|---|---|---|
| Deploy | 31 s | 1 |
| Test | 68 s | 1 |
| Payload checks | 27 s | **2** |

Payload checks was the only duplicate. `test.yml` and `deploy.yml` already collapse the
`push`/`pull_request` double fire; `payload.yml` shipped without that pair. Over the last 18 runs
of that workflow: 10 `push`, 8 `pull_request`, 537 s total.

Inside the Test job: `npm ci` 8 s, `npx playwright install --with-deps chromium` 19 s, `npm test`
35 s.

## Ruled out, and why

- **Caching the Playwright browser.** Saves part of a 19 s step, and roughly half of that step is
  `--with-deps` system packages a cache does not cover. `test.yml` ships to every target, so the
  complexity lands in every repo. Not worth it.
- **Dropping `npm ci` from Payload checks (9 s).** Impossible as written: `scripts/tests/review.test.mjs`
  pulls `jsdom` out of `app/node_modules` through `createRequire`.
- **Trimming skill prose to cut agent context.** The payload is ~290 KB of markdown; `save/SKILL.md`
  alone is 29.5 KB. Real, but cutting it is a judgment call about behavior, not a mechanical win.
  Left as a follow-up for the user to scope.
- **Pruning archived `review.html` files.** `openspec/changes/archive/` is 4.7 MB, of which ten
  review pages are 506 KB. They are the immutable shipped record and the repo rule says not to
  rewrite historical archives. Cost is disk, not time.

## Open threads

- **The documented builder command silently does nothing in this repo.** `.claude` is a symlink to
  `.agents`, so in `build-review.mjs` the main guard `resolve(process.argv[1]) === fileURLToPath(import.meta.url)`
  never matches and the script exits 0 having written nothing. Every skill that documents
  `node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs"` — `/plan`
  and `/save` both — is affected **in this meta-repo only**; a target's skill directory is real, so
  the guard fires there. Work around it with
  `node "$(readlink -f "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs")"`.
  Deserves its own small change; not fixed here.
- **The meta test suite cannot run locally from a bare checkout.** `node --test scripts/tests/*.test.mjs`
  fails on `review.test.mjs` until `npm ci` has run in `app/`. CI installs it, so this is a local
  developer surprise only.
- Two old `CHANGELOG.md` headings (8.6.0 and 8.3.0) have no blank line before them. Pre-existing and
  left alone.

## Review page

Built and checked in a real browser (`agent-browser`) at 1280 and 390 wide: the structural checker
returned no issues and neither width scrolls sideways. A critic pass produced seven findings — the
fork card wrongly tagged `Changed` when fork behaviour is unchanged, one callout covering four
separate points, and a phone diff wrapping mid-token — and all seven were applied in one revision
round. **Reopening the file in the same browser session serves a cached copy**; add a `?v=<epoch>`
query to see an edit.
