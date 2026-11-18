<!-- openspec-archive v1 2026-10-04-simple-machine-memory -->
<!-- file proposal.md utf8 9000 -->
# Simple machine memory

**Status:** ready-to-ship

**Branch:** durable-beaver

**Open questions:** none

## Why

Private memory should follow this machine across chats, and the normal website login should automatically identify who uses it. Keep today's automatic memory without making person login a requirement for using memory.

## What Changes

- **Private memory follows this installation.** A locally generated ID stays the same across sessions and linked workspaces. Team knowledge still belongs to this repository; names are labels only.
  ```text
  this installation ──▶ its private memory
          │
          ▼
     repo permission ──▶ shared team memory
  ```
- **Repo authorization includes shared memory.** Teammates authorized to contribute to this repository can contribute team memory without a separate memory or device approval. Existing setup or admin tooling installs each machine's repo secret; the assistant then loads and captures memory automatically. Choosing an ID or copying the project alone gives no access. Existing reader restrictions stay in place.
  ```text
  repo authorization ──▶ setup installs secret
                                  │
                                  ▼
                         automatic memory
  ```
- **The normal website login labels the machine automatically.** The app link setup already provides carries the machine context. Sign in normally and the verified login ID attaches to that machine's memory, including notes already stored under its ID. No matching code, extra button, or approval. Memory keeps working before login; the label never changes ownership or permissions. A plain site visit cannot identify an unlinked assistant machine.
  ```text
  setup's app link ──▶ normal email login
                              │
                              ▼
                   machine + verified login ID
  ```
- **BREAKING: existing keys need replacement; history stays intact.** Old shared knowledge remains available. Old private notes and transcripts stay available to the admin, without being assigned to a machine by matching a name or email. New secrets remain valid until the admin revokes or replaces them.
  ```text
  old shared notes ──▶ team
  old private notes ─▶ admin
  new private notes ─▶ owning machine + admin
  ```

**Non-goals:** Devices screens, matching codes, new person accounts, hosted memory services, a new storage protocol, and historical ownership remapping.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: machine ownership, trusted credential issuance, automatic website-login metadata, and the existing role/privacy rules applied to that owner.

## Impact

One new local identity helper, one small login-link handler, and one additive SQL migration over the existing key, fact, and session tables; no new database, bucket, binding, app page, or service. Expected implementation: about 15 runtime/schema files, 6 existing test/fixture files, and 8–12 documentation/release files (roughly 30–35 total), plus this plan. Most files already exist; the detail is in `design.md`. This is an estimate, not a one-file change.

## Decision log

- **2026-10-03** — Asked in the supplied brief: restart and simplify ownership to machine instead of user? → chose this fresh workspace on fetched main; the cancelled PR is neither a source nor a dependency.
- **2026-10-03** — Assumed: one random ID in the OS user's local WongStack data folder, because a repository-local ID would identify a clone rather than the installation.
- **2026-10-03** — Assumed: reuse the existing Cloudflare-authorized admin commands to issue and revoke repository keys, because main already uses them during installation and they need no Git-host permission check for memory.
- **2026-10-03** — Assumed: new keys last until explicit revocation or replacement, because the existing schema supports this and removing GitHub renewal should not add a second enrollment credential or renewal service.
- **2026-10-03** — Assumed: leave historic private ownership unassigned and replace old keys explicitly, because email and hostname cannot establish which installation owns that history.
- **2026-10-03** — Assumed: make the identity and privacy checks deterministic inside the existing hooks and store, because no new model process is needed.
- **2026-10-03** — Assumed: skip live memory lookup and all local suites during this plan, following the explicit planning boundary; read-only work discovery creates no dependency on the other sessions and sends them no messages.
- **2026-10-03** — Asked: should repo access be enough to contribute shared memory? → chose repo authorization as the policy, retaining the existing secret check and automatic memory after setup, with no separate memory/device approval; private ownership and existing reader restrictions remain.
- **2026-10-03** — Asked: which login should identify the person automatically? → chose the WongStack website's email login, with no extra action beyond normal sign-in; attach its verified login ID as machine metadata, not as a new memory permission or owner.
- **2026-10-03** — Assumed: carry machine context in the app link setup already supplies, because the website cannot read the assistant's OS-user ID file or infer a remote machine from a bare site visit; no extra user-facing linking flow is added.

- **2026-10-04** — Implementation decision: fresh setup issues credentials before the production Worker deploys. Trusted admin issuance seeds the same short-lived login-marker hash through its existing D1 authority and supplies the machine-context app URL; recipient import still validates the key and requests the marker from the Worker. Association unavailability is reported plainly and memory remains usable.

- **2026-10-04** — Check: `scripts/tests/memory-worker.test.mjs` replaces retired GitHub enrollment, account caps, renewal, and old-schema email fallback expectations with trusted machine issuance, revocation, schema refusal, and login-association coverage. Existing SQL/FTS bypass, capture/raw size and privacy, source, role, worktree, and redaction protections remain covered; no suite is skipped and no threshold is lowered.

- **2026-10-04** — Build checkpoint: the user invoked `/ship`. The bounded implementation and regression coverage are prepared; static release checks pass. Runtime tests, builds, and lint await CI. No live memory migration, credential issuance, or historical reassignment was performed.

