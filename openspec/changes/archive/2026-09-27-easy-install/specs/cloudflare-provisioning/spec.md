## MODIFIED Requirements

### Requirement: The credentials page owns the token

The `wiki/stack/` credentials page SHALL give a link that opens Cloudflare's token form pre-filled with exactly the two groups the user grants, all accounts, and the name `WongStack`. It SHALL keep the exact click path as the fallback, calling out the Account Resources field. It SHALL name the variables in `.env` as `.env.example` does, state that providing the token pre-authorizes the widen, and state plainly that a self-widening token is effectively account-root.

#### Scenario: Reading the trade-off

- **WHEN** a reader reaches the widen section
- **THEN** it states the account-root cost beside the pre-authorization and how to narrow back

#### Scenario: The link asks for only the two groups

- **WHEN** the token link on the credentials page is decoded
- **THEN** it names only the user and account API token groups, with edit access, for all accounts
