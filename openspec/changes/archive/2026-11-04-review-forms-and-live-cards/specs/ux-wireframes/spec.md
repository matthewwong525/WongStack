# Spec Delta

## MODIFIED Requirements

### Requirement: A visual is a narrow drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows; a `screen` fence for screens and before-and-after layouts, built from the shared look's app parts; an `svg` fence for a free drawing such as arrows or layers; a Markdown table for a table; a `text` fence for a small listing such as a file tree; and a `picture` fence for a real picture. Mermaid, screen, and SVG fences SHALL show on the page as inline pictures made at build time. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A text drawing SHALL aim for 40 columns and MAY reach 56. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

A `picture` fence SHALL list one `[label:] path` per line. Each path SHALL resolve to a PNG, JPEG or WebP file, known by its first bytes, inside the page's source folder. The page SHALL carry each picture inside itself, open at the start, with its label as caption and alt text, side by side when two fit, else stacked, and SHALL take a spot note on it. The builder SHALL stop, naming the item and picture and keeping the last good page, for a web address, an absolute path, a path or link that leaves the folder, a missing file, another file type, or a picture over 300 KB. It SHALL stop, keeping the last good page, when the built page passes 1.5 MB, so the Inbox can store it, and SHALL warn when it passes 800 KB and still build. It SHALL warn about a picture over 150 KB and still build. Each size message SHALL say to take only the visible part at phone width.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

#### Scenario: Options side by side

- **WHEN** a drawing sets two options side by side at 56 columns
- **THEN** the builder writes the page with no width warning

#### Scenario: A flow drawn in Mermaid

- **WHEN** a What Changes bullet holds a valid `mermaid` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen and opens full screen, with no script or network load added to the page

#### Scenario: A screen sketched from app parts

- **WHEN** a What Changes bullet holds a valid `screen` fence with a card, a text box, and two buttons
- **THEN** the page shows them in the app's look, wrapping text to fit, fitting a 320px-wide screen, opening full screen, taking a note on the whole sketch, following light or dark mode, and doing nothing when a control is tapped

#### Scenario: A free drawing in SVG

- **WHEN** a What Changes bullet holds a valid `svg` fence
- **THEN** the page shows it as a picture that fits a 320px-wide screen, opens full screen, takes a note on the whole picture, and follows the page's light or dark colors

#### Scenario: A wide picture

- **WHEN** a `mermaid` or `svg` fence draws wider than 640 pixels
- **THEN** the builder warns with the item and picture and still writes the page

#### Scenario: A labelled pair of pictures

- **WHEN** a What Changes bullet holds a `picture` fence with `Before: pictures/a.png` and `After: pictures/b.png`
- **THEN** the page shows both pictures open, side by side where they fit, captioned *Before* and *After*, with no network load, and a note on one names its picture

#### Scenario: A picture from the web

- **WHEN** a `picture` fence names `https://example.com/a.png`
- **THEN** the build stops with the item and picture, and the last good page stays

#### Scenario: A large picture

- **WHEN** a `picture` fence names a 200 KB PNG
- **THEN** the builder warns with the item and picture and still writes the page

#### Scenario: A page too big for the Inbox

- **WHEN** the built page is larger than 1.5 MB
- **THEN** the build stops with the page's size, and the last good page stays

#### Scenario: A page slow on a phone

- **WHEN** the built page is larger than 800 KB and under 1.5 MB
- **THEN** the builder warns with the page's size and still writes the page