- **2026-10-04** — Reconciled published main at `02542fa` before the CI checkpoint. Its independent-chat change is retained; the memory ownership baseline is unchanged. Preserved both release entries and the retirement registry changes. Session context is in this handoff; no duplicate memory facts were written.

- **2026-10-04** — First CI pass: app tests and deploy checks passed. Payload lint found an unused legacy prefix and a test request helper that could specify a GET body. Removed the unused constant and restricted the helper's body to PUT; checks remain unchanged. Payload runtime coverage awaits the retry.

- **2026-10-04** — Payload runtime retry ran 1,039 tests with five failures. Updated the storeless recent-chat fixture's machine state, the exact empty-spool assertion, the digest line-position assertion, and the ranking fixture's known owner. The existing managed-installer test now accepts a supplied verified website owner without requiring a git email, while keeping malformed-job/clone and website-policy checks. No search-ranking expectation, privacy protection, or coverage threshold was lowered.

- **2026-10-04** — CI gate passed for `722c65e` in PR #258 after two fixes: payload tests/coverage and release checks, app tests/coverage, and deployment all passed. Implementation tasks are complete. The final archive/release checkpoint will run the same gate. Production memory migration, credential replacement, and actual human email-login/provider-return verification remain rollout steps, not claimed by fixture coverage.

- **Check:** `scripts/retired-names.json` removes the former `member add` retirement entry because the reviewed plan deliberately restores this command for trusted machine issuance. It no longer promises GitHub enrollment; all other retired-name guards remain unchanged. `memory-areas.test.mjs` now verifies that changing author labels on the same machine preserves private ownership; cross-machine isolation remains in the Worker matrix.

- **2026-10-04** — Archive checkpoint: all implementation tasks passed the existing CI gate before archive. OpenSpec applied the memory deltas to the canonical specification; release numbering selected 30.0.0 from current main 29.17.0. The final release checkpoint runs the same CI gate. Live migration, replacement credentials, and a real human email-login return remain documented rollout checks.

<!-- end proposal.md -->
<!-- file design.md utf8 19556 -->
# Design

## Context

Baseline: this clean workspace matched freshly fetched `origin/main`, commit `ff05dde00fb1b7ac7de467bcf5fe9adac4b68178`. Main has migrations 0001–0006. See `proposal.md` for the product intent.

The actual ownership/auth paths are:

| Current code | Current behavior | Bounded adaptation |
|---|---|---|
| `scripts/lib/store.mjs` in the memory skill | Decodes email from the key; reads the primary checkout's credentials and Worker URL | Decode a machine credential, compare local ID, and expose ownership separately from author metadata |
| `scripts/lib/members.mjs` | Writes hashed keys using `CLOUDFLARE_API_TOKEN`; links GitHub admins | Reuse those direct admin writes for issuance, replacement, listing, and revocation by machine |
| `scripts/lib/join.mjs`, `scripts/session-start.mjs` | Calls GitHub enrollment and renewal | Install an already-issued credential; ordinary hooks report a missing credential and keep normal load/capture behavior |
| `worker/memory-worker.mjs`, `worker/statements.mjs` | Checks key hashes, role, email ownership, session writes, R2 prefixes, and filtered SQL | Check machine ownership using the same guards and batch protocol |
| `scripts/lib/digest.mjs`, `scripts/memory.mjs` | Narrow by email/people page; write author; retag/upkeep by author; store raw under email | Use machine ownership throughout these paths and retain attribution |
| `.agents/skills/wong-setup/scripts/provision.mjs` | Migrates then invokes `member admin` using the setup Cloudflare token | Keep that call; remove memory's GitHub/email prerequisite while preserving the site's existing login/setup requirements |

All abbreviated paths above are under `.agents/skills/memory/`. `scripts/lib/primary-root.mjs` already resolves linked worktrees: reuse it unchanged. `app/worker/access.ts` already verifies the website's signed identity and exposes its `claims`; reuse it unchanged. `app/worker/index.ts` currently sends memory requests straight to the memory handler before app login. It needs one narrow authenticated callback branch for optional login metadata; no app page or frontend change is needed.

## Goals / Non-Goals

One ownership field and the existing secret credential are sufficient for memory access. Optional website-login metadata adds a small automatic handoff. Keep the existing D1 batch/R2 protocol, hooks, background runner, search, redaction, role model, and repo isolation. No new service, enrollment table, approval workflow, receipt framework, cutover engine, or historical remapping command.

## Decisions

### Local identity

Add a small `scripts/lib/machine-id.mjs`. Generate a random UUID once in the OS user's WongStack data folder, independent of Git and any repo: use the user's local application-data directory on Windows and the user's data directory on Unix (`XDG_DATA_HOME` or `~/.local/share/wongstack`). Creation must be exclusive so concurrent first starts read the same complete ID; a corrupt existing file must stop identity-dependent work, never silently generate another owner. Keep it private on disk and outside git. No new environment credential is required.

Expose the ID lazily from `repoContext`; ownership never comes from hostname, git email, browser data, or a people page. The current hostname may remain display metadata. One OS-user installation has one ID across repositories, sessions, and linked worktrees, but a separate secret per repo. Losing this file creates a new installation identity; restoring ownership is an explicit admin matter.

### Add ownership without rewriting authors

