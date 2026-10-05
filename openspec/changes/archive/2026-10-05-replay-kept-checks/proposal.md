# Keep passed preview checks and replay them before publishing

**Status:** ready-to-ship

**Branch:** e2e-testing

**Open questions:** none

## Why

Every preview check is written fresh by the assistant and thrown away after. Nothing ever looks at an old feature again, so a change can break one and nobody hears until someone trips over it. Re-checking old features with AI each time was ruled out as too slow. A recorded check replays in seconds with no AI, and staging now starts every check from the same sample data, which is what a replay needs.

## What Changes

- **Old features are replayed before a change goes live.** The check before publishing replays every kept check it has time for, with no AI. It stops after 2 minutes. The areas your change touches go first, and any that did not fit are named. A replay that looks different gets one fresh look from the assistant.
  ```text
  checks ─▶ preview check ─▶ +replay ─▶ live
                                │ differs
                                ▼
                          +one fresh look
                           │           │
                         holds      broken
                           ▼           ▼
                      update it     +fix it
  ```
- **A passed check is kept.** When the check before publishing passes a promise about a page or a request, it saves the clicks and what the page showed, beside your code. It is kept only after it replays cleanly once, by itself, from fresh sample data. One that does not is named and left out.
- **A change that breaks an old feature fixes it.** When the fresh look finds an old promise no longer holds because of your change, the assistant fixes it, saves, and replays that check, without stopping to ask. It stops and asks only when two tries did not fix it, or when the break does not come from your change: fix it first, or publish anyway. When the promise still holds and only the page changed, such as a renamed button, the kept check is updated and nothing stops.
- **A change that alters a screen updates its own kept check.** A promise your change rewrites is not replayed. It is checked fresh as usual and kept again. A promise your change removes takes its kept check with it.
- **Some checks are never kept.** One that needs your login, triggers an outside service or a timed job, or carries a password stays a one-time check.
- **Publishing takes a little longer.** Up to 2 minutes for the replay, and one more short save when a check was kept or updated. A fix for a broken old feature adds its own save and re-check. Checks you run in the middle of a change stay as fast as today, and replay only if you ask.
- **Unchanged:** a check that cannot run still never holds a change up. No new tool is installed, no AI key is needed, and nothing is added to your project's dependencies. A project whose staging cannot be rebuilt from sample data keeps and replays nothing, and the check says so.

**Non-goals:** Adopting the e2e test tool or any other test tool. Replaying on every save, in mid-change checks, or on a nightly schedule. Replaying against the live app. Walking through features that already shipped to give them kept checks: the set grows from use. Kept checks for phone apps, for facts read from the database, or for evidence taken from the automatic checks. Video.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a passed browser or request journey is kept as a replayable check in the project; kept checks replay with no model inside `/ship`'s walk, within two minutes; a changed replay gets one fresh walk; a broken older promise is repaired when the branch caused it, else a `FAILURE`; the walk may now leave kept checks in the working tree inside `/ship`; the declined-options record changes from *a saved test suite* to *an in-repo test framework*.
- `delivery-gate`: `/ship` saves the kept checks its walk wrote and merges that commit only when its gate passes.

## Impact

- Skills: `.agents/skills/verify/` (a new `scripts/verify-journeys.mjs`; short additions to `SKILL.md` and `references/walkthrough.md`), `.agents/skills/ship/SKILL.md` (Step 4 carries kept checks through one save).
- Project files the walk writes: `.agents/verification/journeys/<capability>/<id>.json`, beside the existing verification recipes. Installs own these files; the payload ships none.
- Tests: a new `scripts/tests/verify-journeys.test.mjs` against the practice site, with the existing fake browser.
- Docs: `wiki/development/staging-walkthrough.md` (kept checks, the reasons, the look at e2e), `wiki/development/the-change-loop.md` where `/ship`'s walk is described.
- Payload release: `CHANGELOG.md` entry, minor. Skill text must fit the context budget, which has about 3,900 bytes of headroom.
- No new dependency, tool, runtime, or key.

