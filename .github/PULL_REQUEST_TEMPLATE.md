## What and why

<!-- What this pull request changes, and why. Link the issue: Closes #123. -->

## OpenSpec change

<!-- The change folder, for example openspec/changes/<name>/. Write "none" for a typo or a small fix. -->

## Checklist

- [ ] The `test` and `payload` checks pass in CI.
- [ ] A payload file changed: `VERSION` is bumped and `CHANGELOG.md` has a new entry ([release steps](https://github.com/matthewwong525/WongStack/blob/main/wiki/contributing.md)).
- [ ] `node scripts/check-payload-links.mjs` passes. Markdown links name `.agents/`, not `.claude/`.
