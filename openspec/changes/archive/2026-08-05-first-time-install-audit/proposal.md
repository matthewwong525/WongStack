# first-time-install-audit

**Status:** ready-to-ship
**Open questions:** none — the root `README.md` fork (seed / offer / exempt) resolved during implementation: the link meant WongStack's own README, so it became an absolute URL and needed neither.

## Why

A real end-to-end install of v9.1.0 — empty folder, no git, no app, driven as a
non-technical user would drive it — turned up defects, two of them severe: a
fresh install cannot git-ignore its own secrets while the page it ships *claims* it
can, and the only fragment that ever creates a target's Wrangler config writes a
`migrations_dir` that is wrong for the `app/` layout every appless repo receives.
The rest are first-run walls (`git commit` fails with no identity configured), dead
links the release check reports as green, and two places where the payload's own
prose states something untrue about the tools it drives.

Every one of these is invisible from inside this repo, for the same reason the
payload link checker exists: this repo has the ground a target is missing. They
only appear when you actually stand a target up from nothing.

## What Changes

- **`/wong-setup` seeds the ground the payload assumes.** A root `.gitignore`
  carrying the two secrets-file patterns is written **before** any shipped page
  tells the user to make a `.env`; `wiki/README.md` and `wiki/development/README.md`
  are both seeded (only the first was, before this).
- **Git identity is derived from GitHub, not asked for.** `gh api user` already
  holds the name and login; the account's noreply address covers the common case
  where `email` is private. Without an identity `git commit` fails outright, and
  `gh auth login` does not set one.
- **`main` becomes the assumed default branch.** `/save` and `/ship` stop telling
  the agent to run `git symbolic-ref refs/remotes/origin/HEAD`, which fails on every
  freshly created repo; detection is reserved for a pre-existing repo where `main`
  doesn't exist.
- **The `wrangler.jsonc` fragment states `migrations_dir` per layout**, the way it
  already does for `main` and the way the `package.json` fragment does for its
  script paths — `../schema/migrations` in the `app/` layout, `schema/migrations`
  at the root — and gains it as a seventh rule the scripts depend on.
- **`cf-build.sh`'s no-config message names the fix** (`run /wong-cloudflare`)
  instead of stopping at the symptom. Message only — the exit status is unchanged,
  and the audience is whoever reads the CI log.
- **`/wong-setup` stops promising `/save` works without Node.** `/save` shells out
  to `openspec new change`, `openspec status`, and `openspec instructions` when it
  authors a change, so the current "these verbs still work" list is wrong at the
  moment the user is deciding whether to install a runtime.
- **`/wong-setup` overrides `openspec init`'s closing line**, which tells the user
  to run `/opsx:propose` — a command WongStack states does not exist.
- **`check-payload-links.mjs` stops assuming files nothing creates.**
  `TARGET_PROVIDED` is narrowed to what setup actually guarantees, so the release
  check fails on the dead links it currently exempts.
- **The payload manifest gains a machine-readable file list** beside its prose, so
  the installing agent stops hand-deriving ~60 paths from three sections plus
  exclusions.

Non-goals: no new manifest category, no change to what the pack provisions, and no
automated first-run test harness — the audit was manual and stays manual. Node
stays a real dependency: the verbs keep calling the OpenSpec CLI rather than
vendoring its artifact templates. Cloudflare's ten-database account cap was found
and is **deliberately not addressed** — adopters are typically on a fresh account,
and the rare case is better handled in conversation than pre-flighted.

## Capabilities

### New Capabilities

None — every defect lands on an existing spec.

### Modified Capabilities

- `install-onboarding`: setup must seed `.gitignore` and both wiki hubs, derive the
  git identity from GitHub, assume `main`, and correct OpenSpec's closing
  instruction.
- `secrets-convention`: the `.env`-is-ignored guarantee must be true at the moment
  the page asserting it arrives, not only after `/wong-cloudflare` runs.
- `stack-pack`: the config fragment must state `migrations_dir` per layout, and the
  build wrapper's no-config exit must name its remedy.
- `toolchain-dependencies`: the list of verbs that survive without the CLI must
  match what the verbs actually call.
- `payload-single-source`: the link check may only exempt paths the install
  actually produces; the manifest's file list gains a machine-readable form.

## Impact

