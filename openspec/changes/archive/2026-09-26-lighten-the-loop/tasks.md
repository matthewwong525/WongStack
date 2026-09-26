## 1. Base

- [x] 1.1 Confirm #118 (`add-home-repo`) is merged to `main`. Ask the user to confirm merging `origin/main` into this branch, then merge it; resolve any conflict as the union of intent. Do this before any file that #118 touched is edited
- [x] 1.2 Re-run `openspec validate lighten-the-loop --strict --no-interactive` with #118 on the branch, so the `request-routing` delta is checked against its base spec

## 2. Review page (plan skill)

- [x] 2.1 Rewrite `.agents/skills/plan/scripts/build-review.mjs` per design §2: parse Why, What Changes with fenced drawings, and the Decision log with `asked`/`assumed`/`log` labels into static escaped HTML; write the `wong-review:3` marker; keep the proposal-only refresh for `wong-review:2` pages; report the defined errors (old page kept) and the 60-column warning; leave unchanged output untouched
- [x] 2.2 Rewrite `.agents/skills/plan/references/review-kit.html` as one scrolling page per What Changes item 3: header with jump links and note count, numbered item cards, drawing frames with fit, zoom, and pan (design §3), decisions with text labels, the tap-to-note chip with no mode (design §4), the editor beside the target or docked on a phone, pins, a notes list with drafts, and the bottom Copy notes bar. Keep the in-page script-error report and no optional chaining
- [x] 2.3 Delete `.agents/skills/plan/references/review-author.md`, `.agents/skills/plan/references/review-examples.html`, and `.agents/skills/plan/scripts/check-review.js`
- [x] 2.4 Rewrite `scripts/tests/review.test.mjs` for the builder: wrapped bullets, a fence with a blank line, a fence outside a bullet, an unclosed fence, a stripped old anchor, decision labels, a drawing holding `</script>`, identical output on rebuild, a `wong-review:2` refresh, and the wide-line warning
- [x] 2.5 Rewrite `app/review/review.test.mjs` for the kit: a still tap shows the chip; a drag, a zoom button, and a link do not; save adds a pin and a list entry; the copy block uses `#/why`, `#/<n>`, and `#/decisions/<n>`; drafts survive another target and a reload; refused storage shows the session-only notice; a wide drawing fits; zoom past fit switches the frame to pan; nothing overflows at 320 px
- [x] 2.6 Rewrite `.agents/skills/plan/SKILL.md`: no subagent and no browser check; the planning agent draws in the bullet (top to bottom, about 40 columns) and builds once; each decision is its own Decision-log bullet starting with `Asked` or `Assumed`; a non-code plan is a numbered to-do in chat with outward steps marked
- [x] 2.7 Update the `proposal`, `design`, and `tasks` rules in `openspec/config.yaml`: drawings in bullets, no anchors, screens sketched, `### Review` names items. Run `node scripts/check-openspec-config.mjs`

## 3. Apply, save, and continue

- [x] 3.1 Update `.agents/skills/apply/SKILL.md`: the plan depends on the kind of work; the non-code form works the chat to-do, asks before each outward step, and does not save; the mini-app path writes `mini-apps/apps/<name>/` with its `app.json` and tests for its logic, runs `bash scripts/cf-mini.sh preview --alias mini-<name>`, reports the URL, and leaves the save to the person, because a save goes live; when `/ship` invoked it, return on completion without a save
- [x] 3.2 Add `.agents/skills/save/references/mini-app-save.md` with its direct route and PR fallback (design §8) and its route-table row in `.agents/skills/save/SKILL.md`. Add the non-code row (a `thread` fact with a topic slug, no commit). Remove "Stage the visual input" from the review refresh step
- [x] 3.3 Add a `mini-app` mode to `.agents/skills/save/scripts/render-pr-body.mjs` (title and description from `app.json`, the summary, the preview, and a footer; no change record), with cases in its existing test
- [x] 3.4 Update `.agents/skills/continue/SKILL.md`: the menu adds open threads from `memory.mjs search --type thread --state conversation`; a chosen thread is recapped and handed to `/apply`; pasted review notes reconcile into the proposal and its drawings, with no visual input file

- [x] 3.5 Rework the mini-app save to the direct route decided on 2026-09-26: host tests, then push `HEAD:main`; a PR only as the fallback; no `mini/<name>` branch and no `mini-<name>` fact. Update the save reference and route row, `/apply` step 4, `/ship`'s mini-app section, the wiki, the block, and the changelog

## 4. Ship and verify

- [x] 4.1 Add `.agents/skills/ship/scripts/merge.sh` per design §7, with `scripts/tests/ship-merge.test.mjs` driving fake `gh` and `git`: a merge; a refused merge that deletes nothing; a failed retarget that keeps the branch; a branch GitHub deleted at merge; a dirty `main` checkout that is skipped; no `main` checkout, so the ref advances
- [x] 4.2 Update `.agents/skills/ship/SKILL.md`: the pull-in tells `/apply` it runs inside `/ship`; after it returns, archive and then one `/save`; keep the `/verify` step before the merge; Steps 5 and 6 call `merge.sh`; a mini-app fallback PR skips selection, archive, and the walk, and runs one `/save`; non-code work finishes in `/apply`. Keep #118's wiki catch-up

