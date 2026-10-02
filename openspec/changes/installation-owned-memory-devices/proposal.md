# Approve memory access in your own WongStack

**Status:** in-progress

**Branch:** github-artifacts

**Open questions:** none

## Why

Connecting a computer to memory currently depends on GitHub accounts and repository access. Each WongStack installation should let its own people approve their computers using the app login they already have, wherever they keep their repository.

## What Changes

- **Your installation decides who belongs.** People get a lasting internal identity. The owner chooses members and their permissions; changing an email does not transfer someone's history. Initial owner setup needs a verified app login and confirmation by the person controlling the installation. An app without login keeps memory setup pending.
  ```text
  YOUR INSTALLATION
  verified app login ──▶ your identity
                              │
                       owner grants membership
                              │
                              ▼
                       your repo's memory

  FIRST OWNER                    LOGIN OFF
  Sign in to finish setup        Memory setup pending
  Compare setup code: 82K6        Enable app login first
  Confirm on setup computer      [Setup instructions]

  LOGIN NEEDS REVIEW
  This login is not linked yet
  Ask the owner to review it
  [Copy request reference]
  ```

- **Connect a computer from chat, then approve it in Devices.** The agent uses your installation's saved app address, or asks for it on a new computer. The approval link uses the person signed into your app, so the agent never asks for an email. Compare the code with chat, check the signed-in account, and review the computer and permissions before approving.
  ```text
  computer ──▶ your installed app
      │              │
      │         sign in to Devices
      │              │
   show code ◀── compare code
      │              │
      │         approve or deny
      ▼              │
   private poll ◀────┘
      │
      ▼
   this computer connects once

  DEVICES / APPROVE
  Your workspace · ana@example.com
  Laptop · name supplied by requester
  Code: H7KM-42PT
  Compare this with your chat
  Read team notes and your private notes
  Save notes as you · expires in 30 days
  [ ] This is my request; the code matches
  [Approve computer]     Deny

  APPROVED                    DENIED / EXPIRED
  Waiting for the computer     This request has ended
  [View devices]              Start again in chat
                              [View devices]
  ```

- **See and stop connected computers.** Devices shows the request you opened and your approved computers, their permissions, and when they expire. Owners manage membership; memory admins can revoke any computer. Removal stops both access and renewal. Each computer needs approval again after at most 90 days. Logging out of the browser leaves approved computers connected; revocation or membership removal stops them.
  ```text
  DEVICES
  Request opened from your chat
  Laptop · expires in 7 minutes
  [Review request]

  Connected 2
  Laptop · used today · member
  Renews automatically · approve by Jan 1
  Revoke
  Desktop · expires Oct 30 · member
  Revoke

  REVOKE LAPTOP?
  It will stop reading and saving memory
  [Revoke computer]       Cancel

  OWNER / PEOPLE
  Ana · owner
  Bo · member             Remove
  [Invite person]

  INVITE PERSON          REMOVE BO?
  Email [             ]  All Bo's computers stop
  Role  [Member       ]  Past notes stay credited
  [Create invitation]    [Remove member]  Cancel

  REVIEW LOGIN LINK       CHANGE ROLE
  New verified login      Bo · current: Member
  Existing person [Ana]   New role [Reader]
  Evidence [          ]   Existing grants narrow now
  Old computers stop      More access needs approval
  [Confirm identity link] [Change role]  Cancel

  DONE                    INVITATION PENDING
  Device revoked /        Person must sign in before
  member removed /        connecting a computer
  identity or role saved  App login may need an update
  [View devices]          [Back to people]
  ```

- **Move existing memory with its history intact. BREAKING:** existing computers must reconnect. Old emails, GitHub accounts, and keys are evidence for an owner-reviewed migration, never automatic claims to private notes. Uncertain ownership stays protected for an admin to resolve. A failed migration pauses memory instead of reopening old access.
  ```text
  existing facts and transcripts
                  │
       preserve text and attribution
                  │
          review ownership evidence
             ┌────┴────┐
             ▼         ▼
          proven     uncertain
             │         │
             ▼         ▼
       link person   admin-only review
  ```

