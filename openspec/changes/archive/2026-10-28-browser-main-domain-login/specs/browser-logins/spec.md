## ADDED Requirements

### Requirement: A login may try a sibling subdomain once on request

When the agent passes `--main-domain`, the browser SHALL also type a saved login on a host that shares the saved host's main domain: its last two labels, or its last three under a country's own second level such as `co.uk`. It SHALL apply the same check to the tab and to each box's frame. A host with another main domain SHALL still get nothing and `wrong-site`. Without the flag, the saved-site rule SHALL apply unchanged.

#### Scenario: A sibling subdomain with the flag

- **WHEN** a login is saved for `clinic.janeapp.com` and the agent runs it with `--main-domain` on `myodetox.janeapp.com`
- **THEN** the browser types the login

#### Scenario: A sibling subdomain without the flag

- **WHEN** the agent runs the same login on `myodetox.janeapp.com` without the flag
- **THEN** the browser reports `wrong-site` and types nothing

#### Scenario: Another main domain with the flag

- **WHEN** the agent runs the login with `--main-domain` on `janeapp.attacker.example`
- **THEN** the browser reports `wrong-site` and types nothing
