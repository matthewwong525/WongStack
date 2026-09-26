## ADDED Requirements

### Requirement: A plan that stops for review links its page

On a successful build, the page builder SHALL print the absolute path of `review.html` on its own line, after its status line. A `/plan` that stops for review SHALL end its reply with one line that tells the person to click the link to see the plan, and a Markdown link to that path. The line SHALL come just above the next-step question, so the reply still ends with that question. A `/plan` that returns to `/apply` without a stop SHALL NOT need the line.

#### Scenario: The builder reports the page

- **WHEN** the builder writes or confirms a current `review.html`
- **THEN** its output holds the status line and then the page's absolute path

#### Scenario: A standalone plan

- **WHEN** `/plan` finishes a change and stops for review
- **THEN** the reply's last lines are "Click here to see the plan:" with a link to `review.html`, then the next-step question

#### Scenario: A plan inside a one-go ship

- **WHEN** `/ship` runs `/apply`, which runs `/plan`
- **THEN** the chain continues without the stop line
