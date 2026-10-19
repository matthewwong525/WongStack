# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: A visual is a narrow text drawing`
- TO: `### Requirement: A visual is a narrow drawing`

## MODIFIED Requirements

### Requirement: A visual is a narrow drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows; an `svg` fence for screens and before-and-after layouts; a Markdown table for a table; and a `text` fence for a small listing such as a file tree. Mermaid and SVG fences SHALL show on the page as inline pictures made at build time. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A text drawing SHALL aim for 40 columns and MAY reach 56. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

#### Scenario: A flow drawn in Mermaid

- **WHEN** a What Changes bullet holds a valid `mermaid` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen and opens full screen, with no script or network load added to the page

#### Scenario: A screen drawn in SVG

- **WHEN** a What Changes bullet holds a valid `svg` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen, opens full screen, takes a note on the whole picture, and follows the page's light or dark colors

#### Scenario: A wide picture

- **WHEN** a `mermaid` or `svg` fence draws wider than 640 pixels
- **THEN** the builder warns with the item and picture and still writes the page

### Requirement: Proposal text never runs as code

The page SHALL escape all proposal text, drawings and picture labels included, so script-closing text or HTML examples show as written and never execute. The builder SHALL refuse a drawn picture whose markup holds a script, a style, a foreign object, a link, an image source, or a `url(` reference, and SHALL judge only the markup, so a label that merely names one of these still draws. An `svg` fence SHALL pass an allowlist: only drawing shapes, text, and grouping elements, and only geometry, paint, text, and the kit's color class attributes; any other element or attribute, an event handler included, SHALL refuse the picture.

#### Scenario: Markup in a proposal

- **WHEN** a proposal quotes a literal `</script>` tag
- **THEN** the page shows the text intact

#### Scenario: A label names a link word

- **WHEN** a Mermaid label reads `src=x` or `url(x)`
- **THEN** the picture draws with that label as text, and no link or image is added

#### Scenario: A sketch carries an event handler

- **WHEN** an `svg` fence holds `<rect onclick="…"/>` or an `<a>` element
- **THEN** the build stops, naming the item, picture, proposal line, and the refused element or attribute, and the previous page stays byte-identical

### Requirement: A failed build keeps the last page

The builder SHALL name the item and line of a missing `## Why` or `## What Changes`, an unclosed fence, a fenced block outside any bullet, a `mermaid` fence it can not draw, or an `svg` fence it refuses or can not read, and SHALL keep the previous page. A picture error SHALL be reported on one line, naming the item, the picture, and the proposal line. A clean build SHALL NOT be reported as proof that a drawing explains its bullet.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item and keeps the previous page

#### Scenario: A broken Mermaid fence

- **WHEN** a `mermaid` fence holds a syntax error
- **THEN** the build exits with one line naming the item, the picture, and the proposal line, and the previous page stays byte-identical

#### Scenario: An SVG fence with no root or size

- **WHEN** an `svg` fence holds no `<svg>` root with a `viewBox`
- **THEN** the build exits with one line naming the item, the picture, and the proposal line, and the previous page stays byte-identical

### Requirement: Screen sketches show each state and the change

A change that restructures a screen SHALL sketch it before and after, side by side where both fit in 640 pixels, else one above the other. A change that adds a screen SHALL sketch each empty, loading, or error state its flow names. A sketch SHALL stay a low-fidelity wireframe in the page's colors; the builder SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows that screen before and after the change

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page

## ADDED Requirements

### Requirement: A table is a page table

A Markdown table indented inside a What Changes bullet SHALL show as an HTML table in the page's look, its cells escaped and inline-formatted like bullet text, and each body row SHALL take its own note, named on copy by change number and row. A malformed table, such as one with no separator row, SHALL show as the bullet's text.

#### Scenario: A note on a row

- **WHEN** a reviewer notes the second row of a table in change 3
- **THEN** copied notes name it as change #3, row 2, with that row's text
