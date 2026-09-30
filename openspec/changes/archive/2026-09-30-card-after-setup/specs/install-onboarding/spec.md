## MODIFIED Requirements

### Requirement: All installations enable Zero Trust automatically

Both `/wong-setup` and the unattended cloud-managed installer SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete, with one exception: when `/wong-setup` finds that Cloudflare withholds Zero Trust until the account has a payment method, it SHALL finish setup with the site open without login and recommend the card afterwards as optional. The unattended installer SHALL keep stopping in that case. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** either installation path cannot finish its Zero Trust setup for a reason other than a missing payment method
- **THEN** setup reports the recoverable blocker without publishing public business content

#### Scenario: No card on a personal computer

- **WHEN** `/wong-setup` finds Zero Trust needs a payment method
- **THEN** setup finishes without stopping, and the closing report recommends the card and says what is missing without it

#### Scenario: No card on a server

- **WHEN** the unattended installer finds Zero Trust needs a payment method
- **THEN** it stops without publishing business content, as before