## 5. CI and the stack pack

- [x] 5.1 Add `.github/scripts/app-untouched.sh` per design §10, with `scripts/tests/app-untouched.test.mjs` on temporary repos: a docs-only branch; a mini-apps-only branch and its `mini_apps` names; a docs commit on top of a code commit; a default-branch push; an all-zero `before`; no reachable base
- [x] 5.2 Update `.github/workflows/test.yml`: checkout with `fetch-depth: 0`, run the check first, gate the main app's steps on it, run `node --test` in each changed mini app's folder, and write a summary line
- [x] 5.3 Update `.github/workflows/deploy.yml`: the same gate on the main app's steps, and a mini Worker step that runs `scripts/cf-mini.sh ci` when `mini-apps/` changed and publishes its preview URL like the main app's
- [x] 5.4 Add the `mini-apps/` scaffold per design §8: `wrangler.jsonc` with a staging environment and D1 placeholders, `worker.ts` (the preview expiry check first, then pages from assets and `/<name>/api/*` from the generated route table, no source served), `apps/.assetsignore`, a `.gitignore` for the generated files, and one example app with a plain-JavaScript API handler and its test
- [x] 5.5 Add `scripts/mini-dashboard.mjs` (validate each `app.json`, write `index.html` and `routes.gen.ts`) and `scripts/cf-mini.sh` (preview and ci modes per design §8), with `scripts/tests/mini-apps.test.mjs`: dashboard entries and escaping; a missing title fails with the folder name; preview refuses the default branch; the staging twin is created only when missing; the production-name guard stops everything; `ci` does nothing when `mini-apps/` did not change; every non-production upload or deploy passes a seven-day `PREVIEW_EXPIRES` and production passes none; no mode touches `app/`. Cover the Worker's 410 page for a past expiry in the same suite
- [x] 5.6 Extend provisioning (setup and the pack's Cloudflare step) to write `mini-apps/wrangler.jsonc` names and D1 ids, and add the mini Worker to `wiki/stack/cloudflare-access.md`
- [x] 5.7 Rehearse on real infrastructure: with a one-line app, run `cf-mini.sh preview --alias rehearsal` from the host, open the URL and the dashboard, and confirm that the main app's Workers did not change. Record the timing and result in the Decision log
- [x] 5.8 Pass CI on this branch through `/save`, and confirm from the job logs that Test ran the suite (the branch changes code)

## 6. Docs and the block

- [x] 6.1 Update `wiki/development/the-change-loop.md`: an invoked verb serves any work (with the non-code form), the mini-app path with its direct save, one checkpoint per one-go ship before the walk, mini-app tests, and the main-app-untouched rule under the gate. Keep #118's request-routing text
- [x] 6.2 Add `wiki/stack/mini-apps.md`: the layout, the no-build rule, preview from the host, the direct save, the fallback PR, the dashboard, shared data, and when to port an app into `app/`. Link it from `wiki/stack/README.md` and the loop page
- [x] 6.3 Update the `WONG-STACK` block in `AGENTS.md`: a plain request needs no verb; an invoked verb serves any work; a new standalone page or tool takes the mini-app path. Link the loop page
- [x] 6.4 Update `README.md`: the `/plan`, `/apply`, and `/ship` rows, mini apps under "What you get", and the review-page caption. Replace `wiki/assets/review-page.png` with a capture of a page from the new kit, or remove the image when no browser is available
- [x] 6.5 Update `wiki/agent-knowledge-center.md` ("Read the plan before it runs") and `wiki/ux-principles.md` (screens are sketched in text; a mini-app preview shows the real screen)
- [x] 6.6 After the deltas sync, edit the Purpose lines of `openspec/specs/ux-wireframes/spec.md`, `openspec/specs/ship-full-cycle/spec.md`, and `openspec/specs/request-routing/spec.md` to match

## 7. Release

- [x] 7.1 Update `.agents/skills/wong-sync/references/payload-files.json` and `payload-manifest.md`: `.github/scripts/app-untouched.sh` (core); `scripts/cf-mini.sh`, `scripts/mini-dashboard.mjs`, and `wiki/stack/mini-apps.md` (pack); `mini-apps/` (scaffold, with its generated files excluded); the plan skill's contents; the mini-app save reference
- [x] 7.2 Update the inventory in `scripts/measure-context.mjs` and `scripts/fixtures/context-baseline.json`: drop the visual-author route, add the mini-app save route. Run `node scripts/measure-context.mjs --check`
- [x] 7.3 Compare `VERSION` with `origin/main`, set it to the next major above main (22.0.0 after #120), and add a newest-first `CHANGELOG.md` entry
- [x] 7.4 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 7.5 Reconcile the deltas and pass CI through `/save`
