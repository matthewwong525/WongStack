# Spec Delta

## MODIFIED Requirements

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