One newly authored migration, provisionally `0007_machine_ownership.sql`, adds nullable `owner_machine_id` to `facts` and `sessions` and `machine_id` to `memory_keys`, plus indexes and guards against changing recorded ownership. The same migration adds three nullable key-row fields for optional association: `login_identity` (JSON containing verified issuer, subject, email, and link time), `login_link_hash`, and `login_link_expires_at`. Keep existing author, key email, hostname, shared flag, and legacy GitHub columns; the key email column can retain a non-authoritative optional label. No new tables and no changes to migrations 0001–0006. Do not backfill ownership from old email/machine values.

New fact/session writes carry machine ownership separately from author metadata. Adapt the existing permitted write templates and server checks; a submitted ID cannot override the key's stored owner. A member cannot modify another machine's session or supersede its fact. Retag/upkeep must preserve both original owner and author when restating a fact; admin restatement of legacy facts must preserve null ownership rather than accidentally claiming them.

### Permission and issuance

Repository authorization is the policy for shared-memory contribution: a teammate authorized to contribute to this repository receives a member credential through the existing trusted setup/admin tooling, without a second memory-access or device-approval decision. Issuance installs the credential that lets the remote store recognize that authorization; it does not introduce a separate approval workflow. Read-only access keeps the existing reader role and its unshared-write restriction. A checkout or claimed ID alone does not prove authorization. Keep credentials per machine so repo authorization does not expose another machine's private memory.

Keep `CLOUDFLARE_MEMORY_TOKEN`, the `wongm_` key family, random secret material, SHA-256 storage in `memory_keys`, and the primary `.env`/Worker URL convention. Distinguish machine payloads from legacy email payloads in the key parser, and fail clearly on an unsupported/malformed key instead of treating it as a Cloudflare API credential. Encoding a machine ID in a key is client metadata; the Worker trusts only the hashed credential row.

`member admin` uses the existing trusted Cloudflare token to issue this installation's admin key directly into the primary ignored `.env`. No GitHub lookup or person login is involved in memory authorization. An admin's `member add <machine-id> --role member|reader --key-file <private-path>` issues a repository credential for another installation; default role is member, reader uses the existing `reader` flag. Store only its hash on the server and save the secret to a restricted, untracked transfer file without printing it. The recipient uses `join --file <private-path>` to validate that credential against the primary recorded Worker and its local ID, then install it in the primary `.env`. Use an existing private channel for transfer; do not build a transfer service or put the credential in chat. Optional labels affect display only.

`member remove <machine-id>` invalidates all that machine's keys in this repo; replacement revokes earlier keys for that ID here, preserving ownership. Use the existing expiry field to mark old keys revoked and clear any pending login marker, retaining their identity metadata so stored records remain identifiable after revocation. `member list` shows IDs, labels, roles, and revoked status without secrets. Admin issuance remains gated by `CLOUDFLARE_API_TOKEN` D1 Write, as on main; ordinary memory keys cannot edit their own authorization grants. No anonymous or GitHub-based `/join` remains. No arbitrary clone can self-issue a key. New keys have no scheduled expiry (`expires_at = NULL`, already supported by the schema); explicit revocation/replacement stops them immediately. This deliberately removes GitHub's 30-day renewal and account-based key cap, without creating a renewal credential or service.

### Automatic website-login association

Use the existing Cloudflare Access human login. The stable person identifier is its verified `iss` plus nonempty `sub`; verified email is display metadata. Do not use a typed email or service-token `common_name`, and do not change the app's existing authentication validator. Cloudflare documents these claims in its [application-token reference](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/).

The connection must carry the assistant installation's identity: website login alone identifies a browser user, not the OS-user installation where chats run. Trusted setup seeds a marker hash directly when issuing its admin key, using its existing D1 provisioning authority and recorded production URL, because the first Worker deploy follows provisioning. A recipient credential install validates a working production memory key, then automatically requests a short-lived, one-use association marker through a narrowly scoped `POST /_memory/login-link`. The Worker validates the existing machine credential, stores only the marker hash/expiry on its key row, and returns the normal production app URL with a `memory_login_link` query parameter. Use 24 hours for the initial link; issue a fresh one as part of a later credential-install/setup run if needed. This marker can only attach login metadata; it cannot read memory, issue credentials, select another machine, or alter roles/ownership.

Use this URL in place of the app link the person already opens during normal setup. There is no separate linking command for the person, code, button, screen, or extra login. A phone opening the same link identifies the assistant machine carried by that link, not the phone itself. The link is personal to that installation; forwarding it can label the installation with the recipient's verified login, so it must not be presented as evidence that that person authored every past note.

After normal Access sign-in returns to that app URL, `app/worker/index.ts` passes the already-verified human identity and marker to a small memory-owned `worker/login-link.mjs` handler. Atomically attach the `iss`/`sub`/email metadata to the matching active machine key and clear the marker hash/expiry, then redirect to the clean root URL with no marker. This callback is behind existing app authentication, not the public memory-key bypass. Keep the marker out of application logs and reusable memory credentials out of URLs; add a marker shape to existing transcript/fact redaction if it is not already covered. Successful linking is idempotent; an expired, revoked, invalid, or replayed marker changes nothing. No production memory binding, open-without-login mode, a service identity, or missing verified subject must produce no association and no permission change.

Once linked, use machine metadata to display the associated login identity alongside that machine's records, including records stored before the association. `member list` provides the existing admin lookup; normal memory responses can expose the current caller's sanitized login metadata, never key hashes or markers. Keep original fact/session authors untouched. Key replacement for the same machine preserves existing association metadata but invalidates pending markers; revocation retains metadata while stopping the key and marker. Repeated sign-in as the same subject preserves the link. A different subject must not silently replace an established link; memory continues under its machine owner, with any correction left to the existing trusted admin tooling. Multiple machines may carry the same login ID, but this does not merge their private memories or claim unowned legacy data.

