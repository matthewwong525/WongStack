## ADDED Requirements

### Requirement: Same-named boxes in embedded frames get their own refs

When a page the personal browser reads holds an embedded frame, such as a payment box, with a field of the same role and name as a field elsewhere on the page, the page read SHALL give each field the ref that acts on that field. When the browser cannot confirm which ref belongs to which field, it SHALL print no ref on those fields and SHALL say so in the page read. It SHALL NOT print a ref that acts on a different field than the line it marks. Pages without embedded frames SHALL read as before.

#### Scenario: The page's Email and a payment box's Email

- **WHEN** a page has an *Email* text box and an embedded payment frame that also has an *Email* text box, and the agent types into the page's *Email* ref from the newest page read
- **THEN** the text lands in the page's *Email* box, and the frame's *Email* box is unchanged

#### Scenario: The frame's own box

- **WHEN** the agent types into the ref printed on the frame's *Email* line
- **THEN** the text lands in the frame's *Email* box

#### Scenario: The browser can't confirm the refs

- **WHEN** the browser's count of fields differs from the count it was given for the same read
- **THEN** each same-named field in more than one frame prints no ref, other fields keep theirs, and the read holds one line saying some boxes have no ref

### Requirement: A click on a tick box is checked

When the agent clicks a tick box, a radio choice, or a switch by its ref or a CSS selector, the personal browser SHALL read whether it changed. When it did not, the browser SHALL focus it and press Space once, then read again. When it still did not change, the click SHALL fail with `BROWSE_ERROR=the box did not change`, not report done. A click by ref on any other element SHALL take no extra step; a click by CSS selector SHALL make one read first, to learn whether it targets a tick box.

#### Scenario: A click that doesn't tick

- **WHEN** the agent clicks an unticked tick box whose page ignores the click but takes the Space key
- **THEN** the box ends ticked and the click reports done

#### Scenario: A box nothing ticks

- **WHEN** neither the click nor Space changes the box
- **THEN** the click prints `BROWSE_ERROR=the box did not change` and exits 1

#### Scenario: A plain button

- **WHEN** the agent clicks a button by its ref
- **THEN** the browser clicks once and reads nothing more

#### Scenario: A button by CSS selector

- **WHEN** the agent clicks a button by a CSS selector
- **THEN** the browser reads that element once, then clicks once and reads nothing more
