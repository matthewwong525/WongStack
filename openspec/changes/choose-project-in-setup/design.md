# Design

## Context

See [proposal.md](proposal.md). The first build (source gate `33762826`) implements per-app membership checks, discovery filtering, Cloudflare policy/session reconciliation, the standalone bootstrap, and the Access and Home screens. It also put management behind a private owner pin (`WONG_ACCESS_ACTIVATION`), a private rollout list (`WONG_ACCESS_ROLLOUT`), a committed latch (`WONG_ACCESS_POLICY`), a sealing key and a hand-made login-management record, driven by `scripts/employee-owner-setup.mjs`, and it refused every non-production environment. Nobody ran that ceremony, so the owner's own sign-in showed "People management is unavailable" on the preview and the live app had no Access at all.

This revision keeps the checks and reconciliation and removes the ceremony. Setup's provisioner (`.agents/skills/wong-setup/scripts/private-access.mjs`, `provision.mjs`) already knows the owner email, account, Access application, human policy and Worker IDs, and already mints a narrow deploy key; it now also supplies what Access needs.

## Goals / Non-Goals

Goals: the owner opens Access and it works; one save adds a person; previews are usable; existing teammates lose nothing; no hand-made private record.

Non-goals: repository access, memory enrollment, owner transfer inside the app, per-record roles, a scheduler, changes to the general verification workflow.

## Decisions

### 1. The owner is the email setup recorded

Add a committed, nonsecret `WONG_OWNER_EMAIL` to production and staging `vars`, beside the existing `CF_ACCESS_*` identifiers. The provisioner writes it for installs; this repo's `app/wrangler.jsonc` carries it directly. A request is the owner's when the Worker has verified its Access assertion (signature, issuer, audience, expiry, as today), the caller is a human and the lowercased email equals `WONG_OWNER_EMAIL`. Service tokens, git email, first visit and request bodies establish nothing.

Remove `WONG_ACCESS_ACTIVATION`, `/api/access/activate`, the origin and signed-subject pins, `activation.ts`, `scripts/employee-owner-setup.mjs` and the client `ownerSetup` operations. The first owner request creates the single `wong_access_installation` row if absent, filling its NOT NULL identifier columns from the environment; the row then holds only the revision and the permissions switch. The first-seen signed subject is written to the audit log, not compared.

Why not keep a private pin: the sign-in wall already trusts this email, and anyone who can change committed config can already publish any code. A second secret added a ceremony without a stronger boundary. Changing the owner stays a setup rerun.

`WONG_OWNER_EMAIL` absent means an older install: no policy database read, existing behavior, and Access says setup is not finished. An open site with no sign-in keeps reporting Access unavailable.

### 2. The built apps are the catalogue

Remove `WONG_ACCESS_ROLLOUT`, `rollout.ts`, and the `prepare` and `rollout` operations. `catalogue` (the built `app.json` folders) is the list. Owner reads and saves insert missing `wong_access_apps` rows; policy reads ignore grants for apps no longer built. Main-route access stays in `mainRouteInventory()` in reviewed code; an unmapped business route still denies employees. A newly built app is unticked for everyone but the owner.

### 3. Permissions start by themselves and take nothing away

Replace the `WONG_ACCESS_POLICY` latch with the database switch `policy_enabled`. While it is 0, every signed-in person keeps every app, as today, and the owner can already manage people.

On production the owner's first Access read, with the key present, reads the recorded human policy's emails, inserts each non-owner email as an active person with a grant for every built app, sets `policy_enabled = 1` and audits it, in one batch. With no key or a failed read, nothing changes and the switch stays 0, so nobody is locked out. On staging the first owner read sets the switch with no import. Once the switch is 1, an unavailable database denies business work; it never falls back to open.

### 4. One save admits the person

`POST /api/access/people` commits the person, grants and pending policy work as it does now, then takes the installation lease and reconciles in the same request, returning the status. Removal does the same for policy and sessions. The durable generation, lease and unknown-write handling stay; a failed step stays pending with *Try again*.

The key is the production-only secret `WONG_ACCESS_LOGIN_MANAGEMENT`, now `{ version: 2, token, accountId, policyId }`, read from the environment on each use. Remove `WONG_ACCESS_SEAL_KEY`, `seal.ts`, the sealed database copy, the stored policy template and `login/connect`. Each write reads the live policy, changes only its email list and sends the rest back unchanged; it still refuses a shared or reusable policy, an unknown allow policy, or an application that does not cover this Worker, and preserves the machine policy. Calls stay limited to the recorded application and human policy ([provider contract](cloudflare-contract.md)).

