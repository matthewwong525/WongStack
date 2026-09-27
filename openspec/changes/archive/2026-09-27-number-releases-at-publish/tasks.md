# Tasks

## 1. Numbering script (ship skill)

- [x] 1.1 Add `.agents/skills/ship/scripts/number-release.mjs` as design.md describes: find the branch's one entry the default branch lacks, print `release=none` with nothing to number, `behind=yes` (exit 3) when `origin/<default>` is not merged in, read the level from `## Next (level)` or the numbered entry's gap, write `VERSION` and the `## X.Y.Z — <Title>` heading on top, restore one blank line before every `## ` heading, print `release=X.Y.Z from=A.B.C`. Verify: `node .agents/skills/ship/scripts/number-release.mjs --help` exits 0.
- [x] 1.2 Add `scripts/tests/ship-number-release.test.mjs` on temp git repos with a local `origin`: no `CHANGELOG.md` and no new entry → `release=none` and no file changed; `## Next (minor)` over 26.1.0 → 26.2.0; renumber a numbered 26.2.0 entry after the default branch reached 26.2.0 → 26.3.0; a branch cut before this change with 26.1.1 over a default branch at 26.2.0 → 26.2.1; behind → exit 3; two entries, unknown level, and a `## Next` with no default-branch `VERSION` → exit 1; a missing blank line is restored. Verify: the test passes under c8 in the payload checks (`/save`).

## 2. Merge script and /ship

- [x] 2.1 In `.agents/skills/ship/scripts/merge.sh`, fetch the default branch before merging; when the branch changes `VERSION` against its merge base and the default branch's `VERSION` has moved from that base, print `merged=no` and `stale_version=<version>` and exit 1. Pass `--subject` built from the PR title (trailing ` (vX.Y.Z)` dropped), ` (v<VERSION>)` for a release, and ` (#<number>)`; update the header comment's output list. Verify: `shellcheck --severity=warning` passes.
- [x] 2.2 Extend `scripts/tests/ship-merge.test.mjs`: the fake `gh pr merge` call carries `--subject "<title> (v26.2.0) (#7)"` for a release, and `"<title> (#7)"` with no `VERSION`; a stale version prints `stale_version=` with no merge call; an unrelated move of the default branch still merges. Verify: the test passes in the payload checks (`/save`).
- [x] 2.3 In `.agents/skills/ship/SKILL.md`, add numbering before Step 3's `/save` (fetch, run the script, merge `origin/main` and rerun on `behind=yes`) and a Step 5 bullet for `stale_version=` (merge `origin/main`, number again, ordinary `/save`, rerun on `SUCCESS` or `NONE`). Keep the step generic: no link to meta-only files. Verify: `node scripts/check-payload-links.mjs` passes.

## 3. Release labels

- [x] 3.1 In `scripts/tag-releases.mjs`, treat an error with `HTTP 422` and `already exists` as done, and fail with a plain message when `CHANGELOG.md` holds a `## Next` heading; update the file's comments. Verify: `node scripts/tag-releases.mjs --help` exits 0.
- [x] 3.2 Extend `scripts/tests/tag-releases.test.mjs`: a fake 422 `tag_name already exists` exits 0 and is neither created nor refused; a `## Next` heading exits 1 naming it. Verify: the test passes in the payload checks (`/save`).

## 4. Release rule and its paths

- [x] 4.1 In `.agents/rules/payload.md`, add `wiki/stack/**`, `wiki/ux-principles.md`, `mini-apps/router*`, `mini-apps/routes*`, `mini-apps/apps/hello/**`, `schema/**`, `AGENTS.md`, and `CLAUDE.md` to `paths:`, and rewrite the release bullets as the one owner: write a `## Next (patch|minor|major) — <Title>` entry, leave `VERSION`, `/ship` numbers it, run `tag-releases.mjs` with your own login when the Releases run warned.
- [x] 4.2 Add `scripts/tests/payload-rule-paths.test.mjs`: every path in `payload-files.json`'s categories (files, dirs, skillDirs, block files) plus `VERSION` and `CHANGELOG.md` matches a `paths:` glob, and a path outside them is named in the failure. Verify: the test passes locally with `node --test` and in the payload checks (`/save`).

## 5. Docs point at the one owner

- [x] 5.1 `wiki/development/README.md`: cut the release paragraph to one sentence linking the payload rule. `wiki/development/adding-a-skill.md` step 3: a `## Next (minor)` entry, `VERSION` left alone, link the rule.
- [x] 5.2 `wiki/contributing.md`: step 4 says to add a `## Next (<level>) — <Title>` entry and leave `VERSION` alone, links the upstream `payload.md` by GitHub URL, and drops the hand-tagging line. `.github/CONTRIBUTING.md` links `../.agents/rules/payload.md` as the owner. `.github/PULL_REQUEST_TEMPLATE.md`'s checkbox asks for a `## Next` entry.
- [x] 5.3 `openspec/config.yaml`: the context paragraph and the tasks rule say a payload change adds a `## Next` entry and `/ship` numbers it. Verify: `node scripts/check-openspec-config.mjs` passes.
- [x] 5.4 Verify with `grep -rn "bump.*VERSION\|git tag v" wiki .github .agents openspec/config.yaml` that no live surface outside the archive still tells an author to raise `VERSION` or tag by hand.

## 6. Changelog

- [x] 6.1 Restore the blank line before the `## 25.11.0`, `## 25.6.0`, and `## 25.4.1` headings in `CHANGELOG.md`.
- [x] 6.2 Add this change's `## Next (minor) — Releases are numbered when they publish` entry at the top with an **Updating.** line, and leave `VERSION` at 26.1.0. Verify: `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs` pass.
