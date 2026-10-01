# mini-apps Specification

## Purpose

Let a person get a small standalone app from one request, in its own folder served by the main app at `/apps/<name>/`, through the same change loop as any change, with the landing page listing every mini app.

## Requirements

### Requirement: A mini app lives in its own folder, served by the main app

Each mini app SHALL be part of the main app: written, built, and tested the same way as the main app's own pages, with its page in its own folder and its optional server side in a matching folder, and a manifest holding a title and description. The main app SHALL serve its page at `/apps/<name>/` and its server side at `/apps/<name>/api/*`; there SHALL be no separate mini-app Worker, build step, or copy step.

#### Scenario: A saved app goes live

- **WHEN** the mini app `tips` is published and production deploys
- **THEN** `https://<app>/apps/tips/` serves it from the main app's Worker

### Requirement: A mini app carries its own tests

A mini app's plan SHALL include tests for its logic in its own folders. The main app's test suite SHALL run them, under the same checks and limits as the rest of the main app, in the required `test` check.

#### Scenario: A failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` cannot merge it

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its guidance with a removable welcome that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

### Requirement: A mini app takes the same change loop as any change

A request for a new small page or tool, or a change to one, SHALL take the normal change loop: plan, preview, save, ship. Only where its files live SHALL set it apart; no skill SHALL have a separate mini-app route.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it, prints the review link, and asks whether to build it now
- **AND** after building, it reports the preview at `/apps/tips/` and asks whether to publish it

### Requirement: Every page shares one stylesheet

The main app SHALL serve one shared stylesheet at /style.css, holding the look every page shares: the device's font, light or dark to match the device, and a narrow column. The starter app and the example mini app SHALL link it rather than copy its rules. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes. A page's own rules SHALL live beside it. The shared look SHALL use no UI library or CSS framework.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then /apps/hello/
- **THEN** both pages load /style.css and show the same font and light or dark colors, with readable text and visible keyboard focus

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page, its parts, and its server side in separate files, and its server side SHALL dispatch through a route list. An unknown API route SHALL answer 404.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

### Requirement: The starter and example share an editable identity

The starter and supplied example SHALL show the WongStack mark and name in a compact header with the mark and name forming the keyboard-accessible link home, without a second Home link. They SHALL share a neutral light/dark theme consistent with WongStack Cloud. Their branding SHALL remain changeable through the ordinary workspace change process. Updates SHALL preserve an install's customized identity through review rather than silently overwrite it.

#### Scenario: Open the supplied example

- **WHEN** a person opens the starter home and follows its Hello card
- **THEN** both pages show the same WongStack identity and theme, and the example provides a clear way home

#### Scenario: A customized install updates

- **WHEN** an install with its own identity takes a reviewed starter update
- **THEN** its chosen branding is preserved or explicitly adapted in that review

### Requirement: The supplied example is usable on a phone

The supplied Hello example SHALL present a clearly labeled name field, a primary greeting action, and an announced greeting result. Its field and action SHALL fit narrow phone screens without horizontal scrolling and be operable by keyboard. An unsuccessful greeting response SHALL leave the form usable and show the existing retry instruction.

#### Scenario: Request a greeting

- **WHEN** a person enters their name and submits the form on a phone or by keyboard
- **THEN** the greeting appears beneath the action and is announced without losing the entered name

#### Scenario: A greeting response fails

- **WHEN** the greeting returns an unsuccessful response
- **THEN** the form retains the entered name and offers a retry instruction

### Requirement: The first request remains copyable

The welcome SHALL confirm when its first request is copied. If the browser cannot copy it, the page SHALL give a plain instruction to copy by hand and keep the full request selectable. Copying SHALL NOT send a chat message or edit or publish the workspace.

#### Scenario: Successful copy

- **WHEN** a person copies the first request and the browser accepts the copy
- **THEN** the clipboard contains the full request and the page confirms the copy, with guidance to paste it in the existing chat

#### Scenario: Clipboard access is unavailable

- **WHEN** clipboard access is missing or the browser rejects the copy
- **THEN** the full request remains selectable and the person receives a copy-by-hand instruction

### Requirement: The existing calculator matches the starter

The repository's existing tip calculator SHALL use the same editable brand header and neutral light/dark appearance as the starter and Hello, with the brand linking home. It SHALL retain immediate recalculation, accessible input labels and selected tip state, announced results, and existing empty/invalid-input guidance. Its controls and results SHALL fit narrow phone screens. This requirement SHALL NOT add the calculator to the distributed starter payload.

#### Scenario: Calculate a share

- **WHEN** a person changes the bill, selected tip, or number of people
- **THEN** the share updates immediately in the styled result area and the selected tip remains clear
- **AND** tapping the brand returns home

#### Scenario: Empty or invalid input

- **WHEN** the bill is empty or an input is invalid
- **THEN** the existing guidance appears and all fields remain editable without horizontal scrolling

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive every binding and secret the main app's Worker has, except the memory store's bindings, and SHALL receive the verified identity of the caller: a person's email, or a service token's name. The Worker SHALL keep every other runtime route to its bindings, such as importing them, turned off. The docs SHALL say a mini app shares the Worker with the memory store, so the limit stops mistakes, not code written to get around it. A preview SHALL use staging data and staging keys, never production.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, the app's saved keys, and the signed-in person, and no memory binding

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory binding reaches it

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. A preview SHALL list the app it previews. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

### Requirement: The home page's app list guides first use

The home page SHALL present each mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example. With no apps it SHALL explain how to ask for a first tool. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with apps
- **THEN** each app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the person sees a first-tool request to copy into their chat

### Requirement: Existing mini apps move into the main app on update

When an installed repo still has mini apps in the old separate folder, its next update SHALL plan moving each one into the main app, at the same addresses and with the same data, and SHALL then remove the old folder. Each moved app SHALL appear in the update's preview before anything is published. An app the person changed SHALL keep its behavior; the plan SHALL name every app it moves.

#### Scenario: An install with two mini apps updates

- **WHEN** a repo with mini apps `hello` and `runs` in the old folder syncs to this release
- **THEN** the update plan moves both into the main app, the preview serves `/apps/hello/` and `/apps/runs/`, and the old folder is gone once it is published

#### Scenario: An app's data survives

- **WHEN** the moved `runs` app reads the table its old version wrote
- **THEN** it finds the same rows, because the move changes no database table
