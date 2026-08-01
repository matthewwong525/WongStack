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
