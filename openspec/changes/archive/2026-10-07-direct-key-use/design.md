# Design

## Context

See [the proposal](proposal.md) for why. What shapes the approach:

- A described action already carries everything a forwarded call needs: `keys` it lists, an `effect` that sets the level a call needs, discovery that hides what a caller may not run, bounded input and output, and a `scopedEnv` that hands a handler only its keys (`app/worker/api/contract.ts`).
- `cloudflare.read` (`app/worker/api/cloudflare.ts`) is one hand-written forwarder: one method, a path allow-list, `redirect: "manual"`, a bounded answer, and a refusal when the answer holds the token. It belongs to its key alone, mapped `{ keys: ["cloudflare"] }`.
- `currentPolicy()` reads everything a call is judged by in one SQL snapshot from the primary, and keeps no cache between requests (`app/worker/employee-access/policy.ts`).
- A skill lists the actions it calls in `actions.json`; `skills.ts` works out what the skill needs from those routes, and `scripts/check-skill-actions.mjs` refuses a skill that names a secret.
- No built app in this repo uses a saved key, so previews can't show a real service. The source-only `sample` area exists for this.

## Goals / Non-Goals

**Goals:**

- One generic forwarder driven by data in the key registry, so adding a service is a registry entry and no handler code.
- Reuse dispatch, discovery, key scoping and the skills catalogue unchanged where they already do the job.
- The owner's choice read in the same snapshot as levels, so it governs the next request.

**Non-Goals:**

- Folding `cloudflare.read` into the generic forwarder. Its stored-data rules and account pinning stay hand-written.
- Token refresh, request signing, or per-request credentials (OAuth refresh, AWS SigV4).
- Streaming, binary answers or uploads. A direct answer is text or JSON.
- Parsing a GraphQL body to tell a query from a mutation.

## Decisions

1. **A registry entry describes the service.** `keys.ts` gains an optional `forward` on a key:

   ```ts
   notion: { title: "Notion", secrets: ["NOTION_TOKEN"], forward: {
     base: "https://api.notion.com/v1/",
     secret: "NOTION_TOKEN", header: "Authorization", prefix: "Bearer ",
     headers: { "Notion-Version": "2022-06-28" },
     lookups: ["POST search", "POST databases/*/query"],
   } },
   ```

   `base` is HTTPS and ends in `/`. `secret` is one of the key's own `secrets`; `header` and optional `prefix` say how it is sent. `headers` are fixed extras. `lookups` are `METHOD path` patterns, `*` matching one path segment, for requests that only read although their method is not `GET` or `HEAD`. A key with `setup` or `alone` may not carry `forward`. Over a per-service handler file: the assistant would write near-identical code for each key, each a place to get a guard wrong.

2. **Two described actions per forwardable key, generated.** A new `app/worker/api/forward.ts` maps the registry to routes: `POST /api/direct/<key>/read` as `<key>.read` with `effect: "read"`, and `POST /api/direct/<key>/change` as `<key>.change` with `effect: "external"`, the second only when the key offers Read & write. Both list `keys: [<key>]` and the router maps them `{ keys: [<key>], direct: "read" | "write" }`. Over one action with a `method` input: dispatch takes the level a call needs from the action's fixed `effect`, so one action could not need Read for a `GET` and Read & write for a `DELETE` without a second, hand-rolled level check. Two actions also let a skill's `actions.json` and the Skills view show whether it changes things. `cloudflare.read` already has this name shape; the Cloudflare key has no `forward`, so there is no clash.

3. **Input and output.** Input: `method` (`GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`), `path` (no leading slash, under `base`), optional `query` string, optional `body` (JSON value or string), optional `contentType`. Output: `{ status, contentType, body }`, where `body` is parsed JSON when the service says JSON and text otherwise. A service's own 4xx or 5xx is a successful action result carrying that status, so the assistant reads the service's message. `<key>.read` accepts `GET`, `HEAD`, and a method and path matching `lookups`; anything else answers `not_a_lookup`, naming `<key>.change`. `<key>.change` accepts every method.

4. **The guards, shared with the shape `cloudflare.read` proved.** Build the URL as `new URL(path, base)` and refuse unless its origin equals `base`'s and its pathname starts with `base`'s; refuse `..`, `.`, `//`, a backslash, an encoded slash or dot, and a control character before building. Send only the key's header, the fixed `headers`, `Accept` and the caller's `contentType`; no other caller header exists in the input. `redirect: "manual"`, and a 3xx becomes `bad_answer`. Read the answer through `boundedText` at 1 MB; over it is `too_large`. Refuse an answer whose text contains the secret, in the body or the echoed content type. Input is bounded at 256 KB, time at 30 s, with the call's abort signal passed to `fetch`. The helper already reports a timed-out write as outcome unknown and never retries; these actions set no `confirmWith`.

5. **The choice is one row per key.** A new migration adds `wong_access_key_direct (installation_id, key_id, mode CHECK (mode IN ('read','write')), revision, PRIMARY KEY (installation_id, key_id))`. No row means off, so an update turns nothing on. `currentPolicy()` adds one `json_group_object` of these rows to its existing query and returns `direct: ReadonlyMap<string, Level>` on a `current` policy; a row for a key with no `forward`, or `write` on a Read-only key, counts as off or `read`, as `heldLevels` already treats stored levels. Over a column on an existing table: no table is per key for the installation. Over a registry flag: the owner chose a switch in Access that needs no publish.

