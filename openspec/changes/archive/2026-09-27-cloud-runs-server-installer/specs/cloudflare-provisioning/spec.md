## MODIFIED Requirements

### Requirement: Token mistakes are named in plain words

The token SHALL be verified before any other step, and a failure SHALL name its cause and the one fix instead of the raw API error. An early authorization failure right after a widen, `401` or `403`, SHALL be retried as propagation before it is reported.

#### Scenario: Account-scoped token

- **WHEN** the token was made under the account instead of My Profile
- **THEN** the person is told that and given the right route

#### Scenario: No account in the token's resources

- **WHEN** the token is valid but sees no account
- **THEN** the person is told to set Account Resources and nothing is provisioned

#### Scenario: A widened token is refused for a few seconds

- **WHEN** Cloudflare answers the first check after a widen with `401` or `403`, then with success
- **THEN** provisioning waits it out and carries on, and reports a failure only when the last try is still refused
