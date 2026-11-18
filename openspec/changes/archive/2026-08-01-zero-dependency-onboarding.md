<!-- openspec-archive v1 2026-08-01-zero-dependency-onboarding -->
<!-- file proposal.md utf8 14530 -->
# Zero-dependency onboarding

**Status:** ready-to-ship — verified end to end against a live repo; 49/51 tasks, the two open ones need environments this machine can't provide
**Open questions:** none blocking. Two environmental checks remain (a machine without Node; a fresh `gh auth login` to confirm the `workflow` scope), and the two disposable test repos need `delete_repo` scope to remove.

## Why

Today a person who wants the Cloudflare app running has to leave the agent and work the dashboard by hand: create a token whose exact permission set they must guess, create the databases, wire the binding, connect the build, then stand up Zero Trust before anything is reachable. Every one of those steps is a place to stall, and none of them is something the agent can do for them.

Live investigation against the Cloudflare API showed most of that is unnecessary. A user-scoped token holding only *API Tokens Write* can **widen its own permissions** via `PUT /user/tokens/{id}` — verified end to end — so the user ticks two boxes once and the agent grants itself everything else on demand. What's left for the human is signing up and pasting one token.

## What Changes

- **A new `/wong-cloudflare` provisioning skill** — gated on `components.stackPack: true`, re-runnable long after `/wong-setup` (the token arrives later than onboarding does). Given one token it widens its own permissions, resolves the account, creates the production and staging D1 databases, writes the binding into `wrangler.jsonc`, sets the GitHub secrets, and reports the live URLs.
- **The self-widening token protocol** becomes the documented credential path: verify → read own policy → look up permission-group ids → `PUT` a widened policy set → narrow again when done. The token value never changes, so `.env` is written once.
- **GitHub Actions becomes the pack's CI.** Workers Builds can't be connected through its API at all — no repo connection, no branch config, no first trigger — so it costs three dashboard steps per repo and produces no PR check. A workflow file joins the pack. Because v8.0.0 moved the branch split into `scripts/cf-deploy.sh`, the workflow is a thin driver and **the deploy model doesn't change**; the only script edit is a CI-neutral `CF_BRANCH` with `WORKERS_CI_BRANCH` kept as a fallback, so a repo on Workers Builds keeps working untouched.
- **`gh` gains the `workflow` scope during setup.** It is not in `gh auth login`'s minimum set, and without it the workflow-file push fails with `refusing to allow an OAuth App to create or update workflow` — at push time, long after setup reported success. Requesting it in the browser visit setup already performs costs nothing; `gh auth refresh --scopes workflow` is the repair for anyone already authed. (Repository secrets need no such handling — `gh secret set` works on the default `repo` scope.)
- **Zero Trust becomes opt-in documentation, not provisioning.** Apps are public by default. **BREAKING for the header-trust default:** the template Worker no longer trusts `Cf-Access-Authenticated-User-Email`, because a public Worker that reads it lets anyone impersonate any user. The Access page becomes "how to turn auth on, and the code change that goes with it."
- **The credentials docs are reconciled.** `.env.example` and `wiki/stack/cloudflare-credentials.md` currently disagree on the variable name and the token type. One user-scoped `CLOUDFLARE_API_TOKEN` wins; the Workers Builds permission is named properly (`Workers CI Read` — Cloudflare calls Builds "CI", which is why searching for "build" finds nothing); and the page states plainly that a self-widening token *is* account-root, so self-widening and least-privilege are mutually exclusive and we chose the former for usability.
- **The non-technical user is the design target.** The stack-pack offer is rewritten as an outcome ("do you want this to be a real website people can visit?") rather than an inventory of components — since decline is the safe default, a jargon offer converts exactly the intended audience into a decline. The token screen gets a literal click path with the Account Resources field called out. API errors are translated into the one thing to fix. Resource names are derived from the repo, never asked. And a short human-facing walkthrough of the whole path ships alongside the agent-facing runbook.
- **Runtimes install at the point of need, never pre-emptively.** The OpenSpec CLI is npm-only with no standalone binary, so Node stays a real dependency of the planning verbs — but setup no longer treats it as a precautionary install. It asks when a step actually needs it, prefers a user-local install over `sudo`, and if declined completes the runtime-free layer (CLAUDE.md, wiki, notes, the git-only verbs) while naming what is unavailable. `node` is also permitted inside pack-gated scripts, where it already exists at the build boundary; provisioning stays `curl`-first so it never triggers an install.
- **Multi-account handling and a teardown path.** Provisioning lists accounts and asks rather than assuming one. Teardown removes what a run created, so repeated fresh-repo tests stop leaking Workers and databases.
- **An end-to-end fresh-repo test** of the whole paste-to-deployed path, run against a live repo and real Cloudflare. It found two bugs, both fixed here: binding types weren't regenerated after provisioning (first build failed `tsc`), and — **live in 8.0.0, independent of this change** — every feature branch deployed to the **production** Worker on the **production** database, because `@cloudflare/vite-plugin` selects the environment at build time and `--env` on `wrangler deploy` has no effect once its redirect config exists. Fixed with build-time `CLOUDFLARE_ENV`, a conditional `--env`, and a fail-closed guard that refuses to deploy when a non-production branch resolves to production's Worker.
- **The CI gate is fixed too.** `wait-for-checks.sh` swallowed gh's stderr and read empty output as "no checks", so on any `gh` without `gh pr checks --json` it silently reported `NONE` — disabling the delivery gate `/ship` relies on. It now falls back to the default output and reserves `NONE` for gh explicitly saying so; everything else becomes `RESULT: UNKNOWN`, which `/save` reports as unverified and `/ship` refuses to merge on.
- **Release chores:** `VERSION` bump from 8.0.0 to 8.1.0, a newest-first `CHANGELOG.md` entry, and the new payload files registered in the stack-pack section of the payload manifest.

### Non-goals

Automating Cloudflare signup, first-token creation, or `gh auth login` (all irreducibly interactive); removing Node as a dependency by forking OpenSpec's artifact schema into the payload (the CLI supplies templates and the dependency graph at runtime across 58 call sites — owning that fork permanently costs far more than it saves); provisioning Zero Trust; verifying Zero Trust cold-start on a never-onboarded account (untestable on the available accounts — both already have orgs); forcing a repo off Workers Builds (it keeps working; adopting the workflow is opt-in per repo); any change to a repo that declined the stack pack.

## Capabilities

### New Capabilities
- `cloudflare-provisioning`: the token-driven provisioning skill — the self-widening protocol, account resolution, D1 and Worker creation, GitHub secret and workflow setup, the executable runbook, and teardown.

### Modified Capabilities
- `stack-pack`: the pack gains a GitHub Actions workflow as its CI, and the build/deploy scripts take a CI-neutral branch variable so a Workers Builds repo is unaffected.
- `install-onboarding`: the stack-pack offer is rewritten in outcome language and names provisioning as the follow-on; `gh` auth requests the `workflow` scope; the OpenSpec CLI outcome no longer implies a pre-emptive runtime install; the human-facing walkthrough joins the payload.
- `cloudflare-access-guide`: Access demoted to opt-in; header trust off by default; the credentials requirement rewritten around the self-widening user-scoped token and the real `Workers CI Read` permission name.
- `toolchain-dependencies`: the current rule says pack tools run "never inside a WongStack skill," which a `curl`-driven provisioning skill contradicts. The carve-out names `curl`, bounds it to stack-pack repos, permits `node` where it is already required at the build boundary, and adds the point-of-need install rule — keeping the core three-tool guarantee intact for everyone else.

## Impact

