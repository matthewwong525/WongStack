# shared-look Specification

## Purpose
Every page WongStack draws, inside the app or as a standalone page, looks like one product: the app's colours, shadcn's shapes, and one light look on every device.

## Requirements

### Requirement: Standalone pages take the app's look

The plan review page, the key link, the password link, the private form, and a closed link's page SHALL use the app's colours, read from the app's one stylesheet when it is present and shadcn's neutral colours when it is not. Each SHALL stay light when the device is set to dark, draw its buttons, fields, cards, and tags in the same shapes as the app's ready-made parts, and give each screen state one filled primary action. Red SHALL mark only a problem. A standalone page SHALL still load nothing from the network.

#### Scenario: A rebranded app carries its colours

- **WHEN** the app's stylesheet sets a different primary colour and a plan's review page is built, then a key link is opened
- **THEN** both pages draw their primary button in that colour

#### Scenario: A device set to dark

- **WHEN** a person whose device is set to dark opens a plan's review page, a key link, or Home
- **THEN** each shows the same light surfaces and dark text it shows on a light device

### Requirement: The look stays one look

The app and the standalone pages SHALL keep their text readable, and the checks SHALL fail when the colour reader can no longer find the colour set in the app's stylesheet.

#### Scenario: The stylesheet's shape changes

- **WHEN** a change rewrites the app's stylesheet so its colour set is no longer found
- **THEN** the checks fail and say the set is missing

### Requirement: Loading shows the shape of what loads

While the app's screens or the key page wait for their content, they SHALL show still-announced placeholder blocks shaped like that content, not a line of text alone. A screen reader SHALL still hear that it is loading, and the placeholders SHALL not pulse for a person who turns motion off.

#### Scenario: Home loads its apps

- **WHEN** a person opens Home before their apps have arrived
- **THEN** grey blocks shaped like app cards fill the apps grid, and the page announces that it is loading the apps
