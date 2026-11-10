## ADDED Requirements

### Requirement: Choices are asked in the chat, never on a review page

Every choice and typed answer the work needs SHALL be asked as a question card in the chat, by the same rules as every other question, before the review page is made. A question that comes up while a page waits, such as from the person's notes, SHALL be asked in the chat too, and the page SHALL then be rebuilt. The review page SHALL be kept for the final look, *OK*, notes, and the bar's buttons.

#### Scenario: A plan needs the button's words

- **WHEN** a plan needs to know whether the button says *Shop now* or *See the sale*
- **THEN** the chat asks it as a question card, records the answer, and the review page shows the chosen words with nothing to fill in

#### Scenario: A note opens a new choice

- **WHEN** the person's notes on a waiting plan open a choice between two layouts
- **THEN** the chat asks it as a question card, then updates the plan and shows its new link
