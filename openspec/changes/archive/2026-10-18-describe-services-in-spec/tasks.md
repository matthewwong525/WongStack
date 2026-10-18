# Tasks

## 1. Worker

- [x] 1.1 `app/worker/api/discovery.ts` (design §1–§3): each described action's `keys` gains `name`, `purpose` and `docs`; OpenAPI gains `info.description`, top-level and per-operation `tags`, and `externalDocs` on a key's own direct-use operations. Summaries keep their `keys` shape.
- [x] 1.2 `app/worker/api/discovery.test.ts`: a direct-use key's action shows its purpose and guide in `?id=` and OpenAPI; a built action using a key gets the tag and no `externalDocs`; a key with no guide gets a tag with no link; a caller with no level for a key sees no tag for it; `info.description` is present; summaries are unchanged; no key value appears.

## 2. Helper

- [x] 2.1 `scripts/company-api.mjs describe` (design §4): add `notes: { path, exists }` to each key, sharing `withNotes`'s lookup.
- [x] 2.2 `scripts/tests/company-api.test.mjs`: notes path with and without a page, in the short and `--json` output; a memory operation is unchanged.

## 3. Docs and release

- [x] 3.1 `wiki/stack/service-catalogue.md` (design §5). Fix links with `memory.mjs areas`.
- [x] 3.2 `CHANGELOG.md`: `## Next (minor) — The API spec names each service and its guide`, with an **Updating.** note in plain words: nothing to do.

## 4. Verify

- [x] 4.1 Bring in `main`, then run `node .github/scripts/checks.mjs --worktree` and fix what fails.
- [x] 4.2 `/save`, then on the preview: `describe cloudflare.read` shows Cloudflare's purpose, guide link and notes path; `openapi.json` has a Cloudflare tag with its guide and the opening description. The no-level case stays with `discovery.test.ts`: the preview's verification token holds every key. Record results in `evidence.md`.
