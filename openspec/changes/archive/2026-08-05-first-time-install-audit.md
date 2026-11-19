<!-- openspec-archive v1 2026-08-05-first-time-install-audit -->
<!-- file proposal.md utf8 9387 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 10517 -->
## Context

The defects came from one manual run: an empty folder on a machine with a working
toolchain, driven through `wong-setup` → `wong-sync` → `wong-cloudflare` → real D1
provisioning → CI deploy → teardown, against v9.1.0. The pipeline itself worked —
push to CI produced a live Worker serving 200 with a working `/api/` control, and
CI went green on the unprovisioned repo exactly as designed. Everything that broke
was the *ground underneath* the pipeline: files the payload assumes a repo already
has, and prose an agent reads at install time.

That's the shape worth holding onto. This repo carries the payload **plus
everything around it** — a `.gitignore`, a root `README.md`, both wiki hubs, a
correct `app/wrangler.jsonc`, a configured git identity. Every defect here is
invisible locally for that reason, which is the same reason
`check-payload-links.mjs` exists. The audit's real finding is that the check meant
to catch this class had been told to assume away four of the missing files.

Constraint that shapes everything below: **`/wong-sync` never modifies a file it
didn't generate.** So a fix to a *fragment* or a *runbook* reaches new installs
immediately and existing ones only as an adapt-step proposal. That's correct and
we're not changing it — but it means the fixes must be right on the first install,
because that's the only install they land on cleanly.

## Goals / Non-Goals

**Goals:**

- A repo that finishes `wong-setup` can commit, push, run `/save`, and cannot
  accidentally commit a credential — with no later step required.
- Every internal link in a fresh install resolves, and the release check proves it
  rather than assuming it.
- The Wrangler config `/wong-cloudflare` writes is correct in the `app/` layout,
  which is what every appless first install receives.
- A user who hits Cloudflare's D1 cap learns what it is and what to do, in the flow
  rather than from an API code.

**Non-Goals:**

- No automated first-install test harness. The audit was manual and stays manual —
  a fixture repo that drifts from the real install is worse than none. What
  replaces repetition is the narrowed link check, which fails on this class of
  defect at release time.
- No change to the manifest categories or what the pack provisions.
- No back-fill into existing installs beyond what the adapt step already proposes.
- Node stays required. The verbs keep calling the OpenSpec CLI for artifact
  templates rather than vendoring them; what changes is only that setup stops
  claiming `/save` survives without it.
- No handling for Cloudflare's D1 account cap — recorded in Decisions, not built.

## Decisions

**The `.gitignore` entries stop being an offer.** `secrets-convention` currently
bundles them with the convention, so declining the convention silently declines the
protection. Split them: the `.env.example` seed and the docs page stay an offer,
the ignore entries become unconditional. The rationale is that they are not a
convention at all — they express no opinion about how the repo handles secrets, and
a repo that handles secrets its own way is not harmed by `.env*` being ignored.
*Alternative considered:* keep the offer and have `secrets.md` hedge its claim
("make sure `.env` is ignored"). Rejected — it moves a mechanical guarantee onto
the user at the one moment they are least equipped to check it, and the page's own
`cp .env.example .env` line would still hand them a live credential in an untracked
file.

**The fragment is fixed, not the scripts.** `migrations_dir` could instead be made
irrelevant by having `cf-build.sh` locate `schema/migrations` from the repo root
itself. Rejected: `migrations_dir` is Wrangler's own config key, read by
`wrangler d1 migrations apply` directly, and the scripts deliberately delegate to
Wrangler rather than reimplementing it. Working around a wrong config value in the
wrapper would leave the config wrong for anyone running `wrangler` by hand — which
the `db:migrate:*` aliases explicitly invite. Fix the value, and state it per
layout the way `main` and the `package.json` script paths already are.

**The link check goes red before it goes green.** Narrowing `TARGET_PROVIDED` to
what setup actually writes will fail the check on the dead links it currently
exempts — `wiki/development/README.md` above all. That failure is the deliverable:
it's the check finally reporting what an install sees. Sequence matters, so the
task order is *seed the hubs first, narrow the exemptions second*; doing it the
other way leaves the repo red between two tasks for no reason. `README.md` and
`.gitignore` stay exempt once setup writes them, because at that point the
exemption is true.

