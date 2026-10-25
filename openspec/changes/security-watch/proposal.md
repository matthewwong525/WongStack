# A daily security watch, and records worth watching

**Status:** parked
**Branch:** observability-security-gaps
**Open questions:** keep this plan, or go lighter: no saved summaries, with the morning watch reading Cloudflare's own logs directly and comparing only the last 3–7 days?

## Why

Your app and computer keep some records, but nobody reads them. Blocked attempts leave no trace, and Cloudflare forgets its app records after a few days. If something went wrong, the trace might exist, but nobody would be told. With more attacks on the tools we run, you want an assistant that checks every day and tells you only when something looks off.

## What Changes

- **Blocked attempts leave a record.** A request the app turns away now leaves one line: who asked, what they tried to reach, and why it was refused. This covers a refused call to a business service, a sign-in the app doesn't accept, and a computer the live line won't connect. The line holds no message contents and no keys. The live line, the connection that can wake your computer, now keeps records too. Today it keeps none.

- **The app writes a summary of each day, and keeps it a year.** Shortly after midnight, the app gathers the day's records into one short summary and saves it in its own database. The summary covers blocked attempts, errors, calls made with saved keys, who signed in and from which countries, changes to your Cloudflare account, and permissions given or taken away. Once a day is written, nothing can change it. The app writes it on its own, so the computer doesn't need to be on. Someone who breaks into the computer can't rewrite past days either. Only you, the owner, can read the summaries.
  ```mermaid
  flowchart LR
    rec["records"] --> app["app, nightly"]
    signin["sign-ins"] --> app
    cf["account changes"] --> app
    perm["permissions"] --> app
    app --> day["summary, kept a year"]
  ```

- **An assistant checks every morning, and stays quiet when all is well.** A daily schedule opens a chat. The chat reads yesterday's summary against the month before it. It also reads what the background helper on your computer did, and GitHub's warnings about leaked keys and risky add-ons. Simple rules point out what's new or unusual first: a sign-in from a new country, a spike in blocked attempts, a new Cloudflare key, a permission change, or a record source that went silent. The assistant decides whether any of it matters. If something does, one card waits in your inbox saying what it saw and what it suggests. Otherwise nothing shows. The watch only reports: it never blocks anyone, removes a key, or changes a setting.
  ```mermaid
  flowchart TD
    sched["each morning"] --> read["read the records"]
    read --> rules["rules flag the unusual"]
    rules --> judge{"anything off?"}
    judge -->|no| quiet["nothing shows"]
    judge -->|yes| card["one inbox card"]
  ```

- **Every WongStack install gets it.** An existing app gets the new records and summaries when it updates. Its update also offers to turn on the morning watch. Here, we turn it on once this ships.

Non-goals: blocking or undoing anything automatically; a screen for browsing the summaries; live alerts within minutes of an event; watching services other than Cloudflare, GitHub and this computer.

## Capabilities

### New Capabilities

- `security-watch`: refused requests are recorded without contents; the live line's Worker keeps logs; the live app writes an immutable, bounded, owner-only daily security summary kept 400 days; the daily watch reads it with the computer's helper log and GitHub alerts, flags by rule, and reports only through one inbox item, changing nothing.

### Modified Capabilities

- `cloudflare-provisioning`: the read-only Cloudflare key may read Workers Observability logs, and an existing key is brought up to the current allow-list instead of being reused unchanged.

## Impact

- **App:** `app/worker/index.ts` (`scheduled`), a new `app/worker/security/` folder (day builder, sources, `security.days` action), refusal records in `app/worker/api/router.ts`, `app/worker/api/forward.ts`, `app/worker/api/cloudflare.ts`, `app/worker/access.ts`, `app/worker/line-worker.ts`; a new migration `schema/migrations/<ts>_security_days.sql`.
- **Config:** `observability` on in `app/wrangler.line.jsonc` and `.agents/skills/wong-sync/references/wrangler.line.template.jsonc` (both also edited by [one-line-worker](../one-line-worker/proposal.md) in another workspace).
- **Setup:** `Workers Observability Read` joins the look-up key's allow-list in `.agents/skills/wong-setup/references/permission-groups.md`; the `access` step updates an existing key's policy (`.agents/skills/wong-setup/scripts/`).
- **New skill:** `.agents/skills/security-watch/` (`SKILL.md`, `scripts/security-watch.mjs`), listed in `payload-files.json` and the memory `areas.json`.
- **Docs:** a new `wiki/stack/security-watch.md`, links from `wiki/stack/README.md`, `wiki/stack/company-api.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/stack/live-line.md`; `CHANGELOG.md` (minor).
- **After shipping, outward:** this repo's own `schedules/security-watch.json` through `/schedule`.

## Decision log

- **2026-10-25** — Asked whether to plan better records, a daily watch, or both → chose both.
- **2026-10-25** — Asked how to handle the overlap with "Remove the test line Worker", which edits the live line's settings → chose keep going here; whichever publishes second merges the one-line difference.
- **2026-10-25** — Asked where each day's summary is kept → chose in the company app, owner-only.
- **2026-10-25** — Asked whether it ships to every install or runs only here → chose every install; the update offers to turn the watch on.
- **2026-10-25** — Assumed: the live app builds each day's summary on its own clock, not the computer, because the computer may be off and a break-in there must not be able to rewrite or fake past days.
- **2026-10-25** — Assumed: the watch only reports, through one inbox card, and changes nothing, because an unattended assistant that blocks people or removes keys on its own judgment is itself a risk.
- **2026-10-25** — Assumed: a script gathers the records and applies fixed rules before the assistant judges, because counting and comparing are deterministic, and the assistant should spend its attention on whether a flagged item matters.
- **2026-10-25** — Assumed: summaries are kept 400 days, because a year plus a margin covers a yearly comparison and the rows are small.
- **2026-10-25** — Assumed: the app reads its own logs with the existing read-only Cloudflare key, given one more read permission, not with the user token, because the user token can control the whole account and must never reach a Worker.
- **2026-10-25** — Assumed: `cloudflare.read` stays GET-only; the log query, which Cloudflare takes as a POST, runs only inside the daily build, because widening a person-facing action's method weakens its promise to change nothing.
- **2026-10-25** — Assumed: a summary keeps countries and a count of distinct addresses, never IP addresses or message text, because a year-long record should hold the least personal data that still shows a pattern.
- **2026-10-25** — Assumed: one change, not two workspaces, because the watch is only useful once the records and summaries exist.
- **2026-10-25** — Save checkpoint: plan only, parked at the owner's request before choosing between this plan and the lighter Cloudflare-only version (asked after he questioned why we don't just review Cloudflare's logs). Spec deltas are not yet folded into the main specs, as with other unbuilt plans.
