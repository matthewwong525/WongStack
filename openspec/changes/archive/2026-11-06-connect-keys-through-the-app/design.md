## Context

See proposal.md for why. What shapes the how:

- `browser.mjs where` (`whereIs`, about :73) answers `chrome` on darwin, win32, or Linux with a display, so a Mac never reaches Camoufox unless `attach` fails first. The Chrome backend is `agent-browser --auto-connect` (:79-141).
- `attach --server` already works on a Mac: Camoufox opens in a window (`browse.mjs window`, on by default off Linux). But `sign-in` and `watch` fail there. `hand-over.mjs` takes the window branch (`startLink`, :468, :490-497) and writes `view = {note, window: true}` with no `watch` flag. `watchControl()` (:160-164) then returns null, and `signIn` throws *The watch link did not stay open* (`browser.mjs:336`). No test covers `--watch` in window mode.
- `take-key` (:279-297) writes the primary `app/.dev.vars` and then runs `cf-secrets.mjs put-tool`, which runs `wrangler secret put` with the primary `.env` Cloudflare login. With no login, the key cannot reach the app.
- The Worker cannot set its own secrets. Its only Cloudflare token, `WONG_CLOUDFLARE_READ`, only reads. Tools added from a chat sit in D1 `tools` (`forward_json`, `levels_json`), never with the key. `forward.ts` reads `env[forward.secret]` per request (:66). `dispatch` refuses a key whose secrets are not all set (`contract.ts:277`).
- `forward` is a Zod `strictObject` (`employee-access/tools.ts:7-17`) checked by `key-rules.ts` (`forwardProblem`). Nothing in the app does token exchange.
- Publishing: the GitHub route's `deploy.yml` deploys with `secrets.CLOUDFLARE_DEPLOY_TOKEN` (Migrate, then Deploy). The Artifacts route runs its own runner with the same scripts. A secret put after deploy makes a new version, as `wrangler secret put` does today.

## Goals / Non-Goals

**Goals:**

- One way to connect: the assistant's own browser, on every computer.
- No Cloudflare login on the computer for a key to reach the app.
- No key the app or its database can read: only the publish opens one.
- Generic client-credentials exchange, with no per-tool code.

**Non-Goals:**

