## REMOVED Requirements

### Requirement: Payload links resolve in a fresh install

**Reason**: Link checks had three owners; `payload-checks` is the one.

**Migration**: The fresh-install promise and its source-only scenario now live in `payload-checks`' "The link check catches links a target or GitHub cannot follow".
