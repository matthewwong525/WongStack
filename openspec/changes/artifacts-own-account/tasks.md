# Tasks

Build by [design.md](design.md). Do not edit `server/`, the hosted delivery scripts or `wiki/stack/hosted-projects.md`; another workspace removes them.

## 1. Verify first (facts)

- [x] 1.1 Read Cloudflare's Artifacts, Containers, Workflows and `@cloudflare/ci` docs at the pinned versions, and the pilot at `refs/pull/238/head` (`scripts/pilots/artifacts/`). Record in the Decision log, one bullet each, what is established for design.md's four *Verify first* facts and what still needs a live probe. Verified when each fact is marked established, needs-probe, or failed, with its source.
- [x] 1.2 For each needs-probe fact, ask the owner once for a go-ahead to probe in his own Cloudflare account under one throwaway name (outward: creates billable resources), run the smallest probe, remove what it made, and log the readback. Verified when every fact is established or failed and the account holds nothing the probe made.
- [x] 1.3 If any fact failed, stop here: report it with the options design.md names and wait for the owner's choice. Verified when the Decision log holds his answer, or no fact failed.

## 2. Route switch and Git access (scripts)

- [x] 2.1 Add the route script that prints `github` or `artifacts` from the `origin` host and the install record, with tests for a GitHub origin, an Artifacts origin, a missing origin and a record that disagrees with the origin.
- [x] 2.2 Add the Git credential helper: mints a repo-scoped token from the primary worktree's `.env`, caches it mode 0600 under `~/.local/state/wongstack/`, renews on expiry, and never prints or passes the token as an argument. Tests cover first use, cached use, expiry, a missing `.env` token, a symlinked or wrong-mode cache, and a foreign remote.

## 3. Check runner (pack)

- [x] 3.1 Add the runner's folder to the stack pack: the Worker on pinned `@cloudflare/ci`, its config template, `package.json` and lockfile. It runs `checks.mjs` and the ordinary build in a runner with no credentials, then `cf-deploy.sh` in a chained runner holding only the deploy token; a failed first step ends with no deploy. Tests use the public SDK's fixtures for a passing branch, a failing check, a `main` push, a duplicate event and a Sandbox interruption (one retry).
- [x] 3.2 Give each run an instance id derived from its head commit and an output of commit, result and the preview address Wrangler printed. Test that a mismatched commit and a missing address are never read as passed.
- [x] 3.3 Apply the bounds from design.md (one run at a time, 30 minutes, snapshot retention and R2 lifecycle deletion) and test each.
- [x] 3.4 Audit `cf-build.sh`, `cf-deploy.sh` and `cf-preview.sh` for GitHub-only inputs; pass the runner's branch and commit through the variables they already accept, changing a script only where a test shows it needs it.
- [x] 3.5 List the runner's files in the payload inventory and the manifest's pack category, and extend the payload checks that pin pack files.

## 4. Setup (skill and provisioner)

- [x] 4.1 `provision.mjs`: add the paid-plan preflight, the Artifacts and Containers permission groups to the widen, repository creation, the deploy token stored as the runner's secret, the runner install with the pack's pinned tools, and the first push to `main`. Each step is safe to run again. Tests cover a free account (nothing created), a second run, a refused widen and a taken name.
- [x] 4.2 `references/cloudflare.md` and `permission-groups.md`: give the GitHub repository, CI deploy token and workflow steps their Artifacts twins, the new groups in the tables, and teardown for the repository, runner, its storage and tokens, naming what Cloudflare will not delete.
- [x] 4.3 `wong-setup/SKILL.md`: choose the route (Artifacts on Mac or Linux with a paid account; GitHub when asked, on Windows, or on a free account after saying the cost) in one linked clause, paid for by an equal cut. Record the route in the install record.
- [x] 4.4 The closing report says the monthly cost and that the install has no pull requests, in plain words.

## 5. Verbs (skills and their scripts)

- [x] 5.1 `/save`: `wait-for-checks.sh` and `preview-url.sh` gain an Artifacts branch that reads the run for the exact head and prints the same `SAVE_GATE_RESULT=` values; the pull-request body is skipped on that route. Tests cover passed, failed, timed out, unreadable (`UNKNOWN`) and an earlier commit's preview.
- [x] 5.2 `/ship`: on the Artifacts route, squash onto freshly fetched `main`, push without force, wait for `main`'s run, then the live look. Tests cover a clean publish, a moved `main` (refetch and re-gate), a red `main` run and an unreadable result (stop).
- [x] 5.3 `/continue` and `explore/scripts/other-work.mjs`: list remote branches with an unarchived change where there are no pull requests. Tests cover no branches, one saved change and a branch with no change.
- [x] 5.4 `/apply`, `/save`, `/ship`, `/continue` skill text: one linked clause each to the route page, each paid for by an equal cut; preconditions stop asking for `gh` on the Artifacts route.
- [x] 5.5 Run `node scripts/measure-context.mjs --check` and trim until it passes.

## 6. Docs and release

- [x] 6.1 Write `wiki/stack/artifacts-route.md`: what the route is, what it costs, setup, how a change is checked and published, renewing access, limits (one person, Mac and Linux, no pull requests) and teardown. Link it from `wiki/stack/README.md`.
- [x] 6.2 Point to it, without copying it, from the gate section of `wiki/development/the-change-loop.md`, `wiki/development/required-tools.md` (`gh` is not needed on this route), `wiki/stack/getting-started.md` (cost), `wiki/stack/cloudflare-credentials.md` (the wider token) and `README.md` (what you need).
- [x] 6.3 `CHANGELOG.md`: add `## Next (minor) — Install with one Cloudflare account` in plain words, with an **Updating.** note that GitHub installs need do nothing.
- [x] 6.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs` and `node scripts/check-openspec-config.mjs`; all pass.

## 7. Verification

- [x] 7.1 Run `/save`: every check passes on the exact head, with any `Check:` reason the guard asks for.
- [x] 7.2 Ask the owner for a go-ahead to run one real install in his own Cloudflare account under a throwaway name (outward: billable). Then, from a clean folder on Mac or Linux, he or the agent walks: setup with no GitHub sign-in → a small change → save → private preview refuses a signed-out visitor → a deliberately failing change is not published → *publish it?* → the live site shows the change → a second change from the new `main`. Record each step as passed, failed or not run in the Decision log.
- [x] 7.3 Run teardown for that install and read back that its repository, runner, storage and tokens are gone; name anything left behind.
