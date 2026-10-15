## ADDED Requirements

### Requirement: The landing page tells the self-drive story in order

The landing page's headline SHALL be "Self-drive your business." and SHALL name no product. Below it, the page SHALL tell the story in this order: the business needs the same three things a self-driving car does (Data, Process, Reason); one section each for Data, Process, and Reason; one worked example; a chart of which products keep which of the three; then the assistants it works with, what setup handles, and the install steps. The Reason section SHALL say reasons are saved from chats, and SHALL NOT show the visitor asking the assistant to remember.

#### Scenario: A visitor reads the page top to bottom

- **WHEN** a visitor reads the landing page's section headings in order
- **THEN** the headline reads "Self-drive your business.", and the sections come as the same three, Data, Process, Reason, the example, the chart, the assistants, the setup, and install

#### Scenario: A visitor reads the Reason section

- **WHEN** a visitor reads the Reason section
- **THEN** it says reasons are saved from chats, and no message in it asks the assistant to remember

### Requirement: The landing page compares only what other products' own pages say

A chart on the landing page MAY compare WongStack with named products. Every mark it gives another product SHALL be one of two: what that product's own pages say it does, or *not stated*. It SHALL NOT say another product lacks something. The chart SHALL show the month its marks were checked, and the page's source SHALL name the page behind each mark.

#### Scenario: A visitor reads another product's column

- **WHEN** a visitor reads a column for a product other than WongStack
- **THEN** each mark reads as said by that product or *not stated*, none says it lacks a feature, and the chart shows when the marks were checked

### Requirement: The landing page names assistants and chat apps as examples, as needed by none

The landing page SHALL NOT present any assistant or chat app as needed to install or use WongStack. Its install steps SHALL say an assistant that can work on the visitor's computer before naming one, and SHALL name one only as an example. A picture of a named chat app SHALL be said to show what the maintainer uses. The page's headline, and the text a shared link shows, SHALL name only assistants WongStack sets up and that work as a working assistant on the day the page is published.

#### Scenario: A visitor who uses another assistant reads the install steps

- **WHEN** a visitor reads the first install step
- **THEN** it says to open an assistant that can work on their computer, and any assistant it names comes after that, as an example

#### Scenario: A link to the page is shared

- **WHEN** the page's headline and its shared-link text are read
- **THEN** every product they name is an assistant the install steps also name, and neither names a product WongStack has not been set up and tried with

## REMOVED Requirements

### Requirement: The landing page names assistants and chat apps as examples

**Reason:** The page now carries a sourced comparison chart, so its rule against any comparison goes; the moving-headline clause goes with the rotator.
**Migration:** The rest of its text and scenarios move to *The landing page names assistants and chat apps as examples, as needed by none*; the comparison rule becomes *The landing page compares only what other products' own pages say*.
