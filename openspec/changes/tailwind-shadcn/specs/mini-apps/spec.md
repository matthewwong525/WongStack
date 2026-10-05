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

## ADDED Requirements

### Requirement: Screens on the earlier plain look move onto the parts on update

When an installed repo has screens of its own built on the earlier shared stylesheet, its next update SHALL plan moving each one onto the ready-made parts, and SHALL name every screen it moves. Each moved screen SHALL appear in the update's preview before anything is published. A moved screen SHALL keep its address, its behavior, and its data.

#### Scenario: An install with a mini app of its own updates

- **WHEN** a repo with its own mini app `quotes`, styled by its own stylesheet, syncs to this release
- **THEN** the update plan names `quotes`, the preview serves `/apps/quotes/` built from the parts, and it does what it did before
