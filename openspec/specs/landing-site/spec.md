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

The landing page and every page beside it, the guides and their plain-text copies included, SHALL NOT offer or mention a WongStack paid plan, price, trial, subscription, account or sign-in, or a rented server, and SHALL NOT name a server provider. The only cost a page names SHALL be what another company charges for an account the install uses, said with that company's name; a guide MAY also say that a step needs a tool's own plan, naming that tool and no price. An address the earlier hosted app served SHALL show the landing page, never an error page.

#### Scenario: Every page is read for hosting words

- **WHEN** the text of every page of the site, the guides included, is read
- **THEN** no WongStack plan, price, trial, subscription, sign-in, rented server, or server provider appears, and the only cost named is another company's charge for an account the install uses, or a tool's own plan named in a guide with no price

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

The landing page SHALL NOT present any assistant or chat app as needed to install or use WongStack. Its install steps SHALL say an assistant that can work on the visitor's computer before naming one, and SHALL name one only as an example. A picture of a named chat app SHALL be said to show what the maintainer uses. The page's headline, and the text a shared link shows, SHALL name only assistants WongStack sets up and that work as a working assistant on the day the page is published. Where the headline moves through several names, a visitor who asks for less motion SHALL see one name, still, and a screen reader SHALL read one sentence that names them all. The site SHALL NOT compare WongStack with another company's product.

#### Scenario: A visitor who uses another assistant reads the install steps

- **WHEN** a visitor reads the first install step
- **THEN** it says to open an assistant that can work on their computer, and any assistant it names comes after that, as an example

#### Scenario: A link to the page is shared

- **WHEN** the page's headline and its shared-link text are read
- **THEN** every product they name is an assistant the install steps also name, and neither names a product WongStack has not been set up and tried with

#### Scenario: Every page is read for a comparison

- **WHEN** the text of every page of the site is read
- **THEN** no table or sentence measures WongStack against another company's product

### Requirement: The landing page says what each way to install costs

On the same page as its install steps, through the steps or their adjacent setup questions, the landing page SHALL say, for each way to install that works on the day it is published, which accounts it needs, which computers it works on, and what it costs. It SHALL say which way is free. Where the page calls the install free, a visitor SHALL be able to read on the same page which way that is.

#### Scenario: A visitor on a Mac reads the install section

- **WHEN** a visitor reads the install section and its adjacent setup questions before starting
- **THEN** they can tell that keeping everything in Cloudflare alone needs Cloudflare's paid plan and what that costs, and that the way with a GitHub account is free

### Requirement: The landing page's comments stay short

The landing page's checks SHALL fail on a comment longer than two lines, or a comment line wider than 120 characters, in its JavaScript or TypeScript, under the same rule and the same exceptions as the scaffold.

#### Scenario: A long note is added to the landing page

- **WHEN** a change adds a three-line comment to a landing page source file
- **THEN** the landing page's checks fail and name the file and line

### Requirement: A landing page preview can only reach the staging site

A branch's landing page SHALL be installed, tested and built with no Cloudflare token. Its preview SHALL be deployed by the default branch's copy of the workflow's steps and the site's deploy settings, only to `wongstack-site-staging` with no routes. A branch's edits to the site's deploy settings SHALL apply when published, never in a preview. Only a push to the default branch SHALL publish wongstack.com.

#### Scenario: A branch points staging at the live site

- **WHEN** a branch sets the site's staging name to `wongstack-site` or `wongstack`, or drops staging's empty routes
- **THEN** its preview still deploys only to `wongstack-site-staging` with no routes

#### Scenario: A branch's site script reads the token

- **WHEN** a branch's site `package.json` adds a script that prints `CLOUDFLARE_API_TOKEN`
- **THEN** the script finds no token during install, test or build

### Requirement: The site offers paste-in attachments

The site SHALL have a public Attachments page, linked from every page's header, with one card per attachment. Each card SHALL state a problem and its fix in a sentence each, show the attachment's full text, and copy that text with one tap. Each card SHALL have its own link. An attachment's text SHALL be a list of bullets a person pastes into their own AI chat to build the fix, with no tool or name the reader lacks, ending with a bullet that points to the WongStack repository for more context.

