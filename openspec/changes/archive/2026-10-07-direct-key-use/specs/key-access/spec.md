# Spec Delta

## ADDED Requirements

### Requirement: A key can be used directly when the employer turns it on

A saved key whose service is set up for it SHALL be usable directly: a signed-in person's assistant sends one request for that service through the app, and the server adds the key and returns the service's answer. Each such key SHALL have one direct-use choice for the installation: off, look-ups only, or look-ups and changes. The choice SHALL be off until the employer or a manager picks another, including on an installation that updates with people who already hold levels. A key that offers only Read SHALL offer off and look-ups only. Direct use SHALL need no app grant. Assistant discovery SHALL list a key's direct look-ups and direct changes only to a caller the choice and their level both permit. A key whose service is not set up SHALL offer no direct use.

#### Scenario: Direct use is off

- **WHEN** a person who holds Notion: Read & write sends a direct look-up while Notion's choice is off
- **THEN** the server refuses before any request leaves, names Notion and says direct use is off, and discovery lists no direct action for Notion

#### Scenario: The employer turns on look-ups only

- **WHEN** the employer picks look-ups only for Notion and saves, and a person with Notion: Read and no apps sends a direct look-up
- **THEN** the look-up runs and its answer is returned, and every app's actions stay refused for that person

#### Scenario: An installation updates with levels already held

- **WHEN** an installation where three people hold Notion: Read updates to a version with direct use
- **THEN** Notion's choice is off and none of the three can reach Notion directly until the employer picks another choice

### Requirement: The level and the choice together decide a direct request

The server SHALL judge every direct request by the caller's current level for the key and by the key's current choice, on each request and before any request leaves. Read SHALL permit a direct look-up when the choice is look-ups only or look-ups and changes. A direct change SHALL need Read & write and the choice look-ups and changes. A request SHALL count as a look-up only when it reads by the web's own rules, or is one the key's setup names as a look-up; every other request SHALL count as a change. The choice SHALL bind the employer and the verification service as it binds everyone. A refusal SHALL name the key and what is missing, the level or the choice, and SHALL reveal no key value. Until key levels have started, no direct request SHALL run.

#### Scenario: A person with Read tries a direct change

- **WHEN** Notion's choice is look-ups and changes and a person with Notion: Read sends a direct request that changes a page
- **THEN** the server refuses, names Notion and Read & write, and that person's direct look-ups still run

#### Scenario: The choice allows look-ups only

- **WHEN** Notion's choice is look-ups only and a person with Notion: Read & write sends a direct change
- **THEN** the server refuses and says direct changes are off for Notion

#### Scenario: A search the service sends as a change

- **WHEN** a key's setup names its search request as a look-up and a person with Read sends that search
- **THEN** it runs as a look-up, and the same kind of request to a path the setup does not name is judged as a change

#### Scenario: The choice is lowered during a session

- **WHEN** the employer sets a key's choice to off and a person sends their next direct request with the same valid session
- **THEN** that request is refused, with no logout needed

### Requirement: A direct request reaches only its own service and returns no key

The server SHALL send a direct request only to the address the key's setup names for its service, over HTTPS, and SHALL refuse a path that leaves that address. It SHALL add the key itself and SHALL NOT pass on a credential the caller sent. It SHALL follow no redirect. It SHALL bound the request and the answer in size and time, and SHALL refuse an answer over the bound with a message that says to narrow the request. It SHALL return the service's own status and answer, so a refusal by the service can be read, and SHALL return no answer that contains the key's value. Each direct request SHALL be recorded with who sent it, the key, whether it was a look-up or a change, and the request's method and path, and never its body, its query or the key. A change that times out SHALL be reported as outcome unknown and SHALL NOT be sent again by the server.

#### Scenario: A path that leaves the service

- **WHEN** a direct request names a path that would resolve outside the service's address, or names another host
- **THEN** it is refused and nothing is sent

#### Scenario: The service redirects

- **WHEN** the service answers a direct request with a redirect
- **THEN** the redirect is not followed, the key is sent nowhere else, and the caller gets a safe error

#### Scenario: The service refuses the request

- **WHEN** the service answers a direct look-up with its own not-found error
- **THEN** the caller receives that status and message, with no key in it

### Requirement: A key's direct-use setup is held to rules before publishing

A key's direct-use setup SHALL name one HTTPS address, which of the key's saved secrets is sent and in which request header, any fixed headers the service needs, and the requests that count as look-ups. A check SHALL fail before publishing, naming the key, when the address is not HTTPS, the secret is not one of the key's own, a look-up entry could match a path outside the address, or the key is one setup makes or the server's own route uses. The Cloudflare look-up key and Project code SHALL have no direct-use setup.

#### Scenario: A setup names another key's secret

- **WHEN** a change gives the Notion key a direct-use setup that sends the Stripe secret
- **THEN** the checks fail and name the Notion key, before the change can publish

### Requirement: The employer sees and sets direct use in Access

Access SHALL show each key's direct-use choice on the key's row and in the key opened, and the employer or a manager SHALL be able to set it there. The opened key SHALL say in words what the picked choice opens and how many people hold a level it reaches, before the save. A key whose service is not set up SHALL say so and how to get it set up, and SHALL offer no choice. Where a person or a role is opened, a key that is used directly SHALL say that its level also reaches the service directly. Only the employer or a manager SHALL change the choice. On a preview the choice SHALL be set against the practice list, with no effect on the live app. A choice SHALL never be marked by colour alone.

#### Scenario: The employer picks a choice

- **WHEN** the employer opens Notion, where three people hold Read, and picks look-ups only
- **THEN** the page says anyone with Read can look up anything the key can see and that this reaches three people, and after the save the Keys list shows the choice on Notion's row

#### Scenario: A key with no setup

- **WHEN** the employer opens a saved key whose service has no direct-use setup
- **THEN** the page says direct use is not set up for this key and to ask their assistant, and shows no choice

#### Scenario: An employee tries to change the choice

- **WHEN** an ordinary employee calls the operation that sets a key's choice
- **THEN** it is denied and the choice does not change
