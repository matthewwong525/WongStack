# Spec Delta

## ADDED Requirements

### Requirement: Save works in a copy installed through the app

In a copy installed through Connect your assistant, `/save` SHALL commit, send the change up through the app, and wait on the same gate, with no `gh` call, no GitHub sign-in and no repository credential on the device. It SHALL report the same gate result, failing output and preview it reports elsewhere, for the pushed commit only, and a result the app can not give SHALL be unverified, never passed and never "no checks". It SHALL NOT merge, force-push, or bypass hooks. `/save`, `/continue` and `/ship` SHALL check there that the person is signed in to the app, in place of the GitHub checks.

No verb SHALL publish from such a copy: `/ship` SHALL stop after the save and say that the employer or a manager publishes it, and a reply SHALL NOT offer to publish. A copy whose origin and install record disagree in any other way SHALL still stop the verb, never fall back to a guessed route.

#### Scenario: A teammate saves from an installed copy

- **WHEN** `/save` runs in a copy installed through Connect by a person who holds Project code
- **THEN** the change goes up through the app, the report ends with one gate result and the preview, and no `gh` command ran

#### Scenario: A teammate asks to publish

- **WHEN** `/ship` runs in a copy installed through Connect
- **THEN** it saves, publishes nothing, and says the employer or a manager publishes the change
