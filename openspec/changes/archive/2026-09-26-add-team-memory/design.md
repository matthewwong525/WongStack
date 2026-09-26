## Context

See proposal.md for why. Today `lib/store.mjs` sends every store call to the Cloudflare REST API: a D1 batch to `/accounts/<id>/d1/database/<id>/query`, and object PUT and GET to `/accounts/<id>/r2/buckets/<bucket>/objects/<key>`. The token is `CLOUDFLARE_MEMORY_TOKEN`, and `WONG_MEMORY_API` already replaces the base URL for tests. Transcripts upload to `sessions/<agent>/<session-id>.jsonl`. Setup mints the memory token with the user token, which provisioning has widened to include `Workers Scripts Write` and `D1 Write`.

Constraints found during exploration (proposal Decision log):
- **Tokens can't isolate memory.** D1 permissions cannot be scoped below the account. Bucket-scoped R2 tokens work only over the S3 API.
- **Worker limits:** 100 per account on free and 500 on paid. Each has 64 or 128 variables, secrets included.
- **D1 limits:** 10 databases per account on free.

## Goals / Non-Goals

**Goals:**
- A memory credential reaches only its own repo's memory database and bucket.
- One code path in the store client. A key only changes the base URL.
- One extra Worker and one extra D1 database per account, whatever the number of repos.

**Non-Goals:**
- No SQL allow-list in the Worker. Members are trusted, and `memory.mjs` sends free SQL today.
- No web login or OAuth for members.
- No fix for the CI deploy token's account-wide reach (see Risks).

## Decisions

### 1. The Worker copies the two REST endpoints the client already calls

`wong-memory` answers:
- `POST …/d1/database/<database id>/query`, by running the batch on that database's binding.
- `PUT` and `GET …/r2/buckets/<bucket>/objects/<key>`, on that bucket's binding.

**Routing:** the ids in the path pick the binding. Binding names come from the ids: `DB_<database id without hyphens>` and `R2_<bucket, hyphens to underscores>`. The response shapes match Cloudflare's: `{ success, result: [{ results }], errors }`, and the raw object body.

- **Why:** `store.mjs` keeps its requests, and the fake store in `scripts/tests/fixtures/memory/harness.mjs` keeps working, so there is no new API to design or version.
- **Rejected: a purpose-built API.** Every new memory feature would need a Worker change.
- **Rejected: memory routes in the app Worker.** CI and every preview would get the bindings, and `/wong-sync` cannot update `app/`.
- **Rejected: one Worker per repo.** It spends one of 100 or 500 Workers per repo.

### 2. Keys live in a Worker-only database

`wong-memory-keys` has one table:

```
keys(hash TEXT PRIMARY KEY, email TEXT, role TEXT CHECK (role IN ('admin','member')),
     database_id TEXT, bucket TEXT, created_at TEXT)
```

A key is `wongm_<base64url(email)>.<32 random bytes, base64url>`. The Worker hashes the bearer key with SHA-256 and looks up one row. The row's `database_id` and `bucket` must match the request path, or the answer is 403. A missing row gets 401.

- **The client knows its own email offline.** It reads the email from the key to build its upload prefix, so a git email that differs from the registered one cannot break uploads.
- **Unreachable by key holders:** no path routes to the keys binding, so no key's SQL can add or read keys. The admin manages rows through the REST API with `CLOUDFLARE_API_TOKEN`.
- **Rejected: one Worker secret per member.** The 64 or 128 variable limit is shared by every repo on the Worker.
- **Rejected: a key per person across repos.** Setup in a new repo cannot reuse a key it only has the hash of, so one key opens one repo.

### 3. Transcript keys start with the author's email

New uploads go to `sessions/<email>/<agent>/<session-id>.jsonl`. The email comes from the key. A `member` key's PUT or GET must start with `sessions/<its email>/`. Anything else gets a 403 with the error code `not_author`. An `admin` key reads and writes any object in its bucket. The client turns `not_author` into "only the author and the admin can read this transcript", not into the generic token error. Old keys stay in `raw_key`, so only admins read them.

### 4. The store client sends every call to the Worker

