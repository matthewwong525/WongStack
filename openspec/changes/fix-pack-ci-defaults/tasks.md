## 1. Reproduce first

- [x] 1.1 Stand up (or reuse) a repo with the pack installed and no wrangler config, and confirm both failures: `bash scripts/cf-build.sh --app-dir` exits 1 and `node scripts/cf-secrets.mjs check` aborts
- [x] 1.2 Keep that repo as the fixture for task 5

## 2. scripts/cf-secrets.mjs — skip on no config

- [x] 2.1 Make the check skip with a success exit when no wrangler config resolves, matching the existing skip messages for no-`env.staging` and unparseable-config
- [x] 2.2 Confirm the real failures still fail: a binding missing from a declared `env.staging`, and Worker-against-Worker secret drift
- [x] 2.3 Leave `secrets:push` behaviour alone — its `.env` refusal and `CLOUDFLARE_*`/`CF_ACCESS_*` guards are untouched by this change

## 3. scripts/cf-build.sh — let the workflow ask without dying

- [x] 3.1 Give `--app-dir` a way for a caller to detect "no config / no app" without treating it as a build failure; keep a real build failing loudly per design.md
- [x] 3.2 Verify a provisioned repo's `--app-dir` output is unchanged

## 4. .github/workflows/deploy.yml

- [x] 4.1 Guard the `Locate the app` step so an unconfigured repo reports and exits green instead of failing, naming `/wong-cloudflare` as the next step
- [x] 4.2 Change the concurrency group to `deploy-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}`
- [x] 4.3 Add the job-level `if`: `github.event_name == 'push' || github.event.pull_request.head.repo.full_name != github.repository`
- [x] 4.4 Update the file's header comment to describe what it now actually does, including why both concurrency parts are needed (concurrency is evaluated before `if`)
- [x] 4.5 Confirm `push` remains the deploying event so the preview URL stays attached to the branch head SHA

## 5. Verify end to end

- [x] 5.1 Unconfigured pack repo: push and confirm a green check, with the "not configured" message naming the provisioning skill
- [ ] 5.2 Provisioned repo with an open PR: push a commit and confirm exactly one deploy, one version bound to the alias, and no cancelled run
- [ ] 5.3 Confirm `gh pr checks` reports success (not `fail` from a cancellation) so `/ship` is not blocked
- [x] 5.4 Confirm `.claude/skills/save/scripts/preview-url.sh` still resolves the preview URL for the commit

## 6. Docs

- [x] 6.1 Fix `wiki/stack/d1-pipeline.md`'s claim that the check "skips rather than fails … so adopting the pack never produces a permanently red check" — state the three skip conditions (no credential, no config, no `env.staging`)
- [x] 6.2 Check the rest of `wiki/stack/` for the same promise stated elsewhere and reconcile it

## 7. Release

- [x] 7.1 Bump `VERSION` (patch if shipped alone, else fold into the release it rides with)
- [x] 7.2 Add the `CHANGELOG.md` entry, stating explicitly that existing pack repos keep their own `deploy.yml` and will be *offered* the fix through `/wong-sync`'s adapt step rather than receiving it automatically
