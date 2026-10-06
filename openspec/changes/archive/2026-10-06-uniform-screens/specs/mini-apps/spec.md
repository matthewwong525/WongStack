# Spec Delta

## MODIFIED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, light or dark to match the device, and one frame whose left edge is the same on every page. Every page SHALL use the whole frame, none in a narrower column of its own, and a page SHALL never be wider than the screen. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page, then /apps/hello/, then Access
- **THEN** all three show the same font, parts, and light or dark colors, and their headings start at the same left edge with their content reaching the same right edge

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file
