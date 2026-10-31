# Spec Delta

## Purpose
Lets a person ask for a slide deck and get an editable PowerPoint file, previewed and downloaded through a link, built with no tool WongStack does not already need.

## ADDED Requirements

### Requirement: A requested deck arrives as an editable PowerPoint file

When a person asks for a deck, the agent SHALL produce a .pptx file whose slide text, shapes and arrows are editable objects, not pictures of slides. The file SHALL open in PowerPoint, Keynote, LibreOffice and Google Slides' import. Building it SHALL need only the tools WongStack already requires: no Python, no package install, no change to the repo's dependencies.

#### Scenario: A deck is built on a fresh install

- **WHEN** a person on an install with only WongStack's required tools asks for a deck about a topic
- **THEN** they get a .pptx file, and nothing was installed to build it

#### Scenario: The person edits a slide's picture

- **WHEN** the person opens the file and clicks a box or an arrow in a slide's picture
- **THEN** it selects as a shape they can move or retype

### Requirement: Pictures fit the idea on each slide

A deck SHALL offer several kinds of picture (steps, a loop, before and after, a hub, layers, a timeline), every kind drawn as editable shapes, so slides need not share one drawing. An outline that names no kind SHALL still build as steps.

#### Scenario: A deck mixes picture kinds

- **WHEN** an outline gives one slide a loop and another a before-and-after picture
- **THEN** the file shows each slide with its own kind of picture, and each part of it selects as a shape

### Requirement: The person sees and downloads the deck from a link

The agent SHALL send the finished deck as a reply link whose page shows every slide and offers the file to download. Changes the person sends from that page SHALL reach the chat, and the agent SHALL rebuild the deck from them. Where no reply link can open, the agent SHALL say where the file is on the computer.

#### Scenario: The person asks for a change from the page

- **WHEN** the person types a change on the deck's page and sends it
- **THEN** the chat receives it, and the agent sends a new link with the rebuilt deck

#### Scenario: No link can open

- **WHEN** a reply link can not open on this computer
- **THEN** the agent names the file's place on the computer, and the deck is still built

### Requirement: A deck can be changed later

A deck's outline and file SHALL be kept outside the repo, under the person's home folder, so a later chat can change the same deck without starting over, and so a deck never enters git unasked.

#### Scenario: A later chat changes a deck

- **WHEN** a person in a new chat asks to change a deck made earlier
- **THEN** the agent changes that deck's outline and rebuilds it, keeping the slides not named in the request
