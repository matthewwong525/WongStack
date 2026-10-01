# Install onboarding delta

## ADDED Requirements

### Requirement: Easy setup honors a chosen source

When a person asks to install WongStack from a particular GitHub repository, fresh setup SHALL use that repository's version for the setup guidance, prerequisites, and installed payload, and the completed project's install record SHALL name the actual source repository, version, and commit. With no custom source requested, setup SHALL use the original WongStack repository. Setup SHALL retain its normal tools, hosting, and memory flow, and SHALL NOT install into the source checkout itself or silently substitute another repository when the requested source cannot be retrieved.

#### Scenario: Install a customized fork

- **WHEN** a person asks to install from their customized WongStack fork
- **THEN** the hosted project receives that fork's defaults and records that fork as its source through the usual easy setup
- **AND** the source checkout remains separate from the installed project

#### Scenario: Requested source cannot be retrieved

- **WHEN** the requested fork cannot be retrieved
- **THEN** setup reports the problem and does not install the original WongStack as a substitute
