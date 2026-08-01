# Cloudflare Access

Put a login wall in front of your app without writing a line of auth code. Cloudflare Access (the Zero Trust product) sits at the edge, authenticates the visitor against an identity provider you choose, and only then forwards the request to your Worker — with the verified email in a header the Worker trusts. This page stands up Access for the [Cloudflare stack](README.md): the org, an identity provider, one application, and the two policies that gate the admin surface while leaving the public one open.

You do this once per app, in the Cloudflare dashboard. It needs a Cloudflare account and a Worker you've already deployed at least once (so its hostnames exist). The token half of setup — the API tokens your build and CI need — is the sibling page, [Cloudflare credentials](cloudflare-credentials.md).

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

Access is a **reverse proxy in front of every request.** A request that fails the policy never reaches your Worker — it's stopped at the edge with Cloudflare's login screen. A request that passes arrives with `Cf-Access-Authenticated-User-Email` set to the verified address. The Worker reads that header and believes it, because nothing else could have set it. See [the auth model](#the-auth-model-the-worker-trusts-a-header) below for why that trust is safe — and exactly when it isn't.

## Setup

### 1. Turn on Zero Trust and pick an identity provider

In the Cloudflare dashboard, open **Zero Trust** and — first time only — choose a team name (your org's Zero Trust subdomain) and a plan; the free tier covers this setup.

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

Once Access is in front, **the Worker needs no auth code.** It reads the identity from the request:

```ts
// Returns the Access-verified email, or null when no proxy is in front.
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

- Wire up the API tokens your build and CI need — including where the service token's two values go: [Cloudflare credentials](cloudflare-credentials.md).
- Back to the stack overview: [Cloudflare stack](README.md).