`store.mjs` builds its base URL:
1. `WONG_MEMORY_API` when set, for tests.
2. `components.memory.worker` when recorded.
3. Otherwise the Cloudflare API, for a store that isn't moved yet.

The request paths are the same in all three. `--home` reads home's config and home's `.env`, so it reaches home's Worker with home's key.

### 5. Commands deploy and manage through the REST API

All of them use `CLOUDFLARE_API_TOKEN`:

- **`worker deploy`:**
  1. Create `wong-memory-keys` if it is missing, and apply its migration.
  2. Read the Worker's current bindings with `GET …/workers/scripts/wong-memory/settings`, and add this repo's database and bucket.
  3. Upload the module from `.agents/skills/memory/worker/memory-worker.mjs` as multipart, with `main_module`, a fixed `compatibility_date`, and the merged bindings.
  4. Turn on the `workers.dev` route, and record `https://wong-memory.<account subdomain>.workers.dev` as `components.memory.worker`.

  **Why read and merge:** it keeps the bindings of repos set up by older WongStack versions. Check during apply whether `keep_bindings` can replace the read.
- **`member add <email> [--admin]`:** insert a row with the key's hash, and print the key once, with the line to paste into `.env`. The first `member` role sets `components.memory.team: true`.
- **`member remove`:** delete this repo's row for that email.
- **`member list`:** select this repo's emails and roles.
- **Missing permission:** a 403 from Cloudflare stops the command and names the permission, so the admin can widen the token by [the widen protocol](../../../.agents/skills/wong-setup/references/permission-groups.md).

This is code, not model steps: it runs in setup, in sync, and once per teammate, and it has to be exact.

### 6. Setup and sync call the same commands

- **Provisioning (step 4b of `.agents/skills/wong-setup/references/cloudflare.md`):**
  1. Create the database and bucket as today.
  2. Run `worker deploy`.
  3. Run `migrate`. With a Worker recorded, it goes straight to Cloudflare with `CLOUDFLARE_API_TOKEN`, because a D1 binding runs one statement at a time and a migration file holds many.
  4. Run `member add <git email> --admin --env`. It writes the key to `.env` and never prints it.
- **`/wong-sync` move:** run the same two commands. Check a digest query through the Worker, then write the key. Only after the check passes, delete the old `<repo>-memory` token, found by name. A failure leaves the old token and `.env` alone.

### 7. The personal-fact filter turns on with the first member

When `components.memory.team` is `true`:

- **Emails:** the person's emails are every email on the `wiki/people/` page that lists their git email, or their git email alone.
- **Digest and search:** both add `AND (f.type NOT IN ('user','feedback') OR lower(f.author) IN (…))`.
- **`--everyone`** removes the filter.
- **Unfiltered:** the write gate, consolidation, and `show <slug>` keep reading every author, so a duplicate a teammate already wrote is still caught.

## Risks / Trade-offs

- **A member can forge the author or delete rows** → accepted for trusted teammates. D1's 30-day restore recovers deleted rows. Recorded in `wiki/development/memory.md`.
- **The CI deploy token keeps account-wide `Workers Scripts Write` and `D1 Write`,** so a leaked CI token could replace the memory Worker or read a memory database. This is true today too. Recorded in `SECURITY.md`, not fixed here.
- **The Worker URL is public** → every request needs a key, and an unknown key gets 401 before any store binding is touched.
- **One Worker serves repos on different WongStack versions** → the endpoints copy Cloudflare's, so they stay stable. A deploy always carries the newest module, and it keeps every binding.
- **A binding-count limit per Worker is not documented** → check during apply. The fallback is one Worker per 100 repos, recorded per repo.
- **Free plan:** the keys database takes one of the 10 D1 databases, and the Worker shares the account's 100,000 requests a day with the app. A session makes a few dozen memory calls.
- **Cross-repo memory reads a store in another account,** for example home from a team repo → it uses that repo's own config and key, so it reaches the other account's Worker.

## Migration Plan

Nothing moves in R2 or D1.
- **A new install:** setup deploys or attaches the Worker.
- **An existing install:** `/wong-sync` moves it (decision 6). Until then, the new client still reaches the store directly with the old token.
- **Rollback:** restore a Cloudflare memory token in `.env`, and remove `components.memory.worker`. The client then goes direct again.
