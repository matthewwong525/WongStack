## MODIFIED Requirements

### Requirement: A mini app takes the same change loop as any change

A request for a new small page or tool, or a change to one, SHALL take the normal change loop: plan, preview, save, ship. Only where its files live SHALL set it apart; no skill SHALL have a separate mini-app route.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it and ends on the review link and a line to review it, asking no question
- **AND** after building, it reports the preview at `/apps/tips/` and asks whether to publish it