Payload prose and two scripts. `.claude/skills/wong-setup/SKILL.md` (Steps 5–7),
the default-branch instruction in `.claude/skills/save/SKILL.md` +
`references/git-gate.md`, `.claude/skills/ship/SKILL.md`, and
`.claude/skills/continue/SKILL.md` (four copies, all replaced),
`.claude/skills/wong-sync/references/stack-pack-fragments.md` +
`references/payload-manifest.md` and its new `references/payload-files.json`,
`scripts/lib-wrangler-config.sh` (which owns the no-config message `cf-build.sh`
surfaces), `scripts/check-payload-links.mjs`, `wiki/development/secrets.md`,
`wiki/stack/getting-started.md`, plus a new `wiki/development/README.md` seed path.

Editing the payload is a release: `VERSION` and `CHANGELOG.md` move with it —
**9.2.0**. The link check ends green, and was verified to go **red (8 dead links)**
when the `wiki/development/README.md` exemption is removed, so its pass reflects
what setup now seeds rather than what it assumes.

No target repo is broken by any of this: every change either seeds a file that was
absent or corrects prose an agent reads at install time. Existing installs are
**not** retro-fixed — `/wong-sync` never modifies a file it didn't generate, so the
corrected fragment and the missing `.gitignore` reach them only as adapt-step
proposals. The changelog therefore tells existing users to run
`git check-ignore -q .env` themselves.

## Decision log

- **2026-08-05** — Found by driving a real install of v9.1.0 from an empty folder (no git, no app, non-technical persona) through `wong-setup` → `wong-sync` → `wong-cloudflare` → real D1 provisioning → CI deploy → teardown. The pipeline itself was sound: CI green on the unprovisioned repo, and a live Worker serving 200 with a working `/api/`. Everything that broke was the ground underneath it. Scoped as **one** change rather than three because the findings share one theme and one test, and a single PR keeps the `VERSION` bump with its changelog entry.
- **2026-08-05** — Dropped the Cloudflare D1 account-cap work (hit `7406 System limit reached` for real during the audit) on the user's call: adopters are typically on a fresh account and the failure is loud, so it's recorded in `design.md` rather than pre-flighted. Kept as a written cause so the next person meeting `7406` doesn't rediscover it.
- **2026-08-05** — Reworked three fixes after user review. Git identity is now **derived from `gh api user`** rather than asked for — with the `<id>+<login>@users.noreply.github.com` fallback, because `email` returns `null` under GitHub's default privacy setting. The default branch is **assumed to be `main`** rather than detected, replacing the planned `git remote set-head` fix: setup runs `git init -b main` and `gh repo create` adopts it, and the prescribed `symbolic-ref` command *fails* on exactly the repos setup creates. The `cf-build.sh` finding shrank to a message-only fix — the original plan suggested pointing users at `npm run dev`, which contradicts the design (the app is seen at the deployed preview, not locally).
- **2026-08-05** — Kept Node as a real dependency after weighing vendoring OpenSpec's artifact templates. Tracing the verbs showed `/save` itself shells out to `openspec new change`, `openspec status --json`, and `openspec instructions`, so "no Node" would disable most of the loop, not just `/plan`. That trace exposed a new defect: `wong-setup` promised `/save` survives without the CLI. Added as a fifth delta spec on `toolchain-dependencies`.
- **2026-08-05** — Implemented all 22 tasks. Two deviations worth recording. **Task 4.4's fork dissolved**: `wiki/stack/getting-started.md` linked `../../README.md` meaning *WongStack's* README (where the setup prompt lives), which in a target resolves to the target's own README — the wrong file, not a missing one. Fixed to an absolute GitHub URL, so no seeding and no exemption. **The link checker was proved rather than trusted**: it went green after the fix, so the exemption for `wiki/development/README.md` was temporarily removed to confirm it reports **8 dead links** — matching exactly what an independent resolver found against the real install. It is green because setup now seeds those files, not because it assumes them.
- **2026-08-05** — Released as **9.2.0** (minor: additive rungs and corrected fragments, no capability removed). `node scripts/check-payload-links.mjs` exits 0. Existing installs keep the wrong `migrations_dir` and the missing `.gitignore` — `/wong-sync` never modifies a file it didn't generate, so both reach them only as adapt-step proposals; the changelog therefore tells existing users to run `git check-ignore -q .env` themselves.
