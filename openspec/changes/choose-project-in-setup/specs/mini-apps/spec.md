## MODIFIED Requirements

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build that the current caller is authorized to use, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. When Access per-app policy is enabled, an employee's list SHALL include only assigned apps and applicable self-service setup; direct navigation SHALL enforce the same current app permission. The verified employer SHALL retain access to the app catalogue and Access administration. A preview SHALL list the app it previews for its authorized viewer. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

#### Scenario: Employee has selected apps

- **WHEN** an employee has Orders permission and no Payroll permission
- **THEN** the home page offers Orders and applicable setup, omits Payroll, and a direct Payroll visit is denied

### Requirement: The home page's app list guides first use

The home page SHALL present each authorized mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example when available. With no apps built it SHALL explain how the employer can ask for a first tool. An employee with no assigned apps SHALL instead see guidance to contact the employer and retain access to their own setup. Unavailable permission readback SHALL show a safe retry state without an unrestricted list. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with authorized apps
- **THEN** each allowed app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled when allowed

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the employer sees a first-tool request to copy into their chat

#### Scenario: Employee has no assigned apps

- **WHEN** an employee signs in with no assigned business apps
- **THEN** the page gives contact-your-employer guidance and their setup link without granting project creation or another app

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive the main app's business bindings and saved business-service keys, and the verified identity of the caller: a person's email or a service token's name. It SHALL receive no memory-store bindings, Access login-management credentials or credential-sealing key. Identity-checked finite core operations SHALL provide required administration without exposing those secrets. The Worker SHALL keep other runtime routes to bindings, such as importing them, turned off. The docs SHALL say mini apps share the Worker with core authorization and memory, so binding exclusions stop mistakes rather than malicious deployed code. A preview SHALL use staging data and keys, never production management credentials or provider mutations.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, business-service keys and signed-in person, but no memory bindings or raw connection-management credentials

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory or connection-management binding reaches it

#### Scenario: The owner manages access

- **WHEN** the verified employer uses the Access mini app's approved core operations
- **THEN** the operation can reconcile the assigned membership without returning a provider key to the mini-app handler or user

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its employer guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to get to know the person, personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it. When Access employee policy is active, employees SHALL instead see their assistant connection prompt and authorized apps without employer personalization or administration guidance; the employer's existing removable welcome SHALL be preserved.

#### Scenario: A fresh install

- **WHEN** the employer opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

#### Scenario: Employee opens a configured app

- **WHEN** an employee opens the business app with active Access policy
- **THEN** the page offers their assistant setup prompt and allowed apps, without giving them employer personalization or administration guidance
