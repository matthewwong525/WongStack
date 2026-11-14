# Design

## Context

See [proposal.md](proposal.md) for why. What exists today:

- **One structured log line.** `record()` in `app/worker/api/forward.ts` logs `direct_request` after a direct request is sent. Refusals (`refuse()` there, in `api/cloudflare.ts`, in the router and in `access.ts`) log nothing.
- **Workers Logs** are on for `app/wrangler.jsonc` and `site/wrangler.site.jsonc`, off for `app/wrangler.line.jsonc`. Cloudflare keeps them a few days (by plan), and reads them only through `POST accounts/<id>/workers/observability/telemetry/query`.
- **`WONG_CLOUDFLARE_READ`**, the live app's read-only key, covers Access audit logs and account settings but not Workers Observability ([permission groups](../../../.agents/skills/wong-setup/references/permission-groups.md#the-read-only-look-up-key)). `cloudflare.read` is GET-only by promise ([key-access](../../specs/key-access/spec.md)).
- **`wong_access_audit`** in D1 records permission events; nothing outside `members.ts` reads it.
- **The computer's helper log**, `~/.wong-stack/helper/log.jsonl`, rolls at 1 MB ([`helper-log.mjs`](../../../.agents/skills/hand-over/scripts/lib/helper-log.mjs)).
- **The app's cron** runs `*/15 * * * *` → `refreshOnSchedule` in `app/worker/index.ts`. Staging inherits crons ([staging bindings](../../../wiki/stack/staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them)).
- **Schedules** are per-install `schedules/<name>.json` records on the app's clock ([host schedules](../../../wiki/stack/host-schedules.md)); the inbox takes `question` items with options ([`store.ts`](../../../app/worker/apps/inbox/store.ts)).
- **Overlap:** [one-line-worker](../one-line-worker/proposal.md), in another workspace, edits `app/wrangler.line.jsonc` and the line template. This change adds one `observability` key to each; whichever publishes second merges it.

## Goals / Non-Goals

**Goals:** records a person can trust a year later; a summary built where a compromised computer can't touch it; a watch whose rules are code and whose judgment is the assistant's.

**Non-Goals:** real-time alerting (Cloudflare notifications or a tail Worker); exporting logs to a third party (Logpush); a summaries screen; any automatic response.

## Decisions

### 1. One refusal record shape, logged at the boundary

`app/worker/security/record.ts` exports `refused({ caller?, route, code, status })`, which `console.log`s `{ event: "refused", ... }`. Route is the matched action id or path template, never the raw URL with its query. It is called from:

- the company API router, when an action returns a 4xx with an `error.code`, which covers `forward.ts` and `cloudflare.ts` refusals without editing each;
- `access.ts`, when a signed request fails the identity check (no email: `caller` is absent; the reason code names which check failed);
- `line-worker.ts`, when a join is refused.

`direct_request` stays as it is. *Alternative:* a D1 row per refusal. Rejected: a flood of refusals becomes a flood of writes, and Workers Logs already holds them for the day the summary needs.

### 2. The live app builds the day, on its own cron

`scheduled` gains `buildSecurityDays(env)`, run at every tick but cheap: it returns at once unless yesterday (UTC) has no row. It writes at most one day per tick, oldest missing first, back to 7 days. It runs in every environment. Where `WONG_CLOUDFLARE_READ` is absent, as on staging, the Cloudflare sources report `unavailable: no_key` and the day is written from D1 alone. That lets [the staging walkthrough](../../../wiki/development/staging-walkthrough.md) check the builder without the live app's records.

Sources, each in `app/worker/security/sources/`, each returning `{ ok: true, data } | { ok: false, reason }`:

| Source | Read with | Kept |
|-|-|-|
| App and line Worker logs | telemetry query (POST), filtered to the day and the two script names | refusals by code, route and caller; `direct_request` by caller, key, kind and status class; exceptions by name and route |
| Sign-ins | `GET accounts/<id>/access/logs/access_requests` | per email: allowed and denied counts, countries, distinct-address count |
| Cloudflare account changes | `GET accounts/<id>/audit_logs` | per actor: action type and resource type, such as token created or Worker deployed |
| Permission changes | `wong_access_audit` in D1 | actor, event, time |

The summary JSON carries `version: 1`, the day, each source's result, and is capped at 64 KB. Lists are cut to their top 50 with a `truncated` count. *Alternative:* the computer builds it. Rejected per the proposal's decision log: off computers and faked history.

