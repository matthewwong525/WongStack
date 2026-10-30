## MODIFIED Requirements

### Requirement: A visual is a narrow drawing

A visual SHALL be a fence inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent, from the shared drawing guide's patterns: a `mermaid` fence for steps, states, and back-and-forth flows; a `screen` fence for screens and before-and-after layouts, built from the shared look's app parts; an `svg` fence for a free drawing such as arrows or layers; a Markdown table for a table; a `text` fence for a small listing such as a file tree; and a `picture` fence for a real picture. Mermaid, screen, and SVG fences SHALL show on the page as inline pictures made at build time. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. A text drawing SHALL aim for 40 columns and MAY reach 56. The builder SHALL warn about a text line wider than 60 columns, or a picture wider than 640 pixels, and still build. A proposal with only text fences SHALL build as it did before pictures.

A `picture` fence SHALL list one `[label:] path` per line. Each path SHALL resolve to a PNG, JPEG or WebP file, known by its first bytes, inside the page's source folder. The page SHALL carry each picture inside itself, open at the start, with its label as caption and alt text, side by side when two fit, else stacked, and SHALL take a spot note on it. The builder SHALL stop, naming the item and picture and keeping the last good page, for a web address, an absolute path, a path or link that leaves the folder, a missing file, another file type, or a picture over 300 KB. It SHALL stop, keeping the last good page, when the built page passes 500 KB, so the Inbox can store it. It SHALL warn about a picture over 150 KB and still build. Each size message SHALL say to take only the visible part at phone width.

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

- **WHEN** two 190 KB pictures make the built page larger than 500 KB
- **THEN** the build stops with the page's size, and the last good page stays

### Requirement: Screen sketches show each state and the change

A change that restructures a screen SHALL sketch it before and after, side by side where both fit in 640 pixels, else one above the other. A change that adds a screen SHALL sketch each empty, loading, or error state its flow names. A screen the person can open today SHALL also get a Before screenshot above its sketch, or one plain line saying why it can not. A sketch SHALL use real words and the app's parts, with a gray bar only for unknown text, in the page's colors; the builder SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows that screen before and after the change, with a screenshot of the screen today above the sketch

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page

### Requirement: A plan on a reply link can start its build

On an open reply link, the review page SHALL offer Send notes, Build it, and Build and publish as three directly visible bottom buttons, reachable without scrolling on a phone. A build choice SHALL send the selected action with every saved unsent note in one request, so the chat applies the notes and continues into the selected build or publish action without another build choice. Build and publish SHALL ask once more on the page before sending. The page SHALL mark only acknowledged submitted notes as sent and SHALL preserve unsent notes on failure. A changed plan SHALL prevent the action and ask for reload. Each build choice SHALL show only when the link offers it; with both offered, the page SHALL look as before. Opened from disk, after the link closes, or on a link that offers neither, the page SHALL show no build choices and SHALL retain note copying. Send notes alone SHALL build nothing.

#### Scenario: Build it from the page

- **WHEN** the reviewer taps *Build it* at the top of a long plan on a phone, on an open reply link with no unsent note
- **THEN** all three buttons are directly reachable without scrolling, the bottom bar has no sideways overflow, the chat starts building that change, and the page says the chat was asked

#### Scenario: An unsent note

- **WHEN** the reviewer taps *Build and publish* with one saved note not yet sent and confirms publishing
- **THEN** the chat receives the chosen action and note together, updates the plan, and builds and publishes without a further build choice; the acknowledged note is marked sent

#### Scenario: A link that offers one build choice

- **WHEN** the reply link offers `build` and not `publish`
- **THEN** the page shows *Send notes* and *Build it* in two equal columns, and no *Build and publish*