- **New:** `.claude/skills/wong-cloudflare/` (+ references), a `wiki/stack/` provisioning runbook, a human-facing walkthrough of the paste-to-running-app path, `.github/workflows/deploy.yml`.
- **Modified:** `scripts/cf-build.sh` and `scripts/cf-deploy.sh` (CI-neutral `CF_BRANCH`; `--app-dir`), `wiki/stack/d1-pipeline.md` (a CI section), `wiki/stack/core-stack.md`, `wiki/stack/cloudflare-access.md` (opt-in framing + header-trust default), `wiki/stack/cloudflare-credentials.md`, `.env.example`, `wiki/development/required-tools.md`, `.claude/skills/wong-sync/references/payload-manifest.md`, `.claude/skills/wong-setup/SKILL.md` (Step 6 stack-pack offer mentions provisioning), `VERSION`, `CHANGELOG.md`, and the `.agents/skills/` mirror.
- **External:** Cloudflare API (tokens, D1, Workers, subdomain), GitHub API via `gh` (secrets, workflow scope). Actions minutes become a cost on private repos.
- **Security:** the documented token is effectively account-root — stated explicitly rather than implied away.

## Decision log

- **2026-08-01** — Explored, planned, and implemented in one thread; then reversed course twice on CI before landing, so the reasoning is recorded here rather than re-derived. **Provisioning:** verified live that a Cloudflare token holding only `API Tokens Write` + `Account API Tokens Write` can widen its own permissions via `PUT /user/tokens/{id}` — nine endpoints went from `10000 Authentication error` to resolving, and the token id is stable so `.env` is written once. That single finding is what makes auth opt-in free, and it's why the design accepts an effectively account-root credential (stated plainly rather than softened). **Node:** kept the OpenSpec CLI rather than forking its artifact schema — it supplies templates and the dependency graph at runtime across 58 call sites — but on the user's instruction runtimes now install at the point of need, never pre-emptively, with a clean degradation to the runtime-free layer. **CI:** first chose GitHub Actions, then reverted to Workers Builds at the user's request ("do the github actions in another PR"), then restored Actions when they reversed again — final state is Actions, made much cheaper by v8.0.0 having already moved the branch split into `cf-deploy.sh`, so the workflow is a thin driver and the only script edit is a CI-neutral `CF_BRANCH` with `WORKERS_CI_BRANCH` retained as fallback. Ruled out: supporting both CI backends as a documented dual path (doubles the docs surface and forces every skill to branch on which CI a repo uses).
- **2026-08-01** — Merged `origin/main` (v8.0.0, staging-is-its-own-Worker) into this work. Six conflicts, resolved by keeping main's facts and this change's additions. One silent loss worth recording: a wholesale rewrite of `wiki/stack/cloudflare-credentials.md` dropped main's new "Worker secrets are per environment" section without git flagging a conflict — recovered by diffing `22a679e..a5d7a97`. Version renumbered 7.2.0 → **8.1.0**, since main had taken both 7.2.0 and 8.0.0.
- **2026-08-01** — Ran the end-to-end test on a real disposable repo against real Cloudflare, which found two bugs. **(1)** The first build after provisioning failed with `Property 'DB' does not exist on type 'Env'` — `worker-configuration.d.ts` is generated from `wrangler.jsonc`, so a binding written during provisioning breaks `tsc` until someone regenerates by hand. `cf-build.sh` now does it in CI. **(2) Severe, and live in 8.0.0 independent of this change:** on the SPA layout the pack ships, every feature-branch push deployed to the **production** Worker bound to the **production** database. Cause confirmed against Cloudflare's docs — `@cloudflare/vite-plugin` flattens the selected environment into a generated config and redirects wrangler at it, after which `--env` on `wrangler deploy` "will have no effect". The failure is silent: green build, preview URL printed, production overwritten, while migrations still went to staging. Fixed in three parts (build-time `CLOUDFLARE_ENV=staging`; drop `--env` when the redirect exists; a fail-closed guard that refuses to deploy when a non-production branch resolves to production's Worker name). The user chose to fold this into this change rather than a follow-up, to get one end-to-end-verified PR. Two of my own errors en route, both caught before shipping: a first guard that would have fired on *every correct* staging build (compared two values that both came from the generated config), and a `configPath` resolved relative to the app dir when it is relative to the redirect file's own directory — the latter reached CI and silently disabled the guard. Verified: fresh branch marker reached staging and the alias and never production; then the selection was deliberately re-broken and the deploy was blocked with the guard's error. All Cloudflare test resources torn down.
- **2026-08-01** — This change's own `/save` reported `CI — none configured` while three checks were green on the PR, which exposed a pre-existing bug in `wait-for-checks.sh`: it ran `gh pr checks --json …` with stderr sent to `/dev/null` and read empty output as "no checks". `--json` doesn't exist on gh 2.46, so the flag error was swallowed and the delivery gate silently disabled itself — `/ship` would have merged a red branch believing the repo had no CI. Fixed by probing for the flag and falling back to the default output, and by narrowing `NONE` to *gh explicitly said no checks*; every other unaskable case is a new `RESULT: UNKNOWN` carrying gh's message, which `/save` reports as unverified and `/ship` refuses to merge on. The existing spec requirement had encoded the bug verbatim ("emptiness of the filtered output is the only such signal") and was amended. Verified against the live PR (now `SUCCESS`, previously `NONE`) and with a stubbed `gh` across all six branches. Folded into this change rather than split out, per the user's preference for one end-to-end-verified PR.

<!-- end proposal.md -->
<!-- file design.md utf8 16411 -->
## Context

The stack pack currently assumes a human did the Cloudflare setup by hand. `wiki/stack/d1-pipeline.md` is written around Workers Builds — `scripts/cf-build.sh` keys off `WORKERS_CI_BRANCH` and Cloudflare's dashboard supplies both the trigger and the preview/production distinction. `wiki/stack/cloudflare-access.md` walks five dashboard steps and hands the Worker a trusted identity header. Nothing in the payload provisions anything.

Live probing against the Cloudflare API during `/explore` changed what's possible. The findings below are verified unless marked otherwise, and they're the foundation the rest of this design rests on:

| Finding | Status |
|---|---|
| A token with `API Tokens Write` can widen its own policies via `PUT /user/tokens/{id}` | **Verified** — nine surfaces went from `10000 Authentication error` to resolving |
| Token id is stable across a widen, so `.env` is written once | Verified |
| Workers Builds cannot be connected via API (no repo connection, no branch config, no first trigger) | Verified against Cloudflare docs + closed feature request `workers-sdk#12058` |
| The Cloudflare GitHub App needs browser OAuth; `gh` cannot install it | Verified (programmatic install is GitHub-Enterprise-only) |
| The Workers Builds permission group is named `Workers CI Read`/`Write` | Verified — no group among all 391 matches "build" |
| `Access: Apps and Policies Write` exists twice; only `1e13c512…` is account-scoped | Verified (`959972745952…` is zone-scoped and wrong here) |
| Preview URLs come from `wrangler versions upload --preview-alias`, format `<alias>-<worker>.<subdomain>.workers.dev` | Verified in Cloudflare docs |
| `gh secret set` needs only the `repo` scope `gh auth login` already grants; pushing `.github/workflows/*.yml` needs `workflow`, which is **not** in the minimum set | Verified — relevant to the deferred Actions change, not this one |
| `@fission-ai/openspec` ships only `bin/openspec.js` — no standalone binary, so the CLI implies Node | Verified via `npm view` |
| `POST /accounts/{id}/access/organizations` works on a never-onboarded account | **Unverified** — both available accounts already have Zero Trust orgs |

Constraints that bound every decision: the payload is prose, not code, so "implementation" means a runbook an agent executes; `wiki/development/required-tools.md` promises the core payload needs only `git`, `gh`, and `openspec`; and a repo that declined the stack pack must be byte-for-byte unaffected.

## Goals / Non-Goals

**Goals:**
- One paste sets up knowledge; one token sets up infrastructure. The human's list is: sign up, create a token, and connect the build once per repo — with that last one named as manual rather than papered over.
- The agent can widen its own Cloudflare permissions on demand, so optional features cost nothing up front.
- CI is left exactly as it is, so this change can be reviewed and reverted independently of the CI question.
- Every provisioned resource can be torn down, so the fresh-repo test is repeatable.
- Developing needs no local runtime — push a branch, get a preview URL.
- **A non-technical person can complete the whole path unaided.** Every prompt is phrased as an outcome, every failure names the thing to fix, and nothing asks the user to invent a name or navigate an unillustrated screen.
- Nothing is installed on the user's machine pre-emptively; an install happens only when a step needs it, and only on consent.

