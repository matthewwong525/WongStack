# landing-site Specification

## Purpose
The public landing page for WongStack, kept in this repo: what a visitor is told and offered, how its install wording stays true, and how it is checked and published apart from everything an install receives.

## Requirements

### Requirement: The landing page says what WongStack is and how to install it

The landing page SHALL be public, with no sign-in, and SHALL tell a visitor what WongStack is, who built it and why, and how to install it on their own computer, with the install message ready to copy. It SHALL be usable at phone width. A shared link to it SHALL show a preview card with the WongStack name, a description, and a picture.

#### Scenario: A visitor opens the page on a phone

- **WHEN** a visitor opens the landing page at phone width
- **THEN** they see the headline, the install steps with the message and a way to copy it, and nothing that asks them to sign in, and no part of the page needs sideways scrolling

#### Scenario: The browser refuses the copy

- **WHEN** a visitor presses the copy button and the browser refuses clipboard access
- **THEN** the message stays on the page and the page says to select and copy it by hand

### Requirement: The landing page offers no paid hosting

The landing page and every page beside it SHALL NOT offer or mention a paid plan, a price, a trial, a subscription, a WongStack account or sign-in, or a rented server, and SHALL NOT name a server provider. An address the earlier hosted app served SHALL show the landing page, never an error page.

#### Scenario: Every page is read for hosting words

- **WHEN** the text of every page of the site is read
- **THEN** no plan, price, trial, subscription, WongStack sign-in, rented server, or server provider appears

#### Scenario: A visitor follows an old link

- **WHEN** a visitor opens an address the earlier hosted app used, such as its pricing or sign-in page
- **THEN** the landing page shows

### Requirement: The install wording stays true and has one home

The install message on the landing page SHALL be the exact message the README gives. Everything the page says about installing (the message, the steps, the accounts a person needs, and the computers it works on) SHALL be kept in one place, so a change to how WongStack installs updates the page with one edit. The page SHALL describe only an install route that works on the day it is published.

#### Scenario: The README's message changes

- **WHEN** a change alters the README's install message and leaves the landing page's message as it was
- **THEN** the automatic checks fail and name both files

### Requirement: The privacy page promises only what is true

The site SHALL carry a privacy page that says what the site and the software do with a person's data, and each sentence SHALL be true of the site as built. The site SHALL set no cookie and SHALL load nothing from another company's address. The site SHALL carry no terms of service for a paid service.

#### Scenario: The built site is read for outside addresses

- **WHEN** the site's pages, styles, and pictures are checked
- **THEN** every file they load comes from the site itself

### Requirement: The landing page never ships to an install

The landing page SHALL be meta-only: no install or sync SHALL receive any of its files, and its presence SHALL NOT change what the starter app's build, deploy, or checks act on.

#### Scenario: The shipped file list is read

- **WHEN** the list of files an install receives is read
- **THEN** it names no file of the landing page

#### Scenario: The starter app's scripts look for their deploy config

- **WHEN** the starter app's scripts look up the deploy config in this repo
- **THEN** they find the starter app's and never the landing page's

### Requirement: The landing page has its own checks, preview, and publish

A change that touches the landing page SHALL run the landing page's checks and SHALL produce a link to look at that shows the change. A change that leaves the landing page untouched SHALL skip them, and the check SHALL still report. Publishing a landing page change SHALL put it live at the site's own address. A preview SHALL never replace the live site.

#### Scenario: A change edits the landing page

- **WHEN** a change that edits the landing page is saved
- **THEN** the landing page's checks run and a link to its preview shows beside the change's checks

#### Scenario: A change leaves the landing page alone

- **WHEN** a change that touches no landing page file is saved
- **THEN** the landing page's checks and deploy skip, and the check reports that they skipped

### Requirement: wongstack.com shows the landing page

The published landing page SHALL answer at `wongstack.com` and `www.wongstack.com`, and SHALL stay reachable at its own address. Only a publish from the default branch SHALL attach those names: a preview of an unpublished change SHALL NOT take either one.

#### Scenario: A visitor opens wongstack.com

- **WHEN** a visitor opens `wongstack.com` or `www.wongstack.com` after this change is published
- **THEN** they see the landing page, with no sign-in and no pricing

#### Scenario: A later change is previewed

- **WHEN** an unpublished landing page change is previewed
- **THEN** the preview is shown at its own preview address, and `wongstack.com` keeps showing the published page

### Requirement: The landing page names assistants and chat apps as examples

The landing page SHALL NOT present any assistant or chat app as needed to install or use WongStack. Its install steps SHALL say an assistant that can work on the visitor's computer before naming one, and SHALL name one only as an example. A picture of a named chat app SHALL be said to show what the maintainer uses. The page's headline, and the text a shared link shows, SHALL say what WongStack is in its own words and SHALL name no other product.

#### Scenario: A visitor who uses another assistant reads the install steps

- **WHEN** a visitor reads the first install step
- **THEN** it says to open an assistant that can work on their computer, and any assistant it names comes after that, as an example

#### Scenario: A link to the page is shared

- **WHEN** the page's headline and its shared-link text are read
- **THEN** neither names another company's product
