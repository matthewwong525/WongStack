<!-- openspec-archive v1 2026-09-01-less-code-rules-and-gates -->
<!-- file proposal.md utf8 6754 -->
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
- **2026-09-01** — Archived the completed change for shipping. The `app-scaffold` and `path-scoped-rules` delta specs were already synced, all 21 tasks were complete, and the archive moved to `openspec/changes/archive/2026-09-01-less-code-rules-and-gates/` before the delegated final checkpoint.
- **2026-09-01** — The shipping verification scout found two deploy-observable scaffold scenarios and requested its required saved deployment checkpoint. All other scenarios concern repository files, sync behavior, or CI and have no deployed probe.
- **2026-09-01** — The verification checkpoint exposed a clock-boundary race in the mutation test for `nbf === now`: the test could cross a one-second boundary and let the `>` to `>=` mutant survive. The test now fixes the clock at a known second so the boundary is deterministic; CI will re-run the complete gate chain.

<!-- end proposal.md -->
<!-- file design.md utf8 7049 -->
# Design — less-code-rules-and-gates

## Context

See proposal.md — Why. Current state that shapes the approach:

- `.claude` → `.agents` and `CLAUDE.md` → `AGENTS.md` are symlinks ([repo layout](../../../wiki/development/repo-layout.md)); the Edit tool refuses to write through a symlink, so every rule file is created at `.agents/rules/` and *cited* as `.claude/rules/`.
- Claude Code loads a `.claude/rules/*.md` file when the agent **reads** a file matching its `paths:` frontmatter globs (v2.1.198+ resolves symlinked checkouts). It does not fire on a bare `Write` of a brand-new file whose siblings were never read — an accepted gap; the only closure is a hook, and `.claude/settings.json` is deliberately outside the payload.
- `test.yml`'s whole contract with a repo is `npm test`, found root-first then in immediate subdirectories ([ci-tests spec](../../../openspec/specs/ci-tests/spec.md)). `app/` already declares vitest and oxlint; `tsconfig.app.json` already sets `noUnusedLocals`/`noUnusedParameters`.
- `app/worker/access.ts` is **deliberately inert** — no non-test file imports it (see the [payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md)). Any dead-code tool must be told it is kept on purpose.

## Goals / Non-Goals

**Goals (design-level):** every gate deterministic and absolute; zero new *runtime* dependencies; no gate that requires local execution before push; rule files cheap enough in context that loading them costs nothing noticeable.

**Non-Goals:** a brownfield ratchet (baselines, hold-or-improve) — targets with existing apps edit their own copy of the gates; enforcing the rules mechanism for non-Claude agents (the `.agents/` naming keeps the door open, nothing more); restructuring `App.tsx` beyond what the gates require.

## Decisions

