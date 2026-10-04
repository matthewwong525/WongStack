# Make staging a safe playground, and look at the live app after publishing

**Status:** in-progress

**Branch:** wongstack-improvements

**Open questions:** none

## Why

The check before publishing runs on staging, a private copy of your app. Today that copy is nearly empty, shared by every chat, and the check is told to tiptoe in it, so things get left as "not checked" and wait for you to look by hand. After publishing, nothing looks at the live app at all.

## What Changes

- **Staging becomes a playground the check can do anything in.** It starts each check by wiping staging back to a known set of made-up data, then creates, edits, and deletes freely, with no asking and no tidying up after. Checks take turns, so two chats never trip over each other.
  ```text
   wait for a turn
          │
          ▼
   wipe to sample data
          │
          ▼
   do anything, check it
          │
          ▼
   give the turn back
  ```
- **Staging is filled with realistic made-up data.** Every change that adds or alters a feature also adds the sample customers, orders, or records its check needs. Real customer details never leave the live app. A check that finds no sample data for a promise says so by name.
- **Outside services are fair game only on test keys.** Today staging quietly gets the same keys as the live app unless you give it its own. The check now reads which services have a staging-only test key: those it uses freely, such as test cards and test inboxes. Any service still on a live key it leaves alone and names, so no real customer is ever emailed or charged.
  ```text
  service │ staging key │ the check
  ────────┼─────────────┼─────────────
  payment │ its own     │ uses freely
  email   │ same as live│ leaves alone
  ```
- **Timed jobs get run by hand in staging.** A job that normally runs on a schedule is started by the check, so its work is checked before publishing. Only the timetable itself is left for the live app.
- **One quick look at the live app after publishing.** It waits for the release to land and opens the live app. It only looks, and never saves, sends, or buys. If the release failed or the app does not open, the same chat says what is wrong, builds the fix, and asks *publish it?* as usual. A look that cannot run is one line in the report, never a failure.
  ```text
   publish ──▶ release lands?
                    │
              ┌─────┴─────┐
              ▼           ▼
          app opens    it did not
              │           │
              ▼           ▼
          "it is       say why,
           live"       build a fix,
                       ask to publish
  ```
- **Unchanged:** a check before publishing that cannot run, or cannot reach something, still never holds a change up.

**Non-goals:** A second full check on the live app. Copying live data into staging, scrubbed or not. A separate staging per change. Watching the live app's errors over time. Publishing a fix without asking. Checking the live app in workspaces hosted without GitHub.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a walk resets staging first and holds a turn; writes inside staging need no ownership or cleanup; outside services are used only on a staging-only key; a scheduled job is run by its manual trigger; a scenario with no seed data is named.
- `delivery-gate`: `/ship` takes one look-only check of the live app after the merge and starts a fix on failure.
- `stack-pack`: the seed holds the rows each feature's scenarios need; the secret check reports which keys staging shares with production; the production deploy records its address where tooling can find it.

## Impact

- Skills: `.agents/skills/verify/` (SKILL.md, `references/walkthrough.md`, `scripts/verify-staging.sh`, a new turn script), `.agents/skills/ship/` (SKILL.md, a new live-look script), `.agents/skills/apply/` or the code rule that owns seed upkeep.
- Scripts: `scripts/cf-secrets.mjs` (shared-key report), `scripts/reset-staging-d1.mjs` (unchanged behavior, new caller), `.github/workflows/deploy.yml` (production deployment record).
- Docs: `wiki/development/staging-walkthrough.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md`, `wiki/development/the-change-loop.md`.
- Payload release: `CHANGELOG.md` entry, minor. Skill text must fit the context budget, which has about 280 bytes of headroom, so the loosened caution text is cut as the new text lands.
- Measured first: the walk's journey-writing instructions change, so the practice-site counts are recorded before and after.

## Decision log

- **2026-10-04** — Asked whether to run a second full check on the live app after publishing → chose no: make staging mirror the live app and do all checking there.
- **2026-10-04** — Asked what staging should be filled with → chose realistic made-up data, never a copy of live data.
- **2026-10-04** — Asked whether to take a quick look that the live app loaded after publishing → chose yes, look only.
- **2026-10-04** — Assumed: a fix after a failed live look is built and then offered with *publish it?*, never published unasked, because it is a change the person has not seen and that was the recommended option they did not object to.
- **2026-10-04** — Assumed: free use of an outside service needs a staging-only key, because staging gets the live app's keys by default and "do anything" would otherwise email or charge real people.
- **2026-10-04** — Assumed: checks take turns through a marker kept with the repository's saved work, not a staging per change, because the stack docs already decline a staging per pull request and a marker needs no new service.
- **2026-10-04** — Assumed: a walk that cannot get a turn in time leaves its staging checks unverified and still finishes the rest, because a check never holds a change up.
- **2026-10-04** — Assumed: watching the live app's errors over time is left out, because the person redirected from monitoring to making staging trustworthy.
- **2026-10-04** — Assumed: the practice exercise gains a seeded delete, a service on a key shared with the live app, and a timed job with a manual trigger before the check's instructions change, because a change to how the check writes its steps is measured first. Saved for its scorer test to run in the automatic checks.
- **2026-10-04** — Assumed: the check's new instructions are kept, because on the practice site they caught as many planted mistakes as the old ones (10 of 10) with no false alarms and no unsafe sends. They showed no gain in catching, and the practice runs took about twice as long.
- **2026-10-04** — Assumed: taking turns is confirmed on GitHub only, because no workspace hosted without GitHub was free to test; there a check goes ahead without a turn and says so.
- **2026-10-04** — Check: `.github/workflows/deploy.yml` the new step that records a release is allowed to fail without failing the release, because a missing record only costs the quick look at the live app and must never block publishing. No existing step changed.
- **2026-10-04** — Assumed: the quick look at the live app gets its first real run on this change's own release and is read from the publish report, not ticked as a task, because the plan is filed away before publishing happens.
