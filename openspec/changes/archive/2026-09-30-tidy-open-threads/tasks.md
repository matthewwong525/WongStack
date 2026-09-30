# Tasks

## 1. Digest script

- [x] 1.1 In `.agents/skills/memory/scripts/lib/digest.mjs`, add `THREAD_CAP = 8` and `THREAD_MAX_AGE_DAYS = 30`, split `digestPlan`'s ranked query into other-slug threads (under 30 days, newest first, capped) and non-thread facts, add the other-slug thread count, and have `buildDigest` print the held-back line after the threads within `MAX_LINES` and `MAX_BYTES`; verify by reading the diff against design.md's Decisions.
- [x] 1.2 In `scripts/tests/memory-store.test.mjs`, cover the three digest scenarios in the spec delta: 80 other-slug threads (5 over 30 days) plus 100 other facts show 8 threads, the held-back count, and feedback and project facts; 12 current-change threads all show first; the 400-fact cap still holds. Verify in CI through `/save`.

## 2. Write gate

- [x] 2.1 In `.agents/skills/memory/scripts/memory.mjs` `gateFacts`, add a third read per candidate for up to 3 open threads on other slugs through `FTS_HITS` and the personal filter, print them under `Open threads this may answer:` minus any already in closest matches, and extend the closing instruction to supersede an answered thread; verify by reading the diff.
- [x] 2.2 In `scripts/tests/memory-store.test.mjs`, cover the gate scenario: a candidate on one slug lists a matching open thread on another slug, and a supersede of it closes it. Include a teammate-key case where a thread only its author sees never shows. Verify in CI through `/save`.

## 3. Skill and wiki text

- [x] 3.1 In `.agents/skills/memory/SKILL.md`'s background run, add to consolidation step 2: supersede an open thread a later live fact shows was answered. In `references/writing-facts.md`'s Keep list, say a fact that answers a thread the gate lists supersedes it. Verify `node scripts/measure-context.mjs --check` passes, trimming the same files if it does not.
- [x] 3.2 In `wiki/development/memory.md`, update *When memory loads* (8 other threads under 30 days, the held-back line, older threads stay searchable), *How facts are captured* (the gate lists matching open threads), and *Consolidation* (answered threads close); verify each paragraph matches the spec delta.

## 4. Release

- [x] 4.1 Add `## Next (minor) — Keep open questions from crowding the briefing` at the top of `CHANGELOG.md`'s entries, in plain words, with no hand step to update; verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass.