1. **Path-scoped rules over hooks or root imports.** Path-scoped rules are payload-shippable files with per-surface granularity. Their inline `@path` imports load only after the matching rule loads. A PreToolUse hook (interlinked-cli's mechanism) fires more precisely but lives in `.claude/settings.json`, which the manifest excludes by design; an `@import` in root `CLAUDE.md` loads unconditionally and taxes prose-only sessions. *Alternative rejected:* a root `CONTRIBUTING.md` — GitHub-facing, but loads never; can later be a symlink to `code.md` if wanted.
2. **Three rules, thin imports, one owner each.** `wiki.md` and `notes.md` own nothing — they import `wiki-style.md`/`voice.md` and `notes/README.md`. `code.md` owns the write-less-code standard because no existing page does; it links the gates for every number. This keeps [payload-single-source](../../../openspec/specs/payload-single-source/spec.md) intact.
3. **Rule globs name the payload's own surfaces** (`app/**`, `scripts/**`, `.github/workflows/**`). A target whose app lives elsewhere widens its copy; local authorship then protects it from sync. Recorded in `code.md` as a one-line "adjust `paths:` to your layout" note.
4. **Gate chain order: cheap to expensive** — `oxlint` → `vitest run --coverage` → `knip` → `jscpd` → `stryker run` — so the common failure (lint, coverage) reports in seconds and mutation testing only runs on otherwise-green code. The chain lives in the `test` script itself (`&&`-joined, reusing the existing `lint` script), keeping the one-script contract.
5. **Coverage means real component tests, not exclusions.** 100% over `worker/**/*.ts` and `src/**/*.{ts,tsx}` requires rendering `App.tsx`, so the scaffold takes `jsdom` + `@testing-library/react` as devDeps and a `src/App.test.tsx`. This also gives every target a working example of component testing. Excluded from coverage: `src/main.tsx` (the DOM bootstrap — executes only in a real browser; `/verify` owns that evidence), type declarations, styles, assets. *Alternative rejected:* scoping coverage to the worker only — it passes the letter of "100%" by shrinking the denominator, which is the Goodharting the standard warns about.
6. **Vitest needs a jsdom environment for `src/` tests only** — use `environmentMatchGlobs` (or per-file `// @vitest-environment jsdom`) so worker tests stay on `node` and the config comment explaining why `vitest.config.ts` exists stays true.
7. **knip declares `worker/access.ts` an entry** with a comment naming it deliberately inert, rather than suppressing the dead-exports check globally. Vitest test files count as entries via knip's plugin, so test-only imports don't false-positive.
8. **jscpd runs on source only**, excluding `*.test.*` — duplicated test setup is normal and cheap; duplicated source is the defect. Threshold 0 duplicated blocks over the default minimum-token window.
9. **Stryker breaks at score 100** (`thresholds.break: 100`, vitest runner) over the same file set as coverage. On ~400 source lines a full run is well under a CI minute; no incremental mode. Stryker 10 runs in its supported `inPlace` mode because TypeScript 7 removed the API Stryker uses to rewrite `tsconfig` files in a sandbox; Stryker keeps and restores the originals.
10. **Cognitive complexity is conditional on oxlint.** First implementation step checks `oxlint --rules` for a cognitive-complexity rule; present → enable at 21, absent → drop it and note it here, because a second linter costs more than the rule is worth beside a cyclomatic cap. Oxlint 1.78.0 has no cognitive-complexity rule, so the implementation drops that gate. Cyclomatic (`complexity: 21`), `max-lines: 500`, and `typescript/no-explicit-any: error` are available and enforced.
11. **Manifest: rules join core.** `payload-files.json` gains the three `.claude/rules/*` paths in the core (ungated) category; `payload-manifest.md` gets a short "Path-scoped rules" entry saying why they're core (stack-agnostic pointers) while the gates ride the existing `app/` category. Version 12.2.0 — minor: new files and new scaffold behavior, nothing breaking.

## Risks / Trade-offs

- [Mutation testing is the slow line and will dominate `npm test` as a target's app grows] → the target owns its copy; `code.md` and the manifest entry say the chain is theirs to retune. The scaffold itself stays fast.
- [100%-absolute gates make the scaffold brittle to future scaffold edits — every payload change to `app/` must also clear them] → deliberate: that is the dogfooding. The gates run in this repo's own CI via the same `test.yml`.
- [oxlint rule names/options may differ from eslint's (`complexity`, `max-lines`)] → verified against `oxlint --rules` as the first gate task; config uses whatever names the installed version exposes.
- [knip/jscpd/Stryker version churn] → all pinned by `package-lock.json`, which the manifest copies verbatim.
- [Rules mechanism is Claude-Code-specific; other agents ignore `.claude/rules/`] → same trade the payload already makes for skills; content lives under tool-neutral `.agents/`.

## Open Questions

None — the cognitive-complexity availability check is resolved by a task, not a decision.

<!-- end design.md -->
<!-- file tasks.md utf8 4676 -->
# Tasks — less-code-rules-and-gates

## 1. Path-scoped rules (`.agents/rules/`, cited as `.claude/rules/`)

- [x] 1.1 Create `.agents/rules/code.md` — frontmatter `paths: ["app/**", "scripts/**", ".github/workflows/**"]`; body owns the write-less-code standard per specs/path-scoped-rules (least code that does the job; decompose-first; Edit over Write; verify after substantive edits; no `any`, `unknown` only narrowed; numeric limits are the CI gates' job — link to `app/package.json`'s test chain rather than restating numbers); one line telling targets to adjust `paths:` to their layout; run `/simplify` before `/save` on code changes.
- [x] 1.2 Create `.agents/rules/wiki.md` — frontmatter `paths: ["wiki/**"]`; thin import of `wiki/wiki-style.md` and `wiki/voice.md`, plus the don't-edit-wiki-mid-task rule by link to its owner (CLAUDE.md's Rules), restating nothing.
- [x] 1.3 Create `.agents/rules/notes.md` — frontmatter `paths: ["notes/**"]`; thin import of `notes/README.md`, restating nothing.
- [x] 1.4 Verify each rule loads: from a fresh session context check (`/context` per docs) or by confirming frontmatter parses (valid YAML, glob list) and paths resolve through the `.claude` symlink.
- [x] 1.5 Replace the wiki and notes links with inline `@path` imports, update the plan and release wording, and verify every import resolves relative to `.claude/rules/`.

## 2. Quality gates in `app/` (opt-in scaffold category)

- [x] 2.1 Check oxlint's available rules (`npx oxlint --rules` after install): confirm names/options for `complexity`, `max-lines`, `typescript/no-explicit-any`; check for a sonarjs cognitive-complexity rule. Update `app/.oxlintrc.json`: complexity max 21, max-lines 500, no-explicit-any error; cognitive max 21 only if present — if absent, record the drop in design.md Decisions (per decision 10) and proceed.
- [x] 2.2 Add devDependencies to `app/package.json`: `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `knip`, `jscpd`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner` (update `package-lock.json` — it ships verbatim to targets).
- [x] 2.3 Configure coverage in `app/vitest.config.ts`: v8 provider, thresholds 100 (lines/functions/branches/statements), include `worker/**/*.ts` + `src/**/*.{ts,tsx}`, exclude `src/main.tsx`, `*.test.*`, type decls, styles/assets; jsdom environment for `src/` tests only (design decision 6), worker tests stay `node` — keep the config's existing explanatory comment true.
- [x] 2.4 Write `src/App.test.tsx` (and extend worker tests if coverage reports gaps) until coverage is 100% with no exclusion beyond 2.3's list.
- [x] 2.5 Configure knip (`app/knip.json` or package.json field): vite + vitest plugins, `worker/index.ts` and `worker/access.ts` as entries with a comment naming `access.ts` deliberately inert; zero unused files/exports/dependencies.
- [x] 2.6 Configure jscpd on source only (exclude `*.test.*`), threshold 0 duplicated blocks.
- [x] 2.7 Configure Stryker (`app/stryker.conf.json`): vitest runner, mutate the same file set as coverage, `thresholds.break: 100`; extend tests until zero mutants survive.
- [x] 2.8 Chain the gates into the `test` script, cheap→expensive: `oxlint` (reuse `lint`) → `vitest run --coverage` → `knip` → `jscpd` → `stryker run`. No new workflow; `test.yml` untouched.
- [x] 2.9 Confirm the full chain passes in CI on the pushed branch — verified via /save.

## 3. Payload manifest + docs

- [x] 3.1 Add the three `.claude/rules/*.md` paths to `.claude/skills/wong-sync/references/payload-files.json` in the core category (follow the file's existing structure).
- [x] 3.2 Add a "Path-scoped rules" entry to `payload-manifest.md`: why the rules are core (stack-agnostic pointers) while the gates ride the existing `app/` category; note the chain is a target's to retune once it owns its copy.

## 4. Release

- [x] 4.1 Bump `VERSION` to 12.2.0.
- [x] 4.2 Add the newest-first `CHANGELOG.md` entry: the rules mechanism, the gate chain, what a target gains (context-loaded conventions, day-one-compliant scaffold) and loses (slower `npm test` on the scaffold; nothing else — copy-if-absent as always).
- [x] 4.3 Run `node scripts/check-payload-links.mjs` — zero dead links; rules→wiki links must resolve in every install shape, rules→`app/` links may be conditional.
- [x] 4.4 Restore the `wiki-root` main spec requirements from the archived `rename-docs-to-wiki` delta so the existing empty-spec drift no longer breaks whole-store validation.
- [x] 4.5 Extend `scripts/check-payload-links.mjs` to validate relative `@path` imports through every install shape, then run it with zero dead references.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 2061 -->
# app-scaffold Delta

## ADDED Requirements

### Requirement: The scaffold's test script is a quality-gate chain

The scaffold's `npm test` SHALL run, in one chain behind the single script `test.yml` already calls, deterministic quality gates alongside the unit suite — no new workflow, no local build prerequisite, and no gate that requires a model call:

- **Coverage**: the unit suite SHALL enforce 100% coverage over the scaffold's source via coverage thresholds, failing the run when any threshold is missed.
- **Lint limits**: cyclomatic complexity SHALL be capped below 22 per function, files SHALL be capped at 500 lines, and an explicit `any` SHALL be an error. `unknown` SHALL remain legal. A cognitive-complexity cap below 22 SHALL be enforced only if the scaffold's existing linter provides the rule; a second linter SHALL NOT be added for it.
- **Dead code**: unused files, exports, and dependencies SHALL fail the run.
- **Duplication**: duplicated code blocks SHALL fail the run.
- **Mutation**: the run SHALL fail while any mutant of the scaffold's source survives the unit suite.

The gates SHALL be absolute, not baselined: the scaffold as shipped SHALL pass every gate, so a repo that takes the scaffold starts compliant and CI holds it there.

#### Scenario: A violation fails CI through the existing contract

- **WHEN** a commit introduces an explicit `any`, an uncovered line, an unused export, or a surviving mutant in the scaffold's source
- **THEN** `npm test` exits non-zero
- **AND** the existing `test.yml` check goes red with no workflow change

#### Scenario: The shipped scaffold passes

- **WHEN** `npm test` runs on the scaffold exactly as the payload ships it
- **THEN** every gate passes
- **AND** no gate is skipped, baselined, or marked allowed-to-fail

#### Scenario: The contract stays one script

- **WHEN** CI runs in a repo that took the scaffold
- **THEN** `npm test` remains the entire interface between the repo and `test.yml`
- **AND** no additional workflow or CI configuration is required for the gates to run

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/path-scoped-rules/spec.md utf8 3337 -->
# path-scoped-rules Delta

## Purpose

The payload ships path-scoped rule files under `.claude/rules/` that load the owning convention into an agent's context exactly when it works with matching files — so conventions surface at the moment of the edit instead of relying on the agent to go find them.

## ADDED Requirements

### Requirement: The payload ships path-scoped rules in the core category

The payload SHALL include a `.claude/rules/` directory (real path `.agents/rules/` in this repo, reached through the `.claude` symlink) as a core, copy-if-absent category on the payload manifest. Each rule file SHALL carry YAML frontmatter with a `paths:` list of glob patterns, so an agent loads it only when reading files those patterns match. Three rules SHALL ship:

- `code.md`, scoped to the code surfaces (`app/**`, `scripts/**`, `.github/workflows/**`)
- `wiki.md`, scoped to `wiki/**`
- `notes.md`, scoped to `notes/**`

A target repo that already has any of these files SHALL keep its own copy untouched, per the sync's existing local-authorship rule.

#### Scenario: An agent edits code

- **WHEN** an agent reads or edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the `code.md` rule is in its context before the edit
- **AND** a session that touches no matching file never loads it

#### Scenario: An agent touches the wiki or notes

- **WHEN** an agent reads a file under `wiki/` or `notes/`
- **THEN** the matching rule imports the owning convention pages into context for that surface

#### Scenario: A target repo receives the rules

- **WHEN** `/wong-sync` runs in a repo that lacks `.claude/rules/code.md`
- **THEN** the file is proposed as a missing payload file
- **AND** a locally authored rule of the same name is never overwritten

### Requirement: A rule is a thin importer, except for the fact it owns

A rule file SHALL NOT restate a convention another payload file owns — it SHALL name the owning doc and import it with Claude Code's `@path` syntax, keeping each rule short and loading the full convention only when its path scope matches. Where a rule states a fact no other file owns, the rule file itself SHALL be that fact's single owner. Specifically:

- `code.md` SHALL own the write-less-code standard — the least code that does the job and none that doesn't; decompose branchy code into named helpers as it is written; prefer surgical edits over file rewrites; verify with the project's own checks after substantive edits; no `any`, and `unknown` only where it is narrowed before use — and SHALL state that the numeric limits are enforced by the repo's CI gates, not by the agent's memory.
- `wiki.md` SHALL import the wiki style and voice pages and restate nothing from them.
- `notes.md` SHALL import the notes convention and restate nothing from it.

#### Scenario: A rule names an owned convention

- **WHEN** a rule needs the reader to follow a convention another file owns
- **THEN** it imports the owning file rather than restating its scope or exceptions

#### Scenario: The code rule states the standard

- **WHEN** an agent loads `code.md`
- **THEN** the write-less-code standard is stated there in full, because no other file owns it
- **AND** every numeric limit is attributed to the CI gate that enforces it, not restated as a number the agent must track

<!-- end specs/path-scoped-rules/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-01

~~~
<!-- end .openspec.yaml -->
