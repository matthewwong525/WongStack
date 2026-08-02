---
slug: setup-sync-consolidation
started: 2026-08-02
updated: 2026-08-02
consolidated:
---

# Setup/sync/cloudflare consolidation (v8.6.0)

Session ran the full loop in one sitting: `/explore` (repo-wide simplification survey focused on wong-setup / wong-sync / wong-cloudflare) → `/plan` → `/apply` → this save. Baseline was main *after* #45 (v8.5.0, one-owner-per-fact) merged; the user asked that everything ship as one PR.

## What the exploration established (beyond what the change records)

- A fan-out survey of the wiki found `wiki/stack/` was **1,102 lines — 71% of the entire wiki**, and produced a "same fact stated in N places" map: the token click-path in 4 full copies, "Account Resources is the field people miss" in 7 places, the widen call-sequence diagram in 3 near-identical fences, the `workflow`-OAuth-scope explanation in 5 (already drifted: setup said "GitHub *wants* your permission…", wong-cloudflare "GitHub *needs*…"). `wiki/stack/provisioning.md` was structurally isomorphic to `wong-cloudflare/SKILL.md` — its own line 5 said the skill executes it.
- The drift wasn't hypothetical: **v8.0 and v8.1 each missed about half the copies** of the model they changed. Notably, the two changes were archived the same day (2026-08-01) and *disagreed* — `staging-worker-env` removed `preview_database_id` while `zero-dependency-onboarding`'s spec SHALLed writing it. Concurrent same-day changes editing the same duplicated fact is the failure mode single ownership exists to prevent.
- The late-adoption dead end was three-way: `wong-setup:99` and `wong-cloudflare:38` both pointed at `/wong-sync`, whose own rule (`SKILL.md:83` + payload manifest) is "never copied, never analysed, never offered" for non-pack repos. `adapt.md`'s example verdict record even contained a `stack-pack-cloudflare — declined` line its own rules made impossible (replaced with `improve-audits` in the example).

## User decisions (with the asked alternatives)

- `provisioning.md`: **delete** (over "keep as a ~15-line pointer").
- Adoption ownership: **full** `/wong-cloudflare` ownership of fragments + provisioning (over the minimal offer-and-flip variant).
- Legacy migration steps: **compress to one line** — no meaningful pre-v5 installed base exists.
- Scope: **all in one PR**, after #45.

## Constraints discovered while planning (the why behind design.md D1/D2)

- The "one door" can't be absolute: the `wong-cloudflare` skill *file* is pack-gated and the stack-agnostic guarantee ("a declined repo receives no Cloudflare file") is a hard spec requirement — so the door is the skill wherever it exists, and `flag + /wong-sync + /wong-cloudflare` elsewhere.
- Deferring **all** fragments to `/wong-cloudflare` is CI-safe only because the pack workflow's unprovisioned path deliberately does *not* route through `cf-build.sh` (stack-pack spec) — without that, the missing `package.json` wiring would leave a red check between install and provisioning that `/save`'s auto-fix would flail on. Worth re-checking if the workflow's no-credentials path ever changes.
- The `-staging` preview-URL form was verified three ways before unifying on it: `cf-deploy.sh` deploys `--env staging`, the staging Worker is `<worker>-staging`, and the stack-pack spec's harvest-not-construct requirement quotes the `-staging` shape.

## Mechanics worth remembering

- The live `openspec/specs/cloudflare-provisioning/spec.md` stale requirement (line ~137) is fixed via this change's delta spec folding in at spec sync — not by hand-editing the live spec.
- Link-checking gotcha: GitHub's anchor slugger turns `## Step 1 — refresh …` into `step-1--refresh-…` (each space → hyphen, em-dash dropped), so double-hyphen anchors are *correct* — a naive checker that collapses whitespace reports them as broken.
- `wiki/stack/getting-started.md` turned out to already be the lean human-narrative page; most of its flagged "overlap" was links, and only the failure table and two pointers needed edits.

## Open threads

- `improve-openspec-plans` is a separate active change (no tasks yet) — untouched by this work.
- The wiki survey also flagged smaller duplications *outside* this change's scope: the verb table appears in root `README.md` and `the-change-loop.md` (plain-language vs doctrine — judged acceptable), and `wiki/stack/README.md` blurbs were tightened here but the hub/page-blurb pattern generally trends verbose.
