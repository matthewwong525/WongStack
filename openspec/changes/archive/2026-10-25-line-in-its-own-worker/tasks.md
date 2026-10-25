# Tasks

## 1. Prove the link first (stop here if it fails)

- [x] 1.1 Run the throwaway probe from design decision 1 in this account with the primary worktree's `.env` token, from a scratch folder in `.scratch/`: steps 1–5, then delete all three `wong-probe-*` Workers. Done when the probe's output shows a version URL for steps 3 and 4 and `wrangler deployments list` no longer finds any `wong-probe-*` Worker; record the two side answers in the chat and in task 5.1's wiki text
- [x] 1.2 If step 3 or 4 printed no URL: stop, report the evidence and the options to the person, and build nothing else. Otherwise tick this box and go on

## 2. App: the line in its own Worker

- [x] 2.1 Add `app/worker/line-worker.ts` and `app/wrangler.line.jsonc` (design 2); stop exporting `Line` from `app/worker/index.ts`; give `LINE` its `script_name` per environment and add migration `line-2` in `app/wrangler.jsonc`. Verify with `npx wrangler deploy --dry-run --config wrangler.line.jsonc` and `--env staging` from `app/`
- [x] 2.2 Run the line beside the app in local dev: `auxiliaryWorkers` in `app/vite.config.ts` for `serve` only (design 4). Verified instead with `wrangler dev` on the local build plus `wrangler.line.jsonc`: both Workers start and `LIVE_LINE` resolves to `wongstack-line-local`. `npm run dev` fails before this change too (`Denied ID …/scripts/employee-bootstrap.mjs?raw`), and the line route refuses the local stand-in sign-in (`dev@example.com`) as before, so the tap is walked on the preview (6.4). That run caught the line Worker crashing on `import.meta.glob` via `store.ts`; `rows.ts` now holds what the line reads, and `line-worker.test.ts` fails if the line reaches a glob again
- [x] 2.3 Tests: the line Worker's entry exports `Line` and answers 404 to any request; the app's build redirect lists no auxiliary Worker; `npm test` in `app/` passes

## 3. Pack scripts: build, deploy, preview

- [x] 3.1 `scripts/cf-build.sh`: bundle the line into `dist/line/` keyless when `wrangler.line.jsonc` exists, staging off the production branch (design 4)
- [x] 3.2 `scripts/cf-deploy.sh`: deploy the line from the trusted config and the built entry before the app, on both branches; skip when the trusted checkout has no line config (design 5)
- [x] 3.3 `scripts/lib-wrangler-config.mjs`: add `lineProblem` for the trusted line config, and refuse a preview build whose Durable Object `script_name` isn't the trusted staging line Worker; keep `copyBuild` from copying a branch's `wrangler.line.jsonc`; expose what `cf-deploy.sh` needs through `lib-wrangler-config.sh` (design 5)
- [x] 3.4 `scripts/cf-preview.sh`: build, deploy the staging line, upload the app's version; deploy staging once and retry on a pending-migration refusal (design 6)
- [x] 3.5 `scripts/cf-secrets.mjs`: a `script_name` Durable Object binding must be twinned in staging; `scripts/check-private-access.mjs`: the line config keeps no address (design 8)
- [x] 3.6 Tests in `scripts/tests/` (`wrangler-config.test.mjs`, `cf-preview.test.mjs`, `cf-secrets.test.mjs`, `private-access-probe.test.mjs`, and a deploy-order test): line before app on both branches, a failed line deploy stops the app, no line config deploys the app alone, a branch's line config and a staging `script_name` pointing at production are refused, a staging twin missing fails secrets check, a line config with an address is refused. Verify with `node --test scripts/tests/`

## 4. Setup and the update

- [x] 4.1 `.agents/skills/wong-sync/references/stack-pack-fragments.md`: add the `wrangler.line.jsonc` fragment, the `script_name` lines and `line-2` in the app fragment, and one rule line on the staging line twin (design 7)
- [x] 4.2 `.agents/skills/wong-setup/scripts/provision.mjs`: write the line config when absent, patch the app config's `LINE` and `line-2` (a to-do when it can't), deploy both line Workers from this computer before reporting (design 7)
- [x] 4.3 `payload-files.json` and `payload-manifest.md`: ship `app/worker/line-worker.ts`; name `wrangler.line.jsonc` target-owned
- [x] 4.4 Tests in `scripts/tests/provision.test.mjs`: a new install gets a filled line config with no placeholder left; an app config holding the line gets `script_name` and `line-2` once, and a rerun changes nothing; the line deploys run before the report, staging and production

## 5. Docs and release

- [x] 5.1 `wiki/stack/live-line.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md` per design 9, with the probe's answers; verify with `node scripts/check-payload-links.mjs`
- [x] 5.2 `CHANGELOG.md`: `## Next (minor) — App changes get their preview link back` with the plain-words **Updating.** note, saying the old line state is deleted and can't be undone, and what restores it (design 9)

## 6. Before the first save, then check

- [x] 6.1 From this host, with the token: run provisioning's line step for `wongstack-line` and `wongstack-line-staging`; verify both exist in `wrangler deployments list --name <each>` and have no `workers.dev` address
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` and `bash scripts/cf-preview.sh --alias line-in-its-own-worker`: it prints a preview URL
- [x] 6.3 `/save`; CI passes and posts a preview link for the branch
- [x] 6.4 On the preview link, signed in: open the inbox, make a test item, tap it, and see the computer's helper pick it up within seconds through the staging line; close the test item after. Walked on the branch's CI preview by a script standing in for the helper (signed in with `cloudflared access token`): line open as a computer, item put, tap sent, `look` arrived 291 ms later through `wongstack-line-staging`; test item closed
