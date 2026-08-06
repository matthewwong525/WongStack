# cloudflare-provisioning — delta

## ADDED Requirements

### Requirement: The widen covers the walkthrough's browser

The token widen SHALL include the **Browser Rendering Edit** permission group in the widened policy set, resolved by name at runtime like every other group, so the same `CLOUDFLARE_API_TOKEN` the pack provisions can open Browser Run sessions for the staging walkthrough. The grant SHALL be unconditional — not gated on whether the repo has adopted the walkthrough — because the permission costs nothing, the widen is already pre-authorized, and gating would couple provisioning to walkthrough detection. The narrow-back offer SHALL cover this group like any other the skill granted.

#### Scenario: A fresh provisioning run grants the browser permission

- **WHEN** `/wong-cloudflare` widens a newly provided two-permission token
- **THEN** the widened set includes Browser Rendering Edit alongside the other granted groups
- **AND** the post-widen report names it

#### Scenario: A re-run repairs an older token

- **WHEN** `/wong-cloudflare` re-runs in a repo whose token was widened before this group existed in the set
- **THEN** the widen adds Browser Rendering Edit to the existing policy set
- **AND** a subsequent `/walk` can authenticate to Browser Run without any manual grant

#### Scenario: Narrowing back removes it too

- **WHEN** the user accepts the offer to narrow the token back down
- **THEN** Browser Rendering Edit is removed along with the other granted groups
- **AND** the two original API-token groups remain
