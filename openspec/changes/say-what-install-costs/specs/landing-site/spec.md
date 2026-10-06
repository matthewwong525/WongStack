# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page offers no paid hosting

The landing page and every page beside it SHALL NOT offer or mention a WongStack paid plan, price, trial, subscription, account or sign-in, or a rented server, and SHALL NOT name a server provider. The only cost a page names SHALL be what another company charges for an account the install uses, said with that company's name. An address the earlier hosted app served SHALL show the landing page, never an error page.

#### Scenario: Every page is read for hosting words

- **WHEN** the text of every page of the site is read
- **THEN** no WongStack plan, price, trial, subscription, sign-in, rented server, or server provider appears, and the only cost named is another company's charge for an account the install uses

#### Scenario: A visitor follows an old link

- **WHEN** a visitor opens an address the earlier hosted app used, such as its pricing or sign-in page
- **THEN** the landing page shows

## ADDED Requirements

### Requirement: The landing page says what each way to install costs

Beside its install steps, the landing page SHALL say, for each way to install that works on the day it is published, which accounts it needs, which computers it works on, and what it costs. It SHALL say which way is free. Where the page calls the install free, a visitor SHALL be able to read on the same page which way that is.

#### Scenario: A visitor on a Mac reads the install section

- **WHEN** a visitor reads the install section before starting
- **THEN** they can tell that keeping everything in Cloudflare alone needs Cloudflare's paid plan and what that costs, and that the way with a GitHub account is free
