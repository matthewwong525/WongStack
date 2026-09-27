# Tasks

## 1. The project's Paseo file

- [x] 1.1 Add the four `metadataGeneration` instructions from the design to `paseo.json`, keeping `worktree.setup`; verify the file parses and a new test in `scripts/tests/presets.test.mjs` (or a small `paseo-json` test) checks the seed command and all four instructions are present and that the commit instructions name no version
- [x] 1.2 Add `paseo.json` to `core.files` in `.agents/skills/wong-sync/references/payload-files.json`, and add the merge rule to `payload-manifest.md` beside the hooks rule; verify `node scripts/check-payload-links.mjs` passes and `scripts/tests/server-install.test.mjs` expects `paseo.json` in the practice repo

## 2. The preset writer

- [x] 2.1 Add `.agents/skills/routine/scripts/paseo-presets.json` with the four presets (stable `wongstack-*` ids, the owner's names, icons, models, modes, thinking, and notes); verify it parses and every entry has `id`, `name`, and `provider`
- [x] 2.2 Add `.agents/skills/routine/scripts/presets.mjs` (`add`, `--dry-run`, `--home`) on `lib/paseo.mjs`, per the design: add-missing by id or name, skip a provider whose command is missing, atomic write keeping mode, `paseo reload`, one JSON report; verify with `scripts/tests/presets.test.mjs` against a fake Paseo home and fake `paseo`/`claude` on PATH covering the spec's scenarios (Claude only, an existing preset kept untouched, second run leaves the file byte-identical, no Paseo, no `config.json`, daemon down)
- [x] 2.3 Name the script in `.agents/skills/routine/SKILL.md` in one line next to `workspace.mjs`; verify `node scripts/check-payload-links.mjs` passes

## 3. Setup and the server installer

- [x] 3.1 In `.agents/skills/wong-setup/SKILL.md`, add the presets step to the install intent and the closing report; verify the wording links the script by repo-relative path
- [x] 3.2 Run the target's `presets.mjs add` from `server/install-wongstack.mjs` after the payload copy, ignoring any failure, and state it in `server/README.md`'s end state; verify `scripts/tests/server-install.test.mjs` still prints `done` with no Paseo on PATH, and a case with a fake Paseo home gets the presets
- [x] 3.3 Keep `server/README.md` and the installer inside their size budgets; verify `scripts/tests/server-setup.test.mjs` and `server-install.test.mjs` pass

## 4. Docs and release

- [x] 4.1 Extend the Paseo paragraph in `wiki/development/required-tools.md`: what WongStack sets (the project file, the presets), what it leaves alone (starting branch, new-worktree choice, auto-close after merge, agent browser), and how a teammate adds presets; verify links resolve with `node scripts/check-payload-links.mjs`
- [x] 4.2 Add a `## Next (minor) — Paseo starts with your settings` entry to `CHANGELOG.md`, with an **Updating.** line saying the sync brings `paseo.json` and to run `node .claude/skills/routine/scripts/presets.mjs add` once per computer; verify `node scripts/check-retired-names.mjs` and `node scripts/check-openspec-config.mjs` pass

## 5. Integration

- [x] 5.1 Run `/save` and verify the Payload checks and Test workflows pass in CI
- [x] 5.2 After merge, run `presets.mjs add --dry-run` on this machine and verify it reports all four presets as kept and writes nothing
