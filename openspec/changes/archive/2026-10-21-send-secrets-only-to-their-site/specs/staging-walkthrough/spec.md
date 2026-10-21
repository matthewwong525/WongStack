## ADDED Requirements

### Requirement: The Access key goes only to the install's own site

A walk SHALL send the Access service-token pair only to an `https` address, with no user name or password in it, on the install's own site: the live app's recorded address, every address on that address's own `workers.dev` account subdomain, or, for a custom domain, that domain and its subdomains. With no recorded live address it SHALL send the pair nowhere. Within a walk it SHALL send the pair only to the walk address's own origin, never to another site a page loads or a request names. A walk whose address is not the install's own SHALL run without the pair and its report SHALL say the key was not sent.

#### Scenario: A preview address off the site

- **WHEN** a walk's address is `https://deploy-preview.attacker.example/` and the machine holds an Access service token
- **THEN** no request carries the token, and the report says the key was not sent because the address is not this install's own site

#### Scenario: A preview page loads another site

- **WHEN** a walk on the install's own preview opens a page that loads a script from another host, and a request check names another host's full address
- **THEN** only requests to the preview's own origin carry the token

## MODIFIED Requirements

### Requirement: An Access wall heals once

When a walk that sent the Access key meets a Cloudflare Access login and a Cloudflare API token is available, `/verify` SHALL mint and store a service token without printing it, then retry exactly once. With no token, or when the wall survives the retry, the verdict SHALL be `UNKNOWN`, naming the wall and what was tried. A wall on an address that is not the install's own site SHALL get no mint and no retry: the verdict SHALL be `UNKNOWN`, naming the address as not the install's own.

#### Scenario: A token is available

- **WHEN** a walk hits an Access login with a Cloudflare API token and no stored service token
- **THEN** `/verify` mints one, retries once, and commits no credential

#### Scenario: No Cloudflare token

- **WHEN** a walk hits an Access login and no Cloudflare API token exists
- **THEN** the verdict is `UNKNOWN`, and the login page is not graded
