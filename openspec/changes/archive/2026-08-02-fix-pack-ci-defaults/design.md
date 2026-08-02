## Context

Two adopting agents independently reported that the pack's CI is broken on arrival, and both failures reproduce in a repo that took the pack and has not yet run `/wong-cloudflare`:

```
$ bash scripts/cf-build.sh --app-dir
wong: ERROR — no wrangler config found under <repo>          exit 1
$ node scripts/cf-secrets.mjs check
Could not find a wrangler config … — aborting.               exit 1
```

That state is not unusual — it is the state the pack **ships** in. `deploy.yml` is a drop-in file that lands with the rest of the pack, and the wrangler config is created later, by `/wong-cloudflare`, from a fragment. So the first push after adoption is red, and it is red twice over, at a step that runs before the token guard the workflow's comment describes as handling exactly this case.

The double-deploy is a separate defect in the same file. `concurrency` keys on `github.ref`, which differs between the two triggers of the same commit (`refs/heads/x` vs `refs/pull/N/merge`), so the group never collapses.

Both were found by people adopting the pack for real, not by reading it. The workflow's comments and `d1-pipeline.md` both assert the opposite of what the code does, which is why review never caught it.

## Goals / Non-Goals

**Goals:**
- A repo that took the pack gets a green check on its first push, before provisioning.
- One commit deploys exactly once, and `/ship` is not blocked by the fix.
- The preview URL keeps resolving for the commit `/save` and `/walk` look up.
- The docs' "never a permanently red check" claim becomes true rather than repeated.

**Non-Goals:**
- Giving a no-app repo something to build — `offer-app-scaffold` owns that. This change makes CI honest either way.
- Cloudflare Access, the token-variable drift, and the `.gitignore` fragment — separate changes.
- Changing which Worker a branch deploys to; the branch-split logic is untouched.

## Decisions

### The guard goes in the workflow, not in the scripts

`cf-build.sh --app-dir` exiting non-zero when there is no config is *correct* for a build: there is genuinely nothing to build, and a caller that ignores that would fail later and less clearly. What is wrong is the workflow treating a legitimate "nothing here yet" as a failure.

So the script keeps failing loudly for a real build, and gains a way for the workflow to ask the question without dying on the answer — a detection step whose non-zero result routes to a green "not configured yet" report. The alternative, making `--app-dir` exit zero and print nothing, was rejected: it would silently turn a genuine misconfiguration in a provisioned repo into an empty path and a confusing `npm ci` failure two steps later.

### `cf-secrets.mjs check` skips, because its own spec already says so

This one needs no judgement call — the requirement governing the gate states it "SHALL skip, not fail" on a repo that has not adopted the model, and enumerates two cases: no `env.staging`, and an unparseable `.toml`. "No config file at all" was simply missed, and it is the case that occurs *first* in every adoption. The fix restores the intent rather than changing it.

### The concurrency fix needs all three parts

The naive fix — key the group on the branch so the two triggers collapse — makes things worse. GitHub cancels the loser of a concurrency group, `gh pr checks` reports a cancelled run as `fail`, and `/ship` waits on `gh pr checks`. A shared group therefore trades an intermittent bad preview for a hard block on shipping.

The working shape, reported by an adopter who hit both traps:

```yaml
concurrency:
  group: deploy-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}
jobs:
  build:
    if: github.event_name == 'push' ||
        github.event.pull_request.head.repo.full_name != github.repository
```

- The group distinguishes the event, so the two triggers never cancel each other; within one event, a new commit still supersedes an in-flight run for the same branch.
- The `if` stops the redundant same-repo `pull_request` run from doing the work twice.
- Both are needed because **GitHub evaluates concurrency before a job's `if`** — a run destined to be skipped can still cancel the run doing the work. This is the part that makes the naive one-line fix look correct in testing and fail in practice.

`push` stays the deploying event because `save/scripts/preview-url.sh` resolves the preview by the branch head SHA; a `pull_request` SHA is the merge commit, which no deploy published. The fork branch of the `if` exists because a fork PR produces no push event in this repository, so without it a fork contribution would get no check at all.

## Risks / Trade-offs

- **`cancel-in-progress` semantics shift slightly** — cancellation now happens within an event rather than across both. Superseding an in-flight preview for the same branch still works, which is the behaviour that mattered; the production branch remains uncancelled as today.
- **A green check on an unconfigured repo could read as "it built"** → the step reports explicitly that the repo is not configured and names `/wong-cloudflare`, so the check is informative rather than merely passing.
- **Fork PRs deploy nothing** — they have no secrets, so they take the build-only path exactly as an unprovisioned repo does. No change, stated so nobody re-reports it.
- **A repo that already copied the broken workflow keeps it** — copy-if-absent never overwrites. The fixed file surfaces through `/wong-sync`'s adapt step as a proposal, which is the designed route; the changelog entry should say so plainly, since every existing pack repo is affected.

## Migration Plan

The workflow is a drop-in payload file, so new adopters get the fix by copy-if-absent. Existing pack repos have their own copy and will be *offered* the change through the adapt step — call this out in `CHANGELOG.md`, because the population that needs it is exactly the population that will not receive it automatically.

`VERSION` takes a patch bump (9.0.0 → 9.0.1) if released alone, or folds into the next minor if it ships alongside `offer-app-scaffold`.

## Open Questions

None. Both failures have a reproduction, and the concurrency fix has been run in a real repo by the adopter who reported it.
