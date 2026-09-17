## MODIFIED Requirements

### Requirement: A bullet links its visual

A What Changes bullet with a visual SHALL end with `(review.html#/<visual>[/<state>][/<mark>])`. A bullet MAY wrap across lines: the page SHALL read each bullet as the whole list item, so the anchor SHALL be taken from the end of the bullet rather than the end of a line, and the bullet's text SHALL be shown in full. A line that follows a bullet with no blank line between SHALL belong to that bullet, whether or not it is indented; a blank line SHALL end the bullet, so a paragraph below the list SHALL stay a paragraph. When the segment after the visual names one of its states it SHALL be read as the state; otherwise it SHALL be read as a mark and the state SHALL default. A mark SHALL NOT share a name with a state of the same visual. The panel SHALL render the bullet as a link and SHALL show an anchor that names no visual, state, or mark as dead with the reason. The URL fragment SHALL accept the same form so a view is addressable.

#### Scenario: The state is omitted

- **WHEN** a bullet's anchor is `#/list/search` and `search` is not a state of `list`
- **THEN** choosing it shows `list` in its default state with the `search` elements highlighted

#### Scenario: A deep link

- **WHEN** the file is opened at `review.html#/list/empty/create`
- **THEN** the `list` screen shows its empty state with the `create` elements highlighted and the matching bullet is current

#### Scenario: A dead anchor

- **WHEN** a bullet's anchor names a mark no element in that visual carries
- **THEN** the panel shows the anchor struck through with the reason and the critic names the bullet

#### Scenario: A bullet wraps across lines

- **WHEN** a bullet is hard-wrapped so its `(review.html#/…)` anchor falls on the last of several lines, indented or not
- **THEN** the panel lists one bullet carrying its full text, the anchor resolves to its visual, and no continuation line appears below the list

#### Scenario: A paragraph below the list

- **WHEN** a blank line separates the `**Non-goals:**` paragraph from the last bullet
- **THEN** the paragraph renders below the list and the bullet count is unchanged
