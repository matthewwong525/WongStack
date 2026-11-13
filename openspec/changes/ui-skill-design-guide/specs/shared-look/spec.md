# Spec Delta

## MODIFIED Requirements

### Requirement: Standalone pages take the app's look

The plan review page, the key link, the live view, and a closed link's page SHALL use the app's colours, font, corner size, and shadows, read from the app's one stylesheet when it is present and shadcn's neutral look when it is not. Each SHALL start light whatever the device's setting, draw its buttons, fields, cards, and tags in the same shapes as the app's ready-made parts, and give each screen state one filled primary action. Red SHALL mark only a problem. A standalone page SHALL still load nothing from the network.

#### Scenario: A rebranded app carries its colours

- **WHEN** the app's stylesheet sets a different primary colour and corner size and a plan's review page is built, then a key link is opened
- **THEN** both pages draw their primary button in that colour, with that corner size

#### Scenario: A device set to dark

- **WHEN** a person whose device is set to dark, who has never used the switch, opens a plan's review page, a key link, or Home
- **THEN** each shows the same light surfaces and dark text it shows on a light device

## ADDED Requirements

### Requirement: The brand is one list in one place

The app's stylesheet SHALL hold an install's brand as one list: the accent colour and the text on it, the font, the corner size, and the shadows, for light and for dark. Every screen and every ready-made part SHALL follow a change to that list with no edit to a part. The starter SHALL set an accent that is a colour, not black or grey, in light and in dark, and SHALL use the device's own font.

#### Scenario: An install sets its accent

- **WHEN** an install changes the accent colour in the list and nothing else
- **THEN** the primary button on Home, in a mini app, and in a dialog shows that colour, and no file of a ready-made part changed

### Requirement: Text on the brand's colours stays readable

The app's checks SHALL fail when the text on the accent colour, the page's text on its background, or the muted text on the background falls below a contrast of 4.5 to 1, in light or in dark. The failure SHALL name the pair and its contrast. A colour the check can't read SHALL fail by name, not pass.

#### Scenario: A pale accent with white text

- **WHEN** an install sets a pale yellow accent and keeps white text on it
- **THEN** the checks fail and name the accent, its text, and the contrast

### Requirement: Design rules hold a screen to the look

The app's checks SHALL fail on a screen that uses a colour outside the app's own set, an inline style, a class that makes no style, or a class the check can't read. Each failure SHALL say what to use instead. The starter's own screens SHALL pass.

#### Scenario: A screen uses a stray colour

- **WHEN** a new screen gives a button a pink from outside the app's set
- **THEN** the checks fail on that line and name the app's own colours to choose from
