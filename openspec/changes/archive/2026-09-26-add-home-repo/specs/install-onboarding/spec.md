## ADDED Requirements

### Requirement: Setup records the person's home

Setup's exploration SHALL ask whether the new repo is the person's home. When it is, setup SHALL write `~/.wong-stack/machine.json` with the repo's absolute path, and SHALL suggest `~/home` as the folder. The install itself SHALL be the same full install with Cloudflare as any other, and the install record SHALL NOT change. When the machine already records a different home, setup SHALL ask before it replaces the record.

#### Scenario: Creating home

- **WHEN** the person runs setup in an empty `~/home` and says it is their home
- **THEN** the machine record names `~/home` by absolute path, and the install is the same as any install

#### Scenario: A second home

- **WHEN** setup creates a home on a machine that already records another home
- **THEN** setup asks before it changes the machine record
