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
- [ ] 5.3 Run `/save` so CI runs the suite with the new tests. The task is done when CI passes.
