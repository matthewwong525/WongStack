# Tasks — walk-self-healing

## 1. Walk skill (SKILL.md)

- [x] 1.1 Reorder the runbook: new Step 1 scouts scenarios into candidate journeys (local files only); `NONE` with a one-line report when nothing is browser-observable, before any `/save` or preflight
- [x] 1.2 Move `/save` to run only when journeys exist, keeping the preview-URL invariant text
- [x] 1.3 Add the Browser Run heal step: on the endpoint's auth refusal, follow the widen protocol (link `permission-groups.md` and the standing-authorization section), retry once, report the granted permission; second refusal → `UNKNOWN` naming what was attempted
- [x] 1.4 Add the Access heal step: on the challenge with no service-token pair, mint a deterministically named token via the API token (widening into Access groups first if needed), store the pair in the primary worktree's durable `.env` per the secrets convention, retry once; surviving challenge → `UNKNOWN`
- [x] 1.5 Replace Step 5 with the scoped failure flow: reset staging, judge scope, in-scope → fix + `/save` + re-walk (max 2 attempts), out-of-scope → stop and report; the report states the scope judgement either way
- [x] 1.6 Update the description frontmatter and hard rules (never print or commit a credential value; one heal-and-retry per block; no unbounded loops)

## 2. Walk scripts

- [x] 2.1 `walk-staging.sh`: make the scout/journey check runnable before credential resolution (split preflight or reorder), keeping the existing `RESULT:` vocabulary
- [x] 2.2 `walk-staging.sh` / `walk-runner.mjs`: distinguish "Browser Run refused the token" from other `UNKNOWN` causes with a stable signal the skill can key the widen on (runner already exits 3 for the Access challenge)

## 3. Reference and wiki

- [x] 3.1 `references/walkthrough.md`: scout-first ordering; the scope test for the fix loop; heal reporting
- [x] 3.2 `wiki/stack/staging-walkthrough.md`: update the runbook order, the two heal paths, the fix-loop bounds, and the recorded-decisions list (the "no automatic retry" decision is revised to "bounded in-scope fix loop")
- [x] 3.3 `wiki/stack/cloudflare-access.md` + `wiki/stack/cloudflare-credentials.md`: note that `/walk` may mint the service token and widen under the standing authorization; add the walk's service token to the teardown inventory in `/wong-cloudflare`

## 4. Release

- [x] 4.1 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and fix any dead link
