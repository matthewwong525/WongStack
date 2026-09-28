## ADDED Requirements

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs the person (a login, a captcha, a code, or any other input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

### Requirement: A hand-over link closes itself

A hand-over link SHALL stop working when the finish the agent named is reached, when the person says they are done, or after 10 minutes, whichever comes first, even if the agent's session has ended. A closed link SHALL never work again. When the agent named a finish, it SHALL resume the task on reaching it without the person saying they are done.

#### Scenario: The person logs in

- **WHEN** the browser reaches the logged-in address the agent named
- **THEN** the link stops working and the agent resumes the task

#### Scenario: Nobody finishes

- **WHEN** 10 minutes pass without reaching the finish or hearing done
- **THEN** the link stops working and the agent tells the person it timed out

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it.

#### Scenario: A two-step code page

- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address