**Non-Goals:**
- Automating signup, first-token creation, or `gh auth login`.
- Provisioning Zero Trust, or resolving the cold-start unknown.
- Changing CI. Workers Builds stays; the GitHub Actions alternative is its own later change (Decision 3).
- Least-privilege credentials (explicitly traded away — see Decision 2).

## Decisions

### 1. The token widens itself rather than the user pre-granting everything

The user creates one user-scoped token with `API Tokens Write` (`686d18d5ac6c441c867cbf6771e58a0a`) and `Account API Tokens Write` (`5bc3f8b21c554832afc660159ab75fa4`), account resources included. The skill then:

```
  /user/tokens/verify         → its own token id
  /user/tokens/{id}           → its current policy document
  /user/tokens/permission_groups → name → id lookup (391 groups)
  PUT /user/tokens/{id}       → widened policy set, preserving the original two
  /user/tokens/verify         → confirm, then re-probe the target surfaces
```

*Alternative rejected:* have the user tick all nine permission groups up front. It's the same single dashboard visit, so it saves the user nothing — and it forces someone who will never enable auth to grant Zero Trust permissions anyway. Self-widening is what makes Decision 4 (auth as opt-in) free.

*Alternative rejected:* mint a second, purpose-scoped token. It works, but it creates a new secret to store and rotate; self-widening keeps `.env` written once.

**The `PUT` replaces policies wholesale**, so the original two permission groups must be included in the new set or the skill loses its ability to widen again. Narrowing back afterward is offered, not automatic.

### 2. The credential is account-root, and the docs say so

A token that can widen itself is bounded only by what its owner can do. Calling it "narrow" because it starts with two checkboxes would be a lie the docs shouldn't tell. `cloudflare-credentials.md` states the trade plainly: self-widening and least-privilege are mutually exclusive; usability won; here is how to narrow it back when a run is done.

### 3. GitHub Actions replaces Workers Builds

Workers Builds cannot be connected to a repo through its API — no repository connection, no branch config, no first trigger — and its GitHub App needs browser OAuth that `gh` cannot grant. That is three unautomatable dashboard steps per repo, forever, in a change whose entire premise is removing them. It also puts build logs behind a second API needing a Cloudflare credential and `Workers CI Read`, where Actions gives `/save` and `/ship` the `gh run view --log-failed` they already use, plus a real pull-request check this repo currently lacks.

**v8.0.0 made this much smaller than it would have been.** The branch split now lives in `scripts/cf-deploy.sh` — default branch → `wrangler deploy`, any other → `wrangler deploy --env staging` then `versions upload --env staging --preview-alias`. That logic is CI-agnostic and already shipped. So the workflow is a thin driver, and the deploy model is untouched:

```
   workflow sets CF_BRANCH  →  cf-build.sh   (migrate the right D1, build)
                            →  cf-deploy.sh  (production | staging + alias)
```

The only script change is a **CI-neutral branch variable**: `CF_BRANCH` preferred, `WORKERS_CI_BRANCH` retained as fallback. Two lines per script, no behavior change for a repo on Workers Builds — which keeps working untouched, and can run both backends while migrating. Nothing is breaking.

*Trade-off accepted:* Actions minutes cost money on private repos (2,000/month free; public unlimited). Secrets also live in GitHub. A workflow file joins the pack.

**The `workflow` scope is a hard prerequisite and is missing by default.** `gh secret set` works on the `repo` scope `gh auth login` already grants, so secrets need no user action at all. But pushing the workflow file needs `workflow`, which is *not* in `gh auth login`'s minimum set — and its absence surfaces at push time, long after setup reported success, as `refusing to allow an OAuth App to create or update workflow`. For the target user that error is unrecoverable, so setup requests the scope up front (same browser visit, no extra step) and `gh auth refresh --scopes workflow` is the documented repair.

**Build-only until provisioned.** With no `CLOUDFLARE_API_TOKEN` secret the workflow builds and does not deploy, so a repo that took the pack but hasn't run `/wong-cloudflare` gets a useful PR check instead of a permanently red one. That path deliberately does not route through `cf-build.sh`, which requires an `env.staging` D1 entry a not-yet-provisioned repo won't have.

### 4. Zero Trust is opt-in documentation; the header-trust default flips

Apps are public by default. Access provisioning is not automated — partly because it isn't needed by most adopters, and partly because the one step that would strand a new user (Zero Trust cold start) is the one step that couldn't be verified.

The security consequence is not optional. `wiki/stack/cloudflare-access.md:85` has the Worker returning `Cf-Access-Authenticated-User-Email`. On a public Worker that header is attacker-controlled — anyone can set it and become any user. So the template Worker ships with **no header trust**, and the Access page becomes "how to turn auth on, *and the code change that goes with it*," with the two arriving together rather than the code trusting a header that nothing sets.

When a user does opt in, the skill widens itself into the Access groups at that moment and can drop them after.

### 5. `curl` is the provisioning dependency; `node` is permitted but never triggered

Provisioning drives the Cloudflare REST API directly rather than through `wrangler`, so an installing user needs no Node runtime. That contradicts today's rule in `required-tools.md` — pack tools run "never inside a WongStack skill" — so the carve-out is rewritten rather than quietly broken: `curl` is named, and bounded to repos with `components.stackPack: true`. A repo that declined the pack still runs on `git`, `gh`, and `openspec` alone.

`node` is **permitted** inside pack-gated skills and scripts — it is genuinely the better tool for permission-group lookup, policy-JSON assembly, and editing `wrangler.jsonc`, and a pack repo already has it at its build boundary. But provisioning stays **curl-first**, because reaching for `node` in the provisioning path would trigger an install during the one flow whose selling point is having no local setup. The rule is: use `node` where it's already required, never let it become the reason an install happens.

*Alternative rejected:* `npx wrangler` for provisioning. Same objection — it puts Node on the critical path of the paste-and-go flow.

### 8. Node is installed at the point of need, never pre-emptively

The OpenSpec CLI is npm-distributed (`@fission-ai/openspec`, a single `bin/openspec.js`, no standalone binary), and the payload leans on it hard — 58 call sites, of which `openspec instructions` supplies the artifact templates and rules at runtime and `openspec status --json` drives the dependency graph. Forking that into payload markdown would mean owning OpenSpec's schema forever and losing upstream. So the CLI stays, and Node with it.

What changes is *when*. Setup SHALL NOT install Node as a precaution during its readiness check. It installs at the moment a step actually requires it — with consent, preferring a user-local install (official installer or `nvm` into `$HOME`) over a `sudo` package manager, which can simply fail on a managed laptop.

This matters because the layers degrade cleanly:

```
   git + gh + an agent   →  CLAUDE.md, wiki/, notes/, skills, /save, /dream, /continue
   + node → openspec     →  /plan, /apply, /ship
   + a Cloudflare token  →  the running app (nothing new on the laptop)
```

The knowledge center — most of what the README promises — works with zero Node. If a user declines the install, setup completes that layer and says plainly which verbs are unavailable and how to get them, rather than dead-ending. This is the one step in the whole flow that mutates the machine rather than the repo, so it is the one step that asks.

### 9. The non-technical user is the design target

The audience is someone who does not know what a D1 database is. Three consequences that would otherwise be left to chance:

- **The stack-pack offer is an outcome, not an inventory.** "Do you want this to be a real website people can visit?" — not "the opt-in D1 + Workers stack pack: three zero-config pipeline scripts." Since declining is the documented safe default, a jargon offer means the target user declines out of confusion and this entire change never fires for them.
- **The token screen gets an exact click path.** It is the highest-risk moment in the flow: during `/explore` the token was created wrong twice — first account-scoped instead of user-scoped, then missing Account Resources — by someone with live API access to inspect it. Account Resources is the single most-missed field.
- **Failures speak plain language.** `10000 Authentication error` and `9109 Unauthorized` are the two codes a mis-created token produces, and neither tells the user which checkbox is missing.

Resource names are derived from the repo name and stated, never asked — the target user has no opinion about what to call a database.

### 6. Accounts are resolved by asking, never assumed

