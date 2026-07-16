## Context

Docs + payload additive change, re-scoped from `evolve-change-loop` after PR #16 shipped the overlapping loop work. Only the stack-neutral secrets convention survives here (the `/ship` quality gate was dropped to respect #16's stated stance). No code, no loop change.

## Goals / Non-Goals

**Goals:** ship a documented, platform-neutral `.env.example` convention + a wiki page; have the installer offer it; keep WongStack stack-agnostic.

**Non-Goals:** no build-gate/preview/wrangler machinery; no skill-behavior or loop change; not making any stack a default.

## Decisions

**1. Convention, not machinery.** Ship an example file + a docs page + `.gitignore` entries. Nothing reads the file; a repo renames it to whatever its stack expects. This is the one generalizable lesson of `.dev.vars` — the example-as-source-of-truth discipline — without the Cloudflare plumbing.

**2. Installer offers, never forces.** Secrets handling is often already solved in a target repo; the installer confirms before adding `.env.example` or editing `.gitignore`. The docs page rides along with `docs/` like any other page.

**3. Minor bump (4.0.0 → 4.1.0).** Purely additive; the updater surfaces it as an optional new convention.

## Risks / Trade-offs

- **Staleness of example vars** → keep the page principle-led ("add a var in code → add it here"), not a fixed list.
- **Redundant with a repo's own dotenv** → mitigated by the installer's opt-in + the "rename to your stack's file" guidance.

## Open Questions

- None. `.env.example` at repo root, page under `docs/development/`.
