# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page says what each way to install costs

On the same page as its install steps, through the steps or their adjacent setup questions, the landing page SHALL say, for each way to install that works on the day it is published, which accounts it needs, which computers it works on, and what it costs. It SHALL NOT call the install, or any way to install, free while every way needs a paid plan from another company.

#### Scenario: A visitor on a Mac reads the install section

- **WHEN** a visitor reads the install section and its adjacent setup questions before starting
- **THEN** they can tell that every way to install needs Cloudflare's paid plan and what that costs, and that the way with GitHub also needs a GitHub account

#### Scenario: Every page is read for the word free

- **WHEN** the install section, its buttons and its setup questions are read
- **THEN** none calls the install or a way to install free