- Live in seconds. A key waits for the next publish.
- Renewing sign-ins (OAuth with a person's consent), such as Gmail.
- Moving `.env` keys, which only the computer uses, off the private key link.

## Decisions

### Seal with the publish's public key: hybrid RSA-OAEP and AES-GCM

Setup makes one RSA-OAEP-256 key pair (3072-bit) per install, with `scripts/seal-keys.mjs pair`.

- **The public half** goes in the app's committed config as a plain var, `WONG_KEY_SEAL_PUBLIC` (SPKI, base64), and `GET /api/access/keys/seal` serves it.
- **The private half** goes only where publishing runs: a GitHub Actions secret, `WONG_KEY_SEAL_PRIVATE`, on the GitHub route, or the runner's secret on the Artifacts route. It never goes to the Worker or the computer's files.
- **A sealed key** is a fresh AES-256-GCM key that encrypts the value, wrapped with the public key, as `{v:1, wrapped, iv, data}`. RSA alone fits about 300 bytes, and a key file such as Google's is larger.
- **Sealing happens in the browser** for Access, through Web Crypto in `app/src/lib/seal.ts`, and on the computer for `take-key`, through Node's `crypto.webcrypto` with the same code shape. The Worker never sees a plain key.

*Alternative: the Worker sets its own secret* through Cloudflare's API with a Workers Scripts Edit token. Turned down: that token can rewrite any Worker in the account, and it would sit in the app. *Alternative: a master key in the app, values in D1.* Turned down: the person chose Cloudflare secrets, and the app could then read every key.

### A sealed-keys table and one owner/Admin route

- **The table.** A D1 migration adds `sealed_keys(name PRIMARY KEY, sealed TEXT, ends TEXT, sent_by TEXT, sent_at INTEGER)`.
- **The route.** `PUT /api/access/keys/<name>` takes `{sealed, ends}`, through `ownerCore`, so only the owner or an Admin. It is live only (`live_only` elsewhere, as `toolsRoute`), and the body is capped at 16 KB.
- **Which names.** `<name>` must be a secret a key in the code declares, or `TOOL_<ID>` / `TOOL_<ID>_ID` of a saved tool. It must never be `WONG_*`, `CLOUDFLARE_*`, or a binding.
- **Upsert, and nothing back.** A newer send replaces a waiting one. No route reads `sealed` back.
- **Status.** The status a key reports gains `waiting: {ends}`, so Access shows *Waiting for the next publish, ends in …abcd*.
- **Logging.** Each send is logged with its name and who sent it, never the value.

### The publish opens and puts waiting keys after deploy

`scripts/seal-keys.mjs put` runs on production deploys only, after the Deploy step. It:

1. Reads the rows with `wrangler d1 execute --remote --json`.
2. Opens each with `WONG_KEY_SEAL_PRIVATE`.
3. Puts the keys with one `wrangler secret bulk`, so there is one new version, not one per key.
4. Deletes only the rows it put, matched on `name` and `sent_at`, so a key sent during the run stays.

A row it can't open stays, named in the log without its value. On the GitHub route, `deploy.yml` gains a `workflow_dispatch` trigger, so *publish the waiting keys* runs a deploy of `main` with no code change. On the Artifacts route, the runner gets the same step and the same manual start. The assistant starts it only after the person says yes.

### take-key and the paste box share one path

`browser.mjs take-key` seals the key in-process with the public key from `/api/access/keys/seal`. It then sends it with `company-api.mjs` under the person's company login, and prints `TOOL_<ID> sent, ends in …abcd, goes live at the next publish`. It still writes the primary `app/.dev.vars` for local runs. `cf-secrets.mjs put-tool` stays for a computer that has a Cloudflare login, but connect no longer calls it.

### Connect has no Chrome backend

- **The Chrome backend goes:** the agent-browser `--auto-connect` code, `attach` without `--server`, `CHROME=none` and `SERVER=possible`. `attach` always means Camoufox, and `--server` stays as an accepted no-op for one release.
- **`where` answers `window`** on darwin and win32 (or Linux with a display), when `browse.mjs window` is on. It answers `server` on Linux without a display, when the live view can run. Otherwise it answers `link`, and then a tool's key is pasted in Access.
- **The sign-in turn in a window.** `hand-over.mjs open --watch` in window mode writes `view.watch = true`, so `watchControl` works. `sign-in` then prints `CONNECT_PAUSED=your-turn` with `HANDOVER_VIEW=window`. `wait` ends on the finish or on `close` after the person says *done*.
- **`watch`** in window mode prints `HANDOVER_VIEW=window` and opens nothing: the window is already in view.

### Client-credentials exchange in `forward`

`forward.exchange = { url }` turns it on. Then:

- **The secrets.** `TOOL_<ID>` holds the secret and `TOOL_<ID>_ID` the ID. A code key names both in its `secrets`.
- **The rules.** `key-rules.ts` refuses a `url` that is not HTTPS or not on `base`'s host, and refuses `exchange` with `mcp`.
- **The trade.** `forward.ts` posts `grant_type=client_credentials&client_id&client_secret` as a form, and reads `access_token` and `expires_in`. It caches the token in the isolate by key id until 60 seconds before it expires, and on a 401 it gets one new token and tries once more.
- **What goes back.** The token goes out as `header: prefix + token`. The answer passes the same echo check, extended to the token, ID and secret.
- **Shopify** is then `{ base: https://<store>.myshopify.com/admin/api/2026-10/, header: X-Shopify-Access-Token, prefix: "", exchange: { url: https://<store>.myshopify.com/admin/oauth/access_token } }`.

*Alternative: a Shopify-only handler.* Turned down: connections stay generic.

## UX

### Use-case brief

The owner, or an Admin, at a desk or on a phone, wants a service key in the app without asking the assistant: *put this Klaviyo key in*. Done means the row says it waits for the next publish, and later *Saved*. This is rare: the assistant makes most keys. The common case is a key the person already has, or a site that turns the assistant's browser away. The closest screen is today's Services view, with the same table and the same `Confirm` popup Access uses for every question.

### Flow

Services → *Paste key* (or *Replace key*) on the row → popup → paste → *Save key* → the row says *Waiting for the next publish, ends in …abcd*. An error keeps the popup open with the reason. A preview shows *Live app only* and no button.

### Hierarchy

The table stays the screen. Each row has one quiet outline button, and the popup's one primary action is *Save key*.

### Components

The `Table` rows, `Button variant="outline" size="sm"`, `Confirm` (AlertDialog), and `Input type="password" autoComplete="off"`.

### Review

[review.html](review.html), What Changes item 3, shows *Before* and two *After* states from the prototype. The prototype cuts the key's name short in a narrow first column; the build widens that column.

## Risks / Trade-offs

- [The private key leaks from the publish's secrets] → it opens only keys still waiting, which are deleted at each publish. Rotating it is `seal-keys.mjs pair` again.
- [A key waits days when nobody publishes] → the assistant offers a keys-only publish, and Access shows *waiting*.
- [`wrangler secret bulk` fails halfway] → rows are deleted only after it succeeds, so the next publish tries again.
- [An existing install has no key pair] → the release's **Updating.** step makes it. Until then, the route refuses with `no_seal`, and `take-key` falls back to `put-tool` where a Cloudflare login exists.
- [Shopify changes its token shape] → the exchange reads only `access_token` and `expires_in`, the standard fields.
- [A Mac person is away from the computer] → the sign-in turn waits up to its limit, then lists the tool for Access paste.

## Migration Plan

1. Ship the code. Make WongStack's own key pair: the public half in `app/wrangler.jsonc`, the private half as the GitHub secret `WONG_KEY_SEAL_PRIVATE`.
2. Installs get an **Updating.** step: run `node scripts/seal-keys.mjs pair`, which sets both halves.
3. Swap Shopify's old key for a read-only Dev Dashboard app (after the person's yes): save the tool with `exchange`, send `TOOL_SHOPIFY_ID` and `TOOL_SHOPIFY` sealed, publish the keys, and run the look-ups.
4. Rollback: revert the release. Waiting rows stay harmless in D1, and keys already put stay in secrets.
