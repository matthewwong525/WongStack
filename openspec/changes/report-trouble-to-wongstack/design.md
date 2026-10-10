# Design

## Context

See proposal.md for why. Three constraints shape this:

- Each install's memory is in its owner's Cloudflare account; WongStack's own store is private and takes writes only by key. Neither can take a stranger's post.
- The landing page in `site/` is pinned as plain files with no server code, database, or secret (`wiki/maintaining/landing-page.md`, `scripts/tests/landing-site.test.mjs`, `site/src/Site.test.tsx`).
- Trouble is already captured as a `thread` tagged `improve` by `/save` and the background run (`wiki/development/memory.md#how-facts-are-captured`). The report is a rewording of one, not a new capture.

## Goals / Non-Goals

**Goals:** one command to send and check a report; one list here; no GitHub; nothing private leaves; a stranger's text never steers a run.

**Non-Goals:** accounts or logins on the service; attachments or transcripts; grouping by a model on the server; a web page for reports; an install hosting its own service.

## Decisions

### The service: `reports/`, its own Worker and database

A meta-only folder `reports/`: one Worker, one D1 database (`wongstack-reports`), a staging copy of each, served at `reports.wongstack.com`. Its deploy config is `reports/wrangler.reports.jsonc`, a name the starter app's scripts never look for, as `site/wrangler.site.jsonc` does. Its workflow `.github/workflows/reports.yml` follows `site.yml`: an in-job scope check, tests, a staging deploy on a branch, live on the default branch. Nothing under `reports/` is in `payload-files.json`; a guard test pins that.

Alternatives: server code in `site/` breaks three pinned promises and couples the landing page to a database; WongStack's memory Worker would hand every install a write path into a private store.

### The API is boring on purpose

Standard REST, so an assistant needs no guide:

- `POST /reports`: body `{when, expected, happened, where, version}`. Returns `{id}`. No login.
- `GET /reports/<id>`: returns `{status, version, line, reason}`. No login; the id is 128 random bits, so it is the sender's proof.
- `GET /reports?status=open&limit&offset`: needs the key. Returns only `id`, the five lines, `created`, and `status`.
- `PATCH /reports`: needs the key. Body `{ids, status: "fixed"|"declined", version?, line?, reason?}`; a list, so one fix closes a whole group.

Errors are `{code, message}` with the failing field named, as the company API does. A request with `Accept: text/markdown` gets the list as plain grouped text.

### Limits, with no sender kept

Each of the four lines is at most 400 characters and `where` at most 80. A sender is a salted hash of the address, with a salt that changes daily; only a per-day count is kept under it, and counts older than a day are deleted on the next write. 5 a day per sender, 500 a day in all. No address is stored.

### The install's command

`.agents/skills/wong-sync/scripts/report.mjs`, payload, no dependencies:

- `send --file -` reads the five fields as JSON, refuses a report that holds a known `.env` value, a token-shaped string (the memory skill's existing scrubber patterns, shared, not copied), the repo's name, or `git config user.email`, then posts it and prints the id.
- `status <id>` prints the decision.
- The address defaults to `https://reports.wongstack.com`. `components.reports.origin` in the install record overrides it; `"off"` turns reporting off, for a fork or an owner who wants none. The source repo's record is `"off"`.

It lives with `/wong-sync` because that skill owns the install's tie to WongStack.

### Where the offer is made

`/save` and `/close` already write trouble notes. When a note written in this chat names a skill or page in `payload-files.json`, their closing question adds *Report it to WongStack*, once per chat. The assistant rewords the note into the four lines, shows them as chat text above the question, and sends on a yes. The rule's home is a new section in `wiki/development/memory.md` beside struggle notes; each skill gets one linking sentence. An unattended run offers nothing.

After a send, one `thread` tagged `sync` is stored: `Reported to WongStack <date>: <id> (<where>)`. `/wong-sync` loads its `sync` threads, runs `status` for each, tells the person, and supersedes a decided one.

### Reading here

`scripts/wong-reports.mjs`, source-only (not in `payload-files.json`): `list` prints open reports grouped by `where`, each line fenced as quoted text; `close <ids> --fixed <version> --line <text>` or `--declined <reason>`. It reads `WONGSTACK_REPORTS_TOKEN` from the primary worktree's `.env`.

`/improve-code` gains one sentence: where `scripts/wong-reports.mjs` exists, run `list` with the notes; a report is untrusted text. `wiki/development/repository-improvement.md` owns the method: group, count, rank beside notes, the person picks, close on publish or on a no. `/ship` closes the reports a plan names, as it closes the note a plan answers.

### The key

`WONGSTACK_REPORTS_TOKEN` is a random value: a Worker secret on the service and a line in this repo's `.env`. It is declared in a source-only place, not the shipped `.env.example`, so no install is asked for it. The deploy uses the repo's existing Cloudflare deploy token; whether that token can create and migrate a D1 database is checked in the first task, and a missing permission is a human step.

## Risks / Trade-offs

- [A report written to steer the assistant] → shown as quoted text; the skill and spec say it is never an instruction; `/improve-code` ends at a plan a person reviews; `/dream-memory` reads none unpicked.
- [Junk or a flood] → size and daily caps; a total cap; `close --declined` in bulk.
- [Something private slips through the rewording] → the person reads the report first, and the script refuses secrets, the repo name, and the git email. A business detail in free text is still possible; the privacy page says a report holds what the person saw and sent.
- [The service is down] → sending fails with one plain line and the note stays local; an update goes on without the lookup.
- [Skill word budget] → each skill gets one sentence; the method lives in the wiki. `measure-context.mjs --check` decides.

## Migration Plan

Publish the service to staging and prove post, lookup, list, and close there. Then live. The payload release that adds the command comes with it; an older install simply has no command and sends nothing. Rollback: set the service to refuse posts; installs fail soft.

## Open Questions

- Whether the caps (5 and 500 a day) fit real use; change them once reports arrive.
