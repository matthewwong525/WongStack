## Context

An adopter followed `wiki/stack/cloudflare-access.md` end to end and ended up with a wall that passes every check the runbook suggests and stops no human from being locked out — or, depending on how you read it, stops every human and admits every machine's opposite. The observed matrix on `workers.dev`:

| caller | result |
|---|---|
| unauthenticated | 302 to login ✅ |
| service token | reaches the Worker ✅ |
| logged-in browser | Cloudflare's "There is nothing here yet" placeholder ❌ |

Access applies to zones the account controls. `workers.dev` is Cloudflare's zone, and the login-completion redirect has nowhere correct to land. The runbook currently calls `*.<subdomain>.workers.dev` *"the trick that makes previews free,"* and the shipped spec **requires** that wildcard — so this is not a documentation slip, it is a specified behaviour that does not work.

Alongside it, three findings from the same adoption:

- The runbook's `getAccessEmail()` reads `Cf-Access-Authenticated-User-Email`. A service-token request arrives with only `cf-access-jwt-assertion, cf-connecting-ip, cf-ipcountry, cf-ray, cf-visitor` — Access strips `CF-Access-Client-Id` and sets no email. So the documented pattern `401`s CI and `/walk`. The adopter wrote `worker/access.ts` themselves after diagnosing it.
- `*.<subdomain>.workers.dev` would have walled five unrelated Workers sharing that subdomain.
- Provisioning lacks a propagation retry (Access `403`'d for ~a minute after a successful token widen), an account-selection step (a multi-account token nearly provisioned into the wrong account), and any end-of-run verification.

The unifying property: **every one of these is invisible to the checks the payload currently prescribes.** That is the thing this change has to fix, not just the individual values.

## Goals / Non-Goals

**Goals:**
- The documented Access path works when followed.
- A reader cannot mistake a passing terminal check for a working wall.
- One auth implementation serves humans and machines, so `/walk` and CI are not locked out by the recommended code.
- A policy gates the app, not everything sharing its subdomain.
- Provisioning catches a broken wall or a locked-out machine caller before reporting success.

**Non-Goals:**
- Making Access work on `workers.dev`. It is Cloudflare's zone; the honest answer is that a custom domain is required.
- Requiring Access. It stays opt-in and the app stays public by default.
- Full authorization — this is authentication and a wall, not roles or per-resource policy.
- The CI and config-drift fixes.

## Decisions

### A custom domain becomes a requirement, not a recommendation

The alternative — document `workers.dev` with caveats — was rejected. The failure mode is a silent security misconception: the reader believes the app is gated, and the evidence available to them agrees. A requirement with a stated reason is the only form that doesn't leave a trap, and the runbook additionally describes the symptom so an adopter already in that state recognizes it rather than filing a new bug.

The cost is real: previews on `workers.dev` can no longer be gated, which is what the wildcard was buying. That is a genuine capability loss and the runbook should say so rather than pretend the scoped patterns are strictly better.

### JWT verification replaces header trust as the default

Two independent arguments, and either alone would be sufficient:

- **Coverage.** The email header does not exist for service tokens. Any implementation keyed on it rejects every machine caller — including `/walk`, which the payload ships and expects to work against a gated preview. The verified assertion carries `email` for humans and `common_name` for service tokens, so one code path serves both.
- **Soundness.** Header trust is safe only when the proxy provably covers the hostname. Since a policy can silently fail to cover a hostname — finding one, above — that precondition is not one the reader can confirm. Verification checks the signature against this application, so it does not depend on a fact the reader can be wrong about.

The existing spec's framing (header trust, with JWT verification as "for anything high-stakes, go one step further") inverts the correct default. The optional step is the sound one and the default is the one that breaks.

### The module ships in the scaffold, not as a snippet

A snippet is retyped, and the version an adopter writes unaided is the header one — simpler-looking, wrong. Shipping `worker/access.ts` in the scaffold makes adopting Access *wiring* rather than *implementing*. It ships inert because the app is public by default, and it depends on `offer-app-scaffold` landing the scaffold category.

*Alternative considered:* a shared library the pack copies into any repo, scaffold or not. Deferred — a repo with its own app has its own Worker structure, and a drop-in module would have to guess where it goes. The scaffold is the case where the answer is known; other repos get the documented implementation to copy.

### The smoke test is the general fix

Each individual finding here is a specific wrong value, but they share a cause: nothing in the run ever asked whether the deployed thing behaves as configured. Two requests at the end — one anonymous, one service-token — would have caught the broken wall *and* the locked-out machine caller on the first run.

It is scoped honestly: where Access is on, the check states it does **not** prove a human can log in, and points at the browser verification. A check that overclaimed here would reproduce the exact failure the change exists to fix.

## Risks / Trade-offs

- **Repos already on `workers.dev` Access believe they are protected** → the changelog must say so directly, and the runbook must describe the symptom so it is recognizable. Nothing can detect it for them.
- **Requiring a custom domain raises the bar for the opt-in wall** → accepted; the wall is opt-in and the app is public by default, so the affected population is people who explicitly wanted authentication, for whom a domain is a proportionate ask.
- **JWT verification adds a dependency and a key fetch** → mitigated by shipping the module rather than asking each adopter to get it right; the public-key fetch is cacheable and the failure mode is fail-closed.
- **The smoke test needs a service token to be meaningful under Access** → where none exists it says what it could not check rather than passing silently.
- **Partial-label wildcard support is inferred from one adopter's API observation** → verify against the Access API during implementation before documenting it as the scoping mechanism; if it does not hold, the branch-preview patterns need enumerating another way.

## Migration Plan

Docs and skill prose reach existing repos through `/wong-sync`'s adapt step as proposals; `worker/access.ts` reaches new scaffolded repos by copy-if-absent.

`VERSION` takes a minor bump. The changelog entry SHALL lead with the `workers.dev` finding, in the imperative — a reader who set Access up following the old runbook needs to re-verify in a browser, and that is not a note at the bottom of a release.

Depends on `offer-app-scaffold` for the scaffold category that carries `worker/access.ts`. The doc and provisioning changes stand alone and can land first.

## Open Questions

- Does the Access API accept partial-label wildcards in every plan tier, or was the adopter's account on a tier where it does? The scoping recommendation depends on it — verify before documenting.
- Can the reference implementation be recovered from the adopting repo rather than re-derived? It exists and is deployed there; it is not reachable from this machine.
