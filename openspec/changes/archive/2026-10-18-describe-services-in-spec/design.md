# Design

## Context

See `proposal.md` for why. What shapes the build:

- **One object feeds all three outputs.** `describe()` in `app/worker/api/discovery.ts` builds each visible operation once; `GET /api/actions?id=` returns it, `openApi()` maps it into OpenAPI 3.1.1, and the summaries come from it through `selectOperations`. Only operations the caller may see reach it.
- **Keys appear only as ids.** `describe()` sets `keys: listedKeys(access).map(id => ({ id, level }))`. The registry already holds what's missing: `described(id)` in `employee-access/key-levels.ts` returns `{ purpose, docs? }`, `keyTitle(id)` the name, and `forwards(id)` whether the key is set up for direct use. `keys.test.ts` already makes `docs` required, HTTPS, for every direct-use key.
- **Direct-use descriptions name only the address.** `forward.ts` writes "Send one request to Stripe's API at https://api.stripe.com…", with no guide link.
- **OpenAPI has no `info.description`, `tags` or `externalDocs`.** Its `info` is `{ title: "Company actions", version }`.
- **The app can't see the checkout.** Notes pages (`wiki/services/<id>.md`) are added by the helper's `withNotes` for `services` only.

## Goals / Non-Goals

**Goals:**

- A chat that opens one action learns each key's purpose, guide and notes page, with no second lookup.
- A tool reading `openapi.json` sees each service once, with its purpose and guide.
- The document says how to use it, in a few lines at its top.

**Non-Goals:**

- MCP, and commands on this computer in any list.
- Groups by app, a changed services list, or any visibility change.

## Decisions

### 1. Keys carry their name, purpose and guide

`describe()` builds each key entry as `{ id, name, purpose, docs?, level }`, from `keyTitle` and `described`. Every caller-visible field comes from the registry, so `containsCredential` still guards the answer. Summaries (`/api/actions` without `id`) keep their current `keys` shape, to stay short.

### 2. OpenAPI tags and guide links

- **Top-level `tags`**: one per key named by any visible operation, sorted by name: `{ name: <key title>, description: <purpose>, externalDocs?: { url: docs, description: "<title>'s API guide" } }`. Only keys of operations the caller can see appear, so a key's group never shows to someone who can't use it.
- **Per-operation `tags`**: the titles of the keys it lists. An operation with no key has none.
- **`externalDocs` on an operation**: only on a key's own `<key>.read` / `<key>.change`, where the guide is the reference for the whole request. A built action's guide stays on its tag, since its handler is the contract.

### 3. `info.description`

A fixed few lines, under 600 characters, in plain words: search `GET /api/actions?q=`, open one with `?id=` before calling it; `x-effect` says whether it reads or changes; every error has `{ error: { code, message, requestId } }`; a `timeout` leaves a change's outcome unknown, so check it first, with `x-confirm-with` when named. It is part of the revision, so editing it changes ETags, as any contract edit does.

Alternative considered: linking the install's wiki from `info.externalDocs`. Rejected: an install's wiki has no address the app knows, and a private repo's link would open for nobody outside it.

### 4. The helper adds notes on `describe`

`company-api.mjs describe <id>` passes each key entry through the same notes lookup `withNotes` uses, adding `notes: { path, exists }`. `--json` includes it too. Memory operations have no keys and are unchanged.

### 5. Docs

`wiki/stack/service-catalogue.md#discover-only-what-the-task-needs`: an opened action names each key's purpose, guide and notes page; the OpenAPI groups by key and opens with how to use it. `CHANGELOG.md`: a minor entry. **Updating:** nothing to do; a key with no guide link shows none.

## Risks / Trade-offs

- **The document grows a little** → one tag per key and a short description; the 1 MB cap is unchanged.
- **Every ETag changes once on deploy** → clients refetch once; no client caches the document across deploys today.
