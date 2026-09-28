## MODIFIED Requirements

### Requirement: The update is judged from its changed units

The exploration inside `/plan` SHALL start from the classified changed units, read other repo files only for a named dependency or impact, and ask by the shared rule for questions before planning. Earlier user decisions, including an old verdict record, SHALL inform it as context, never as approval.

#### Scenario: Small update

- **WHEN** a few payload units changed
- **THEN** exploration starts from those units instead of rereading the whole payload

## ADDED Requirements

### Requirement: An update goes straight into planning

When the preflight reports an update, sync SHALL invoke `/plan` directly, and SHALL NOT stop at a standalone `/explore` or its *Plan it?* question, including in an install whose own sync skill hands the report to `/explore`.

#### Scenario: An older install's skill names explore

- **WHEN** an install's own sync skill says to hand the report to `/explore`
- **THEN** the exploration runs as `/plan`'s bounded pass and the sync ends at the plan's review link, never at *Plan it?*
