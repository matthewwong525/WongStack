## ADDED Requirements

### Requirement: A preview names the keys only the live app holds

On a preview, Access SHALL show a key that only the live app may ever hold, the Cloudflare look-up key and Project code's saving, as held by the live app only. It SHALL NOT offer a step for it or say it is coming to previews. A key a preview may get from its own file SHALL keep saying it is not on previews yet.

#### Scenario: The employer opens Access on a preview

- **WHEN** the employer opens a person's keys on a preview of an install whose live app holds the Cloudflare key and Project code
- **THEN** both say they are on the live app only, and a business key the preview lacks says it is not on previews yet
