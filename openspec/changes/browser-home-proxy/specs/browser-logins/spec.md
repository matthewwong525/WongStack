## ADDED Requirements

### Requirement: The proxy goes through saved proxies, in order

While the proxy setting is on, the personal browser SHALL send each connection to a site through the person's saved first proxy, then their saved backup proxy when the first fails, then the computer's own connection when both fail. A first proxy that failed while the backup worked SHALL be skipped for about a minute, then tried again. Addresses on the computer itself SHALL go direct. A plain (not secure) request SHALL move to the next route only when a route refused or never took it, and SHALL never be sent twice. The saved proxies SHALL be kept on the computer, readable only by the person, so a start from any repo uses them, and a proxy saved in a repo's keys SHALL replace the computer's copy at the next start. The browser SHALL never see a proxy address or login, only the local proxy. With the proxy off, the browser SHALL go straight to sites and the saved proxies SHALL stay for a later start.

#### Scenario: The home proxy is off

- **WHEN** the proxy is on, a first and a backup proxy are saved, and the first proxy does not answer
- **THEN** pages load through the backup proxy, and new connections in the next minute go straight to the backup

#### Scenario: Another repo starts the browser

- **WHEN** the proxies were saved from one repo and a task in another repo on the same computer starts the browser
- **THEN** the browser goes through the same saved proxies

### Requirement: The browser's status names its route

The browser's status SHALL say which route the running browser uses: the first proxy, the backup proxy, the computer's own connection because every proxy failed, the computer's own connection because no proxy is saved, or that no browser runs. It SHALL never show a proxy address or login.

#### Scenario: The browser is on the backup

- **WHEN** the first proxy failed and the backup proxy carries the browser's connections
- **THEN** the status names the backup route, so the agent can tell the person to check their home proxy
