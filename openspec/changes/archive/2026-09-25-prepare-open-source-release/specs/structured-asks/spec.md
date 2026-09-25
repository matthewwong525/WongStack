## MODIFIED Requirements

### Requirement: WongStack enables supported Codex questions in Default mode

The WongStack source repository and every install SHALL enable Codex's supported Default-mode structured-input feature through trusted project configuration at `.agents/config.toml`, which Codex reads as `.codex/config.toml` through the `.codex` link. It SHALL NOT require a user-wide configuration change or a collaboration-mode switch.

#### Scenario: Trusted WongStack session uses Default mode

- **WHEN** a compatible Codex client starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable for a structured question
- **AND** the user's global Codex configuration is unchanged
- **AND** the project setting has no scope outside the WongStack checkout