Ordinary bookmarked/bare site visits with no machine context cannot create a new association and must not guess one. Previously stored associations remain useful for identifying existing records. Memory load/capture works regardless of login or association success. Browser-return query preservation and the clean redirect are validation targets; do not report an association succeeded without a stored verified subject.

### Privacy and automatic operation

For machine grants, always enforce the existing private/shared split, even when revocation leaves only one machine key. Shared nonpersonal facts remain repository-wide; `user`, `feedback`, and reader-written unshared facts are visible only to their owner and admins. Narrow admin digest/search defaults by machine ID; retain admin `--everyone`. People-page/email lookup can remain presentation context but never expands permissions. Protect session reads as well as writes using the existing SQL shadow technique, including its schema/FTS bypass restrictions.

New raw objects use `sessions/<machine-id>/<agent>/<session>.jsonl`; the Worker permits the matching credential owner or admin. Existing email-prefixed objects stay where they are and are admin-readable. A machine grant cannot write to legacy prefixes, overwrite a legacy session, or resume an unowned historical session. Before raw upload/capture, check the session ledger; a filtered-out historic session must not be treated as new, and an existing `private` session permits no upload or capture. Keep redaction, size caps, and operation without R2.

Keep normal SessionStart and capture schedules, bounds, and failure/spool behavior. After setup installs the repo credential, ordinary sessions automatically read and write permitted memory without further approval or manual enrollment. Replace background GitHub enrollment with a short instruction to obtain/install a repo credential when missing; do not repeatedly run a failing join. Partition the existing local state/cache by local machine ID so a prior digest, pending capture, or spool is not silently adopted under a new owner. Stamp the existing session registry with that ID and let automatic capture select its registered sessions; unregistered historical transcripts are not imported by discovery into new ownership. Existing legacy cache/spool files remain untouched; historical handling is separate. A denied credential must not trigger cached private-memory fallback; genuine offline failure retains it. No new runner is needed.

## File and Schema Scope

Approximately 15 runtime/schema files: the new identity helper, migration, and `worker/login-link.mjs`; existing `store.mjs`, `members.mjs`, `join.mjs`, `digest.mjs`, `transcripts.mjs`, `memory.mjs`, `session-start.mjs`, `memory-worker.mjs`, `statements.mjs`, `memory-worker.d.mts`, setup's `provision.mjs`, and `app/worker/index.ts`. A redaction-pattern change in `scripts/lib/scan.mjs` may add one file if necessary. No frontend change is expected.

Reuse approximately 6 existing test/fixture files: `scripts/tests/memory-worker.test.mjs`, `memory-store.test.mjs`, `memory-capture.test.mjs`, `provision.test.mjs`, `fixtures/memory/harness.mjs`, and `app/worker/index.test.ts`. Existing SQL/Worker fixtures remain the test mechanism; no receipt/snapshot framework or new suite.

Supporting edits are limited to existing explanations that currently promise GitHub enrollment/email ownership: memory skill, `wiki/development/memory.md`, `memory-key.md`, `required-tools.md`, development README, setup's `references/cloudflare.md` and `references/tools.md`, the memory sentence in `wiki/stack/cloudflare-access.md`, `.env.example`, the payload manifest's migration hand step if needed, and `CHANGELOG.md`. Preserve referenced heading anchors even where old enrollment text changes. Memory ships as a whole skill folder, so no new per-file payload registry is expected.

## Risks / Trade-offs

- Long-lived credentials retain permission until revoked → explicit replacement/removal, hash-only server storage, and private file handling; changing repo membership elsewhere no longer revokes memory.
- An OS account used by several people shares one private memory owner → state this openly; another OS account/installation gets another ID. Copying both ID and credential gives the same access, as copying a bearer credential does today.
- Old private history does not appear automatically → preserve rows/objects and admin access; do not guess a machine owner. Shared history continues to load.
- Old keys stop working in the updated Worker → give a clear replacement message and require trusted admin issuance; retain local work while memory is unavailable.
- A plain website login contains no assistant machine identity → link automatically through the normal setup-supplied app URL; preserve unlabelled machine memory on unrelated visits or association failure rather than guess an owner.
- A login identifies who used that link, not who authored all notes → store association as optional metadata and preserve original authors, machine ownership, and access rules.

## Migration Plan

Implementation prepares the additive migration and the installation instructions only. A later authorized rollout deploys the reviewed Worker, runs the existing admin migration command, and issues replacement machine credentials. The new handler refuses keys without a machine grant and refuses a missing ownership schema; it never falls back to email ownership. Do not auto-link GitHub admins while applying old schema migrations to a fresh store. Existing old key rows may be retained for history but have no authority in the new handler.

This entails a brief memory gap until migration and issuance finish; cached/spooled work must not bypass owner checks. Installation calls the same migrate/admin sequence it already uses. No old private rows or R2 objects are rewritten, deleted, or automatically associated. A later decision can explicitly recover historical ownership separately.

The schema is additive: rollback retains rows/objects and extra columns. Do not roll back to a Worker that ignores machine ownership after new private writes exist; suspend memory until a compatible handler is restored. No automated rollback/cutover machinery is included.

