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
