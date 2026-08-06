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
