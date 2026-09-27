# Tasks

## 1. The rule's owner

- [x] 1.1 Add `### Offer a routine or an app` to `wiki/development/the-change-loop.md`, after *Just ask*: the two signals, the one memory search, routine vs mini app, the offer inside the next-step ask, the decline fact, when no offer is made, and what a yes starts. Link `/routine`, [mini apps](../../../wiki/stack/mini-apps.md), the memory skill's write gate, and the knowledge-center principle. Verify: the section reads alone and every doc it names is linked.
- [x] 1.2 Add one bullet to *End every reply with the next step* in `.agents/skills/explore/references/asking-the-user.md`: a finished task that will come back carries the offer, linked to the new section, with no second copy of the rule. Verify: the bullet only links.

## 2. The WONG-STACK block

- [x] 2.1 Add one rule to the `WONG-STACK` block in `AGENTS.md`, after *Do a plain request directly*: offer a routine or a mini app, once, when a finished task will clearly come back, linking the new section. Verify: `CLAUDE.md` shows it through the symlink and the block holds no repo-specifics.

## 3. Release

- [x] 3.1 Bump `VERSION` 25.7.0 → 25.8.0 and add a newest-first `CHANGELOG.md` entry with an **Updating** line. Verify: the entry names the rule and the two changed pages.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`, and `openspec validate offer-routine-or-app --strict --no-interactive`. Verify: all pass.
- [ ] 3.3 CI passes on the pull request, checked by `/save`.
