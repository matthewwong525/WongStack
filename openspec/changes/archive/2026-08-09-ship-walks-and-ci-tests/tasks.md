# Tasks — ship-walks-and-ci-tests

## 1. Ship skill (SKILL.md)

- [x] 1.1 Insert the walk evidence step between the delegated `/save` (Step 3) and the merge (Step 4): invoke `/walk` once; `NONE`/`UNKNOWN`/`TIMEOUT` report and proceed; `FAILURE` (fix loop exhausted) stops, presents the evidence, and asks fix-or-merge-anyway, recording the answer
- [x] 1.2 Confirm the latest save-gate result is `SUCCESS`/`NONE` before merging when the walk's fix loop advanced HEAD
- [x] 1.3 Concise rewrite: collapse the repeated never-test/never-walk prose — one line pointing at the gate owner (`the-change-loop.md#the-gate`), the "never walk" hard rule replaced by the evidence-step rule; keep every operational command intact
- [x] 1.4 Update the description frontmatter (ship now walks as evidence; still does not test locally; walk gates nothing)

## 2. CI workflow (deploy.yml)

- [x] 2.1 Add the parallel `test` job to `.github/workflows/deploy.yml`: setup Node, `npm ci` in the app dir, run the `test` script; no `test` script → print why and exit 0; no `needs:` edge from `deploy`
- [x] 2.2 Verify the job rides the existing double-fire collapse (one run per commit) and update the workflow's header comment

## 3. Plan skill and payload manifest

- [x] 3.1 `.claude/skills/plan/SKILL.md`: add the standing convention — behavioral change → tasks.md includes an add-or-extend-test-coverage task; prose-only change → omitted
- [x] 3.2 Check `wong-sync`'s payload manifest entry for `deploy.yml` still describes the workflow accurately (test job joins the offered-through-adapt list)

## 4. Wiki

- [x] 4.1 `wiki/development/the-change-loop.md`: `/ship` description gains the evidence step; the gate section states the walk still gates nothing and the `FAILURE` pause is a surfaced user decision, not a rung
- [x] 4.2 `wiki/stack/staging-walkthrough.md`: revise the "not automatic on `/ship`" recorded decision — the gate stays dead, the evidence step is what changed and why; note ship-time walks in the "when to run" prose
- [x] 4.3 `wiki/development/the-change-loop.md` (or the owning page): one line on the test-growth convention so `/improve` and reviewers can cite it

## 5. Release

- [x] 5.1 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry (call out that existing pack repos are offered the test job via `/wong-sync` adapt, never overwritten)
- [x] 5.2 Run `node scripts/check-payload-links.mjs` and fix any dead link
