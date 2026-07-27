## Context

Change 2 of the three-change arc. Change 1 shipped the `wiki/stack/` Access + credentials docs; this ships the runnable pack. The source is a production app (`~/ClaymooApp`) whose three D1 scripts and pipeline docs encode real operational scar tissue — a `main` branch that sat red for 8 commits after a hand-applied migration, a topo-sorting reset written to work around D1 ignoring `defer_foreign_keys`. Two of our settled decisions *shrink* that source dramatically: seeded staging deletes the entire prod-export/topo-sort/self-FK machinery (~250 lines → ~90), and timestamp migrations delete the duplicate-prefix guard. The pack ships the distilled, generalized result.

The hard constraint that shapes everything: WongStack must stay stack-agnostic for repos that don't want this. So the pack is **opt-in and gated**, and it reuses the existing install/sync engine rather than bolting on a parallel one.

## Goals / Non-Goals

**Goals:**
- Ship three zero-config, byte-identical scripts + a seed template + pipeline docs, installed and refreshed only for repos that opt in.
- Reuse the one copy engine: pack drop-in files are manifest files gated on `components.stackPack`; refresh is the existing three-way diff.
- Keep the core three-tool guarantee (`git`/`gh`/`openspec`) literally true for every repo that declines.
- Generalize, not copy — nothing app-specific survives.

**Non-Goals:**
- No app scaffold (no `src/`, no Worker code). The adopter owns their app.
- No `/server` skill — everything remote, preview URL is the inner loop.
- No change to `/wong-sync`'s contribute leg (change 3).
- No integration tests (later change; this change's seed DB + change 1's service token are its groundwork).

## Decisions

**1. Two file kinds, two delivery mechanisms.** The pack splits cleanly:
- **Drop-in files** (`scripts/cf-build.sh`, `scripts/swap-d1-id.js`, `scripts/reset-staging-d1.mjs`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) are whole files the target owns after install. These go in the **manifest**, gated on `components.stackPack`, and pull/refresh through the existing three-way diff unchanged.
- **Config fragments** (`package.json` scripts, `wrangler.jsonc` `d1_databases`, `.env.example` vars, `.gitignore` `.dev.vars`) must *merge* into files the target already owns. These are **not** manifest pull-files; they're applied as guided edits at install, following the `CLAUDE.md` WONG-STACK-block precedent (show fragment → apply with confirmation → never blind-write). They live as reference content the installer applies.

*Alternative — put fragments in the manifest too:* rejected; you can't three-way-diff a fragment against a whole file the user owns without a marker convention, and `package.json`/`wrangler.jsonc` don't take comment markers cleanly.

**2. Gate on `components.stackPack`, reuse three-way for everything else.** The manifest gets one boolean. `/wong-setup` writes it (Decision 3); `/wong-sync` reads it and, only when true, includes the pack's drop-in files in the file list it classifies. Everything downstream — classification, batch-approve, conflict resolution, "locally edited → ask" — is the machinery already specified in the `wong-sync` capability. **"Detect local edits on refresh" is not new work; it is the base→local half of the three-way diff.** This is why the pack is cheap to add: one flag + one conditional file list, no new refresh engine.

**3. Opt-in happens once, at setup; install rides fresh-mode.** `/wong-setup` adds a single prompt and, on yes, writes `components.stackPack: true` into the seed manifest. Then its normal hand-off to `/wong-sync` fresh mode pulls the pack's drop-in files with the rest of the payload — no separate seeding path — and applies the config fragments as guided edits. Decline is the default and never gates the rest of setup. A repo can also add the pack later by setting the flag and re-syncing.

**4. Zero-config by reading target-owned files.** No pack file carries a per-repo value, so every copy is byte-identical and refresh is frictionless. `cf-build.sh` reads the database name from `wrangler.jsonc`; `swap-d1-id.js` reads both ids from `wrangler.jsonc` and drops the `PROD_DB_ID` constant (redundant — the swap only runs on non-`main` branches, which in CI always start from a fresh clone with the file in prod state). Secrets come from `.env`. This is the single most important property for the "pull the new version" experience: identical files never conflict.

**5. Timestamp migrations, guard deleted.** Filenames become `YYYYMMDDHHMMSS_name.sql`. Filename (lexical) order equals author order equals apply order, so two parallel branches structurally cannot collide — the source's duplicate-prefix guard (and its documented blind spot) is deleted, not generalized. The companion doc rule: **migrations are additive and order-independent**, because a slow branch can merge an older timestamp after a newer one, and a fresh-DB replay then applies them in a different order than prod did. Additive migrations make that reordering harmless.

**6. Seeded staging, prod untouched.** `reset-staging-d1.mjs` becomes: drop all objects → apply migrations → apply `schema/seed.sql`. Gone: `wrangler d1 export` against prod, the FK-edge parser, the topo-sort, the self-FK stripper, the `INSERT OR IGNORE` reorder. The reset never reads prod, so it's safe, fast, and deterministic — which promotes it from "heavyweight" to the routine escape hatch when a shared staging DB gets wedged. Cost, stated in the docs: fixtures won't catch a migration that only breaks on prod-scale data shapes; the mitigation is forward-only prod migrations + Time Travel.

**7. Canonize the recovery runbooks verbatim in spirit.** The two hardest-won source docs — "never hand-apply schema to prod" and "reconcile `d1_migrations` when prod drifts" — generalize with almost no change; they're the highest-value prose in the pack. Ship them in the pipeline docs.

**8. Required-tools split, stated out loud.** The pack adds `node`/`npm`/`wrangler` + a Cloudflare account. The required-tools page currently guarantees exactly `git`/`gh`/`openspec` and is proud of it. Rather than quietly break that, the page states the split: core = three tools always; the opt-in pack may need more, but only in a repo that took it and only in that repo's build/CI, never in a WongStack skill. The guarantee stays literally true for every non-pack repo.

## Risks / Trade-offs

- **Config-fragment refresh is weaker than drop-in refresh.** A three-way diff can't cleanly re-merge a changed `package.json` fragment. *Mitigation:* fragments change rarely (they're structural); on the rare upstream fragment change, `/wong-sync` re-offers it as a guided edit rather than auto-merging. Documented as a known limit, not hidden.
- **Shared staging DB races between parallel branches.** Every branch preview binds the same staging D1; concurrent resets/migrations stomp each other. *Accepted, per the /explore decision* — the nature of a shared staging; the docs state it and lean on seeded reset as the recovery. The later integration-tests change inherits this constraint.
- **Seeded staging misses prod-scale surprises.** A migration that chokes on 400k rows or an unexpected NULL won't show in fixtures. *Mitigation:* forward-only prod migrations run against prod for the first time at merge with Time Travel behind them; the docs name this trade explicitly.
- **Generalizing scripts we can't run here.** This environment has no Cloudflare account or D1. *Mitigation:* the scripts are mechanical generalizations of working source (drop constants, read from `wrangler.jsonc`, delete the mirror machinery); the pipeline docs carry the "verify against your account" burden, and the scripts are small enough to review by inspection.
- **`.mjs`/`.sh` in a "no-node payload" toolkit.** Could read as violating the toolchain guarantee. *Mitigation:* Decision 8 — these run in the *target's* build, not in any skill; the spec and the docs draw that line explicitly.

## Open Questions

- None blocking. The config-fragment refresh limit (Risk 1) is the one spot where behavior is "re-offer, don't auto-merge"; if that proves annoying in practice a marker convention for `wrangler.jsonc` could be added later, but it's not worth the complexity now.
