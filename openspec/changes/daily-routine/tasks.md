# Tasks

## 1. Script

- [x] 1.1 Add `.agents/skills/daily/scripts/daily.mjs` with `who`, `opened` and `open`, using `isMain`/`parseCli` from `memory/scripts/lib/cli.mjs`, `signIn`/`memoryOrigin`/`signInHelp` from `memory/scripts/lib/store.mjs`, and `schedule/scripts/workspace.mjs` to open a workspace. `who` matches the people file by its `emails` frontmatter, case-insensitive; with no app origin it uses `git config user.email` and `source: "git"`. `open` records one opening per (email, step, local day) in `<git common dir>/wong-daily/` and returns `opened`, `already` or `unsupported` (not in Paseo). Verify: `daily.test.mjs` with a fake sign-in and launcher covers valid, near, expired, missing and git-email `who`; a file listing two emails; no file; a second `open` the same day returning `already`; the next day opening again; and `unsupported` opening nothing.

## 2. Skill

- [x] 2.1 Add `.agents/skills/daily/SKILL.md` (`name: daily`, `user-invocable: true`, `disable-model-invocation: true`): run `who`; on a missing or ended sign-in run the `login` command in the background, show its link, wait, rerun `who`; read `team.md`, then the person's file; run each step due today, the `(own workspace)` ones through `open` and the rest in chat; reply with a short list of steps run, skipped and still to do, and offer to start a list to a person with none. With words after `/daily` ("add X to my daily"), edit the person's file through the change loop, creating it with their sign-in email; only the owner's review changes `team.md`. Keep private life out of the files. Link the ask convention rather than restating it. Verify: read-through against each spec scenario.
- [x] 2.2 Add `wiki/development/daily.md`: what `/daily` does, the two files and a step line's shape (the design's example), adding a step, own workspaces, and that updates keep the files. Link it from `wiki/development/README.md`. Verify: the wiki checks in `node .github/scripts/checks.mjs --worktree` pass.

## 3. Payload

- [x] 3.1 In `payload-files.json`, add `daily` to `core.skillDirs`, and `.claude/skills/daily/team.md` and `.claude/skills/daily/people` to `core.exclude`; in `payload-manifest.md`, say the install owns them, beside the `schedules/<name>.json` line. Verify: tests in the existing `install.mjs` and `preflight.mjs` suites show a fresh install leaves both out, and preflight never lists a target's `team.md` or `people/` file.
- [x] 3.2 Add `daily-routine` to `.agents/skills/memory/references/areas.json`, naming the skill, the wiki page and the spec. Verify: `memory-areas.test.mjs` passes.
- [x] 3.3 Add a `## Next (minor) — Run each person's day with /daily` entry to `CHANGELOG.md`, with an Updating note that no hand step is needed and how to add a first team step. Verify: `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` pass.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 4.2 In this checkout, add a throwaway `people/` file with the signed-in email and one in-chat step, run `/daily`, and confirm it names the person and runs the step; run `who` with the sign-in token removed and confirm the login command; delete the throwaway file. Then `/save`.