## Validation

Use the existing fixtures to cover: stable/concurrent ID creation across sessions and worktrees; differing OS-user stores; same email/hostname on two IDs cannot expose private facts/raw or supersede each other's facts; shared facts remain repo-scoped; reader writes stay private; an admin defaults to its machine and can explicitly widen; arbitrary IDs/clones without a credential are denied; cross-repo keys and revoked keys fail; installation issuance and credential import need no GitHub; malformed/legacy keys cannot be interpreted as Cloudflare tokens; legacy private rows/raw remain unclaimed and admin-readable; retag preserves owner/author; unowned sessions and old cache/spool cannot be adopted. Retain existing capture, redaction, no-R2, and SQL guard tests.

Run these through the normal later `/save` CI gate, including payload link/config checks and context-budget checks for edited skill text. Planning runs only OpenSpec validation and review-page generation: no live memory command, suite, build, lint, resource provisioning, push, deployment, or helper agent. Review page: [review.html](review.html).

Extend the same tests for automatic association after normal verified email login, stable issuer/subject despite email changes, existing records displaying associated metadata without author rewrites, wrong/replayed/expired/revoked marker rejection, concurrent one-use completion, no reassignment by a different subject, service/anonymous/open-site/preview refusal, and memory working before login. Verify a marker can never authorize memory reads or changes to roles, owners, or another repository. The later normal human-login check must verify the machine context survives the provider return and that the URL is cleaned; a fixture-only pass cannot establish that provider behavior. No live check runs during planning.

<!-- end design.md -->
<!-- file tasks.md utf8 5575 -->
# Tasks

## 1. Memory identity and ownership

- [x] 1.1 Add the local machine-ID helper and the single additive ownership migration; adapt context, fact/session statements, and machine-owned local state/registry in the existing memory scripts. Extend `memory-store.test.mjs`, `memory-capture.test.mjs`, and their harness for concurrent/stable identity, worktree reuse, unassigned historical ownership, and no adoption of legacy cache/spool/transcripts. Update the ownership sections of `wiki/development/memory.md`. Verify the schema preserves existing bodies/authors/raw references and the planned identity cases are covered in the existing tests; execution is through later `/save` CI.
- [x] 1.2 Replace email ownership in Worker filtering, session guards, supersedes, raw paths, admin-default reads, and retag/upkeep with the stored machine owner. Update the declaration file. Extend existing worker/store tests for same-email/hostname isolation, reader privacy, shared facts, raw isolation, SQL bypass guards, admin widening, and preserved restatement ownership. Verify no machine grant can read/write historical private records or another machine's private memory; retain existing redaction/capture/no-R2 cases and document the defaults in `memory.md`/`memory-key.md`.

## 2. Existing credential and installation commands

- [x] 2.1 Adapt `members.mjs` and `join.mjs` to trusted machine-key issuance, private-file installation, replacement, listing, and immediate revocation; remove the GitHub enrollment route and account/expiry-renewal policy. Preserve the existing token name, key hash table, primary `.env`, and trusted Worker URL. Extend existing worker/store tests to verify arbitrary-ID denial, wrong-repo/local-ID rejection, revoked-key denial, insufficient admin permission, no secret output, and clear legacy-key/schema failures. Update the memory skill, key documentation, and `.env.example`; verify no memory authorization path depends on GitHub or person labels.
- [x] 2.2 Keep normal hooks and background capture, report missing credentials without GitHub autojoins, and preserve offline fallback without using cached private memory after an authorization refusal. Keep setup's existing migrate/admin command sequence while removing memory's email/GitHub requirement and schema-5 auto-linking. Extend capture/provision tests for local admin issuance without GitHub and an authorized member installation automatically loading and contributing shared memory without a separate memory/device approval; retain reader/private restrictions. Update setup's runbook/tools, required-tools guidance, development README, and the memory-auth sentence in the Access doc to state repo authorization is the policy and the repo secret proves it to the store; verify the site's current login/hosting behavior remains intact.
- [x] 2.3 Add the small memory-owned login-link handler and authenticated callback branch in `app/worker/index.ts`, using the existing signed Access identity unchanged. Have setup/credential installation automatically supply a machine-context app URL for normal login, storing only marker hash/expiry and verified issuer/subject metadata in the same migration/key table. Preserve association metadata on credential rotation/revocation and expose it through the existing admin list/current-caller response without rewriting authors. Extend existing memory worker/store/capture/provision and app Worker routing tests for normal automatic association, previous machine-owned records, replay/expiry/revocation/concurrency, other-person/service/anonymous/open-site/preview refusals, redaction, clean redirect, and unchanged machine privacy/roles. Update the memory skill, key docs, setup runbook, and Access doc to explain that ordinary login through the supplied app link labels the machine, while plain unrelated visits cannot identify one. Verify no frontend screen, person enrollment flow, new binding, or live resource is introduced; actual provider-return behavior is checked during the later authorized normal human-login rollout check, never during planning.

## 3. Release and integration