`/accounts` can return more than one (the reference account has two). `wrangler`'s usual single-account shortcut fails there, and picking wrong provisions into the wrong place. The skill lists and asks whenever the count isn't exactly one.

### 7. Teardown ships with provisioning, not after it

Six D1 databases already litter the reference account from earlier manual testing. Anything that provisions on demand must be able to un-provision, or the fresh-repo test leaks a Worker and two databases per run. Teardown removes what a run created and names anything it declined to touch.

## Risks / Trade-offs

- **The build connection stays manual, so "paste and you're done" is not literally true** → named as manual in the runbook, the walkthrough, and the skill, rather than implied away. It is the largest remaining gap and the reason the Actions change is worth doing later.
- **Zero Trust cold start is unverified** → kept off the critical path entirely (Decision 4); the runbook marks the step unverified and gives a dashboard fallback rather than implying it was tested.
- **Cloudflare may restrict token self-escalation later** → the skill verifies after widening and reports precisely which surfaces resolved, so a future clampdown surfaces as a clear message instead of a confusing failure mid-provision; the fallback is the documented manual permission list.
- **Permission-group ids drift, and one name is ambiguous** → resolve ids by name at runtime from `/user/tokens/permission_groups`; the recorded ids are a fallback and a test fixture, not the lookup path. The duplicate `Access: Apps and Policies Write` is disambiguated by scope (`com.cloudflare.api.account`), not by position.
- **The token is account-root** → stated plainly in the docs; narrowing is offered after provisioning.
- **A real end-to-end test creates real, billable infrastructure** → teardown ships in the same change (Decision 7), and the test names its resources with a recognizable prefix.
- **No PR check exists, so the delivery gate is review-only** → the existing documented behavior for a repo without checks; unchanged by this change, and fixed by the deferred Actions work.
- **A user declines the Node install and is left half-set-up** → the layers degrade cleanly (Decision 8); setup completes the knowledge layer and names which verbs need the CLI, rather than dead-ending.
- **The target user declines the stack pack because the offer is jargon** → the offer is rewritten as an outcome (Decision 9), and the fresh-repo test is run from that user's perspective rather than an expert's.

## Migration Plan

No CI migration: `scripts/cf-build.sh` and `swap-d1-id.js` are untouched, so a repo already on Workers Builds keeps working with no action. New files (`/wong-cloudflare`, the two wiki pages) arrive through `/wong-sync`'s copy-if-absent walk. Rollback is deleting them; nothing on the Cloudflare side is affected either way.

For the reference account: the `WongStack Token` is currently left widened from the live test and can be narrowed on request.

## Open Questions

- Does `POST /accounts/{id}/access/organizations` succeed on an account that has never onboarded Zero Trust? Needs a throwaway Cloudflare account. Off the critical path; the runbook ships marked unverified.
- Should teardown be a pack script or a section of the provisioning skill? Leaning skill section, since it needs the same account resolution and token handling.

<!-- end design.md -->
<!-- file tasks.md utf8 8889 -->
## 1. The provisioning skill

- [x] 1.1 Create `.claude/skills/wong-cloudflare/SKILL.md` — frontmatter, the stack-pack gate (reads `components.stackPack` from `.claude/.wong-stack.json`), and the runbook steps in outcome form; repo-relative paths only, no git in the repo
- [x] 1.2 Write the self-widening step: verify → read own policy → resolve permission-group ids **by name** → `PUT` a widened set that retains the original two groups → re-verify, per design Decision 1
- [x] 1.3 Write the account-resolution step: list accounts, proceed only on exactly one (stating which), otherwise ask; handle the zero-account case with the resources explanation
- [x] 1.4 Write the provisioning step: create prod + staging D1 with names **derived from the repo name and stated, never asked**, write both ids into `wrangler.jsonc`, compute the URLs, and walk the user through connecting the build — idempotent, reusing anything already present
- [x] 1.5 Write the opt-in Access branch: widen into the Access groups on request, point at the Access runbook, and pair enabling header trust with the Worker code change
- [x] 1.6 Write the teardown step: enumerate, confirm, delete, report — including what it skipped
- [x] 1.7 Add `references/permission-groups.md` recording the verified group ids as a fallback and test fixture, with the duplicate-name/scope caveat spelled out
- [x] 1.8 Add the closing report: production URL, preview URL pattern, what was created, what sits uncommitted, and the offer to narrow the token
- [x] 1.9 Write the `.env` step: create it from `.env.example` when absent, confirm `.gitignore` covers it, ask only for the token value to paste, and stop if the file would be committed
- [x] 1.10 Write the plain-language failure map — account-scoped-instead-of-user-scoped, empty Account Resources, and the `9109`/`10000` codes — each translated to the one field to fix, with the raw response kept for agents but not shown as the primary message

## 2. CI: GitHub Actions

- [x] 2.1 Add the pack's workflow file — sets `CF_BRANCH` and `CF_PRODUCTION_BRANCH`, installs in the resolved app dir, reads credentials from repository secrets, surfaces as a PR check
- [x] 2.2 Give `scripts/cf-build.sh` and `scripts/cf-deploy.sh` a CI-neutral `CF_BRANCH` with `WORKERS_CI_BRANCH` retained as fallback — no behavior change for a repo on Workers Builds
- [x] 2.3 Add `--app-dir` to `cf-build.sh` so the workflow installs where `package.json` actually is, without duplicating the resolution in YAML
- [x] 2.4 Make the unprovisioned path build without deploying, bypassing the build wrapper (which needs an `env.staging` D1 entry a fresh repo lacks)
- [x] 2.5 Confirm the v8 deploy model is untouched — the workflow delegates every branch decision to `cf-deploy.sh`

## 2b. Fix: branches deployed to production (found by the end-to-end test)

- [x] 2b.1 `cf-build.sh` exports `CLOUDFLARE_ENV=staging` on non-production branches — the plugin selects the environment at build time, and `--env` at deploy time is documented as having no effect
- [x] 2b.2 `cf-deploy.sh` drops `--env staging` when the build left a `.wrangler/deploy/config.json` redirect, so the flag never implies isolation that isn't happening
- [x] 2b.3 Add `wong_read_worker_name` to `lib-wrangler-config.sh`, resolving `configPath` relative to the redirect file's own directory
- [x] 2b.4 Add the fail-closed guard: refuse to deploy when a non-production branch resolves to the production Worker, naming both fixes
- [x] 2b.5 `cf-build.sh` regenerates binding types before building, so a binding added during provisioning doesn't fail `tsc`
- [x] 2b.6 Document the mechanism in `d1-pipeline.md` and the `env.staging.name` rule in the config fragments

## 2c. Fix: the CI gate silently reported "no checks"

- [x] 2c.1 `wait-for-checks.sh` probes whether `gh pr checks --json` exists and falls back to parsing the default output — `--json` is absent on gh 2.46, where the flag error was swallowed and reported as `NONE`
- [x] 2c.2 Stop discarding gh's stderr; report `RESULT: UNKNOWN` (with the message) for any empty result gh didn't explicitly attribute to "no checks"
- [x] 2c.3 Teach `/save` to report an unverified gate rather than "none configured", and `/ship` to refuse to merge on `UNKNOWN`
- [x] 2c.4 Amend the `Check-waiting reports the true gate result` requirement, which encoded the bug ("emptiness of the filtered output is the only such signal")

## 3. Docs

