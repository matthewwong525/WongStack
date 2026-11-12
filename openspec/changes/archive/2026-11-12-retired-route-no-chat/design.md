# Design

## Context

`failed(kind, { note, reason })` counts failures per kind in `needs-you.json` and opens `Needs you: <what>` at the second. A server that retires a route answers `404: retired` (`fail("retired", 404)`), and the error reaches `reason` as `404: retired`.

## Decisions

- **One check in `failed`**, `/^\d{3}: retired\b/` on `reason`, covers every kind, now and later.
- **One journal line a day per kind**, kept in `needs-you.json` as `retired: {<kind>: <day>}`, so the person can still find it, without a line each minute.
- **Rejected: hold a retirement on the server until every computer updates.** The server can not know when that is.

## Risks / Trade-offs

- A route wrongly answering `retired` hides behind one line a day → the line still names it.

## Decision log

- **2026-11-12** — Asked whether the fix goes to WongStack too → chose yes, and ship it there.
- **2026-11-12** — Assumed: one line a day, not silence, because the person can then still see it.
- **2026-11-12** — Archive checkpoint: archived for /ship as release 56.0.1.