- [x] 3.1 Add `## Next (major) — Machine-owned memory` to `CHANGELOG.md`, explaining replacement keys, unassigned historical private memory, and automatic website-login labels in the Updating note; leave `VERSION` untouched. Update the payload manifest's migration hand step and narrow app-scaffold callback adaptation only as needed. Verify the docs retain existing linked anchors and describe the trusted issuance steps without promising a historical remapper or additional service.
- [x] 3.2 Use `/save` only after a later build is authorized to complete the existing CI gate: memory worker/store/capture/provision coverage, app Worker authentication/routing coverage, and payload links, OpenSpec config, and skill context-budget checks. Reconcile relevant published changes in the shared memory files before later publication. Confirm the branch contains only this bounded change and no cancelled implementation; report results before any publishing decision. This task does not authorize live migration, credential creation, deployment, or publication during planning.

Validation (2026-10-04): the existing CI gate passed at `722c65e` in PR #258 after two fixes, including payload tests/coverage and release checks, app tests/coverage, and deployment. No local suite, build, or lint ran. No live memory resources, credentials, or migration were created. Actual human email-login/provider-return verification remains the documented rollout check.

<!-- end tasks.md -->
<!-- file specs/memory/spec.md utf8 15836 -->
## ADDED Requirements

### Requirement: Private memory belongs to an installation

Private memory SHALL belong to a stable, randomly generated local OS-user installation ID reused across sessions, linked worktrees, and repositories. Each repository SHALL retain its independent store and secret credential. Hostnames, git authorship, emails, browser data, and optional labels SHALL NOT establish ownership or permission. Normal assistant sessions SHALL retain automatic memory loading and capture once authorized.

#### Scenario: Another session or linked worktree

- **WHEN** an authorized installation starts a normal chat or resumes in a linked worktree
- **THEN** it uses the same machine owner and automatically loads and captures memory through the existing hooks

#### Scenario: Matching names on another machine

- **WHEN** two installations use the same email or hostname, including when one copies a repository
- **THEN** their private memory remains separate, and choosing the other's ID without its repo secret grants no access

### Requirement: Installation setup and trusted admins issue machine credentials

Repository authorization SHALL be sufficient policy for memory access, with no separate memory or device approval: authorized repository contributors SHALL receive member credentials through the existing trusted setup/admin tooling and SHALL be able to contribute shared memory. Read-only access SHALL retain the existing reader role and unshared-write restriction. Only trusted installation setup or an administrator using the repository's existing provisioning authority SHALL issue, replace, or revoke memory credentials and assign admin, member, or reader roles. Credential ownership SHALL be bound to the machine recorded with its server-side hash. Labels SHALL be metadata only. No Git-host check, person login, device approval screen, hosted account, or extra service SHALL be required for memory. The credential SHALL reach only a private transfer file or the target's ignored primary credential file, never chat, logs, git, or CI secrets. A recipient SHALL install only a credential for its local machine and the configured repository. Once installed, permitted memory loading and capture SHALL operate automatically in ordinary chats without further approval or enrollment. New credentials SHALL remain valid until revoked or replaced; replacement/removal SHALL refuse all earlier affected credentials on their next request. Listing SHALL reveal no secrets; insufficient provisioning permission SHALL stop without changing grants.

#### Scenario: Normal installation and a teammate

- **WHEN** trusted setup issues its local admin key or a trusted admin issues a member or reader credential for a teammate's installation
- **THEN** each credential opens only its repository with its assigned role and machine owner, and an authorized contributor's ordinary chats automatically load and contribute permitted shared memory without a separate memory approval, GitHub check, or person sign-in for memory

#### Scenario: Unauthorized enrollment or revocation

- **WHEN** a clone without a valid secret requests memory or issuance, or a revoked/replaced credential requests memory
- **THEN** the request is denied without granting access, issuing a key, or adopting a supplied machine ID

### Requirement: Website login identifies a machine automatically

The normal WongStack website login SHALL automatically associate its verified login issuer and subject with the authorized assistant machine carried by the setup-supplied app link. Completing ordinary email login SHALL require no matching code, extra screen, button, or separate approval. Email SHALL be display metadata, not the stable identity or permission. Association SHALL identify the machine alongside records already stored under that machine ID without rewriting original authors or transferring ownership. Memory SHALL keep working before login and if association fails. Login association SHALL NOT grant memory access, change roles, combine different machines' private memory, or claim historical records with no machine owner.

#### Scenario: Normal login after notes were stored

- **WHEN** a person opens the app link supplied for their authorized assistant installation and completes the website's normal email login
- **THEN** its verified login ID is associated with that machine automatically, existing machine-owned notes can be identified through that association, the person reaches the usual app without an extra step, and memory permissions and original authors remain unchanged

#### Scenario: Missing context or invalid association

- **WHEN** a website visit has no machine context, uses an invalid, expired, replayed, or revoked association marker, lacks a verified human login ID, or attempts to replace an established link with a different person
- **THEN** no machine identity or permission is inferred or reassigned, unrelated private memory stays inaccessible, and permitted machine memory continues independently of the association

### Requirement: Historic private data is not automatically claimed

An ownership update SHALL preserve authored history and stored raw objects. Existing credentials without machine ownership SHALL require trusted replacement and SHALL NOT gain machine authority by matching email or hostname. Legacy private facts and sources SHALL remain admin-readable and SHALL NOT be automatically reassigned. Unowned historic sessions, old local caches, and spooled work SHALL NOT be silently adopted under a new owner; ownership remapping SHALL remain outside this change.

#### Scenario: A fresh ID matches historic metadata

- **WHEN** a newly authorized installation shares an old author's email or hostname
- **THEN** shared history remains available but historical private memory is not assigned to that machine, and the admin retains explicit access

