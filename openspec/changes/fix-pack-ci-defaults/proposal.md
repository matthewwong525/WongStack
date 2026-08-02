# fix-pack-ci-defaults

**Status:** ready-to-ship
**Open questions:** none

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

The pack's CI is red by default and deploys twice concurrently. Both were reported independently by two adopting agents, and both reproduce.

**Red by default.** The workflow's own header promises *"an unprovisioned repo gets a real PR check instead of a permanently red one,"* and `wiki/stack/d1-pipeline.md` repeats it. In a pack repo with no wrangler config — the state the pack ships in, before `/wong-cloudflare` runs — two steps fail before the token guard is ever consulted:

```
$ bash scripts/cf-build.sh --app-dir
wong: ERROR — no wrangler config found under <repo>          exit 1

$ node scripts/cf-secrets.mjs check
Could not find a wrangler config … — aborting.               exit 1
```

The first is `deploy.yml`'s step 1, which runs unconditionally. The second is the parity step, which is *deliberately* unconditional and whose spec says it "SHALL skip, not fail" — but its skip cases cover a config with no `env.staging` and an unparseable `.toml`, never a config that does not exist.

**Double deploy.** `concurrency: group: deploy-${{ github.ref }}` never collapses a branch's two triggers: `push` gives `refs/heads/x`, `pull_request` gives `refs/pull/N/merge`. Both jobs run `wrangler versions upload` for the same `CF_BRANCH`, racing to bind one preview alias. One adopter observed two versions holding the same alias a second apart, with the alias intermittently serving Cloudflare's placeholder page while it settled — which reads as a failed deploy.

## What Changes

- **`deploy.yml` detects an unbuildable repo and passes.** Where no wrangler config and no app exist, the workflow reports why and exits green rather than failing at step 1.
- **`cf-secrets.mjs check` skips when there is no wrangler config**, closing the gap between its behavior and the requirement that already governs it. Absent config joins absent `env.staging` and unparseable config as a skip, not an abort.
- **The concurrency fix is three parts, not one** — all three are required, and two of them are non-obvious:
  - Key the group on the **event and the branch** (`deploy-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}`). Keying on branch alone makes the two triggers share a group, and the loser is **cancelled** — which `gh pr checks` reports as `fail`, blocking `/ship`.
  - Add a job-level `if` so only `push`, plus pull requests **from forks**, run at all. Same-repo PRs are already covered by their push event.
  - Keep `push` as the deploying event: its `github.sha` is the branch head, which is what `save/scripts/preview-url.sh` looks up. A `pull_request` SHA is the merge commit and resolves no preview.
  - **Concurrency is evaluated before a job's `if`**, so the `if` alone does not prevent a skipped run from cancelling a working one — hence both.
- **The docs stop claiming what the code does not do** — `d1-pipeline.md`'s "never produces a permanently red check" is made true rather than repeated.

**Non-goals:** the `app/` scaffold that gives a no-app repo something to build (`offer-app-scaffold` owns it — this change makes CI honest whether or not an app arrives); anything about Cloudflare Access; the `.env.example` and `.gitignore` drift (`fix-payload-config-drift`).

## Capabilities

### Modified Capabilities
- `stack-pack`: the Actions workflow requirement gains the unbuildable-repo path and the concurrency rule that keeps one deploy per branch.
- `cf-secret-parity`: the gate's skip requirement gains the missing case — no wrangler config at all.

## Impact

- `.github/workflows/deploy.yml` — the guard, the concurrency group, the job `if`.
- `scripts/cf-secrets.mjs` — skip instead of abort when no config resolves.
- `scripts/cf-build.sh` — `--app-dir` reports absence in a way the workflow can branch on rather than only exiting 1.
- `wiki/stack/d1-pipeline.md` — the red-check promise.
- `VERSION`, `CHANGELOG.md` (patch-level: 9.0.0 → 9.0.1, or folded into the next minor).
- Every repo that took the pack and has not yet provisioned — currently a red check on every push.

## Decision log

- **2026-08-02** — Implemented 18/20. **Reproduced both failures first** in a scratch pack repo with no wrangler config: `cf-build.sh --app-dir` exit 1, `cf-secrets.mjs check` abort — exactly as the proposal described.
  `cf-secrets.mjs check` now skips green on a missing config, joining the two existing skip cases. The non-exiting lookup is duplicated *inside* `cf-secrets.mjs` rather than added to `lib-wrangler-config.mjs`, because copy-if-absent never updates a library a repo already has — same constraint the file's existing header comment already documents. `push` behaviour deliberately untouched.
  `cf-build.sh --app-dir` gained **exit 3** for "no config yet", distinct from exit 1 for a real error. Implementation turned out cheaper than designed: the library's resolver *returns* non-zero rather than exiting, so guarding the call was enough — no duplicated search logic, and the two paths cannot disagree about which file they'd pick.
  `deploy.yml`: the locate step routes exit 3 to a green report naming `/wong-cloudflare`, all seven later steps gate on a `configured` output, concurrency keys on event+branch, and a job-level `if` limits runs to `push` plus fork PRs. The header now explains why **both** concurrency parts are required (GitHub evaluates concurrency before a job's `if`).
  Verified: skip/abort behaviour, that real binding drift still fails, that a provisioned repo's `--app-dir` output is byte-identical, and the locate step replayed against the fixture (exit 0, `configured=false`, summary names the skill).
  **Remaining:** 5.2/5.3 need a live push with an open PR — this PR's own CI run is that test.
- **2026-08-02** — Tasks 5.2/5.3 **verified live on PR #50**, which is the fixture the plan asked for: a provisioned repo with an open PR. Exactly the designed outcome — the `push` run deployed (`success`), the `pull_request` run was `skipped` by the job-level `if`, **zero cancelled runs**, one successful deploy, and `gh pr checks` exits `0`. That last one is the point: under the old concurrency key the loser was *cancelled*, which `gh pr checks` reports as `fail` and which would have blocked `/ship`. Change complete at 20/20.
