## MODIFIED Requirements

### Requirement: All installations enable Zero Trust automatically

Both `/wong-setup` and the unattended cloud-managed installer SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete, with one exception: when Cloudflare withholds Zero Trust until the account has a payment method, `/wong-setup`, and the unattended installer when its job asks for the open finish, SHALL finish with the site open without login. `/wong-setup` SHALL recommend the card afterwards as optional; the unattended installer SHALL report the open state to its host. An unattended job that does not ask SHALL keep stopping in that case. A site that already has protection SHALL never open. A deliberately public surface requires a separately reviewed exception.

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

- **WHEN** the unattended installer, with a job that asks for the open finish, finds Zero Trust needs a payment method
- **THEN** it finishes with `done`, the committed app config carries the login-off switch, and its host receives an open result with no management credential

#### Scenario: No card on a server that did not ask

- **WHEN** the unattended installer, with a job that does not ask for the open finish, finds Zero Trust needs a payment method
- **THEN** it stops without publishing business content, as before

## ADDED Requirements

### Requirement: A server rerun turns an open install private without publishing

When the unattended installer runs again on a repo it installed open, and Cloudflare now allows Zero Trust, it SHALL provision the login, turn the app config private, report the restricted result to its host, and leave its file edits uncommitted in the repo for the person's assistant to publish. It SHALL NOT commit or push over the repo's later work. While Zero Trust is still withheld, the rerun SHALL finish open again.

#### Scenario: The card was added

- **WHEN** the installer reruns on an open install whose account now has Zero Trust
- **THEN** the last line is `done`, the host receives the restricted result, `app/wrangler.jsonc` in the repo is private and uncommitted, and `origin/main` is unchanged

#### Scenario: Still no card

- **WHEN** the installer reruns on an open install whose account still withholds Zero Trust
- **THEN** the last line is `done`, the host receives an open result, and the repo's files are unchanged
