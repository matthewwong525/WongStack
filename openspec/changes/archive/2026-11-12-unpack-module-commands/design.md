# Design

## Context

The payload inventory's `mapped` entries send a source folder to its install folder: `.claude/plugins/daily` → `.claude/skills/daily`, and the loop's seven `skills/<command>` folders each to `.claude/skills/<command>`; the longest entry wins (`pairFor`). `install-path.mjs` owns where a file lands (`installPath`) and its text there (`installText`: relative links, imports, and `.claude/plugins/…` repo paths). Setup (`install.mjs`), the preflight, `merge-check.mjs`, the `install-path.mjs` copy command, and `check-payload-links.mjs` all read the same pairs, so a new pair reaches every one.

Daily, the browser, and Access keep their commands in `skills/<command>/` and load them as a plugin: `/daily:schedule`. The host loads a plugin only in a trusted folder, and RelayEverything turns `daily@skills-dir` off. The source names the commands' files through the module in many forms the text rewriter does not see:

- `join(dirname(…), '../skills/hand-over/scripts/hand-over.mjs')` and `new URL('../skills/schedule/scripts/workspace.mjs', import.meta.url)` in the module's own scripts;
- `node .agents/skills/daily/skills/schedule/scripts/schedule.mjs finish …` built as a string in `hosts.mjs`;
- `update.mjs`'s `VIEWER_PIN` and `SHOP_PIN`, `.agents/memory/session-start.mjs`'s `TIDY`, and `areas.json` paths;
- `H=` and `S=` shell lines in the browser's guides, outside `ROOTED`'s `node ` and `--show-toplevel)/` prefixes.

## Goals / Non-Goals

**Goals:** each nested command loads by its bare name in every chat of a WongStack install, once; every shipped text names it that way; an older install moves by the normal update; no script path changes.

**Non-Goals:** the module-alone copy (a repo without WongStack copies the folder as is, by each module's `references/setup.md`); the meta-repo's own layout and `/daily:schedule`; a record option to keep the nested layout.

## Decisions

1. **Move only `SKILL.md`.** One `mapped` entry per command's file: `".claude/plugins/daily/skills/schedule/SKILL.md": ".claude/skills/schedule/SKILL.md"`, and the same for `browser/skills/hand-over`, `browser/skills/shop`, and `access/skills/services`. The file entry is longer than the module's, so it wins. Its relative links (`references/run.md`) are rewritten by `installText` to `../daily/skills/schedule/references/run.md`; its `node .claude/skills/daily/skills/schedule/scripts/…` lines stay true, because the scripts stay. The plugin's `skills/schedule/` then holds no `SKILL.md`, so the host loads the command once, as `/schedule`, with or without the plugin.
   *Alternative:* move the whole folder. Rejected: every path form listed in Context would need its own rewrite, and a miss breaks a script only at run time.
2. **A mapped entry may name a file.** `installPath` and `pairFor` already treat `path === from` as inside. `preflight.mjs` `listTree` and `check-payload-links.mjs`'s walk list the file itself when the entry is a file, not a folder. `install.mjs` `targetFiles` already uses `under()`, so it needs no edit. `skillMappings` and `targetPathFor` stay as they are: the record's rename of `schedule` maps `.claude/skills/schedule/SKILL.md` like any top-level skill.
3. **`installText` renames the command.** For each file pair `.claude/plugins/<module>/skills/<command>/SKILL.md` → `.claude/skills/<name>/SKILL.md`, every shipped text file (`.md`, `.mjs`, `.js`, `.sh`) has `/<module>:<command>` replaced with `/<name>`, not only files in a mapped folder: `AGENTS.md`'s block, wiki pages, and `daily.mjs`'s reminder line all name it. The match needs no word character or `/` before it, so a web address is left alone. The module-alone test passes `installText` the pairs without the file entries, so a lone copy keeps `/daily:schedule`.
4. **Default for every install.** No record field. A clash with a project's own skill shows as an `added` unit with `locally-adapted` local state at `.claude/skills/<name>/SKILL.md`, which the update plan already names; the record's `components.skills` rename resolves it.
5. **An older install moves by the normal comparison.** The base commit's unit is keyed `file:.claude/skills/daily/skills/schedule/SKILL.md` and the current one `file:.claude/skills/schedule/SKILL.md`, so the preflight reports one `removed` and one `added`; the sync plan moves the file and keeps local edits. No catch-up code.
6. **A test guards new commands.** A payload test fails when a module folder under `.agents/plugins/` other than the loop has `skills/<command>/SKILL.md` with no file entry, or an entry whose target name collides with another shipped skill.
7. **Release level `major`:** a typed `/daily:schedule` stops working in installs. The **Updating.** note says to type `/schedule`, and that `/wong-sync` moves the files.

## Risks / Trade-offs

- **The host might warn about a plugin `skills/<command>/` folder with no `SKILL.md`.** Task 4.2 installs into a scratch repo and opens Claude Code there, trusted and untrusted, to see the command list. If it warns, the fallback is a plugin `skills` path in `plugin.json` that names an empty folder, decided then.
- **Daily's standalone guide reads oddly in an install.** `references/setup.md` step 5 says to change `/schedule` to `/daily:schedule`; the rename would make it `/schedule` to `/schedule`. The guide stops at step 1 in a WongStack install, but task 3.3 rewords the step so it reads true in both.
- **`/schedule` is a retired name in the source.** `scripts/retired-names.json` fails on a live `/schedule`. Source docs name the rule as `/<command>`; the CHANGELOG entry gets an `allow` if the check reads it.
- **Two sources of the same command name.** In a trusted install where the plugin loads, the plugin has no `SKILL.md` for the command, so only the top-level one loads. In the meta-repo nothing changes.

## Post-deploy check

After the merge, RelayEverything's own change (`wongstack-59-update`, workspace *unruly-donkey*) syncs again and checks `/schedule` in a new Paseo workspace there.
