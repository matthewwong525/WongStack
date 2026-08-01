## MODIFIED Requirements

### Requirement: A Cloudflare Access setup runbook ships in the payload

The payload SHALL include a wiki page that walks an adopter through the Cloudflare-side Zero Trust setup end to end: creating the Zero Trust organization, adding an identity provider, creating the Access application, protecting the production hostname AND every `*.workers.dev` preview URL with a single wildcard policy, and adding a bypass policy for the open public surface. The page SHALL follow the progressive-disclosure rulebook (`wiki/wiki-style.md` + `wiki/voice.md`): a topic title, a strong stand-alone opener, and links up to its hub, down to what it references, and sideways to the credentials page.

The page SHALL frame Access as **opt-in**: an app provisioned by the stack pack is public by default, and nothing in provisioning or the pack requires Access. The runbook SHALL state that the login wall and the Worker-side code change that reads the identity header are adopted together, never separately. Where a step could not be verified against an account that had never onboarded Zero Trust, the page SHALL mark it unverified and give the dashboard fallback.

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

#### Scenario: A provisioned app is public until Access is chosen

- **WHEN** a user provisions the stack-pack app without asking for authentication
- **THEN** the app is reachable publicly and no Access resources are created
- **AND** the runbook is offered as the opt-in next step rather than assumed

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies: once Access is in front, the Worker carries no auth code and trusts the `Cf-Access-Authenticated-User-Email` header set by the Access proxy. It SHALL state, as a first-class step and not a footnote, that trusting the header is safe ONLY behind the proxy, so the reader MUST verify the wildcard policy actually covers preview hostnames before relying on it. It SHALL specify that a request missing the header is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

Because the provisioned app is public by default, the template Worker SHALL NOT read or trust the identity header until Access is adopted. The runbook SHALL state why: on a Worker with no Access proxy in front, the header is attacker-controlled, so trusting it lets any caller impersonate any user. Enabling header trust SHALL be documented as part of adopting Access, in the same step.

#### Scenario: The header-trust risk is stated loudly

- **WHEN** a reader reaches the auth-model section
- **THEN** it states that header trust holds only behind the Access proxy
- **AND** it makes verifying that previews are actually gated an explicit step

#### Scenario: Missing identity fails closed

- **WHEN** the runbook describes a request that arrives without the Access identity header
- **THEN** it specifies a `401` response by default
- **AND** it specifies that a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

#### Scenario: The public template does not trust the header

- **WHEN** the stack pack's template Worker is deployed without Access in front
- **THEN** it does not read `Cf-Access-Authenticated-User-Email` as an identity
- **AND** the docs state that trusting it on a public Worker allows trivial impersonation

### Requirement: A credentials guide ships covering the user-scoped API token and Access service token

The payload SHALL include a wiki page that documents the credentials the stack needs. It SHALL instruct the reader to create a USER-scoped API token (My Profile → API Tokens), state explicitly that an account-scoped token does NOT work for the user-level endpoints the provisioning flow depends on, and have the reader store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env` per the existing secrets convention — one variable name, used consistently by `.env.example` and every page that references it. It SHALL also walk through creating an Access service token and adding it to the Access policy so non-interactive callers can reach gated preview URLs, framed as part of the opt-in Access path. Exact Cloudflare permission and menu names SHALL be verified against the live dashboard or API when the page is written, not reproduced from memory; the Workers Builds permission SHALL be named `Workers CI Read`/`Workers CI Write`, since Cloudflare exposes Builds under "CI".

The page SHALL document the self-widening token: the two permission groups the user grants, the sequence the agent uses to widen and narrow it, and — plainly, without softening — that a token able to widen itself is effectively account-root, so self-widening and least privilege are mutually exclusive and this design chose the former.

#### Scenario: The user-scoped-vs-account-token trap is called out

- **WHEN** a reader follows the token guide
- **THEN** it directs them to create a user-scoped token, not an account token
- **AND** it names the symptom an account token produces (`/user/*` endpoints rejecting it), so the reader can recognize the failure

#### Scenario: Credentials land in .env via the secrets convention

- **WHEN** the guide tells the reader where to put the token
- **THEN** it names `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as `.env` variables
- **AND** it links the existing secrets convention rather than restating it
- **AND** `.env.example` uses the same variable names as the page

#### Scenario: A service token is created for non-interactive access

- **WHEN** a reader completes the credentials guide
- **THEN** they have created an Access service token and added it to the Access policy
- **AND** the guide states this is what lets a later CI/test caller reach an Access-gated preview URL

#### Scenario: The account-root trade-off is stated

- **WHEN** a reader reaches the self-widening section
- **THEN** it states that the token is effectively account-root and that least privilege was traded for usability
- **AND** it explains how to narrow the token after provisioning
