## ADDED Requirements

### Requirement: A Cloudflare Access setup runbook ships in the payload

The payload SHALL include a wiki page that walks an adopter through the Cloudflare-side Zero Trust setup end to end: creating the Zero Trust organization, adding an identity provider, creating the Access application, protecting the production hostname AND every `*.workers.dev` preview URL with a single wildcard policy, and adding a bypass policy for the open public surface. The page SHALL follow the progressive-disclosure rulebook (`wiki/wiki-style.md` + `wiki/voice.md`): a topic title, a strong stand-alone opener, and links up to its hub, down to what it references, and sideways to the credentials page.

#### Scenario: An adopter can stand up Access from the page alone

- **WHEN** a reader with a Cloudflare account and a deployed Worker follows the runbook top to bottom
- **THEN** the steps cover the org, an identity provider, the Access application, the wildcard policy, and the bypass policy in order, with no undocumented prerequisite

#### Scenario: One wildcard policy covers prod and previews

- **WHEN** the runbook defines the Access policy
- **THEN** it uses one wildcard hostname pattern that matches both the production host and every per-branch `*.workers.dev` preview URL
- **AND** it states that this is what gates preview URLs without per-branch configuration

#### Scenario: The public surface is explicitly bypassed

- **WHEN** the runbook configures policies
- **THEN** it adds a bypass policy for the open `/public/*` surface (UI, APIs, inbound webhooks)
- **AND** it states the required policy ordering relative to the gated policy

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies: the Worker carries no auth code and trusts the `Cf-Access-Authenticated-User-Email` header set by the Access proxy. It SHALL state, as a first-class step and not a footnote, that trusting the header is safe ONLY behind the proxy, so the reader MUST verify the wildcard policy actually covers preview hostnames before relying on it. It SHALL specify that a request missing the header is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

#### Scenario: The header-trust risk is stated loudly

- **WHEN** a reader reaches the auth-model section
- **THEN** it states that header trust holds only behind the Access proxy
- **AND** it makes verifying that previews are actually gated an explicit step

#### Scenario: Missing identity fails closed

- **WHEN** the runbook describes a request that arrives without the Access identity header
- **THEN** it specifies a `401` response by default
- **AND** it specifies that a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

### Requirement: A credentials guide ships covering the user-scoped API token and Access service token

The payload SHALL include a wiki page that documents the two credentials the stack needs. It SHALL instruct the reader to create a USER-scoped API token (My Profile → API Tokens), state explicitly that an account-scoped token does NOT work because the Workers Builds log API rejects it with `Invalid token`, list the permissions the token needs, and have the reader store `CLOUDFLARE_USER_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env` per the existing secrets convention. It SHALL also walk through creating an Access service token and adding it to the Access policy so non-interactive callers can reach gated preview URLs. Exact Cloudflare permission and menu names SHALL be verified against the live dashboard when the page is written, not reproduced from memory.

#### Scenario: The user-scoped-vs-account-token trap is called out

- **WHEN** a reader follows the token guide
- **THEN** it directs them to create a user-scoped token, not an account token
- **AND** it names the `Invalid token` symptom an account token produces against the Workers Builds log API

#### Scenario: Credentials land in .env via the secrets convention

- **WHEN** the guide tells the reader where to put the token
- **THEN** it names `CLOUDFLARE_USER_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as `.env` variables
- **AND** it links the existing secrets convention rather than restating it

#### Scenario: A service token is created for non-interactive access

- **WHEN** a reader completes the credentials guide
- **THEN** they have created an Access service token and added it to the Access policy
- **AND** the guide states this is what lets a later CI/test caller reach an Access-gated preview URL

### Requirement: The stack section stays optional and does not make WongStack stack-specific

The new `wiki/stack/` section SHALL be linked from `wiki/README.md` such that it is reachable but clearly optional, and no skill, installer, or core doc SHALL require or default to Cloudflare as a result of this change. The pages SHALL contain nothing specific to any single app — every example is generic.

#### Scenario: WongStack stays stack-agnostic after the change

- **WHEN** a reader reviews the skills, installer, and core wiki after this change
- **THEN** none of them require or default to Cloudflare/Access
- **AND** only the `wiki/stack/` pages name it

#### Scenario: The section is reachable but not orphaned

- **WHEN** a reader opens `wiki/README.md`
- **THEN** it links the `wiki/stack/` hub
- **AND** the hub links every page in the section