- **Devices ships with regular WongStack.** New and updated installations get the mini app, setup guidance, and recovery steps. No hosted WongStack account is needed. Email alone cannot find an installation; a new computer needs its app address. Loading and failures always explain the next step.
  ```text
  WongStack template ──▶ your app / Devices
                             │
                       your login and memory

  NO DEVICES                 LOADING
  Connect from your chat     Checking your requests…
  [Copy connection request]  Actions wait

  COULD NOT LOAD             WRONG ACCOUNT / REQUEST
  Your devices were not     Request unavailable here
  changed                   Check app address and login
  [Try again]               [Back to devices]
  ```

## Capabilities

### New Capabilities

- `installation-identity`: installation-owned principals, explicit membership, owner bootstrap and identity recovery.
- `memory-devices`: human approval, machine credential lifecycle, Devices screens and route isolation.

### Modified Capabilities

- `memory`: principal ownership and visibility, replacement of GitHub join/admin grants, safe historic mappings.
- `cloudflare-provisioning`: pending memory setup, exact route protection, verified human claims and disposable verification.
- `mini-apps`: built-in Devices UI using privileged core APIs while ordinary handlers still lack memory bindings.
- `install-onboarding`: standalone and server setup report pending human approval rather than minting an admin key.
- `payload-layout`: Devices and its core dependency set ship together and adapt safely on update.

## Impact

Implementation workspace: `wrathful-alpacka`, branch `github-artifacts`, included in PR #238 alongside `artifacts-hosted-pilot`. The original plan was based on main (`6fc5262`); reconcile branch differences without changing the recorded pilot evidence.

Memory migrations, SQL guards, transcripts, CLI, hooks, app identity guard and routing; new Devices frontend and core auth handlers; setup/provisioning and source-only server installer; Access coverage/deploy checks, payload inventory, sync guidance, docs and tests. No new hosted backend. A major release will describe reconnection and ownership review; this checkpoint starts with additive schema preparation; runtime activation remains pending.

Non-goals: production publication without a later ship instruction; Git hosting migration; a central account directory; changes to wongstack-cloud or treating the Artifacts test identity adapter as real login; replacing Cloudflare Access as the existing app login.

## Decision log

- **2026-10-02** — Asked where this belongs → chose regular WongStack; the user's correction explicitly excludes a hosted-service dependency.
- **2026-10-02** — Asked how far this work should go → chose a validated plan and review page only, in a separate workspace, then wait for review.
- **2026-10-02** — Asked whether the approval link should use whoever signs into the installation → chose the signed-in person and matching code, with no email prompt. This supersedes the earlier email-routing idea.
- **2026-10-02** — Assumed: this clean workspace at current local main is the requested separate workspace, because it is already isolated from the Artifacts experiment and other work.
- **2026-10-02** — Assumed: only owners change membership or link identities; memory admins retain all-memory visibility and global device revocation, because separating those powers limits accidental privilege transfer.
- **2026-10-02** — Assumed: first owner setup uses verified app login plus local installation-operator confirmation, because first-visitor or email-only ownership is unsafe.
- **2026-10-02** — Assumed: login-off installations pause memory enrollment, because they have no authenticated human to approve a computer.
- **2026-10-02** — Assumed: requests last 10 minutes, credentials 30 days, and human approval at most 90 days, because short enrollment and bounded unattended access balance usability and recovery.
- **2026-10-02** — Assumed: membership invitations grant prospective access only, and old ownership needs a separate reviewed mapping, because matching emails cannot establish historic ownership.
- **2026-10-02** — Assumed: this uses deterministic code for enrollment, renewal, membership and migration checks, because no model judgment should decide access.
- **2026-10-02** — Assumed: cutover invalidates old keys rather than accepting two authorization systems indefinitely, because removed people must not retain access through a legacy route.

- **2026-10-02** — Asked when an approved machine should require login again → chose approval expiry or revoked access; browser logout alone leaves the machine connected.

- **2026-10-02** — Asked whether to include this in #238 and work off its branch → chose to move this change to `github-artifacts` and implement with `/apply`; the feature remains regular WongStack, and the existing pilot evidence remains intact.

- **2026-10-02** — Agreed the hosted integration seam: platform-operated per-project Access uses the ordinary verified-human adapter; no cloud roles or email headers seed memory. Accepted version-1 nonsecret setup status/action fields, separate pinned app/memory origins and machine-scoped readiness. This session owns the next schema-only save; other implementation stays unstaged.

