## 1. Walk driver — agent-browser replaces Browser Run

- [x] 1.1 Replace `.claude/skills/walk/scripts/walk-runner.mjs` with a thin driver that translates a journey into one `agent-browser batch --bail --json` call and reads its structured output (design.md D1); keep it small enough that swapping engines rewrites one script.
- [x] 1.2 Delete every Cloudflare browser path — the `api.cloudflare.com` CDP constant, `WALK_CF_ACCOUNT_ID`, the bearer header, `connectOverCDP`, the exit-4 refusal diagnosis, and their comments.
- [x] 1.3 Address elements through `snapshot` refs and semantic locators rather than hand-written selectors; capture a screenshot per step, using full-page or `--annotate` where it makes the evidence clearer.
- [x] 1.4 Remove all video capture and every claim about video, including the "video degraded honestly" path (design.md D2).
- [x] 1.5 Apply the Access service-token pair with `agent-browser set headers` when the heal runs, and keep interstitial detection exactly as it is.
- [x] 1.6 Report where the browser ran, and exit with a distinct signal when a browser could not be obtained.

## 2. Walk skill and preflight

- [x] 2.1 Rewrite `walk-staging.sh` preflight around `agent-browser doctor --json`; install the CLI and its Chrome when missing and report what was installed. Leave `scout-check` unchanged and credential-free.
- [x] 2.2 Keep the runtime boundary: tools install, runtimes ask (design.md D4).
- [x] 2.3 Replace the exit-code remedy table: drop the Browser Run refusal, keep the Access challenge, add "no browser could be obtained" naming the doctor check that failed.
- [x] 2.4 Rewrite `.claude/skills/walk/SKILL.md` — frontmatter and body — removing "stack-pack repos only", "the browser is remote", "never installs anything", the adoption signal, and video; state the engine, the machine-level install, and the where-it-ran reporting rule.
- [x] 2.5 Narrow `NONE` throughout the skill to "no browser-observable scenarios" and remove every "not adopted" meaning.
- [x] 2.6 Update `.claude/skills/walk/references/walkthrough.md` for all of the above, hedging the remaining Cloudflare Access passages as pack-only.

## 3. The agent-browser skill

- [x] 3.1 Keep the vendored `.agents/skills/agent-browser/SKILL.md` as the upstream pointer stub, unmodified, with its Apache-2.0 attribution intact (design.md D5).
- [x] 3.2 Add it to `core.skillDirs` in the payload manifest and record in the prose manifest that it is vendored, refreshed from upstream, and never edited in place.
- [x] 3.3 State in the runbook and `required-tools.md` that the browser is available for ordinary work, and that `/walk` is only the graded-evidence surface.

## 4. Manifest and category moves

- [x] 4.1 Move `walk` from `pack.skillDirs` to `core.skillDirs` in `.claude/skills/wong-sync/references/payload-files.json`.
- [x] 4.2 Add `.github/workflows/test.yml`, the root `package.json`, and the moved runbook to `core.files`.
- [x] 4.3 Update `.claude/skills/wong-sync/references/payload-manifest.md` so each category change and its reason is stated where a reader looks.
- [x] 4.4 Verify `/wong-sync` would copy `walk`, `agent-browser`, `test.yml`, and the runbook into a repo with `components.stackPack` absent or false, and that no Cloudflare file travels with them.

## 5. Runbook and wiki

- [x] 5.1 Move `wiki/stack/staging-walkthrough.md` to `wiki/development/staging-walkthrough.md` (design.md D7).
- [x] 5.2 Rewrite it for the engine, the machine-level install, declarative journeys, and screenshot-only evidence; mark every remaining Cloudflare section and link as pack-only.
- [x] 5.3 Record the reversed and dropped decisions with what each protected and what was traded — remote-only, adoption-by-dependency, and video — plus the engine alternatives considered and the replacement path.
- [x] 5.4 State that remote browsers are configured through the tool's own providers and that the payload defines no endpoint variable (design.md D3).
- [x] 5.5 Sweep the repo for inbound links to the old runbook path and repoint them.
- [x] 5.6 Update `wiki/development/the-change-loop.md` where it describes `/walk` as pack-gated, and `wiki/development/required-tools.md` for the browser-CLI-for-`/walk` split.

## 6. Test suite and pipeline

- [x] 6.1 Add a root `package.json` (`vitest`, `"test": "vitest run"`, no browser library) and a vitest config, and add them to the payload as copy-if-absent.
- [x] 6.2 Write real tests for the walkthrough scripts' phase contract by invoking them: verdict lines, the usage string, and the cleanup guard's refusal to remove a directory it did not create.
- [x] 6.3 Write real tests for `scripts/check-payload-links.mjs`: the dead-versus-conditional classification across install shapes, which this change stresses hardest.
- [x] 6.4 Write real tests for `scripts/lib-wrangler-config.mjs` across the layouts it claims to support.
- [x] 6.5 Add `.github/workflows/test.yml` in core: root-first suite discovery, the same double-fire collapse condition `deploy.yml` uses, honest-green when no `test` script exists (design.md D10).
- [x] 6.6 Remove the `test` job from the pack's `.github/workflows/deploy.yml` so a pack repo runs its suite once.
- [x] 6.7 Confirm `npm test` is green locally and that the new workflow runs green in this repo's own CI.

## 7. Ship skill and Cloudflare skill

- [x] 7.1 Add the availability check to `/ship` Step 4: absent `walk` skill → report unavailable in one line and continue to the merge (design.md D12).
- [x] 7.2 Change `/ship` Step 5 to list open pull requests based on the branch, retarget each to the default branch, then delete the remote branch (design.md D11).
- [x] 7.3 Add the retargeting to Step 6's report and to the hard rules, so the ordering is stated where it is easy to break.
- [x] 7.4 Remove Browser Rendering Edit from `/wong-cloudflare`'s widened permission set and its references, leaving the Access groups untouched.

## 8. Release

- [x] 8.1 Bump `VERSION` and add the `CHANGELOG.md` entry covering the engine swap, the category moves, the dropped video, the reversed rules, the vendored skill, the test suite and workflow, and the two `/ship` fixes.
- [x] 8.2 Run `node scripts/check-payload-links.mjs`; confirm zero dead links in all four install shapes and review each newly conditional link as intended and hedged.
