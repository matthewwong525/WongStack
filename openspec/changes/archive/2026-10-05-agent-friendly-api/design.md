# Design

## Context

See proposal.md for why. A company action is defined once with `defineAction` in `app/worker/api/contract.ts`; `app/worker/api/discovery.ts` generates `/api/actions` and `/api/openapi.json` from it; `scripts/company-api.mjs` and `scripts/employee-bootstrap.mjs` are the assistant's helper. The catalogue filter, `selectOperations`, lives in `.agents/skills/memory/scripts/lib/operations.mjs` and serves both the Worker and the helper. `wiki/stack/company-api.md` owns the pattern.

## Goals / Non-Goals

**Goals:** the five behaviors in the proposal, each in the file that already owns it, with the least new surface.

**Non-Goals:** a second error format, ranking or fuzzy search, nested-field rules, idempotency keys, any change to authorization or to the summary row's fields.

## Decisions

### D1. Input issues ride on the existing safe error

`execute` in `contract.ts` catches the input failure. A Zod failure becomes `error.issues`: up to 10 entries of `{ path, message }`, `path` the issue path joined with `.` (empty for the whole input), each string cut to 200 characters. A non-schema failure from `inputFor` (wrong content type, body that is not JSON, unexpected body, repeated query field, size limit) becomes one issue with an empty path and a fixed plain message; a `JSON.parse` message is never forwarded, since it quotes the body. When `containsCredential(issues, env)` is true the issues are dropped and the bare error returned. `code`, `message`, `requestId` and status 400 stay as they are, so a caller reading only those sees no change.

`actionError` gains an optional extras argument rather than a second error builder. `discovery.ts`'s `errorSchema` adds the optional `issues` array (it is `additionalProperties: false`), so the published schema stays truthful.

Alternative: put the detail in `message`. Declined: a caller would parse prose, and `message` is a fixed safe string today.

### D2. Search is every-word substring match

`selectOperations` splits `q` on whitespace, lowercases, and keeps an operation when every word is a substring of `operationId summary description`. An empty `q` matches all, as now. Order and paging stay as they are, so `total` and `next` stay stable. The 200-character bound stays. `operations.d.mts` needs no change.

Alternative: any-word match ranked by hits. Declined: one-letter and common words match everything, so `total` would lose meaning and paging would need a ranking contract.

### D3. Undescribed top-level input fields fail `defineAction`

After `validateEncoding`, a new `validateDescriptions` reads `schemas(action).inputSchema.properties` and throws `Undescribed input field: <operationId>.<field>` when a property has no non-empty string `description`. Zod's `.describe()` supplies it. `hello.greeting` gains a description on `name`; `main.health` has no fields. Test fixtures that define actions gain descriptions.

It throws where unsupported schemas and invalid examples already throw, at module load, so the test suite and the build's own import catch it before publication.

### D4. `confirmWith` is an optional operation ID

`Action` gains `confirmWith?: string`. `validateMetadata` rejects it on a `read` action and when it does not match the operation ID pattern. `uniqueActions`, which already sees the whole registry, rejects a `confirmWith` naming an ID that is absent or whose effect is not `read`: `Invalid confirming action: <operationId>`.

`discovery.ts` publishes `confirmWith` on the selected description and as `x-confirm-with` in OpenAPI only when the named action is among the caller's visible operations. The Worker's timeout error body is unchanged: `dispatch` does not know the caller's view of another action.

The helper already fetches the live description before each call. In `employee-bootstrap.mjs`'s `call`: a returned `error.code === "timeout"` gains `confirmWith` from that description, and the thrown "did not complete" messages for a business call append `Check with <id> before repeating.` Nothing is called again.

### D5. A returned error sets a failing exit status

The three `call` entry points, in `scripts/company-api.mjs`, `scripts/employee-bootstrap.mjs` and `.agents/skills/memory/scripts/operations.mjs`, keep printing the result to stdout and set `process.exitCode = 1` when it has an `error` object. `client.call()` and `callMemory()` keep returning the error value, so code importing them is unaffected.

## Risks / Trade-offs

- [An install's existing described action has undescribed inputs] → its checks fail on update, naming the action and field; the changelog's Updating note turns into a to-do in its sync plan. `major` release.
- [A Zod message could echo something sensitive] → messages describe the caller's own input and the published schema; the credential guard drops issues that match a binding.
- [`key-levels-in-access`, unpublished, edits `contract.ts` and `discovery.ts`] → different lines of intent; whichever publishes second brings `main` in and keeps both.

## Migration Plan

None beyond the Updating note: add a one-line description to each input of each described action.
