# Tasks — less-code-rules-and-gates

## 1. Path-scoped rules (`.agents/rules/`, cited as `.claude/rules/`)

- [x] 1.1 Create `.agents/rules/code.md` — frontmatter `paths: ["app/**", "scripts/**", ".github/workflows/**"]`; body owns the write-less-code standard per specs/path-scoped-rules (least code that does the job; decompose-first; Edit over Write; verify after substantive edits; no `any`, `unknown` only narrowed; numeric limits are the CI gates' job — link to `app/package.json`'s test chain rather than restating numbers); one line telling targets to adjust `paths:` to their layout; run `/simplify` before `/save` on code changes.
- [x] 1.2 Create `.agents/rules/wiki.md` — frontmatter `paths: ["wiki/**"]`; thin pointer to `wiki/wiki-style.md` and `wiki/voice.md`, plus the don't-edit-wiki-mid-task rule by link to its owner (CLAUDE.md's Rules), restating nothing.
- [x] 1.3 Create `.agents/rules/notes.md` — frontmatter `paths: ["notes/**"]`; thin pointer to `notes/README.md`, restating nothing.
- [x] 1.4 Verify each rule loads: from a fresh session context check (`/context` per docs) or by confirming frontmatter parses (valid YAML, glob list) and paths resolve through the `.claude` symlink.

## 2. Quality gates in `app/` (opt-in scaffold category)

- [x] 2.1 Check oxlint's available rules (`npx oxlint --rules` after install): confirm names/options for `complexity`, `max-lines`, `typescript/no-explicit-any`; check for a sonarjs cognitive-complexity rule. Update `app/.oxlintrc.json`: complexity max 21, max-lines 500, no-explicit-any error; cognitive max 21 only if present — if absent, record the drop in design.md Decisions (per decision 10) and proceed.
- [x] 2.2 Add devDependencies to `app/package.json`: `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `knip`, `jscpd`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner` (update `package-lock.json` — it ships verbatim to targets).
- [x] 2.3 Configure coverage in `app/vitest.config.ts`: v8 provider, thresholds 100 (lines/functions/branches/statements), include `worker/**/*.ts` + `src/**/*.{ts,tsx}`, exclude `src/main.tsx`, `*.test.*`, type decls, styles/assets; jsdom environment for `src/` tests only (design decision 6), worker tests stay `node` — keep the config's existing explanatory comment true.
- [x] 2.4 Write `src/App.test.tsx` (and extend worker tests if coverage reports gaps) until coverage is 100% with no exclusion beyond 2.3's list.
- [x] 2.5 Configure knip (`app/knip.json` or package.json field): vite + vitest plugins, `worker/index.ts` and `worker/access.ts` as entries with a comment naming `access.ts` deliberately inert; zero unused files/exports/dependencies.
- [x] 2.6 Configure jscpd on source only (exclude `*.test.*`), threshold 0 duplicated blocks.
- [x] 2.7 Configure Stryker (`app/stryker.conf.json`): vitest runner, mutate the same file set as coverage, `thresholds.break: 100`; extend tests until zero mutants survive.
- [x] 2.8 Chain the gates into the `test` script, cheap→expensive: `oxlint` (reuse `lint`) → `vitest run --coverage` → `knip` → `jscpd` → `stryker run`. No new workflow; `test.yml` untouched.
- [ ] 2.9 Confirm the full chain passes in CI on the pushed branch — verified via /save.

## 3. Payload manifest + docs

- [x] 3.1 Add the three `.claude/rules/*.md` paths to `.claude/skills/wong-sync/references/payload-files.json` in the core category (follow the file's existing structure).
- [x] 3.2 Add a "Path-scoped rules" entry to `payload-manifest.md`: why the rules are core (stack-agnostic pointers) while the gates ride the existing `app/` category; note the chain is a target's to retune once it owns its copy.

## 4. Release

- [x] 4.1 Bump `VERSION` to 12.2.0.
- [x] 4.2 Add the newest-first `CHANGELOG.md` entry: the rules mechanism, the gate chain, what a target gains (context-loaded conventions, day-one-compliant scaffold) and loses (slower `npm test` on the scaffold; nothing else — copy-if-absent as always).
- [x] 4.3 Run `node scripts/check-payload-links.mjs` — zero dead links; rules→wiki links must resolve in every install shape, rules→`app/` links may be conditional.
- [x] 4.4 Restore the `wiki-root` main spec requirements from the archived `rename-docs-to-wiki` delta so the existing empty-spec drift no longer breaks whole-store validation.