The telemetry query is called from inside the builder with the read key; `cloudflare.read` stays GET-only. *Alternative:* allow `POST` on the telemetry path in `cloudflare.read`. Rejected: it weakens a person-facing promise for a need only the builder has.

### 3. Storage: append-only, owner-read

```sql
CREATE TABLE security_days (
  installation_id TEXT NOT NULL,
  day TEXT NOT NULL,            -- YYYY-MM-DD, UTC
  summary TEXT NOT NULL,        -- JSON, ≤ 64 KB
  created_at TEXT NOT NULL,
  PRIMARY KEY (installation_id, day)
);
```

Writes are `INSERT ... ON CONFLICT DO NOTHING`. The same tick deletes rows older than 400 days. No action updates or deletes a row. `security.days`, at `GET /api/security/days?from&to` with at most 92 days per call, is `effect: "read"`, `agentAvailable: true`, and gated by `isOwner(core)`. An Admin gets `403 owner_only`.

### 4. The read key gains one group, and existing keys are widened in place

Add `Workers Observability Read` to the allow-list in `permission-groups.md`. Confirm its name and id against `GET /user/tokens/permission_groups` at build time; the page's rule is ids read from the live API. In `private-access.mjs`'s account-key step, when the production Worker holds the key and the token's policy lacks a listed group, `PUT` the key's policy to the current list. The token id and value are unchanged, so the Worker secret is untouched. A token that can't edit account tokens reports the step missing, as today.

Also confirm at build time that `audit_logs` answers with the key's existing `Account Settings Read`. If it doesn't, add the narrowest read group that does and record it in the decision log.

### 5. The watch: a script decides what's unusual, the assistant decides what matters

New payload skill `.agents/skills/security-watch/`:

- `scripts/security-watch.mjs gather` calls `security.days` for the last 31 days through [`company-api.mjs`](../../../scripts/company-api.mjs). It reads the helper log's last 24 hours, both files across the roll. It reads `gh api` for open Dependabot, secret-scanning and code-scanning alerts, recording each as unavailable when `gh` is signed out or a feature is off. It prints one JSON digest: yesterday, a 30-day baseline (medians and seen-before sets), and `flags[]`.
- Flags, by fixed rules: a sign-in country or email not seen in 30 days; any denied sign-ins; refusals above 3× the 30-day median and at least 10; a new refusal code; any Cloudflare token, Access or Worker-settings change; any permission event; exceptions above 3× median; a source unavailable; yesterday's summary missing; helper log `refused` or unknown-tap lines; any open critical or high GitHub alert, or any new one.
- `SKILL.md` (short): run `gather`. With no flags, end. With flags, judge each against the digest, and drop what the owner's own recent work explains, such as a deploy they made. If any remain, put one inbox `question` titled *Security watch: <what>*. It says what was seen and what is suggested, with options like *Look into it with me* and *It's expected*. A tap brings the owner back to this chat to dig in. It changes nothing and sends nothing else.

The skill is user-invocable and model-invocable, so a schedule's session can run it. Its text is offset by cuts per [the payload rule](../../../.agents/rules/payload.md).

### 6. Turning it on

This repo, after ship: `/schedule` creates `schedules/security-watch.json`, daily at 07:30 in the owner's timezone, on the app's clock, with permitted actions *read and post one inbox item*. Installs: the changelog entry's **Updating.** note asks whether to turn on the morning security watch, and `/wong-sync` turns it into a plan to-do. [The wiki page](../../../wiki/stack/security-watch.md) owns how it works.

## Risks / Trade-offs

- [Workers Logs sampling or plan limits drop lines] → the summary is a sign, not an exact count. The page says so, and `head_sampling_rate` stays at its default 1.
- [The telemetry query API changes shape] → the source returns `unavailable`, which flags, so a silent break can't read as all clear.
- [A refusal flood from one address fills the logs] → summaries cap lists and count the rest. Cloudflare bounds log volume per plan.
- [Countries are coarse; a VPN looks like travel] → the assistant judges and asks, never blocks.
- [Exception messages could hold data] → only the exception's name and route are kept, never its message.
- [Widening the read key on update] → the key stays read-only. The group list is an allow-list and the scenario checks no write group joins.
- [One-line overlap with one-line-worker] → noted in Context. The second to publish rebases the single key.

## Migration Plan

Additive: a new table, new log lines, one more read group. The update widens the key (no new secret). Rollback: remove the cron call. The table stays and is harmless.
