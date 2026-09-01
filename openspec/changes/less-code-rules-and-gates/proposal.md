# Less code: path-scoped rules and deterministic quality gates

**Status:** ready-to-ship
**Open questions:** none

## Why

Agents write too much code — speculative helpers, defensive branches, `any` escapes — and the conventions that would prevent it live in wiki pages an agent only reads when told to. Claude Code's path-scoped rules (`.claude/rules/` with `paths:` frontmatter) load instructions into context exactly when an agent works with matching files, and the payload does not use them at all. Meanwhile every measurable line of the "AI slop" checklist (complexity, file size, coverage, dead code, duplication, mutants) is a deterministic tool — per the [principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai), that part belongs in CI as code, not in prose an agent may skim.

## What Changes

- **New payload category: path-scoped rules.** `.claude/rules/` (real directory `.agents/rules/` — `.claude` is a symlink) ships three rule files. A rule imports its owning docs instead of restating them:
  - `code.md` — scoped to `app/**`, `scripts/**`, `.github/workflows/**`: the write-less-code standard (least code that does the job and none that doesn't; decompose-first; prefer Edit over Write; verify after substantive edits; no `any`, `unknown` only when narrowed; the numeric limits are CI's job, not the agent's memory).
  - `wiki.md` — scoped to `wiki/**`: import [wiki style](../../../wiki/wiki-style.md) and [voice](../../../wiki/voice.md); don't edit the wiki mid-task unless it is the task (`/dream` is the write path).
  - `notes.md` — scoped to `notes/**`: import the [notes convention](../../../notes/README.md); `/save` writes notes, one note per line of work.
- **The app scaffold gains deterministic quality gates**, chained into its existing `npm test` script so `test.yml`'s single `npm test` contract stays the whole CI interface — no new workflow:
  - lint gates via the already-installed oxlint: cyclomatic complexity < 22, max 500 lines per file, `no-explicit-any` as error (cognitive complexity < 22 only if oxlint ships a rule for it — no second linter);
  - 100% test coverage via `@vitest/coverage-v8` thresholds;
  - zero dead code via knip (`noUnusedLocals` is already on);
  - zero duplicated code via jscpd;
  - zero surviving mutants via Stryker (`@stryker-mutator/core` + vitest runner).
- **The existing `app/` sources pass the new gates from day one** — the scaffold is small, so thresholds are absolute, not baselined; tests are extended to reach 100% coverage and kill all mutants.
- **Release ritual:** payload manifest (`payload-manifest.md` + `payload-files.json`) gains the rules category, `VERSION` → 12.2.0, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` passes.

**Non-goals:** no root `CONTRIBUTING.md` (the rules mechanism replaces it; can be added later as a symlink). No Halstead gate (no mainstream tool). No CRAP gate (at 100% coverage CRAP equals cyclomatic, so the complexity and coverage gates imply it). No ban on `unknown` (it is the correct boundary type — see `app/worker/access.ts`). No new CI workflow, no hooks, no second linter, no brownfield ratchet/baseline mechanism.

## Capabilities

### New Capabilities

- `path-scoped-rules`: the payload ships `.claude/rules/` as a core category — path-scoped, thin rule files that import conventions into an agent's context when it works with matching files.

### Modified Capabilities

- `app-scaffold`: the scaffold's `npm test` becomes the quality gate chain — coverage, lint limits, dead-code, duplication, and mutation checks run behind the one script `test.yml` already calls, and the shipped sources satisfy them.

## Impact

- **New files:** `.agents/rules/code.md`, `.agents/rules/wiki.md`, `.agents/rules/notes.md` (reachable as `.claude/rules/*`).
- **Edited:** `app/package.json` (devDeps + `test` script chain), `app/vitest.config.ts` (coverage thresholds), `app/.oxlintrc.json` (limit rules), new `app/knip.jsonc`, `app/.jscpd.json`, and `app/stryker.conf.json`, `app/worker`/`app/src` tests as required to reach the thresholds, `.claude/skills/wong-sync/references/payload-manifest.md` + `payload-files.json`, `VERSION`, `CHANGELOG.md`.
- **Dependencies:** devDependencies only, in `app/`: `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `knip`, `jscpd`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`.
- **Downstream repos:** next `/wong-sync` proposes the three rule files (copy-if-absent) to every repo, and the gate changes only to repos that took the app scaffold; a repo with local authorship over any of these files is untouched, as always.
- **CI cost:** `npm test` gets slower (mutation testing dominates); acceptable on the tiny scaffold, and a target repo that outgrows it edits its own copy.

## Decision log

- **2026-09-01** — Added the three core path-scoped rules and the complete scaffold gate chain. The final local chain passes with 100% coverage, zero dead-code findings, zero duplicated blocks, and all 170 mutants killed. Oxlint has no cognitive-complexity rule, and Stryker uses its supported in-place mode to stay compatible with TypeScript 7. Spec sync also restored the four `wiki-root` requirements from the archived `rename-docs-to-wiki` delta; that main spec had an empty Requirements section and blocked whole-store validation. CI verification remains.
- **2026-09-01** — CI passed on the pushed implementation. The full `npm test` gate chain is green, all 19 tasks are complete, and the change is ready to ship.
- **2026-09-01** — The user asked the wiki and notes rules to auto-load their owners. Both rules now use relative `@path` imports, which stay conditional on each rule's path scope. The payload link checker also validates relative imports in every install shape. All 21 tasks are complete.
