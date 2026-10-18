## ADDED Requirements

### Requirement: The contract names each service and where to read more

A described action SHALL name each saved key it uses with the key's name, one-line purpose and, when the key has one, the link to its service's public API guide. The OpenAPI document SHALL group operations under each key they use, each group carrying that purpose and guide link, and a key's own direct-use operations SHALL carry the guide link themselves. The document SHALL open with a short description of how to use it: search, open one action before calling it, the shared error shape, and checking a timed-out change before repeating it. When the helper describes an action, it SHALL add each key's notes page path in the checkout and whether the page exists yet. None of this SHALL reveal a key the caller cannot see, or any key value.

#### Scenario: A chat opens a direct-use action

- **WHEN** a person with Stripe at Read describes `stripe.read`
- **THEN** they see Stripe's purpose, the link to Stripe's API guide and the path of the install's Stripe notes page, without listing services first

#### Scenario: Another caller's keys

- **WHEN** a person who holds no level for Stripe reads the OpenAPI document
- **THEN** it has no Stripe group and names no Stripe operation or guide
