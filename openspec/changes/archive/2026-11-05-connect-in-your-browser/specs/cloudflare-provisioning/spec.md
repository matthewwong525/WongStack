# Spec Delta

## MODIFIED Requirements

### Requirement: The closing report says only what was checked

Before reporting success, provisioning SHALL check the actual production URL and report whether protection is configured, whether real human login is verified, and whether memory is reachable. It SHALL warn when a new address is not ready and SHALL never equate successful configuration or machine authentication with proven human access. It SHALL say memory is on only when a read through the production Worker answered. Interactive setup SHALL run its protection check automatically with the workspace's machine credentials and SHALL NOT ask the person to sign in on each site; the owner's own email sign-in to the production app during setup, or the person opening the production link and seeing their app, SHALL count as the human check. A site open without login SHALL be reported as open to anyone with the link, followed by the optional card steps and what the person gives up without them.

#### Scenario: Production not live yet

- **WHEN** the memory read has not answered
- **THEN** the report says memory starts once the site first goes live

#### Scenario: A mismatch

- **WHEN** the fetched URL does not answer as its configuration implies
- **THEN** the run reports a failure naming the request, not success

#### Scenario: Configuration without human evidence

- **WHEN** the API configuration and service-token probe succeed but nobody has completed a real email login
- **THEN** the report labels human login unverified and does not call the entire security rollout complete

#### Scenario: The person sees their app

- **WHEN** a private site's automatic probe passes and the person reports the app from the production link
- **THEN** setup counts human login as verified without further sign-ins on staging or previews

#### Scenario: The owner signed in during setup

- **WHEN** the owner finished the email sign-in to the production app during setup
- **THEN** the closing report says human login is verified, with no paste from the site needed

#### Scenario: No card yet

- **WHEN** interactive setup finishes with the site open without login
- **THEN** the report says anyone with the link can see the site and memory keeps no full transcripts, and lists the optional card steps as links