**The machine-readable list is JSON beside the manifest, and the checker reads
it.** Options were: a fenced block inside `payload-manifest.md` parsed out; a
separate `payload.json`; or leaving the checker's constants as the de-facto list.
Chose a separate file the prose links to, because the manifest's own capability
says a generated fact has exactly one store, and a fenced block inside prose is a
store that formatting can break. The prose keeps the reasoning, the gating rules
(`stackPack`, `appScaffold`, UI-only), and the exclusions — those can't live in a
flat list, so the list carries paths and category tags only.

**Identity is read from GitHub rather than asked for.** Every question setup asks
costs a newcomer more than it costs us, and this one has a knowable answer: the
account holds the name, and `gh` is already authenticated by the time the first
commit happens. The wrinkle is `email`, which comes back `null` whenever the user
keeps their address private — GitHub's default. *Alternative considered:* ask only
for the email. Rejected — the noreply address (`<id>+<login>@users.noreply.github.com`)
is what GitHub itself uses for web commits, always works for pushes, and discloses
nothing. Asking is the fallback for an unauthenticated `gh`, not the path.

**`main` is assumed; detection is the exception.** Setup runs `git init -b main`
and `gh repo create` adopts the local branch, so every repo this toolkit creates is
on `main` — and the detection command the verbs currently prescribe
(`git symbolic-ref refs/remotes/origin/HEAD`) fails on exactly those repos, because
`gh repo create --push` never records the head. *Alternatives considered:* run
`git remote set-head origin -a` at creation so the detection keeps working
(rejected — it adds a command to preserve a lookup we don't need), or detect from
`gh repo view` (rejected — a network call for a value we chose ourselves). Detection
survives only for a pre-existing repo where `main` doesn't exist, which is the one
case where the answer isn't already known.

**The D1 account cap is recorded and not acted on.** Cloudflare caps D1 at ten
databases per account and each project takes two, so a fifth project fails on a raw
`7406`. Deliberately out of scope: adopters are typically on a fresh account, the
failure is loud rather than silent, and handling it in conversation when it happens
beats a pre-flight on every run. Written down here so the next person meeting
`7406` finds the cause rather than rediscovering it.

**Setup narrates the two things the tools get wrong.** `openspec init`'s
`/opsx:propose` line and `cf-build.sh`'s bare stop are both cases of a tool being
correct in isolation and misleading in this flow. Neither is ours to change
upstream, so setup and the wrapper each say the true next thing immediately after.
The wrapper's fix is the message alone — running the app happens at the deployed
preview URL, not locally, so its real reader is whoever opens the CI log.

## Risks / Trade-offs

- **Existing installs keep the wrong `migrations_dir`** → they already have a
  working config or they'd have noticed; the adapt step surfaces the fragment
  change for repos that want it. Not worth a migration script for a one-line value.
- **Narrowing `TARGET_PROVIDED` could surface links we then exempt again out of
  convenience** → the spec now requires an exemption be traceable to a step that
  writes the path, so the pressure resolves toward seeding rather than exempting.
- **A JSON file list is a second thing to update when adding a payload file** →
  mitigated by it replacing the checker's three constant arrays and the agent's
  hand-derivation, so the net count of restatements goes down, not up.
- **The unconditional `.gitignore` touches a file the target owns** → it is created
  where absent and appended-to where present, never rewritten, matching the
  fragment rules already in force. A repo that already ignores both families gets
  nothing.
- **Assuming `main` is wrong for a repo whose default is something else** → the
  fallback covers it, and the case cannot arise in a repo setup created. The risk
  runs the other way today: the prescribed detection fails on the common path.
- **A derived git identity could attribute commits to the wrong person on a shared
  machine** → it comes from whoever `gh` is authenticated as, which is the same
  account the push will use; a mismatch there is already a problem the commit
  author would not have caught.
- **Leaving the D1 cap unhandled means someone eventually hits it cold** → accepted
  deliberately; the cause is written into the design so the diagnosis is one search
  away.

## Migration Plan

Payload-prose change, so the release is the migration: bump `VERSION` (minor —
additive rungs and corrected fragments, no removed capability), add the newest-first
`CHANGELOG.md` entry, and run `node scripts/check-payload-links.mjs` as the gate.
New installs get everything. Existing installs get the corrected fragments and
runbooks through `/wong-sync`'s adapt step as proposals, which is the designed path
and needs no special handling. Rollback is reverting the commit; nothing is
provisioned, generated, or stored outside the repo.

## Open Questions

- Should the seeded `wiki/development/README.md` carry real sections drawn from the
  research, or a minimal hub that `/dream` fills in later? Leaning real-but-short —
  an empty hub is the stale-wiki failure the toolkit exists to prevent.
- Is `README.md` at the repo root worth seeding too, or only exempting? It is
  linked from `wiki/stack/getting-started.md` and absent in a fresh repo, but a
  README is the most personal file a project has and a generated one tends to
  survive unedited. Currently proposed as an offer, not a write.

<!-- end design.md -->
<!-- file tasks.md utf8 3770 -->
## 1. wong-setup — the ground a fresh repo is missing

- [x] 1.1 Derive the git identity from `gh api user` before the first commit — name from `name`, email from `email` or the `<id>+<login>@users.noreply.github.com` fallback when it's null — set both, state what was set, ask nothing
- [x] 1.2 Add the ask-for-it fallback for when `gh` is unauthenticated or the call fails, so setup never commits without an identity
- [x] 1.3 Move the initial commit so it lands after Step 6/7 have written files, and state in Step 5 that an empty folder has nothing to commit yet — no placeholder file, no commit-less repo
- [x] 1.4 Write the `.gitignore` secrets entries unconditionally in Step 6, before anything can act on `secrets.md`; create the file where absent, append where present, add nothing where both families are already covered
- [x] 1.5 Split the `.gitignore` entries out of the Step 6 secrets *offer* so declining the convention no longer declines the protection — the `.env.example` seed and the docs page stay an offer
- [x] 1.6 Seed `wiki/development/README.md` alongside `wiki/README.md` in the wiki-hub step, with real short sections rather than an empty stub
- [x] 1.7 Correct Step 5's no-Node verb list: `/save`'s change-authoring shells out to the CLI, so it belongs with `/plan`, `/apply`, `/ship` as unavailable — not with the verbs that survive
- [x] 1.8 Add a line after `openspec init` in Step 5 correcting its `/opsx:propose` closing suggestion — this repo drives OpenSpec through `/plan`, and the `/opsx:*` commands aren't installed

## 2. The default branch

- [x] 2.1 Replace the `git symbolic-ref refs/remotes/origin/HEAD` instruction in `save/SKILL.md` and `save/references/git-gate.md` with assuming `main`, detecting only where `main` doesn't exist
- [x] 2.2 Make the same replacement in `ship/SKILL.md`
- [x] 2.3 Sweep the payload for any other copy of the same instruction and bring it in line

## 3. The stack-pack fragments

- [x] 3.1 State `migrations_dir` per layout in the `wrangler.jsonc` fragment — `../schema/migrations` in the `app/` layout, `schema/migrations` at the root — mirroring how the fragment already handles `main`
- [x] 3.2 Add `migrations_dir` as a rule in the fragment's "rules the scripts depend on" list, noting that the pack ships `schema/` at the repo root and the config sits beside the Worker
- [x] 3.3 Make `cf-build.sh`'s no-config message name `/wong-cloudflare` as the fix, leaving the exit status unchanged

## 4. The payload single source

- [x] 4.1 Add the machine-readable payload file list as JSON beside `payload-manifest.md`, carrying paths and category tags (core / pack / scaffold / ui-only); link it from the prose, which keeps the reasoning, gating rules, and exclusions
- [x] 4.2 Rewrite `check-payload-links.mjs` to read that list instead of its `SKILLS` / `DOCS` / `PACK_FILES` constants
- [x] 4.3 Narrow `TARGET_PROVIDED` to paths setup demonstrably writes — after 1.4 and 1.6 land, so the repo isn't red between tasks — and fix, rather than re-exempt, whatever dead links surface
- [x] 4.4 Decide the root `README.md` question from design.md's open questions: seed, offer, or exempt — and make the exemption list match the answer

## 5. Docs

- [x] 5.1 Correct `wiki/development/secrets.md`'s claim so it describes what is now true, and confirm its `../../.gitignore` link resolves in a fresh install
- [x] 5.2 Reality-check the `wiki/stack/` pages touched by 3.x against the corrected fragment values

## 6. Release

- [x] 6.1 Run `node scripts/check-payload-links.mjs` and confirm it exits zero with the seeded hubs in place and the narrowed exemptions
- [x] 6.2 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry describing the first-install fixes

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 6477 -->
## ADDED Requirements

### Requirement: Git identity is derived from GitHub, not requested

`wong-setup` SHALL ensure `user.name` and `user.email` resolve before it makes any
commit, and where they do not, SHALL derive them from the authenticated GitHub
account rather than asking the user. It SHALL state what it set.

`gh auth login` does not set a git identity, so a machine that has only ever
authenticated to GitHub still fails — and without one `git commit` aborts with
*"Author identity unknown / Please tell me who you are"*, a wall precisely at the
newcomer the skill is written for.

The account already holds both values, so asking is a question with a knowable
answer. `gh api user` returns `name` and `login`; `email` is commonly `null`,
because keeping the address private is GitHub's default. The identity SHALL
therefore use the account's **noreply address**, formed from the numeric id and
login, which always works for pushes and discloses no personal address. Setup
SHALL fall back to asking only where `gh` is unauthenticated or the call fails.

#### Scenario: Fresh machine, GitHub authenticated

- **WHEN** setup reaches the initial commit with no identity set at any scope and `gh` authenticated
- **THEN** it sets `user.name` and `user.email` from the account without asking, names the values it set in one plain line, and commits

#### Scenario: The account hides its email

- **WHEN** the account's `email` is `null`
- **THEN** the noreply address formed from the account's id and login is used, and nothing is asked

#### Scenario: Identity already configured

- **WHEN** an identity resolves globally or in the repo
- **THEN** it is left alone and nothing is asked or announced

#### Scenario: GitHub not available to read from

- **WHEN** no identity is set and `gh` is unauthenticated or its call fails
- **THEN** setup asks for a name and email as the fallback, rather than committing without one

### Requirement: The default branch is main unless the repo says otherwise

The skills SHALL treat `main` as the default branch, and SHALL determine it another
way only where `main` does not exist.

`/save` and `/ship` currently instruct the agent to substitute *"whatever
`git symbolic-ref refs/remotes/origin/HEAD` resolves to"*. That command fails with
`not a symbolic ref` on a freshly created repo — `gh repo create --push` does not
record the head — so the documented setup path produces a repo where the documented
first command errors.

Detection also solves a problem this toolkit doesn't have: setup runs
`git init -b main`, and `gh repo create` adopts the local branch, so every repo it
creates is on `main`. The fallback exists for a pre-existing repo on `master` or
another name, which is the only case where the question is real.

#### Scenario: Repo created by the setup

- **WHEN** any verb needs the default branch in a repo setup created
- **THEN** it uses `main` without running a detection command

#### Scenario: Pre-existing repo on another default

- **WHEN** `main` does not exist in the repo
- **THEN** the actual default is resolved and used, and the resolution is not assumed to succeed silently

### Requirement: Setup seeds every wiki hub the payload links to

`wong-setup` SHALL seed a hub at each wiki directory a payload page links to — today
`wiki/README.md` **and** `wiki/development/README.md` — not only the wiki root.

Shipped payload pages link to `wiki/development/README.md`: `secrets.md` closes with
*"Other development processes live in [Development](README.md)"* and
`required-tools.md` carries the same pointer. Nothing creates it, so it is a dead
link in every install. The rule the manifest already states — a cited owner is a
shipped owner — extends to a cited hub.

#### Scenario: Fresh repo with no wiki

- **WHEN** setup seeds the wiki for a repo that has none
- **THEN** it writes both `wiki/README.md` and `wiki/development/README.md`, each with real content drawn from the research rather than an empty stub

#### Scenario: A payload page gains a link to a new section hub

- **WHEN** a payload page is added that links to a section hub not yet seeded
- **THEN** that hub joins the set setup seeds, and the release check fails until it does

### Requirement: Setup corrects OpenSpec's closing instruction

After running `openspec init`, `wong-setup` SHALL tell the user which verb to
actually use, because the CLI closes by printing *"Start your first change:
/opsx:propose"* — a slash command WongStack states `openspec init` does not
generate and that agents are told not to reach for.

The correction is one line, and it is the last thing the user reads on that step,
so it SHALL come after the init output rather than before it.

#### Scenario: init prints its own getting-started line

- **WHEN** `openspec init` completes and prints its `/opsx:propose` suggestion
- **THEN** setup immediately says that this repo drives OpenSpec through `/plan`, and that the `/opsx:*` commands are not installed here

## MODIFIED Requirements

### Requirement: Bootstrap from zero

The `wong-setup` skill SHALL treat "no git repository yet" (an empty or non-repo folder) as a first-class, supported starting point, and SHALL NOT assume the user is already inside a git repo. When no repo exists, it SHALL offer, in plain language and only after confirmation, to create one and continue the setup — never failing or dead-ending the newcomer.

Because an empty folder has nothing to commit, the initial commit SHALL be made
**after** the authoring and seeding steps have written files, not as a bare rung
ahead of them. Setup SHALL NOT invent a placeholder file to commit, and SHALL NOT
leave the repo commit-less.

#### Scenario: Empty folder, never touched git

- **WHEN** the skill runs in a folder with no `.git` and the user has never used git
- **THEN** it explains in plain language that it will set up a repo for them, offers to create it (with an initial commit), and — only on confirmation — proceeds into the rest of the setup

#### Scenario: Already in a repo

- **WHEN** the skill runs inside an existing git repo
- **THEN** it skips the bootstrap-from-zero path and proceeds as before, without asking repo-creation questions

#### Scenario: Nothing exists to commit yet

- **WHEN** the repo is initialized in a folder with no files at all
- **THEN** the initial commit waits until the seeded files exist, rather than failing on an empty index or committing a placeholder

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/payload-single-source/spec.md utf8 3952 -->
## ADDED Requirements

### Requirement: The manifest's file list has a machine-readable form

The payload manifest SHALL carry a machine-readable list of the paths it covers,
beside the prose that explains them, and `check-payload-links.mjs` SHALL read that
list rather than restating it.

Today the list is prose spread across three sections plus a fourth of exclusions,
and two independent restatements exist: the checker's own `SKILLS` / `DOCS` /
`PACK_FILES` constants, and whatever the installing agent assembles by hand at
install time — roughly sixty paths derived from paragraphs, per install. That is
the drift this capability exists to prevent, in the one file that defines what
drift even means.

The prose stays: it carries the reasoning, the gating rules, and the exclusions,
none of which a list can hold.

#### Scenario: A file is added to the payload

- **WHEN** a new payload file is introduced
- **THEN** it is added to the machine-readable list once, and both the checker and the installing agent pick it up without a second edit

#### Scenario: Agent performs an install

- **WHEN** an agent follows the sync's copy step
- **THEN** it reads the file list rather than deriving paths from prose

## MODIFIED Requirements

### Requirement: No payload file ships a link it cannot resolve in a target

A file in the payload SHALL NOT contain a link to a path outside the payload. A payload file is copied verbatim into repos that have none of this repo's own content, so a link resolvable only here is broken everywhere it lands.

`wiki/wiki-style.md` is the live instance: the rulebook every target is told to follow ships with links to `../marketing/find-inspiration.md` and `weekly-cadence.md`, which exist only in WongStack. Where a payload page needs an example from this repo's wiki, it SHALL generalize the example or drop it, rather than link to it.

Because this is mechanically checkable, it SHALL be checked rather than reviewed: **releasing a payload change SHALL include resolving every internal link in a fresh install.** A payload whose links do not resolve in a target is defective regardless of whether it resolves here — this repo is not a valid test of it, since this repo has content no target does.

The check MAY treat a path as present-in-any-target only where the install
**actually produces it**. An exemption asserting that a file exists is a claim about
`wong-setup`'s behaviour, and SHALL be traceable to the step that writes it.

The audit found the exemption list carrying `wiki/development/README.md` under the
comment *"the wiki hubs `/wong-setup` seeds"*, when setup seeds only the wiki root —
so the check reported no dead links against an install that had eight. An exemption
that is not true converts this check from a guarantee into a restatement of an
assumption, which is worse than not having it, because it is trusted.

#### Scenario: Payload links resolve in a fresh install

- **WHEN** the payload is installed into a repo with no prior content
- **THEN** every internal link in every copied file resolves to a file that exists
- **AND** a link that does not resolve is a release defect

#### Scenario: The source repo is not accepted as the test

- **WHEN** a payload file's links are verified
- **THEN** they are verified against a fresh install, not against this repo
- **AND** a link resolving only here counts as broken

#### Scenario: A payload page needs a local example

- **WHEN** a payload page would illustrate a rule with a page only this repo has
- **THEN** the example is generalized or omitted
- **AND** no link to a non-payload path is shipped

#### Scenario: An exemption claims a file the install does not create

- **WHEN** the check exempts a path on the grounds that any real target has it
- **THEN** a step in `wong-setup` demonstrably writes that path
- **AND** where no step does, the exemption is removed and the resulting dead link is fixed rather than exempted

<!-- end specs/payload-single-source/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 2695 -->
## ADDED Requirements

### Requirement: The ignore rule exists before the page that promises it

The `.gitignore` entries covering the real secrets files SHALL be in place by the
end of `wong-setup`, unconditionally — before `secrets.md` (which arrives in the
same run) can be read and acted on.

`secrets.md` states that `.env` *"is listed in `.gitignore` (alongside common
variants like `.env.local` and `.dev.vars`) so it can't be committed by accident"*
and links to that file. In a fresh install neither the entries nor the file exist:
the promise is false at the exact moment it is made, and the page's own
`cp .env.example .env` instruction produces an unignored file full of credentials.

