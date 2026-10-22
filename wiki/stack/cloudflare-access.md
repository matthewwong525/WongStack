# Cloudflare Access

WongStack setup protects the business app automatically. The owner signs in with a code sent to their reachable email. Exact teammate emails can be allowed too; arbitrary domains and synthetic `.invalid` identities receive no grant. Pages, scripts, styles, APIs, mini apps, staging, and version previews are all protected: the live app by one sign-in, staging and previews by [their own](#two-private-apps-one-per-worker).

Production version URLs run the production version and inherit its bindings, including independently keyed memory. Staging and CI branch previews have no memory bindings. Keep every version behind its Worker's own wall.

## Turning it on through an agent

Setup widens the supplied user token into the normal Access permissions, reuses or creates the account's Zero Trust organization and email PIN provider, and creates unavailable bootstrap Workers before attaching protection. When Zero Trust onboarding needs a dashboard step, usually a card, setup finishes [open until the card](#open-until-the-card). Any other failure publishes no business content.

There is no enable-or-public question. Safe app/Worker/policy identifiers live in the install record; machine credentials live in ignored `.env` files. A separate CI token can read protection and publish code, without Access policy-write permission.

## Open until the card

Cloudflare turns on Zero Trust only once the account has a card on file. [`/wong-setup`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#step-4--provision) doesn't stop for it: the site goes live without the email login, and the closing report recommends the card as optional.

- **The switch is committed config, not a secret.** Production's and staging's `vars` carry `WORKSPACE_LOGIN: "off"`, with the `CF_ACCESS_*` ids blank, so a reviewer sees it. A secret would hide it from review.
- **The Worker honors it only while no Access id is set.** Once `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` has a value, a request without a valid assertion is refused, so a leftover switch can't weaken a private site.
- **The deploy check accepts only this exact state.** Both environments must carry the switch and no Access ids; the Worker names and the secrets rule still hold. Every publish prints one warning that the site is open. The switch beside Access ids fails the check.
- **Memory and the project's Git address stay private.** The Worker checks the sign-in on `/_memory/*` and `/api/access/code/git/*` either way.
- **Anyone with the link sees production, staging, and previews.** Staging binds no production data or memory.

**Turning it private later:** the person adds the card from [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list), and the runbook's [adding the card later](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#adding-the-card-later) reruns `provision`. It makes the Access app over the deployed Workers, fills the ids, and removes the switch in `app/wrangler.jsonc`, ready for `/save` to publish. The deploy check then runs in full.

## The model, in one picture

```text
visitor → Access email or machine authentication → Worker signed-JWT verification → app
memory client → production /_memory/* ────────┐
git           → /api/access/code/git/* ───────┴→ Worker checks the same sign-in itself
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

Setup makes two owned self-hosted applications, one per Worker. The shared provisioner records real provider IDs and checks readback; a resource name alone proves neither ownership nor coverage.

#### Two private apps, one per Worker

- **The live app**, `WongStack <repo> (<base>)`, covers the production Worker. Its default address anchors email login.
- **The previews app**, the same name with ` previews` added, covers the staging Worker and its default address, so every branch preview signs in there.

Each has its own audience, people policy, machine policy and service token, and each Worker accepts only its own app's audience. A sign-in made on a preview is refused by the live app, so branch code nobody has reviewed can't use it to reach memory, keys or the project. Both admit the same people, the same way: setup copies the live app's list and login methods, and [Access keeps both lists in step](employee-access.md#add-change-and-remove-people). The previews app also admits [people who can push on GitHub](preview-access.md#people-who-can-push-on-github), whose code already runs there.

An install from before has one app over both Workers. [Finish Access setup](employee-access.md#finish-access-setup) splits it: previews stop publishing until it runs, and the live app keeps publishing with a warning.

#### Why `workers.dev` cannot be gated

This heading remains for older links. The earlier hostname-only guidance is superseded: **native Worker-scoped Access protects `workers.dev`, including previews**. A custom domain is optional. Do not recreate the old broad account wildcard; it can wall unrelated Workers. A hostname redirect alone still does not prove a successful human login.

#### The hostnames to add

Give each app its own Worker destination. It follows that Worker across hostnames and versions. Keep the production default address as the login anchor. Review existing hostname/path apps, preview destinations, Worker routes, and custom domains before adoption: an overlapping higher-precedence app can change protection. Leave unrelated apps untouched and resolve conflicts before publication.

#### What you give up

Every business-app request needs a permitted identity. Existing intentionally public pages, webhooks, or APIs need an explicit migration review and a deliberate narrow route or separate service. WebSocket and other protocol requirements also need compatibility review; do not silently make them public when a probe fails.

### 3. Add the gating policy

The human policy uses exact reachable owner and teammate emails, deduplicated with the owner retained. A separate machine policy accepts only the workspace's verification service token. Membership changes edit the human policy and preserve machine access. Once the owner opens [Access](employee-access.md), the app keeps that policy's email list itself, from the people saved there.

New applications and human policies default to `720h` (30 days). This is the app's login/session-token lifetime. A reviewed existing shorter application or human-policy duration stays intact; it does not change machine or API lifetimes. Memory's sign-in is this session, so it lasts as long. A removed teammate's email permission is removed and both applications' existing sessions are revoked, so a still-unexpired token does not wait for its natural expiration. Provider propagation is asynchronous, and failed updates remain visibly pending.

### 4. Bypass the public surface

Two routes skip the wall, and the Worker checks the company sign-in on each itself, before any other work. Anyone else gets a 401.

| Route | Where | Why it skips the wall |
|---|---|---|
| `/_memory/*` | the production Worker and its default-hostname anchor | memory clients send the sign-in in a `cf-access-token` header |
| `/api/access/code/git/*` | every Worker and the anchor | Git sends the sign-in as a password, which the wall can't read |

The Worker verifies the same signed token the wall would: from the wall's header, the browser cookie, a `cf-access-token` header, or a Git password ([`access.ts`](../../app/worker/access.ts)). A Git call with none gets a 401 that asks for a password, so Git asks [the copy's credential helper](employee-project.md#update-the-copy), and its text names the sign-in step. Staging binds no memory and opens only the Git route. A destination override lets a request reach the Worker; it never skips the Worker's check.

One address under it is not memory: `/_memory/setup.mjs`, [the setup file](employee-project.md#the-setup-files-fixed-link) *Connect your assistant* names. It answers anyone, holds no key, and reads no store. It sits there so no install needs a second override: the publish check matches the destinations exactly.

Other public paths need their own reviewed design. A blanket bypass, account-wide wildcard, or permissive human selector fails the deployment check.

### 5. Create the service token (do it now)

Setup creates one verification service token per app, each with its own machine policy: the workspace checker opens the live app, saved as `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`, and the preview checker opens previews alone, saved as `CF_ACCESS_STAGING_CLIENT_ID` and `CF_ACCESS_STAGING_CLIENT_SECRET`. Both go in the primary ignored `.env` and a linked worktree's ignored copy. Never paste values into logs, git, request URLs, screenshots, or a Worker's runtime secrets. [Credentials](cloudflare-credentials.md#access-service-token) distinguish these values from the user token and CI deploy token.

The preview checker authenticates automated preview checks, so a branch walk never holds a pass the live app accepts. Each token's lifetime is separate from human sessions. `/verify` can recover missing machine access using its authorized heal; it must reuse the owned app, preserve people, and never broaden unrelated policies.

**An app that serves only the signed-in person**, such as the inbox, refuses the service token, so a preview check signs in as you: `cloudflared access login <preview address>` reuses your existing Cloudflare sign-in without a prompt. To send it items from this computer, `node scripts/company-api.mjs login --origin <preview address>` points one worktree at the preview; remove that sign-in when the check ends.

## Verify it works — in a browser

Check anonymous denial, machine access, memory through the sign-in, and real email login independently. The machine walk cannot substitute for a human login. Open production, staging, an existing version/alias, and a fresh branch preview in a browser with the allowed email, on default and configured custom addresses; confirm the app renders after PIN login. Capture credential-free evidence, keeping cookies and tokens in private files.

Repeat the status probes with saved ignored credentials:

```bash
node scripts/probe-private-access.mjs --url https://your-worker.your-subdomain.workers.dev/
node scripts/probe-private-access.mjs --url https://your-preview.your-subdomain.workers.dev/favicon.svg --preview
```

`--preview` sends the preview checker, since the workspace checker can't open a preview. The output includes only independent anonymous/machine statuses and leaves human login unverified. Anonymous requests should receive an Access redirect or a closed denial, and machine requests should render the app. Check memory separately with `memory.mjs digest` under the owner's sign-in. Also test teammate removal using an already active human session and preserve owner/machine access; report pending provider propagation or retry honestly.

## The auth model: verify the signed assertion

The template entry point enforces `app/worker/access.ts` before every app route and asset. Missing public Access configuration returns unavailable, unless the site is [open until the card](#open-until-the-card); absent, expired, forged, wrong-audience, or invalid-signature assertions are denied. Assets run through the Worker first, including unknown paths that would otherwise use the SPA fallback.

### Verify the JWT; don't trust the header

Human JWT claims carry an email; machine claims carry `common_name`, the service token's client ID. Both require a valid signed assertion from the configured organization and audience. `Cf-Access-Authenticated-User-Email` alone is attacker-controlled and never accepted. Access also sets no such header for a service token, and strips the `CF-Access-Client-Id` and `CF-Access-Client-Secret` it was sent, so a Worker that reads the header refuses every machine caller. Cloudflare rotates the signing keys: fetch and cache them, and fetch again on an unknown `kid` ([`access.ts`](../../app/worker/access.ts)). Memory routes verify the same sign-in before this app guard, and also take a cloud schedule's own memory sign-in, which the store checks against its own list ([memory sign-in](../development/memory.md#sign-in-and-expiry)).

### Turning it on

Setup writes public `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `CF_ACCESS_APP_ID`, `CF_ACCESS_WORKER_ID`, and `WONG_ENVIRONMENT` vars in production and staging configuration, each environment with its own app's audience and id. Preserve each environment's real Worker ID and app audience when adapting an installed app. Merge the signed guard into local handlers; replacing them with the scaffold can erase business code.

Both CI backends and host previews run `scripts/check-private-access.mjs` before content publication. It reads actual Worker metadata, secret names, destinations, policies, and overlapping apps, and checks generated config against source; an [open](#open-until-the-card) config gets only the Worker and secret checks, and a warning. The two environments must name different apps on the same team, each covering its own Worker. A preview still on the live app's sign-in stops the preview publish; the live publish passes with a warning that names [the Access step](employee-access.md#finish-access-setup). Missing coverage or provider/read permission stops publication. Repair private setup or restore the CI token's account-scoped `Access: Apps and Policies Read`, then retry; never disable the check to get a preview. A `private-access: Unexpected token '<'` error is Cloudflare's own outage, not your setup: its API sent back an error page, often a 504 timeout. Check [Cloudflare's status page](https://www.cloudflarestatus.com/) for a Zero Trust incident, and rerun the deploy once it clears: run the check from this computer until it passes twice in a row, since one answer can succeed mid-outage.

### Local development

`npm run dev` selects the dedicated `local` environment. Authentication substitution requires all three: `WONG_ENVIRONMENT=local`, `SKIP_AUTH=true`, and a loopback request hostname. Production/staging config and secret names cannot carry local overrides. Local D1 uses `remote: false`; production memory is not bound locally.

## Next

- [Cloudflare credentials](cloudflare-credentials.md) — storage and authority of each credential.
- [Provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) — automatic setup and recovery.
- [Cloudflare stack](README.md) — the app and data pipeline.
