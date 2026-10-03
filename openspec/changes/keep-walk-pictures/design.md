# Design

## Context

See `proposal.md` for why. The facts that shape the approach:

- `verify-staging.sh publish` uploads a run's PNGs with `wrangler r2 object put` to `WALK_MEDIA_BUCKET` and prints `<local-path>\t<public-url>` lines. With no bucket it prints `RESULT: NONE`, the comment cites local paths, and `cleanup` then deletes them. No install sets the variables unless a person makes a public bucket by hand.
- The memory store keeps redacted transcripts in a private R2 bucket. The production Worker binds it as `MEMORY_BUCKET`; staging and previews bind no memory. `app/worker/index.ts` hands `/_memory/*` to the memory skill's route module, which authenticates with a memory key and lets a member touch only `sessions/<own email>/`.
- Every other request to the Worker passes `getAccessIdentity` first. It yields `kind: "user"` for a person and `kind: "service"` for the Access service token, which the walk already holds as `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` to get into a preview. One Access application covers the production and staging Workers, so that token is accepted on production too.
- The production address is the origin of `loadConfig(ctx).worker` in the memory skill's `store.mjs`. PR #242 changes where the install record holds it but keeps that field.
- A site can be open (`WORKSPACE_LOGIN=off`, no Access ids) while R2 is on.
- PR #244's follow-up scrubs every text file in the run folder at the end of `run` and at the start of `publish`, before the bucket check. PR #242 replaces `store.putObject` with a machine-grant transcript protocol.

## Goals / Non-Goals

**Goals:**

- Kept pictures with no new setting, bucket, binding, or setup step.
- A link a browser can open with the app's login.
- No call into the memory store's API, so PR #242's rewrite and this change stay apart.
- The route cannot reach a transcript.

**Non-Goals:**

- A second bucket or binding. A page that lists past walks. Expiry. A change to `mayTouch`, memory keys, or the memory schema. The hosted route's evidence.

## Decisions

### The route lives in the verify skill and is served behind the login

A new module, `.agents/skills/verify/worker/walk-pictures.mjs` with a `.d.mts`, exports `WALK_PREFIX = "/_walk/"` and `handleWalkPictures(request, bucket, identity)`. `app/worker/index.ts` gains one import and one branch, placed after the identity check and before the mini-app branch:

```ts
if (url.pathname.startsWith(WALK_PREFIX)) {
  return handleWalkPictures(request, env.MEMORY_BUCKET, identity);
}
```

The module sits in the skill, as the memory route does, so `/wong-sync` keeps it current and an installed app carries only the import and the branch. It receives the bucket, never `env`, and no memory database.

*Alternatives.* Extending the memory route's `object` and `mayTouch` with a `walks/` prefix: a browser has no memory key, so a second login-gated route would still be needed, and it lands in the middle of PR #242's rewrite. A handler under `/api/`: that router is the install's own file and gets no identity. A separate bucket: every install would have to run provisioning again, and `provision.mjs` is also being rewritten.

### What the route accepts

- **Path.** `/_walk/<sha>/<run>/<journey>/<file>.png`, matched whole by one pattern: `<sha>` 7 to 40 hex, `<run>` a UTC stamp `YYYYMMDDTHHMMSSZ`, `<journey>` and `<file>` `[a-z0-9][a-z0-9._-]*`. The object key is `walks/` plus the four matched parts. The route never decodes or joins a caller's raw path, so no request maps outside `walks/`. Anything else is `404`.
- **No identity** (an open site, or `identity` is null): `404` with `{ "error": "no_login" }` on a PUT, a plain `404` on a GET. The entry file's own check already answers `401` on a private site; this covers the open one.
- **No bucket:** `404` with `{ "error": "no_bucket" }`.
- **GET**, any identity: the object with `Content-Type: image/png`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, `Cache-Control: private, max-age=31536000, immutable`. Missing: `404`.
- **PUT**, `identity.kind === "service"` only, else `403`: body up to 10 MB (`413` over), must begin with the PNG signature (`415` otherwise), stored with `onlyIf: { etagDoesNotMatch: "*" }` so an existing key answers `409` and is left as it was. Success: `201` with `{ "kept": true }`.
- Any other method: `405`.

Uploaded bytes are served from the app's origin, so the signature check, the fixed content type, `nosniff`, and the empty content policy together stop a stored file acting as a page.

### `publish` picks one of three outcomes

