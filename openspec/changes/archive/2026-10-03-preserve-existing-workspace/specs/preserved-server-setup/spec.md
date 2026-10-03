# Preserved server setup delta

## Purpose

Provides canonical preservation-mode server tooling and private existing-project preparation that hosts can use without overwriting an existing workspace's files, services, configuration, or identities.

## ADDED Requirements

### Requirement: Preservation setup fills missing tools without replacing existing work

The canonical server setup SHALL provide an explicit preservation mode for supported Ubuntu 24.04 x86-64 and Arm servers. It SHALL reuse compatible tools and the selected workspace user's suitable Paseo service, install missing prerequisites, and preserve existing files, global tools, service configuration, firewall rules and network ports. A conflicting or unsafe setup SHALL be refused before replacement. It SHALL NOT reboot, upgrade the OS, remove caches, or write the host's private enrollment paths.

#### Scenario: A compatible existing workspace

- **WHEN** preservation setup runs with compatible installed tools and a suitable existing Paseo service
- **THEN** those installations and existing files/network services remain in place and only missing prerequisites are added

#### Scenario: A conflicting service or path

- **WHEN** setup finds an incompatible occupied service or an unsafe user/home/path
- **THEN** it refuses that setup with a bounded reason and does not replace the existing files or service

### Requirement: Project preparation preserves work and reports real readiness

Authenticated project preparation SHALL clone or reuse only the matching safe checkout as the configured unprivileged workspace user, preserve its branch/local work/configuration/git settings and existing identities, install its supported declared dependencies without deployment or privileged project scripts, and register it in Paseo without duplication. Readiness SHALL distinguish clone, dependencies, configuration and Paseo. Missing or unknown required configuration SHALL remain pending, and report only setting names, never values or command output.

#### Scenario: A private existing repo is prepared

- **WHEN** the owner authorizes a private repo with supported dependencies and verified configuration
- **THEN** it is ready under the chosen workspace account and opens in Paseo while existing work and identities are preserved

#### Scenario: Setup is incomplete or conflicts

- **WHEN** dependency setup fails, required configuration is missing/unknown or the target belongs to another repo
- **THEN** bounded preparation status gives a next step, preserves the previous checkout/configuration and does not claim overall readiness
