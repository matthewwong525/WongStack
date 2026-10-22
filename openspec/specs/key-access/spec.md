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

### Requirement: Project code has a save level and a publish level

Project code SHALL be a key offering two levels, settable per person and per role like any key and usable with no app ticked. Its first level SHALL let a person install the project and save changes through the app. Its second level SHALL also let them publish a saved change through the app. A person's page and a role's page SHALL offer the levels as two ticks: one that says the person can install the project, with a line saying they can save changes too, and one that says they can publish, with a line saying their changes go live once the checks pass. Both SHALL be off for a new person; the publish tick SHALL need the install tick. The owner and Admins SHALL hold both. Project code SHALL count as saved when the installation holds a credential that reads its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credentials SHALL be usable for that one project only, and no action or mini app SHALL be handed them.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. On GitHub that step SHALL ask for one key that hands the project out, saves changes and publishes them. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

While the installation can hand its project out and can not yet save or publish changes, the same places SHALL say what needs one more step and name it, and SHALL keep handing the project out meanwhile. An installation connected to its own repository and check runner in the employer's Cloudflare account SHALL need no key and no step from the employer to save or publish.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer ticks install for a role two people hold
- **THEN** both people may install the project and save on their next request, neither may publish, and a person outside the role may not install

#### Scenario: The employer lets one teammate publish

- **WHEN** the employer ticks publish for Ana, who can already install the project
- **THEN** Ana's next publish of a change whose checks passed goes live, and Bo, who holds only the install tick, is refused

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: A GitHub installation holds only its read-only key

- **WHEN** the employer opens a person on a GitHub installation that holds only a read-only key
- **THEN** the ticks say saving and publishing need one more step and give the request to copy, people who hold the install tick keep installing the project, and they can save once the new key is in with no further change in Access

### Requirement: Every key says what it is for

Every registered key SHALL carry a one-line purpose, and a key set up for direct use SHALL also carry a link to its service's public API guide. The checks SHALL fail before publishing on a key with no purpose, or a direct-use key with no guide link or one that is not HTTPS.

#### Scenario: A key is added without a purpose

- **WHEN** a change registers a Stripe key with a title and secrets but no purpose
- **THEN** the checks fail and name the Stripe key

### Requirement: Access lists every key's status without its value

Access SHALL give the owner and Admins a Services view beside People and Roles, listing every registered key with its name, purpose, whether it is saved and whether it is also used directly. The view SHALL show no key value and no level, and SHALL offer no place to type a key; an unsaved key SHALL say to ask the assistant for its key link. A person who manages nothing SHALL NOT see the view.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services with Stripe saved and Mailchimp not saved
- **THEN** Stripe shows Saved, Mailchimp says to ask for its key link, and no value is on the screen

#### Scenario: A teammate looks for Services

- **WHEN** a teammate who manages nothing opens Access
- **THEN** no Services view is offered and the Services address shows them nothing about keys

### Requirement: A preview names the keys only the live app holds

On a preview, Access SHALL show a key that only the live app may ever hold, the Cloudflare look-up key and Project code's saving, as held by the live app only. It SHALL NOT offer a step for it or say it is coming to previews. A key a preview may get from its own file SHALL keep saying it is not on previews yet.

#### Scenario: The employer opens Access on a preview

- **WHEN** the employer opens a person's keys on a preview of an install whose live app holds the Cloudflare key and Project code
- **THEN** both say they are on the live app only, and a business key the preview lacks says it is not on previews yet

### Requirement: An MCP server is used through the app, never connected to a chat

An outside MCP server SHALL be reached through the app's direct use of its key, and SHALL NOT be registered as a server in a chat's own settings, so its tool descriptions reach a chat only when a task asks for them. One helper SHALL list an MCP service's tools and call one through the app for any MCP service set up, with no per-service code. The services list SHALL mark which services are MCP servers.

#### Scenario: A new MCP server is added

- **WHEN** an owner asks to add an MCP server
- **THEN** the assistant sets it up in the app and uses the helper when a task needs it, and the chat's own server settings stay unchanged

### Requirement: Each MCP call is sorted into a look-up or a change by its tool

The server SHALL count an MCP message as a look-up only when it opens or lists the session's tools, or calls a tool the key's setup names as a look-up; every other method, every other tool, a tool the service adds later, a batch, and a message that cannot be read SHALL count as a change. Read SHALL permit only look-ups, as for any direct request. The server SHALL carry the service's session identifier back to the caller and on to the service, so one session spans several calls.

#### Scenario: A person with Read calls a tool that changes something

- **WHEN** a person whose level for an MCP service is Read calls a tool its setup does not name as a look-up
- **THEN** the server refuses before anything is sent, and that person's listing and look-up tools still run

#### Scenario: The service adds a tool

- **WHEN** the service's tool list gains a tool nobody has reviewed
- **THEN** calling it needs Read & write until its setup names it as a look-up

### Requirement: A public service can be set up with no key

A service that needs no key SHALL be settable up for direct use with no secret, so it still goes through the app and under people's levels. Its setup SHALL then send no credential header, and a setup that names a secret for a key with none, or a key with secrets but no secret named, SHALL fail the checks before publishing.

#### Scenario: A keyless MCP server

- **WHEN** a public MCP server is set up with no key and a person with Read lists its tools
- **THEN** the list comes back through the app, and no credential is sent
