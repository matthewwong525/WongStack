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

The starter landing page SHALL have a permanent workspace heading and open its employer guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to get to know the person, personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it. Every signed-in person SHALL see one assistant connection prompt on the page. Once Access per-app permissions have started, employees SHALL see that prompt and their authorized apps without employer personalization or administration guidance; the employer's existing removable welcome SHALL be preserved.

#### Scenario: A fresh install

- **WHEN** the employer opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

#### Scenario: Employee opens a configured app

- **WHEN** an employee opens the business app after Access per-app permissions have started
- **THEN** the page offers their assistant setup prompt and allowed apps, without giving them employer personalization or administration guidance

### Requirement: A mini app takes the same change loop as any change

A request for a new small page or tool, or a change to one, SHALL take the normal change loop: plan, preview, save, ship. Only where its files live SHALL set it apart; no skill SHALL have a separate mini-app route.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it, prints the review link, and asks whether to build it now
- **AND** after building, it reports the preview at `/apps/tips/` and asks whether to publish it

### Requirement: Every page shares one stylesheet

The main app SHALL give every page, each mini app's included, one shared look from one stylesheet: the device's font, light or dark to match the device, and one frame whose left edge is the same on every page. Text and forms SHALL keep a readable width inside the frame, and a page SHALL never be wider than the screen. Every screen SHALL be built from one set of ready-made parts copied into the app, on a utility CSS framework. A page SHALL NOT carry a stylesheet of its own, and the app's checks SHALL fail when one does. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page, then /apps/hello/, then Access
- **THEN** all three show the same font, parts, and light or dark colors, and their headings start at the same left edge

#### Scenario: A new mini app brings its own stylesheet

- **WHEN** a change adds a mini app whose folder holds a stylesheet
- **THEN** the app's checks fail and name that file

### Requirement: The example mini app is set up to grow

The example mini app SHALL keep its page, its parts, and its server side in separate files, and its server side SHALL dispatch through a route list. An unknown API route SHALL answer 404. The example's greeting action SHALL carry an explicit input/output contract used for company API discovery and validation, with the app and an authenticated agent calling the same handler. Existing greeting behavior SHALL be preserved. An installed app's unconverted route SHALL remain usable and SHALL not be automatically advertised until deliberately described.

#### Scenario: A copied app gains a route

- **WHEN** the agent adds an API route to a mini app copied from the example
- **THEN** it adds one entry to the route list and a handler, without touching the page

#### Scenario: The example is called by an agent

- **WHEN** an authenticated agent discovers and calls the greeting action
- **THEN** it uses the same endpoint and receives the greeting the example app would receive for that name

#### Scenario: A customized installed app updates

- **WHEN** an installed app's existing route has not yet received a discovery contract
- **THEN** it retains its original path, behavior and authorization and is absent from agent discovery

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

A mini app's server side SHALL receive the main app's business bindings, the saved business-service keys its app lists and no others, and the verified identity of the caller: a person's email or a service token's name. It SHALL receive no memory-store bindings or Access login-management credential. Identity-checked finite core operations SHALL provide required administration without exposing those secrets. The Worker SHALL keep other runtime routes to bindings, such as importing them, turned off. The docs SHALL say mini apps share the Worker with core authorization and memory, so binding exclusions stop mistakes rather than malicious deployed code. A preview SHALL use staging data and keys, never production management credentials or provider mutations.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, the business-service keys its app lists and the signed-in person, but no memory bindings or raw connection-management credentials

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory or connection-management binding reaches it

#### Scenario: The owner manages access on a preview

- **WHEN** the verified employer uses Access on a preview
- **THEN** people and app choices are saved in staging data with no login-provider call and no production credential

#### Scenario: The owner manages access

