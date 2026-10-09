# Spec Delta

## ADDED Requirements

### Requirement: Personal browsing starts its own local forwarding proxy

Every new personal-browser start SHALL automatically use a forwarding proxy on the same computer, using that computer's existing network connection. It SHALL require no additional installation, proxy account, Paseo relay, or WARP connection, and SHALL NOT claim to select a country or use the person's phone connection. The proxy SHALL listen only on loopback, SHALL keep no browsing logs, and SHALL tunnel secure website traffic without decrypting it. If the proxy cannot start, the browser SHALL report the failure rather than silently start without it.

#### Scenario: A fresh browser start after installation

- **WHEN** a person starts their first personal browsing task with the browser installed and no proxy or VPN configured
- **THEN** a local forwarding proxy starts automatically, the browser uses it through the computer's own connection, and secure traffic remains encrypted

#### Scenario: The local proxy cannot start

- **WHEN** the local forwarding proxy fails during personal-browser startup
- **THEN** the task receives a startup error and no direct browser starts as a fallback

### Requirement: Local proxy upgrades preserve running browsing tasks

An update adding the local proxy SHALL preserve existing saved logins and SHALL NOT automatically stop an already-running personal browser, close another task's pages, or interrupt private input. Its next deliberate stop and new start SHALL activate the proxy, and stopping that browser SHALL stop its local forwarding listener too.

#### Scenario: Another task is using the existing browser

- **WHEN** updated browsing code encounters a personal browser already running without the managed local proxy
- **THEN** the task can keep its pages and logins and the new default takes effect at the next deliberate browser restart

#### Scenario: Stopping the browser

- **WHEN** the person stops a personal browser that started with the local proxy
- **THEN** its forwarding listener closes and its saved logins remain available for the next start
