# Spec Delta

## ADDED Requirements

### Requirement: A page can send files with its answers

A page on a reply link SHALL be able to send files with its text or its action, to the same chat only, with the link's secret, and within the page's limits on size, count, and type. The chat SHALL get each file's place on its computer, never the file's contents in its message. A page with a file question SHALL say not to send a password, a key, or a card through it.

#### Scenario: Notes with a file

- **WHEN** the person sends notes with one picked file on an open reply link
- **THEN** the file is saved on the computer, and the chat gets the notes and the file's place in one message

#### Scenario: Without the secret

- **WHEN** a request sends a file to the link's address without the link's secret
- **THEN** nothing is saved and the chat gets nothing
