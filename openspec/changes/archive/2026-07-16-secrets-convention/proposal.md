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
