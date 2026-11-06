## MODIFIED Requirements

### Requirement: A website with no API is not connected yet

For a tool the company app can not reach by a key, such as the person's own mail, the helper SHALL say it is not connected yet. It SHALL NOT sign in to that site, open its own browser, or send a live view while connecting.

#### Scenario: The person's own mail

- **WHEN** the person names their own Gmail
- **THEN** the list shows it as not connected yet, and no browser page or live view opens
