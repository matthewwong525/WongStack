# Number each release when it publishes

**Status:** ready-to-ship
**Branch:** nifty-leopard
**Open questions:** none

## Why

When two changes are in progress at once, both pick the same next version number, and whichever publishes second has to be renumbered by hand. Three published updates already carry the wrong number in their title, and the automatic release labels failed once because two runs raced to make the same label. The steps for cutting a release are also written in three places that disagree, and one of them still says to label releases by hand.

## What Changes

- **A change stops choosing its own number.** Its notes go under a *Next* heading, marked patch, minor, or major. Publishing (`/ship`) picks the number right before it merges, from the latest published version, so two changes in progress can never pick the same one.
  ```text
  Change A        Change B
  ## Next(minor)  ## Next(patch)
     │               │
     ▼               │
  publish: live      │
  is 26.1.0          │
  ─▶ A is 26.2.0     ▼
                  publish: live
                  is 26.2.0
                  ─▶ B is 26.2.1
  ```
- **A number that went stale is caught before it merges.** If another update publishes while yours waits on its checks, the merge stops, renumbers yours, saves it again, and then merges. It never ships two updates under one number.
- **The published title always names the number that shipped.** The merge writes the title itself from the final number and the pull request's title, instead of trusting whatever an older commit said.
- **Release labels no longer fail on a race.** When the label already exists because the other run made it first, that counts as done, not as a failure.
- **The release steps live on one page.** The release rule for WongStack's own files becomes the one place that says how a release is cut. The other pages link to it, and the stale "label it by hand" step goes. The rule now also loads for every file WongStack ships, not only some of them, and a check keeps that list complete.
- **The update notes are tidied.** Three headings that lost their blank line in earlier conflict fixes get it back, and each numbering run keeps them that way.

Non-goals: no change to how installed repos save or publish their own work; no automatic choice between patch, minor, and major; no rewrite of the three past commit titles, which are already published.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `open-source-release`: *Each release is tagged* treats an existing Release as done and no longer claims `/ship` creates refused Releases; new *A release is numbered when it publishes* covers numbering from the default branch's version at merge time, the stale-number stop, and a merge title naming the shipped version.
- `payload-checks`: new *The release rule covers every shipped file*.

## Impact

- `.agents/skills/ship/`: new `scripts/number-release.mjs`; `scripts/merge.sh` passes `--subject` and refuses a stale number; `SKILL.md` runs numbering before its checkpoint and handles `stale_version`.
- `scripts/tag-releases.mjs` (+ test): HTTP 422 already-exists counts as done; a `## Next` heading on the default branch fails the run.
- `.agents/rules/payload.md`: owns the release steps; `paths:` gains every shipped path; new `scripts/tests/payload-rule-paths.test.mjs` checks it against `payload-files.json`.
- Docs: `wiki/development/README.md`, `wiki/development/adding-a-skill.md`, `wiki/contributing.md`, `.github/CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `openspec/config.yaml`.
- `CHANGELOG.md`: this change's `## Next (minor)` entry, and three restored blank lines.

## Decision log

- **2026-09-27** — Asked how releases stop colliding → chose to number at publish: each change writes its notes under a `CHANGELOG.md` `## Next` heading and leaves `VERSION` alone, and `/ship` sets both from the default branch's version right before merging.
- **2026-09-27** — Asked which audit findings this part fixes → chose the merge subject, the HTTP 422 race, the payload rule's missing paths, one owner for release steps, the spec's stale `/ship` tagging claim, and the CHANGELOG blank lines; the other docs, specs, and checks cleanup is its own workspace.
- **2026-09-27** — Assumed: the bump level rides in the heading as `## Next (patch|minor|major) — <title>`, because the author knows the level and the heading is the one place `/ship` reads.
- **2026-09-27** — Assumed: the numbering script lives in the `ship` skill and does nothing when `CHANGELOG.md` has no entry the default branch lacks, because `/ship` is payload and installed repos have no `CHANGELOG.md`; a meta-only script would leave `/ship` naming a file targets lack.
- **2026-09-27** — Assumed: `merge.sh` catches a stale number by comparing the default branch's `VERSION` with the one at the branch's merge base, and only when the branch changes `VERSION`, because an unrelated commit on the default branch should not force another save.
- **2026-09-27** — Assumed: on a stale number `/ship` renumbers, saves, and merges again without asking, because invoking `/ship` already authorizes the merge and the save it needs.
- **2026-09-27** — Assumed: `payload.md` keeps static `paths:` globs, checked by a test against `payload-files.json`, because rule frontmatter can not be generated at load time.
- **2026-09-27** — Assumed: the numbering script finds the branch's entry as the one heading the default branch lacks, and reads a numbered entry's level from its gap to the version below, because then a renumber and a branch cut before this ships take the same path with no hand edit.
- **2026-09-27** — Assumed: `tag-releases.mjs` fails on a `## Next` heading on the default branch, because that means a release merged without a number and nothing else would say so.
- **2026-09-27** — Assumed: no wiki edit at ship, because the change and branch hold no live facts (no repeatable fact); the release steps already live in the payload rule.
- **2026-09-27** — Archive checkpoint: built all 15 tasks, archived, and numbered 26.2.0 from main 26.1.0 with the new script; the builder also reworded `wiki/stack/cloudflare-credentials.md` and `update-dependencies/SKILL.md`, which still said to raise `VERSION`, and restored a fourth missing blank line before `## 22.0.1`.
