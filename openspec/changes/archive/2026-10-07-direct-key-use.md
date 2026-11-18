<!-- openspec-archive v1 2026-10-07-direct-key-use -->
<!-- file proposal.md utf8 10766 -->
# Let an assistant use a saved key directly, when you switch it on

**Status:** ready-to-ship

**Branch:** keys-skills-api-design

**Open questions:** none

## Why

Today a teammate's assistant can only do work with a service that someone has already built into the app. Every new question, such as *find this page in Notion*, needs a build first. So people fall back to keeping the key on their own computer, where nobody can limit it, see its use, or take it away. That is what happened in Claymoo App: its Notion, Shade and Klaviyo skills read the key from the computer and work only on the owner's server.

## What Changes

- **A key can be used directly, through the app.** The assistant asks the app to pass one request on to the service. The app checks the person's level for that key, adds the key itself, and returns the answer. The key never reaches the person's device, each use is recorded with who made it, and lowering a person's level stops their next request.
  ```text
    BEFORE                 AFTER
  assistant ─▶ key on    assistant ─▶ the app ─▶ service
               your own       │         │
               computer       ▼         ▼
  works only for you       their     level ok?
                           login     +adds the key
                                     +records who
  ```
- **You switch it on per key, in Access.** Each key's page gets one choice: *Off*, *Look-ups only*, or *Look-ups and changes*. It is *Off* until you pick. The page says what the choice opens and how many people it reaches, because direct use makes a level mean more: *Notion: Read* then lets a person's assistant read everything that key can see. The Keys list shows the choice on the key's row.
  ```text
    BEFORE                    AFTER
  ┌────────────────────────┐ ┌──────────────────────────┐
  │ Notion              ✕  │ │ Notion                ✕  │
  │ Saved                  │ │ Saved                    │
  │ Used by Tasks: look up │ │ Used by Tasks: look up   │
  │                        │ │                          │
  │                        │ │+Direct use               │
  │                        │ │+( ) Off                  │
  │                        │ │+(•) Look-ups only        │
  │                        │ │+( ) Look-ups and changes │
  │                        │ │+Anyone with Read can look│
  │                        │ │+up anything this key can │
  │                        │ │+see. 3 people today.     │
  │                        │ │                          │
  │ Sales  [Read        ▾] │ │ Sales  [Read          ▾] │
  │ Kim    [None        ▾] │ │ Kim    [None          ▾] │
  │                        │ │                          │
  │ [Save access] Cancel   │ │ [Save access] Cancel     │
  └────────────────────────┘ └──────────────────────────┘
  ```
  A key whose service can't be used this way yet says so, with no choice to make:
  ```text
  ┌──────────────────────────────────┐
  │ Stripe                        ✕  │
  │ Saved                            │
  │ Nothing uses it yet              │
  │                                  │
  │ Direct use                       │
  │ Not set up for this key. Ask     │
  │ your assistant to add it.        │
  │                                  │
  │ Sales  [None                  ▾] │
  │ [Save access] Cancel             │
  └──────────────────────────────────┘
  ```
- **A person's level decides what they can do with it.** *Read* passes on look-ups. *Read & write* also passes on changes, and only when you chose *Look-ups and changes* for that key. A refusal says what is missing, such as *Notion: direct use is off*.
  ```text
  your choice    │ Read    │ Read & write
  ───────────────┼─────────┼──────────────
  Off            │ nothing │ nothing
  Look-ups only  │ look up │ look up
  Look-ups and   │ look up │ look up and
  changes        │         │ change
  ```
- **The app passes on only what is safe to pass.** A request goes to that service's own address and nowhere else, the answer is cut off at a fixed size, and no answer can carry the key back.
- **A skill can use a key this way, and Access still shows who can run it.** The Skills view names the key and the level as it does now, and says *direct use is off* when that is what stops the skill.
- **The assistant sets a service up when it saves the key.** WongStack ships with no service ready-made. When you give a new key, the assistant adds where that service lives and which of its requests only look things up, from the service's own guide. That goes out with a normal publish. Direct use still stays *Off* until you choose.
- **Building the work into the app stays the first choice** for anything you do again and again, or that touches money or customers. Only built work can limit a person to one area or one record. Direct use is for look-ups and one-off jobs nobody has built.

