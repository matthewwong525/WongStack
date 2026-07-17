## 1. Author the contribute-wong-stack skill

- [x] 1.1 Create `.claude/skills/contribute-wong-stack/SKILL.md` with frontmatter (`name`, `description`, `user-invocable: true`) describing the upstream-only contribute-back flow
- [x] 1.2 Write Step 0 — resolve `$WS` (the WongStack clone) mirroring `install-wong-stack` Step 0 (symlink target / `$HOME/src/WongStack` clone / optional path arg), and stop if `$WS` == current repo
- [x] 1.3 Write the manifest-scoped diff step — enumerate the payload set by reference to the installer's enumeration (skills except both meta-skills, `opsx/`+`openspec-*`, `.claude/hooks/auto-push.sh`, `docs/wiki-style.md`+`voice.md`+`development/secrets.md`, and the `CLAUDE.md` `WONG-STACK` block; VERSION/CHANGELOG/settings.json Stop entry explicitly excluded); compare target→`$WS`, surface only drifted files, compare `CLAUDE.md` block-scoped only
- [x] 1.4 Write the per-file confirmation loop — show each diff, ask keep-WongStack / take-from-repo / skip, apply approved changes into `$WS` only
- [x] 1.5 Write the release ritual — on ≥1 applied change, bump `$WS/VERSION` (semver) and add a newest-first `$WS/CHANGELOG.md` entry; skip entirely when zero changes approved
- [x] 1.6 Write the close — verify `$WS` was clean before applying (warn otherwise), leave `$WS` dirty, do NOT run git, and tell the user to run `/save` in `$WS`; add the guardrail line that only manifest files are ever read/copied

## 2. Update install-wong-stack to treat contribute as a source-only meta-skill

- [x] 2.1 In `install-wong-stack/SKILL.md`, exclude `contribute-wong-stack` from the copied payload alongside the installer (the copy loop skips **both** meta-skills; update-path and hard-rule wording too)
- [x] 2.2 Offer to symlink `contribute-wong-stack` into the target the same way the installer offers to symlink itself, and note it in the closing guidance

## 3. Wire it into the repo's own docs and conventions

- [x] 3.1 Add `/contribute-wong-stack` to the skill list / `WONG-STACK` block context in `CLAUDE.md` where the workflow skills are described
- [x] 3.2 Mention the upstream/contribute-back path in `README.md` (the user story: improve in a target repo, push back to WongStack)

## 4. Release ritual for this change (in WongStack itself)

- [x] 4.1 Bump `VERSION` (minor: new skill) per semver — 4.2.0 → 4.3.0
- [x] 4.2 Add a newest-first `CHANGELOG.md` entry describing the new `contribute-wong-stack` skill and the installer change
