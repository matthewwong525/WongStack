# fix-payload-wiki-gaps

**Status:** ready-to-ship
**Open questions:** whether the 11 *conditional* links (payload files pointing into opt-in categories) should be restructured — raised, deliberately out of scope per task 1.4

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

A fresh install ships a repo whose most-cited process doc does not exist.

`wiki/development/the-change-loop.md` is referenced **14 times across 9 of the 10 installed skills** — `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `walk`, plus `ux-principles.md`, `stack/staging-walkthrough.md`, and the `WONG-STACK` block, which calls it *"the one place that owns"* the gate ladder and the prose allowlist. It is not in the payload manifest, so a target repo never receives it. Two more go the same way: `wiki/agent-knowledge-center.md`, which the block opens by naming as the philosophy, and `wiki/development/required-tools.md`, cited twice by `/wong-cloudflare`.

The effect compounds with the block's own instruction. `CLAUDE.md` tells an agent, before any non-trivial change, to *"find and read the owning doc rather than guessing from code or memory."* In a freshly installed repo the owning doc for the merge gate is a dead link — so the agent guesses, which is the failure the whole knowledge-center premise exists to prevent.

Separately, `wiki-style.md` — the rulebook a target is told to follow — arrives carrying links to `../marketing/find-inspiration.md` and `weekly-cadence.md`, pages that exist only in WongStack. The rulebook fails its own link check on arrival.

Verified on a fresh install of 9.0.0:

```
MISSING: wiki/agent-knowledge-center.md
MISSING: wiki/development/the-change-loop.md
wiki/ux-principles.md            -> development/the-change-loop.md
wiki/stack/staging-walkthrough.md -> ../development/the-change-loop.md
wiki/wiki-style.md               -> ../marketing/find-inspiration.md
wiki/wiki-style.md               -> weekly-cadence.md
```

## What Changes

- **The three cited pages join the payload manifest's docs list** — `development/the-change-loop.md`, `agent-knowledge-center.md`, `development/required-tools.md` — so a target receives the pages its skills and its `CLAUDE.md` send it to.
- **`wiki-style.md` stops shipping WongStack-only links.** The rulebook that travels contains no reference a target repo cannot resolve; examples drawn from this repo's own wiki are either generalized or removed.
- **The payload gains a link-integrity rule**: no payload file may ship a link to a path outside the payload. This is the general form of all four defects, and it is mechanically checkable — a target install resolves every internal link or the payload is wrong.
- **A fresh-install link check becomes part of releasing the payload**, so this class cannot ship again unnoticed.

**Non-goals:** restructuring the wiki or changing what any of these pages says; the `docs/`-vs-`wiki/` prose-allowlist question, which is a deliberate documented decision and needs a separate call; the CI, config-drift, and Access changes.

## Capabilities

### Modified Capabilities
- `payload-single-source`: the one-owner rule gains its missing counterpart — an owner that is *cited* by the payload must be *shipped* with it, and no payload file may link outside the payload.

## Impact

- `.claude/skills/wong-sync/references/payload-manifest.md` — three pages added to the docs list.
- `wiki/wiki-style.md` — the two dead links.
- Any wiki page newly in the manifest must be checked for its own outbound links, transitively, before it can ship.
- `VERSION`, `CHANGELOG.md`.
- Every repo installed at 9.0.0 or earlier has the dead links today; they receive the pages on their next `/wong-sync` by copy-if-absent.

## Decision log

- **2026-08-02** — Implemented all 19 tasks. The three cited pages joined the manifest's docs list, with the governing rule stated beside it: **a page the payload cites as an owner is a page the payload ships** — and shipping a page means shipping its link closure.
  **Computing the closure changed the shape of the work.** The three pages pulled in references to `adding-a-skill.md` and `development/README.md` (not payload) and to `wiki/stack/*` (pack-gated). Per task 1.2 these were generalized rather than dragging more pages in; per task 1.4 the *pre-existing* conditional-link question was raised, not silently absorbed.
  `scripts/check-payload-links.mjs` resolves links against the file set a target receives across four install shapes, and distinguishes **dead** (resolves nowhere — exits non-zero) from **conditional** (resolves only where the target took that opt-in category — reported). It models the target properly: CLAUDE.md is checked block-only, target-provided files (`README.md`, the wiki hubs) count as valid destinations but aren't themselves linted, and backticked examples are stripped so code samples don't cry wolf.
  It earned its place immediately — **it caught a page this session invented** (`wiki/development/releasing.md`, referenced from the manifest before it existed) plus two genuinely dead `wong-setup/SKILL.md` links in `required-tools.md`, `wong-setup` being source-only and never copied. Now zero dead links across all four shapes; 11 conditional links reported.
  `wiki-style.md`'s two WongStack-only examples were re-pointed at real payload pages (`development/secrets.md`, `contributing.md`) so even a naive checker resolves them.
