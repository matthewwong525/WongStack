# Hosted workspaces

## Purpose

Lets hosted WongStack owners install and run their assistant using a portable Artifacts repository, private remote previews, and explicit publication approval.

## ADDED Requirements

### Requirement: Hosted preparation stops at repo and AI readiness

A hosted workspace SHALL prepare an empty Artifacts repository and coding-agent entry point without installing the payload or provisioning its site. `/wong-setup` SHALL finish that same prepared repository using its pinned source and scoped service access, without requiring customer GitHub or Cloudflare setup. Local personal setup SHALL retain its own hosting path through the same command.

#### Scenario: New cloud workspace

- **WHEN** a cloud owner opens their prepared workspace and runs `/wong-setup`
- **THEN** the assistant, site and memory are installed in that repository, without creating a second repository or asking for customer platform credentials

#### Scenario: Teammate resumes an installed project

- **WHEN** a teammate or returning owner runs setup for the same verified hosted project
- **THEN** setup verifies private workspace identity and reads existing service status without provisioning or rewriting the installed app, config or credentials
- **AND** it validates published app and Access pins before offering enrollment and never treats another machine's grant as this machine's readiness

#### Scenario: Teammate reaches an empty project

- **WHEN** a teammate runs setup before the owner installs and publishes the project
- **THEN** setup stops pending the owner without copying the payload or calling owner-only provisioning

### Requirement: Hosted delivery gates the exact real application

Hosted save SHALL remotely check and build the exact saved commit's real application, including assets and memory. Hosted publication SHALL use those immutable checked bytes after an owner approval and authoritative head/base checks. Failed, stale, unreadable and uncertain results SHALL never become a successful publication.

#### Scenario: A passing real application

- **WHEN** the owner approves a passing current private preview
- **THEN** its exact Worker and assets become the published site without rebuilding or changing the approved commit

#### Scenario: A changed or failing candidate

- **WHEN** checks fail or the approved commit or production base changed
- **THEN** publication is refused and production remains unchanged

### Requirement: Hosted access stays inside live membership

Hosted repository, site and preview access SHALL identify the subject from a trusted live grant, remain scoped to its project, and be denied after cloud membership removal. Memory access SHALL independently follow installation-owned membership and device grants and be denied after their explicit revocation. Every production/staging/preview address SHALL enforce the project's platform-managed login, and hosted app content SHALL use a separate origin from the cloud dashboard. Cloud identity or service authority SHALL NOT create memory membership or an approved device; memory SHALL remain pending until the installation-owned owner/device approval completes.

#### Scenario: Removed teammate

- **WHEN** an owner removes a teammate
- **THEN** their previously issued repository grants and cloud site access are refused while the owner retains access; memory membership remains governed by explicit installation-owner removal

### Requirement: Storage migration preserves portable history

A GitHub-to-Artifacts migration SHALL verify every advertised branch, tag and object identity before changing a working repository's origin or claiming completion, preserve local work, and keep the former repository available as a backup.

#### Scenario: A failed import

- **WHEN** the destination is missing a ref or object identity differs
- **THEN** the working origin and cloud storage record remain unchanged and migration reports the failure
