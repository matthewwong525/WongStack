# Tasks

## 1. The install map

- [x] 1.1 `.agents/skills/wong-sync/references/payload-files.json`: add the four `mapped` file entries (`daily/skills/schedule`, `browser/skills/hand-over`, `browser/skills/shop`, `access/skills/services`, each `…/SKILL.md` → `.claude/skills/<command>/SKILL.md`), and say in `$comment` that a file entry moves one command's `SKILL.md`.
- [x] 1.2 `.agents/skills/wong-sync/scripts/install-path.mjs`: `installText` renames `/<module>:<command>` to `/<name>` for each file pair, in every text file (design decision 3).
- [x] 1.3 `.agents/skills/wong-sync/scripts/preflight.mjs` `listTree` and `scripts/check-payload-links.mjs`'s mapped walk: list a mapped file entry itself. Confirm `install.mjs` needs no edit (`merge-check.mjs`: task 1.5).

- [x] 1.4 `preflight.mjs` `compareSelection`: read the base value with the base inventory's mapped pairs and the current value with the current ones, and skip a unit with an unchanged blob only when the two pair lists are equal. Today both sides use the current pairs, so a file whose source is unchanged but whose install text changes (`AGENTS.md`'s block, wiki pages, `daily.mjs`, all naming `/daily:schedule`) is never reported, and a moved `SKILL.md` reads `locally-adapted` though the install never touched it. Check `merge-check.mjs`: its added lines stay read with the current pairs.
- [x] 1.5 `merge-check.mjs`: take a `locally-adapted` file's added lines from a diff of its two install texts (base text with the base pairs, current text with the current pairs), not of the two blobs, so a file whose source is unchanged but whose install text renames `/daily:schedule` is still checked.
- [x] 1.6 `.agents/memory/areas.json` `schedule` and `daily-module` definitions: name the command without the module prefix (such as *Daily's schedule command*), because the JSON ships as is and the rename reads only text files.

## 2. Tests

- [x] 2.1 `scripts/tests/install-path.test.mjs`: a file entry wins over its module's folder; `SKILL.md`'s relative links point back into the module; `/daily:schedule` becomes `/schedule` in Markdown and a script, and a web address is left alone; a record rename maps the top-level folder.
- [x] 2.2 A payload test: every `.agents/plugins/<module>/skills/<command>/SKILL.md` outside the loop has its file entry, and no entry's target collides with another shipped skill.
- [x] 2.3 `scripts/tests/module-install.test.mjs`: install a module alone by its pairs without the file entries, so the one-folder and `/daily:schedule` checks keep their meaning.
- [x] 2.4 Setup and preflight tests: a fresh install has `.claude/skills/schedule/SKILL.md` and no `daily/skills/schedule/SKILL.md`; an install at the 59.0.0 layout gets one `removed` and one `added` unit for each moved file.

- [x] 2.5 `scripts/tests/wong-sync-preflight.test.mjs`: from a base with only the module pair to a current with a file pair, an unchanged-source file naming `/daily:schedule` is reported `modified` and `installed-equivalent`, and the moved `SKILL.md` is `removed` with `installed-equivalent`. Equal pairs skipping an unchanged blob has no test: a skipped read and an equal value give the same result.
- [x] 2.6 `scripts/tests/wong-sync-merge-check.test.mjs`: an edited install page naming `/daily:schedule`, unchanged in source, reports the renamed line `missing`. In `wong-sync-preflight.test.mjs`, drop the equal-pairs claim that no result can show (or count the reads), and say so in task 2.5's wording.

## 3. Docs and release

- [x] 3.1 `wiki/maintaining/adding-a-module.md`: a WongStack install also gives each nested command's `SKILL.md` its own top-level folder and bare name, and why (an untrusted folder loads no plugin); a new nested command needs its file entry. Name the command as `/<command>`, not a retired name.
- [x] 3.2 `.agents/skills/wong-sync/references/payload-manifest.md` line on `mapped`, and `wiki/development/daily.md` where it names the command: in an install it is `/schedule`. Offset any added skill words (`node scripts/measure-context.mjs --check`).
- [x] 3.3 `.agents/plugins/daily/references/setup.md` step 5: reword the AGENTS.md rename so it reads true after the install's rename.
- [x] 3.4 `CHANGELOG.md`: a `## Next (major) — /schedule works in every chat again` entry, its **Updating.** note in plain words; add a `retired-names.json` `allow` if its check reads the entry.

## 4. Checks

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, retired names, OpenSpec config, context measure, script tests).
- [x] 4.2 Install into a scratch repo with `install.mjs`; open Claude Code there, untrusted and trusted, and confirm `/schedule` shows once, `/daily:schedule` does not, and no plugin warning shows. Record the result in the Decision log.
- [x] 4.3 Run the preflight from this checkout against a scratch copy of a 59.0.0 install and confirm the four moves show as `removed` + `added` pairs.
