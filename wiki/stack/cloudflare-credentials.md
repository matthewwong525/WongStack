# Cloudflare credentials

Get the right tokens into `.env` and everything downstream — build-log reads, CI, tests — just works. This page covers the two credentials the [Cloudflare stack](README.md) needs: a **user-scoped API token** for talking to the Cloudflare API, and the **Access service token** for reaching your Access-gated preview URLs without a browser. Both land in `.env` following the [secrets convention](../development/secrets.md); real values never touch git.

> As on the [Access page](cloudflare-access.md), exact dashboard labels and permission names drift and vary by plan. Verify the specific names against the live dashboard as you go; the shape below is stable.

## User-scoped API token — not an account token

This is the single most confusing trap in the stack, so lead with it:

> **Create a *user*-scoped token, not an *account*-scoped one.** The Workers Builds log API rejects account tokens with `Invalid token` — even when the token has every Workers permission. Reading a failed build's log is exactly what you need when CI goes red, so an account token leaves you blind at the worst moment. Only a token created under **My Profile → API Tokens** works.

Where they differ in the dashboard:

```
   My Profile → API Tokens          ✅ user-scoped — use this
   Account → … → API Tokens         ❌ account-scoped — Workers Builds log API says "Invalid token"
```

### Create it

1. Go to **My Profile → API Tokens → Create Token** (the profile menu under your avatar, *not* the account/Workers area).
2. Grant the permissions the stack uses. Verify the exact names in the dashboard's permission picker — roughly:
   - **Workers Scripts: Edit** — deploy the Worker.
   - **D1: Edit** — apply migrations, run the staging reset.
   - **Workers R2 Storage: Edit** — read/write buckets (if the app uses R2).
   - **Account Settings: Read** — resolve account context.
   - **Access: Apps and Policies: Edit** — manage the Access application from the CLI (optional; needed only if you script Access).
   - Plus whatever the Workers **Builds** log read requires — confirm the current permission name in the picker; this is the one an account token can't satisfy regardless.
3. Create the token and copy it once — the dashboard shows it a single time.

### Store it

Put it in `.env`, following the [secrets convention](../development/secrets.md) (real values git-ignored; a blank, commented line in `.env.example`):

```bash
# Cloudflare — user-scoped API token from My Profile → API Tokens
# (NOT an account token — the Workers Builds log API rejects those).
CLOUDFLARE_USER_TOKEN=
# Your Cloudflare account ID (dashboard → any domain → Overview, or the URL).
CLOUDFLARE_ACCOUNT_ID=
```

Fill in the real values in `.env`. With both set, the tools that read build logs and drive the deploy have everything they need — no further setup.

## Access service token

The service token is how a **non-interactive caller** — GitHub Actions, a script, anything without a browser — gets past [Cloudflare Access](cloudflare-access.md) to reach a gated preview URL. You created it and let it through the policy on the [Access page](cloudflare-access.md#5-create-the-service-token-do-it-now); here's where its two values go.

A service token is an ID/secret pair. The caller sends them as request headers and Access lets it through:

```
   CF-Access-Client-Id:     <client id>
   CF-Access-Client-Secret: <client secret>
```

Store both alongside the API token:

```bash
# Cloudflare Access service token — lets CI reach Access-gated preview URLs.
# Created under Zero Trust → Access → Service Auth; the policy must accept it.
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

Nothing consumes these yet — the integration-test setup that reaches previews from CI arrives in a later change. They're captured now because adding the token later means re-opening the Access policy; setting it up once, up front, is the cheaper path.

## Worker secrets are per environment

The two credentials above are yours — they live in `.env` and let *you* and CI talk to Cloudflare. A **Worker secret** is different: it belongs to a deployed Worker, and the runtime reads it off `env`. An API key the Worker itself calls out with is this kind.

Secrets are scoped to a single Worker, and [staging is a separate Worker](d1-pipeline.md#why-staging-is-a-whole-worker). So every secret has to be put twice:

```bash
npx wrangler secret put GEMINI_API_KEY                  # the production Worker
npx wrangler secret put GEMINI_API_KEY --env staging    # the staging Worker
```

Forgetting the second one is the single most common staging failure, and it's the friendly kind — the binding is simply missing, so the Worker throws on first use rather than doing something subtly wrong. Add a secret to production and put it in staging in the same sitting.

Locally, the same values go in `.dev.vars` (git-ignored, per the [secrets convention](../development/secrets.md)) — `wrangler dev` reads that instead.

## Next

- If you haven't set up the login wall yet: [Cloudflare Access](cloudflare-access.md).
- How staging gets its own Worker and its own bindings: [Deploy and data pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
