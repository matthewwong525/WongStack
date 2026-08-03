## MODIFIED Requirements

### Requirement: A Cloudflare Access setup runbook ships in the payload

The payload SHALL include a wiki page that walks an adopter through the Cloudflare-side Zero Trust setup end to end: creating the Zero Trust organization, adding an identity provider, creating the Access application, protecting the app's hostnames, and adding a bypass policy for the open public surface. The page SHALL follow the progressive-disclosure rulebook (`wiki/wiki-style.md` + `wiki/voice.md`): a topic title, a strong stand-alone opener, and links up to its hub, down to what it references, and sideways to the credentials page.

**The runbook SHALL require a custom domain and SHALL state that `workers.dev` cannot be reliably gated.** Access is designed for zones the account owns; `workers.dev` is Cloudflare's. A policy applied to a `workers.dev` hostname admits service tokens and challenges anonymous callers while serving a logged-in browser Cloudflare's "There is nothing here yet" placeholder. The runbook SHALL name that asymmetry explicitly, because it is what makes the failure dangerous: the paths a reader can test from a terminal all behave correctly, so verification reports a working wall that no human can pass.

**Hostname patterns SHALL be scoped to the app**, never a bare subdomain wildcard. A pattern of the form `*.<subdomain>.workers.dev` matches every Worker in the account, so it walls unrelated applications that merely share a subdomain. The runbook SHALL give app-scoped patterns — the production hostname, the staging Worker, and the branch-preview form — and SHALL document that Access accepts **partial-label wildcards** (for example `*-<worker>-staging.<subdomain>.workers.dev`), since that is the mechanism scoping depends on and it is not discoverable from the dashboard.

The page SHALL frame Access as **opt-in**: an app provisioned by the stack pack is public by default, and nothing in provisioning or the pack requires Access. The runbook SHALL state that the login wall and the Worker-side code change that verifies identity are adopted together, never separately. Where a step could not be verified against an account that had never onboarded Zero Trust, the page SHALL mark it unverified and give the dashboard fallback.

#### Scenario: An adopter can stand up Access from the page alone

- **WHEN** a reader with a Cloudflare account, a custom domain, and a deployed Worker follows the runbook top to bottom
- **THEN** the steps cover the org, an identity provider, the Access application, the scoped policies, and the bypass policy in order, with no undocumented prerequisite

#### Scenario: workers.dev is refused as a target

- **WHEN** a reader has only a `workers.dev` hostname
- **THEN** the runbook states that Access cannot reliably gate it and that a custom domain is required
- **AND** it describes the terminal-passes / browser-fails symptom so a reader who already hit it recognizes what happened

#### Scenario: The policy does not wall unrelated Workers

- **WHEN** the runbook defines the Access policy
- **THEN** the hostname patterns match the app's own hostnames and its branch previews
- **AND** no pattern matches every Worker sharing the subdomain

#### Scenario: The public surface is explicitly bypassed

- **WHEN** the runbook configures policies
- **THEN** it adds a bypass policy for the open `/public/*` surface (UI, APIs, inbound webhooks)
- **AND** it states the required policy ordering relative to the gated policy

#### Scenario: A provisioned app is public until Access is chosen

- **WHEN** a user provisions the stack-pack app without asking for authentication
- **THEN** the app is reachable publicly and no Access resources are created
- **AND** the runbook is offered as the opt-in next step rather than assumed

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies, and that model SHALL be **verification of the signed Access JWT** (`Cf-Access-Jwt-Assertion`), not trust in a plain identity header. Verification SHALL confirm the assertion came from this Access application specifically, and SHALL read identity from the verified claims: `email` for a human, `common_name` for a service token.

**A plain-header pattern SHALL NOT be given as the recommended implementation**, for two independent reasons the runbook SHALL both state:

- **It locks out every machine caller.** Access strips `CF-Access-Client-Id` and sets no email header for a service-token request, which arrives carrying only `cf-access-jwt-assertion` and the ordinary `cf-*` request headers. Code requiring the email header therefore `401`s CI, and `/walk` — WongStack's own browser-evidence verb — is one of the callers it rejects.
- **It is unsound off the proxy.** On a hostname the Access policy does not actually cover, the header is an ordinary request header any caller can set, so trusting it grants impersonation of any user. Given that a policy can silently fail to cover a hostname, the pattern's safety rests on a condition the reader cannot reliably confirm.

The runbook SHALL specify that a request whose assertion is missing or fails verification is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

Because the provisioned app is public by default, the scaffold's Worker SHALL NOT enforce identity until Access is adopted. The verification module SHALL ship inert, and enabling it SHALL be documented as part of adopting Access, in the same step.

**Verification of the wall SHALL require a browser.** A service-token `200` and an anonymous `302` SHALL be documented as *insufficient* evidence, since both hold in the known-broken `workers.dev` configuration. The runbook's verification step SHALL require a logged-in browser to load the application successfully.

#### Scenario: Both caller kinds are served by one path

- **WHEN** the documented implementation handles a request
- **THEN** a human's verified assertion yields their `email`
- **AND** a service token's verified assertion yields its `common_name`
- **AND** neither caller is rejected for lacking a header the other one gets

#### Scenario: The machine caller is not locked out

- **WHEN** CI or `/walk` calls the app with a service token
- **THEN** the request is authenticated from the verified assertion
- **AND** it is not rejected for the absence of `Cf-Access-Authenticated-User-Email`

#### Scenario: Missing or invalid identity fails closed

- **WHEN** a request arrives with no assertion, or one that fails verification
- **THEN** the documented behaviour is a `401`
- **AND** a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

#### Scenario: Terminal checks are not accepted as proof

- **WHEN** a reader verifies the wall
- **THEN** the runbook requires a logged-in browser to load the app successfully
- **AND** it states that an anonymous redirect and a service-token success are both consistent with a wall no human can pass

#### Scenario: The public template does not enforce identity

- **WHEN** the stack pack's scaffold Worker is deployed without Access in front
- **THEN** it does not treat any header or assertion as an identity
- **AND** the docs state that enabling verification is part of adopting Access
