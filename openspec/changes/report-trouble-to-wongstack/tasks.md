# Tasks

## 1. The service (`reports/`, meta-only)

- [ ] 1.1 Check the repo's deploy token can create and migrate a D1 database and attach `reports.wongstack.com`; verify with a read-only token check, and name any missing permission as a human step before going on
- [ ] 1.2 Scaffold `reports/` with `wrangler.reports.jsonc` (live and staging, staging with no custom domain), a D1 migration for reports and daily counts; verify `wrangler deploy --dry-run --config wrangler.reports.jsonc` passes
- [ ] 1.3 Build the four routes with size, per-sender, and daily-total limits, the salted daily sender hash, key-only list and close, and the markdown answer; verify with Worker tests for each spec scenario in `trouble-reports`, including a refused list without the key
- [ ] 1.4 Add `.github/workflows/reports.yml` after `site.yml`'s pattern (in-job scope check, tests, staging on a branch, live on the default branch); verify the scope check skips on a change that leaves `reports/` alone
- [ ] 1.5 Add guard tests: nothing under `reports/` or `scripts/wong-reports.mjs` is in `payload-files.json`, and no second findable `wrangler.jsonc`; verify both fail on a bad sample
- [ ] 1.6 Write `wiki/maintaining/trouble-reports.md` (what the service is, its limits, its key, how it is checked and published) and link it from `wiki/maintaining/README.md`; verify the wiki checks pass

## 2. The install's command (payload script)

- [ ] 2.1 Write `.agents/skills/wong-sync/scripts/report.mjs` with `send` and `status`, the origin override and `"off"`, and the refusals for secrets, token shapes, the repo name, and the git email, sharing the memory skill's scrubber patterns; verify with script tests for each refusal, a sent report, an `"off"` record, and an unreachable service
- [ ] 2.2 Set `components.reports.origin` to `"off"` in this repo's install record; verify `send` here refuses with a plain line

## 3. Reading here (source-only script and skills)

- [ ] 3.1 Write `scripts/wong-reports.mjs` with `list` (grouped by where, lines quoted) and `close`; verify with script tests against a fake service, including a missing key
- [ ] 3.2 Add the batch method to `wiki/development/repository-improvement.md` and one sentence each to `/improve-code` and `/dream-memory`; verify `node scripts/measure-context.mjs --check` passes
- [ ] 3.3 Have `/ship` close the reports a plan names, in the wiki section that owns closing a note; verify by reading the changed section against the `repository-improvement` delta

## 4. The offer and hearing back (skills and wiki)

- [ ] 4.1 Add *Report trouble to WongStack* to `wiki/development/memory.md` beside struggle notes: when it is offered, the four lines, the yes, the `sync` thread; link it from `/save` and `/close` in one sentence each; verify `measure-context.mjs --check` and `check-payload-links.mjs` pass
- [ ] 4.2 Add the lookup to `/wong-sync` and its payload manifest's planning section; verify against the `wong-sync` delta's two scenarios
- [ ] 4.3 Add one line to `wiki/contributing.md` pointing a trouble report here and a finished fix to a pull request; verify the wiki checks pass

## 5. The privacy page (site)

- [ ] 5.1 Reword the *never reach us* sentence in `site/src/Privacy.tsx`, add what a report holds and that no address is kept, and set its *Last updated* date; update the matching bullet in `wiki/maintaining/landing-page.md`; verify the site's tests pass with updated snapshots

## 6. Release

- [ ] 6.1 Add the `trouble-reports` area to `.agents/skills/memory/references/areas.json` for `reports/` and the two scripts; verify `memory-areas.test.mjs` passes
- [ ] 6.2 Add a `## Next (minor)` entry to `CHANGELOG.md` whose **Updating.** note says in plain words that the assistant may now offer to report trouble and that nothing is sent without a yes; verify `node .github/scripts/checks.mjs --worktree` passes

## 7. Verification

- [ ] 7.1 Create the live database and set `WONGSTACK_REPORTS_TOKEN` on the service and in `.env`, each an outward step confirmed first; verify `scripts/wong-reports.mjs list` answers from this repo
- [ ] 7.2 `/save`, then on the staging service send a report, look it up, list it, close it as fixed, and look it up again; verify each answer matches the spec
- [ ] 7.3 After publish, send one real report from a scratch install folder and confirm it appears in `list` here and that the scratch folder's lookup shows the decision; close it as declined with the reason *test*
