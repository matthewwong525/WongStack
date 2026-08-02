# Cloudflare Access

Put a login wall in front of your app without writing a line of auth code. Cloudflare Access (the Zero Trust product) sits at the edge, authenticates the visitor against an identity provider you choose, and only then forwards the request to your Worker — with the verified email in a header the Worker trusts. This page stands up Access for the [Cloudflare stack](README.md): the org, an identity provider, one application, and the two policies that gate the admin surface while leaving the public one open.

> **This is opt-in, and nothing else requires it.** An app the stack pack [provisions](../../.claude/skills/wong-cloudflare/SKILL.md) is **public by default** — anyone with the link can open it, which is what most projects want. Nothing in the pack, the pipeline, or CI depends on Access existing. Come here when you decide you want people to sign in first.

You do this once per app, in the Cloudflare dashboard. It needs a Cloudflare account and a Worker you've already deployed at least once (so its hostnames exist). The token half of setup is the sibling page, [Cloudflare credentials](cloudflare-credentials.md) — an agent can grant itself the Access permissions on demand, so you don't pre-authorize anything to *read* this page.

**Adopting Access is two changes made together:** the Cloudflare setup below, and [the Worker code change](#the-auth-model-the-worker-trusts-a-header) that starts trusting the identity header. Doing either alone is a bug — see the warning in that section for why the code change *ahead* of the proxy is a security hole.

> Dashboard labels and menu paths drift and vary by plan. This page names the durable pieces — organization, identity provider, application, policy, bypass, service token — and where each roughly lives. If a label here doesn't match what you see, match on the concept; the shape hasn't changed.

## The model, in one picture

```
   visitor ──▶ Cloudflare Access (edge) ──▶ your Worker
                     │                          ▲
              authenticates against             │ trusts the
              your identity provider            │ Cf-Access-Authenticated-User-Email
                     │                          │ header — no auth code
              sets the identity header ─────────┘
```

Access is a **reverse proxy in front of every request.** A request that fails the policy never reaches your Worker — it's stopped at the edge with Cloudflare's login screen. A request that passes arrives with `Cf-Access-Authenticated-User-Email` set to the verified address. Once this is set up, the Worker can read that header and believe it, because nothing else could have set it. See [the auth model](#the-auth-model-the-worker-trusts-a-header) below for why that trust is safe once the proxy is there — and why the same code is a hole before it.

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

The one decision that matters here is the **application domain** — and this is the trick that makes previews free:

```
   ONE wildcard covers prod, staging AND every per-branch preview

   app.example.com          ← production
   *.example.workers.dev    ← the staging Worker + every branch preview, forever

   add both as application domains (or one wildcard that spans them)
```

Every non-production URL lives under the same `workers.dev` subdomain — the [staging Worker](d1-pipeline.md#why-staging-is-a-whole-worker) at `<worker>-staging.<subdomain>.workers.dev`, and each branch's version alias at `<branch>-<worker>-staging.<subdomain>.workers.dev`. So a wildcard over `*.<subdomain>.workers.dev` gates **every one of them, including URLs that don't exist yet** — you never touch Access again when you open a new branch or stand up a new environment. Add your production hostname as a second domain on the same application.

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

## The auth model: the Worker trusts a header

**The template Worker ships trusting nothing.** Because a provisioned app is public by default, the code below is something you *add* when you adopt Access — never before:

```
   public Worker + code that trusts Cf-Access-Authenticated-User-Email
        = anyone can send that header and become any user
```

On a Worker with no Access proxy in front, that header is attacker-controlled. It is an ordinary request header; a `curl` one-liner sets it to any address you like. Shipping the trust "ready for later" is not harmless preparation — it is an open impersonation hole for exactly as long as the app stays public. So the code change and the login wall are adopted in the same step, in this order: stand up Access, verify coverage, *then* trust the header.

Once Access is in front, **the Worker needs no auth code.** It reads the identity from the request:

```ts
// Returns the Access-verified email, or null when no proxy is in front.
// Add this ONLY once Access gates every hostname that reaches this Worker.
export function getAccessEmail(request: Request): string | null {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}
```

That's the whole authentication layer. No sessions, no token parsing, no login route — Access did it at the edge.

**This is safe only *behind* the proxy — and that safety is one wildcard away from gone.** The Worker trusts the header because, when every hostname is gated, nothing but the Access proxy can set it. If a hostname reaches the Worker *without* Access in front — a preview subdomain the wildcard doesn't match, a custom domain you added later, a route pointing straight at the Worker — then **anyone can send that header themselves and impersonate any user.** So make coverage a step you verify, not one you assume:

> **Verify previews are actually gated.** Open a freshly-deployed branch preview URL in a private window. You should hit Cloudflare's login screen *before* the app. If the app loads without a challenge, your wildcard doesn't cover that hostname pattern — fix the application domain before trusting the header anywhere.

For anything high-stakes, go one step further and **validate the Access JWT** (Cloudflare also sets a signed `Cf-Access-Jwt-Assertion` header) instead of trusting the plain email header — that verifies the request came from *your* Access application specifically, not just from some proxy.

### Local development

There's no Access proxy on your machine, so the header is absent and admin routes would be unreachable. Gate that behind an **explicit** dev flag — never a silent default:

- With a `SKIP_AUTH` dev flag set (e.g. `wrangler dev --var SKIP_AUTH:true`), a request missing the header falls back to a fixed dev identity (`dev@example.com`) so you can work locally.
- **Without** the flag, a missing header is a **`401`** — never a silent dev identity. That way a request that somehow slips past Access in production is rejected, not quietly attributed to a developer.

The rule: production fails closed. The fallback identity exists only because *you* turned it on for local work.

## Next

- Wire up the API token your build and CI need — including where the service token's two values go: [Cloudflare credentials](cloudflare-credentials.md).
- How the app got there in the first place: [the provisioning skill](../../.claude/skills/wong-cloudflare/SKILL.md).
- Back to the stack overview: [Cloudflare stack](README.md).
