## 1. Links

- [ ] 1.1 Extend `scripts/check-payload-links.mjs`: read symlink paths from `git ls-tree -r HEAD`, and fail on a Markdown link that passes through one, naming the real path. Skip code spans and fenced code. Add negative-case tests (a link through `.claude/` fails, a command in a code span passes).
- [ ] 1.2 Repoint every live Markdown link from `.claude/...` to `.agents/...` in `wiki/`, `AGENTS.md`, `.agents/`, `README.md`, and `CHANGELOG.md`'s newest entry only. Update `wiki/development/repo-layout.md` with the rule and its reason, and name all three links (`.claude`, `.codex`, `CLAUDE.md`).

## 2. README and root docs

- [ ] 2.1 Rewrite `README.md` to the order in review.html#/readme. The first screen states the problem and what WongStack does. Add badges, the comparison table, the layout table, and correct requirements (Node, `curl`, `npm install -g @fission-ai/openspec@1.8.0`, `git config core.symlinks true` on Windows). Say why Cloudflare is required and link `SECURITY.md`. Use "fork first" in the source section. Qualify the Cursor claim, and link Paseo as optional. Move the glossary to `wiki/README.md` or a linked page. Keep the command table and "Learn more", and fold "Where the knowledge lives" into the layout table. Check each comparison cell against the current OpenSpec and Spec Kit docs before you write it, and link the sources. Follow `wiki/voice.md`.
- [ ] 2.2 Generate the screenshot: build a `review.html` from an archived change, capture it with `agent-browser` at desktop width, and commit it as `wiki/assets/review-page.png`. Reference it from the README.
- [ ] 2.3 `SECURITY.md`: say that the Cloudflare account ID in `.agents/.wong-stack.json` is an identifier, not a secret.

## 3. Community files

- [ ] 3.1 Add `.github/CONTRIBUTING.md`. Cover the issue first, then the fork, then the tests (`node --test scripts/tests/*.test.mjs`, the payload checks, `npm test` in `app/`), and say that a fork PR gets no preview. Link `wiki/contributing.md` for the release ritual.
- [ ] 3.2 Add `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, with the advisory form as the contact). Add `.github/ISSUE_TEMPLATE/{bug.yml,feature.yml,config.yml}` (`config.yml` links the security advisory form and turns off blank issues), `.github/PULL_REQUEST_TEMPLATE.md` with the VERSION and CHANGELOG checklist, and `.github/CODEOWNERS`.
- [ ] 3.3 Add `.gitattributes` (`* text=auto eol=lf`) and `.editorconfig`.

## 4. CI

- [ ] 4.1 Pin every `uses:` in `.github/workflows/*.yml` to a commit SHA with a version comment. Add `timeout-minutes` to each job (15 for `test` and `payload`, 20 for `build`).
- [ ] 4.2 Add `.github/dependabot.yml` for `npm` in `/app` and `github-actions` in `/`, weekly.
- [ ] 4.3 Run `deploy.yml`'s production job in a `production` environment. Create the environment with a deployment-branch policy limited to `main` (applied with the settings in 6.1).

## 5. Private names

- [ ] 5.1 Replace ClaymooApp in `routine.mjs:95` and `routine.test.mjs:134` with a generic name. Replace `wongstack-cloud` in `downstream-contract.test.mjs` with "hosted setups", and fix the `downstream-contract` Purpose in `openspec/specs/downstream-contract/spec.md`.
- [ ] 5.2 Add `scripts/tests/private-names.test.mjs`. It fails on a private name in a tracked file outside `openspec/changes/archive/` and `CHANGELOG.md`.

## 6. GitHub settings

- [ ] 6.1 Print each current value and its new value (review.html#/settings), and ask the user to approve before anything is applied. Then, with `gh api`: turn on private vulnerability reporting, secret scanning and push protection, and vulnerability alerts and automated security fixes. Set squash-only merges and `delete_branch_on_merge`. Set the description, topics, and homepage. Create the `production` environment for `main`. Create the `main` ruleset (required checks `test` and `payload`, a pull request rule, block force-push and deletion, and an admin bypass). Record each old value in the Decision log for rollback.
- [ ] 6.2 Read each setting back and confirm it. Open the `SECURITY.md` advisory link and confirm that the form loads.

## 7. Release

- [ ] 7.1 Bump `VERSION` to 19.0.0. Add one newest-first `CHANGELOG.md` entry that covers `harden-edge-cases`, `trim-legacy-and-restatement`, and this change, and state that installs from before 19.0.0 must be set up again in an empty folder. Add the tag-and-release step to the release ritual in `wiki/contributing.md`.
- [ ] 7.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`, and fix any failure.
- [ ] 7.3 Run `/save` so CI runs every suite on the one PR. The task is done when CI passes.
- [ ] 7.4 Write the post-merge release commands into the release ritual in `wiki/contributing.md` (`git tag v<VERSION> <merge-sha>`, `git push origin v<VERSION>`, and `gh release create v<VERSION> --notes-file <entry>`). Record in the Decision log that `/ship` runs them for 19.0.0 right after the squash merge and reports the release URL. The tag cannot exist before the merge commit does.