## Non-goals

- A ready-made list of services. Each is added when its key is saved.
- Services whose key must be renewed every hour through a sign-in, such as Google. Those still need built work.
- Limiting direct use to part of a service. The key's own permissions at the service are the limit: make a narrower key there.
- Changing the Cloudflare look-ups, which keep their own stricter rules.
- Changing Claymoo App. It has its own Access and would take this in through its own update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: a key may be used directly through the app when the employer turns it on for that key; the person's level and the key's direct-use choice together decide; what the app will and will not pass on; Access shows and sets the choice.
- `skill-actions`: a skill may call a key's direct-use actions, and Access names *direct use is off* as what is missing.

## Impact

- Worker: the key registry `app/worker/keys.ts` gains an optional forwarding entry; a new `app/worker/api/forward.ts` makes two described actions per forwardable key and the main router registers them; `app/worker/employee-access/` (policy read, key catalogue, a new save, status); `app/worker/api/discovery.ts`; a new migration with one table; `schema/seed.sql`.
- Screens: `app/src/apps/access/` (`KeyPage.tsx`, `Keys.tsx`, `levels.ts`, the skill panel's missing lines), `app/src/lib/access.ts`.
- Checks: `app/worker/apps/keys.test.ts` holds a forwarding entry to its rules; `scripts/check-skill-actions.mjs` needs no change.
- Docs: `wiki/stack/company-api.md`, `api-keys.md`, `employee-access.md`, `access-screens.md`; one clause in `wiki/development/secrets.md`.
- Payload release: `CHANGELOG.md` entry, **minor**: nothing an install has stops working, and direct use is off everywhere until chosen.

## Decision log

- **2026-10-07** — Asked whether skills should reach a service by forwarding on the key or through built actions → chose both: built actions stay the default, forwarding is added per key.
- **2026-10-07** — Asked where forwarding is switched on for a key → chose in Access, per key: Off, Look-ups only, or Look-ups and changes, off until picked.
- **2026-10-07** — Asked which services forward out of the box → chose none; the assistant adds a service's details when it saves that key.
- **2026-10-07** — Assumed: the screens call it *direct use*, because *forwarding* describes the plumbing and the owner is choosing whether an assistant may use the key directly.
- **2026-10-07** — Assumed: the owner and a manager can both set the choice, because a manager already sets every key level and Access gives managers everything but managing managers.
- **2026-10-07** — Assumed: *Off* is off for the owner too, because one switch that means one thing is easier to trust, and the owner's own computer already holds the key.
- **2026-10-07** — Assumed: direct use needs no app ticked, only the key's level, because Cloudflare look-ups already work that way and a direct request belongs to no app.
- **2026-10-07** — Assumed: each key gets two actions, one for look-ups and one for changes, because the app already decides the level a call needs from what the action does, and a skill's list then shows which it uses.
- **2026-10-07** — Assumed: a request counts as a look-up when it only reads by the web's own rules, or is on the key's short list of look-up requests, because some services search with a request that looks like a change; anything else needs Read & write.
- **2026-10-07** — Assumed: only a service that takes one fixed key in a request header can be set up, because a key renewed through a sign-in needs code of its own.
- **2026-10-07** — Assumed: Cloudflare look-ups stay as they are, because their rules about stored data are stricter than a general pass-through and already live.
- **2026-10-07** — Assumed: a preview keeps its own direct-use choice with its practice list, because a preview's Access already changes nothing on the live app.
- **2026-10-07** — Assumed: a preview shows only a key that is not set up, and the first real direct request is made on a real install with a real key after publishing, because WongStack ships no service key and a practice one would need a second key list of its own; tests with a stand-in service cover the rest.
- **2026-10-07** — Assumed: the Cloudflare look-up key and Project code say *Not offered for this key* and give no hint to ask, because neither can ever be set up for direct use and the hint would send the owner to ask for something that can't be done.
- **2026-10-07** — Built: the one linking clause planned for the secrets page was left out, because it pushed a save route's instructions past their word limit; the two key pages carry the guidance.
- **2026-10-07** — Assumed: the save and the preview walk are publishing's own steps and no longer boxes in the task list, because they are the routine gate every publish runs; the list keeps what the walk should look at. A real direct request is unverified until a real install saves a real key.
- **2026-10-07** — Archived for publishing as 37.3.0; the checkpoint after this entry is the one that merges.

<!-- end proposal.md -->
<!-- file design.md utf8 12486 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 6258 -->
# Tasks

Build sections 1–4 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no build, no `/save`. The boxes in 1–4 are checked by source review; section 5 is the one gate.

## 1. Worker: the registry entry and the forwarder

- [x] 1.1 Add the optional `forward` entry to the `Key` type in `app/worker/keys.ts` ([design 1](design.md)), with a commented example beside the commented Stripe line, and readers for it in `app/worker/employee-access/key-levels.ts`. Extend `app/worker/apps/keys.test.ts` to fail, naming the key, on a non-HTTPS `base`, a `base` not ending in `/`, a `secret` outside the key's own `secrets`, a `lookups` entry that is not `METHOD path` or holds `..`, and `forward` on a key with `setup` or `alone`. Verify by tests over made-up registries, one per rule and one clean.
- [x] 1.2 Write `app/worker/api/forward.ts` ([design 2–4](design.md)): from a registry, build `<key>.read` at `POST /api/direct/<key>/read` and, for a key offering Read & write, `<key>.change` at `POST /api/direct/<key>/change`, each a described action with input descriptions, synthetic examples, safe errors (`not_allowed`, `not_a_lookup`, `too_large`, `bad_answer`) and the limits in design 4. Author `forward.test.ts` with a stubbed `fetch`: a `GET` look-up, a listed `POST` look-up, an unlisted `POST` refused by `.read` and sent by `.change`, each traversal and other-host path refused with nothing sent, a redirect not followed, an answer over the bound, an answer holding the secret, a service 404 returned with its status, fixed headers and the key header sent, no other header sent, and the abort signal passed.
- [x] 1.3 Register the generated routes and their `{ keys, direct }` mappings in `app/worker/api/router.ts`, so `apiActions` and `apiKeyUse` include them. Verify by a router test over a made-up registry that both actions are registered, mapped to their key alone, and that the shipped registry adds none.
- [x] 1.4 Write one log line per direct request ([design 9](design.md)). Verify by a test that the line holds caller, key, kind, method, path and status, and holds no query, body or secret.

## 2. Worker: the choice

- [x] 2.1 Add a timestamped migration under `schema/migrations/` creating `wong_access_key_direct` ([design 5](design.md)), and give `schema/seed.sql` no row, so a preview starts off. Verify by a test that a database with no row reads every key as off.
- [x] 2.2 Read the choices in `currentPolicy()`'s one query and enforce `direct` in `refusal()` ([design 6](design.md)), with the two refusal messages. Author tests in `app/worker/employee-access/`: off refuses the owner, the checker and a Read & write holder; look-ups only runs a read for Read and refuses a change for Read & write; look-ups and changes runs a change for Read & write and refuses it for Read; a lowered choice governs the next request; `legacy` and `not_started` refuse; unreadable data denies; a stored `write` on a Read-only key counts as `read`.
- [x] 2.3 Add the `direct` save to `app/worker/employee-access/management.ts` ([design 7](design.md)), refusing a non-manager, a key with no `forward`, and `write` on a Read-only key, and bumping the revision. Author tests for each, and for a manager's save.
- [x] 2.4 Confirm discovery lists a direct action only when it would run, in `app/worker/api/discovery.ts`, adding no field. Author a test over the list, the single-action view and the OpenAPI document for each mode.
- [x] 2.5 Add `direct` to each key in `keyCatalogue` and to each `Skill` in `app/worker/employee-access/skills.ts` ([design 8](design.md)), and to the schemas in `app/src/lib/access.ts`. Verify by tests: a key with no `forward` reads null, a skill listing `<key>.read` needs that key at Read and direct `read`, and one listing `<key>.change` needs `write` for both.

## 3. Access screens

- [x] 3.1 Add the *Direct use* group to `app/src/apps/access/KeyPage.tsx` ([design UX](design.md#ux)): the choices the key offers, the consequence line with the count of people the pick reaches, and the *Not set up for this key* line when `direct` is null; send the `direct` save before the levels save. Author tests: each choice's line and count, a Read-only key offers two choices, the not-set-up state shows no choice, leaving asks first, and a failed choice save is reported.
- [x] 3.2 Show the choice on the key's row through `keyUseShort` in `levels.ts`, within the list's one-line bound. Verify by extending the existing line-length test with a key that an app uses and that is used directly.
- [x] 3.3 In `levels.ts`, count an unmet `direct` as a gap of the skill, and show *direct use is off* or *direct changes are off* once in the skill's panel and on the Skills row. On a person's and a role's key line, say the level also reaches the service directly when the key's choice is on. Author tests for a skill stopped only by the choice, one stopped by a level, and the key line in each mode.

## 4. Docs and the release

- [x] 4.1 Write *Use a key directly* in `wiki/stack/company-api.md` ([design 11](design.md)) and the one sentence in *Build a skill on actions*; keep the page under 3,000 words, moving *Look things up in Cloudflare* detail to a link if needed. Update `wiki/stack/api-keys.md`, *Key levels* and *A key with no app* in `wiki/stack/employee-access.md`, and the Keys line in `wiki/stack/access-screens.md`; add at most one linking clause to `wiki/development/secrets.md`. Verify with `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`.
- [x] 4.2 Add the `## Next (minor) — …` entry to `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand and direct use is off until chosen. Verify that `VERSION` is unchanged.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it finds, including the app's coverage gate for `forward.ts`.

Publishing's own checkpoint passes CI, and its preview walk looks at this: Keys shows each key's row unchanged in width, an opened key shows *Not offered for this key* with no choice, and Access saves as before at phone width. A real direct request stays unverified until a real install saves a real key.

<!-- end tasks.md -->
<!-- file specs/key-access/spec.md utf8 7488 -->
# Spec Delta

## ADDED Requirements

### Requirement: A key can be used directly when the employer turns it on

A saved key whose service is set up for it SHALL be usable directly: a signed-in person's assistant sends one request for that service through the app, and the server adds the key and returns the service's answer. Each such key SHALL have one direct-use choice for the installation: off, look-ups only, or look-ups and changes. The choice SHALL be off until the employer or a manager picks another, including on an installation that updates with people who already hold levels. A key that offers only Read SHALL offer off and look-ups only. Direct use SHALL need no app grant. Assistant discovery SHALL list a key's direct look-ups and direct changes only to a caller the choice and their level both permit. A key whose service is not set up SHALL offer no direct use.

#### Scenario: Direct use is off

- **WHEN** a person who holds Notion: Read & write sends a direct look-up while Notion's choice is off
- **THEN** the server refuses before any request leaves, names Notion and says direct use is off, and discovery lists no direct action for Notion

#### Scenario: The employer turns on look-ups only

- **WHEN** the employer picks look-ups only for Notion and saves, and a person with Notion: Read and no apps sends a direct look-up
- **THEN** the look-up runs and its answer is returned, and every app's actions stay refused for that person

#### Scenario: An installation updates with levels already held

- **WHEN** an installation where three people hold Notion: Read updates to a version with direct use
- **THEN** Notion's choice is off and none of the three can reach Notion directly until the employer picks another choice

### Requirement: The level and the choice together decide a direct request

The server SHALL judge every direct request by the caller's current level for the key and by the key's current choice, on each request and before any request leaves. Read SHALL permit a direct look-up when the choice is look-ups only or look-ups and changes. A direct change SHALL need Read & write and the choice look-ups and changes. A request SHALL count as a look-up only when it reads by the web's own rules, or is one the key's setup names as a look-up; every other request SHALL count as a change. The choice SHALL bind the employer and the verification service as it binds everyone. A refusal SHALL name the key and what is missing, the level or the choice, and SHALL reveal no key value. Until key levels have started, no direct request SHALL run.

#### Scenario: A person with Read tries a direct change

- **WHEN** Notion's choice is look-ups and changes and a person with Notion: Read sends a direct request that changes a page
- **THEN** the server refuses, names Notion and Read & write, and that person's direct look-ups still run

#### Scenario: The choice allows look-ups only

- **WHEN** Notion's choice is look-ups only and a person with Notion: Read & write sends a direct change
- **THEN** the server refuses and says direct changes are off for Notion

#### Scenario: A search the service sends as a change

- **WHEN** a key's setup names its search request as a look-up and a person with Read sends that search
- **THEN** it runs as a look-up, and the same kind of request to a path the setup does not name is judged as a change

#### Scenario: The choice is lowered during a session

- **WHEN** the employer sets a key's choice to off and a person sends their next direct request with the same valid session
- **THEN** that request is refused, with no logout needed

### Requirement: A direct request reaches only its own service and returns no key

The server SHALL send a direct request only to the address the key's setup names for its service, over HTTPS, and SHALL refuse a path that leaves that address. It SHALL add the key itself and SHALL NOT pass on a credential the caller sent. It SHALL follow no redirect. It SHALL bound the request and the answer in size and time, and SHALL refuse an answer over the bound with a message that says to narrow the request. It SHALL return the service's own status and answer, so a refusal by the service can be read, and SHALL return no answer that contains the key's value. Each direct request SHALL be recorded with who sent it, the key, whether it was a look-up or a change, and the request's method and path, and never its body, its query or the key. A change that times out SHALL be reported as outcome unknown and SHALL NOT be sent again by the server.

#### Scenario: A path that leaves the service

- **WHEN** a direct request names a path that would resolve outside the service's address, or names another host
- **THEN** it is refused and nothing is sent

#### Scenario: The service redirects

- **WHEN** the service answers a direct request with a redirect
- **THEN** the redirect is not followed, the key is sent nowhere else, and the caller gets a safe error

#### Scenario: The service refuses the request

- **WHEN** the service answers a direct look-up with its own not-found error
- **THEN** the caller receives that status and message, with no key in it

### Requirement: A key's direct-use setup is held to rules before publishing

A key's direct-use setup SHALL name one HTTPS address, which of the key's saved secrets is sent and in which request header, any fixed headers the service needs, and the requests that count as look-ups. A check SHALL fail before publishing, naming the key, when the address is not HTTPS, the secret is not one of the key's own, a look-up entry could match a path outside the address, or the key is one setup makes or the server's own route uses. The Cloudflare look-up key and Project code SHALL have no direct-use setup.

#### Scenario: A setup names another key's secret

- **WHEN** a change gives the Notion key a direct-use setup that sends the Stripe secret
- **THEN** the checks fail and name the Notion key, before the change can publish

### Requirement: The employer sees and sets direct use in Access

Access SHALL show each key's direct-use choice on the key's row and in the key opened, and the employer or a manager SHALL be able to set it there. The opened key SHALL say in words what the picked choice opens and how many people hold a level it reaches, before the save. A key whose service is not set up SHALL say so and how to get it set up, and SHALL offer no choice. Where a person or a role is opened, a key that is used directly SHALL say that its level also reaches the service directly. Only the employer or a manager SHALL change the choice. On a preview the choice SHALL be set against the practice list, with no effect on the live app. A choice SHALL never be marked by colour alone.

#### Scenario: The employer picks a choice

- **WHEN** the employer opens Notion, where three people hold Read, and picks look-ups only
- **THEN** the page says anyone with Read can look up anything the key can see and that this reaches three people, and after the save the Keys list shows the choice on Notion's row

#### Scenario: A key with no setup

- **WHEN** the employer opens a saved key whose service has no direct-use setup
- **THEN** the page says direct use is not set up for this key and to ask their assistant, and shows no choice

#### Scenario: An employee tries to change the choice

- **WHEN** an ordinary employee calls the operation that sets a key's choice
- **THEN** it is denied and the choice does not change

<!-- end specs/key-access/spec.md -->
<!-- file specs/skill-actions/spec.md utf8 1928 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Access works out who can run a skill

Access SHALL list each skill that declares company actions with what it needs: each area and key at the level its actions need, and Project code. A person or role SHALL count as able to run a skill only when their current areas and key levels cover all of it. A skill that declares a key's direct-use action SHALL also need that key's direct-use choice to permit the action, and SHALL count as one nobody can run while the choice does not. Access SHALL store no grant for a skill, and the server SHALL judge each call of a skill by the caller's areas and key levels alone, with the key's direct-use choice for a direct call. For each person or role that cannot run a skill, Access SHALL name what is missing, and SHALL name a direct-use choice that stops a skill once, for the skill, as the employer's to change. An installation with no such skill SHALL say so and say how to get one.

#### Scenario: A person lacks one thing a skill needs

- **WHEN** a skill changes things with Stripe and a person holds its area at Look up & change, Project code, and Stripe at Read
- **THEN** Access shows that person as unable to run the skill and names Stripe: Read & write as what is missing

#### Scenario: A person's level is lowered

- **WHEN** the employer lowers an area a skill needs from Look up & change to Look up for a role and saves
- **THEN** the skill shows as one the role's holders cannot run, and their next call of its changing action is refused

#### Scenario: A skill uses a key directly and direct use is off

- **WHEN** a skill declares Notion's direct look-up, Notion's direct-use choice is off, and a person holds Notion: Read and Project code
- **THEN** Access shows the skill as one nobody can run yet and names Notion: direct use is off, and after the employer picks look-ups only that person shows as able to run it

<!-- end specs/skill-actions/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-07

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 45026 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-07-direct-key-use</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-07-direct-key-use">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-07-direct-key-use</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today a teammate's assistant can only do work with a service that someone has already built into the app. Every new question, such as <i>find this page in Notion</i>, needs a build first. So people fall back to keeping the key on their own computer, where nobody can limit it, see its use, or take it away. That is what happened in Claymoo App: its Notion, Shade and Klaviyo skills read the key from the computer and work only on the owner's server.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A key can be used directly, through the app.</b> The assistant asks the app to pass one request on to the service. The app checks the person's level for that key, adds the key itself, and returns the answer. The key never reaches the person's device, each use is recorded with who made it, and lowering a person's level stops their next request.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">assistant ─▶ key on    assistant ─▶ the app ─▶ service</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">             your own       │         │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">             computer       ▼         ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">works only for you       their     level ok?</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                         login     +adds the key</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">                                   +records who</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>You switch it on per key, in Access.</b> Each key's page gets one choice: <i>Off</i>, <i>Look-ups only</i>, or <i>Look-ups and changes</i>. It is <i>Off</i> until you pick. The page says what the choice opens and how many people it reaches, because direct use makes a level mean more: <i>Notion: Read</i> then lets a person's assistant read everything that key can see. The Keys list shows the choice on the key's row. A key whose service can't be used this way yet says so, with no choice to make:</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                    AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌────────────────────────┐ ┌──────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Notion              ✕  │ │ Notion                ✕  │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Saved                  │ │ Saved                    │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ Used by Tasks: look up │ │ Used by Tasks: look up   │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│                        │ │                          │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│                        │ │+Direct use               │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│                        │ │+( ) Off                  │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│                        │ │+(•) Look-ups only        │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│                        │ │+( ) Look-ups and changes │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│                        │ │+Anyone with Read can look│</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│                        │ │+up anything this key can │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│                        │ │+see. 3 people today.     │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">│                        │ │                          │</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">│ Sales  [Read        ▾] │ │ Sales  [Read          ▾] │</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│ Kim    [None        ▾] │ │ Kim    [None          ▾] │</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│                        │ │                          │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│ [Save access] Cancel   │ │ [Save access] Cancel     │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">└────────────────────────┘ └──────────────────────────┘</span></pre></div></details><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-20" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-21" tabindex="0">│ Stripe                        ✕  │</span>
<span class="ln" data-note="item-2-line-22" tabindex="0">│ Saved                            │</span>
<span class="ln" data-note="item-2-line-23" tabindex="0">│ Nothing uses it yet              │</span>
<span class="ln" data-note="item-2-line-24" tabindex="0">│                                  │</span>
<span class="ln" data-note="item-2-line-25" tabindex="0">│ Direct use                       │</span>
<span class="ln" data-note="item-2-line-26" tabindex="0">│ Not set up for this key. Ask     │</span>
<span class="ln" data-note="item-2-line-27" tabindex="0">│ your assistant to add it.        │</span>
<span class="ln" data-note="item-2-line-28" tabindex="0">│                                  │</span>
<span class="ln" data-note="item-2-line-29" tabindex="0">│ Sales  [None                  ▾] │</span>
<span class="ln" data-note="item-2-line-30" tabindex="0">│ [Save access] Cancel             │</span>
<span class="ln" data-note="item-2-line-31" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A person's level decides what they can do with it.</b> <i>Read</i> passes on look-ups. <i>Read &amp; write</i> also passes on changes, and only when you chose <i>Look-ups and changes</i> for that key. A refusal says what is missing, such as <i>Notion: direct use is off</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">your choice    │ Read    │ Read &amp; write</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">───────────────┼─────────┼──────────────</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">Off            │ nothing │ nothing</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">Look-ups only  │ look up │ look up</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">Look-ups and   │ look up │ look up and</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">changes        │         │ change</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The app passes on only what is safe to pass.</b> A request goes to that service's own address and nowhere else, the answer is cut off at a fixed size, and no answer can carry the key back.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A skill can use a key this way, and Access still shows who can run it.</b> The Skills view names the key and the level as it does now, and says <i>direct use is off</i> when that is what stops the skill.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The assistant sets a service up when it saves the key.</b> WongStack ships with no service ready-made. When you give a new key, the assistant adds where that service lives and which of its requests only look things up, from the service's own guide. That goes out with a normal publish. Direct use still stays <i>Off</i> until you choose.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Building the work into the app stays the first choice</b> for anything you do again and again, or that touches money or customers. Only built work can limit a person to one area or one record. Direct use is for look-ups and one-off jobs nobody has built.</div></div></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether skills should reach a service by forwarding on the key or through built actions → chose both: built actions stay the default, forwarding is added per key.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked where forwarding is switched on for a key → chose in Access, per key: Off, Look-ups only, or Look-ups and changes, off until picked.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked which services forward out of the box → chose none; the assistant adds a service's details when it saves that key.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the screens call it <i>direct use</i>, because <i>forwarding</i> describes the plumbing and the owner is choosing whether an assistant may use the key directly.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the owner and a manager can both set the choice, because a manager already sets every key level and Access gives managers everything but managing managers.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: <i>Off</i> is off for the owner too, because one switch that means one thing is easier to trust, and the owner's own computer already holds the key.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: direct use needs no app ticked, only the key's level, because Cloudflare look-ups already work that way and a direct request belongs to no app.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: each key gets two actions, one for look-ups and one for changes, because the app already decides the level a call needs from what the action does, and a skill's list then shows which it uses.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a request counts as a look-up when it only reads by the web's own rules, or is on the key's short list of look-up requests, because some services search with a request that looks like a change; anything else needs Read &amp; write.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: only a service that takes one fixed key in a request header can be set up, because a key renewed through a sign-in needs code of its own.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: Cloudflare look-ups stay as they are, because their rules about stored data are stricter than a general pass-through and already live.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a preview keeps its own direct-use choice with its practice list, because a preview's Access already changes nothing on the live app.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a preview shows only a key that is not set up, and the first real direct request is made on a real install with a real key after publishing, because WongStack ships no service key and a practice one would need a second key list of its own; tests with a stand-in service cover the rest.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the Cloudflare look-up key and Project code say <i>Not offered for this key</i> and give no hint to ask, because neither can ever be set up for direct use and the hint would send the owner to ask for something that can't be done.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Built: the one linking clause planned for the secrets page was left out, because it pushed a save route's instructions past their word limit; the two key pages carry the guidance.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the save and the preview walk are publishing's own steps and no longer boxes in the task list, because they are the routine gate every publish runs; the list keeps what the walk should look at. A real direct request is unverified until a real install saves a real key.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Archived for publishing as 37.3.0; the checkpoint after this entry is the one that merges.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
