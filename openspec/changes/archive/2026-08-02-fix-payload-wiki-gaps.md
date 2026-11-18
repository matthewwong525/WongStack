<!-- openspec-archive v1 2026-08-02-fix-payload-wiki-gaps -->
<!-- file proposal.md utf8 5624 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 6086 -->
## Context

A fresh install of 9.0.0 into an empty repo produced this:

```
== links from CLAUDE.md that don't exist ==
MISSING: wiki/agent-knowledge-center.md
MISSING: wiki/development/the-change-loop.md

== broken links from installed wiki pages ==
wiki/ux-principles.md             -> development/the-change-loop.md
wiki/stack/staging-walkthrough.md -> ../development/the-change-loop.md
wiki/wiki-style.md                -> ../marketing/find-inspiration.md
wiki/wiki-style.md                -> weekly-cadence.md

== broken ../../../wiki links from installed skills ==
9 skills -> ../../../wiki/development/the-change-loop.md
wong-cloudflare (x2) -> ../../../wiki/development/required-tools.md
```

Fourteen references to `the-change-loop.md` across nine of the ten installed skills, and it has never been in the payload manifest. The manifest's docs list is five pages: `wiki-style.md`, `voice.md`, `contributing.md`, `development/secrets.md`, `ux-principles.md`.

The reason this survived review is structural. The payload's one-owner rule is enforced *within this repo*, where every cited page exists — so a reviewer following a citation always lands somewhere real. The failure only appears in the artifact nobody reads: a fresh target. This repo is not a valid test of its own payload, and that is the general lesson worth encoding.

## Goals / Non-Goals

**Goals:**
- A target repo receives every page its skills and its `CLAUDE.md` send it to.
- The rulebook that travels contains no link a target cannot resolve.
- The class of defect becomes mechanically detectable at release rather than discoverable only by installing.

**Non-Goals:**
- Changing what any of these pages says, or restructuring the wiki. Adding a page to the manifest is a distribution decision, not an editorial one.
- The `docs/`-vs-`wiki/` allowlist question. `save/SKILL.md` decides it explicitly (*"`wiki/` means the literal prefix `wiki/`… Don't re-litigate this per save"*), so reversing it is a deliberate call, not a defect fix, and it belongs in its own change.
- Auditing the target's own wiki. Only payload files are in scope.

## Decisions

### Ship the three pages rather than de-cite them

Two ways to make a citation resolve: ship the owner, or remove the citation and inline the fact. Inlining is wrong here on the payload's own terms — it would put the merge-gate rules into nine skills, which is exactly the duplication the one-owner rule exists to prevent, and the rule's stated reason ("prose has no mechanism that keeps them agreeing") applies with full force to a rule cited fourteen times.

So the citations stay and the owners ship. That makes `the-change-loop.md` payload, which is the right classification anyway: it describes the loop the payload's own verbs implement, not anything specific to this repo.

`required-tools.md` and `agent-knowledge-center.md` follow the same argument — `/wong-cloudflare` cites the first for the toolchain it depends on, and the `WONG-STACK` block names the second as the philosophy the whole arrangement rests on. A target that has the verbs and not their rationale has the mechanism without the reason.

### Transitive closure is part of the work, not a follow-up

Adding a page to the manifest makes that page's *own* outbound links a target's problem. `the-change-loop.md` and `agent-knowledge-center.md` must be read for links into non-payload parts of this wiki before they can ship, and anything they cite is either added too or generalized. The task list treats this as a closure to compute, not a spot check — otherwise this change ships the next round of dead links itself.

### The check runs against a fresh install, not against this repo

This is the part that generalizes. Every one of these defects is invisible here and obvious there. So the rule is written in the direction the target experiences it, and releasing the payload includes resolving links in a fresh install — the same install this change came out of.

*Alternative considered:* a link-checker over the source repo. Rejected: it would pass today. The defect is not that links are broken here — they aren't — but that the *subset* which travels is incomplete. Only installing exposes it.

### `wiki-style.md` loses its examples rather than gaining pages

The two dead links are illustrations, not owners. Shipping `marketing/find-inspiration.md` to every target to satisfy an example in a style guide would be absurd — WongStack's marketing section is not a target's business. Generalize the example or drop it.

## Risks / Trade-offs

- **The payload's doc surface grows from five pages to eight** → all three are cited by files already shipping, so the target's effective surface does not grow; it stops being broken.
- **`the-change-loop.md` may contain WongStack-specific detail** → that is precisely what the transitive pass is for. Where it does, generalize during this change rather than shipping it as-is.
- **Existing installs stay broken until their next sync** → copy-if-absent means the pages land on the next `/wong-sync` with no conflict, since no target has a file at those paths. This is the good case: the fix arrives automatically for everyone.
- **A fresh-install link check adds a release step** → it is a scripted walk over a temp install, and it is the only step that tests the artifact users actually get.

## Migration Plan

Pure addition. The three pages are absent in every target, so copy-if-absent installs them on the next sync with nothing to reconcile. `wiki-style.md` already exists in installed repos and is never overwritten — the corrected version surfaces through the adapt step as a proposal, which is acceptable since a dead illustrative link is cosmetic next to a missing owner.

`VERSION` takes a minor bump.

## Open Questions

None blocking. The transitive closure of the three pages' own links is computed during implementation (task 1) and may add pages to the manifest — if it adds many, that is a signal the wiki's payload/local boundary needs its own change rather than being settled here.

