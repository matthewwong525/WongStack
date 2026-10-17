## MODIFIED Requirements

### Requirement: Every change carries a standalone review page

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`, committed and archived with the change. The page SHALL fetch no script, style, font, or picture from the network, SHALL run no diagram renderer when opened, and SHALL work opened from disk; it SHALL use the network only to send notes when opened through a reply link. A change that adds or restructures a screen SHALL also keep a `## UX` section in `design.md` that links the page rather than repeating its sketches.

#### Scenario: Opened from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** every section, drawing, picture, zoom, and note control works

#### Scenario: A change with no screen

- **WHEN** `/plan` drafts a worker, CLI, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: A failed build keeps the last page

The builder SHALL name the item and line of a missing `## Why` or `## What Changes`, an unclosed fence, a fenced block outside any bullet, or a `mermaid` fence it can not draw, and SHALL keep the previous page. A Mermaid error SHALL be reported on one line, naming the item, the picture, and the proposal line. A clean build SHALL NOT be reported as proof that a drawing explains its bullet.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item and keeps the previous page

#### Scenario: A broken Mermaid fence

- **WHEN** a `mermaid` fence holds a syntax error
- **THEN** the build exits with one line naming the item, the picture, and the proposal line, and the previous page stays byte-identical

### Requirement: Proposal text never runs as code

The page SHALL escape all proposal text, drawings and picture labels included, so script-closing text or HTML examples show as written and never execute. The builder SHALL refuse a drawn picture whose markup holds a script, a style, a foreign object, a link, an image source, or a `url(` reference, and SHALL judge only the markup, so a label that merely names one of these still draws.

#### Scenario: Markup in a proposal

- **WHEN** a proposal quotes a literal `</script>` tag
- **THEN** the page shows the text intact

#### Scenario: A label names a link word

- **WHEN** a Mermaid label reads `src=x` or `url(x)`
- **THEN** the picture draws with that label as text, and no link or image is added

### Requirement: A visual is a narrow text drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows, shown on the page as an inline picture made at build time, and a `text` fence for screens, before-and-after layouts, and tables. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A text drawing SHALL aim for 40 columns and MAY reach 56 for options side by side, a table, or a before-and-after. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

#### Scenario: A flow drawn in Mermaid

- **WHEN** a What Changes bullet holds a valid `mermaid` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen and opens full screen, with no script or network load added to the page

#### Scenario: A wide picture

- **WHEN** a `mermaid` fence draws wider than 640 pixels
- **THEN** the builder warns with the item and picture and still writes the page

### Requirement: A reviewer notes any item

Each Why paragraph, item, decision, drawing line, and picture SHALL take a note, through a visible Note control or a still click, and a drag, pinch, or tap on a link or control SHALL keep its normal action. A note on a picture SHALL anchor to the whole picture and be named `Change #<n>, picture <k>`. Saved notes SHALL show as numbered pins, persist per change in the browser, and never be written to a repository file. A pin whose text changed SHALL show as possibly moved.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps item 2's Note control on a touch screen
- **THEN** the editor opens for item 2

#### Scenario: A note on a picture

- **WHEN** the reviewer taps item 1's picture full screen and saves a note
- **THEN** the note pins to the picture, and the copied note starts `Change #1, picture 1` with the picture's words
