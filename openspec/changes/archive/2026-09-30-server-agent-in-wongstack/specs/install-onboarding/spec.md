## REMOVED Requirements

### Requirement: The server script keeps the host contract

**Reason**: Its 12 KiB budget existed so a host could pack `setup.sh` into first-boot data; wongstack.com now downloads the source instead. Replaced by "The server script leaves the host its paths", which keeps every other promise.
**Migration**: None. A fork's `setup.sh` may grow past 12 KiB.

## ADDED Requirements

### Requirement: The server script leaves the host its paths

The script SHALL NOT open an inbound port, touch a host's secret, or write under `/etc/wongstack` or `/opt/wongstack`. It SHALL have no size budget: a host downloads it from the source rather than packing it into first-boot data. `server/README.md` SHALL state the command, the input, the end state, and these limits. `server/` SHALL stay source-only, never installed or synced.

#### Scenario: The script grows past the old budget

- **WHEN** a change makes `server/setup.sh` larger than 12 KiB
- **THEN** the source's tests still pass

#### Scenario: A host's paths stay the host's

- **WHEN** `server/setup.sh` runs on a fresh server
- **THEN** it writes nothing under `/etc/wongstack` or `/opt/wongstack`
