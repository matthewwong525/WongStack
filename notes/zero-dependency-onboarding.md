---
slug: zero-dependency-onboarding
started: 2026-08-01
updated: 2026-08-01
consolidated:
---

# Zero-dependency onboarding

Making WongStack installable by pasting one prompt, then handing over one Cloudflare token — and testing that the whole path actually works.

## What the user asked for, in their words

- "really, really easy to install… very, very little dependencies. Someone can just paste the prompt in."
- Once they add a Cloudflare token, "everything will just be set up on their behalf, because technically we should have everything that we need."
- Their hypothesis about the token, which turned out to be the load-bearing insight: *"all the access that they need for that token is just giving it the permission to give it more permission for that token, and then you would basically give yourself permission as needed."*
- When developing, "they don't need to have like any of like the dev setup that you normally need for the local because of like our preview thing" — dev is remote, push → preview URL.
- Late in the thread, the framing that shaped the docs: **non-technical users are the target.** "if they're non technical like super duper easy."

## Live findings against the Cloudflare API

Everything below was run, not read.

- **A token can widen its own permissions.** `PUT /user/tokens/{id}` with a wider policy set is accepted. Nine endpoints went from `10000 Authentication error` to resolving. **The token id is stable across a widen**, so `.env` is written once — no rotation, no second secret.
- **The `PUT` replaces policies wholesale.** The widened set must retain `API Tokens Write` + `Account API Tokens Write`, or the token can never widen again — unrecoverable without creating a new one.
- **`/accounts` returning `success: true, count: 0`** is not an empty account — it means the token's **Account Resources** field was left unset. Reads like a broken Cloudflare account; is actually one unticked field. The token can be *edited* rather than recreated, so `.env` stays valid.
- **Two token screens exist** and only `My Profile → API Tokens` produces a token that can reach `/user/*`. An account-scoped token can't be converted.
- **392 permission groups**, so the endpoint needs `per_page=1000`. Cloudflare files Workers Builds under **"CI"** — `Workers CI Read`/`Write`. Searching all 392 for "build" returns nothing, which is why the old docs hedged about the name.
- **`Access: Apps and Policies Write` exists twice** — match on `scopes` containing `com.cloudflare.api.account`, never on position; the other is zone-scoped.
- **Two accounts on this user** (`Info@claymoo.com's`, `Matthewwong525@gmail.com's`), so provisioning can't assume one.
- **Zero Trust cold start is untestable here** — both accounts already have orgs, and once one exists the never-onboarded path can never be observed again. Shipped marked unverified with a dashboard fallback.

## Decisions and their reasoning

- **Self-widening beats pre-granting**, but *not* because it saves a dashboard visit — it doesn't; you visit once either way. It wins because **optional features cost nothing up front**: someone who will never enable auth never ticks a Zero Trust box. That argument only became available once Access was made opt-in.
- **The token is effectively account-root**, and the docs say so rather than implying the two-checkbox start is a security boundary. Least privilege and self-widening are mutually exclusive; usability won.
- **Keep the OpenSpec CLI.** Considered forking its artifact schema into the payload to drop Node. Rejected: 58 call sites, and `openspec instructions` supplies templates/rules at runtime while `openspec status --json` drives the dependency graph. Owning that fork permanently costs far more than it saves.
- **Runtimes install at the point of need** — the user's correction: "we should install node only when we do need it, we shouldn't pre-emptively install it." Installing a runtime is the only step that mutates the machine rather than the repo, so it's the one step that asks.
- **Access opt-in ⇒ the template Worker must trust nothing.** A public Worker that reads `Cf-Access-Authenticated-User-Email` lets any caller impersonate any user, so the header-trust code and the login wall are adopted in the same step, never separately.

## The CI decision, which reversed twice

Landed on **GitHub Actions**. The path there matters because the reasoning was re-litigated:

