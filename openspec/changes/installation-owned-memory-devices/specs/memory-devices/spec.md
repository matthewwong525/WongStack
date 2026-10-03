## Purpose

Connect authorized machines to repository memory through normal trusted setup and automatically maintain their credentials, without a Devices approval mini app.

## ADDED Requirements

### Requirement: Trusted setup enrolls the initiating machine without a browser approval

Setup SHALL enroll only a machine presenting installation-scoped provisioning authority or an explicit scoped one-use enrollment capability. It SHALL bind the grant to the exact installation/repository and initiating machine proof. A repository clone or public app address SHALL NOT suffice. Missing authority SHALL report pending setup without issuing a credential or creating an anonymous approval request.

#### Scenario: Authorized setup completes
- **WHEN** trusted setup verifies the target and the initiating machine's enrollment proof
- **THEN** that machine receives one scoped credential privately and can load allowed memory without opening an approval screen

#### Scenario: Unproven setup or replay
- **WHEN** an anonymous clone or an expired, consumed or wrong-install enrollment capability attempts setup
- **THEN** no new machine grant or credential is issued

### Requirement: Credential lifecycle is unattended while the grant remains active

Machine credentials SHALL expire and rotate automatically only while the current grant and scope remain valid. Credentials SHALL be stored privately outside git with server-side hashes, never in links, chat output, logs or public setup results. Rotation SHALL preserve machine ownership, use exact guarded attempts, and support safe lost-response recovery without issuing duplicate authority. Removed grants SHALL NOT be restored by retry or automatic enrollment.

#### Scenario: Normal credential renewal
- **WHEN** an active machine approaches credential expiry
- **THEN** background renewal preserves its memory access without human sign-in or a separate approval timer

#### Scenario: Expired or revoked access
- **WHEN** renewal cannot prove valid current authority or the grant was removed
- **THEN** data access remains denied, queued writes stay private and fresh trusted setup is required without silently restoring the grant

### Requirement: The approval mini app is absent

The template SHALL NOT ship the Devices frontend or browser matching-code approval workflow. Ordinary mini-app handlers SHALL remain unable to access memory database or bucket bindings. Any memory administration SHALL use separately authenticated installation authority rather than anonymous app access.

#### Scenario: App discovery and payload
- **WHEN** the application registry or shipped scaffold is read
- **THEN** no built-in Devices app is registered and other mini apps gain no memory bindings
