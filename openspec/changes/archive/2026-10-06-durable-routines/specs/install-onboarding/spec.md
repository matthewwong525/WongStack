# Spec Delta

## MODIFIED Requirements

### Requirement: Setup points the person to Paseo

When getting the computer ready, setup SHALL check whether Paseo is installed. When it is missing, setup SHALL say in plain words what Paseo is for (chatting from the phone, a workspace per part) and where to get it, then continue; Paseo's absence SHALL NOT stop setup, and setup SHALL NOT install Paseo. Setup SHALL NOT say schedules need Paseo. When Paseo is present, the closing report SHALL say how to connect a phone.

#### Scenario: Paseo is missing

- **WHEN** setup runs on a computer without Paseo
- **THEN** it names Paseo, what it is for, and where to get it, without naming schedules, and finishes the install

#### Scenario: Paseo is present

- **WHEN** setup finishes on a computer with Paseo
- **THEN** the closing report says how to pair a phone
