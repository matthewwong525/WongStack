## 1. The walkthrough script

- [x] 1.1 Decide the helper's home (`ship/scripts/` vs alongside `save/scripts/`) and record it in design.md's Open Questions as resolved
- [x] 1.2 Write the adoption probe: read the app's `package.json` for a `playwright` devDependency, using the pack's existing app-directory discovery rather than assuming `app/`; absent → exit `NONE` silently
- [x] 1.3 Resolve the target URL by calling `save/scripts/preview-url.sh`; undiscoverable in an adopted repo → `UNKNOWN`
- [x] 1.4 Probe the browser binary without installing anything; missing → `UNKNOWN` naming the install command as the fix, never running it
- [x] 1.5 Detect a Cloudflare Access interstitial on the first navigation and exit `UNKNOWN` naming the service-token headers, so a login page is never graded as a journey
- [x] 1.6 Send `CF-Access-Client-Id` / `CF-Access-Client-Secret` as extra HTTP headers when both are present in the environment, per the existing secrets convention
- [x] 1.7 Emit results in the `RESULT: <VERDICT>` shape `wait-for-checks.sh` already uses, so `/ship` reads both gates the same way
- [x] 1.8 Create and clean up the temp run directory, guaranteeing nothing is written under the repository root and the working tree is unchanged on every exit path

## 2. The /ship skill

- [x] 2.1 Add Step 4.5 to `.claude/skills/ship/SKILL.md` between the CI wait and the merge, invoking the helper and stating the position's rationale (CI green is what proves the per-commit alias exists)
- [x] 2.2 Document the scout: inputs are the change's delta specs plus the scenarios of any `openspec/specs/` capability the branch diff touches; filter to browser-observable; exclude queue/cron scenarios with a recorded reason
- [x] 2.3 Document journey construction — the scenario's `WHEN` becomes the steps, its `THEN` is carried verbatim as the pass criterion
- [x] 2.4 Document the throwaway script contract: generated per run outside the tree, screenshot after every step, video per journey, deleted at the end
- [x] 2.5 Document grading — evidence read against the written `THEN`; "no exception thrown" is explicitly not a pass; ambiguity stops and asks the user with the screenshot
- [x] 2.6 Add the five-verdict table and each verdict's effect on the merge, including that `NONE` is silent when unadopted and one line when adopted-but-empty
- [x] 2.7 Extend the failure loop: `db:reset:staging` before the retry, then fix → repush → re-wait CI → re-walk, sharing the existing cap of 3
- [x] 2.8 Extend the Hard rules with: never merge on a walkthrough `UNKNOWN`; never install a dependency; never write into the repo; a passing walk leaves its data
- [x] 2.9 Update Step 6's report to include the walkthrough verdict, the journey count, and the PR comment link when one was posted

## 3. Evidence reporting

- [x] 3.1 Compose the PR comment so it is complete as prose — per journey: steps, verdict, and the `THEN` it was judged against
- [x] 3.2 Post it with `gh pr comment`, one comment per `/ship` run rather than one per journey
- [x] 3.3 Implement the optional media host: upload screenshots and videos to a configured public bucket and link them; absent host → local paths with no failure reported
- [x] 3.4 Present video as a link at every rung, with a comment in the source recording why (`user-attachments` is the only inline path and needs a browser session)

## 4. Documentation

- [x] 4.1 Write the `wiki/stack/` runbook: the three adoption rungs (playwright install → Access service token → optional bucket), each degrading to the one below
- [x] 4.2 Document the `schema/seed.sql` prerequisite — an empty seed makes journeys unwalkable
- [x] 4.3 Record the declined options with reasons (running on `/save`, a saved suite, a second judging agent, walking the full spec surface, inline video)
- [x] 4.4 Link the runbook from `wiki/stack/README.md` and from `wiki/development/the-change-loop.md` where `/ship` is described
- [x] 4.5 Add the walkthrough's variables to `.env.example` with comments on what they are and where they come from
- [x] 4.6 Update `CLAUDE.md` where it states what `/ship` does and where it states the never-build-locally rule, per the `delivery-gate` delta's building-versus-exercising boundary

## 5. Offer paths

- [x] 5.1 Add the recommendation to `.claude/skills/wong-setup/SKILL.md` as a stack-pack-style offer, where declining writes nothing
- [x] 5.2 Ensure `/wong-sync` can surface it as an adaptable capability, and add the runbook to the payload manifest
- [x] 5.3 Confirm no manifest field is introduced anywhere — the `playwright` devDependency is the only consent signal

## 6. Verification and release

- [x] 6.1 Rehearse the helper — every verdict path locally, plus a walk against a **real deployed Cloudflare Worker** (screenshot, video, evidence, grading). Two pieces initially unreachable — `preview-url.sh` on a real per-commit URL and `db:reset:staging` — were **closed in task 7.5** after provisioning this repo
- [x] 6.2 Rehearse the Access path against a protected URL with and without the service token, confirming `UNKNOWN` rather than a green login page
- [x] 6.3 `openspec validate ship-staging-tests --strict`
- [x] 6.4 Bump `VERSION` (minor — an additive, opt-in capability) and add the newest-first `CHANGELOG.md` entry

## 7. Preview-URL publication (found while verifying 6.1)

- [x] 7.1 `cf-deploy.sh` harvests the alias URL from `wrangler versions upload` output — never constructs it — and writes it to `$GITHUB_OUTPUT`, guarding every extraction against `set -e`
- [x] 7.2 `deploy.yml` publishes it as a GitHub Deployment with `environment_url`, gated on a non-empty URL, with `deployments: write`
- [x] 7.3 Add the `stack-pack` delta requiring publication, harvest-not-construct, and no-op under Workers Builds
- [x] 7.4 Document it in the pipeline docs and the walkthrough runbook
- [x] 7.5 Provisioned this repo manually (two D1s, `env.staging`, pack scripts, repo secrets); CI deployed, published the URL, and `preview-url.sh` resolved it via deployment 5710516663. `db:reset:staging` verified against the real staging D1. Full Step 4.5 walked the live preview — **closing 6.1's gap entirely**
