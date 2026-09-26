## 1. Script

- [x] 1.1 `build-review.mjs`: after the status line, print the absolute path of `review.html` on its own line on every successful build
- [x] 1.2 `scripts/tests/review.test.mjs`: assert the two-line output for both builder aliases, and that the path line names the change's `review.html`

## 2. Skills

- [x] 2.1 `explore/references/asking-the-user.md`: add a "Write at the reader's level" section — the level lookup, the non-technical default, outcome words for questions, options, next-step asks, and blocker reports, and fix before asking; update the "finished plan" next-step example to include the review link line
- [x] 2.2 `plan/SKILL.md`: write Why and What Changes at the reader's level (link the ask convention); in Finish, end a stopping plan with "Click here to see the plan:" and a Markdown link to the path the builder printed, just above the next-step question
- [x] 2.3 `apply/SKILL.md`, `save/SKILL.md`, and `ship/SKILL.md`: lead reports with the outcome in plain words for a non-technical reader; word `/ship`'s walk-failure ask and `/save`'s "ship it" option by the ask convention

## 3. Doctrine and docs

- [x] 3.1 `AGENTS.md` `WONG-STACK` block: change the verbs rule so the person just asks and the agent runs the verbs, with the two stops, and the verbs kept as shortcuts
- [x] 3.2 `wiki/development/the-change-loop.md`: state the no-verb path and its two stops, and that an invoked verb keeps its authorization
- [x] 3.3 `wiki/wiki-style.md` People section: define the `**Technical level:**` line, when to write it, and the non-technical default
- [x] 3.4 `openspec/config.yaml`: add the proposal rule to write Why and What Changes at the reader's level; run `node scripts/check-openspec-config.mjs`
- [x] 3.5 `README.md`: say that you can just ask, and that the commands are shortcuts

## 4. Release

- [x] 4.1 Bump `VERSION` to 23.1.0 and add the `CHANGELOG.md` entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs`
- [x] 4.3 Rebuild this change's `review.html` and validate with `openspec validate plain-plans-for-everyone --strict --no-interactive`
