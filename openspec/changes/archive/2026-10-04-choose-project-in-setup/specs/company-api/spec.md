## MODIFIED Requirements

### Requirement: Apps and agents use the same defined company action

A described company action SHALL be callable through its existing Worker endpoint by both its app and an authenticated employee assistant. Both callers SHALL execute the same handler with verified identity and the same existing action and record checks. Once Access per-app permissions have started, both SHALL additionally require current employee permission for the action's associated app or apps, including direct API requests. Discovery SHALL NOT grant permission or bypass those checks. Started permissions with missing app permission or unavailable authority SHALL stop before business work; installations where permissions have not started SHALL retain their existing authorization.

#### Scenario: An employee uses an app action through their agent

- **WHEN** an employee authorized to use a described action calls it from their assistant with valid input
- **THEN** the company endpoint performs the same work and returns the same business result as the app

#### Scenario: An existing record check denies the caller

- **WHEN** a described action's existing record check denies the employee
- **THEN** the agent call is denied even if the action appears in discovery

#### Scenario: Direct call bypasses hidden navigation

- **WHEN** an employee without permission for an app calls its business endpoint directly
- **THEN** the server denies the call before its handler or outside service executes

### Requirement: Exposure is explicit and preserves existing apps

An existing unconverted handler SHALL retain its path, business behavior and existing authorization and SHALL be absent from discovery until deliberately described. Started Access per-app permissions SHALL additionally enforce the employee's current app permission before both described and legacy business handlers. Unmapped business routes SHALL deny employee execution until reviewed without removing or replacing their implementation. Possessing a key SHALL NOT expose every action of that service. An employee-enabled action requiring company connections SHALL require verified caller authentication even when an older starter site is open without login. Missing connections SHALL produce a safe unavailable state rather than a request for the owner key on the employee machine.

#### Scenario: An installed app updates

- **WHEN** the update adds discovery support around a custom app without describing its legacy handlers
- **THEN** its handlers still work as before for authorized callers and are not silently advertised to agents

#### Scenario: A connection or login is missing

- **WHEN** a new company-connected action has no saved connection or no verified employee identity
- **THEN** no outside business request runs and the caller receives a safe unavailable or authentication response

#### Scenario: A custom business route has no permission assignment

- **WHEN** Access per-app permissions have started and a legacy route lacks a reviewed app mapping
- **THEN** employee requests perform no business work until that mapping is reviewed, and the existing handler and stricter checks remain preserved
