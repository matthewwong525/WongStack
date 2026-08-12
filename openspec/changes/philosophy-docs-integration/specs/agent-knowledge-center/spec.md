## ADDED Requirements

### Requirement: The docs state the six working principles

The philosophy page SHALL state the six working principles behind WongStack in plain, impersonal prose, and the README SHALL link to that page. The principles are: building in-house is about speed and quality, not saving money; most process improvements should be code, not AI; consolidate the processes and the data in one place you own; using AI must not require a complicated setup (no local dev environment, minimum dependencies); context has to survive the session; give AI as much access as you can, and as little autonomy as it needs.

#### Scenario: Reader finds the principles

- **WHEN** a reader opens the philosophy page
- **THEN** they see the six principles stated plainly
- **AND** each principle points to the repo mechanism that applies it (Cloudflare pack, the change loop, the knowledge surfaces, PR review and tests)

#### Scenario: Consolidation principle covers process and data

- **WHEN** a reader reads the consolidation principle
- **THEN** it states that a process written as code is also the record of how the work is done
- **AND** that the business data sits behind that code, so an agent can read the process and the records together
- **AND** it explains that this is what makes access to an agent worth granting

#### Scenario: The setup is presented as adaptable

- **WHEN** a reader reviews the philosophy page
- **THEN** it presents the setup as one way of working that a team can adapt, not a doctrine
- **AND** it contains no first-person founder framing

#### Scenario: Autonomy principle explains the gates

- **WHEN** a reader asks why humans stay in the loop
- **THEN** the philosophy page explains that AI does not disobey instructions, it misinterprets them
- **AND** it names the standardized gates: the reviewed plan, PR review, tests, and Zero Trust

### Requirement: The docs use matter-of-fact language

The README and philosophy page SHALL describe WongStack in matter-of-fact terms. They SHALL NOT use the labels "AI-native" or "the compounding loop" or equivalent sales-style framing.

#### Scenario: Buzzwords are absent

- **WHEN** a reader searches the README and philosophy page
- **THEN** the phrases "AI-native" and "compounding loop" do not appear

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and `/dream` SHALL be presented as the mechanism that lets each project leave more useful context for the next person or agent.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context

## REMOVED Requirements

### Requirement: Knowledge capture is part of execution
**Reason**: Replaced by "Knowledge capture happens during the work" — same substance, but the scenario no longer requires the "compounding loop" branding this change removes from the docs.
**Migration**: The ADDED requirement above covers the behavior; no doc keeps the old framing.
