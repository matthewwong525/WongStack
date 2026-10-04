# cloudflare-hosted-projects Specification

## Purpose

Give a new hosted customer an ordinary project their AI can edit and a working small site, with project storage, checks, previews and publication on the platform's Cloudflare account and no customer provider accounts.

## Requirements

### Requirement: Managed storage is the default for new hosted projects

A new hosted project SHALL use platform-managed Artifacts unless the owner explicitly requests GitHub. Its setup SHALL require no customer GitHub or Cloudflare account, provider credential, provider dashboard visit or operator dashboard connection. Existing GitHub projects and explicitly selected GitHub projects SHALL retain their normal setup and delivery route, without migration.

#### Scenario: Owner starts a new hosted project

- **WHEN** an eligible signed-in owner starts a new hosted project without choosing GitHub
- **THEN** the service sets up managed project storage and hosting automatically and reports their separate readiness without asking for provider accounts

#### Scenario: GitHub is already selected

- **WHEN** a project already uses GitHub or a new project's owner explicitly selects GitHub
- **THEN** its setup, pull requests, checks, preview discovery and merging retain the normal GitHub behavior

### Requirement: Hosted setup preserves the project and its source identity

Hosted setup SHALL create one project from a reviewed pinned template and record its actual source identity. It SHALL supply an ordinary Git checkout to the existing AI workspace, retain the existing AI sign-in steps, and reuse that same project after reconnect or a partial retry. It SHALL NOT overwrite unrelated work, replace a chosen source silently, automate customer AI sign-in or declare memory ready without a configured store.

#### Scenario: Setup is retried

- **WHEN** a setup stopped after creating the repository or registering the workspace
- **THEN** retry verifies and reuses those same owned resources and preserves any customer work

#### Scenario: The template cannot be verified

- **WHEN** the selected template or recorded project identity cannot be verified
- **THEN** setup stops with a recoverable status and does not substitute a different template or target

### Requirement: Hosted execution has no GitHub runtime dependency

Hosted project checks, builds, previews and publication SHALL execute on Cloudflare using the same portable check implementation as the GitHub route. Customer project setup and delivery SHALL NOT dispatch GitHub workflows, require GitHub authentication, fetch their template from GitHub at runtime or run the delivery gate on the AI editing machine. The public Source and existing GitHub maintenance routes SHALL remain supported.

#### Scenario: A hosted candidate is saved

- **WHEN** the AI saves a candidate to its Artifacts project
- **THEN** Cloudflare runs the required checks for that exact candidate with explicit project/base/head context and reports their result

#### Scenario: An earlier code change is followed by documentation

- **WHEN** the latest candidate commit changes documentation but an earlier unmerged candidate commit changes app code
- **THEN** the shared check evaluates the whole change and runs the app suite, preserving GitHub's existing semantics

### Requirement: Business content and exact previews stay private

The hosted starter SHALL support HTTP and static assets with no required memory or business database setup. Production and native preview content SHALL require the recorded owner's authorized access before business content is uploaded. The review URL SHALL identify the exact candidate deployment, with expected app assets and API behavior, and SHALL NOT be constructed from a naming convention or replaced by an earlier or moving preview.

#### Scenario: Exact candidate preview is ready

- **WHEN** a passing candidate has a verified native preview deployment
- **THEN** its immutable URL and provider identity are reported for that candidate, while unauthenticated requests to its HTML, static assets and API are denied

#### Scenario: Protection is incomplete

- **WHEN** the project's protection or deployment identity cannot be verified
- **THEN** the service keeps the project incomplete and publishes no unprotected business content or misleading preview link

### Requirement: Publication requires approval of the passing candidate

The hosted route SHALL publish only an owner-approved, passing candidate belonging to that project, with the recorded expected main head. A changed candidate or main head SHALL require refreshed checks and approval. An arbitrary repository push without a matching valid publication approval SHALL NOT deploy production. The first delivery SHALL allow only one active candidate and one publication at a time per project.

#### Scenario: A stale approval is presented

- **WHEN** the approved candidate SHA or expected main SHA differs from authoritative repository state
- **THEN** publication is refused before a production mutation and the owner receives the changed-state explanation

#### Scenario: A push lacks approval

- **WHEN** a main or release ref is pushed without the project's matching recorded approval and passing checks
- **THEN** no production deployment starts

### Requirement: Published means provider, live identity and repository agree

Hosted publication SHALL retain separate immutable provider deployment evidence, authenticated live project/source identity, and authoritative repository acknowledgment of the exact approved SHA. It SHALL report `published` only when all three agree. A failure after provider deployment SHALL remain explicitly incomplete and recover the same operation by bounded readback or acknowledgment, without redeploying, force-pushing, deleting customer work or inventing a success receipt.

#### Scenario: Deployment succeeds but acknowledgment fails

- **WHEN** the provider deployed the approved source but live identity or repository acknowledgment is absent or mismatched
- **THEN** publication remains incomplete, reports the verified deployment separately, and retries only confirmation of that operation

#### Scenario: A second change is made

- **WHEN** a publication completed with all three facts confirmed and the owner requests another change
- **THEN** the new candidate starts from that confirmed main and can complete checks, a new private preview and its own approved publication

### Requirement: Platform authority is isolated from customer commands

Customer installation, test and build commands SHALL receive no platform-management, protection-management, publication or cross-project credential. Only a trusted project-bound publication stage SHALL receive its necessary deploy/repository authority, without rerunning customer preparation hooks with that authority. Repository markers and URLs SHALL NOT grant authority or permit cross-project operations.

#### Scenario: Customer code requests another project's target

- **WHEN** customer configuration or a delivery request names a different project's Worker, repository or protection resources
- **THEN** the trusted route refuses before mutation and exposes no other project's credentials

#### Scenario: Untrusted preparation runs

- **WHEN** a customer's dependency scripts, tests or build execute
- **THEN** their environment lacks platform and publication credentials, and their output cannot change the authoritative deployment target

### Requirement: Operations have bounded uncertainty and finite cleanup

Hosted setup and delivery SHALL retain exact owned-resource identities and bounded outcomes. Uncertain mutation outcomes SHALL require readback before retry or cleanup. Cleanup SHALL remove only recorded owned resources and grants within its authorized inventory, retain protection while content can still serve, and report verified absence or explicit leftovers. A later acceptance trial SHALL require fresh authorization and SHALL NOT inherit canceled trial approval.

#### Scenario: Creation response is lost

- **WHEN** a creation may have succeeded but its response is unavailable
- **THEN** the operation remains uncertain until ownership/readback resolves it and does not create or delete another resource on a guess

#### Scenario: Authorized cleanup is incomplete

- **WHEN** an owned trial resource or scoped grant cannot be confirmed absent
- **THEN** cleanup reports the exact leftover and does not claim complete teardown
