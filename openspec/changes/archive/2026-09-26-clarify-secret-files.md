<!-- openspec-archive v1 2026-09-26-clarify-secret-files -->
<!-- file proposal.md utf8 9881 -->
# Make it clear which secrets file to use

**Status:** ready-to-ship
**Branch:** clarify-env-dev-vars
**Open questions:** none

## Why

The repo has both `.env` and `.dev.vars`, and nothing tells you at a glance which to use. The committed `.dev.vars.example` sits at the repo root, but `scripts/cf-secrets.mjs` reads `.dev.vars` and `.dev.vars.example` next to the wrangler config in `app/`. So the example is in the wrong place, and `secrets:check` never finds it. Worktrees make it worse: Paseo copies `.env` into each new worktree once, nothing copies `.dev.vars`, and an edit made in a worktree never reaches the primary checkout. A branch that deletes or changes a secret must also not change `main`'s values before it merges.

## What Changes

- One file per role, one place for each. The root `.env` holds only the credentials that you and the scripts use to reach Cloudflare. `app/.dev.vars` holds only the secrets the Worker reads at runtime. `.dev.vars.example` moves from the repo root to `app/.dev.vars.example`, next to `app/wrangler.jsonc`, where the script already looks. The pack lists the example under `app/`, and setup installs it there. (review.html#/files)
- Each linked worktree gets its own branch copy of every live secrets file, and a branch's edits reach the primary by kind. A new helper, `.claude/skills/ship/scripts/worktree-secrets.mjs`, has three commands. `seed` copies each primary live file into a new worktree and records a baseline of key names and value hashes in the worktree's private Git folder. `status` lists, by key name only, what the branch added, removed, or changed. `promote` applies the branch's removals and changes to the primary and skips any key that the primary also changed. `paseo.json` runs `seed` for every new worktree, so `app/.dev.vars` is copied as well as `.env`. (review.html#/secret-edits)
- The secrets rule (`.agents/rules/secrets.md`) opens with one line per file that says what it holds, and links to the full table. It then says how to edit: write an add or a rotation to both the worktree copy and the primary now. A deletion or a branch-only value stays in the worktree copy. It is a rule, not a hook: it loads when an agent touches `.env*` or `.dev.vars*`.
- `/ship` runs `worktree-secrets.mjs promote` after the merge, beside its post-merge sync. It reports the promoted and skipped key names, never values. As with the sync, a failure skips with one line and cannot fail a merged ship. `/save`'s named-secret step writes an add or a rotation to the seeded worktree copy as well as the primary, and stops reporting that copy as a duplicate to reconcile.
- `secrets:push` in a linked worktree reads `app/.dev.vars` (and `app/.dev.vars.staging`) from the primary worktree when the linked checkout has none. A local copy still wins. The `.env` refusal and the credential-key check stay the same.
- The docs say the same thing everywhere: `wiki/stack/d1-pipeline.md` owns the "which file" table and names `app/.dev.vars`. `wiki/development/secrets.md` owns the branch-copy lifecycle. `wiki/stack/cloudflare-credentials.md`, the header comments of both example files, and the script's messages link to those pages or use that path.
- Release as WongStack 19.1.0.

**Non-goals:** No migration for repos that have a root `.dev.vars`; every install starts from an empty folder. No hook. No merge of the two files into one `.env`. `CLOUDFLARE_API_TOKEN` must never reach a Worker, so the split stays. No change to `secrets:check` parity logic, to CI, or to what `secrets:push` sends to the deployed Workers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cf-secret-parity`: `.dev.vars` and its example live next to the wrangler config (`app/`), and a push from a linked worktree reads the primary worktree's copy when it has none.
- `secrets-convention`: Every live secrets file persists in the primary worktree. A linked worktree has a seeded branch copy. Adds and rotations reach the primary at once; deletions and branch-only changes reach it through `/ship` after the merge.
- `path-scoped-rules`: `secrets.md` is scoped to `.dev.vars*` as well, states which file holds what, and states how each kind of edit reaches the primary.

## Impact

Moves `.dev.vars.example` to `app/.dev.vars.example`. Adds `.agents/skills/ship/scripts/worktree-secrets.mjs` and `scripts/tests/worktree-secrets.test.mjs`. Edits `paseo.json`, `.agents/rules/secrets.md`, `.agents/skills/ship/SKILL.md`, `.agents/skills/save/references/named-secrets.md`, `scripts/cf-secrets.mjs`, `scripts/tests/cf-secrets.test.mjs`, `.env.example` (header comment only), `.agents/skills/wong-sync/references/payload-files.json`, `wiki/stack/d1-pipeline.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/development/secrets.md`, `VERSION`, and `CHANGELOG.md`. No variable is renamed. Installed repos that kept a root `.dev.vars` must move it by hand. The changelog says so, but no tool does it. A target repo gets the helper with the `ship` skill. `paseo.json` is this repo's own file, so a target wires `seed` into its own worktree setup; the secrets page says how.

## Decision log

- **2026-09-25** — Asked where Worker runtime secrets live → chose `app/.dev.vars`, next to `app/wrangler.jsonc`, with the example moved there too. The alternative, `app/.env`, would leave two `.env` files with very different risk, told apart only by folder.
- **2026-09-25** — Asked what happens to a repo with a root `.dev.vars` → the user said to assume every install starts from an empty folder, because WongStack is a template now. No migration code; the repo already reads that way (`wong-setup` stops on a non-empty folder since 18.0.0).
- **2026-09-25** — The user asked that every edit to a `.env` or `.dev.vars` file also populate the root, first as a possible hook, then explicitly "not hook but like a rule". Chose to extend the existing path-scoped rule `.agents/rules/secrets.md`. "Root" is read as the primary worktree, the durable home the secrets convention already names.
- **2026-09-25** — Assumed: `secrets:push` falls back to the primary worktree's `app/.dev.vars` when the linked checkout has none. A local copy still wins, so a normal checkout behaves the same.
- **2026-09-25** — Assumed: `wiki/stack/d1-pipeline.md` keeps ownership of the "which file" table, because it already has one; the rule and the other pages link to it rather than repeat it.
- **2026-09-26** — Found: `paseo.json` already copies `.env` into each new worktree, once, so a worktree edit never reached the primary. The user raised that a branch sometimes must not change the primary until it merges, for example a deleted secret. Asked how a branch's edits reach the primary → chose to split by kind of edit: adds and rotations go to both copies now, and deletions and branch-only changes wait for `/ship` after the merge. The user invoked `/ship` for the whole chain.
- **2026-09-26** — Assumed: `promote` compares three ways against a baseline of value hashes that `seed` records. A plain two-file compare would read a key that another branch added to the primary as a deletion by this branch, and would revert a rotation made in the primary. Hashes, not values, are kept, in the worktree's private Git folder, which Git never commits and which is removed with the worktree.
- **2026-09-26** — Assumed: `/ship` promotes without a second prompt. The merge is the approval for a deferred edit, and the PR diff of the examples already showed the reviewer which keys went away. A key that both sides changed is skipped and named, never guessed.
- **2026-09-26** — Assumed: a worktree with no baseline (created before this change, or by a tool that does not run `seed`) gets report-only behavior. `promote` applies only adds there and names every other difference for a person to resolve.
- **2026-09-26** — Assumed: the helper lives in the `ship` skill, because `/ship` is its main caller, and skill folders ship whole. That needs no new manifest entry.
- **2026-09-26** — Assumed: a minor bump (18.2.0). The only moved file is a values-blank example, no variable name changes, and the new behavior is additive.
- **2026-09-26** — Found in `/simplify` review: "seeded" must be decided per file, not per worktree. Otherwise a file that `seed` left unseeded gets three-way treatment against an empty baseline. Assumed: `status` lists the seeded files, `/save` writes only to those, and every other file is report-only.
- **2026-09-26** — Assumed: `secrets:push` keeps local-wins, so a branch copy pushes its own values. Pushing is a deliberate operator action. `wiki/stack/d1-pipeline.md` says to push from the primary checkout when production must match `main`. Refusing while edits are pending would couple the pack script to a skill script.
- **2026-09-26** — Save: `main` moved to 19.0.2 while this branch was open, so the branch merged `origin/main` and the release is renumbered 18.2.0 → 19.1.0. Main's 19.0.0 removed `/ship`'s Hard rules and the legacy staging-adoption section of `wiki/stack/d1-pipeline.md`; the merge keeps those removals. Main's link checker now fails links through the `.claude` symlink, so the new links name `.agents/` paths, and the README's link to the example now names `app/.dev.vars.example`. Main's 19.0.2 changelog entry already has a garbled line on `main`; this change leaves it alone.
- **2026-09-26** — Ship: CI passed on PR #117 (174 tests). Distilled the session fact "prefer a path-scoped rule to a hook for an edit-time convention" into `wiki/agent-knowledge-center.md` under "What each surface owns".
- **2026-09-26** — Archive checkpoint: every task is checked, and the change is archived at `openspec/changes/archive/2026-09-26-clarify-secret-files/`. The main specs were already reconciled at the earlier save, so the archive skipped a second spec sync.

<!-- end proposal.md -->
<!-- file design.md utf8 7068 -->
## Context

`scripts/cf-secrets.mjs` finds the wrangler config (root first, then each immediate subfolder) and reads `.dev.vars`, `.dev.vars.staging`, and `.dev.vars.example` from that config's folder, which is `app/` in the shipped layout. The payload lists `.dev.vars.example` at the repo root under the `pack` category, so the file and the script disagree. The script resolves `repoRoot` from its own location, so a push in a linked worktree only looks in that worktree.

`paseo.json`'s worktree setup copies the source checkout's `.env` into each new worktree once, and nothing copies it back. The memory store already resolves the primary worktree from `git rev-parse --git-common-dir` (`.agents/skills/memory/scripts/lib/store.mjs`). `/save`'s [named-secret step](../../../.agents/skills/save/references/named-secrets.md) writes supplied values to the primary and reports any other regular live file in the worktree as a duplicate.

## Goals / Non-Goals

**Goals:**
- Each live secrets file has one role and one location, and every surface names the same location.
- A branch works on its own copy of each live file. `main` sees an add or rotation at once and a deletion only after the merge.
- `secrets:push` works from a linked worktree whether or not it was seeded.

**Non-Goals:**
- No hook. The helper runs from worktree setup, `/ship`, and by hand.
- No change to `secrets:check`, which compares Worker to Worker and reads no local values.
- No undo of a promote. The primary file is ignored and has no history; a promote edits only named lines.

## Decisions

- **Move the example; keep the script's lookup.** The script already reads the config folder, so moving `.dev.vars.example` into `app/` fixes the disagreement with no change to the lookup. The alternative, making the script also read the root, keeps two valid places.
- **The payload lists the example as `app/.dev.vars.example` under `pack`.** The pack owns the secrets model. If the link check reports a double listing with the `app` scaffold folder, drop it from `pack` and let the scaffold carry it.
- **One helper, three commands, in the `ship` skill folder.** `worktree-secrets.mjs seed|status|promote`. It uses Node built-ins and `git` only. It finds live files the way the pack finds the wrangler config: repo root, then each immediate subfolder, skipping `node_modules` and dot folders. It matches `.env`, `.env.*`, `.dev.vars`, and `.dev.vars.*`, and never a `*.example` file. The skill folder ships whole, so targets get it with no manifest change.
- **Three-way compare against a hash baseline.** `seed` writes `<git-dir>/wongstack-secrets-base.json`: for each repo-relative file, a map of key → SHA-256 of the value. `<git-dir>` is the worktree's own `git rev-parse --git-dir`, which Git never tracks and which `git worktree remove` deletes. For each key, compare worktree (W), primary (P), and base (B):
  - W = P → nothing.
  - In B, gone from W, P = B → the branch deleted it → remove from P.
  - In B, W ≠ B, P = B → the branch changed it → set P to W.
  - Not in B, in W, not in P → a branch add that missed the primary → add to P.
  - Not in B, in P, not in W → added elsewhere → keep.
  - W ≠ B and P ≠ B and W ≠ P → conflict → skip and name.
  - No baseline → apply only "in W, not in P" adds, and list the rest as unresolved.
  A two-file compare was rejected: it would delete keys that other branches added to the primary and revert rotations made there.
- **Line edits, not rewrites.** Parse `KEY=VALUE` lines, ignoring comments and blanks. A removal deletes that one line. A change replaces that one line with the worktree's line. An add appends the worktree's line. Comments, order, and other keys are kept. Before any write, `git -C <primary> check-ignore -q <path>` must pass, or that file is skipped with a reason.
- **`promote` refreshes the baseline.** After a successful promote, the baseline for the promoted files is rewritten from the new primary, so a second run is a no-op.
- **`/ship` runs `promote` in Step 6, after the fast-forward sync, with the same skip-with-one-line rule.** Output is JSON of paths and key names (`promoted`, `skipped`, `unresolved`). `/ship` puts it in the report. No prompt: the merge is the approval for a deferred edit.
- **`seed` is idempotent and never overwrites.** An existing worktree file is kept. A baseline is written only for files that `seed` copied, or for files with no baseline yet whose content equals the primary. A file that differs and has no baseline stays unseeded, and gets report-only behavior.
- **`paseo.json` calls `seed` rather than `cp`.** The command runs from the new worktree, so `seed` resolves the primary from Git. A target repo wires `seed` into its own worktree tool. The secrets page shows the one command.
- **Primary-worktree fallback in `cf-secrets.mjs` resolves by relative path.** Compute the config folder relative to the active repo root (`app`), resolve the primary root as the parent of `git rev-parse --path-format=absolute --git-common-dir`, and look for `<primary>/app/.dev.vars`. Use it only when the local file is missing and no explicit file argument was given. If `git` fails, keep today's "no `.dev.vars`" error. Import nothing new from `lib-wrangler-config.mjs`, which older installs do not update.
- **The rule, not a hook, carries the edit-time instruction.** Path-scoped rules already load when an agent touches `.env*` or `**/.dev.vars*`.
- **`wiki/stack/d1-pipeline.md` owns the "which file" table; `wiki/development/secrets.md` owns the branch-copy lifecycle.** The rule, the other pages, and both example headers link to them. `secrets.md` stays stack-neutral: it names `.env` as the default and the stack's runtime file only through a link.

## Risks / Trade-offs

- [An installed repo kept a root `.dev.vars`] → The push stops with "no `.dev.vars` next to the wrangler config (`app`)". The changelog tells installed repos to move it. `seed` still copies the root file, because it matches the name.
- [Value hashes of weak values can be guessed] → Only the hash is stored, and only in the local `.git` folder that already sits beside the live files in plain text. It adds no new exposure.
- [An agent writes a deletion straight to the primary] → The rule says not to. If it happens, `promote` sees W = P and does nothing, so the only harm is the one the rule exists to prevent.
- [The merge happens outside `/ship`, for example in the GitHub UI] → Nothing promotes. `status` shows the pending keys, and the secrets page says to run `promote` by hand after such a merge.
- [Tests need `git` and a real linked worktree] → Build a temp repo with `git init` and `git worktree add`. `cf-secrets` push tests use a fake `npx` on `PATH`, as `cf-deploy.test.mjs` does.

## Migration Plan

None. Every install starts from an empty folder (Decision log). This worktree was created by the old `cp` setup, so it has no baseline. Its `promote` at ship time is report-only, which is the designed fallback. Rollback is reverting the commit.

<!-- end design.md -->
<!-- file tasks.md utf8 5443 -->
## 1. Files and payload

- [x] 1.1 Move `.dev.vars.example` to `app/.dev.vars.example` with `git mv`, per review.html#/files. Update its header: the file lives beside `app/wrangler.jsonc`, the copy command is `cp app/.dev.vars.example app/.dev.vars`, and the `.env` / `.dev.vars` comparison links `wiki/stack/d1-pipeline.md` rather than restating the whole table.
- [x] 1.2 In `.agents/skills/wong-sync/references/payload-files.json`, change the `pack` entry to `app/.dev.vars.example`. Update the payload manifest if it names the path. Confirm that the ignore rules still ignore `app/.dev.vars*` and keep the example (`git check-ignore -v app/.dev.vars`, and `git check-ignore` gives no match for `app/.dev.vars.example`).
- [x] 1.3 Change only the header comment of `.env.example`: this file holds what you and the scripts use to reach Cloudflare, and the Worker's runtime secrets go in `app/.dev.vars` (link the d1-pipeline table). Rename no variable.

## 2. Worktree-secrets helper

- [x] 2.1 Create `.agents/skills/ship/scripts/worktree-secrets.mjs` with `seed`, `status`, and `promote`, per design.md and review.html#/secret-edits. Use Node built-ins and `git` only. Output JSON with paths and key names, never values. In the primary checkout, every command reports "primary checkout; nothing to do" and exits 0.
- [x] 2.2 Add `scripts/tests/worktree-secrets.test.mjs` with a temp repo, `git init`, a commit, and `git worktree add`. Cover:
  - `seed` copies `.env` and `app/.dev.vars`, writes the baseline under the worktree's Git dir, and leaves `git status` clean.
  - `seed` never overwrites an existing file.
  - `promote` removes a key the branch deleted.
  - `promote` sets a value the branch changed.
  - `promote` keeps a key that the primary gained after the seed.
  - `promote` skips and names a key that both sides changed.
  - With no baseline, `promote` applies adds only.
  - `promote` keeps comments and the order of other lines.
  - `promote` skips a file that is not ignored in the primary.
  - A second `promote` is a no-op.
  - No value appears in any output.
- [x] 2.3 Change `paseo.json` so the worktree setup runs `node .claude/skills/ship/scripts/worktree-secrets.mjs seed` in place of the `cp` of `.env`.

## 3. Skills and script

- [x] 3.1 In `.agents/skills/ship/SKILL.md` Step 6, after the fast-forward sync, run `worktree-secrets.mjs promote`. Use the same skip-with-one-line rule, so it can never fail a merged ship. Add a "Secrets" line to the Step 7 report with the promoted, skipped, and unresolved key names. Add the promote to the hard rule on post-merge work.
- [x] 3.2 In `.agents/skills/save/references/named-secrets.md`, write an add or a rotation to the seeded worktree copy as well as the primary. Report only an unseeded worktree file (no baseline) as a duplicate to reconcile.
- [x] 3.3 In `scripts/cf-secrets.mjs` `push`, when there is no explicit file and no `.dev.vars` in the config folder, resolve the primary worktree from `git rev-parse --path-format=absolute --git-common-dir`. Then read `.dev.vars` and `.dev.vars.staging` at the same repo-relative config folder there. Print the path it read, never a value. Keep the `.env` refusal and credential-key check on the resolved file. Name `app/.dev.vars` and the example in the no-file error. Import nothing new from `lib-wrangler-config.mjs`.
- [x] 3.4 Add push tests to `scripts/tests/cf-secrets.test.mjs`. Use a temp repo with a linked worktree, plus a fake `npx` on `PATH` that logs the `secret bulk` file. Cover:
  - fallback to the primary's `app/.dev.vars`;
  - a local file wins;
  - the staging fallback reads the primary's `.dev.vars.staging`;
  - no file anywhere exits non-zero before any `npx` call;
  - a primary `.dev.vars` holding `CLOUDFLARE_API_TOKEN` is still refused.

## 4. Rule and docs

- [x] 4.1 Rewrite `.agents/rules/secrets.md` as the path-scoped-rules spec says. Keep `paths:` with `**/.dev.vars*`. Give one line each for the root `.env` and `app/.dev.vars`, with a link to the d1-pipeline table. Then give the edit routing: adds and rotations go to both copies now; deletions and branch-only values stay in the worktree until `/ship` promotes them. Link `wiki/development/secrets.md`.
- [x] 4.2 In `wiki/stack/d1-pipeline.md`, name `app/.dev.vars`, `app/.dev.vars.staging`, and `app/.dev.vars.example` in the secret model, the "not interchangeable" table, and the script table.
- [x] 4.3 In `wiki/development/secrets.md`, add the branch-copy lifecycle: seed, the edit kinds, promote at ship, the manual `promote` after a merge outside `/ship`, and the one `seed` command a target wires into its worktree tool. Reconcile the existing linked-worktree and symlink sections with it. Keep the page stack-neutral. In `wiki/stack/cloudflare-credentials.md`, change `.dev.vars` to `app/.dev.vars`.

## 5. Release

- [x] 5.1 Bump `VERSION` to 19.1.0 and add a newest-first `CHANGELOG.md` entry. It covers the example move and says that an installed repo with a root `.dev.vars` moves it to `app/.dev.vars` by hand. It also covers the worktree-secrets helper, the `/ship` promote, and the rule.
- [x] 5.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`. Fix any dead link. Run `grep -rn "dev.vars" --exclude-dir=archive` to confirm that no live surface still names a root `.dev.vars`.
- [x] 5.3 Run `/save` so CI runs the suite with the new tests. The task is done when CI passes.

<!-- end tasks.md -->
<!-- file specs/cf-secret-parity/spec.md utf8 4729 -->
## MODIFIED Requirements

### Requirement: `.dev.vars` is the declared source of truth for Worker runtime secrets

The pack SHALL treat `.dev.vars` as the single declared list of secrets the Worker reads at runtime, and both deployed Workers SHALL be loadable from it. The file SHALL live in the folder that holds the wrangler config — `app/.dev.vars` in the shipped layout — and never at the repo root beside `.env`, so each live secrets file has one role and one location. A `secrets:push` operation SHALL load `.dev.vars` into the production Worker and `.dev.vars.staging` into the staging Worker via `wrangler secret bulk`, which accepts dotenv `KEY=VALUE` input directly, so no format conversion is performed. When `.dev.vars.staging` is absent the staging push SHALL fall back to `.dev.vars`, making identical values across both Workers the zero-configuration default and a divergent value an opt-in achieved by creating the second file.

When `secrets:push` runs in a linked Git worktree whose config folder has no `.dev.vars`, it SHALL read `.dev.vars` (and `.dev.vars.staging`) from the primary worktree at the same path relative to the repo root, resolving the primary worktree from Git metadata. A `.dev.vars` present in the active checkout SHALL take precedence. The `.env` refusal and the account-credential key check SHALL apply to the resolved file unchanged.

Per-environment divergence SHALL be documented as the correct choice for any secret with third-party **write** side effects — payment keys, outbound email or SMS credentials, webhook targets — because sharing such a value re-creates at the API layer the production-contamination hole that twinning stateful bindings closes.

#### Scenario: One command loads both Workers

- **WHEN** a maintainer adds a secret to `app/.dev.vars` and runs `secrets:push`
- **THEN** the secret is loaded into the production Worker and into the staging Worker
- **AND** neither Worker requires a separate hand-run `wrangler secret put`

#### Scenario: Staging diverges by adding a file, not by editing a script

- **WHEN** a repo needs staging to hold a different value for a secret
- **THEN** creating `app/.dev.vars.staging` is sufficient and the staging push reads it instead of `app/.dev.vars`
- **AND** a repo with no such file gets identical values in both Workers

#### Scenario: A push from a linked worktree reads the durable file

- **WHEN** `secrets:push` runs in a linked worktree that has no `app/.dev.vars`, and the primary worktree has one
- **THEN** the push loads both Workers from the primary worktree's `app/.dev.vars`
- **AND** it names the file it read without printing any value

#### Scenario: A local file in the linked worktree wins

- **WHEN** both the linked worktree and the primary worktree have `app/.dev.vars`
- **THEN** the push reads the linked worktree's file

#### Scenario: No file anywhere

- **WHEN** neither the active checkout nor the primary worktree has `app/.dev.vars`
- **THEN** the push exits non-zero without contacting Cloudflare
- **AND** the message names `app/.dev.vars` and points at `app/.dev.vars.example`

### Requirement: A committed example file declares the expected secret names

The pack SHALL ship a committed `.dev.vars.example` carrying the **names** of the Worker's runtime secrets with blank values, mirroring the `.env.example` convention so a new contributor learns what to fill in and the expected key set has a reviewable home in git. The example SHALL sit beside the wrangler config — `app/.dev.vars.example` in the shipped layout — which is where the gate reads it; the pack SHALL NOT ship a `.dev.vars.example` at the repo root.

Where this declared set is available the gate SHALL report keys that are declared but absent from a Worker, and keys held by a Worker but undeclared, as **warnings** rather than failures — a repo may legitimately set a secret out of band, and the example file is uncorroborated. Only Worker-against-Worker divergence SHALL fail the build.

#### Scenario: The example is where the gate looks

- **WHEN** a fresh install has the shipped `app/wrangler.jsonc`
- **THEN** `app/.dev.vars.example` exists and is committed
- **AND** no `.dev.vars.example` exists at the repo root

#### Scenario: An undeclared secret warns without breaking the build

- **WHEN** a Worker holds a secret that `.dev.vars.example` does not list
- **THEN** the gate reports it as a warning
- **AND** the check still passes if the two Workers otherwise agree

#### Scenario: A secret missing from both Workers is surfaced

- **WHEN** a key is declared in `.dev.vars.example` but held by neither Worker
- **THEN** the gate warns, since Worker-against-Worker parity cannot detect this case

<!-- end specs/cf-secret-parity/spec.md -->
<!-- file specs/path-scoped-rules/spec.md utf8 5160 -->
## MODIFIED Requirements

### Requirement: The payload ships path-scoped rules in the core category

The payload SHALL include a `.claude/rules/` directory (real path `.agents/rules/` in this repo, reached through the `.claude` symlink) as a core, copy-if-absent category on the payload manifest. Each rule file SHALL carry YAML frontmatter with a `paths:` list of glob patterns, so an agent loads it only when reading files those patterns match. Four rules SHALL ship:

- `code.md`, scoped to the code surfaces (`app/**`, `scripts/**`, `.github/workflows/**`)
- `wiki.md`, scoped to `wiki/**`
- `openspec.md`, scoped to `openspec/**`
- `secrets.md`, scoped to the secrets surfaces (`.env*`, `**/.env.example`, `**/.dev.vars*`)

A target repo that already has any of these files SHALL keep its own copy untouched, per the sync's existing local-authorship rule.

#### Scenario: An agent edits code

- **WHEN** an agent reads or edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the `code.md` rule is in its context before the edit
- **AND** a session that touches no matching file never loads it

#### Scenario: An agent touches the wiki or notes

- **WHEN** an agent reads a file under `wiki/`
- **THEN** the matching rule imports the owning convention pages into context for that surface
- **AND** no rule loads for session context, because facts live in the memory store and not under `notes/`

#### Scenario: An agent works inside an OpenSpec change

- **WHEN** an agent reads or edits a file under `openspec/`
- **THEN** the `openspec.md` rule is in its context, stating where each kind of fact belongs across the four surfaces and that OpenSpec never runs git

#### Scenario: An agent touches an env file

- **WHEN** an agent reads or edits `.env.example`, `app/.dev.vars`, or another secrets surface
- **THEN** the `secrets.md` rule is in its context, pointing at the owning secrets convention

#### Scenario: A target repo receives the rules

- **WHEN** `/wong-sync` runs in a repo that lacks `.claude/rules/code.md`
- **THEN** the file is proposed as a missing payload file
- **AND** a locally authored rule of the same name is never overwritten

### Requirement: A rule is a thin importer, except for the fact it owns

A rule file SHALL NOT restate a convention another payload file owns — it SHALL name the owning doc, either importing it with Claude Code's `@path` syntax or linking it, keeping each rule short. `@`-imports load at launch (Claude Code expands imports eagerly); a rule SHALL therefore `@`-import only conventions worth holding in every session, and link the rest for the agent to read when the rule fires. Where a rule states a fact no other file owns, the rule file itself SHALL be that fact's single owner. Specifically:

- `code.md` SHALL own the write-less-code standard — the least code that does the job and none that doesn't; decompose branchy code into named helpers as it is written; prefer surgical edits over file rewrites; verify with the project's own checks after substantive edits; no `any`, and `unknown` only where it is narrowed before use — and SHALL state that the numeric limits are enforced by the repo's CI gates, not by the agent's memory.
- `wiki.md` SHALL import the wiki style and voice pages and restate nothing from them.
- `openspec.md` SHALL own the cross-surface routing rule in rule form — a fact about why a change is shaped its way goes to the change's Decision log, session context to facts in the memory store, reusable process to the wiki — and SHALL restate no surface's own convention.
- `secrets.md` SHALL name, in one line each, which live file holds which role — the root `.env` for the credentials that tools use to reach the platform, the stack's runtime file (`app/.dev.vars`) for the secrets the app reads — and link the page that owns the full table. It SHALL instruct the agent, at edit time, how each kind of edit reaches the primary worktree: an add or a rotation goes to both the worktree copy and the primary now; a deletion or a branch-only value stays in the worktree copy until `/ship` promotes it after the merge. It SHALL link the secrets convention page for how, and restate nothing else from those pages.

#### Scenario: A rule names an owned convention

- **WHEN** a rule needs the reader to follow a convention another file owns
- **THEN** it imports or links the owning file rather than restating its scope or exceptions

#### Scenario: The code rule states the standard

- **WHEN** an agent loads `code.md`
- **THEN** the write-less-code standard is stated there in full, because no other file owns it
- **AND** every numeric limit is attributed to the CI gate that enforces it, not restated as a number the agent must track

#### Scenario: The secrets rule routes an edit

- **WHEN** an agent in a linked worktree is about to add, rotate, or delete a value in `.env` or `app/.dev.vars`
- **THEN** the `secrets.md` rule in its context tells it which of the two files the value belongs in
- **AND** it tells the agent to write an add or a rotation to the primary as well, and to keep a deletion in the worktree copy until the merge

<!-- end specs/path-scoped-rules/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 6559 -->
## MODIFIED Requirements

### Requirement: Real values persist in one worktree-safe local store

For a repository with linked Git worktrees, WongStack SHALL treat the primary worktree's ignored live secrets files as the durable local source of real values. This SHALL cover every live secrets file, not only the root `.env`: a stack's runtime file such as `app/.dev.vars` and per-environment variants such as `.dev.vars.staging` persist in the primary worktree at the same path relative to the repo root. It SHALL resolve the primary worktree from Git metadata rather than directory naming conventions. Before writing a value it SHALL prove the destination is ignored; if safety or the primary worktree cannot be resolved, it SHALL stop without accepting or writing the secret. Repositories with only one worktree SHALL continue using their existing live files.

A linked worktree MAY hold a **seeded branch copy** of each live file — a copy made from the primary when the worktree was created, with a recorded baseline. A seeded copy is the branch's working copy, not a duplicate to reconcile; the rules for how its edits reach the primary are in the branch-copy requirement.

#### Scenario: A secret is saved from a linked worktree

- **WHEN** a workflow receives or rotates a secret while running in a linked worktree
- **THEN** it writes the value to the primary worktree's ignored live file
- **AND** deleting the linked worktree does not delete the saved credential

#### Scenario: A Worker secret is saved from a linked worktree

- **WHEN** an agent in a linked worktree adds a value to `app/.dev.vars`
- **THEN** the value also lands in the primary worktree's `app/.dev.vars`
- **AND** the root `.env` is not used for it

#### Scenario: A normal checkout retains its existing behavior

- **WHEN** the active checkout is the primary and only worktree
- **THEN** the durable live files are the existing files in that checkout
- **AND** no alternate directory or duplicate file is introduced

#### Scenario: Destination safety cannot be proven

- **WHEN** Git does not ignore the resolved durable live file or the primary worktree cannot be resolved
- **THEN** the workflow stops before requesting or writing a real value
- **AND** it identifies the local safety condition to fix without printing a credential

#### Scenario: A linked worktree already has a separate live file

- **WHEN** the durable file and a linked worktree-local regular file with no recorded baseline both exist
- **THEN** the workflow preserves both files, prefers the durable file for WongStack consumers, and reports that reconciliation is needed
- **AND** it neither compares values in output nor silently overwrites, deletes, or bulk-merges either file

#### Scenario: Checkout-local tooling needs the conventional path

- **WHEN** a stack requires the live environment file inside a linked checkout and the worktree was not seeded
- **THEN** the guidance permits an ignored link or equivalent stack configuration pointing to the durable file after any existing duplicate is reconciled
- **AND** the link itself is never committed

## ADDED Requirements

### Requirement: A branch's secret edits reach the primary by kind

WongStack SHALL ship a worktree-secrets helper with three operations, and SHALL route each kind of edit a branch makes to a live secrets file as follows.

- **Seed.** On a new linked worktree, the helper SHALL copy each primary live secrets file (`.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, excluding `*.example`, at the repo root and in each immediate subfolder) into the worktree when the worktree has no such file, and SHALL record a baseline of key names and value hashes. The baseline SHALL be stored in the worktree's private Git directory, never in the working tree, and SHALL hold no value.
- **Add and rotate now.** An added key, or a rotated value whose old value no longer works, SHALL be written to both the worktree copy and the primary at the time of the edit, so a deleted worktree cannot lose it.
- **Defer deletion and branch-only changes.** A removed key, or a value only this branch needs, SHALL be written to the worktree copy only, so `main` and other worktrees keep working until the branch merges.
- **Promote after merge.** After a successful merge, `/ship` SHALL run the helper's promote operation. It SHALL compare the worktree copy, the primary, and the baseline three ways, and apply to the primary only what the branch changed: remove a key the branch removed, and set a value the branch changed. It SHALL skip, and name, a key the primary also changed since the baseline. With no baseline it SHALL apply adds only and name every other difference. It SHALL prove the primary file is ignored before any write, edit only the affected lines, and never regenerate the file. A promote failure SHALL NOT fail a ship whose merge already succeeded.
- **Names only.** Every operation's output SHALL carry file paths and key names, never a value.

#### Scenario: A new worktree has both files

- **WHEN** a linked worktree is created and the primary has `.env` and `app/.dev.vars`
- **THEN** after `seed` the worktree has a copy of each, and a baseline exists outside the working tree
- **AND** `git status` in the worktree shows neither the copies nor the baseline

#### Scenario: A key deleted on a branch waits for the merge

- **WHEN** a branch removes `OLD_KEY` from its `app/.dev.vars` copy
- **THEN** the primary's `app/.dev.vars` still has `OLD_KEY` until the branch merges
- **AND** after `/ship` merges the branch, `promote` removes `OLD_KEY` from the primary and names it in the report

#### Scenario: A key another branch added is kept

- **WHEN** the primary gained `NEW_KEY` after this worktree was seeded, and this branch never had it
- **THEN** `promote` leaves `NEW_KEY` in the primary

#### Scenario: Both sides changed the same key

- **WHEN** the branch and the primary each changed `SHARED_KEY` after the baseline, to different values
- **THEN** `promote` leaves the primary's value, names `SHARED_KEY` as skipped, and prints no value

#### Scenario: An abandoned branch changes nothing

- **WHEN** a worktree with deferred deletions is removed without a merge
- **THEN** the primary files are unchanged

#### Scenario: Save persists an add to both copies

- **WHEN** `/save` persists a secret the user supplied during the session, in a seeded linked worktree
- **THEN** the value is written to the primary and to the worktree copy
- **AND** `/save` does not report the seeded copy as a duplicate to reconcile

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 7029 fence=~~~ -->
~~~html
<section class="visual tree" id="files" data-kind="tree" data-states="after today">
  <p class="caption">Secrets files and the folder each one lives in, today and after this change.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="label">Repo root — you and the scripts reach Cloudflare</div>
      <ul>
        <li>.env <span class="why">unchanged. Git-ignored, real values: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_MEMORY_TOKEN, optional CF_ACCESS_*. Never reaches a Worker.</span></li>
        <li>.env.example <span class="why">unchanged. Committed, values blank.</span></li>
      </ul>
      <div class="label">app/ — the Worker reads these secrets at runtime</div>
      <ul>
        <li>app/wrangler.jsonc <span class="why">unchanged. scripts/cf-secrets.mjs looks for .dev.vars files in this folder.</span></li>
        <li class="add">app/.dev.vars.example <i class="callout">1</i> <span class="why">moved here from the repo root. Committed, values blank.</span></li>
        <li>app/.dev.vars <i class="callout">2</i> <span class="why">git-ignored, real values. npm run secrets:push loads them into both Workers.</span></li>
        <li>app/.dev.vars.staging <span class="why">optional. Git-ignored, real values for staging.</span></li>
      </ul>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="label">Repo root</div>
      <ul>
        <li>.env <span class="why">git-ignored, real values: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_MEMORY_TOKEN, optional CF_ACCESS_*.</span></li>
        <li>.env.example <span class="why">committed, values blank.</span></li>
        <li class="del">.dev.vars.example <i class="callout">1</i> <span class="why">committed, values blank. Wrong folder: secrets:check never reads it.</span></li>
      </ul>
      <div class="label">app/</div>
      <ul>
        <li>app/wrangler.jsonc <span class="why">scripts/cf-secrets.mjs reads .dev.vars and .dev.vars.example from this folder.</span></li>
      </ul>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> a person or an agent who must put a secret in the correct file.</p>
    <ol>
      <li>The example moves to <code>app/</code>, where the script already looks. The script does not change where it reads.</li>
      <li>A linked worktree has its own copy of <code>.env</code> and <code>app/.dev.vars</code> at the same paths. An add or a rotation also goes to the primary's copy now. A deletion waits for the merge. The <code>secret-edits</code> item shows how.</li>
    </ol>
  </div>
</section>

<section class="visual flow" id="secret-edits" data-kind="flow" data-states="after today">
  <p class="caption">What happens to a secret that a branch edits, from new worktree to merge, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-seed"><h3>New worktree: seed <span class="tag">New</span></h3><p>paseo.json setup runs <code>worktree-secrets.mjs seed</code>. It copies each primary live file into the worktree and records a baseline.</p><details><summary>Details</summary><p>Files: <code>.env</code>, <code>app/.dev.vars</code>, and <code>app/.dev.vars.staging</code> if present. Baseline: key names and value hashes, in the worktree's private Git folder. <i class="callout">2</i></p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-edit"><h3>The branch edits a secret <span class="tag">Changed</span></h3><p>Where the edit goes depends on its kind.</p></div>
      <p class="flow-connector">↓ Choose one path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-add"><h3>Add a key</h3><p>Write it to the worktree copy and to the primary, now.</p><details><summary>Details</summary><p>Other worktrees and the primary can use the key at once.</p></details></div>
        <div class="flow-branch" data-target-id="after-rotate"><h3>Rotate a value</h3><p>The old value is dead. Write the new one to both, now.</p><details><summary>Details</summary><p>The primary must not keep a dead value until the merge.</p></details></div>
        <div class="flow-branch" data-target-id="after-delete"><h3>Delete a key or set a branch-only value</h3><p>Write it to the worktree copy only.</p><details><summary>Details</summary><p>The primary changes only when the branch merges.</p></details></div>
      </div>
      <p class="flow-connector">↓ All paths rejoin here</p>
      <div class="step flow-card" data-target-id="after-merge"><h3>The branch merges</h3><p><code>/ship</code> merges the pull request.</p></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-promote"><h3>Promote to the primary <span class="tag">New</span></h3><p><code>/ship</code> runs <code>worktree-secrets.mjs promote</code>. It applies the branch's deletions and changes to the primary. <i class="callout">1</i></p><details><summary>Details</summary><p>It compares three ways: the baseline, the worktree copy, and the primary. If the primary also changed a key after the seed, promote skips that key and names it. The output shows key names only, never values. A failure is a one-line skip and cannot fail the merged ship.</p></details></div>
      <p class="flow-connector">or, if the branch does not merge</p>
      <div class="step flow-card" data-target-id="after-abandon"><h3>Abandoned branch</h3><p>The worktree is deleted. The primary never changes, except for adds and rotations already written there.</p></div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-create"><h3>New worktree</h3><p>paseo.json copies only <code>.env</code>, one time, when it creates the worktree.</p><details><summary>Details</summary><p><code>app/.dev.vars</code> is not copied.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-edit"><h3>The branch edits a secret</h3><p>The edit stays in the worktree copy.</p><details><summary>Details</summary><p>Worktree edits never reach the primary.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-merge"><h3>The branch merges</h3><p>No secrets step runs at merge.</p></div>
    </div></div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> an agent or a person who edits a secret in a linked worktree.</p>
    <ol>
      <li>Promote compares against the baseline, not only the two files. A two-file compare would treat a key that another branch added to the primary as a deletion.</li>
      <li>No step prints a value. The baseline stores only hashes, and only in the worktree's private Git folder.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 54001 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-26-clarify-secret-files</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-26-clarify-secret-files</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

The repo has both `.env` and `.dev.vars`, and nothing tells you at a glance which to use. The committed `.dev.vars.example` sits at the repo root, but `scripts/cf-secrets.mjs` reads `.dev.vars` and `.dev.vars.example` next to the wrangler config in `app/`. So the example is in the wrong place, and `secrets:check` never finds it. Worktrees make it worse: Paseo copies `.env` into each new worktree once, nothing copies `.dev.vars`, and an edit made in a worktree never reaches the primary checkout. A branch that deletes or changes a secret must also not change `main`'s values before it merges.

## What Changes

- One file per role, one place for each. The root `.env` holds only the credentials that you and the scripts use to reach Cloudflare. `app/.dev.vars` holds only the secrets the Worker reads at runtime. `.dev.vars.example` moves from the repo root to `app/.dev.vars.example`, next to `app/wrangler.jsonc`, where the script already looks. The pack lists the example under `app/`, and setup installs it there. (review.html#/files)
- Each linked worktree gets its own branch copy of every live secrets file, and a branch's edits reach the primary by kind. A new helper, `.claude/skills/ship/scripts/worktree-secrets.mjs`, has three commands. `seed` copies each primary live file into a new worktree and records a baseline of key names and value hashes in the worktree's private Git folder. `status` lists, by key name only, what the branch added, removed, or changed. `promote` applies the branch's removals and changes to the primary and skips any key that the primary also changed. `paseo.json` runs `seed` for every new worktree, so `app/.dev.vars` is copied as well as `.env`. (review.html#/secret-edits)
- The secrets rule (`.agents/rules/secrets.md`) opens with one line per file that says what it holds, and links to the full table. It then says how to edit: write an add or a rotation to both the worktree copy and the primary now. A deletion or a branch-only value stays in the worktree copy. It is a rule, not a hook: it loads when an agent touches `.env*` or `.dev.vars*`.
- `/ship` runs `worktree-secrets.mjs promote` after the merge, beside its post-merge sync. It reports the promoted and skipped key names, never values. As with the sync, a failure skips with one line and cannot fail a merged ship. `/save`'s named-secret step writes an add or a rotation to the seeded worktree copy as well as the primary, and stops reporting that copy as a duplicate to reconcile.
- `secrets:push` in a linked worktree reads `app/.dev.vars` (and `app/.dev.vars.staging`) from the primary worktree when the linked checkout has none. A local copy still wins. The `.env` refusal and the credential-key check stay the same.
- The docs say the same thing everywhere: `wiki/stack/d1-pipeline.md` owns the "which file" table and names `app/.dev.vars`. `wiki/development/secrets.md` owns the branch-copy lifecycle. `wiki/stack/cloudflare-credentials.md`, the header comments of both example files, and the script's messages link to those pages or use that path.
- Release as WongStack 19.1.0.

**Non-goals:** No migration for repos that have a root `.dev.vars`; every install starts from an empty folder. No hook. No merge of the two files into one `.env`. `CLOUDFLARE_API_TOKEN` must never reach a Worker, so the split stays. No change to `secrets:check` parity logic, to CI, or to what `secrets:push` sends to the deployed Workers.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual tree" id="files" data-kind="tree" data-states="after today">
  <p class="caption">Secrets files and the folder each one lives in, today and after this change.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="label">Repo root — you and the scripts reach Cloudflare</div>
      <ul>
        <li>.env <span class="why">unchanged. Git-ignored, real values: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_MEMORY_TOKEN, optional CF_ACCESS_*. Never reaches a Worker.</span></li>
        <li>.env.example <span class="why">unchanged. Committed, values blank.</span></li>
      </ul>
      <div class="label">app/ — the Worker reads these secrets at runtime</div>
      <ul>
        <li>app/wrangler.jsonc <span class="why">unchanged. scripts/cf-secrets.mjs looks for .dev.vars files in this folder.</span></li>
        <li class="add">app/.dev.vars.example <i class="callout">1</i> <span class="why">moved here from the repo root. Committed, values blank.</span></li>
        <li>app/.dev.vars <i class="callout">2</i> <span class="why">git-ignored, real values. npm run secrets:push loads them into both Workers.</span></li>
        <li>app/.dev.vars.staging <span class="why">optional. Git-ignored, real values for staging.</span></li>
      </ul>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="label">Repo root</div>
      <ul>
        <li>.env <span class="why">git-ignored, real values: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_MEMORY_TOKEN, optional CF_ACCESS_*.</span></li>
        <li>.env.example <span class="why">committed, values blank.</span></li>
        <li class="del">.dev.vars.example <i class="callout">1</i> <span class="why">committed, values blank. Wrong folder: secrets:check never reads it.</span></li>
      </ul>
      <div class="label">app/</div>
      <ul>
        <li>app/wrangler.jsonc <span class="why">scripts/cf-secrets.mjs reads .dev.vars and .dev.vars.example from this folder.</span></li>
      </ul>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> a person or an agent who must put a secret in the correct file.</p>
    <ol>
      <li>The example moves to <code>app/</code>, where the script already looks. The script does not change where it reads.</li>
      <li>A linked worktree has its own copy of <code>.env</code> and <code>app/.dev.vars</code> at the same paths. An add or a rotation also goes to the primary's copy now. A deletion waits for the merge. The <code>secret-edits</code> item shows how.</li>
    </ol>
  </div>
</section>

<section class="visual flow" id="secret-edits" data-kind="flow" data-states="after today">
  <p class="caption">What happens to a secret that a branch edits, from new worktree to merge, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="after-seed"><h3>New worktree: seed <span class="tag">New</span></h3><p>paseo.json setup runs <code>worktree-secrets.mjs seed</code>. It copies each primary live file into the worktree and records a baseline.</p><details><summary>Details</summary><p>Files: <code>.env</code>, <code>app/.dev.vars</code>, and <code>app/.dev.vars.staging</code> if present. Baseline: key names and value hashes, in the worktree's private Git folder. <i class="callout">2</i></p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-edit"><h3>The branch edits a secret <span class="tag">Changed</span></h3><p>Where the edit goes depends on its kind.</p></div>
      <p class="flow-connector">↓ Choose one path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="after-add"><h3>Add a key</h3><p>Write it to the worktree copy and to the primary, now.</p><details><summary>Details</summary><p>Other worktrees and the primary can use the key at once.</p></details></div>
        <div class="flow-branch" data-target-id="after-rotate"><h3>Rotate a value</h3><p>The old value is dead. Write the new one to both, now.</p><details><summary>Details</summary><p>The primary must not keep a dead value until the merge.</p></details></div>
        <div class="flow-branch" data-target-id="after-delete"><h3>Delete a key or set a branch-only value</h3><p>Write it to the worktree copy only.</p><details><summary>Details</summary><p>The primary changes only when the branch merges.</p></details></div>
      </div>
      <p class="flow-connector">↓ All paths rejoin here</p>
      <div class="step flow-card" data-target-id="after-merge"><h3>The branch merges</h3><p><code>/ship</code> merges the pull request.</p></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="after-promote"><h3>Promote to the primary <span class="tag">New</span></h3><p><code>/ship</code> runs <code>worktree-secrets.mjs promote</code>. It applies the branch's deletions and changes to the primary. <i class="callout">1</i></p><details><summary>Details</summary><p>It compares three ways: the baseline, the worktree copy, and the primary. If the primary also changed a key after the seed, promote skips that key and names it. The output shows key names only, never values. A failure is a one-line skip and cannot fail the merged ship.</p></details></div>
      <p class="flow-connector">or, if the branch does not merge</p>
      <div class="step flow-card" data-target-id="after-abandon"><h3>Abandoned branch</h3><p>The worktree is deleted. The primary never changes, except for adds and rotations already written there.</p></div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-create"><h3>New worktree</h3><p>paseo.json copies only <code>.env</code>, one time, when it creates the worktree.</p><details><summary>Details</summary><p><code>app/.dev.vars</code> is not copied.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-edit"><h3>The branch edits a secret</h3><p>The edit stays in the worktree copy.</p><details><summary>Details</summary><p>Worktree edits never reach the primary.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-merge"><h3>The branch merges</h3><p>No secrets step runs at merge.</p></div>
    </div></div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> an agent or a person who edits a secret in a linked worktree.</p>
    <ol>
      <li>Promote compares against the baseline, not only the two files. A two-file compare would treat a key that another branch added to the primary as a deletion.</li>
      <li>No step prints a value. The baseline stores only hashes, and only in the worktree's private Git folder.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
