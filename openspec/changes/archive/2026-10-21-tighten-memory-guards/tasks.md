# Tasks

## 1. The memory Worker's guards

- [x] 1.1 In `.agents/skills/memory/worker/statements.mjs`, make `shadowCtes` define `__mem_facts` with today's filter and `facts`, `fact_tags` read from it. Add `SHADOW_FTS_HITS`, and have `shadowRead` replace each exact `FTS_HITS`/`LEGACY_FTS_HITS` with it before prepending. Make `readRefusal` refuse any read containing `__mem_` (any case). Reword the `OWN_SHADOW` comment as an extra refusal. Done when source review shows no non-admin search fragment still reads `facts` (design §1).
- [x] 1.2 In `statements.mjs`, add `RUN_WITH_OWNER` and a helper that rewrites every caller's `WRITES.run` to it with `caller.subject` (NULL for a schedule or an old key). Give `memberStatements` a `now`: a fact insert keeps param 5 only when it is a plain UTC ISO timestamp no later than `now`, otherwise `now` (design §2, §4).
- [x] 1.3 In `.agents/skills/memory/worker/memory-worker.mjs`, pass `env` to `keyCaller` and refuse a key when `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` is set. Treat a set but unparsable `expires_at` as expired. In `query()`, pass `now` and apply the run-owner rewrite for admins too (design §2, §3).
- [x] 1.4 Add `.agents/skills/memory/migrations/0009_run_owner.sql` (`runs.owner_subject`, `runs_owner` index), in the style of `0008`. Done when `memory.mjs migrate` on the test fixture applies it once and a rerun applies nothing.
- [x] 1.5 In `scripts/tests/memory-worker.test.mjs`, reproduce each finding's payload as a regression test:
  - all four bypass reads from the search finding (comment after the name, comment after `AS`, single-quoted name, column list with a comment), each probing for a teammate's private `user` fact by a whole word and an `FTS5` prefix. Each is refused or returns no id of that fact.
  - a read naming `__mem_facts` gets 403; a member's ordinary and legacy-fragment searches still find a shared fact.
  - a reader's run row is stored under the reader's subject, whatever its params say.
  - a wongm_ key with Access ids set gets 401 on `/caller`, a facts read and a transcript GET; the same key with no Access ids answers as admin; a key whose `expires_at` is `not-a-date` gets 401.
  - a member's and a schedule's fact dated `2999-12-31T00:00:00Z` or `Tue Oct 20 2026` is stored at Worker time; a past ISO date is kept; an admin's future date is kept.
- [x] 1.6 In `0009_run_owner.sql`, mark every run saved before it `legacy:unowned`, an owner no sign-in has, so no schedule (NULL) reads them (review fix; design §2).
- [x] 1.7 In `statements.mjs`, add `runs AS (SELECT * FROM main.runs WHERE owner_subject IS <subject>)` to `shadowCtes`, NULL bound as `IS NULL`, and add `runs` to `OWN_SHADOW`'s names (review fix, user's decision; design §2).
- [x] 1.8 In `memory-worker.test.mjs`: a reader's, a member's and a schedule's `SELECT host, reason, owner_subject FROM runs` returns only their own rows (no `legacy:unowned` one), the admin's returns all. On a store without 0009, a member read that never names `runs` still works and one that does gets 400.

## 2. The digest and the dream