Staging holds no key and the core makes no provider call outside production. A practice save commits to the staging database and reports *Practice list*.

### 5. Setup supplies the key

The provisioner mints one account-scoped key with only `Access: Apps and Policies Write`, the same way it mints the deploy key, stores it as the production Worker's `WONG_ACCESS_LOGIN_MANAGEMENT` with the account and human policy identifiers, records the key's id in the install record for rotation, and never writes it to staging. A rerun reuses a recorded key. The server installer shares the provisioner. The deploy key is not reused and gains no Access write.

An existing install gets the same step from `/wong-sync`. When the saved Cloudflare token can not make keys, the step is declared missing and the person receives [the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link). For this repo's own live app the step is run once, as an outward action with a confirm, after publishing.

Secret tooling keeps one production-only name. `WONG_ACCESS_ACTIVATION`, `WONG_ACCESS_ROLLOUT`, `WONG_ACCESS_SEAL_KEY` and `WONG_ACCESS_POLICY` leave `.env.example`, `app/.dev.vars.example` and the tooling; none was ever set on a live app, so nothing is revoked.

### 6. Authorization stays consistent everywhere

Unchanged from the first build: one primary snapshot per request, described and bare routes, summaries, details, OpenAPI, conditional responses, app cards and direct navigation all use current grants; stricter action and record checks still apply; mini-app handlers receive no login-management binding. The verification service token keeps every built app once permissions start, on previews and live, so walks and the after-publish look still work; it is never the owner.

### 7. The prompt is always available

`/api/access/setup` answers any signed-in human: the owner, a current person, or anyone while permissions have not started. It returns their apps and the prompt when the reviewed bootstrap pins are valid. Home and Access show one *Connect your assistant* box. Removing the owner-setup operations changes the bootstrap bytes, so the final checkpoint pins a new immutable commit and digest ([distribution](../../../wiki/stack/employee-project.md#publish-checked-artifact-pins)).

## UX

### Use-case brief

The owner manages people a few times a month, often on a phone, usually when someone joins, changes role or leaves. Employees connect an assistant once per computer. Mirror the Home and Hello narrow-column forms and shared stylesheet. Done means the owner adds a person in one save and that person signs in and calls only their apps.

### Flow

Owner: open Access → *Add person* → email and apps → *Save access* → share the app link. Employee: sign in → *Copy setup prompt* → paste → approve the sign-in. First open with existing teammates shows them with every app. A missing key and a failed sign-in step are secondary states.

### Hierarchy

Access: *Add person*. Person form: *Save access*. Failed sign-in step: *Try again*. Removal: *Remove access*. One step left: *Copy that request*. Home and employee Access: *Copy setup prompt*. One primary action per state, labeled fields, keyboard focus, live status announcements, selectable fallback text. No operator panel, connection button or private-instructions copy.

### Review

[Review page](review.html). Items sketch Access before and after, the person form with its saved and failed states, one step left, first open, the preview practice list, the setup box and removal. Each fits phone width.

### Components

Shared header and app cards; loading, error and empty states; `CopyText`; people list with a per-person status line; person form; removal confirmation; practice banner; one-step-left notice; `AssistantSetup`. Loading reads *Loading people…*; a failed read reads *Access is unavailable* with *Retry*; a non-owner sees only their own setup box.

## Risks / Trade-offs

- The live app holds a key Cloudflare scopes to the whole account → the core calls only the recorded application and policy, refuses shared policies, and the key is production-only and separate from the deploy key. The owner accepted this.
- The owner is decided by committed config → anyone who can publish already controls the app; the owner email is visible in review.
- Permissions start without a button → the import gives existing people every app first, and a failed import leaves permissions off.
- A provider write can time out after applying → durable intent, generations and readback stay.
- Session removal signs everyone out → the removal confirm says so.
- A preview's practice people can not sign in unless the live list admits them → the practice banner says the real list is untouched.
- Skill instruction text has almost no headroom → the `/wong-sync` step must cut as many bytes as it adds.

## Migration Plan

Keep migrations `0001` and `0002` as applied; unused columns and tables stay inert. Update `schema/seed.sql` so staging starts with practice people under the new model. Remove the withdrawn modules, routes, script and secret names from this unshipped change. Ship the provisioner step, the update step, Access and bootstrap through the payload inventory; keep VERSION unchanged and revise the Next minor CHANGELOG entry.

Build everything first. Then one `/save` checkpoint runs the remote checks and returns a preview, where the owner can use Access for real with the practice list. After publishing, run the key step on the live app and check a real second person end to end.

## Open Questions

None for the build. Real owner and employee sign-in on the live app is checked after publishing.
