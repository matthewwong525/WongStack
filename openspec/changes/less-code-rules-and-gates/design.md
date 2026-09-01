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

1. **Rules over hooks or `@import`.** Path-scoped rules are payload-shippable files with per-surface granularity. A PreToolUse hook (interlinked-cli's mechanism) fires more precisely but lives in `.claude/settings.json`, which the manifest excludes by design; an `@import` in CLAUDE.md loads unconditionally and taxes prose-only sessions. *Alternative rejected:* a root `CONTRIBUTING.md` — GitHub-facing, but loads never; can later be a symlink to `code.md` if wanted.
2. **Three rules, thin pointers, one owner each.** `wiki.md` and `notes.md` own nothing — they point at `wiki-style.md`/`voice.md` and `notes/README.md`. `code.md` owns the write-less-code standard because no existing page does; it points at the gates for every number. This keeps [payload-single-source](../../../openspec/specs/payload-single-source/spec.md) intact.
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
