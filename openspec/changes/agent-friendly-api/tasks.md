# Tasks

Implementation completion means source, tests, and docs are written and reviewed, not that tests have passed. Tests are authored in the group that changes their behavior and executed only in the final phase. No group saves or waits on checks.

## 1. Worker contract and discovery

- [x] 1.1 In `app/worker/api/contract.ts`, return input issues on `invalid_input` by design D1 (optional extras on `actionError`, bounded `{ path, message }` list, fixed messages for non-schema failures, credential guard). Completion: `code`, `message`, `requestId` and status are unchanged and no `JSON.parse` message is forwarded.
- [x] 1.2 In `contract.ts`, add `validateDescriptions` by design D3 and `confirmWith` by design D4 (type field, `validateMetadata` rule, registry rule in `uniqueActions`). Completion: each throw names the operation ID, and the field for D3.
- [x] 1.3 In `app/worker/api/discovery.ts`, add optional `issues` to `errorSchema`, and publish `confirmWith` and OpenAPI `x-confirm-with` only when the named read is visible to the caller. Completion: a caller without the read's app sees neither.
- [x] 1.4 Describe `name` in `app/worker/apps/hello/greeting.ts`. Completion: `defineAction` accepts it under D3.
- [x] 1.5 Author tests in `app/worker/api/contract.test.ts` and `app/worker/api/discovery.test.ts`, adding descriptions to existing fixtures. Completion: cases cover a named failing field for query and JSON input, a non-JSON body with no echoed text, issues capped at 10, an undescribed field rejected by name, `confirmWith` rejected on a read and on a missing or non-read target, and `confirmWith` shown and hidden by visibility in both the description and OpenAPI; not run yet.

## 2. Catalogue search

- [x] 2.1 Make `selectOperations` in `.agents/skills/memory/scripts/lib/operations.mjs` match every word by design D2. Completion: an empty filter, paging, `total` and `next` behave as before.
- [x] 2.2 Author cases in `scripts/tests/memory-operations.test.mjs` (or the file that already tests `selectOperations`) and one in `discovery.test.ts`. Completion: cases cover words out of order, mixed case, extra spaces, one unmatched word, and an empty filter; not run yet.

## 3. Helper

- [x] 3.1 In `scripts/employee-bootstrap.mjs`, carry `confirmWith` into a returned timeout error and into the thrown uncertain-outcome messages by design D4. Completion: no code path calls either action again.
- [x] 3.2 Set a failing exit status when a `call` result has an `error`, in `scripts/company-api.mjs`, `scripts/employee-bootstrap.mjs` and `.agents/skills/memory/scripts/operations.mjs`, by design D5. Completion: the result is still printed to stdout, and `client.call()` and `callMemory()` return values as before.
- [x] 3.3 Author cases in `scripts/tests/company-api.test.mjs`, `scripts/tests/employee-bootstrap.test.mjs` and `scripts/tests/memory-operations.test.mjs`. Completion: cases cover exit status 1 with the error on stdout for a company call and a memory call, exit status 0 on success, a timeout error that gains `confirmWith`, a dropped connection whose message names the read, and one invocation of the write in each; not run yet.

## 4. Docs and release

- [x] 4.1 Update `wiki/stack/company-api.md`: input descriptions and `confirmWith` under *Define an action once*, input issues beside the safe error, every-word search under *Discover only what the task needs*, and the failing exit status and confirming read under *Connect and call*. Completion: each fact appears once, in plain words, and the page stays under 3,000 words.
- [x] 4.2 Add `## Next (major) — Company actions an assistant can use without guessing` to `CHANGELOG.md` with an **Updating.** note in plain words: add a one-line description to each input of each action your assistants use, and a script that read a failed call as a success now sees a failure. Completion: `VERSION` is untouched.

## 5. Verification

- [ ] 5.1 Run `node .github/scripts/checks.mjs --worktree` once and repair what it finds. Completion: it passes, or its `not run` reason is reported; it is a pre-check and CI decides.
