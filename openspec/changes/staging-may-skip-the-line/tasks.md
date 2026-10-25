# Tasks

## 1. The check

- [x] 1.1 `scripts/cf-secrets.mjs`: `checkDurableObjectTwins` skips a production `script_name` binding staging doesn't bind, and still fails one staging points at the same Worker (design 1)
- [x] 1.2 Tests in `scripts/tests/cf-secrets.test.mjs`: no staging binding passes; staging naming production's Worker fails; a staging twin passes. In `scripts/tests/line-deploy.test.mjs`, beside the live-line refusal: a preview build with no line binding passes `buildProblem`. Verify with `node --test scripts/tests/cf-secrets.test.mjs scripts/tests/line-deploy.test.mjs`

## 2. Docs and release

- [x] 2.1 `wiki/stack/staging-bindings.md`: the Durable Objects row (design 2); verify with `node scripts/check-payload-links.mjs`
- [x] 2.2 `CHANGELOG.md`: `## Next (minor) — The test copy may run without the live line` (design 2)

## 3. Check

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; it passes
- [ ] 3.2 `/save`; CI passes and posts the branch's preview link
