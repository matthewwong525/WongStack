## MODIFIED Requirements

### Requirement: No secret or private name is published

The full history SHALL be scanned for credentials before a public release; a real match SHALL stop it until rotated, reported without its value. No live file outside `openspec/changes/` and `CHANGELOG.md` SHALL name a private downstream repository or service. A public company name that is not itself a private repository or service SHALL be allowed.

#### Scenario: The scan finds a credential

- **WHEN** the history scan finds a live credential
- **THEN** the release stops and the owner is asked to rotate it

#### Scenario: The README names the maintainer's company

- **WHEN** a live file names Claymoo, the company, but not a private repository
- **THEN** the private-name check passes, and it still fails on `ClaymooApp`, `WongOS`, or `wongstack-cloud`

## REMOVED Requirements

### Requirement: The README speaks to a non-technical reader first

**Reason**: The README now speaks to business owners through one real business, not to a general non-technical reader.
**Migration**: Replaced by *The README speaks to a business owner first*.

## ADDED Requirements

### Requirement: The README speaks to a business owner first

The README's first screen SHALL tell how one real business runs on WongStack, with example requests from that business and no developer terms. One later section SHALL list setup's tools, why Cloudflare is needed, and each top-level entry's purpose.

#### Scenario: A business owner reads the first screen

- **WHEN** a business owner who is new to coding agents reads the first screen
- **THEN** they see which business runs on it, what that business asks for, and how to start, with no developer term
