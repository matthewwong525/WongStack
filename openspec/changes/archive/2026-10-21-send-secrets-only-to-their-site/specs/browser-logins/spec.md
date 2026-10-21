## ADDED Requirements

### Requirement: A saved login is typed only on its saved site

The browser SHALL type a saved login's username or password only while the tab's page is on that login's saved host: the same host, `www.` dropped, or one sitting under the other. It SHALL check right before each value it types, so a page that moves to another site between the username and the password gets no password. On any other host it SHALL type nothing, submit nothing, and report `wrong-site`; the agent SHALL then treat the page as having no saved login.

#### Scenario: A look-alike site

- **WHEN** a login is saved for `bank.example` and the agent runs it on a page at `bank.example.attacker.example`
- **THEN** the browser reports `wrong-site`, and neither the username nor the password is typed

#### Scenario: The page moves after the email step

- **WHEN** the username is typed on the saved site and the page is on another host before the password is typed
- **THEN** the browser reports `wrong-site`, and the password is not typed
