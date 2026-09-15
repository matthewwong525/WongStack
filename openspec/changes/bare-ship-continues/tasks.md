## 1. The `/ship` runbook (`.agents/skills/ship/SKILL.md`)

- [x] 1.1 Rewrite Step 1's two "unless an intent was given" stop conditions so a bare invocation can also reach the pull-in, per `review.html#/pull-in/after/chain`
- [x] 1.2 Retitle "The pull-in: `/ship <intent>`" to cover both forms, and state them: an argument is handed to `/apply` verbatim; no argument invokes `/apply` with no argument when `/apply`'s resolve order lands on items 1–3, or when no change exists yet and the session states clear implementation intent — `review.html#/pull-in/after/chain`
- [x] 1.3 State the cold stop in the same section: item 4 (a sole active change) or unresolvable intent stops, and `/ship` reports that it found nothing to continue rather than doing nothing — `review.html#/pull-in/after/cold` and `review.html#/pull-in/after/report`
- [x] 1.4 Replace the "**Bare `/ship`** keeps every stop above exactly as before…" bullet with the uniform rule plus the named cold exception — `review.html#/docs-rule/rewritten`
- [x] 1.5 Add the incomplete-task guard to Step 2, before the `openspec-archive-change` invocation: read `tasks.md`, invoke `/apply` for that exact change when tasks are unchecked, re-check, and never archive incomplete — `review.html#/archive-guard/after/guard`
- [x] 1.6 Narrow the opening authorization sentence so it authorizes the pulled-in stage with or without an argument **and** stops covering the archive step's incomplete-task confirmation
- [x] 1.7 Update the Hard rules: the bare-`/ship` line becomes the cold-session rule, and a new line states that an incomplete change is finished, never archived
- [x] 1.8 Fix every link to the renamed section — the in-page `#the-pull-in-ship-intent` anchor at the top of the skill, and any inbound link from another payload file (`grep -rn "the-pull-in-ship-intent"`)

## 2. The pages that state the rule

- [x] 2.1 `wiki/development/the-change-loop.md` — the enter-anywhere paragraph drops "**with an intent**" so the nesting reads as one rule, with the cold stop named as its exception — `review.html#/docs-rule/rewritten`
- [x] 2.2 `wiki/development/the-change-loop.md` — the `/ship` bullet under "## The steps": replace "Bare `/ship` keeps every stop it has today" and add the incomplete-change guard in one clause — `review.html#/docs-rule/rewritten`
- [x] 2.3 `CLAUDE.md` — the verbs rule loses `<intent>` from "so `/ship <intent>` runs the whole cycle" — `review.html#/docs-rule/rewritten`

## 3. Release

- [x] 3.1 `VERSION` → `14.1.0`
- [x] 3.2 Newest-first `CHANGELOG.md` entry: what bare `/ship` now does, what still stops it, and the archive guard
- [x] 3.3 Run both release checks — `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 3.4 Confirm the files touched match `review.html#/files` — five edited, none added or removed