- [x] 3.1 Write the `wiki/stack/` provisioning runbook — token, self-widening sequence, account resolution, resources, the manual build connection, teardown; mark the Zero Trust cold-start step unverified with its dashboard fallback
- [x] 3.2 Add a CI section to `wiki/stack/d1-pipeline.md` — the workflow, the variable table, why not Workers Builds, and how to stay on it
- [x] 3.3 Update `wiki/stack/core-stack.md` — link provisioning and state that nothing runs locally
- [x] 3.4 Rework `wiki/stack/cloudflare-access.md` — Access as opt-in, public-by-default, and header trust adopted together with the Worker code change (with the impersonation risk stated)
- [x] 3.5 Rewrite `wiki/stack/cloudflare-credentials.md` — one `CLOUDFLARE_API_TOKEN`, the self-widening recipe, `Workers CI Read` named properly, and the account-root trade-off stated plainly
- [x] 3.6 Reconcile `.env.example` with the credentials page (same variable names, user-scoped token, correct creation path)
- [x] 3.7 Update `wiki/development/required-tools.md` — name `curl` as a pack-gated skill dependency and repair the "never inside a WongStack skill" wording
- [x] 3.8 Link the new runbook from the `wiki/stack/` hub; check every touched page against `wiki/wiki-style.md`
- [x] 3.9 Ensure the template Worker does not read the identity header while public
- [x] 3.10 Write the token creation click path — menu route, each permission row, and the **Account Resources** include flagged as the most-missed field; literal enough that someone who has never seen the screen cannot take a wrong turn
- [x] 3.11 Write the human-facing walkthrough of the whole path (numbered actions, plain language, browser steps called out as such), distinct from the agent runbook — this is what task 5.1 tests against
- [x] 3.12 Document in `required-tools.md` that runtimes install at the point of need, that `node` is permitted where already required, and which verbs work with no runtime at all

## 4. Payload wiring

- [x] 4.1 Register the new payload files in the stack-pack section of `.claude/skills/wong-sync/references/payload-manifest.md` (skill directory, workflow file, runbook, walkthrough)
- [x] 4.2 Rewrite `.claude/skills/wong-setup/SKILL.md` Step 6's stack-pack offer in outcome language — no product or component names in the prompt, the cost stated honestly, technical detail available on request — and name provisioning as the follow-on step that can run later
- [x] 4.3 Add the `workflow` scope to setup Step 5: request it in `gh auth login --scopes workflow`, detect its absence for an already-authed user in a pack repo, and offer `gh auth refresh --scopes workflow` with a plain-language reason
- [x] 4.4 Change setup Step 5's OpenSpec readiness so Node installs at the point of need, on consent, preferring a user-local install over `sudo` — and completes the runtime-free layer with a clear statement of what's unavailable if declined
- [x] 4.5 Mirror all payload changes into `.agents/skills/`

## 5. End-to-end test on a fresh repo

- [x] 5.1 Create a disposable GitHub repo and run the paste-the-prompt path (Leg 1) start to finish **as someone who does not know what a D1 database is** — follow the walkthrough as written, answer the offer as that person would, and record every point where the wording, not the mechanism, is what stalls
- [ ] 5.1a Run one pass on a machine with no Node installed, confirming the runtime-free layer completes and the point-of-need ask reads clearly
- [x] 5.2 Run provisioning (Leg 2) with a freshly created two-permission token; confirm the widen, the databases, the binding, the secrets, and the deploy
- [ ] 5.2a Confirm the `workflow` scope path: a fresh `gh auth login` grants it, and an already-authed account without it is caught during setup rather than at push
- [x] 5.3 Confirm Leg 3: push a branch, get a preview URL from `/save`, verify production is untouched and the preview runs on staging
- [x] 5.4 Run teardown; confirm nothing is left behind, then clean up the six pre-existing test databases separately
- [x] 5.5 Fold every correction the test surfaced back into the runbook and skill

## 6. Release

- [x] 6.1 Bump `VERSION` from 8.0.0 to 8.1.0 (minor — new capability; the CI switch is additive and opt-in per repo)
- [x] 6.2 Add the newest-first `CHANGELOG.md` entry covering provisioning, the Actions workflow, and the header-trust default change

<!-- end tasks.md -->
<!-- file specs/cloudflare-access-guide/spec.md utf8 7134 -->
## MODIFIED Requirements

### Requirement: A Cloudflare Access setup runbook ships in the payload

The payload SHALL include a wiki page that walks an adopter through the Cloudflare-side Zero Trust setup end to end: creating the Zero Trust organization, adding an identity provider, creating the Access application, protecting the production hostname AND every `*.workers.dev` preview URL with a single wildcard policy, and adding a bypass policy for the open public surface. The page SHALL follow the progressive-disclosure rulebook (`wiki/wiki-style.md` + `wiki/voice.md`): a topic title, a strong stand-alone opener, and links up to its hub, down to what it references, and sideways to the credentials page.

The page SHALL frame Access as **opt-in**: an app provisioned by the stack pack is public by default, and nothing in provisioning or the pack requires Access. The runbook SHALL state that the login wall and the Worker-side code change that reads the identity header are adopted together, never separately. Where a step could not be verified against an account that had never onboarded Zero Trust, the page SHALL mark it unverified and give the dashboard fallback.

#### Scenario: An adopter can stand up Access from the page alone

- **WHEN** a reader with a Cloudflare account and a deployed Worker follows the runbook top to bottom
- **THEN** the steps cover the org, an identity provider, the Access application, the wildcard policy, and the bypass policy in order, with no undocumented prerequisite

#### Scenario: One wildcard policy covers prod and previews

- **WHEN** the runbook defines the Access policy
- **THEN** it uses one wildcard hostname pattern that matches both the production host and every per-branch `*.workers.dev` preview URL
- **AND** it states that this is what gates preview URLs without per-branch configuration

#### Scenario: The public surface is explicitly bypassed

- **WHEN** the runbook configures policies
- **THEN** it adds a bypass policy for the open `/public/*` surface (UI, APIs, inbound webhooks)
- **AND** it states the required policy ordering relative to the gated policy

#### Scenario: A provisioned app is public until Access is chosen

- **WHEN** a user provisions the stack-pack app without asking for authentication
- **THEN** the app is reachable publicly and no Access resources are created
- **AND** the runbook is offered as the opt-in next step rather than assumed

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies: once Access is in front, the Worker carries no auth code and trusts the `Cf-Access-Authenticated-User-Email` header set by the Access proxy. It SHALL state, as a first-class step and not a footnote, that trusting the header is safe ONLY behind the proxy, so the reader MUST verify the wildcard policy actually covers preview hostnames before relying on it. It SHALL specify that a request missing the header is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

Because the provisioned app is public by default, the template Worker SHALL NOT read or trust the identity header until Access is adopted. The runbook SHALL state why: on a Worker with no Access proxy in front, the header is attacker-controlled, so trusting it lets any caller impersonate any user. Enabling header trust SHALL be documented as part of adopting Access, in the same step.

#### Scenario: The header-trust risk is stated loudly

- **WHEN** a reader reaches the auth-model section
- **THEN** it states that header trust holds only behind the Access proxy
- **AND** it makes verifying that previews are actually gated an explicit step

#### Scenario: Missing identity fails closed

- **WHEN** the runbook describes a request that arrives without the Access identity header
- **THEN** it specifies a `401` response by default
- **AND** it specifies that a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

#### Scenario: The public template does not trust the header

- **WHEN** the stack pack's template Worker is deployed without Access in front
- **THEN** it does not read `Cf-Access-Authenticated-User-Email` as an identity
- **AND** the docs state that trusting it on a public Worker allows trivial impersonation

### Requirement: A credentials guide ships covering the user-scoped API token and Access service token

