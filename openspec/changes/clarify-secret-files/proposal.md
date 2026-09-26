# Make it clear which secrets file to use

**Status:** in-progress
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