#### Scenario: A historic fact is restated

- **WHEN** authorized upkeep restates a historic fact
- **THEN** the new fact preserves its author and original ownership, including unassigned ownership, rather than claiming it for the admin's machine

## REMOVED Requirements

### Requirement: A person with GitHub access joins memory

**Reason:** Repository permissions for memory come from trusted setup/admin-issued machine credentials.
**Migration:** Replace existing keys through trusted admin issuance; install the replacement into the primary ignored credential file. Missing credentials prompt for that step instead of GitHub enrollment.

### Requirement: The admin's key is tied to their GitHub account

**Reason:** The existing provisioning authority issues machine credentials and roles directly; a GitHub account no longer decides admin status.
**Migration:** Keep the existing provisioning token and admin command mechanism; replace old admin/member keys with machine-owned credentials. Preserve legacy account metadata without using it as permission.

### Requirement: A GitHub account, not an email, decides admin and key count

**Reason:** Explicit machine authorization and revocation replace GitHub admin matching and account-based key limits.
**Migration:** List, replace, and remove credentials by machine ID in this repository; no automatic account cap or GitHub renewal remains.

## MODIFIED Requirements

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A word SHALL match its other forms (*previews* finds *preview*, *checked* finds *check*), and common filler words in a query SHALL NOT match on their own. A shipped set of questions, each with the facts it must find, SHALL guard this in CI. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and its author metadata (a full email when recorded as an email, otherwise a label or machine ID), in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: A question in other word forms

- **WHEN** a live fact says "probe every Worker route on the preview" and the agent searches `how should previews be checked`
- **THEN** that fact ranks in the first three results, and a fact sharing only *how* or *should* does not

#### Scenario: Two authors share a name

- **WHEN** `operations@example.com` and `operations@example.org` each wrote a live fact
- **THEN** each fact's line names its author's whole email, so the two never read as one person

#### Scenario: A session's branch was renamed

- **WHEN** a session started on branch `magical-chicken`, wrote a fact on change `add-home-repo` and a fact on topic `paseo`, and the branch became `explore/home-mode`
- **THEN** a search by branch `explore/home-mode` and change `add-home-repo` returns both facts

### Requirement: Transcripts are kept and traceable

With a bucket, each captured session's full transcript up to 50 MB SHALL be kept with no expiry, and a reader SHALL be able to follow a fact to its session's text. A member or reader SHALL read only transcripts owned by their credential's machine, and the admin every transcript in the repo. The Worker SHALL refuse a transcript over 50 MB from any key; that session's facts SHALL still be captured, and a request for its transcript SHALL say it was too large to keep.

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a teammate's fact
- **THEN** no transcript is shown, and the skill says only the owning machine and the admin can read it

#### Scenario: A session over the size limit

- **WHEN** a captured session's transcript is 60 MB
- **THEN** its facts are saved, no transcript is stored, and asking for its source names the 50 MB limit

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's, so a branch cannot redirect a key. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: A branch names another memory address

- **WHEN** a session starts in a worktree whose branch changed the recorded memory Worker address
- **THEN** the key and any credential validation go only to the primary checkout's address, and the digest says the branch's address was ignored

### Requirement: Teammates cannot change or hide each other's facts

A member or reader key SHALL write facts only for its stored machine owner and SHALL supersede only facts with that owner, with its own new fact in the same write; a supersede aimed at another machine's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only the admin key SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another machine owner, overwrites another machine's or an unowned historical session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact claiming Bo's machine owner
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader key only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the credential's machine, however the read is written and even when only one machine remains authorized. Machine IDs, emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. The admin's key SHALL retain access to every fact; its default digest and search SHALL narrow personal and unshared facts to its own machine, and only its explicit `--everyone` SHALL widen that view.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member key sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

### Requirement: Earlier migrated records stay readable

Facts, sessions, author attribution, and note text from earlier migrations SHALL stay unchanged. Shared history SHALL remain readable to the team; private or unowned historical sources SHALL remain available to the admin without automatic assignment to a machine. The skill SHALL offer no command that imports `notes/` files.

#### Scenario: A migrated fact

- **WHEN** a store holds a fact migrated from a note
- **THEN** permitted search shows it and an admin can print its historical note text

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, author, and machine ownership (including unassigned historical ownership), plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another machine owner or unassigned ownership. Upkeep SHALL re-tag, through this restate, a live fact whose words name a path in a mapped folder and that lacks that area's tag, and an open thread whose words name a verb's run and that lacks the verb's tag. Consolidation MAY re-tag a fact whose area or verb needs judgment to read.

#### Scenario: An old warning gains its area

- **WHEN** upkeep finds fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, naming `app/worker/` with no `worker` tag
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, the original machine ownership, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live

