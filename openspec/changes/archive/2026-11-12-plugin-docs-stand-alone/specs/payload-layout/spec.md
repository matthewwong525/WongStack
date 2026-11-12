## ADDED Requirements

### Requirement: A module's docs link nothing outside the module by a relative path

Every Markdown file in a module SHALL link only files inside that module by a relative path; a page outside it SHALL be linked by its full web address. What a module needs to act SHALL live in the module itself, and WongStack's wiki SHALL link down to the module for it, not hold the rule the module follows. A wiki heading whose text moved into a module SHALL stay, pointing down, so links from installs keep working.

#### Scenario: A module installed alone

- **WHEN** a module is copied alone into a project with no WongStack wiki
- **THEN** every relative link in its Markdown opens a file in that project, and the module's test fails on any that would not

#### Scenario: An old link to a moved heading

- **WHEN** an install's own page links a WongStack wiki heading whose rule moved into a module
- **THEN** the heading is still there and points to the module's page that now owns the rule
