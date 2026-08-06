## MODIFIED Requirements

### Requirement: The token widens its own permissions rather than requiring a pre-granted set


The documented credential SHALL be a single user-scoped Cloudflare API token carrying only `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope), with the user's account included in its resources. The skill SHALL obtain any further permission it needs by reading its own token id from `/user/tokens/verify`, reading its current policy document from `/user/tokens/{id}`, resolving permission-group ids **by name** from `/user/tokens/permission_groups`, and issuing `PUT /user/tokens/{id}` with a widened policy set. Because the `PUT` replaces policies wholesale, the widened set SHALL include the original two permission groups. The skill SHALL verify the widen took effect before proceeding, and SHALL offer to narrow the token back afterward.

The widen SHALL be **pre-authorized by the act of providing the token**: the payload SHALL state, on the page that owns the credential, that supplying a token carrying these two permission groups *is* the permission to widen it, and every payload surface that instructs an agent to widen SHALL direct it to proceed without asking and to report afterward which permissions it granted. Confirmation SHALL NOT be sought for the widen itself. This authorization SHALL NOT extend to any other rule: creating or deleting billable resources still requires asking, a failed or unverified widen still stops the run, and narrowing back is still offered rather than assumed.

#### Scenario: A two-permission token becomes sufficient

- **WHEN** the skill runs with a token holding only the two API-token permission groups
- **THEN** it widens itself to include the permissions the requested work needs
- **AND** it confirms by re-probing the target surfaces before provisioning anything

#### Scenario: The widen proceeds without asking

- **WHEN** an agent following the payload reaches the point of widening a token the user has provided
- **THEN** it performs the widen without asking the user for permission to change the token's scope
- **AND** it reports afterward which permissions it granted

#### Scenario: The authorization is stated where an agent will read it

- **WHEN** an agent reads any payload surface that instructs it to widen — the provisioning skill, the widen-protocol reference, or the credentials page
- **THEN** that surface states the standing authorization or links to the page that owns it
- **AND** the credentials page states it alongside the account-root trade-off, so the grant and its cost are read together

#### Scenario: The authorization does not widen any other rule

- **WHEN** the same run reaches a step that creates or deletes a billable resource
- **THEN** it still asks first
- **AND** a `PUT` that fails or does not verify still stops the run before anything is provisioned

#### Scenario: The ability to widen again is preserved

- **WHEN** the skill builds the widened policy set
- **THEN** the set still contains `API Tokens Write` and `Account API Tokens Write`
- **AND** a later run can widen the same token again

#### Scenario: Permission-group ids are resolved by name at runtime

- **WHEN** the skill needs a permission group
- **THEN** it looks the id up by name from the live permission-groups endpoint rather than relying on a hardcoded id
- **AND** where two groups share a name, it selects by scope (`com.cloudflare.api.account`) rather than by position

#### Scenario: Self-escalation is refused

- **WHEN** the `PUT` fails or the post-widen verification shows the permissions did not take effect
- **THEN** the skill stops before provisioning
- **AND** it reports which surfaces are unavailable and lists the permissions to grant manually
