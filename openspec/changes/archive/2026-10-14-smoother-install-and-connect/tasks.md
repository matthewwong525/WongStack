# Tasks

## 1. The install program (setup skill)

- [x] 1.1 Move `targetFiles` from `scripts/check-target-app.mjs` into `.agents/skills/wong-setup/scripts/install.mjs` and import it back; verify `scripts/tests/check-target-app.test.mjs` passes unchanged.
- [x] 1.2 Write `install.mjs` by design decision 1, with templates in `.agents/skills/wong-setup/references/seed/` (`wiki-README.md`, `wiki-development-README.md`, `gitignore`, `openspec-config.yaml`); verify by running it into an empty temp folder and seeing the JSON report, three links passing `test -L`, and the install record's version and commit.
- [x] 1.3 Write `scripts/tests/setup-install.test.mjs`: it refuses a folder with files, never overwrites, stops on a refused link, writes every `seededBySetup` path, and each seed hub links every shipped page under it; verify all cases pass.
- [x] 1.4 Point `wong-setup/SKILL.md`'s install section and the payload manifest's agent-folder and install-record sections at the program, cutting the restated steps; verify `node scripts/check-payload-links.mjs` passes.

## 2. Provisioning and tools (setup skill)

- [x] 2.1 In `provision.mjs`, refresh the binding types after writing `app/wrangler.jsonc` by design decision 3; verify in `scripts/tests/provision.test.mjs` that the types command runs after the config write, and that its failure is a warning.
- [x] 2.2 Set `app/package.json` `engines.node` to `^22.22.2 || ^24.15.0 || >=26.0.0`. Change `tools.md`'s Node row to check against the source app's `engines.node`; verify `npm ci` in `app/` on the pinned Node prints no `EBADENGINE`.

## 3. Loosened-check guard (CI scripts)

- [x] 3.1 Add the empty-base pass, the quiet `git show`, and the regular-files-only untracked read to `.github/scripts/loosened-checks.mjs` by design decision 2; verify the new cases in `scripts/tests/loosened-checks.test.mjs`: settings added onto an empty first commit pass with the line, a `--worktree` run with an untracked `.claude` folder link and a new `package.json` prints no `fatal:` and does not crash, and the existing cases still fail where they did.
- [x] 3.2 Add the first-change rule to `wiki/development/loosened-checks.md`; verify the wiki check passes.

## 4. Save and ship (delivery skills)

- [x] 4.1 In `ship.mjs` `prepare`, restart and wait for a cut-off default run once by design decision 4; verify in `scripts/tests/ship-publish-artifacts.test.mjs` that cut-off then pass continues to archive, and cut-off then fail stops.
- [x] 4.2 In `merge.sh`, switch a clean primary checkout off the merged branch by design decision 5; verify in `scripts/tests/ship-merge.test.mjs` the three cases: clean primary is switched, dirty primary is left with `synced=ref`, linked worktree is left.
- [x] 4.3 In `checkpoint.mjs`, give the missing message and summary files the plain cause by design decision 6; verify in `scripts/tests/checkpoint.test.mjs` that the error names the deleted-on-pass cause.

## 5. Connect and company actions (employee scripts)

- [x] 5.1 In `scripts/employee-bootstrap.mjs`, add the install-state fallback and the post-install check by design decision 7; verify in `scripts/tests/employee-bootstrap.test.mjs` that after `install`, a client rooted in the downloaded folder with no `--state` reads the saved origin, and a mismatched state keeps *Nothing else is needed* out of the summary.
- [x] 5.2 Report a reused sign-in by design decision 8; verify a test where no login link fires gives `signIn: 'reused'` and a summary naming the email, and one where it fires gives `new`.
- [x] 5.3 In `scripts/company-api.mjs`, print the missing-company line by design decision 9; verify in `scripts/tests/company-api.test.mjs` that a list with no sign-in writes the line to stderr, exits 0, and still lists memory actions.
- [x] 5.4 Name the fallback and the reuse line in `wiki/stack/company-api.md`; verify the wiki check passes.

## 6. Release

- [x] 6.1 Write the `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words; verify it names each person-visible change in the proposal.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` as the pre-check (done; `/save` left to /ship), then `/save`; verify the gate passes and the preview opens.