#### Scenario: A visitor copies an attachment

- **WHEN** a visitor opens the Attachments page and taps a card's copy button
- **THEN** the card's full text is on their clipboard, and its last line points to the WongStack repository

#### Scenario: A link names one card

- **WHEN** a visitor opens a link to one attachment's card
- **THEN** the page opens at that card

### Requirement: An attachment changes when its source does

Each attachment SHALL name the WongStack files it is written from. The checks SHALL fail when a change edits one of those files and leaves its attachment unchanged, naming the attachment and the file. The checks SHALL also fail when an attachment names a file that does not exist.

#### Scenario: A source page changes alone

- **WHEN** a change edits the memory page and not the memory attachment
- **THEN** the checks fail, naming both, and the change can not publish until the attachment is rewritten or marked checked

#### Scenario: Both change together

- **WHEN** a change edits the memory page and the memory attachment
- **THEN** the check passes

### Requirement: Each guide gets a person or an agent from no key to a working, saved key

The site SHALL carry a public guide for each of these tools: Shopify, Shopify theme changes, Klaviyo, Meta ads, Google, Canva, Slack, and Notion. Every guide SHALL have the same shape: what the key lets you do, how long it takes, and what you need first; numbered steps that each name the exact button and show a picture; the permissions to choose, with the least the job needs; the names to save the values under in `.env`; a harmless check that only a working key passes; and how to replace the key if it leaks. Each guide SHALL show the date it was last checked against the tool. A guide SHALL NOT name WongStack or require any one agent or chat app.

#### Scenario: A person follows a guide alone

- **WHEN** a person with no developer knowledge opens the Klaviyo guide and does each step
- **THEN** they end with a key saved in `.env` under the names the guide gives, and the guide's check shows it works

#### Scenario: A guide is read for its parts

- **WHEN** the automatic checks read every guide
- **THEN** each one has its time, its needs, numbered steps with a picture each, the names to save, a check, the leak steps, and a last-checked date, or the checks fail and name the guide and the missing part

### Requirement: An agent can read every guide without a browser

Every guide SHALL open as a complete page that a reader can follow with no script, and SHALL also be served as plain text at its own address with `.md` added. One list at a fixed address SHALL name every guide with its address. Every guide SHALL open with a short part for an AI agent: ask the person before it makes anything, let the person sign in, never show a key in the chat, save the key to `.env`, and run the check.

#### Scenario: A person copies a code box

- **WHEN** a person taps *Copy* on a guide's code box, such as the line to save or the check
- **THEN** only that box's text is copied, and if the browser refuses, the text is selected for them to copy by hand

#### Scenario: An agent fetches a guide

- **WHEN** an agent fetches a guide's address, or the same address with `.md`, with a plain request that runs no script
- **THEN** it gets the full steps, the names to save, and the check, as text

### Requirement: Every guide teaches how to keep a key safe

The site SHALL carry one page on keeping keys safe, and every guide SHALL link it at the step where the key is saved. The page SHALL say that a key acts like a password to the business; that it goes in a `.env` file that git ignores, and never in a chat, an email, a screenshot, a shared document, or a public repository; to give each key the least access it needs; to keep a copy in a password manager; and to replace a key at once if it leaks, deleting the old one at the tool.

#### Scenario: The key leaks

- **WHEN** a reader whose key leaked opens the safety page
- **THEN** it tells them to make a new key, put it in `.env`, and delete the old key at the tool, because only the delete makes the leaked key useless

### Requirement: Guide pictures show no key and no private data

Every guide picture SHALL be a file the site serves itself. No picture SHALL show a key, token, password, or secret value, whole or in part; a screen that shows one SHALL appear only as a drawing. No picture SHALL show a real customer, a personal email, or an account ID that is not sample data. Each picture SHALL have text that says what it shows, so a reader who can not see it can still do the step.

#### Scenario: A step's screen shows the new key

- **WHEN** the step where the tool reveals the new key is written
- **THEN** its picture is a drawing of that screen, with no real or sample key value in it

#### Scenario: A picture is read

- **WHEN** the automatic checks read the guides
- **THEN** every picture the guides name exists in the site's files and has describing text, or the checks fail and name it
