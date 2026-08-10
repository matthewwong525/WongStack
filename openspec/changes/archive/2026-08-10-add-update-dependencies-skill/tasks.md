## 1. The skill

- [x] 1.1 Create `.claude/skills/update-dependencies/SKILL.md` with frontmatter (name `update-dependencies`, a description whose triggers cover "update dependencies", "bump the tools", "are we on the latest OpenSpec", "upgrade the app deps") and an opening that states the verb is **meta-repo-only** and **on-demand**.
- [x] 1.2 Write the **Survey** stage: report installed vs latest for the OpenSpec CLI, `agent-browser`, `gh`, `git`, `node`, every dependency in `app/package.json`, and the generated `openspec-*` skill layer — as one `old → new` table, marking already-current entries as current rather than omitting them. Include the no-op exit when nothing is out of date.
- [x] 1.3 Write the **Machine** stage: update the globally installed tools to latest and report each `old → new`. Follow [required-tools](../../../wiki/development/required-tools.md) for what each tool is and link rather than restate.
- [x] 1.4 Write the **Regen** stage: run `openspec update`, then the ripple check — compare generated skill and command names/counts against the payload prose that cites them, and run `node scripts/check-payload-links.mjs`. End the stage by answering "is this run a release?" explicitly in both directions.
- [x] 1.5 Write the **Deps** stage: bump `app/` to latest including majors, read each major's changelog or migration guide, and apply the migration to this repo's code. State that no major is skipped and no bump is approved individually.
- [x] 1.6 Write the **Hand off** stage: the skill runs no git; it hands the diff to `/save`, CI is the gate, and failures are fixed through `/save`'s auto-fix loop. State that CI coverage is the ceiling on what is verified, and do not claim majors are proven safe.
- [x] 1.7 Add the scoping paragraph: the skill is deliberately absent from [the payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md), that omission is what keeps `/wong-sync` from delivering it to targets, and editing this skill alone needs no `VERSION` bump or `CHANGELOG.md` entry — while any payload file a *run* touches does.
- [x] 1.8 Check the skill against the spec's scenarios in `specs/dependency-currency/spec.md`: nothing-out-of-date run, scheduled-run request, new major, red CI, honest-confidence report, CLI upgrade that adds a generated skill, generated-only regeneration, target-repo sync, manifest-omission question.
- [x] 1.9 Confirm the skill restates no doctrine another file owns — the gate, the release rules, the manifest contents — and links to the owner instead, per [payload-single-source](../../../openspec/specs/payload-single-source/spec.md).

## 2. Deliberately unchanged

- [x] 2.1 Confirm `.claude/skills/wong-sync/references/payload-manifest.md` gains **no** entry for this skill, and that no other manifest-adjacent list picks it up.
- [x] 2.2 Confirm the `VERSION`/`CHANGELOG.md` treatment is correct. **Revised during apply:** the premise that this change touches no payload file was falsified by task 3.1 — running the verb end to end bumped `app/`, and `payload-files.json` ships the whole `app` dir under `scaffold`. Adding the skill still warrants nothing on its own; the change carries a `VERSION` bump and a `CHANGELOG.md` entry because *the run* is a release, exactly as the skill's Stage 3 requires. Record the distinction in the Decision log at checkpoint time.

## 3. Verification

- [x] 3.1 Invoke `/update-dependencies` once end to end in this repo and confirm the five stages run, the survey report is complete, and the release question is answered — verified via `/save`.
- [x] 3.2 Confirm the run's own diff passes CI and that any payload file it touched carries the `VERSION` bump, `CHANGELOG.md` entry, and passing `node scripts/check-payload-links.mjs` that the release rules require — verified via `/save`.
