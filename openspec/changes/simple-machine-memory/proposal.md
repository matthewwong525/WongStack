# Simple machine memory

**Status:** in-progress

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

- **Check:** `scripts/retired-names.json` removes the former `member add` retirement entry because the reviewed plan deliberately restores this command for trusted machine issuance. It no longer promises GitHub enrollment; all other retired-name guards remain unchanged. `memory-areas.test.mjs` now verifies that changing author labels on the same machine preserves private ownership; cross-machine isolation remains in the Worker matrix.
