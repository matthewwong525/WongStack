# Spec Delta

## ADDED Requirements

### Requirement: The landing page's comments stay short

The landing page's checks SHALL fail on a comment longer than two lines, or a comment line wider than 120 characters, in its JavaScript or TypeScript, under the same rule and the same exceptions as the scaffold.

#### Scenario: A long note is added to the landing page

- **WHEN** a change adds a three-line comment to a landing page source file
- **THEN** the landing page's checks fail and name the file and line
