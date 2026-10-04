# Tasks

## 1. Server folder

- [x] 1.1 Delete `server/` whole; verify `git ls-files server` prints nothing
- [x] 1.2 Delete the eleven `scripts/tests/server-*.test.mjs` files; verify `ls scripts/tests | grep '^server-'` prints nothing
- [x] 1.3 Remove `server/setup.sh` and `server/preserve.sh` from the pin list in `.agents/skills/update-dependencies/scripts/update.mjs` and from the fixture in `scripts/tests/update-dependencies.test.mjs`; verify by reading that the test still names every remaining place the OpenSpec version lives

## 2. Managed delivery pieces

- [x] 2.1 Delete `.agents/skills/save/scripts/hosted-delivery.mjs`, `.agents/skills/save/scripts/hosted-main-pre-push.mjs`, `.agents/skills/save/references/hosted-delivery.md`, `.agents/skills/wong-sync/scripts/hosted-context.mjs`, `scripts/check-hosted-starter.mjs`, `scripts/acceptance/`, and the four `scripts/tests/hosted-*.test.mjs` files; verify `git ls-files | grep -i hosted` lists only `openspec/` paths
- [x] 2.2 In `.agents/skills/save/scripts/saved-revision.mjs`, remove the two hosted imports, the Artifacts branch, the `hostedInput` and `delivery` parameters and the `--hosted-input` flag, keeping `SHA` as a local constant; verify by reading that the GitHub path is unchanged and a non-GitHub origin still returns `UNKNOWN`
- [x] 2.3 In `scripts/tests/saved-revision.test.mjs`, remove the hosted case and add one asserting an Artifacts origin returns `UNKNOWN`; in `scripts/tests/checks.test.mjs`, retitle the `--discover` test without "hosted"; verify both files import nothing deleted
- [x] 2.4 Remove the `HOSTED_ACCEPTANCE_EXECUTION_TOKEN` block from `.env.example`; reword "hosted setups" in `scripts/tests/downstream-contract.test.mjs` and `scripts/tests/private-names.test.mjs` messages to name `/wong-setup` and installed repos; verify the assertions themselves are unchanged

## 3. Skill text

- [x] 3.1 Remove the *Hosted workspace first* section from `.agents/skills/wong-setup/SKILL.md`, the server-installer clauses from `references/cloudflare.md`, and the server-installer wording from the header comments of `scripts/provision.mjs` and `scripts/private-access.mjs`; verify no code line in either script changed
- [x] 3.2 Remove the hosted fork from `.agents/skills/save/SKILL.md`, `save/references/preconditions.md`, and `save/references/git-gate.md`; verify each GitHub step under it reads as before
- [x] 3.3 Remove the hosted fork from `.agents/skills/ship/SKILL.md`, `continue/SKILL.md`, `apply/SKILL.md`, and the `--hosted-input` clause from `verify/SKILL.md`; verify no link to `hosted-delivery.md` or `hosted-projects.md` remains under `.agents/skills/`
- [x] 3.4 Remove the managed-install sentences from `.agents/skills/wong-sync/references/catch-up.md` and the `server/` clause from `references/payload-manifest.md`; verify the outside-the-inventory list still names every source-only piece that exists
- [x] 3.5 Remove the `server` area from `.agents/skills/memory/references/areas.json` and any `hosted-projects.md` or retired-spec path from other areas' `docs`; verify every path the file names exists

## 4. Wiki

- [x] 4.1 Delete `wiki/stack/hosted-projects.md` and rewrite `wiki/stack/README.md` and `wiki/stack/getting-started.md` for one route, as the design lists; verify the hub links every remaining page in `wiki/stack/`
- [x] 4.2 Edit `wiki/stack/customizing-wongstack.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/cloudflare-cli.md`, and `wiki/development/required-tools.md` as the design lists; verify no link to `server/README.md` remains under `wiki/`
- [x] 4.3 Edit *The gate* in `wiki/development/the-change-loop.md`, the Save line in `wiki/README.md`, and the cloud clause in `wiki/people/matthew-wong.md`; verify the `#the-gate` heading text is unchanged

## 5. CI and repo docs

- [x] 5.1 In `.github/workflows/payload.yml`, drop `server` from the lint paths, `server/*.sh` from the shell check, and the *Generated hosted starter checks* step; in `scripts/tests/.c8rc.json`, drop `server` from `src` and the `server/…` and `scripts/acceptance/…` globs from `include`, leaving both floors; verify no workflow names a deleted path
- [x] 5.2 Remove the `server/` row from `README.md` and `server/*.sh` from the command in `.github/CONTRIBUTING.md`; verify neither file names `server/`

## 6. Specs and release

- [x] 6.1 Edit the Purpose of `openspec/specs/install-onboarding/spec.md` to end at "through the normal workflow"; verify the Purpose names no server script
- [x] 6.2 Add the `## Next (major) — …` entry to `CHANGELOG.md` with the plain-words **Updating.** note from the design; verify `VERSION` is untouched
- [x] 6.3 Add the design's names to `scripts/retired-names.json`, each with a replacement and the frozen corpus files under `allow`; verify every `allow` path exists

## 7. Final verification

- [x] 7.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; fix what they name. The retired-name check may name only `openspec/specs/` lines this change's deltas remove; it is rerun clean after the archive reconciles them, before the publish checkpoint
- [x] 7.2 Run `node .github/scripts/loosened-checks.mjs --worktree`; add a `Check:` Decision-log bullet for any file it flags that the log does not name
- [x] 7.3 Run `git grep -n -i -E 'hosted-(delivery|context|projects|main)|server/(setup|README|install|agent|hosted)|managed (hosted|Artifacts|route|delivery|publication)' -- . ':!openspec/changes' ':!openspec/specs' ':!CHANGELOG.md' ':!scripts/tests/fixtures' ':!scripts/retired-names.json'`; verify it prints nothing, and again without the `openspec/specs` exclusion after the archive
- [x] 7.4 Run `openspec validate "remove-server-and-managed-hosting" --strict --no-interactive`; CI's script tests and coverage floor are read at the publish checkpoint, with no floor lowered
