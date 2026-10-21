## MODIFIED Requirements

### Requirement: Personal browsing starts its own local forwarding proxy

Every new personal-browser start with a saved local look SHALL automatically use a forwarding proxy on the same computer, using that computer's existing network connection. It SHALL require no additional installation, proxy account, Paseo relay, or WARP connection, and SHALL NOT claim to select a country or use the person's phone connection. The proxy SHALL listen only on loopback, SHALL keep no browsing logs, and SHALL tunnel secure website traffic without decrypting it. If the proxy cannot start, the browser SHALL report the failure rather than silently start without it.

#### Scenario: A fresh browser start after installation

- **WHEN** a person who saved the local look starts a personal browsing task with no proxy or VPN configured
- **THEN** a local forwarding proxy starts automatically, the browser uses it through the computer's own connection, and secure traffic remains encrypted

#### Scenario: The local proxy cannot start

- **WHEN** the local forwarding proxy fails during personal-browser startup
- **THEN** the task receives a startup error and no direct browser starts as a fallback

## ADDED Requirements

### Requirement: Personal browsing looks American by default

Personal browsing SHALL use a US look unless the person has saved a local look for that computer, and the person SHALL be able to switch between the two. A browser started with the US look SHALL present US English (`en-US`) as its language and US Eastern time (`America/New_York`) as its clock, and SHALL start without the local forwarding proxy so the camofox browser keeps that language and clock. The look SHALL NOT change the network address sites see, and the agent SHALL NOT claim it does. Saving or changing the look SHALL NOT stop a running browser or close any task's pages; it SHALL take effect at the next start, and the agent SHALL say a restart is needed. The setting SHALL live outside every repo, beside the saved logins, readable only by the person's account; with no saved setting, the look SHALL be US.

#### Scenario: Switching the look while the browser runs

- **WHEN** the person asks for the local look while another task's page is open
- **THEN** the look is saved, the open pages stay open, and the agent says the look applies from the next browser start

#### Scenario: A first start with nothing saved

- **WHEN** the browser starts on a computer with no saved look
- **THEN** pages read the browser's language as `en-US` and its time zone as `America/New_York`, and no local forwarding proxy starts
