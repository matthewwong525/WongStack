# Spec Delta

## ADDED Requirements

### Requirement: Every page shares one stylesheet

The main app SHALL serve one shared stylesheet at `/style.css`, holding the look every page shares: the device's font, light or dark to match the device, and a narrow column. The starter app and the example mini app SHALL link it rather than copy its rules. A page's own rules SHALL live beside it. The shared look SHALL use no UI library or CSS framework.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then `/apps/hello/`
- **THEN** both pages load `/style.css` and show the same font and light or dark colors

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page markup, page script, and API in separate files, and its API SHALL dispatch through a route list, with no build step. An unknown API route SHALL answer 404.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page
