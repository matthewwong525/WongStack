# Spec Delta

## MODIFIED Requirements

### Requirement: The home page's app list guides first use

The home page SHALL present each authorized mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example when available. With no apps built it SHALL explain how the employer can ask for a first tool. The list SHALL include a Connect your assistant entry, which opens the setup steps over the page without leaving it for a person who may connect. Once the installation can hand its project out, a person who lacks Project code SHALL see that entry as unavailable, marked by more than color; choosing it SHALL open nothing and SHALL tell the person to ask their admin for access. An employee with no assigned apps SHALL see guidance to contact the employer. Unavailable permission readback SHALL show a safe retry state without an unrestricted list. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with authorized apps
- **THEN** each allowed app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled when allowed

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the employer sees a first-tool request to copy into their chat

#### Scenario: Employee has no assigned apps

- **WHEN** an employee signs in with no assigned business apps
- **THEN** the page gives contact-your-employer guidance without granting project creation or another app

#### Scenario: A person opens Connect your assistant from the list

- **WHEN** a signed-in person who may connect chooses Connect your assistant in the home page's list
- **THEN** the setup steps open over the home page, and closing them leaves the person on the home page

#### Scenario: A person without Project code chooses Connect

- **WHEN** the installation can hand its project out and a person who lacks Project code chooses Connect your assistant
- **THEN** nothing opens and the page tells them to ask their admin for access
