# Design

## Context

See proposal.md, Why. Every item was found and located by the 2026-09-27 audit; this design fixes the wording and the mechanics where a choice exists. The skill-text fixes to `asking-the-user.md`, the change loop page, and `/explore` belong to the publishing-flow part, which edits the same files after this one.

## Goals / Non-Goals

**Goals:** each stale sentence says what WongStack does today; each spec promise has one owner; lint, coverage, and the loosened-check guard reach every file they should; the OpenSpec pins cannot drift apart.

**Non-Goals:** rewriting the pages beyond the stale sentences; new tests beyond the ones the specs need; any change to what setup, sync, or save do.

## Decisions

### Page wording

- `wiki/stack/core-stack.md`: line 3 drops "and styled with Tailwind"; the `Tailwind 4` table row goes. Line 25: `/apply` uploads a preview from the agent's machine as soon as a build finishes and hands back its link; `/save` and CI give each pushed branch its own. Line 27: drop "No `npm install`"; say nothing runs on *your* machine because the agent installs and builds what it needs, with no `wrangler dev` and no localhost.
- `wiki/stack/getting-started.md`: line 16 describes the starter page as it is (`app/src/App.tsx`): a *Your apps* list and the *Learn the development loop* box. Line 18 becomes one sentence: setup starts from an empty folder, so the starter site always comes with it. Line 67: the page loads and lists your apps, the proof your address and your code are live. Keep the Copy-box paragraph at line 69.
- `wiki/contributing.md:20`: `/wong-sync` fast-forwards the cache on every run and moves to a fresh checkout when it finds local work there ([latest source](../.agents/skills/wong-sync/references/latest-source.md)), so work left there is never used. Fork and clone instead.
- `.claude/rules/openspec.md:7`: "Repeatable knowledge goes in `wiki/` when you learn it, by [the repeatable-knowledge rule](../../wiki/wiki-style.md#repeatable-knowledge)."
- *Review page* vs pull request: `wiki/README.md` glossary line 38 says every save gets a pull request you publish when ready; the *Pull request* entry (line 30) adds that the agent calls it *the change on GitHub*. `asking-the-user.md:28` and `continue/SKILL.md:73` use *the change on GitHub*. Chosen over *the pull request*, because the plain-words rule keeps git terms out of chat. `grep -rn "review page on GitHub"` must then find nothing live.
- `wiki/stack/d1-pipeline.md` script table gains two rows: `scripts/cf-preview.sh` (run by `/apply` for a preview from the agent host: installs, migrates staging, builds, uploads a staging version, prints the URL; never deploys production) and `scripts/mini-dashboard.mjs` (run by `cf-build.sh` after every build: copies each mini app into the build and writes `apps/apps.json` for the landing page).
- `verify/references/walkthrough.md:76`: replace the made-up alias with the real command, run from `app/`: `npx wrangler d1 execute <staging-db> --remote --env staging --command "…"`, where `<staging-db>` is `env.staging`'s database name in `wrangler.jsonc`.
- `.claude/rules/secrets.md:17`: the secrets page owns worktree resolution and branch copies; [`/save`'s named secrets](../skills/save/references/named-secrets.md) owns what a save keeps out of commits.
- `wiki/development/required-tools.md:96`: "`/wong-sync` reads `.claude/.wong-stack.json` this way before anything else" (no Step 0).
- `wiki/ux-principles.md`: headings become `## Start from the use case` and `## Principles`; line 75's anchor becomes `#start-from-the-use-case`; line 30's "The Part 1 brief" becomes "The use-case brief".

### Specs

Each duplicate pair keeps the fuller copy and REMOVEs the other (see specs/). `install-onboarding` gains *never install a package manager*, the only promise the removed `dependencies` copy held alone; the home-folder and password detail is how-to and stays in the skill. `multi-part-workspaces` keeps every scenario; only the requirement text shrinks (515 → 394 and 530 → 416 characters).

### `docsPath`

Remove `docsPathOf`, the `docsPath` argument of `targetPathFor`, and its call in `.agents/skills/wong-sync/scripts/preflight.mjs`; delete the two `docsPath` tests in `scripts/tests/wong-sync-preflight.test.mjs`; drop payload-manifest.md's paragraph at line 26 and "a relocated docs path" at line 69; drop "and a relocated docs path" from the brief in `wong-sync/SKILL.md:32`. Add `docsPath` to `scripts/retired-names.json` (replacement: WongStack's pages stay under `wiki/`). The `path-collision` check stays only if another mapping can still collide; if skill renames alone cannot, remove it too and say so in the changelog.

### Checks

- `loosened-checks.mjs` `isSettings`: `/^\.github\/workflows\/[^/]+\.ya?ml$/` replaces the `test.yml` literal. A test in `scripts/tests/loosened-checks.test.mjs` proves an unexplained `payload.yml` edit fails and a `deploy.yml` edit fails.
- Lint, in `payload.yml`: `oxlint --deny-warnings scripts .agents/skills/*/scripts .agents/skills/memory/worker .github/scripts mini-apps/router.mjs mini-apps/routes.mjs`.
- Coverage, in `scripts/tests/.c8rc.json`: `src` adds `.github/scripts` and `mini-apps`; `include` adds `.agents/skills/*/worker/*.mjs`, `.github/scripts/*.mjs`, `mini-apps/*.mjs`. The floor stays at 85 lines / 81 branches; if the first CI run is under it, add tests for the uncovered paths.
- Flaky `envKey` (`memory-worker.test.mjs:71`): return `match?.[1]`, and the renewal wait at line 709 becomes `until(() => { const next = envKey(env); return next && next !== key; })`, so a half-written `.env` means "not yet", never a pass or a TypeError.
- OpenSpec pins: `server-setup.test.mjs` reads all four files (`.github/workflows/payload.yml`, `server/setup.sh`, `.agents/skills/save/references/preconditions.md`, `.github/CONTRIBUTING.md`), fails when any holds no pin, and fails naming the file whose pin differs from `payload.yml`'s.
- `/update-dependencies`: the survey adds `npm outdated` in `scripts/tests/` (exact pins, so it bumps the pin and `package-lock.json`); the OpenSpec step names the four pin files and the test that checks them.

## Risks / Trade-offs

- [Wider settings watch makes `/wong-sync` updates to `deploy.yml` need a `Check:` line in installed repos] → the guard's failure message already says what to add; the changelog's Updating note says so too.
- [Wider coverage may fall below the floor] → add tests, never lower the floor (Decision log).
- [This part and the publishing-flow part both edit `asking-the-user.md`] → this part changes one phrase at line 28; the second to land rebases.
- [A repo relied on `docsPath` after all] → its pages sync to `wiki/`; the changelog tells it to move them back first.

## Migration Plan

Ships as a minor release. Installed repos get the page, skill, and guard edits through `/wong-sync`. Rollback is a revert of the merge.
