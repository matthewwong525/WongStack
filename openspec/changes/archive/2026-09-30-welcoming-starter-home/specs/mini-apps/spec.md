# Mini apps delta

## MODIFIED Requirements

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its guidance with a removable welcome that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

### Requirement: Every page shares one stylesheet

The main app SHALL serve one shared stylesheet at /style.css, holding the look every page shares: the device's font, light or dark to match the device, and a narrow column. The starter app and the example mini app SHALL link it rather than copy its rules. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes. A page's own rules SHALL live beside it. The shared look SHALL use no UI library or CSS framework.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then /apps/hello/
- **THEN** both pages load /style.css and show the same font and light or dark colors, with readable text and visible keyboard focus

## ADDED Requirements

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

### Requirement: The starter app list guides first use

The starter app list SHALL present each available app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example. With no apps it SHALL explain how to ask for a first tool. Loading and a failed list SHALL be distinguished from an empty list, and a failure SHALL give a recovery instruction without hiding the welcome. The page SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** the app list loads available apps
- **THEN** each app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled

#### Scenario: Apps are not yet available to display

- **WHEN** the app list is empty, still loading, or fails to load
- **THEN** the person sees the matching state: a first-tool request, a loading message, or a recovery instruction
- **AND** any welcome guide remains available

### Requirement: The existing calculator matches the starter

The repository's existing tip calculator SHALL use the same editable brand header and neutral light/dark appearance as the starter and Hello, with the brand linking home. It SHALL retain immediate recalculation, accessible input labels and selected tip state, announced results, and existing empty/invalid-input guidance. Its controls and results SHALL fit narrow phone screens. This requirement SHALL NOT add the calculator to the distributed starter payload.

#### Scenario: Calculate a share

- **WHEN** a person changes the bill, selected tip, or number of people
- **THEN** the share updates immediately in the styled result area and the selected tip remains clear
- **AND** tapping the brand returns home

#### Scenario: Empty or invalid input

- **WHEN** the bill is empty or an input is invalid
- **THEN** the existing guidance appears and all fields remain editable without horizontal scrolling
