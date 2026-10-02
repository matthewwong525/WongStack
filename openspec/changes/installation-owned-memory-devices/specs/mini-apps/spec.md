## ADDED Requirements

### Requirement: Devices calls privileged core handlers without gaining memory bindings

The built-in Devices UI SHALL live at `/apps/devices/` inside the existing main app and use its login and shared presentation. It SHALL call narrowly authorized core handlers for memory identity and devices. Neither Devices nor ordinary mini-app handlers SHALL receive memory bindings or a general privileged environment; the ordinary mini-app binding restriction SHALL remain intact.

#### Scenario: A member approves through Devices
- **WHEN** Devices submits a human-authenticated approval to its core API
- **THEN** the core handler applies the memory authorization checks without exposing the database or bucket to mini-app code

#### Scenario: An ordinary mini app seeks privileged data
- **WHEN** a handler tries to access memory bindings or a service token calls a human device-management operation
- **THEN** no memory binding or human management authority is granted
