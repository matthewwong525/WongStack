# Cloudflare Access

WongStack setup protects the business app automatically. The owner signs in with a code sent to their reachable email. Exact teammate emails can be allowed too; arbitrary domains and synthetic `.invalid` identities receive no grant. Pages, scripts, styles, APIs, mini apps, staging, and version previews share the same protection.

Production version URLs run the production version and inherit its bindings, including independently keyed memory. Staging and CI branch previews have no memory bindings. Keep every version protected by the same Worker-scoped wall.

## Turning it on through an agent

Setup widens the supplied user token into the normal Access permissions, reuses or creates the account's Zero Trust organization and email PIN provider, and creates unavailable bootstrap Workers before attaching protection. When Zero Trust onboarding needs a dashboard step, usually a card, setup finishes [open until the card](#open-until-the-card). Any other failure publishes no business content.

There is no enable-or-public question. Safe app/Worker/policy identifiers live in the install record; machine credentials live in ignored `.env` files. A separate CI token can read protection and publish code, without Access policy-write permission.

## Open until the card

Cloudflare turns on Zero Trust only once the account has a card on file. [`/wong-setup`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#step-4--provision) doesn't stop for it: the site goes live without the email login, and the closing report recommends the card as optional.

- **The switch is committed config, not a secret.** Production's and staging's `vars` carry `WORKSPACE_LOGIN: "off"`, with the `CF_ACCESS_*` ids blank, so a reviewer sees it. A secret would hide it from review.
- **The Worker honors it only while no Access id is set.** Once `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` has a value, a request without a valid assertion is refused, so a leftover switch can't weaken a private site.
- **The deploy check accepts only this exact state.** Both environments must carry the switch and no Access ids; the Worker names and the secrets rule still hold. Every publish prints one warning that the site is open. The switch beside Access ids fails the check.
- **Memory stays private.** `/_memory/*` checks its own key either way.
- **Anyone with the link sees production, staging, and previews.** Staging binds no production data or memory.

**Turning it private later:** the person adds the card from [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list), and the runbook's [adding the card later](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#adding-the-card-later) reruns `provision`. It makes the Access app over the deployed Workers, fills the ids, and removes the switch in `app/wrangler.jsonc`, ready for `/save` to publish. The deploy check then runs in full.

## The model, in one picture

```text
visitor → Access email or machine authentication → Worker signed-JWT verification → app
memory client → production /_memory/* → independent memory-key verification
```

Native Worker destinations cover each actual Worker ID, including default addresses, custom domains, and old/new version previews. The Worker also verifies the signed assertion's audience, issuer, signature, and expiration. A forged email header gives no identity.

## The wall decides who; the app decides what

Access answers one question: who gets in. Its [policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/) match a person's email, group, service token, country or device, and an application matches a hostname and [a path](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/). No rule matches read against write, an HTTP method, or one of your saved keys.

So the wall keeps that one job and passes the app a signed proof of who the person is. The app checks that person's apps and [key levels](employee-access.md#key-levels) on every request, from its own database: a change there governs the next request, with no Cloudflare call.

An Access application per app path would move only the app tick to Cloudflare, never a level, and would make every tick a provider write. The deployment check also rejects overlapping applications on purpose.

## Signing out

Every page's top bar has *Sign out* on the right. It goes to `/cdn-cgi/access/logout` on the app's own address, which Cloudflare Access serves: the session ends in that browser, and the next visit asks for an emailed code. The app clears no cookie: the cookie is Cloudflare's.

The link shows only where a sign-in stands in front of the site. The Worker says so as `signIn` in `/api/access/apps`: false while the site is [open until the card](#open-until-the-card) and on [a local run](#local-development), where no session exists to end.

## Setup

### 1. Turn on Zero Trust and pick an identity provider

Setup preserves an existing organization and creates only a missing email PIN provider. Cold-start onboarding or plan selection may need a person in the dashboard; that remains pending until completed. Do not replace an account's existing identity settings to force a setup through.

### 2. Create the Access application

One owned self-hosted application covers the production and staging Worker IDs. A production default-hostname destination anchors email login. The shared provisioner records real provider IDs and checks readback; a resource name alone proves neither ownership nor coverage.

#### Why `workers.dev` cannot be gated

This heading remains for older links. The earlier hostname-only guidance is superseded: **native Worker-scoped Access protects `workers.dev`, including previews**. A custom domain is optional. Do not recreate the old broad account wildcard; it can wall unrelated Workers. A hostname redirect alone still does not prove a successful human login.

#### The hostnames to add

Use the two actual Worker destinations. They follow the production and staging Workers across hostnames and versions. Keep the production default address as the login anchor. Review existing hostname/path apps, preview destinations, Worker routes, and custom domains before adoption: an overlapping higher-precedence app can change protection. Leave unrelated apps untouched and resolve conflicts before publication.

#### What you give up

Every business-app request needs a permitted identity. Existing intentionally public pages, webhooks, or APIs need an explicit migration review and a deliberate narrow route or separate service. WebSocket and other protocol requirements also need compatibility review; do not silently make them public when a probe fails.

### 3. Add the gating policy

The human policy uses exact reachable owner and teammate emails, deduplicated with the owner retained. A separate machine policy accepts only the workspace's verification service token. Membership changes edit the human policy and preserve machine access. Once the owner opens [Access](employee-access.md), the app keeps that policy's email list itself, from the people saved there.

New applications and human policies default to `720h` (30 days). This is the app's login/session-token lifetime. A reviewed existing shorter application or human-policy duration stays intact; it does not change machine, API, or memory-key lifetimes. A removed teammate's email permission is removed and this application's existing sessions are revoked, so a still-unexpired token does not wait for its natural expiration. Provider propagation is asynchronous, and failed updates remain visibly pending.

### 4. Bypass the public surface

Only production `/_memory/*` has a public destination override, on the production Worker and its default-hostname anchor. It remains protected by the memory route’s own machine credential. Repository authorization is its policy; the repo secret proves it to the store. Staging binds no production memory and gets no public override. A destination override lets a request reach the Worker; it never disables the memory key check.

Other public paths need their own reviewed design. A blanket bypass, account-wide wildcard, or permissive human selector fails the deployment check.

### 5. Create the service token (do it now)

Setup creates a workspace verification service token and its separate machine policy, saving `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in the primary ignored `.env` and a linked worktree's ignored copy. Never paste values into logs, git, request URLs, screenshots, or a Worker's runtime secrets. [Credentials](cloudflare-credentials.md#access-service-token) distinguish these values from the user token and CI deploy token.

The service token authenticates automated previews. Its default lifetime is separate from human sessions. `/verify` can recover missing machine access using its authorized heal; it must reuse the owned app, preserve people, and never broaden unrelated policies.

## Verify it works — in a browser

Check anonymous denial, machine access, memory-key access, and real email login independently. The machine walk cannot substitute for a human login. Open production, staging, an existing version/alias, and a fresh branch preview in a browser with the allowed email, on default and configured custom addresses; confirm the app renders after PIN login. Capture credential-free evidence, keeping cookies and tokens in private files.

Repeat the status probes with saved ignored credentials:

```bash
node scripts/probe-private-access.mjs --url https://your-worker.your-subdomain.workers.dev/
node scripts/probe-private-access.mjs --url https://your-preview.your-subdomain.workers.dev/favicon.svg
```

The output includes only independent anonymous/machine statuses and leaves human login unverified. Anonymous requests should receive an Access redirect or a closed denial, and machine requests should render the app. Check memory separately with `memory.mjs digest` and its own key. Also test teammate removal using an already active human session and preserve owner/machine access; report pending provider propagation or retry honestly.

## The auth model: verify the signed assertion

The template entry point enforces `app/worker/access.ts` before every app route and asset. Missing public Access configuration returns unavailable, unless the site is [open until the card](#open-until-the-card); absent, expired, forged, wrong-audience, or invalid-signature assertions are denied. Assets run through the Worker first, including unknown paths that would otherwise use the SPA fallback.

### Verify the JWT; don't trust the header

Human JWT claims carry an email; machine claims carry `common_name`, the service token's client ID. Both require a valid signed assertion from the configured organization and audience. `Cf-Access-Authenticated-User-Email` alone is attacker-controlled and never accepted. Memory routes run their separate credential check before this app guard. The setup-supplied app link carries an optional one-use machine marker: normal verified human login labels that installation, then redirects to the clean app URL. A bare unrelated visit identifies no machine. Labels change no memory permission ([the memory key](../development/memory-key.md#ordinary-login-labels-the-machine)).

### Turning it on

Setup writes public `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `CF_ACCESS_APP_ID`, `CF_ACCESS_WORKER_ID`, and `WONG_ENVIRONMENT` vars in production and staging configuration. Preserve each environment's real Worker ID and app audience when adapting an installed app. Merge the signed guard into local handlers; replacing them with the scaffold can erase business code.

Both CI backends and host previews run `scripts/check-private-access.mjs` before content publication. It reads actual Worker metadata, secret names, destinations, policies, and overlapping apps, and checks generated config against source; an [open](#open-until-the-card) config gets only the Worker and secret checks, and a warning. Missing coverage or provider/read permission stops publication. Repair private setup or restore the CI token's account-scoped `Access: Apps and Policies Read`, then retry; never disable the check to get a preview.

### Local development

`npm run dev` selects the dedicated `local` environment. Authentication substitution requires all three: `WONG_ENVIRONMENT=local`, `SKIP_AUTH=true`, and a loopback request hostname. Production/staging config and secret names cannot carry local overrides. Local D1 uses `remote: false`; production memory is not bound locally.

## Next

- [Cloudflare credentials](cloudflare-credentials.md) — storage and authority of each credential.
- [Provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) — automatic setup and recovery.
- [Cloudflare stack](README.md) — the app and data pipeline.