6. **Enforcement sits in `refusal()`.** `RouteAccess`'s key-alone shape gains optional `direct: Level`. When present, after the level check, the call is refused unless `policy.direct.get(key)` holds `direct`. This runs for the owner and the checker too: `everyKey()` does not imply any choice. The refusal reads `Notion: direct use is off` when no row exists and `Notion: direct changes are off` when the mode is `read` and the action needs `write`. `legacy` and `not_started` policies refuse a `direct` route for everyone, the owner included, since no choice can have been made. Discovery calls the same `policyAllows`, so a direct action is listed only when it would run.

7. **Setting the choice.** A fourth save, `POST /api/access/direct` with `{ key, mode: "off" | "read" | "write" }`, joins `people`, `roles` and `grants` in `management.ts`, behind the same `ownerCore` check, bumping the installation revision so discovery ETags change. `KeyPage` sends it with the levels save when both changed, the choice first. It refuses a key with no `forward`, and `write` on a Read-only key.

8. **Status and the skills catalogue.** `keyCatalogue` adds `direct: { offered: Level[]; mode: Level | null } | null` per key, null when the key has no `forward`. `Skill` gains `direct: Levels`: the keys a skill reaches through a direct action and the mode each needs, raised like `keys`. The screen's gap logic treats an unmet `direct` as a gap of the skill, shown once and not per person.

9. **One record per direct request.** The forwarder writes one structured `console.log` line: caller email, key, `read` or `change`, method, the path without its query, and the service's status. No body, no query, no header. Worker logs are the store, as for every other request today; a kept table is out of scope.

10. **Tests carry the request path; a preview shows only the empty state.** `forward.ts` takes the registry and `fetch` as parameters, so tests drive it with a made-up key and a stubbed service: every guard, both actions, each refusal. Screen tests render a status that holds a forwardable key in each mode. A preview can show only *Not set up for this key*, because `keys.ts` ships and no shipped key may carry `forward`, and staging holds no service secret. Over a source-only practice key: the registry file is payload, so a practice entry needs a second, source-only registry and a staging secret, a mechanism larger than this change. The first real request is therefore made on a real install with a real key after publishing; the proposal's last decision-log line at ship names it as unverified until then.

11. **The assistant's guidance lives in two wiki pages.** `company-api.md` gets *Use a key directly*: what the two actions take and return, when to choose direct use over building an action, and how to write a `forward` entry from a service's API guide. *Build a skill on actions* gains one sentence allowing `<key>.read` and `<key>.change` in `actions.json`. `api-keys.md`'s *A saved key shows in Access* says the assistant also adds the service's details when it fits, and that direct use stays off until chosen. `secrets.md` takes one linking clause at most, because it counts toward a save route's word total.

## UX

### Use-case brief

The owner or a manager, a few times a year per key, at a desk or on a phone, right after a key is saved or when a teammate's assistant is refused with *direct use is off*. The job is "let the team's assistants look things up in Notion". Done means one choice picked, one save, and a sentence that told them who it reaches before they saved. The common case is picking *Look-ups only*; *Look-ups and changes* is the rarer, deliberate one. Assumed: under twenty keys, tens of people. The closest existing screen is the opened key in the Keys view, which this extends; the choice mirrors `LevelChoice`'s radio group.

### Flow

Keys → open a key → pick under *Direct use* → read the line beneath → *Save access*.

### Hierarchy

*Save access* stays the one primary action. *Direct use* sits above the per-person levels, because it changes what those levels mean. The line beneath the choice is the consequence, in words: what a level then reaches and how many people hold one. A choice is named in words on the row and the page, never by colour.

### Review

[Review page](review.html). The second What Changes item sketches the opened key before and after, and the state of a key with no setup. Each fits phone width.

### Components

Existing: `Page`, `LevelChoice`'s radio group pattern, `Table` and `Cell`, the skill panel's missing lines. Changed: `KeyPage` gains the *Direct use* group; `keyUseShort` adds a short word for the choice, held to the list's one-line bound; a person's and a role's key line adds that the level reaches the service directly; the skill panel names *direct use is off*. New: none. Loading and failed saves keep the existing states.

## Risks / Trade-offs

- [A level now reaches the whole service] → Off by default, per key, with the count of people it reaches shown before the save, and the wiki says to make a narrower key at the service when that is too wide.
- [A `lookups` entry that is really a change gives Read holders a write] → The check holds each entry to `METHOD path` under `base`; the wiki tells the assistant to list only requests the service's guide documents as read-only, and review sees the entry in the pull request. A missing entry fails safe, as a change.
- [A service that does everything through one `POST`, such as GraphQL] → Nothing counts as a look-up, so direct use needs Read & write and *Look-ups and changes*. Said plainly in the wiki; built actions remain the way to give look-ups alone.
- [Server-side request forgery through `path`] → The origin and prefix check on the built URL, the character refusals, and no redirect following. Tests carry the traversal cases `cloudflare.test.ts` already uses.
- [The key echoed back by a service] → The answer is refused when it contains the secret.
- [A large answer fills a chat] → 1 MB cap with a message to narrow the request; known thread #1001 on truncation stays open and is not widened here.
- [Two saves from one page, one failing] → The choice is saved first and the page reports each outcome with the existing save notices.

## Migration Plan

Additive: one new table, read with a `LEFT`-style subquery, so a Worker from before this change keeps working and an install with no rows behaves as today. No registry entry ships with `forward` in the payload, so an updated install lists no new action until its assistant adds one. Rollback is the previous Worker; the table may stay.
