## What and why

<!-- What this pull request changes, and why. Link the issue: Closes #123. -->

## OpenSpec change

<!-- The change folder, for example openspec/changes/<name>/. Write "none" for a typo or a small fix. -->

## Checklist

- [ ] The `test` and `payload` checks pass in CI.
- [ ] A payload file changed: `CHANGELOG.md` has a `## Next (patch|minor|major) — <Title>` entry, and `VERSION` is untouched ([release steps](https://github.com/matthewwong525/WongStack/blob/main/.agents/rules/payload.md)).
- [ ] `node scripts/check-payload-links.mjs` passes. Markdown links name `.agents/`, not `.claude/`.
