# Design

## Context

See proposal.md for the failure. What the code does today:

- `provision()` in `.agents/skills/wong-setup/scripts/provision.mjs` defaults `today = isoDate()` and passes it to `wranglerConfig()`, which fills the fragment's `"<today, YYYY-MM-DD>"` placeholder. Both routes (`github`, `artifacts`) take this one path. `keepConfig` reruns and `/wong-sync` never rewrite `app/wrangler.jsonc`, which the payload excludes, so an install's date is fixed at creation.
- `app/tests/runtime/setup.ts` (shipped 40.1.0, 2026-10-10) starts workerd with the config's `compatibility_date`. The harness does not clamp the date as `wrangler dev` does: workerd refuses a date more than seven days past its build. The lock pins `workerd` 1.20260926.1, so the limit is 2026-10-03.
- An install receives `app/package-lock.json` with the scaffold, so its workerd is the source's.
- `scripts/check-target-app.mjs` builds a pretend install and runs `npm test`, but passes `today: '2026-01-01'`, so it never exercised the real date.
- The source's `app/wrangler.jsonc` uses `2026-07-28`, and the source's CI runs the runtime suite on it at every save.

## Goals / Non-Goals

**Goals:**

- A new install's date is one its shipped runtime accepts, on any install day, on both routes.
- The source's own checks fail before a release that would break this.

**Non-Goals:**

- Moving an existing install's date, or reading the date out of the installed runtime.
- Changing the runtime harness to tolerate a newer date.
- An install-record field for the source branch.

## Decisions

1. **The fragment carries a literal date, equal to the source app's.** Replace `"<today, YYYY-MM-DD>"` in `stack-pack-fragments.md` with `"2026-07-28"`. Alternatives: read `app/wrangler.jsonc` from the source checkout (it is excluded from the payload, and an agent merging the fragment by hand has no script to read it); derive it from the installed workerd version (provisioning can run before `npm install`, and it couples setup to a version-string format); clamp in the harness (tests would then run on a different date from the deployed Worker).
2. **`wranglerConfig()` drops its `today` parameter and fill entry.** The leftover-placeholder guard already throws if the fragment regains a placeholder the script does not fill. `provision()` keeps `today` only for `bootstrapWorker` in `private-access.mjs`: that placeholder Worker is uploaded to Cloudflare, which accepts today's date, and is never run locally.
3. **One assertion ties the two dates.** A script test parses the fragment-built config and `app/wrangler.jsonc` and asserts equal `compatibility_date`. The source's runtime suite proves the date against the pinned runtime; the equality proves an install gets that date. `check-target-app.mjs` drops its made-up `today`, so its `npm test` runs on the written date too.
4. **Reword the fragment rule.** *Set `compatibility_date` to the day you create the config* becomes: keep the date the fragment gives; the shipped local runtime refuses a newer one, and the first save fails.
5. **Moving the date needs no new page.** The assertion's failure message names both files and says to change them together, and the reworded fragment rule gives the limit. Only that one rule line changes in skill text; run `measure-context.mjs --check` and trim the same file if it grows.
6. **Existing installs: an Updating note, no code.** Plain words: nothing to do; if a save fails saying the app *requires compatibility date*, ask the assistant to set the app's date to the one in the message.
7. **Correct `wiki/maintaining/test-a-setup-change.md`.** The record holds repo, version and commit, no branch, and `/wong-sync` reads the default branch. The sentence becomes: the install record names no branch, so the test install's later updates follow the default branch.

## Risks / Trade-offs

- [New installs start on an older date than today] → It is the date every check runs on; newer runtime behavior arrives when the source moves its own date, tested first.
- [A maintainer moves one date and not the other] → Decision 3's assertion fails.
- [A maintainer moves the date past the pinned runtime] → the source's own runtime suite fails at the first save.
- [An install made 2026-10-04 or later already holds a too-new date] → Decision 6's note; no known live install is in that window.

## Migration Plan

A `patch` release. Rollback is reverting the commit; no install data changes.
