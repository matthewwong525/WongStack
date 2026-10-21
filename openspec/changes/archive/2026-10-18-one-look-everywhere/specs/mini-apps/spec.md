## MODIFIED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, one light look whatever the device's light or dark setting, and one frame whose left edge is the same on every page. Every page SHALL use the whole frame, none in a narrower column of its own, and a page SHALL never be wider than the screen. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page, then /apps/hello/, then Access
- **THEN** all three show the same font, parts, and light colors, and their headings start at the same left edge with their content reaching the same right edge

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file

### Requirement: The starter and example share an editable identity

The starter and supplied example SHALL show the WongStack mark and name in a compact header with the mark and name forming the keyboard-accessible link home, without a second Home link. They SHALL share a neutral light theme consistent with WongStack Cloud. Their branding SHALL remain changeable through the ordinary workspace change process. Updates SHALL preserve an install's customized identity through review rather than silently overwrite it.

#### Scenario: Open the supplied example

- **WHEN** a person opens the starter home and follows its Hello card
- **THEN** both pages show the same WongStack identity and theme, and the example provides a clear way home

#### Scenario: A customized install updates

- **WHEN** an install with its own identity takes a reviewed starter update
- **THEN** its chosen branding is preserved or explicitly adapted in that review
