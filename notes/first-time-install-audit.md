---
slug: first-time-install-audit
started: 2026-08-05
updated: 2026-08-05
consolidated:
---

# First-time install audit

A live end-to-end install of WongStack v9.1.0, driven as a non-technical first-timer would,
to find what breaks. The change folder holds what we fixed and why; this note holds the
method, the evidence, and the things worth knowing next time.

## The method (this is the reusable part)

Built a real target: `/tmp/e2e/run-club`, an **empty folder** — no git, no app, no
`package.json` — with a persona ("a running club that wants a website"). Then hand-drove the
whole documented path from the **cached upstream clone**, not this repo:
`wong-setup` → `wong-sync` payload copy → `wong-cloudflare` fragments → real D1 provisioning
→ CI deploy → teardown.

**Driving it by hand from the clone is what made it work.** Every defect found was invisible
from inside WongStack, because this repo carries the payload *plus the ground around it* —
a `.gitignore`, both wiki hubs, a correct `app/wrangler.jsonc`, a configured git identity.
That is the same reason `scripts/check-payload-links.mjs` exists, and the audit's sharpest
finding was that the check had been told to *assume away* four of the missing files.

Worth repeating on a future release. Worth automating? Decided no — a fixture repo that
drifts from the real install is worse than none. The narrowed link check is what catches this
class at release time instead.

## What actually worked

Don't lose this — the pipeline is sound and the audit confirmed it:

- CI on an **unprovisioned** repo goes green exactly as the manifest promises.
- Push → CI → migrations → deploy produced `https://e2e-run-club.matthewwong525.workers.dev`
  serving 200, with the `/api/` control returning `{"name":"Cloudflare"}` as its smoke test.
- `/wong-cloudflare`'s failure map **correctly diagnosed** the account-scoped token from the
  symptom (`/user/tokens/verify` fails with `1000` while account-scoped calls succeed).
- `cf-build.sh` stops cleanly and non-destructively on a repo with no wrangler config.

## Environment facts learned the hard way

- **The `.env` token in this repo is account-scoped, not user-scoped.** It passes `/accounts`,
  D1, and Workers calls, but `POST /user/tokens/verify` returns `1000 Invalid API Token`, so
  `/wong-cloudflare`'s widen step (Step 2) cannot run against it. Provisioning was completed
  by hand instead. A user-scoped token from **My Profile → API Tokens** is needed to exercise
  that path.
- **Cloudflare caps D1 at 10 databases per account**; each project takes two. Hit
  `7406 System limit reached` during the run. Deliberately not fixed (see the change's
  Decision log) — but note **deletion is eventually consistent**: two deletes returned
  `success: true`, both immediate re-creates still failed, and the same creates succeeded
  ~20s later.
- **`gh api user` returns `email: null`** whenever the account keeps its address private,
  which is GitHub's default. The usable substitute is `<id>+<login>@users.noreply.github.com`.
- The machine had no global `git config user.name`/`user.email` at all, which is what surfaced
  the first-commit wall.

## User's stated positions (these shaped the scope)

- **Don't ask for what can be looked up.** Git identity should come from GitHub, not a prompt.
- **Default branch is just `main`.** Don't detect what setup itself created.
- **The D1 cap isn't worth building for** — adopters are on fresh accounts; handle it in
  conversation if it ever fires.
- **Nothing runs locally.** The app is seen at the deployed preview URL, not `localhost` —
  which is why the `npm run dev` advice was cut. (`/walk` drives the preview, not a local server.)
- **Keep Node**, once it was clear the CLI backs `/plan`, `/apply`, `/ship` *and* `/save`'s
  change-authoring — the "no Node" idea was about the app's npm, not OpenSpec's.

## Loose ends

- **`github.com/matthewwong525/e2e-run-club-test` is still live.** Deleting it needs the
  `delete_repo` scope: `gh auth refresh -h github.com -s delete_repo`, then
  `gh repo delete matthewwong525/e2e-run-club-test --yes`. All Cloudflare resources from the
  run were torn down, along with stale `wongstack-test-db*` / `wongstack-d1-test` from July.
- The scratch target at `/tmp/e2e/run-club` still exists if another pass is useful; it is not
  in git anywhere.
- Not re-checked after the fixes: a **second** full install from scratch. The changes are
  prose an agent reads, so they were verified by inspection plus the link check, not by
  re-running the whole audit.
