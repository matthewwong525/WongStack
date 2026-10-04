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
