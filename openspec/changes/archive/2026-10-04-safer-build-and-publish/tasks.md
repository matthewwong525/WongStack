# Tasks

## 1. Skill wording

- [x] 1.1 In `.agents/skills/apply/SKILL.md`, make the question stop log the person's answer as an `Asked` Decision-log line before starting a new helper, and make step 4's report repeat the plan's can't-be-undone line when it has one. Verify both clauses read as design.md decides and every existing link and heading in the file is unchanged.
- [x] 1.2 In `.agents/skills/plan/SKILL.md`, add one clause so What Changes says in one plain line when the change deletes or reshapes data, sends a message, or removes a key, and stays silent otherwise. Verify the file's headings are unchanged.
- [x] 1.3 In `.agents/skills/save/references/git-gate.md`, replace the auto-fix loop's opening sentence: list every failing check and the cause its log shows, fix all in one push, and give a failure outside the diff one re-run, then stop without a code edit. Verify the three-attempt cap, the `--no-verify`/`--force` ban, and the `#the-auto-fix-loop` heading are unchanged.
- [x] 1.4 Trim offsetting words inside those three files only, removing no linked heading and no behaviour a spec promises. Verify `node scripts/measure-context.mjs --check` passes and `git diff --stat` shows no file under `.agents/skills/continue/`.

## 2. Release

- [x] 2.1 Add a `## Next (minor) — Safer building and publishing` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note that no hand step is needed; leave `VERSION` alone. Verify `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs` pass.
