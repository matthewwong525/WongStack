## MODIFIED Requirements

### Requirement: The key page carries the steps

For each asked-for key the agent MAY give a plain name, one line saying what the key is for, the address of the service's key page, and up to six short steps, written for that request from the service's public guidance. The page SHALL show them above that key's field, with a control that opens the address in the person's own browser, and SHALL show them as plain text only. The field SHALL read as the last step. The address SHALL be an `https` address. WongStack SHALL ship no per-service names, addresses, or steps. A key given none SHALL show a readable name made from its declared name, the declared name itself, and its hint.

#### Scenario: Steps on the page

- **WHEN** the agent sends a key link for `STRIPE_SECRET_KEY` with the name *Stripe key*, the line *So your assistant can read your charges.*, Stripe's key-page address, and four steps
- **THEN** the page is headed *Stripe key* with that line beneath it, lists the four steps with a control that opens Stripe's key page in a new tab, ends them with the field as a fifth step, and the chat message carries only the link

#### Scenario: No steps given

- **WHEN** the agent sends a key link naming only `MAPS_API_KEY`
- **THEN** the page shows *Maps API key*, `MAPS_API_KEY` beneath it, and the hint from its example-file comment