Applying the entries SHALL NOT depend on `/wong-cloudflare`, which is documented as
deferrable indefinitely (*"No rush; it works whenever"*) and which today is the
only thing that ever writes them. A guarantee that arrives with an optional later
step is not a guarantee.

#### Scenario: Fresh repo finishing setup

- **WHEN** `wong-setup` completes against a repo that had no `.gitignore`
- **THEN** a `.gitignore` exists carrying the wildcard-and-negation pair for both secrets families, and `git check-ignore .env` and `git check-ignore .dev.vars` both match

#### Scenario: The user declines the wider secrets convention

- **WHEN** the user declines the offered `.env.example` seed
- **THEN** the ignore entries are still written, because they protect against a mistake rather than impose a convention

#### Scenario: Repo already ignores its secrets files

- **WHEN** the repo's existing `.gitignore` already covers both families
- **THEN** nothing is added and nothing is asked

## MODIFIED Requirements

### Requirement: The installer offers the convention without forcing it

`wong-setup` SHALL offer to seed the convention into a target repo — the `secrets.md` page (at the target's resolved wiki root) plus, on confirmation, an `.env.example`. It SHALL confirm before adding the example, since the target may already handle secrets its own way.

The `.gitignore` entries are **not** part of that offer: they are written
unconditionally, because declining a convention is a choice about documentation and
leaving credentials committable is not.

#### Scenario: Installer seeds on opt-in

- **WHEN** `wong-setup` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example`; if the user declines, it leaves the example untouched

#### Scenario: Declining does not disable the ignore rule

- **WHEN** the user declines the convention entirely
- **THEN** the `.gitignore` entries are written anyway and the decline is honoured for everything else

<!-- end specs/secrets-convention/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 3097 -->
## ADDED Requirements

### Requirement: Every config-relative path in a fragment is stated per layout

The `wrangler.jsonc` fragment SHALL state, for each path it carries that Wrangler
resolves relative to the config file, what that path is in **both** supported
layouts — the repo-root layout and the `app/` subdirectory layout the app scaffold
ships — and `migrations_dir` SHALL join `main` as a rule the scripts depend on.

The fragment is the only thing in the payload that ever creates a target's Wrangler
config, so a path it states wrongly is wrong in every repo that has one. It already
does this correctly for `main` (*"resolved relative to the config file, so
`worker/index.ts` is right for both layouts"*) and the `package.json` fragment does
it for its `../scripts/` paths — `migrations_dir` is the omission. The pack ships
`schema/` at the repo root, so in the `app/` layout the correct value is
`../schema/migrations`; the fragment's literal `schema/migrations` resolves to
`app/schema/migrations`, which never exists.

This is the flagship path, not a corner: an appless repo takes the scaffold, so the
`app/` layout is what every non-technical first install receives. WongStack's own
`app/wrangler.jsonc` carries the correct value with a comment explaining it, which
is why the defect is invisible here.

#### Scenario: Fragment applied in the app/ layout

- **WHEN** `/wong-cloudflare` creates `app/wrangler.jsonc` from the fragment
- **THEN** `migrations_dir` is `../schema/migrations`, and `wrangler d1 migrations apply` finds the pack's migrations directory

#### Scenario: Fragment applied at the repo root

- **WHEN** the Worker and its config sit at the repo root
- **THEN** `migrations_dir` is `schema/migrations`

#### Scenario: Wrong path is caught at first migration

- **WHEN** a repo's config points `migrations_dir` at a directory that does not exist
- **THEN** the build wrapper exits non-zero rather than deploying a Worker against an unmigrated database

### Requirement: The build wrapper's stop names its remedy

Where `cf-build.sh` stops because no Wrangler config is present, its message SHALL
name what to run — `/wong-cloudflare` — rather than reporting only the missing file.

An unprovisioned repo is the *expected* state after setup, because the pack is
adopted before it is configured and the token is documented as arriving later. The
message that state produces — `wong: ERROR — no wrangler config found under <root>`
— names a file the reader has never heard of and gives no next step.

This is a message fix and nothing more. The audience is whoever reads the CI log,
since running the app is done at the deployed preview URL rather than locally; the
exit status SHALL NOT change, so CI behaviour stays exactly as it is.

#### Scenario: Build runs before provisioning

- **WHEN** the build wrapper runs in a repo that has taken the pack but not yet run `/wong-cloudflare`
- **THEN** the message states that the repo is not configured for Cloudflare yet and that `/wong-cloudflare` configures it
- **AND** the exit status is unchanged

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 2715 -->
## MODIFIED Requirements

### Requirement: Runtimes are installed at the point of need, never pre-emptively


No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node remains a real dependency of the planning verbs — but not of the knowledge layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what
the verbs actually do. `/save` shells out to `openspec new change`,
`openspec status --json`, and `openspec instructions` when it authors a change for a
session that skipped `/plan`, so it is **not** a no-runtime verb, and `wong-setup`
currently promises that it is. A list that is wrong here is worse than no list: it
is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs its readiness check on a machine with no Node.js
- **THEN** it does not install Node during the check
- **AND** it proceeds until a step genuinely requires the OpenSpec CLI, then explains in plain language what needs installing and why, and asks

#### Scenario: The user declines the runtime install

- **WHEN** the user declines the Node install
- **THEN** setup completes the layer that needs no runtime — `CLAUDE.md`, the wiki, `notes/`, the skills, and the verbs that touch only git and files
- **AND** it names exactly which verbs are unavailable without the CLI and how to enable them later
- **AND** it does not dead-end, fail, or leave the repo half-written

#### Scenario: Install prefers a user-local method

- **WHEN** the user consents to installing Node
- **THEN** the install targets the user's own home directory rather than requiring `sudo`, wherever the platform allows it

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** setup states which verbs work without the CLI
- **THEN** `/save`'s change-authoring path is named as needing it, alongside `/plan`, `/apply`, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-06

~~~
<!-- end .openspec.yaml -->
