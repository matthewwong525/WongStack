## MODIFIED Requirements

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why and What Changes and SHALL render paragraphs, lists, bold, inline code, and links. Plan and save SHALL use one shared refresh implementation. Pages SHALL be assembled from their inputs. A missing input SHALL be reported as an error, and the last output SHALL be kept. A change without a page SHALL be reported and left untouched. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page displays the proposal's current Why and What Changes

#### Scenario: A current-format refresh fails

- **WHEN** the page's required visual input is missing
- **THEN** refresh preserves the last output and reports the failure

#### Scenario: No file or no markers

- **WHEN** save runs for a change without a page
- **THEN** the page is not created or rewritten, and the checkpoint reports the limitation and proceeds
