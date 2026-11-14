# Tasks

## 1. Refusal records and line logs

- [ ] 1.1 Add `app/worker/security/record.ts` with `refused({ caller?, route, code, status })`, and verify a unit test shows the line holds no body, query or key value
- [ ] 1.2 Call it from the company API router on a 4xx with an `error.code`, from `access.ts` on a failed identity check, and from `line-worker.ts` on a refused join. Verify router, access and line tests each assert one `refused` line with the expected code and no query string
- [ ] 1.3 Turn `observability` on in `app/wrangler.line.jsonc` and `.agents/skills/wong-sync/references/wrangler.line.template.jsonc`, and verify `scripts/tests/wrangler-config.test.mjs` and `line-deploy.test.mjs` pass with a case pinning it

## 2. Daily summaries in the app

- [ ] 2.1 Add migration `schema/migrations/<ts>_security_days.sql` (design §3), and verify `npm test` in `app/` applies it with the other migrations
- [ ] 2.2 Write the four sources under `app/worker/security/sources/` (Workers logs telemetry query, Access sign-ins, account audit log, `wong_access_audit`), each returning `ok` or `unavailable` with a reason. Verify tests with stubbed fetch cover: a good answer, an error answer, no key, and no IP address in the output
- [ ] 2.3 Write `buildSecurityDays(env)`, called from `scheduled` in `app/worker/index.ts`: it writes the oldest missing day of the last 7 at most once per tick, with insert-if-absent, the 64 KB cap with truncation counts, and the 400-day prune. Verify tests show a second run leaves a day unchanged, a missed day is filled, an oversize summary is cut, and rows past 400 days are removed
- [ ] 2.4 Add the `security.days` action, owner-only and read, at most 92 days per call. Verify tests show the owner gets days, an Admin and an employee get `403 owner_only`, and no write or delete route exists
- [ ] 2.5 Write `wiki/stack/security-watch.md`: what is recorded, what a day's summary holds and doesn't, who can read it, how the watch decides, and how to turn it on. Link it from `wiki/stack/README.md`, `company-api.md`, `live-line.md#the-log` and `cloudflare-credentials.md`, and verify the wiki checks pass

## 3. The read key

- [ ] 3.1 Read `Workers Observability Read`'s id from the live permission-groups API and add it to `permission-groups.md`'s read-only list. Confirm `audit_logs` answers with the key's existing groups, and record the result in the decision log
- [ ] 3.2 In `private-access.mjs`, widen a held read key's policy in place when it lacks a listed group. Verify a test with a stubbed API shows the same id, a `PUT` with only Read groups, and a missing report when the token can't edit
- [ ] 3.3 Update `cloudflare-credentials.md#the-read-only-look-up-key` to say the key reads Workers logs for the daily summary, and verify the payload link check passes

## 4. The watch skill

- [ ] 4.1 Write `.agents/skills/security-watch/scripts/security-watch.mjs gather` (design §5), with a test using fixture summaries, a helper log across a roll, and stubbed `gh`. Verify each flag rule fires on its fixture, a quiet fixture yields no flags, and an unreachable source yields a flag
- [ ] 4.2 Write `.agents/skills/security-watch/SKILL.md`: run gather, judge, one inbox question or nothing, change nothing. Add it to `payload-files.json`, add the new spec to `areas.json`, and verify `node scripts/measure-context.mjs --check` passes after offsetting cuts
- [ ] 4.3 Add a `## Next (minor) — A daily security watch` entry to `CHANGELOG.md`, whose **Updating.** note offers to turn on the morning watch in plain words. Verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass

## 5. Verification

- [ ] 5.1 Run `node .github/scripts/checks.mjs --worktree` and the app's tests, then `/save`; verify CI passes on the branch
- [ ] 5.2 On staging, trigger the scheduled handler and read `security.days` as the owner. Verify a day is written with the Cloudflare sources `unavailable: no_key`, and that an Admin is refused
- [ ] 5.3 Run `security-watch.mjs gather` against staging with a seeded unusual day, and verify one inbox question appears. Clear the test items after
- [ ] 5.4 After ship, verify the live app writes the next day with every source `ok`, then create `schedules/security-watch.json` through `/schedule` (outward: confirm the time with the owner first)
