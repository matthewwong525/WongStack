# Tasks

## 1. Skills

- [x] 1.1 In `.agents/skills/explore/SKILL.md`, rewrite *The exit round* so questions before planning may take follow-up groups while a material choice stays open (same bar, per-group tool capacity, never re-ask, stop when nothing is open, minor gaps assumed); keep the heading text. In *When `/plan` invokes `/explore`*, drop "with one chance to ask" and "not yet done", and make the standalone *Plan it* hand-off say the bounded pass asks only what is still open. Verify the `asking-the-user` delta's two scenarios are covered.
- [x] 1.2 In `.agents/skills/plan/SKILL.md` *Explore first*, replace "the plan's only question round" with a link to the exit round's rule, and log every follow-up answer as an `Asked` line.
- [x] 1.3 In `.agents/skills/wong-sync/SKILL.md`, say an `update` goes straight into `/plan` with no standalone `/explore` or *Plan it?* stop, and replace "the one question round" with the exit round's rule.
- [x] 1.4 In `.agents/skills/wong-sync/references/payload-manifest.md` *Planning an update*, add a line: go straight into `/plan`; when the installed skill says `/explore`, run it as `/plan`'s bounded pass and never stop at *Plan it?*. Verify the `wong-sync` delta's scenario is covered.
- [x] 1.5 In `.agents/skills/improve/SKILL.md`, allow a follow-up multiple-choice group before selecting when an answer opens another material choice. Verify the `repository-improvement` delta.

- [x] 1.6 In `.agents/skills/explore/references/asking-the-user.md` *End every reply with the next step*, make the finished-plan options *Build it now (Recommended)* / *Build and publish* / *Review the plan* / *Stop here*, where *Build and publish* runs `/ship`. Verify the `change-loop` delta's new scenario is covered.

## 2. Docs

- [x] 2.1 In `wiki/development/the-change-loop.md`, update *Asking before drafting* and *The steps*' `/explore` bullet to follow-up rounds, linking the exit round rather than restating it. Verify the page reads in [our voice](../../../wiki/voice.md).
- [x] 2.2 In `wiki/development/the-change-loop.md` *Just ask* step 1 and the `AGENTS.md` rule *A person just asks*, name the *Build and publish* choice at the plan's stop, keeping the rule to one line.
- [x] 2.3 Search the payload for leftover "one round", "one question round", "only question round", "one chance", and "second group" wording and fix each.

## 3. Release

- [x] 3.1 Add a `## Next (minor) — Plans ask until they're clear, and publish in one pick` entry at the top of `CHANGELOG.md`, with an **Updating.** line saying nothing to do by hand. Verify `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs` pass.
