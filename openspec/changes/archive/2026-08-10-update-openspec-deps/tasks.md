# Tasks: update-openspec-deps

## OpenSpec layer

- [x] Upgrade the global CLI to `@fission-ai/openspec@1.8.0`
- [x] Switch the profile to core (`openspec config profile core`) — adds the `update` workflow
- [x] Regenerate with `openspec update`: six pristine `openspec-*` skills, `opsx/*.md` commands
      deleted, `.claude/skills/.openspec-target` marker added
- [x] Verify `openspec list` and `openspec doctor` are clean under 1.8.0

## Skills and docs

- [x] Drop the local re-graft in `openspec-apply-change` — `/apply` owns the `/save` handoff
- [x] Rewrite the manifest's `openspec-*` entry: pristine-skills rule, six skills, no opsx dir
- [x] Update the five→six skill count in `CLAUDE.md`, `wiki/development/the-change-loop.md`,
      and `.claude/skills/wong-setup/SKILL.md`

## Release

- [x] Bump `VERSION` to 11.3.0
- [x] Add the 11.3.0 `CHANGELOG.md` entry
- [x] `node scripts/check-payload-links.mjs` passes (no dead links)
