# Wong sync delta

## ADDED Requirements

### Requirement: Existing installs receive a reviewed privacy migration

An update to private defaults SHALL plan protection for the existing production and staging Workers, their default addresses and previews, the owner, and the current team. It SHALL preserve locally adapted app code and explicitly intended public routes. Earlier recorded public choices SHALL inform the reviewed migration rather than silently excluding the install from the new defaults. It SHALL identify unavailable owner identities, management connections, conflicting Access rules, and unsupported protocols instead of silently weakening coverage. The update SHALL distinguish public or pending installs from verified private installs, and SHALL NOT mark migration complete from configuration alone.

#### Scenario: An existing public workspace

- **WHEN** an install updates from a public-default release
- **THEN** its plan includes a checked privacy migration for existing and new previews with the owner's current team, rather than only copying new guidance

#### Scenario: A locally adapted public app

- **WHEN** the installed app has custom routes or WebSocket traffic
- **THEN** the plan preserves its code, identifies necessary reviewed exceptions or compatible coverage, and leaves the migration explicitly pending until its access behavior works
