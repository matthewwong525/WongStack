# Evidence: describe-services-in-spec

Read on 2026-10-18 from the preview `https://mcp-memory-services-wongstack-staging.matthewwong525.workers.dev`, commit `af2cbf1`, with the verification service token. No credential is kept here.

## `GET /api/actions?id=cloudflare.read`

`keys` is `[{ "id": "cloudflare", "name": "Cloudflare", "purpose": "Look up this account's Workers, databases, logs and usage", "docs": "https://developers.cloudflare.com/api/", "level": "read" }]`. Passed through the helper's `withKeyNotes` from this checkout, the key gains `"notes": { "path": "wiki/services/cloudflare.md", "exists": false }`.

## `GET /api/openapi.json`

- `info.description` is present: search with `?q=`, open one with `?id=`, `x-effect`, the shared error shape, check a timed-out change first, and what a tag means.
- `tags` is one entry: `Cloudflare`, with its purpose and `externalDocs` to `https://developers.cloudflare.com/api/` ("Cloudflare's API guide").
- `/api/cloudflare/read` `get` has `tags: ["Cloudflare"]` and the same `externalDocs`. `/apps/hello/api/greeting` and `/api/health` have no tag.

## A caller with no Cloudflare level

Not seen on the preview: the preview's verification token holds every key, so it sees the Cloudflare tag. The case is covered by `app/worker/api/discovery.test.ts`, where the same person with no level sees no Cloudflare tag, operation or guide.