1. Chose Actions — Workers Builds cannot be connected to a repo through its API at all (no repo connection, no branch config, no first trigger; its GitHub App needs browser OAuth `gh` can't grant), so it costs three dashboard steps per repo forever and yields no PR check.
2. User reversed: "let's remove the custom github secret script… go with the cloudflare deploy thing and then later maybe we'll add the github actions in another PR." Reverted fully.
3. User reversed again: "i'm actually ok with including the github action thing again."

Final shape is much cheaper than the first attempt because **v8.0.0 (merged mid-thread) had already moved the branch split into `cf-deploy.sh`**. The workflow is a thin driver; the only script edit is a CI-neutral `CF_BRANCH` with `WORKERS_CI_BRANCH` retained as fallback, so a Workers Builds repo is untouched and nothing is breaking.

Rejected: supporting both CI backends as a documented dual path — doubles the docs surface and forces every skill to branch on which CI a repo uses.

## The end-to-end test, and what it caught

Run on a real disposable GitHub repo against real Cloudflare. This is the part that justified the exercise.

**Bug: every feature branch deployed to production, on production data.** Live in v8.0.0, independent of this change.

- Cause: `@cloudflare/vite-plugin` flattens the selected environment into `dist/<worker>/wrangler.json` and writes `.wrangler/deploy/config.json` redirecting wrangler at it. [Cloudflare's docs](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/) state `--env` on `wrangler deploy` "will have no effect" after that. So `wrangler deploy --env staging` silently deployed production.
- The environment is selected at **build** time, via `CLOUDFLARE_ENV`.
- It fails in the safe-looking direction: green build, preview URL printed, production overwritten — while migrations still went to the staging database, so code and schema drift apart in exactly the way the two-environment model exists to prevent.
- Fix has three parts: build-time `CLOUDFLARE_ENV=staging`; drop `--env` when the redirect exists; and a **fail-closed guard** that refuses to deploy when a non-production branch resolves to production's Worker name. The guard is the durable part — it catches the class, not the instance.

**Bug: binding types aren't regenerated.** The first build after provisioning fails `Property 'DB' does not exist on type 'Env'`, because `worker-configuration.d.ts` is generated from `wrangler.jsonc`. CI now runs `npx wrangler types` before building.

**Two mistakes of mine, worth remembering as failure modes:**

- The first guard compared two values that both came from the generated config, so they always matched — it would have fired on *every correct* staging build. Caught by a four-case unit test before shipping.
- `configPath` in `.wrangler/deploy/config.json` is relative to **the redirect file's own directory** (`../../dist/...`), not the app dir. I anchored it wrong, the lookup silently fell back to the source config, and the guard didn't fire in CI. Found by reproducing the build locally and reading the actual file.

**Verification that closed it:** a fresh branch carrying a deliberate marker reached the staging Worker and the alias URL and never production; then the selection was deliberately re-broken and the deploy was blocked by the guard, run conclusion `failure`, production untouched.

## Practical notes for next time

- `.claude` is a **symlink to `.agents`** in this repo, so "mirror the payload into `.agents/skills/`" is structural, not a maintenance step.
- Merging `origin/main` mid-change lost a section silently: a wholesale rewrite of `cloudflare-credentials.md` dropped main's new "Worker secrets are per environment" without git flagging a conflict, because the surrounding file had been rewritten. **After merging into a file you rewrote wholesale, diff the upstream range** (`git diff <prev>..<new> -- <file>`) rather than trusting conflict markers.
- `gh secret set` needs only the `repo` scope `gh auth login` already grants; pushing `.github/workflows/*.yml` needs **`workflow`**, which is *not* in the default set and fails only at push time.
- Teardown of Cloudflare resources is pure REST and worked cleanly. Deleting a GitHub repo needs `delete_repo` scope, which `gh auth login` doesn't grant.

## Open threads

- Two disposable repos still exist: `matthewwong525/wongstack-e2e-test`, `wongstack-e2e-test2`. Need `gh auth refresh -h github.com -s delete_repo` to remove.
- Untested for environmental reasons: a machine with no Node (the runtime-free degradation), and a fresh `gh auth login` confirming the `workflow` scope.
- The reference `WongStack Token` is left widened from testing; narrowing it back is offered but not done.
