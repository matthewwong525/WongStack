## MODIFIED Requirements

### Requirement: A table is a page table

A Markdown table indented inside a What Changes bullet SHALL show as an HTML table in the page's look, its cells escaped and inline-formatted like bullet text, and each body row SHALL take its own note, named on copy by change number and row. A malformed table, such as one with no separator row, SHALL show as the bullet's text. A table outside any bullet, such as one after a blank line that ended its bullet, SHALL stop the build with its line, and the last page SHALL stay.

#### Scenario: A note on a row

- **WHEN** a reviewer notes the second row of a table in change 3
- **THEN** copied notes name it as change #3, row 2, with that row's text

#### Scenario: A blank line above a table

- **WHEN** a What Changes bullet is followed by a blank line and then a table
- **THEN** the build stops, naming the table's line, and the last page stays
