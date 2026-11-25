## ADDED Requirements

### Requirement: A reply-link page can show media the chat sent with it

A chat SHALL be able to open a reply-link page in the inbox with pictures and videos from its computer. The page SHALL get each one by its name, and SHALL get nothing for a name the chat did not send.

#### Scenario: A page with two videos
- **WHEN** a chat opens a reply-link page with two videos and the page asks for the first by name
- **THEN** the page gets that video and plays it

#### Scenario: The person is signed out
- **WHEN** a chat opens a page with media and the computer is not signed in to the app
- **THEN** nothing is uploaded, and the chat gets the sign-in line

### Requirement: A reply-link page can send files with its answer

A reply-link page's send SHALL be able to carry files with its words, and the chat SHALL get each file as it gets a review page's files.

#### Scenario: Choices as a file
- **WHEN** a page sends "Publish 12" with a file named choices.json
- **THEN** the chat gets the words and the saved file's place on the computer