## Decision log

- **2026-10-05** — Asked when the kept checks should replay → chose only before publishing, with a 2-minute limit. Preview checks already feel long; chat logs from the last 12 days show the browser part takes about 16 seconds and the assistant's writing and reading take the rest.
- **2026-10-05** — Asked where the kept checks should live → chose in the project, with the code.
- **2026-10-05** — Assumed: the e2e test tool is not adopted, because it adds packages and test files to every project, its AI steps need a paid key for anyone on a Claude subscription, and its guide alone is two thirds the size of all our skill instructions. Only its replay idea is taken.
- **2026-10-05** — Assumed: a check is kept only after it replays cleanly once by itself from fresh sample data, because a recording that fails on the next person's publish costs them a fresh look for nothing.
- **2026-10-05** — Assumed: a broken old promise stops the publish and asks, like a failed check today, because a softer kind of failure would let the break go live unseen.
- **2026-10-05** — Assumed: at most three fresh looks per publish, with the rest named as not checked, because one renamed menu could otherwise send the assistant through every kept check.
- **2026-10-05** — Assumed: a kept check stores what the passing page showed and points at the written promise, never a copy of it, because a second copy of a promise goes stale when the promise changes.
- **2026-10-05** — Assumed: checks that need a login, trigger an outside service or a timed job, or carry a password are never kept, because a replay runs unattended and a kept check is saved with the code where others can read it.
- **2026-10-05** — Assumed: only page and request checks are kept, because those are the two kinds the browser tool and a plain request can repeat without the assistant.
- **2026-10-05** — Assumed: no kept checks are made for features that already shipped, because the wiki's rule is to grow from use and a backfill is a long AI run nobody asked for.
- **2026-10-05** — Assumed: the practice-site measurement of the assistant's grading is not rerun, because the instructions for writing and grading a fresh check do not change; the replay is a program and gets its own tests on the practice site.
- **2026-10-05** — Asked in review what happens when a change breaks an old feature → chose that the assistant fixes it, not that the publish stops and asks. This replaces the earlier assumption. Stopping to ask stays for a break two tries did not fix and for one the change did not cause, because a publish should not rewrite code the change never touched.
- **2026-10-05** — Assumed: the kept-checks wiki section is its own page, `wiki/development/kept-checks.md`, because the walkthrough page had 31 words left under its 3,000-word limit. The walkthrough page keeps the changed reasons and the look at e2e; a few of its older sentences were shortened to make room, with no fact removed.
- **2026-10-05** — Assumed: checks for files the branch changed run first even when they write, ahead of read-only checks for other areas, because the promise is that changed areas go first. A read-only check that follows a writing one starts from a rebuild.
- **2026-10-05** — Assumed: a kept check is named after its scenario, so keeping it again replaces the same file. The check before publishing records whether staging was rebuilt in its run folder (`staging-facts`), and the replay reads it from there. `keep` takes the preview address (`--url`) to swap it out.
- **2026-10-05** — Assumed: the build is saved now that all code and tests are written, so the automatic checks and one real replay on this branch's preview can run; the three verification tasks stay open until each is seen to pass.
- **2026-10-05** — Asked whether to stop shared files, such as the release notes and tests, from counting as an area a change touched → chose yes, then publish. Nearly every change here touches the release notes, so every kept check would have gone to the front and the order would have meant nothing.
- **2026-10-05** — Assumed: the plan is filed in the archive and numbered 33.1.0 for publishing, because every task is done, the automatic checks passed on the build, and one real replay on the preview returned *same* and then *changed* as expected.
- **2026-10-05** — Assumed: the check before publishing walked the starter app's page-not-found promise, which is not part of this change, because the change's first promise needs a passed page check to keep and the change has no page of its own. It passed, was kept as this project's first kept check, and replays in 3 seconds; this save carries it.
