## ADDED Requirements

### Requirement: A question carries what the person must review

When the person must read a draft, a table, a list of changes, or a report to answer a question, the question text SHALL hold it, because a host can hide the text above a question. When it is longer than about 40 lines, the chat SHALL put it on a page the person can open and SHALL put a short summary and the page's full link in the question text. In Claude Code, an installed repo SHALL send back once a question that holds neither a review block printed since the person last spoke or answered, nor a link. A review block is a code fence that is not a drawing, a table, or a quote; a list is not, and a question that offers to close the chat is not checked.

#### Scenario: A long report

- **WHEN** the item to review is 120 lines long
- **THEN** it goes on a page, and the question holds a short summary and the page's full link

#### Scenario: The review is missing

- **WHEN** a reply prints a table above a question whose text holds no row of it and no link
- **THEN** the check sends the question back once, and the chat asks again with the table in the question

#### Scenario: Only status lines above

- **WHEN** a reply prints only plain sentences above a question
- **THEN** the check lets the question through
