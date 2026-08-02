# Cloudflare Access

Put a login wall in front of your app without writing a line of auth code. Cloudflare Access (the Zero Trust product) sits at the edge, authenticates the visitor against an identity provider you choose, and only then forwards the request to your Worker — carrying a **signed assertion** the Worker verifies. This page stands up Access for the [Cloudflare stack](README.md): the org, an identity provider, one application, and the two policies that gate the admin surface while leaving the public one open.

> **Read this before you start: Access needs a custom domain.** You cannot reliably gate a `workers.dev` hostname, and the way it fails is the dangerous kind — [every terminal check passes](#why-workersdev-cannot-be-gated) while a logged-in browser gets Cloudflare's *"There is nothing here yet"* placeholder. If you set Access up on `workers.dev` following an earlier version of this page, **go verify it in a browser now.**

> **This is opt-in, and nothing else requires it.** An app the stack pack [provisions](../../.claude/skills/wong-cloudflare/SKILL.md) is **public by default** — anyone with the link can open it, which is what most projects want. Nothing in the pack, the pipeline, or CI depends on Access existing. Come here when you decide you want people to sign in first.

You do this once per app, in the Cloudflare dashboard. It needs a Cloudflare account and a Worker you've already deployed at least once (so its hostnames exist). The token half of setup is the sibling page, [Cloudflare credentials](cloudflare-credentials.md) — an agent can grant itself the Access permissions on demand, so you don't pre-authorize anything to *read* this page.

**Adopting Access is two changes made together:** the Cloudflare setup below, and [the Worker code change](#the-auth-model-verify-the-signed-assertion) that starts enforcing identity. Doing either alone is a bug — see the warning in that section for why enforcing *ahead* of the proxy is a security hole.

> Dashboard labels and menu paths drift and vary by plan. This page names the durable pieces — organization, identity provider, application, policy, bypass, service token — and where each roughly lives. If a label here doesn't match what you see, match on the concept; the shape hasn't changed.

## The model, in one picture

```
   visitor ──▶ Cloudflare Access (edge) ──▶ your Worker
                     │                          ▲
              authenticates against             │ VERIFIES the signed
              your identity provider            │ Cf-Access-Jwt-Assertion
                     │                          │ against this application
              signs an assertion ───────────────┘
```

Access is a **reverse proxy in front of every request.** A request that fails the policy never reaches your Worker — it's stopped at the edge with Cloudflare's login screen. A request that passes arrives carrying `Cf-Access-Jwt-Assertion`: a JWT, signed by your Access organization and scoped to this application. The Worker verifies that signature and reads the identity out of the verified claims. See [the auth model](#the-auth-model-verify-the-signed-assertion) below for the code, and for why verifying beats trusting a plain header.

## Setup

### 1. Turn on Zero Trust and pick an identity provider

In the Cloudflare dashboard, open **Zero Trust** and — first time only — choose a team name (your org's Zero Trust subdomain) and a plan; the free tier covers this setup.

> **Unverified step.** Whether this first-time onboarding can be done through the API (`POST /accounts/{id}/access/organizations`) rather than the dashboard could not be tested during design — both accounts available already had a Zero Trust organization, and once one exists the cold-start path can never be observed again. Plan selection may well be dashboard-only. If an agent's API call fails here, that's the expected fallback, not a bug: do this step in the dashboard and continue. Everything after it is API-driven.

Then add an **identity provider** (under Settings → Authentication): the source of truth for *who* your users are. Two common choices:

- **One-time PIN** — Cloudflare emails a code to any address you allow. Zero external setup; good to start.
- **A real IdP** (Google Workspace, GitHub, Okta, …) — users sign in with an account they already have. Better once you have a team; follow the provider's OAuth-app steps and paste the client ID/secret back into Cloudflare.

You can add more than one and let users pick at login.

### 2. Create the Access application

An **application** is the set of URLs Access guards plus the rules for who gets in. Under **Zero Trust → Access → Applications**, add a **self-hosted** application.

The one decision that matters here is the **application domain**, and it has one hard requirement.

#### Why `workers.dev` cannot be gated

**Use a custom domain — a zone you own and have added to Cloudflare.** Access is built to protect hostnames in *your* zones. `workers.dev` is Cloudflare's zone, not yours, and an Access application over it does not reliably serve authenticated traffic through to your Worker.

What makes this dangerous is the shape of the failure. **Every check you can run from a terminal passes:**

| caller | result | reads as |
|---|---|---|
| unauthenticated `curl` | `302` to the login page | ✅ the wall works |
| service token | reaches the Worker, `200` | ✅ machines get through |
| **logged-in browser** | Cloudflare's *"There is nothing here yet"* placeholder | ❌ **no human can use the app** |

So a `curl`-based verification reports a working wall, and the reader concludes they are protected. They are not — they have built a wall that stops everyone. **If you see exactly that pattern, this is what you are looking at.** It is not a DNS delay, a propagation window, or a caching artifact.

#### The hostnames to add

Add your app's own hostnames explicitly, on a custom domain:

```
   app.example.com               ← production
   staging.example.com           ← the staging Worker
   *-staging.example.com         ← per-branch preview aliases
```

Route each to the corresponding Worker (production, and the [staging Worker](d1-pipeline.md#why-staging-is-a-whole-worker)) with a Workers custom domain or route, then add these as the application's domains.

**Scope to your app, never to the whole subdomain.** An earlier version of this page recommended `*.<subdomain>.workers.dev` as "the trick that makes previews free". It is worse than unreliable — that pattern matches **every Worker in the account**, so for one adopter it would have walled five unrelated ones. If you do add a `workers.dev` pattern for any reason, the Access API accepts **partial-label wildcards**, which is what scoping needs and is not obvious:

```
   *-<worker>-staging.<subdomain>.workers.dev     ← this app's previews only
   *.<subdomain>.workers.dev                      ← every Worker you own. Don't.
```

Partial-label patterns are accepted by the Access API — verified live against a real account, where `*-claymoo-admin.snowy-waterfall-9b1b.workers.dev` is a working application domain. Whether every plan tier accepts them was not established; if yours rejects the pattern, that is the constraint, and the answer is the custom domain rather than widening to `*.`.

#### What you give up

**Previews on `workers.dev` can no longer be gated.** That is a real capability loss, and it is the honest trade: the old wildcard appeared to gate them and did not serve a logged-in human, so what is lost is the *appearance* of coverage rather than coverage. If your branch previews must be behind the wall, give them custom-domain hostnames (`*-staging.example.com` above) and route them; if that is more than you want, treat preview URLs as unlisted-but-public and keep secrets out of staging data — which the pack's [seeded staging](d1-pipeline.md#seeded-staging-production-untouched) already assumes.

### 3. Add the gating policy

A policy is who's allowed. On the application, add an **Allow** policy — e.g. *emails ending in `@yourcompany.com`*, or *these specific emails*, or *this IdP group*. This is the rule the visitor's identity is checked against before the request is proxied through.

### 4. Bypass the public surface

Not everything should require login. Inbound webhooks, open APIs, and any public UI must reach the Worker **without** an Access challenge — a webhook can't complete a login form.

Carve those out with a **Bypass** policy scoped to the public path prefix (e.g. `/public/*`). A bypass policy lets matching requests through with no authentication.

**Ordering matters.** Access evaluates an application's policies in order and takes the first match, so the `/public/*` **Bypass must sit above the catch-all Allow** — otherwise the Allow matches first and challenges your webhooks. Put the narrow bypass first, the broad gate last.

```
   policy order (first match wins)
   ┌────────────────────────────────────┐
   │ 1. Bypass   path = /public/*        │  ← webhooks, open APIs, public UI
   ├────────────────────────────────────┤
   │ 2. Allow    email ends @company.com │  ← everything else = the admin app
   └────────────────────────────────────┘
```

### 5. Create the service token (do it now)

A **service token** is a machine credential — an ID/secret pair a non-interactive caller (like CI) sends as `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers to pass Access without a browser login. You don't need it yet, but adding it later means re-opening the policy, so create it now while you're here.

Create it under **Zero Trust → Access → Service Auth**, then add a policy (or extend an existing one) that accepts that specific service token. The mechanics of storing its two values live on the [credentials page](cloudflare-credentials.md#access-service-token) — this step is just "make it exist and let it through the policy."

## Verify it works — in a browser

**A terminal cannot verify this wall.** The `workers.dev` failure above passes every `curl` check while serving no human, so an anonymous `302` and a service-token `200` are *not* evidence that Access works. They are two of the three answers you need, and the one they cannot give you is the one that matters.

Check all three, and the third one in a real browser:

| # | Do this | Expect | If it's wrong |
|---|---|---|---|
| 1 | `curl -sI https://<your-app>` anonymously | `302` to `<team>.cloudflareaccess.com` | No redirect → the hostname isn't covered by the application's domains |
| 2 | `curl -sI -H "CF-Access-Client-Id: …" -H "CF-Access-Client-Secret: …" https://<your-app>` | `200` from your Worker | `302` → the service token isn't in an Allow policy |
| 3 | **Open the URL in a browser, log in** | **Your app renders** | Cloudflare's *"There is nothing here yet"* placeholder → you're on `workers.dev`; move to a [custom domain](#why-workersdev-cannot-be-gated) |

Do step 3 on **every** hostname pattern you added — production, staging, and a freshly-deployed branch preview — in a private window. A pattern that doesn't match leaves that hostname ungated, and an ungated hostname reaching a Worker that enforces identity is the hole described below.

## The auth model: verify the signed assertion

**The template Worker ships enforcing nothing.** Because a provisioned app is public by default, enforcement is something you *add* when you adopt Access — never before:

```
   public Worker + code that trusts an identity header
        = anyone can send that header and become any user
```

On a Worker with no Access proxy in front, `Cf-Access-Authenticated-User-Email` is attacker-controlled — it is an ordinary request header, and a `curl` one-liner sets it to any address you like. Shipping enforcement "ready for later" is not harmless preparation; it is an open impersonation hole for exactly as long as the app stays public. So the code change and the login wall are adopted in the same step, in this order: stand up Access, [verify coverage in a browser](#verify-it-works--in-a-browser), *then* enable enforcement.

### Verify the JWT; don't trust the header

The Worker verifies the signed `Cf-Access-Jwt-Assertion` against your Access application. Two independent reasons, either sufficient:

- **The header pattern locks out every machine caller — including WongStack's own [`/walk`](staging-walkthrough.md).** Access sets **no email header for a service token.** Such a request arrives carrying only `cf-access-jwt-assertion` and the ordinary `cf-*` headers (`cf-connecting-ip`, `cf-ipcountry`, `cf-ray`, `cf-visitor`), and the `CF-Access-Client-Id`/`Secret` it sent are stripped. So a Worker reading the email header `401`s CI and every automated caller. The JWT is the only signal that covers humans and machines both.
- **Header trust rests on a precondition you cannot confirm.** It is safe *only* if the proxy provably covers every hostname reaching the Worker — and as the `workers.dev` case shows, a policy can silently fail to cover one. Verifying the signature checks the claim against *this application*, so it doesn't depend on a fact you can be wrong about.

**One path serves both callers,** because the verified claims differ by exactly one field:

| caller | `email` | `common_name` | `sub` |
|---|---|---|---|
| human, via your IdP | the verified address | — | user id |
| service token | — | the token's Client ID | `""` |

So `claims.email ?? claims.common_name` is the identity, and it is trustworthy because the signature was checked.

The implementation ships with the [app scaffold](../../.claude/skills/wong-sync/references/payload-manifest.md#the-opt-in-app-scaffold) as **`app/worker/access.ts`** — present, wired into nothing, enforcing nothing until you adopt Access. It is a module rather than a snippet on this page deliberately: a snippet gets retyped, and the version someone writes unaided is the header one, which is simpler-looking and wrong.

### Turning it on

One wiring step, after the browser verification above passes:

1. Set the two variables the module needs in your `wrangler.jsonc` `vars` (both are public identifiers, not secrets):
   - `CF_ACCESS_TEAM_DOMAIN` — `<your-team-name>.cloudflareaccess.com`
   - `CF_ACCESS_AUD` — the application's **Application Audience (AUD) tag**, from the application's settings in the dashboard.
2. Call it at the top of your fetch handler and act on the result:

   ```ts
   import { getAccessIdentity } from "./access";

   const identity = await getAccessIdentity(request, env);
   if (!identity) return new Response("Unauthorized", { status: 401 });
   // identity.id is the email (human) or the service token's client id (machine)
   ```

Fail closed: no valid assertion means `401`, never an anonymous fallback.

### Local development

There's no Access proxy on your machine, so no assertion arrives and gated routes would be unreachable. Gate that behind an **explicit** dev flag — never a silent default:

- With a `SKIP_AUTH` dev flag set (e.g. `wrangler dev --var SKIP_AUTH:true`), a request with no assertion falls back to a fixed dev identity (`dev@example.com`) so you can work locally.
- **Without** the flag, a missing or unverifiable assertion is a **`401`** — never a silent dev identity. That way a request that somehow slips past Access in production is rejected, not quietly attributed to a developer.

The rule: production fails closed. The fallback identity exists only because *you* turned it on for local work, and `access.ts` reads the flag from `env` so it cannot be set by a request.

## Next

- Wire up the API token your build and CI need — including where the service token's two values go: [Cloudflare credentials](cloudflare-credentials.md).
- How the app got there in the first place: [the provisioning skill](../../.claude/skills/wong-cloudflare/SKILL.md).
- Back to the stack overview: [Cloudflare stack](README.md).
