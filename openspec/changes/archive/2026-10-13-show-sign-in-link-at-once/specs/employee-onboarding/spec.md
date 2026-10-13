# Spec Delta

## ADDED Requirements

### Requirement: Setup shows the sign-in link at once

When assistant setup needs the person to sign in, the copied setup prompt and the setup tool's own output SHALL both tell the assistant to show the person the sign-in link as soon as it is printed and to wait for them. Only a link checked to be this business's own sign-in address SHALL be passed on, and the tool SHALL say beside it that it is safe to show. No credential and no other sign-in output SHALL be shown.

#### Scenario: The assistant runs setup where it can open no browser

- **WHEN** an assistant runs the setup step and the tool prints the sign-in link
- **THEN** the person sees the link in the chat without asking for it, and the assistant waits while they sign in

#### Scenario: The sign-in prints something that is not this business's sign-in address

- **WHEN** the sign-in output carries another address or a credential
- **THEN** it is not passed on and nothing tells the assistant to show it
