# Spec Delta

## MODIFIED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, light or dark to match the device, and a narrow column. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then /apps/hello/
- **THEN** both pages show the same font, parts, and light or dark colors, with readable text and visible keyboard focus

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file

## ADDED Requirements

### Requirement: Screens on the earlier plain look move onto the parts on update

When an installed repo has screens of its own built on the earlier shared stylesheet, its next update SHALL plan moving each one onto the ready-made parts, and SHALL name every screen it moves. Each moved screen SHALL appear in the update's preview before anything is published. A moved screen SHALL keep its address, its behavior, and its data.

#### Scenario: An install with a mini app of its own updates

- **WHEN** a repo with its own mini app `quotes`, styled by its own stylesheet, syncs to this release
- **THEN** the update plan names `quotes`, the preview serves `/apps/quotes/` built from the parts, and it does what it did before
