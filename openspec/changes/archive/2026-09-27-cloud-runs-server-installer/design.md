# Design

## Context

wongstack-cloud's `vm/agent.mjs` (branch `test-end-to-end-workflow`, PR #17) imports four names from the installer beside it: `CLOUDFLARE_CALL`, `jobFolder`, `repoFolder`, and `run`. It runs the installer as `wong` with `runuser … node <installer>`, passes `{ input, timeout }`, and on a non-zero exit reads only `error.stdout`: the last line is the reason, and the line before it becomes `detail` when `CLOUDFLARE_CALL.test(line)`.

Upstream `server/install-wongstack.mjs` already exports `run` (re-exported from `provision.mjs`), `jobFolder`, and `repoFolder`. Its `run` takes `input`, `timeout`, and `env`, and rejects with `{ stdout, stderr }` on the error, so the host's use works unchanged. It lacks `CLOUDFLARE_CALL`, prints only the reason word, and `provision.mjs`'s `widen` retries the post-widen probe on `403` alone.

## Goals / Non-Goals

**Goals:**

- The installer is a drop-in for wongstack-cloud's copy: same imports, same stdout shape.
- The post-widen probe waits out `401` as well as `403`, for setup and the installer alike.

**Non-Goals:**

- Changing wongstack-cloud; its own change moves the agent's import and `INSTALLER` path to the clone.
- Retrying later calls (`names`, `provision`) on `401`.

## Decisions

- **`pending` replaces `forbidden` in `provision.mjs`:** `error instanceof CloudflareError && (error.status === 401 || error.status === 403)`. It guards only the probe in `widen`, as now. `/user/tokens/verify` runs before it inside `step('token')`, so a bad token still stops at once with `token`.
- **`CLOUDFLARE_CALL` lives in the installer**, since it is the installer's stdout contract, copied verbatim from wongstack-cloud: `/^Cloudflare (GET|POST|PUT|PATCH|DELETE) \/[A-Za-z0-9/._:-]{1,200}: HTTP \d{3}( \d+(,\d+)*)?$/`.
- **`main` tests the stop's message, not its cause.** `step()` in both files wraps a `CloudflareError` into a `ProvisionError` with the same message, so `if (CLOUDFLARE_CALL.test(error.message)) out(error.message)` before `out(reason)` needs no new field. The pattern is the safety net: a `run` failure starts with the command name, a hand-written `ProvisionError` has no method, and `CloudflareError` already drops the query. Alternative: carry `cause` on `ProvisionError`; more code for the same line.
- **The fake gets a status knob.** `forbiddenPolls` becomes `refusedPolls` plus `refusedStatus` (default `403`), so one test covers `401` and the existing ones keep `403`.

## Risks / Trade-offs

- [A `401` that is not propagation now waits about a minute before failing] → only after `verify` and the widen succeeded, where a real `401` is rare; the reason word stays `cloudflare`.
- [Other calls may lag after the probe passes] → out of scope; wongstack-cloud's installer ran the same way on its end-to-end test.