- **2026-10-02** — Schema checkpoint scope: only migrations, their tests/fixtures, migration guidance, release note and this active change. The user explicitly limited staged paths; full capability reconciliation and its areas mapping remain for the implementation checkpoint, so planned runtime behavior is not presented as completed. Task 1.1 remains unchecked until its remote gate passes. Session facts skipped because decisions are recorded here.

- **2026-10-02** — Schema gate passed at `15338e5eb8625260bafb6eafd89bf7df83a2be9b`: 983 script tests, zero failures, all required checks green; task 1.1 complete. No runtime or human acceptance claim. Gate result recorded locally for the next agreed checkpoint; no additional commit after handing back save ownership.

- **2026-10-02** — Defined the future trusted-process integration in [operator-contract.md](operator-contract.md): initialization, no-proof pending status, candidate inspection and explicit target/code owner confirmation. Signatures remain planned, not callable. Task 1.2 now has a strict human Access adapter and signed-token tests prepared for the other session’s serialized remote checkpoint; keep it unchecked until that revision passes. No shared installer/setup prose changed.

- **2026-10-02** — The checkpoint owner confirmed the required app test/build gates passed at `8b7795318905c112c8bae3e042f45294329aade0` and released dependent task 1.3. Mark only task 1.2 complete; overall payload/save result remains pending. Continue disjoint memory core work while that session retains all git and PR ownership.

- **2026-10-02** — Task 1.3 preparation adds atomic live-authorization guards, explicit membership/invitation/review controls, role ceilings and immutable identity-review evidence in forward migration 0009; 0007/0008 remain unchanged. New-person review does not inherit the retired person's history. Regression tests are written; task stays unchecked until the next remote gate.
- **2026-10-02** — Hosted bootstrap requires publication of the first private app before Devices is reachable. The planned initial owner-confirmation mechanism is the generic trusted-process CLI run by a platform operator with exact target/identity/code review through private input; hosted setup has a manual operator step until a separately reviewed customer interface exists. Initialization/status exports are the next prioritized operator/provisioning handoff, not callable yet.

- **2026-10-02** — The checkpoint owner reported all required source checks successful at `58d4ebc5b59ccaae165f0148748f1bed2fbf487b`. Freeze the prepared task 1.3 core, migration, fixtures/tests and five plan files for its next coordinated checkpoint; only syntax/static review and plan validation have run for that new slice. Task 1.3 remains unchecked.

- **2026-10-02** — Task 1.3 passed at `f4d71f35df5ebfa66708d6bb26cb1f16ad0e2437` with all thirteen approved paths unchanged and all required checks successful; mark that core slice complete. Initialization/status is the next dependency, without activating owner or device routes.
- **2026-10-02** — Prepared generic Node-free initialization/status exports, release-SQL digest checks, active deployment/resource/Access readbacks and forward migration 0010 with a final immutable bootstrap-completion receipt. The [operator contract](operator-contract.md) now distinguishes implemented inactive exports from planned owner commands. Exact paired memory Worker/hostname overrides are recognized, but closed placeholders stay closed until handler activation/probes.
- **2026-10-02** — Source fixtures cannot prove D1 REST rollback. Keep live initializer integration blocked on both the exact source gate and a manifest-owned disposable REST DDL/metadata rollback/concurrency probe; passing live observations are not an official future API guarantee. Partial writes without a complete receipt fail closed and require explicit inspection. All git/PR ownership remains with the coordinating session; no shared installer/setup/wiki edits or live initialization in this slice.

- **2026-10-02** — Task 1.3a passed at `b2ba7f45cdfa7c0b9bd2c3b2d3b7298ae009b7b1` (1160 script tests and all required app/build checks). Released only source probe preparation. [The exact disposable probe runbook](rest-probe.md) separates read-only planning, transport observations, and a separately coordinated initializer concurrency/retry phase. Use only the planned memory D1 DB with its original creation receipt, never either business DB; no extra resources or VM. Root retains provider/git ownership and adds the narrow probe coverage include without changing floors/exclusions. Probe PASS never releases integration or asserts an official REST guarantee.