- **WHEN** the verified employer uses the Access mini app's approved core operations
- **THEN** the operation can reconcile the assigned membership without returning a provider key to the mini-app handler or user

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build that the current caller is authorized to use, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. When Access per-app policy is enabled, an employee's list SHALL offer assigned apps and applicable self-service setup as links, and SHALL show each app they are not assigned as unavailable, marked by more than color; choosing an unavailable app SHALL open nothing and SHALL tell the person to ask their admin for access. Direct navigation SHALL enforce the same current app permission. The verified employer SHALL retain access to the app catalogue and Access administration. A preview SHALL list the app it previews for its authorized viewer. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

#### Scenario: Employee has selected apps

- **WHEN** an employee has Orders permission and no Payroll permission
- **THEN** the home page offers Orders and applicable setup, shows Payroll as unavailable, answers a click on Payroll with ask-your-admin guidance, and a direct Payroll visit is denied

### Requirement: The home page's app list guides first use

The home page SHALL present each authorized mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example when available. With no apps built it SHALL explain how the employer can ask for a first tool. The list SHALL include a Connect your assistant entry for every signed-in person, which opens the setup steps over the page without leaving it. An employee with no assigned apps SHALL see guidance to contact the employer and retain access to their own setup. Unavailable permission readback SHALL show a safe retry state without an unrestricted list. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with authorized apps
- **THEN** each allowed app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled when allowed

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the employer sees a first-tool request to copy into their chat

#### Scenario: Employee has no assigned apps

- **WHEN** an employee signs in with no assigned business apps
- **THEN** the page gives contact-your-employer guidance and their setup entry without granting project creation or another app

#### Scenario: A person opens Connect your assistant from the list

- **WHEN** a signed-in person chooses Connect your assistant in the home page's list
- **THEN** the setup steps open over the home page, and closing them leaves the person on the home page

### Requirement: Existing mini apps move into the main app on update

When an installed repo still has mini apps in the old separate folder, its next update SHALL plan moving each one into the main app, at the same addresses and with the same data, and SHALL then remove the old folder. Each moved app SHALL appear in the update's preview before anything is published. An app the person changed SHALL keep its behavior; the plan SHALL name every app it moves.

#### Scenario: An install with two mini apps updates

- **WHEN** a repo with mini apps `hello` and `runs` in the old folder syncs to this release
- **THEN** the update plan moves both into the main app, the preview serves `/apps/hello/` and `/apps/runs/`, and the old folder is gone once it is published

#### Scenario: An app's data survives

- **WHEN** the moved `runs` app reads the table its old version wrote
- **THEN** it finds the same rows, because the move changes no database table

### Requirement: The first request learns about the person

The first request SHALL ask the agent to ask permission before reading anything, then skim the person's Claude Code and Codex chats from the last 30 days on this computer, then ask two or three short rounds of questions about what it could not find. It SHALL ask the agent to save short notes about the person on their wiki page and in memory, never passwords, keys, or copies of chats, and only then to personalize the page with a preview and ask before publishing. The request SHALL name no file, folder, or command.

#### Scenario: Past chats found

- **WHEN** a person pastes the request on a computer with recent chats and allows the skim
- **THEN** the agent asks only what the chats did not answer, saves short notes about them, and shows a preview of their page before publishing

#### Scenario: No past chats or no permission

- **WHEN** the person declines the skim, or the computer has no recent chats, such as a hosted server
- **THEN** the agent reads nothing and goes straight to the question rounds

### Requirement: Screens on the earlier plain look move onto the parts on update

When an installed repo has screens of its own built on the earlier shared stylesheet, its next update SHALL plan moving each one onto the ready-made parts, and SHALL name every screen it moves. Each moved screen SHALL appear in the update's preview before anything is published. A moved screen SHALL keep its address, its behavior, and its data.

#### Scenario: An install with a mini app of its own updates

- **WHEN** a repo with its own mini app `quotes`, styled by its own stylesheet, syncs to this release
- **THEN** the update plan names `quotes`, the preview serves `/apps/quotes/` built from the parts, and it does what it did before
