# Design

## Context

`push()` in `app/worker/employee-access/code.ts` answers every upstream failure with `codeUnavailable()`, a JSON 503. Git does not print a 503 body on a push, so the person sees only an error number. Three places swallow the cause: the default-branch look-up (`catch { return stop(codeUnavailable()); }`), `passed()` (the Artifacts token in `upstream()`, a `fetch` throw, a non-2xx answer), and reading the report (`.catch(() => null)`). The `GET info/refs?service=git-receive-pack` call, Git's first step of a push and where a bad key shows first, goes through `passed()` too.

## Goals / Non-Goals

**Goals:** a failed save carries a fixed-shape reason Git prints, and one secret-free log line.

**Non-Goals:** read calls (`git-upload-pack`), `/api/access/code/change` and publish keep `codeUnavailable()`.

## Decisions

- **A failure is a value, not `null`.** `passed()` returns `Response | Failed`, where `Failed = { step, status?, error? }` and `step` is `branch` (the published-branch look-up), `key` (Cloudflare's token), `send` (the Git call) or `report` (reading the answer). `upstream()` keeps its `null` contract for `publish.ts`; a private `reach()` throws, and `upstream()` wraps it.
- **The reason has three shapes.** A status → `<place> answered <n>`; `key` → `Cloudflare gave no key to save with`; `report`, a `SyntaxError` or a `ZodError` → `<place>'s answer could not be read`; anything else → `<place> could not be reached`. Place is `GitHub` or `Cloudflare` by the save source.
- **Git's words, by call.** A `POST git-receive-pack` with refs answers through `refused()`: every ref `ng` with the line, so Git prints it as *remote rejected*. The `GET info/refs` and the flush-only probe answer `text/plain` 503, which Git prints as `remote:` on the ref discovery call, as `NOT_SET_UP` already relies on.
- **One log line**, `console.log(JSON.stringify({ event: "code_save_failed", who, branch, step, status, error }))`, matching `direct_request` in `api/forward.ts`. `error` is `name: message` cut to 120 characters, or the name alone for a `SyntaxError`, which quotes the body. `who` comes from the router as the other code routes pass it.

## Risks / Trade-offs

- [The report can't be read after GitHub took the push] → the line says *could not finish*, not *nothing was saved*.
- [An error message might someday carry a secret] → only our own errors, `fetch`'s and zod's reach the log; tests assert the key, the `Authorization` value and the upstream body never appear.