- [x] 2.1 In `.agents/skills/memory/scripts/lib/digest.mjs`, harden `formatRun` by design §2. Scope the run read to `owner_subject IS ?` with `store.owner`, and replace `CONSOLIDATION_STATE` with `consolidationState(owner)`. Update its callers in `memory.mjs` (`due`, and the consolidation-counts read) to the same scope.
- [x] 2.2 In `.agents/skills/dream-memory/scripts/dream.mjs`, make `isDreamFact` (still one argument) reject a future `created_at` and a `#N` at or above the fact's own id.
- [x] 2.3 Add digest regression tests in `scripts/tests/memory-store.test.mjs`:
  - a reader's run row, with the finding's multi-line reason and fake `## You` and `## Live facts` lines, never appears in a member's digest built through the Worker.
  - the reader's own digest shows it as one line of at most 300 reason characters.
  - a 20,000-character reason keeps the digest within `MAX_BYTES` with the team fact still shown.
  - `counts` of `not-json` gives no run line and no throw.
  - a reader's future `ok` consolidation row doesn't make a member's consolidation not due.
  - `counts` of `not-json` on a consolidation row: `stats` counts it as 0 merged and doesn't throw.
  - a run saved before 0009 (a forged `2999-12-31` consolidation and a failed capture) is marked `legacy:unowned` by `migrate`, and never reaches a schedule's digest, `stats` or consolidation clock, nor a member's digest.
- [x] 2.4 Add dream regression tests in `scripts/tests/dream.test.mjs`. Feed the finding's forged facts (dated `2999-12-31`, claiming `#999999999`, and a same-day one claiming an id above its own) beside an honest dream. `lastDream`, `dreamChecks` and `pageList` keep the honest cursor and page dates. `facts.filter(isDreamFact)` doesn't throw.
- [x] 2.5 In `dream.mjs`, `isDreamFact` keeps a record only when its `created_at` is a plain UTC timestamp (the Worker's `PLAIN_UTC`, now exported from `statements.mjs`) and `Date.parse` puts it at or before now. In `memory.mjs` `stats`, a consolidation's `counts` that isn't JSON, or whose `merged` isn't a number, counts as 0 (review fixes; design §2, §4).
- [x] 2.6 Extend 2.3 and 2.4's tests: forged dream records dated `Tue Oct 20 2026` and `zzzz` leave `lastDream`, `dreamChecks` and `pageList` on the honest cursor, and a fact without a date is no dream; the `stats` and pre-0009 digest cases above.

## 3. Setup turns the key off when the app goes private

- [x] 3.1 In `.agents/skills/wong-setup/scripts/provision.mjs`, after the config block, when the run leaves the install private and `.env` holds this machine's memory key: run `memory.mjs migrate-people`, remove the `CLOUDFLARE_MEMORY_TOKEN` line, and note it. Under `--keep-config`, add a `todo` instead (design §3).
- [x] 3.2 In `scripts/tests/provision.test.mjs`, run open until the card, then the card-later rerun. `.env` has no `CLOUDFLARE_MEMORY_TOKEN`, every `memory_keys` row has an expiry, and the report names the key turned off. A rerun that stays open keeps the key.
- [x] 3.3 Add the sentence to `.agents/skills/wong-setup/references/cloudflare.md#adding-the-card-later`. Update `wiki/development/memory.md`: the open-app key bullet (refused once the app has a sign-in, removed by the rerun) and the background-run line (your own runs only).

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Memory guards hold against crafted searches, old keys and future dates` entry to `CHANGELOG.md`. Its **Updating.** note, in plain words, says: before publishing, the admin runs `memory.mjs migrate` once, which records who wrote each background run; if memory still used an old key on a private app, it now asks for the company sign-in, and `memory.mjs migrate-people` gives waiting notes to their people.
- [x] 4.2 Make the **Updating.** note match the review fixes: runs saved before the update reach no one, so everyone's run line, a schedule's too, is empty until their next run; a copy that skips `migrate` keeps searching and saving, but its start-of-chat summary and background-run records fail until the admin runs it.

## 5. Verification

- [x] 5.1 Run `node --test scripts/tests/memory-worker.test.mjs scripts/tests/memory-store.test.mjs scripts/tests/dream.test.mjs scripts/tests/provision.test.mjs` and fix what fails.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, context measure, retired names) and fix what fails.
- [x] 5.3 As the admin, run `node .claude/skills/memory/scripts/memory.mjs migrate` from this branch against the live store before `/ship` merges (staging serves no memory, so the preview can't show it), and confirm `0009` is recorded.
