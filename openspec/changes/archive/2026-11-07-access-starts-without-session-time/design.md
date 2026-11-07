# Design

## Context

See proposal.md, Why. `review()` in `app/worker/employee-access/login-management.ts` parses the recorded policy with `policySchema`, which requires `session_duration: z.string()`. Cloudflare's app-scoped policy list can leave the field out (seen 2026-11-07: keys `created_at, decision, exclude, id, include, name, precedence, require, reusable, uid, updated_at`). The parse throws, `admittedEmails` throws, and `startPermissions` (`start.ts`) swallows it in `catch { return; }`. The same parse guards `previewsDrifted` and every `reconcileLogin` write, so list writes fail too.

## Goals / Non-Goals

**Goals:** a policy with no `session_duration` reads, imports, and writes; a failed start leaves one log line and a reason on the People screen.

**Non-Goals:** no database change; no change to how `reconcileLogin` records its own failures (it already stores `error_code`).

## Decisions

- **`session_duration: z.string().optional()`.** The write body copies the live policy minus `readOnly` fields, so an absent key stays absent: `Object.entries` never sees it, and Cloudflare keeps its own default. Never send `null` or an empty string. The read-back `controls()` compare holds, since both sides lack the key. Alternative: drop the field from the schema and rely on `.passthrough()`; rejected, because the type should still say a present value is a string.
- **`startPermissions` returns `string | null`.** `null` when started or nothing to do; else the reason: the `AccessError` code; `login_policy_unreadable` for a `ZodError` (a schema mismatch); `provider_unavailable` for any other throw, such as the provider's 30-second timeout or a failed connection. The missing key stays as today (no reason, since `key: "missing"` already shows its own step). It logs `console.log(JSON.stringify({ event: "permissions_start_failed", error }))`, the shape of `code_save_failed` in `code.ts`.
- **The status read carries it.** `management.ts` GET replies `{ ...await accessStatus(core), startError }`; `tools-route.ts` ignores the value (the log line still lands). Alternative: store the reason in `wong_access_installation`; rejected, because the start reruns at each open, so the newest open's reason is always the current one, with no migration.
- **The notice maps the code to plain words.** In `Notices.tsx`, the existing `status.key === 'ready' && !status.started` notice adds one `Why:` line when `startError` is set: `login_policy_review_required` → the sign-in list has a rule this app does not manage, so a person must check it; `login_resource_mismatch` → the sign-in app does not match this app; `provider_unavailable` / `provider_not_found` → Cloudflare did not answer; anything else → Cloudflare's answer was not in a shape this app reads. Each line ends with the code in small text, so the owner can hand it to their assistant.

## Risks / Trade-offs

- [A future Cloudflare answer drops another field] → the log line and the notice now name it as `login_policy_unreadable`, instead of silence.
- [The log line repeats on every open while the read fails] → one line per owner open is low volume, and the repeat shows the failure is still live.