<!-- end specs/memory/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-03

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 42478 fence=~~~ -->
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
<title>Review · 2026-10-04-simple-machine-memory</title>
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
<body data-change="2026-10-04-simple-machine-memory">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-simple-machine-memory</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Private memory should follow this machine across chats, and the normal website login should automatically identify who uses it. Keep today's automatic memory without making person login a requirement for using memory.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Private memory follows this installation.</b> A locally generated ID stays the same across sessions and linked workspaces. Team knowledge still belongs to this repository; names are labels only.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">this installation ──▶ its private memory</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">   repo permission ──▶ shared team memory</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Repo authorization includes shared memory.</b> Teammates authorized to contribute to this repository can contribute team memory without a separate memory or device approval. Existing setup or admin tooling installs each machine's repo secret; the assistant then loads and captures memory automatically. Choosing an ID or copying the project alone gives no access. Existing reader restrictions stay in place.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">repo authorization ──▶ setup installs secret</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                                │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                                ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">                       automatic memory</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The normal website login labels the machine automatically.</b> The app link setup already provides carries the machine context. Sign in normally and the verified login ID attaches to that machine's memory, including notes already stored under its ID. No matching code, extra button, or approval. Memory keeps working before login; the label never changes ownership or permissions. A plain site visit cannot identify an unlinked assistant machine.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">setup's app link ──▶ normal email login</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                            │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                            ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">                 machine + verified login ID</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>BREAKING: existing keys need replacement; history stays intact.</b> Old shared knowledge remains available. Old private notes and transcripts stay available to the admin, without being assigned to a machine by matching a name or email. New secrets remain valid until the admin revokes or replaces them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">old shared notes ──▶ team</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">old private notes ─▶ admin</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">new private notes ─▶ owning machine + admin</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> Devices screens, matching codes, new person accounts, hosted memory services, a new storage protocol, and historical ownership remapping.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked in the supplied brief: restart and simplify ownership to machine instead of user? → chose this fresh workspace on fetched main; the cancelled PR is neither a source nor a dependency.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: one random ID in the OS user's local WongStack data folder, because a repository-local ID would identify a clone rather than the installation.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: reuse the existing Cloudflare-authorized admin commands to issue and revoke repository keys, because main already uses them during installation and they need no Git-host permission check for memory.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: new keys last until explicit revocation or replacement, because the existing schema supports this and removing GitHub renewal should not add a second enrollment credential or renewal service.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: leave historic private ownership unassigned and replace old keys explicitly, because email and hostname cannot establish which installation owns that history.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: make the identity and privacy checks deterministic inside the existing hooks and store, because no new model process is needed.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: skip live memory lookup and all local suites during this plan, following the explicit planning boundary; read-only work discovery creates no dependency on the other sessions and sends them no messages.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked: should repo access be enough to contribute shared memory? → chose repo authorization as the policy, retaining the existing secret check and automatic memory after setup, with no separate memory/device approval; private ownership and existing reader restrictions remain.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked: which login should identify the person automatically? → chose the WongStack website's email login, with no extra action beyond normal sign-in; attach its verified login ID as machine metadata, not as a new memory permission or owner.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: carry machine context in the app link setup already supplies, because the website cannot read the assistant's OS-user ID file or infer a remote machine from a bare site visit; no extra user-facing linking flow is added.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Implementation decision: fresh setup issues credentials before the production Worker deploys. Trusted admin issuance seeds the same short-lived login-marker hash through its existing D1 authority and supplies the machine-context app URL; recipient import still validates the key and requests the marker from the Worker. Association unavailability is reported plainly and memory remains usable.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/memory-worker.test.mjs</code> replaces retired GitHub enrollment, account caps, renewal, and old-schema email fallback expectations with trusted machine issuance, revocation, schema refusal, and login-association coverage. Existing SQL/FTS bypass, capture/raw size and privacy, source, role, worktree, and redaction protections remain covered; no suite is skipped and no threshold is lowered.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Build checkpoint: the user invoked <code>/ship</code>. The bounded implementation and regression coverage are prepared; static release checks pass. Runtime tests, builds, and lint await CI. No live memory migration, credential issuance, or historical reassignment was performed.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Reconciled published main at <code>02542fa</code> before the CI checkpoint. Its independent-chat change is retained; the memory ownership baseline is unchanged. Preserved both release entries and the retirement registry changes. Session context is in this handoff; no duplicate memory facts were written.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>First CI pass: app tests and deploy checks passed. Payload lint found an unused legacy prefix and a test request helper that could specify a GET body. Removed the unused constant and restricted the helper's body to PUT; checks remain unchanged. Payload runtime coverage awaits the retry.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Payload runtime retry ran 1,039 tests with five failures. Updated the storeless recent-chat fixture's machine state, the exact empty-spool assertion, the digest line-position assertion, and the ranking fixture's known owner. The existing managed-installer test now accepts a supplied verified website owner without requiring a git email, while keeping malformed-job/clone and website-policy checks. No search-ranking expectation, privacy protection, or coverage threshold was lowered.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>CI gate passed for <code>722c65e</code> in PR #258 after two fixes: payload tests/coverage and release checks, app tests/coverage, and deployment all passed. Implementation tasks are complete. The final archive/release checkpoint will run the same gate. Production memory migration, credential replacement, and actual human email-login/provider-return verification remain rollout steps, not claimed by fixture coverage.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>Check:</b> <code>scripts/retired-names.json</code> removes the former <code>member add</code> retirement entry because the reviewed plan deliberately restores this command for trusted machine issuance. It no longer promises GitHub enrollment; all other retired-name guards remain unchanged. <code>memory-areas.test.mjs</code> now verifies that changing author labels on the same machine preserves private ownership; cross-machine isolation remains in the Worker matrix.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: all implementation tasks passed the existing CI gate before archive. OpenSpec applied the memory deltas to the canonical specification; release numbering selected 30.0.0 from current main 29.17.0. The final release checkpoint runs the same CI gate. Live migration, replacement credentials, and a real human email-login return remain documented rollout checks.</li>
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
