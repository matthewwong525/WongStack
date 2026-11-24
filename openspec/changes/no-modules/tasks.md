# Tasks

## 1. Move the folders

- [x] 1.1 Replace each `.agents/skills/<name>` link into `.agents/plugins/` with the real folder by `git mv`, per design's layout table (memory, daily, schedule, browser, hand-over, shop, access, services, and the loop's seven commands); move the loop's `scripts/` and `references/` into `.agents/loop/`. Verify `find .agents -type l` lists only `.claude`/`.codex`-style top links and `.agents/plugins/` is gone.
- [x] 1.2 Rewrite every path to `.agents/plugins/…` and `.claude/plugins/…` across skills, wiki, tests, fixtures, verification journeys, workflows, `AGENTS.md`, and `README.md` with a scratch script in `.scratch/`; turn full `https://github.com/…/blob/main/.agents/plugins/…` links back into relative links. Verify `grep -rn "plugins/" --exclude-dir=node_modules --exclude-dir=archive .` finds only history (`CHANGELOG.md`, archived changes, `retired-names.json`) and `node scripts/check-payload-links.mjs` passes.
- [x] 1.3 Update hook command paths in `.agents/settings.json` and `.agents/hooks.json` for any moved script, and drop the `codex-plugin.mjs --check` start hook. Verify each hook script path exists and a fresh chat start prints the memory digest once.

## 2. Remove the profiles and slots

- [x] 2.1 Loop: replace each `slot.mjs <part>` and `slot.mjs --run <part>` line in the seven loop skills and their references, and each `slot()` import in loop scripts, with the command or function `.agents/loop/profile.mjs` runs for that part; inline constant parts. Delete `slot.mjs`, `.agents/loop/profile.mjs`, `slot.test.mjs`, `loop-profile.test.mjs`; repoint tests that set `WONG_LOOP_PROFILE`. Verify `grep -rn "slot.mjs\|WONG_LOOP_PROFILE"` is empty and `node --test scripts/tests/` for loop, ship, save, close, and archive tests pass.
- [x] 2.2 Memory: replace the profile loader in memory's scripts with direct imports of `.agents/memory/` code (store connect, topics, steps, slug, person, lookup, tidy, archive, session start, commands); delete `.agents/memory/profile.mjs`; move code only memory's skill runs into `.agents/skills/memory/`, keep `d1/` and `areas.json`. Verify `memory.mjs recall`, `pull`, and `session-start.mjs` work and memory tests pass.
- [x] 2.3 Daily: same for `.agents/daily/profile.mjs` (schedules, person, chat name, offered choices, asked in text, prepare run, checkout), keeping the no-app test at its call site; keep install-owned files under `.agents/daily/`. Verify `daily-module.test.mjs` (renamed to what it now tests) and schedule tests pass, including the no-app Paseo path.
- [x] 2.4 Browser: same for `.agents/browser/profile.mjs` (look, wake chat, chat target, inbox, key files, send key); keep the git-ignored `.env` fallback where the inbox is missing. Verify browser, hand-over, and key-link tests pass.
- [x] 2.5 Access: read `.agents/access/slots.json` straight where code went through a slot loader. Verify Access screen and store tests pass and a missing key slot still refuses.

## 3. Remove the module extras

- [x] 3.1 Delete each module's `VERSION`, `README.md`, `references/setup.md`, and `hooks/`; delete `scripts/check-module-versions.mjs` and its CI and payload-check steps, and `module-install`, `module-hooks`, `module-versions` tests. Verify CI workflow files name no deleted script and `node scripts/payload-checks.mjs` runs.
- [x] 3.2 Move each fact a deleted README or setup guide holds that WongStack still uses into its owning wiki page (`the-change-loop.md`, `memory.md`, `daily.md`, `access-screens.md`, browsing reference); delete `wiki/maintaining/adding-a-module.md` and fix every link to it. Verify the wiki link and hub checks pass.
- [x] 3.3 Add `.agents/plugins/`, `.claude/plugins/`, `slot.mjs`, and `profile.mjs` to `scripts/retired-names.json` with their replacement. Verify the retired-names test fails on a scratch line that names one, then passes without it.

## 4. Installs

- [x] 4.1 `payload-files.json`: drop `mapped`; add the moved command folders to `skillDirs` and keep `.claude/loop` in `dirs`; update its `$comment`, `payload-manifest.md`, `install-path.mjs`, and `preflight.mjs`. Verify `install-path.test.mjs`, `setup-install.test.mjs`, and `install-cost.test.mjs` pass with the new paths.
- [x] 4.2 Add the `module-folders` step to `catch-up.md` and its preflight detection, per design's Installs section; keep `codex-plugin.mjs` as the update's last step for installs older than 61.0.0, and update `wong-sync/SKILL.md`. Verify a preflight test on a 61.x-shaped fixture reports `module-folders` and a current fixture does not.
- [x] 4.3 Write `CHANGELOG.md` `## Next (major) — WongStack is one stack` with an **Updating.** note in plain words, including that an open branch moves a new file under the old folder by hand. Update `.agents/rules/payload.md` and `wiki/maintaining/repo-layout.md` for the new layout.

## 5. Checks

- [x] 5.1 Run the full test suite, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check` (record the lower baseline). Verify all pass.
- [x] 5.2 Run a scratch install from the branch into an empty folder, and a sync of a 61.x install fixture; verify each command loads by its bare name, `/plan` sets the chat title, `memory.mjs recall` answers, and no file under `plugins/` or any `profile.mjs` is left.
- [ ] 5.3 `/save` and check the CI gate passes.
