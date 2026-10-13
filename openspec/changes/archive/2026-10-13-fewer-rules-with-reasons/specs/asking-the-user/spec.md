# Spec Delta

## REMOVED Requirements

### Requirement: A reply that makes or changes a plan prints its link

**Reason**: It carried five scenarios and the reply's exact wording. The promise is kept, under a new name, as "A changed plan's reply carries its link".

**Migration**: None. The assistant prints the same link in the same place; the wording lives in the ask convention.

### Requirement: A reply that prints a preview link offers to show it again

**Reason**: It carried three scenarios and the reply's exact wording. The promise is kept, under a new name, as "A preview link opens the page that changed".

**Migration**: None. The assistant prints the same link in the same place; the wording lives in the ask convention.

### Requirement: Consequential alternatives receive a grounded recommendation

**Reason**: Its second half, that a settled request acquires no artificial alternatives, restated a rule the skill no longer carries: comparing is asked for only on a consequential choice. The promise is kept, under a new name, as "A consequential choice gets a grounded recommendation".

**Migration**: None. A choice with several workable approaches still gets a comparison and a recommendation.

## ADDED Requirements

### Requirement: A changed plan's reply carries its link

A reply that creates a plan, or changes what it says or its checklist, SHALL show the full link to the plan's review page as its own chat line above any closing question, never inside it, and that question SHALL offer to review the plan. Choosing to review SHALL show the link again and start nothing. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change, and the link SHALL NOT add a stop.

#### Scenario: A plan finishes

- **WHEN** `/plan` finishes, or `/apply` plans a change and goes on to build it
- **THEN** the reply shows the plan's link above any closing question, and a closing question offers to review the plan

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no review of the plan

### Requirement: A preview link opens the page that changed

A reply that prints a preview link SHALL print the full address of the page that shows the change, and the home page only when the change has no page of its own, as its own chat line above any closing question, never inside it. That question SHALL offer to show the preview again; choosing it SHALL show the link and start, save, or publish nothing.

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page, and the closing question offers to show the preview again

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no preview

### Requirement: A consequential choice gets a grounded recommendation

When an open consequential choice has multiple viable approaches, exploration SHALL provide meaningfully different alternatives, their practical consequences, and a recommended approach supported by the available context.

#### Scenario: Two approaches could satisfy the outcome

- **WHEN** the choice between viable approaches changes the outcome, compatibility, or acceptance criteria
- **THEN** the person receives distinct options with their consequences and a reasoned recommendation