The payload SHALL include a wiki page that documents the credentials the stack needs. It SHALL instruct the reader to create a USER-scoped API token (My Profile → API Tokens), state explicitly that an account-scoped token does NOT work for the user-level endpoints the provisioning flow depends on, and have the reader store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env` per the existing secrets convention — one variable name, used consistently by `.env.example` and every page that references it. It SHALL also walk through creating an Access service token and adding it to the Access policy so non-interactive callers can reach gated preview URLs, framed as part of the opt-in Access path. Exact Cloudflare permission and menu names SHALL be verified against the live dashboard or API when the page is written, not reproduced from memory; the Workers Builds permission SHALL be named `Workers CI Read`/`Workers CI Write`, since Cloudflare exposes Builds under "CI".

The page SHALL document the self-widening token: the two permission groups the user grants, the sequence the agent uses to widen and narrow it, and — plainly, without softening — that a token able to widen itself is effectively account-root, so self-widening and least privilege are mutually exclusive and this design chose the former.

#### Scenario: The user-scoped-vs-account-token trap is called out

- **WHEN** a reader follows the token guide
- **THEN** it directs them to create a user-scoped token, not an account token
- **AND** it names the symptom an account token produces (`/user/*` endpoints rejecting it), so the reader can recognize the failure

#### Scenario: Credentials land in .env via the secrets convention

- **WHEN** the guide tells the reader where to put the token
- **THEN** it names `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as `.env` variables
- **AND** it links the existing secrets convention rather than restating it
- **AND** `.env.example` uses the same variable names as the page

#### Scenario: A service token is created for non-interactive access

- **WHEN** a reader completes the credentials guide
- **THEN** they have created an Access service token and added it to the Access policy
- **AND** the guide states this is what lets a later CI/test caller reach an Access-gated preview URL

#### Scenario: The account-root trade-off is stated

- **WHEN** a reader reaches the self-widening section
- **THEN** it states that the token is effectively account-root and that least privilege was traded for usability
- **AND** it explains how to narrow the token after provisioning

<!-- end specs/cloudflare-access-guide/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 12744 -->
## ADDED Requirements

### Requirement: A provisioning skill stands the app up from a single API token

The payload SHALL include a provisioning skill, gated on `components.stackPack: true`, that takes a repo from "has a Cloudflare token" to "has a deployed Worker backed by two D1 databases and a CI pipeline." It SHALL be runnable at any time after `/wong-setup`, not only during onboarding, because the token typically arrives later than the install does. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and SHALL leave its repo changes uncommitted for `/save`.

#### Scenario: Provisioning runs long after setup

- **WHEN** a user runs the provisioning skill in a repo where WongStack is already installed and the stack pack was taken
- **THEN** it provisions from the current token without re-running onboarding
- **AND** it reports the production URL and the preview URL pattern on completion

#### Scenario: The skill is absent for a repo that declined the pack

- **WHEN** a repo's manifest has `components.stackPack` false or absent
- **THEN** the provisioning skill is neither installed nor offered
- **AND** no Cloudflare-specific file enters that repo

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the skill runs no git command in the repo

### Requirement: The token widens its own permissions rather than requiring a pre-granted set

The documented credential SHALL be a single user-scoped Cloudflare API token carrying only `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope), with the user's account included in its resources. The skill SHALL obtain any further permission it needs by reading its own token id from `/user/tokens/verify`, reading its current policy document from `/user/tokens/{id}`, resolving permission-group ids **by name** from `/user/tokens/permission_groups`, and issuing `PUT /user/tokens/{id}` with a widened policy set. Because the `PUT` replaces policies wholesale, the widened set SHALL include the original two permission groups. The skill SHALL verify the widen took effect before proceeding, and SHALL offer to narrow the token back afterward.

#### Scenario: A two-permission token becomes sufficient

- **WHEN** the skill runs with a token holding only the two API-token permission groups
- **THEN** it widens itself to include the permissions the requested work needs
- **AND** it confirms by re-probing the target surfaces before provisioning anything

#### Scenario: The ability to widen again is preserved

- **WHEN** the skill builds the widened policy set
- **THEN** the set still contains `API Tokens Write` and `Account API Tokens Write`
- **AND** a later run can widen the same token again

#### Scenario: Permission-group ids are resolved by name at runtime

- **WHEN** the skill needs a permission group
- **THEN** it looks the id up by name from the live permission-groups endpoint rather than relying on a hardcoded id
- **AND** where two groups share a name, it selects by scope (`com.cloudflare.api.account`) rather than by position

#### Scenario: Self-escalation is refused

- **WHEN** the `PUT` fails or the post-widen verification shows the permissions did not take effect
- **THEN** the skill stops before provisioning
- **AND** it reports which surfaces are unavailable and lists the permissions to grant manually

### Requirement: The token creation screen is documented as an exact click path

The payload SHALL document how to create the token as a literal, screen-by-screen path — the menu route (`My Profile → API Tokens → Create Token → Create Custom Token`), each permission row to add, and the **Account Resources** include, which SHALL be called out as the field most often missed. Instructions SHALL NOT paraphrase the screen or assume the user can infer a field from its purpose. During exploration this token was created incorrectly twice — first account-scoped rather than user-scoped, then with no account in its resources — by someone with live API access to inspect the result, so the path is treated as the highest-risk moment in the flow.

The skill SHALL verify the pasted token before doing anything else, and SHALL distinguish the failure modes rather than surfacing the raw error.

#### Scenario: The token is account-scoped instead of user-scoped

- **WHEN** verification shows the token cannot reach `/user/tokens/verify`
- **THEN** the skill explains that the token was created under the account section rather than under My Profile, and points at the correct route
- **AND** it does not report the raw API error as the user-facing message

#### Scenario: The token has no account in its resources

- **WHEN** the account list comes back empty while the token is otherwise valid
- **THEN** the skill names the Account Resources field specifically, and tells the user what to set it to
- **AND** it offers to re-verify once they have saved the change

#### Scenario: API errors are translated

- **WHEN** the Cloudflare API returns a permission or authentication error during verification or widening
- **THEN** the user-facing message names the missing permission or setting in plain language and gives the one action that fixes it
- **AND** the raw code and response are available for an agent to read but are not the primary message

### Requirement: The skill sets up the credential file for the user

The skill SHALL create the repo's `.env` from `.env.example` when it does not exist, SHALL confirm that `.gitignore` covers it, and SHALL ask the user only for the token value to paste. It SHALL NOT instruct the user to create a dotfile, choose a variable name, or verify their own ignore rules.

#### Scenario: Fresh repo with no .env

- **WHEN** provisioning starts in a repo that has `.env.example` but no `.env`
- **THEN** the skill creates `.env` from the example, verifies it is ignored by git, and asks for the token value alone

#### Scenario: The credential file is never committed

- **WHEN** the token value has been written to `.env`
- **THEN** the skill confirms git does not see the file as a change
- **AND** it stops and warns rather than continuing if the file would be committed

### Requirement: Resource names are derived, not requested

The skill SHALL derive the names of the databases and the Worker from the repository name, SHALL state the names it chose, and SHALL NOT ask the user to supply them. A user MAY override a name if they raise it, but no naming question SHALL be part of the default flow.

#### Scenario: Provisioning names resources without asking

- **WHEN** the skill creates the production and staging databases and the Worker
- **THEN** it derives each name from the repo name, applies it, and reports the names in its closing summary
- **AND** it asks the user no naming question

### Requirement: The account is resolved by asking, never assumed

The skill SHALL list the accounts the token can see and SHALL NOT assume a single account. Where exactly one account is visible it MAY proceed with it after stating which. Where zero or more than one is visible it SHALL ask the user which to use before creating any resource.

#### Scenario: Multiple accounts

- **WHEN** the token can see more than one Cloudflare account
- **THEN** the skill lists them by name and id and asks which to provision into
- **AND** it creates nothing until the user answers

#### Scenario: No accounts visible

- **WHEN** the token can see no accounts
- **THEN** the skill reports that the token's account resources are unset and explains how to include the account
- **AND** it does not attempt to provision

### Requirement: Provisioning creates the two databases and the binding

For a repo taking the stack pack, the skill SHALL create the production and staging D1 databases, write their ids into the repo's `wrangler.jsonc` `d1_databases` binding as `database_id` and `preview_database_id`, and compute the production and preview URLs from the account's Workers subdomain. It SHALL be idempotent: a resource that already exists is reused and reported, never duplicated.

The Cloudflare token SHALL live only in the repo's git-ignored `.env`. Provisioning SHALL NOT copy it anywhere else, because Workers Builds runs inside Cloudflare and needs no credential handed to it.

#### Scenario: A second run does not duplicate resources

- **WHEN** the skill runs again in a repo it already provisioned
- **THEN** it detects the existing databases and reuses them
- **AND** it reports each as already present rather than creating a second copy

#### Scenario: The credential is not copied out of .env

- **WHEN** provisioning completes
- **THEN** the token exists only in the git-ignored `.env`
- **AND** no credential value is written into a committed file

### Requirement: CI is wired without user involvement

The skill SHALL set the Cloudflare credentials as GitHub repository secrets via `gh`, and SHALL confirm the pack's GitHub Actions workflow is present. Neither SHALL require the user to visit a web interface: `gh secret set` works on the `repo` scope `gh auth login` already grants, and the workflow file ships with the pack.

Before relying on a push, the skill SHALL check that the stored `gh` credentials carry the `workflow` scope, since it is absent from `gh auth login`'s minimum set and its absence fails only at push time with wording a newcomer cannot act on. Where it is missing the skill SHALL offer `gh auth refresh --scopes workflow` with a plain-language reason.

#### Scenario: Secrets reach GitHub, not the repo

- **WHEN** the skill wires CI
- **THEN** the Cloudflare token and account id are set as GitHub repository secrets
- **AND** neither value is written into a committed file
- **AND** the user is not asked to open a web interface

#### Scenario: The workflow scope is checked before the push

- **WHEN** the skill reaches the CI step in a repo whose `gh` credentials lack `workflow`
- **THEN** it surfaces this before the push rather than after
- **AND** it offers the refresh command with a plain-language explanation

#### Scenario: The deploy model is unchanged by the choice of CI

- **WHEN** the workflow runs
- **THEN** it delegates the branch decision to the pack's build and deploy scripts rather than reimplementing it
- **AND** production, the staging Worker, and the per-commit preview alias behave exactly as they do under Cloudflare Workers Builds

### Requirement: A runbook documents the provisioning path for any agent

The payload SHALL include a `wiki/stack/` page describing the provisioning path in enough detail that an agent without the skill can execute it: the exact token the user creates, the self-widening sequence, account resolution, the resources created, the CI wiring, and teardown. It SHALL follow the progressive-disclosure rulebook and link from the `wiki/stack/` hub. Any step that was not verified against a live account SHALL be marked unverified and given a dashboard fallback.

#### Scenario: An agent follows the runbook without the skill

- **WHEN** an agent in a repo without the provisioning skill is asked to set up the Cloudflare app
- **THEN** the runbook gives it the full sequence including the exact permission names and endpoints
- **AND** it does not need to consult Cloudflare's dashboard documentation to proceed

#### Scenario: Unverified steps are labelled

- **WHEN** the runbook covers a step that could not be tested against a live account
- **THEN** it marks the step unverified and states the dashboard fallback
- **AND** it does not present the step as confirmed working

### Requirement: Everything provisioned can be torn down

The skill SHALL provide a teardown path that removes the resources a provisioning run created — the Worker, both D1 databases, and the GitHub secrets — so repeated testing does not leak billable infrastructure. Teardown SHALL name every resource it intends to delete and require confirmation before deleting, and SHALL report anything it declined to touch.

#### Scenario: Teardown removes what provisioning created

- **WHEN** a user runs teardown after a provisioning run
- **THEN** it lists the Worker, both databases, and the secrets it will remove and asks for confirmation
- **AND** on confirmation it removes them and reports the result of each

#### Scenario: Teardown leaves unrelated resources alone

- **WHEN** the account contains databases or Workers that this repo did not create
- **THEN** teardown does not delete them
- **AND** it names them as skipped

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 7034 -->
## MODIFIED Requirements

### Requirement: Setup scope is making wong-sync runnable, then handing off

On a yes (or the fast path), `wong-setup` SHALL NOT copy the payload itself. It SHALL reach these outcomes — a git repo with at least one commit; `gh` installed, authed, and an `origin` remote that resolves (offered one plain-language rung at a time, only after the verdict, never during the consultation); the OpenSpec CLI present and `openspec init` run with the tools the user's agent(s) need; the authored content in place (CLAUDE.md "What this is" from the research + conversation, a wiki hub README when none exists); the `wong-sync` skill copied in (its only payload file operation); and a **seed manifest** written (`commit: null`, `version: null`, the `upstream` block, and any skill renames agreed during collision discussion). It SHALL then hand off to `/wong-sync` — by file path, "read and follow `.claude/skills/wong-sync/SKILL.md`" — whose fresh mode performs the install, and SHALL close with the real-first-step report after wong-sync finishes.

When `gh` authentication is established or repaired during setup, it SHALL request the `workflow` scope alongside the defaults (`gh auth login --scopes workflow`). The scope is not in `gh auth login`'s minimum set, and without it any later push of a `.github/workflows/*.yml` file fails with `refusing to allow an OAuth App to create or update workflow` — at push time, long after setup reported success. Requesting it during the browser visit setup already performs costs the user no additional step. For a user already authenticated without it, `gh auth refresh --scopes workflow` SHALL be the documented repair.

The OpenSpec CLI outcome SHALL be reached without pre-emptively installing a language runtime; when Node is absent, setup asks at the point of need per the runtime-install requirement, and completes the runtime-free layer if the user declines.

#### Scenario: Fresh repo, sold user

- **WHEN** the verdict is yes in a repo with no WongStack presence
- **THEN** wong-setup bootstraps the environment outcomes, authors the non-payload content, copies in `wong-sync`, writes the seed manifest, and hands off to `/wong-sync` — which pulls the whole payload as its fresh-mode sync

#### Scenario: No payload copy-loop

- **WHEN** wong-setup's setup phase completes
- **THEN** the only payload file it has copied is the `wong-sync` skill; every other payload file arrives via wong-sync's manifest-driven pull

#### Scenario: gh auth is established during setup

- **WHEN** setup runs `gh auth login` because `gh` is unauthenticated
- **THEN** it requests the `workflow` scope in the same browser consent, so a later workflow-file push succeeds

#### Scenario: Already authenticated without the workflow scope

- **WHEN** `gh` is already authenticated but the stored credentials lack `workflow`, in a repo that took or is taking the stack pack
- **THEN** setup detects this and offers `gh auth refresh --scopes workflow`, explaining in plain language that pushing the deploy workflow needs it
- **AND** the failure is surfaced during setup rather than at the first push

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s fresh-mode pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

The offer SHALL be phrased as an **outcome the user recognizes**, not an inventory of what ships. It SHALL NOT lead with product or component names (`D1`, `Workers`, "pipeline scripts", "seed template") — the audience is someone who does not know what those are, decline is the documented safe default, and a jargon-first offer therefore converts the target user into a decline by confusion. It SHALL name the practical cost honestly (a free Cloudflare account, a few minutes) and the practical result (a live address other people can open). Technical detail SHALL remain available for a user who asks, as a follow-up rather than as the prompt.

On acceptance the offer SHALL name provisioning as the follow-on step and make clear it can be run later, since the Cloudflare token typically arrives after onboarding does.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the fresh-mode `/wong-sync` pull installs the pack's files with the rest of the payload
- **AND** the user is told that provisioning is the next step and may be run whenever they have a Cloudflare account

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

#### Scenario: A non-technical user meets the offer

- **WHEN** the offer is shown to someone who does not know what a database or a Worker is
- **THEN** the prompt describes the outcome in words they already understand and states what it will cost them
- **AND** it does not require them to recognize any product, component, or file name in order to answer

## ADDED Requirements

### Requirement: The paste-to-running-app path is documented for the person walking it

The payload SHALL carry a short, human-facing account of the whole path — what the user does, in order, and what they get at each stage — distinct from the agent-facing provisioning runbook. It SHALL be written for someone non-technical: numbered actions, plain language, no assumed vocabulary. It SHALL state honestly which steps are irreducibly manual (Cloudflare signup, creating the first token, and the `gh` browser login) and SHALL NOT imply that steps requiring a human are automated.

This document SHALL be the reference the end-to-end fresh-repo test is run against, so that a step which reads clearly but plays badly is caught.

#### Scenario: A newcomer reads before starting

- **WHEN** someone who has never used the toolkit reads the walkthrough
- **THEN** they can tell how many things they personally have to do, what each one is, and roughly how long it takes
- **AND** every step that requires leaving the agent for a browser is called out as such

#### Scenario: The walkthrough matches the tested reality

- **WHEN** the end-to-end fresh-repo test runs
- **THEN** it follows this walkthrough as written
- **AND** any divergence found is corrected in the walkthrough rather than left as tribal knowledge

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 4462 -->
## ADDED Requirements

### Requirement: The pack ships a GitHub Actions workflow as its CI

The pack SHALL include a GitHub Actions workflow file that runs the pack's build and deploy scripts on push, supplying the branch name they need and reading the Cloudflare credentials from GitHub repository secrets. It SHALL be a drop-in payload file subject to the same copy-if-absent, never-overwrite rule as every other pack file, and SHALL surface as a pull-request check so the existing delivery gate has something to wait on.

The workflow SHALL NOT reimplement any branch logic. Deciding which database to migrate and which Worker to deploy to belongs to `scripts/cf-build.sh` and `scripts/cf-deploy.sh`, so that both CI backends run identical code and the deploy model is independent of the CI choice.

Where the Cloudflare credentials are absent, the workflow SHALL build without deploying, so a repo that took the pack but has not yet been provisioned gets a useful check rather than a permanently failing one. That path SHALL NOT route through the build wrapper, which requires a staging environment an unprovisioned repo does not yet have.

#### Scenario: A pack repo gains a PR check

- **WHEN** a repo that took the pack pushes a branch and opens a pull request
- **THEN** the workflow runs and reports as a check on that pull request
- **AND** `/save` and `/ship` wait on it through the existing check-waiting path

#### Scenario: An unprovisioned repo still gets a green check

- **WHEN** the workflow runs in a repo with no `CLOUDFLARE_API_TOKEN` secret
- **THEN** it builds the app and deploys nothing
- **AND** it reports why, naming the provisioning skill as the next step

#### Scenario: The workflow is never overwritten

- **WHEN** `/wong-sync` runs in a repo that already has the workflow file
- **THEN** the existing file is left untouched
- **AND** any upstream change to it surfaces through the adapt step as a proposal

### Requirement: The branch variable is CI-neutral

The pack's build and deploy scripts SHALL read the CI branch from `CF_BRANCH`, falling back to `WORKERS_CI_BRANCH` when it is unset. A repo running Cloudflare Workers Builds SHALL therefore continue to work with no change, and a repo may run both backends while migrating between them.

#### Scenario: A Workers Builds repo is unaffected

- **WHEN** the scripts run under Cloudflare Workers Builds, which sets only `WORKERS_CI_BRANCH`
- **THEN** they resolve the branch and behave exactly as before

#### Scenario: Neither variable is set

- **WHEN** the scripts run on a developer's machine with neither variable set
- **THEN** they take their local path: no remote database is migrated and nothing is deployed

### Requirement: A non-production branch can never deploy to the production Worker

The pack SHALL select the staging environment by the mechanism the app's build actually uses: `--env staging` at deploy time for a plain wrangler build, and `CLOUDFLARE_ENV=staging` at **build** time where the build goes through `@cloudflare/vite-plugin`, which flattens the selected environment into a generated config and redirects wrangler at it. Where that redirect exists the deploy SHALL NOT pass `--env`, which has no effect once the environment is baked in.

Independently of which mechanism applied, `cf-deploy.sh` SHALL read the Worker name the deploy will actually use and **refuse to deploy** when a non-production branch resolves to the production Worker's name. The error SHALL name the branch, the Worker, and the two things that fix it.

This exists because the failure is silent: the build is green, a preview URL is printed, and it is production's.

#### Scenario: A plugin-built branch deploys to staging

- **WHEN** a non-production branch is built through `@cloudflare/vite-plugin` and deployed
- **THEN** the generated config describes the staging environment
- **AND** the staging Worker is deployed, bound to the staging database
- **AND** the production Worker and production database are untouched

#### Scenario: The environment failed to apply

- **WHEN** a non-production branch's resolved Worker name equals the production Worker's name
- **THEN** the deploy is refused before anything is uploaded
- **AND** the message names the branch, the production Worker, and both possible fixes

#### Scenario: A plain wrangler build is unaffected

- **WHEN** the build produces no redirect config
- **THEN** the deploy passes `--env staging` as before

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 7618 -->
## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`. No core payload script or skill SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do. The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. A repo that did not take the pack SHALL still run the entire toolkit on `git`, `gh`, and `openspec` alone. The required-tools page SHALL state this split, and SHALL name `curl` explicitly as a pack-gated skill dependency rather than leaving the earlier "never in a WongStack skill" wording to be quietly contradicted.

Pack-gated skills and scripts MAY use `node` where it is the better tool, since a pack repo already requires it at its build boundary. Provisioning SHALL nonetheless use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine. The governing rule SHALL be stated on the required-tools page: use `node` where it is already required; never let a WongStack skill be the reason a runtime gets installed.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: Target repo has gh but not jq

- **WHEN** any core WongStack skill or script runs in a repo on a machine where `git`, `gh`, and `openspec` are installed but `jq` is not
- **THEN** every skill and script completes with correct results, invoking no command outside that set

#### Scenario: Onboarding preflight

- **WHEN** `/wong-setup` runs its readiness check
- **THEN** it checks for `git`, `gh` (installed and authenticated), a resolving `origin` remote, and `openspec`
- **AND** it does not check for or require `jq`

#### Scenario: Pack's extra tools are opt-in and repo-local

- **WHEN** a repo takes the stack pack
- **THEN** the pack's scripts run `node`/`wrangler` in that repo's own build/CI, its provisioning skill runs `curl`, and the required-tools page documents all of these as pack-only additions
- **AND** a repo that declined the pack still runs every WongStack skill on `git`, `gh`, and `openspec` alone

#### Scenario: Provisioning needs no local runtime

- **WHEN** a user provisions the Cloudflare app on a machine with no Node.js installed
- **THEN** provisioning completes using `curl` and `gh` only
- **AND** no step instructs the user to install a language runtime

### Requirement: Check-waiting reports the true gate result without jq

`wait-for-checks.sh` SHALL determine and report the aggregate check result — `SUCCESS`, `FAILURE`, `NONE`, `TIMEOUT`, or `UNKNOWN`, each on a single `RESULT:` line, with failing or still-pending check names listed after `FAILURE` and `TIMEOUT` and the underlying message after `UNKNOWN` — using only `gh` and shell built-ins. It MUST NOT report `SUCCESS` on a run whose checks are pending, failed, or unreadable. Because `gh pr checks` exits non-zero when checks are merely pending or failing, the script MUST NOT treat that exit code as a "no checks" signal.

**Empty output alone SHALL NOT be read as "no checks".** `RESULT: NONE` SHALL be reported only when `gh` explicitly says the branch has no checks. Any other empty result — no pull request for the branch, an authentication or network failure, or a `gh` too old to support the flags used — SHALL be reported as `RESULT: UNKNOWN`, carrying the message `gh` produced. The script SHALL NOT discard `gh`'s error output.

The script SHALL work across `gh` versions, detecting whether `gh pr checks --json` is supported and falling back to parsing the default output when it is not. Both paths SHALL produce the same states.

Callers SHALL treat `UNKNOWN` as *unverified*, never as *no checks*: `/save` reports the gate as unverified, and `/ship` SHALL NOT merge on it.

#### Scenario: Failing checks on a machine without jq

- **WHEN** the script runs against a PR with at least one failed or cancelled check, on a machine with no standalone `jq`
- **THEN** it prints `RESULT: FAILURE` followed by the name and link of each failing check

#### Scenario: Checks are still running

- **WHEN** the script polls a PR whose checks are pending, causing `gh pr checks` to exit non-zero
- **THEN** it keeps waiting rather than reporting `RESULT: NONE`

#### Scenario: No checks configured

- **WHEN** `gh pr checks` reports that the branch has no checks
- **THEN** the script prints `RESULT: NONE` and exits, so the caller falls back to PR review as the gate

#### Scenario: An older gh that lacks the JSON flag

- **WHEN** the installed `gh` does not support `gh pr checks --json`, on a PR that has checks
- **THEN** the script parses the default output instead and reports the real aggregate result
- **AND** it does not report `RESULT: NONE`

#### Scenario: gh cannot be asked at all

- **WHEN** `gh pr checks` fails because there is no pull request for the branch, or authentication or the network is broken
- **THEN** the script prints `RESULT: UNKNOWN` with the message `gh` produced
- **AND** `/ship` does not merge on that result

## ADDED Requirements

### Requirement: Runtimes are installed at the point of need, never pre-emptively

No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node remains a real dependency of the planning verbs — but not of the knowledge layer.

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

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-01

~~~
<!-- end .openspec.yaml -->
