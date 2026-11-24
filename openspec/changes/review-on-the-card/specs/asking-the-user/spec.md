## ADDED Requirements

### Requirement: A question carries what the person must review

When the person must read a draft, a table, a list of changes, or a report to answer a question, the question text SHALL hold it, because a host can hide the text above a question. When it is longer than about 40 lines, the chat SHALL put it on a page or file the person can open and SHALL put a short summary and the full link in the question text. In Claude Code, an installed repo SHALL send back once a question that holds neither a review block printed since the person last spoke or answered, nor a link. A review block is a code fence that is not a drawing, a table, or a quote; a list is not, and a question that offers to close the chat is not checked.

#### Scenario: A short draft

- **WHEN** a reply writes a 10-line email draft and asks whether to send it
- **THEN** the question text holds the whole draft

#### Scenario: The review is missing

- **WHEN** a reply prints a table above a question whose text holds no row of it and no link
- **THEN** the question is sent back once, and the chat asks again with the table in the question
