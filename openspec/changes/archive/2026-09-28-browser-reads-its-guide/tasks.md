# Tasks

## 1. Vendored skill

- [x] 1.1 Replace `.agents/skills/agent-browser/SKILL.md` with `skills/agent-browser/SKILL.md` from `npm pack agent-browser@0.38.1`, then re-add `disable-model-invocation: true` after `hidden: true`; confirm the diff against upstream is that one line

## 2. Point at the guide

- [x] 2.1 In `.agents/skills/verify/references/walkthrough.md`, at *Browser journey → `<id>.batch.json`*, add one sentence: run `agent-browser skills get core` (`--full` for the command reference) before writing the batch, since it matches the installed version
- [x] 2.2 In `wiki/development/home.md` *Saved browser logins*, add one sentence: load `agent-browser skills get core` before a task's first command

## 3. Release

- [x] 3.1 Add a `## Next (patch) — The browser tool reads its own current guide` entry to `CHANGELOG.md`, with an **Updating.** note saying nothing to do by hand

## 4. Verify

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`
