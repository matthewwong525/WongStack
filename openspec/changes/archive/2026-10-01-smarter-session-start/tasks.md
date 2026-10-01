# Tasks

## 1. Digest script

- [x] 1.1 In `.agents/skills/memory/scripts/lib/digest.mjs`, remove the other-slug thread statement, `THREAD_CAP`, and `THREAD_MAX_AGE_DAYS`; add `VERB_TAGS` and the per-tag count statement, and print the by-step line with its tag-search instruction; add the person section with `PERSON_MAX_BYTES = 1536` and its `The rest: <path>.` line, reading `personPage(ctx)` once; and reword the header into the search prompt, all by design.md's Decisions. Verify by reading the diff against the spec delta.
- [x] 1.2 In `scripts/tests/memory-store.test.mjs`, rewrite the 80-thread test to the modified scenario (no other-slug thread listed, the count line, feedback and project facts shown), add the two people-page scenarios (a 3 KB page cut at 1.5 KB with its path line; no page, no section, header prompt present), and a scenario where threads tagged `plan`, `save`, and none give the by-step counts and `search --type thread --tag plan` returns only the `plan` ones. Update any `memory-capture.test.mjs` assertion on the header text. Verify in CI through `/save`.

## 2. Memory skill text

- [x] 2.1 In `.agents/skills/memory/references/writing-facts.md`'s *Unanswered questions* line, add: tag the verb or skill whose next run should check it. In `.agents/skills/memory/SKILL.md`'s consolidation step, add: restate an open thread that names a verb's next run but has no verb tag, superseding it with the same body and the tag. Verify `node scripts/measure-context.mjs --check` passes, trimming the same files if it does not.

## 3. Wiki

- [x] 3.1 In `wiki/development/memory.md`, rewrite *When memory loads*: what the digest holds (current change's threads, the by-step thread counts, your people page, then facts), that the agent searches memory once it knows the task, and that a verb loads its own threads when it starts; add to *Consolidation* that untagged threads are restated with their verb's tag. Verify it matches the spec delta and that `node scripts/check-payload-links.mjs` passes.

## 4. Release

- [x] 4.1 Add `## Next (minor) — Load what matters at session start` at the top of `CHANGELOG.md`'s entries, in plain words, with no hand step to update. Verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.
