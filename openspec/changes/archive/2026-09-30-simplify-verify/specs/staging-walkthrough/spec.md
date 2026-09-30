## ADDED Requirements

### Requirement: A plain check needs no change

When a person asks `/verify` for a check with no change's scenarios behind it, such as a screenshot of a page, a request to an address, or a walk through the app, `/verify` SHALL run it against the address the person names, else this commit's deployed preview. It SHALL show the evidence in the chat, post no pull-request comment unless asked, and follow the same limits as a change's walk: no local execution, no repo dependency, and a working tree left as it found it.

#### Scenario: A screenshot of a named page

- **WHEN** a person asks `/verify` to screenshot a page at an address they give
- **THEN** the screenshot appears in the chat, no comment is posted, and the working tree is unchanged

#### Scenario: A walk with no address given

- **WHEN** a person asks `/verify` to click through the app and names no address
- **THEN** the walk runs on this commit's deployed preview, and a missing preview is reported as not checked
