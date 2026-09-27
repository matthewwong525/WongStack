## ADDED Requirements

### Requirement: A plain guide says how to add an API key

The `wiki/stack/` section SHALL include a page, written for a reader who is not a developer, on adding an API key for a service the app or the assistant uses. It SHALL say what an API key is, and that the reader gets it from the service's own site. It SHALL tell the reader to paste the key into the chat and say what it is for, so the assistant can name and save it. It SHALL say that the assistant saves the key in the same session to a private file that is never published. It SHALL also say that a key the live site needs goes to the hosting service as well. It SHALL say what to do when a key leaks: create a new one, paste it, and delete the old one at the service. It SHALL say that website logins are a different thing, kept by the browser tool, not pasted. It SHALL link the developer secrets page and the Cloudflare credentials page for details, and SHALL NOT restate their procedures. The section hub and the getting-started page SHALL link it.

#### Scenario: A non-technical user wants the app to use a new service

- **WHEN** a reader with no developer background wants the app to call a service that needs a key
- **THEN** the page tells them to get the key from the service and paste it into the chat with what it is for
- **AND** it names no command, file format, or variable-naming rule they must follow

#### Scenario: A key leaks

- **WHEN** a reader thinks a key was shared by mistake
- **THEN** the page tells them to make a new key, give it to the assistant, and delete the old key at the service

#### Scenario: A reader looks for the page

- **WHEN** a reader opens the `wiki/stack/` hub or the getting-started page
- **THEN** each links the API key page
