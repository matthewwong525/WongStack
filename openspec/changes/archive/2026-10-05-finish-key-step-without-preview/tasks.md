# Tasks

Build 1–3 together with their tests; run the local checks once at the end.

## 1. Setup scripts

- [x] 1.1 In `.agents/skills/wong-setup/scripts/private-access.mjs`, make `workerKey()` treat Cloudflare code `10215` on any Worker after the first as waiting, return and note the waiting Workers, and reuse the key when the first Worker holds the secret ([design 1 and 2](design.md)). Keep every other error fatal. Update `provision.mjs`'s report and help text where they say both Workers. Author fake-Cloudflare tests in `scripts/tests/provision.test.mjs`: staging refuses with 10215 and the step completes and records; a rerun reuses; production refusing still fails; staging accepting stores both.
- [x] 1.2 In `scripts/cf-secrets.mjs`, let `check` pass when the setup-made key is on production and missing from staging, with one line saying the preview is waiting; keep staging-without-production a problem ([design 3](design.md)). Author tests in `scripts/tests/cf-secrets.test.mjs` for both directions.

## 2. Access on a preview

- [x] 2.1 In `app/src/apps/access/`, show *Not on previews yet* for an unsaved setup-made key on the practice environment and hide the one-step-left card there ([design 4](design.md)). Author tests for practice and live.

## 3. Documentation and distribution

- [x] 3.1 Update `wiki/stack/employee-access.md`, `wiki/stack/staging-bindings.md` and `wiki/stack/cloudflare-credentials.md`: the live app holds the read-only key; the preview app holds it only when Cloudflare accepts it, and why. Verify with `node scripts/check-payload-links.mjs`.
- [x] 3.2 Add a `## Next (patch)` entry to `CHANGELOG.md` whose **Updating.** note says, in plain words, to run the Access setup step again if the update to 33.0.0 reported an error from it. Leave `VERSION` alone.
