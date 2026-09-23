## 1. Skill

- [x] 1.1 In `.agents/skills/wong-sync/SKILL.md`, change the frontmatter description, the opening line, the `current`/`update`/`error` routes, the handoff description, the pre-16 migration sentence, and the ownership paragraph so an available update invokes `/plan` and a bare sync stops at the review (review.html#/sync-route)
- [x] 1.2 In `.agents/skills/wong-sync/references/adapt.md`, say the adaptation pipeline is replaced by the bounded `/explore` that `/plan` runs when `/wong-sync` invokes it

## 2. Docs

- [x] 2.1 In `AGENTS.md`, update the intro sentence about `wong-sync` and the `WONG-STACK` block's `/wong-sync` rule to say it invokes `/plan`
- [x] 2.2 In `README.md`, update the `/wong-sync` row of the command table

## 3. Release

- [x] 3.1 Bump `VERSION` to 16.7.0 and add a newest-first `CHANGELOG.md` entry
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`; confirm `grep` finds no remaining claim that sync invokes `/explore` in the skill, `AGENTS.md`, or `README.md`
- [x] 3.3 Get a green CI run through `/save`