<!-- end design.md -->
<!-- file tasks.md utf8 2477 -->
## 1. Compute the closure first

- [x] 1.1 Read `wiki/development/the-change-loop.md`, `wiki/agent-knowledge-center.md`, and `wiki/development/required-tools.md` and list every outbound link each contains
- [x] 1.2 For each link, decide: add that page to the payload too, generalize the reference, or drop it — repeat until the set is closed
- [x] 1.3 Flag any page whose content is WongStack-specific enough that shipping it verbatim would confuse a target, and note what needs generalizing
- [x] 1.4 If the closure grows large, stop and raise it — that is a payload/local boundary question, not this change

## 2. Payload manifest

- [x] 2.1 Add `development/the-change-loop.md`, `agent-knowledge-center.md`, and `development/required-tools.md` to the docs list in `.claude/skills/wong-sync/references/payload-manifest.md`
- [x] 2.2 Add anything else the closure requires
- [x] 2.3 State the rule alongside the list: a page the payload cites as an owner is a page the payload ships

## 3. Generalize what ships

- [x] 3.1 Fix `wiki/wiki-style.md`'s two dead links (`../marketing/find-inspiration.md`, `weekly-cadence.md`) by generalizing or dropping the examples — do not ship WongStack's marketing section to targets
- [x] 3.2 Apply the generalizations task 1.3 identified to the three new pages
- [x] 3.3 Re-check that none of the newly shipping pages introduces a fresh link outside the payload

## 4. The release check

- [x] 4.1 Write the fresh-install link check: install the payload into a scratch repo and resolve every internal link in every copied file, reporting any that dangle
- [x] 4.2 Record it as part of releasing a payload change, alongside the `VERSION` and `CHANGELOG.md` steps
- [x] 4.3 State plainly why the source repo cannot be the test: every one of these links resolves here

## 5. Verify

- [x] 5.1 Fresh-install into an empty repo and confirm zero dangling links from `CLAUDE.md`, the skills, and the wiki pages
- [x] 5.2 Confirm the nine skills' `../../../wiki/development/the-change-loop.md` references resolve
- [x] 5.3 Confirm `/wong-cloudflare`'s two `required-tools.md` references resolve
- [x] 5.4 Confirm a target's own wiki content is untouched

## 6. Release

- [x] 6.1 Bump `VERSION` (minor)
- [x] 6.2 Add the `CHANGELOG.md` entry, noting that existing installs receive the missing pages automatically on their next `/wong-sync` (copy-if-absent, no conflict) while the `wiki-style.md` correction arrives as an adapt-step proposal

<!-- end tasks.md -->
<!-- file specs/payload-single-source/spec.md utf8 3298 -->
## ADDED Requirements

### Requirement: A cited owner is a shipped owner

Where a payload file directs the reader to another file for a fact — the pattern the one-owner rule requires — the file it points at SHALL itself be payload. Citing an owner the target repo does not receive converts the one-owner rule from a way of keeping facts consistent into a way of removing them: the fact is stated nowhere the reader can reach.

This SHALL be checked in the direction the target experiences. `wiki/development/the-change-loop.md` is cited fourteen times across nine skills, `ux-principles.md`, `staging-walkthrough.md`, and the `WONG-STACK` block — which names it as the one place that owns the merge gate and the prose allowlist — while being absent from the manifest, so no target repo has ever had it. `agent-knowledge-center.md` and `development/required-tools.md` are absent on the same terms.

The consequence is not merely a broken link. `CLAUDE.md` instructs an agent to find and read the owning doc rather than guess; where that doc does not exist, the instruction produces the guess it was written to prevent.

#### Scenario: A skill's cited page is present after install

- **WHEN** a payload skill directs the reader to a wiki page
- **THEN** a repo that installed the payload has that page
- **AND** the reader can follow the link

#### Scenario: Adding a citation adds a manifest entry

- **WHEN** a payload file gains a reference to a page that owns a fact
- **THEN** that page is in the payload manifest, or the reference is not added

### Requirement: No payload file ships a link it cannot resolve in a target

A file in the payload SHALL NOT contain a link to a path outside the payload. A payload file is copied verbatim into repos that have none of this repo's own content, so a link resolvable only here is broken everywhere it lands.

`wiki/wiki-style.md` is the live instance: the rulebook every target is told to follow ships with links to `../marketing/find-inspiration.md` and `weekly-cadence.md`, which exist only in WongStack. Where a payload page needs an example from this repo's wiki, it SHALL generalize the example or drop it, rather than link to it.

Because this is mechanically checkable, it SHALL be checked rather than reviewed: **releasing a payload change SHALL include resolving every internal link in a fresh install.** A payload whose links do not resolve in a target is defective regardless of whether it resolves here — this repo is not a valid test of it, since this repo has content no target does.

#### Scenario: Payload links resolve in a fresh install

- **WHEN** the payload is installed into a repo with no prior content
- **THEN** every internal link in every copied file resolves to a file that exists
- **AND** a link that does not resolve is a release defect

#### Scenario: The source repo is not accepted as the test

- **WHEN** a payload file's links are verified
- **THEN** they are verified against a fresh install, not against this repo
- **AND** a link resolving only here counts as broken

#### Scenario: A payload page needs a local example

- **WHEN** a payload page would illustrate a rule with a page only this repo has
- **THEN** the example is generalized or omitted
- **AND** no link to a non-payload path is shipped

<!-- end specs/payload-single-source/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
