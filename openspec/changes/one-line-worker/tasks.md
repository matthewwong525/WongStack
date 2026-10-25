# Tasks

## 1. Before building

- [x] 1.1 Confirm [staging-may-skip-the-line](../archive/2026-10-25-staging-may-skip-the-line/proposal.md) is published: `main`'s `CHANGELOG.md` has its numbered entry and `main`'s `scripts/cf-secrets.mjs` passes a staging app with no line. If not, stop and say so

## 2. App config

- [x] 2.1 `app/wrangler.jsonc` drops staging's `LIVE_LINE`; `app/wrangler.line.jsonc` and `wrangler.line.template.jsonc` drop `env.staging`; the stack-pack app fragment drops staging's line; regenerate `app/worker-configuration.d.ts` (design 1). Verify with `npx wrangler deploy --dry-run --env staging` and `--config wrangler.line.jsonc` from `app/`

## 3. Pack scripts

- [x] 3.1 `cf-build.sh`, `cf-deploy.sh`, `cf-preview.sh`, `lib-wrangler-config.sh`: the line builds and deploys on the default branch only (design 2)
- [x] 3.2 `lib-wrangler-config.mjs` (`lineProblem`, `lineAddressProblem`, `stagingLineProblem`) and `cf-secrets.mjs` (the staging Durable Object check): design 3
- [x] 3.3 Tests in `scripts/tests/` (`line-deploy.test.mjs`, `wrangler-config.test.mjs`, `cf-secrets.test.mjs`, `cf-preview.test.mjs`, `access-coverage.test.mjs`, `fixtures/cloudflare.mjs`): a branch push deploys no line Worker; the default branch deploys the line, then the app, and a failed line stops it; a preview build or staging config binding any `script_name` Durable Object is refused, naming it; a line config with `env.staging` or a local address is refused. Verify with `node --test scripts/tests/`

## 4. Setup and the update

- [x] 4.1 `provision.mjs`: `lineConfig`, `lineInConfig`, the line file's staging strip, and `liveLine` with one name and no deploy; `lineWorkers` goes (design 4)
- [x] 4.2 Tests in `scripts/tests/provision.test.mjs`: a new install's line config has no `env.staging` and no placeholder; an install with a test line loses it from both files, keeping comments, and a rerun changes nothing; an unknown shape restores the file and leaves a to-do; a recorded `<worker>-line` is no clash, an unrecorded one leaves the clash to-do; setup runs no `wrangler deploy`. Verify with `node --test scripts/tests/provision.test.mjs`
- [x] 4.3 Run setup's line step for this repo, or edit by hand: `.agents/.wong-stack.json`'s `components.liveLine.workers` lists only `wongstack-line`

## 5. Local try

- [x] 5.1 `app/vite.config.ts`: the dev server may read `../scripts/employee-bootstrap.mjs`, serve only (design 5). Verify `npm run dev` in `app/` starts with no `Denied ID`. Vite 8 checks a `?raw` import's id as well as its path, so `server.fs.allow` lists the file and `<file>?raw`; the file alone still failed
- [x] 5.2 `app/worker/access.ts`: the local stand-in identity has a `sub` and an expiry an hour ahead, only under the three local conditions (design 5). Tests in `app/worker/access.test.ts` and beside `policy.ts`: the stand-in passes the person check locally, and a non-loopback host, a non-local environment, or no `SKIP_AUTH` still gets no identity. Verify with `npm test` in `app/`
- [x] 5.3 The stand-in computer script in `scripts/` (design 5), with a test in `scripts/tests/`: it refuses a non-local address and prints each message it hears. Verify with `node --test` on that test
- [x] 5.4 Walk it locally (design 5): the local inbox opens signed in as the stand-in, the stand-in joins as a computer, and a tap makes it print *look* within a second. Record the exact commands that worked for 6.1. Walked with `npm run dev` (its `auxiliaryWorkers` ran `wongstack-line-local`) in a headless browser: the inbox opened, a test plan showed at once, and a tap on it in the inbox reached the stand-in in under 0.2 s; a plan put alone woke only the inbox

## 6. Docs and release

- [x] 6.1 Write `wiki/stack/live-line.md`, `d1-pipeline.md`, `staging-bindings.md`, and `wiki/people/matthew-wong.md` per design 6, with 5.4's commands; and `wiki/stack/cloudflare-access.md`'s local paragraph if the stand-in's identity is described there. Verify with `node scripts/check-payload-links.mjs`
- [x] 6.2 `scripts/retired-names.json` and `CHANGELOG.md` per design 6; verify with `node scripts/check-retired-names.mjs`. The `CHANGELOG.md` entry also says local dev starts again and a line change can be tried on this computer

## 7. Check, publish, tidy

- [x] 7.1 Run `node .github/scripts/checks.mjs --worktree` and `bash scripts/cf-preview.sh --alias one-line-worker`: it prints a preview URL and deploys no line Worker
- [ ] 7.2 `/save`; CI passes and posts the branch's preview link; on it, the inbox opens and refreshes with no line
