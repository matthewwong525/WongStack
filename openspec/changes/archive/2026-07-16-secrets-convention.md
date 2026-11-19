<!-- openspec-archive v1 2026-07-16-secrets-convention -->
<!-- file proposal.md utf8 2586 -->
# secrets-convention

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack says nothing about secrets, so every install reinvents how it keeps API keys out of git and how a new contributor knows which variables to set. A single stack-neutral convention — a committed `.env.example` that lists every variable, and a git-ignored real file — fixes both, and it's the one generalizable piece of the `.dev.vars` pattern a downstream Cloudflare install uses.

**Non-goals:** No platform machinery (no Workers Builds, wrangler, preview URLs, or any build-gate coupling) — this is a documented convention, not code. No change to the loop, the skills' behavior, or the gate.

## What Changes

- Add a root **`.env.example`** — documented, blank placeholders; the source-of-truth list of every variable the project reads.
- Add real-secret filenames (`​.env`, `.env.local`, `.dev.vars`) to **`.gitignore`**.
- Add a **`docs/development/secrets.md`** page (progressive-disclosure) explaining the convention, linked from the development section README.
- Have **`install-wong-stack`** offer to seed the convention into target repos (the `secrets.md` page already rides along with `docs/`; additionally offer the `.env.example` + `.gitignore` entries).
- `CHANGELOG.md` entry + `VERSION` bump `4.0.0 → 4.1.0` (additive, minor).

## Capabilities

### New Capabilities
- `secrets-convention`: A stack-neutral secrets-example convention (`.env.example` as the source-of-truth variable list + git-ignored real file + a docs page), decoupled from any build gate.

### Modified Capabilities
<!-- None. -->

## Impact

- **Root payload:** new `.env.example`; `.gitignore` gains secret-file entries; `CHANGELOG.md`; `VERSION` → 4.1.0.
- **Docs:** new `docs/development/secrets.md`, linked from `docs/development/README.md`.
- **Installer:** `install-wong-stack` offers to seed the convention (does not force it).
- **No skills/hooks/loop behavior change.** Rides along with a plan-only `recommended-stack-guide` change on the same branch.

## Decision log

- **2026-07-16** — Re-scoped from the larger `evolve-change-loop` work after PR #16 independently shipped the overlapping `/apply` + living-handoff half (v4.0.0). Dropped our duplicate `/apply`/handoff reimplementations. Also **dropped the `/ship` quality gate** on the user's call — #16 deliberately kept quality-gate subagents out of `/ship` on stack-agnostic grounds, and we're respecting that shipped decision. What remains is purely additive: this secrets convention + the plan-only `recommended-stack-guide`.

<!-- end proposal.md -->
<!-- file design.md utf8 1598 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 815 -->
## 1. The convention

- [x] 1.1 Add a root `.env.example` with documented placeholder variables (inline comment per var); assert no platform names (Cloudflare/wrangler/Workers Builds)
- [x] 1.2 Add real-secret filenames (`.env`, `.env.local`, `.dev.vars`) to `.gitignore`
- [x] 1.3 Author `docs/development/secrets.md` per the progressive-disclosure rulebook; link it from `docs/development/README.md`

## 2. Installer + release

- [x] 2.1 Have `install-wong-stack` offer to seed the `.env.example` + `.gitignore` entries into target repos (opt-in, not forced; the `secrets.md` page rides along with `docs/`)
- [x] 2.2 Add a `CHANGELOG.md` entry and bump `VERSION` `4.0.0 → 4.1.0`
- [x] 2.3 Verify: `.env.example` names no platform, docs link resolves, installer seeding is opt-in, no skill/loop behavior changed

<!-- end tasks.md -->
<!-- file specs/secrets-convention/spec.md utf8 2432 -->
## ADDED Requirements

### Requirement: A stack-neutral secrets-example convention ships in the payload

WongStack SHALL ship a stack-neutral secrets convention: a committed `.env.example` template that documents each expected variable with an inline comment (what it is, where to get it), and real secrets files that are git-ignored. The convention SHALL NOT couple to any build gate, preview URL, or platform tool (no Workers Builds, wrangler, or Cloudflare assumptions) — it is documentation of a pattern, not machinery.

#### Scenario: The example template is committed and the real files are ignored

- **WHEN** a repo adopts the convention
- **THEN** `.env.example` (documented placeholders) is committed and the real secrets files (`.env`, `.env.local`, and stack variants) are listed in `.gitignore`

#### Scenario: The convention names no platform

- **WHEN** a reader reviews the shipped `.env.example` and its docs page
- **THEN** neither requires Cloudflare, Workers Builds, wrangler, or a preview URL to function

### Requirement: A docs page documents the convention

The `docs/` wiki SHALL include a page describing the secrets-example convention — why real secrets stay out of git, how the `.example` file stays the source-of-truth list of variables, and how a contributor bootstraps a local secrets file from it. The page SHALL follow the progressive-disclosure rulebook (topic title, strong opener, linked up/down/sideways) and be registered in the development section README.

#### Scenario: The wiki explains the convention

- **WHEN** a contributor looks for how secrets are handled
- **THEN** a docs page explains the `.env.example`-as-source-of-truth pattern and how to bootstrap a local file
- **AND** the development section README links it

### Requirement: The installer offers the convention without forcing it

`install-wong-stack` SHALL offer to seed the convention into a target repo — the `secrets.md` page (with `docs/`) plus, on confirmation, an `.env.example` and the git-ignore entries for real secrets files. It SHALL confirm before touching `.gitignore` or adding the example, since the target may already handle secrets its own way.

#### Scenario: Installer seeds on opt-in

- **WHEN** `install-wong-stack` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example` and the `.gitignore` entries; if the user declines, it leaves them untouched

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-16

~~~
<!-- end .openspec.yaml -->