In this order (PR #244's scrub, when it lands, runs above all three):

1. **`WALK_MEDIA_BUCKET` set:** today's path, unchanged, including `UNKNOWN` when `WALK_MEDIA_BASE_URL` is missing. It adds `MEDIA=public`.
2. **Else, private:** resolve the production origin with a `node` one-liner on the memory skill's `loadConfig`, as `load_credentials` already borrows `parseEnv`. Call `load_credentials`, then PUT each PNG under `$RUN_DIR/evidence` with `curl --data-binary` and the two Access headers to `<origin>/_walk/<short-sha>/<run-stamp>/<journey>/<file>`. Print `<local-path>\t<url>` per kept file, then `RESULT: WALKED` and `MEDIA=private`.
3. **Nothing kept:** `RESULT: NONE`, `MEDIA=none`, and one `REASON=` line the comment repeats:

| What `publish` saw | `REASON=` |
| --- | --- |
| no origin recorded, or `loadConfig` throws | `no memory store is set up for this repo` |
| no `CF_ACCESS_CLIENT_ID` or secret | `this machine has no access token for the site` |
| `404` `no_bucket` | `the Cloudflare account has no storage (it needs a payment method)` |
| `404` `no_login` | `the site has no login yet, so pictures would be open to anyone` |
| any other `404` on the first PUT | `the live site does not serve pictures yet (it does after the next publish)` |
| `401` or `403` | `the live site refused the access token` |

The first PUT decides: a failing one stops the loop with its reason. A later failure costs that picture only, counted in a note as today. The run stamp is taken once per `publish`, so a repeat walk of the same commit gets its own folder and never meets a `409`. No evidence directory or no PNG is `RESULT: NONE`, `MEDIA=none`, with no reason: there was nothing to keep.

The script never prints the service token, and the URL carries none.

### The comment and the chat

`walkthrough.md` section f's publish block becomes three bullets keyed on `MEDIA`:

- `public`: substitute the URLs into `![…](…)`, as today.
- `private`: replace each journey's picture lines with one line, `Pictures (log in to open): [landing](…) · [empty form](…) · [after submitting empty](…)`, labels from the file names.
- `none` with a `REASON`: one line under the comment's summary, `Pictures were not kept: <reason>.`, the same line in the chat report, and no picture lines. Never a local path.

The comment template's two `![…](<url-or-path>)` lines change to match. Section d, the summary line, the `◐` block, and the scrub lines belong to PR #244 and are not edited here.

### A past walk's pictures

A new `pictures <pr>` subcommand: reads the pull request's comments with `gh pr view <pr> --json comments`, keeps the `/_walk/` links whose origin equals the recorded production origin, downloads each with the Access headers into a fresh `mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX"` under `evidence/`, and prints `RUN_DIR=` and `<local-path>\t<label>` lines. `RESULT: WALKED` with files, `NONE` when the comments hold no kept picture, `UNKNOWN` when the download is refused. The origin check stops a crafted comment sending the token to another host.

`/verify` shows them with the image tool, as [show what the browser is doing](../../../wiki/development/browsing.md#show-what-the-browser-is-doing) says, then runs `cleanup`. `SKILL.md`'s plain-checks paragraph gains one sentence naming the subcommand, paid for by a cut of equal size, because `measure-context.mjs --check` holds the skills' word count at its baseline.

### Docs own the exception

`wiki/development/memory-key.md` and `wiki/stack/mini-apps.md` say every other route stays away from the memory bindings. Both get the exception in one clause: the picture route is handed the bucket alone and reaches only `walks/`. `wiki/development/staging-walkthrough.md` owns the full account under "What a walk needs", replacing the public-bucket bullet; `wiki/development/memory.md`'s "Without R2" and setup's card list add that a check's pictures are not kept either.

## Risks / Trade-offs

- **The picture route shares the transcripts' bucket** → it is passed only the bucket, builds keys from a whole-path match, and a test asks for `sessions/…` through it in plain, encoded, and `..` forms and gets `404`.
- **A leaked service token can add pictures** → it can add only PNGs up to 10 MB under `walks/`, replace none, and read no transcript. The token already opens every page of the app.
- **The first walk after this ships keeps nothing**, because production serves the route only after the merge → the report says so with the "does not serve pictures yet" reason. This change's own `/ship` walk will show it.
- **An install takes the update but its `index.ts` lacks the branch** → `/_walk/` falls through to the page shell, which is not JSON, so `publish` reads it as "does not serve pictures yet". The changelog's Updating note names the two lines.
- **Storage grows without end** → about 2 MB a walk against a 10 GB free allowance. Expiry is left out until it matters.
- **PR #244 and PR #242 touch the same files** → see the migration plan.

## Migration Plan

1. PR #244's follow-up: its owner agreed on 2026-10-03 to publish first, then the person chose to build this change without waiting. Whichever publishes second brings `main` in. This change keeps to the `publish` case below its opening lines, the `pictures` case, and section f's publish block, result bullets, and picture lines; PR #244's scrub goes at the top of `publish`, above the upload. If `main` changes "Evidence is posted on every verdict" first, copy the new text into this change's MODIFIED block and reapply the screenshot sentences.
2. PR #242: no agreed order. This change imports nothing from the memory Worker and edits two wiki sentences and one entry-file branch that PR #242 also touches. Whichever publishes second brings `main` in and keeps both branches in `app/worker/index.ts`; the `/_walk/` branch stays after the identity check.
3. Rollback is a revert: kept objects stay in the bucket, unreachable, and `publish` reports "does not serve pictures yet".

Installed repos take it through `/wong-sync`: the skill files update, the sync plan adds the import and branch to `app/worker/index.ts`, and pictures are kept after their next production publish.
