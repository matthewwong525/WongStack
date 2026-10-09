# Key access

## Purpose

Key access lets the employer decide, per person, what each saved business-service key may be used for: nothing, looking things up, or also changing things. It covers how the level is enforced, what an action may reach, and how Access shows and sets it.

## Requirements

### Requirement: An action reaches only the keys it lists

An action or app handler SHALL receive only the saved keys its app or action lists, and one that lists none SHALL receive none. What Access shows as an app's key use SHALL come from that same list, so a key an app does not list is a key it can not use. A check SHALL fail before publishing when an app's code names a saved key the app does not list.

#### Scenario: A handler reads a key its app does not list

- **WHEN** an app that lists only Maps runs a handler that reads the Stripe key
- **THEN** the Stripe key is absent, and Access shows that app as using Maps only

### Requirement: A key can be used without an app

An action SHALL be able to belong to a key alone. For such an action the person's level for that key SHALL decide, and no app grant SHALL be required. Assistant discovery SHALL list it only for people whose level permits it.

#### Scenario: A person with no apps holds a key level

- **WHEN** a person with no apps and Cloudflare: Read lists and calls the Cloudflare look-ups
- **THEN** the look-ups are listed and run, and every app's actions stay refused

### Requirement: Cloudflare look-ups change nothing and read no stored data

The supplied Cloudflare key SHALL be offered at Read only. Its look-ups SHALL be limited to the installation's own Cloudflare account, SHALL change nothing, and SHALL NOT return the contents of the app's database, stored files or memory, or any key's value. A person SHALL never receive the Cloudflare key itself.

#### Scenario: A person looks up a setting

- **WHEN** a person with Cloudflare: Read asks for the app's hosting settings through their assistant
- **THEN** the settings are returned and no key is included

#### Scenario: A person asks for stored data

- **WHEN** that person asks Cloudflare for rows of the app's database
- **THEN** the look-up is refused and no rows are returned

### Requirement: Project code is a key with one level

Project code SHALL be a key offering Read as its only level, settable per person and per role like any key and usable with no app ticked. A person's page and a role's page SHALL offer it as one tick that says the person can install the project, off for a new person. It SHALL count as saved when the installation holds a read-only credential for its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credential SHALL be usable for reading that one project only, and no action or mini app SHALL be handed it.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a read-only key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: The employer lets a new person install the project with no key saved

- **WHEN** the employer adds a person on a GitHub installation with no read-only key and ticks that they can install the project
- **THEN** the page says a read-only GitHub key comes first and gives the request to copy, the tick saves, and the person can install the project once the key is saved with no further change in Access

#### Scenario: The project can be handed out

- **WHEN** the employer opens a person on an installation that can hand its project out
- **THEN** the tick shows with no step under it, and ticking it and saving lets that person install the project on their next request

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

### Requirement: A key level governs what belongs to the key alone

The server SHALL check the caller's current level for a saved key before any call that belongs to that key alone: an action of the key with no app, and a direct request. Read SHALL permit calls that only look things up. Read & write SHALL also permit calls that change or send things. No level SHALL deny both. A call that belongs to an app SHALL NOT be refused for the caller's key level. The employer SHALL hold every key. A refusal SHALL name the key and the level needed and SHALL reveal no key value. Client state, an existing login and cached descriptions SHALL grant no level, and a lowered level SHALL govern the person's next request.

#### Scenario: A person with Read tries to change something with the key alone

- **WHEN** a person whose Stripe level is Read calls an action of Stripe alone that changes something
- **THEN** the server refuses before any business work and names Stripe and Read & write, while that person's Stripe look-ups still run

#### Scenario: The same key inside an app

- **WHEN** that person holds an app that changes things with Stripe and uses it
- **THEN** the app's change runs, and their level for Stripe is not checked

### Requirement: The employer sets key levels from the person or the role

Access SHALL show the employer each person's and role's level for each key where that person or role is opened, and SHALL say there that a level governs use of the key by itself and that apps need none, whether the app holds each key, and the step left for one it does not hold. A key that can be used directly SHALL say that its level also reaches the service directly. A level SHALL be set only from a person or a role. Giving or taking away an app SHALL change no key level. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer opens a role, sets Stripe to Read and saves
- **THEN** each holder of the role has Stripe at Read on their next request

#### Scenario: The employer gives an app that uses a key

- **WHEN** the employer gives an app that uses Stripe to a person with no Stripe level and saves
- **THEN** the person holds the app and still has no Stripe level

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

### Requirement: Key levels start with nobody holding one

On an installation where key levels have not started, they SHALL start at the employer's next open of Access with no person given a level, and every level a person or role already holds SHALL be kept. Once levels have started, level data that can not be read SHALL deny key use and SHALL never fall back to open.

#### Scenario: An older installation updates

- **WHEN** an installation from before key levels updates and the employer opens Access
- **THEN** each person's apps work as before and no person holds a key level until the employer gives one

### Requirement: A key set up for it can be used directly

A saved key whose service is set up for it SHALL be usable directly: a signed-in person's assistant sends one request for that service through the app, and the server adds the key and returns the service's answer. Direct use SHALL need no app grant and no setting beyond the caller's level for the key. Assistant discovery SHALL list a key's direct look-ups and direct changes only to a caller whose level permits them. A key whose service is not set up SHALL offer no direct use.

#### Scenario: A person with a level and no apps

- **WHEN** a person with Notion: Read and no apps sends a direct look-up
- **THEN** the look-up runs and its answer is returned, and every app's actions stay refused for that person

#### Scenario: A person with no level

- **WHEN** a person with no level for Notion sends a direct look-up
- **THEN** the server refuses before any request leaves and names Notion and Read, and discovery lists no direct action for Notion to them

### Requirement: The level decides a direct request

The server SHALL judge every direct request by the caller's current level for the key, on each request and before any request leaves. Read SHALL permit a direct look-up. A direct change SHALL need Read & write. A request SHALL count as a look-up only when it reads by the web's own rules, or is one the key's setup names as a look-up; every other request SHALL count as a change. A refusal SHALL name the key and the level needed and SHALL reveal no key value. Until key levels have started, no direct request SHALL run.

#### Scenario: A person with Read tries a direct change

- **WHEN** a person with Notion: Read sends a direct request that changes a page
- **THEN** the server refuses, names Notion and Read & write, and that person's direct look-ups still run

#### Scenario: A search the service sends as a change

- **WHEN** a key's setup names its search request as a look-up and a person with Read sends that search
- **THEN** it runs as a look-up, and the same kind of request to a path the setup does not name is judged as a change

#### Scenario: A level is taken away during a session

- **WHEN** the employer sets a person's level for a key to None and that person sends their next direct request with the same valid session
- **THEN** that request is refused, with no logout needed
