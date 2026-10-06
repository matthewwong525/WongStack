# Key access

## Purpose

Key access lets the employer decide, per person, what each saved business-service key may be used for: nothing, looking things up, or also changing things. It covers how the level is enforced, what an action may reach, and how Access shows and sets it.

## Requirements

### Requirement: A person's key level governs every use of that key

The server SHALL check the caller's current level for every saved key an action uses before business work. Read SHALL permit actions that only look things up. Read & write SHALL also permit actions that change or send things. No level SHALL deny both. The check SHALL apply to app screens' calls, direct API calls, and assistant discovery and calls, and SHALL add to the app grant and any stricter action or record check, never replace them. The employer SHALL hold every key. A refusal SHALL name the key and the level needed and SHALL reveal no key value. Client state, an existing login and cached descriptions SHALL grant no level.

#### Scenario: A person with Read tries to change something

- **WHEN** a person whose Stripe level is Read calls an action that uses Stripe to issue a refund
- **THEN** the server refuses before any business work and names Stripe and Read & write, while that person's Stripe look-ups still run

#### Scenario: A level is lowered during a session

- **WHEN** the employer lowers a person's level and that person sends their next request with the same valid session
- **THEN** the request is judged by the new level, with no logout needed

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

### Requirement: The employer sees and sets key levels in Access

Access SHALL show the employer each person's level for each key, each app's keys and whether it looks things up or changes them, and for each key whether the app holds it, what uses it and who has which level. The employer SHALL be able to set a level from the person or role, from the key, or from an app that uses the key, and a level set in any of them SHALL be the same level everywhere. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. Each signed-in person SHALL see their own apps and levels. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer sets Stripe to Read for a person and saves
- **THEN** that person opened, the Stripe key opened and every app that uses Stripe show Read for them

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

### Requirement: Key levels start without taking anything away

On an installation that already has people, everyone SHALL keep what their apps can do until the employer next opens Access. At that open each person SHALL receive, for each key their apps use, the level those apps use, in one step, and nobody SHALL receive a key that only a key-alone action uses. Giving a person an app afterwards SHALL give at most Read on the keys it uses. Once levels have started, level data that can not be read SHALL deny key use and SHALL never fall back to open.

#### Scenario: An installation updates with people already added

- **WHEN** a person has an app that changes things with Stripe, the installation updates, and the employer opens Access
- **THEN** that person has Stripe: Read & write and the app works as before

#### Scenario: The employer gives a new person an app

- **WHEN** the employer ticks an app that uses Stripe for a person with no Stripe level
- **THEN** the person gets Stripe: Read, and Access says they can look up but not change

### Requirement: Cloudflare look-ups change nothing and read no stored data

The supplied Cloudflare key SHALL be offered at Read only. Its look-ups SHALL be limited to the installation's own Cloudflare account, SHALL change nothing, and SHALL NOT return the contents of the app's database, stored files or memory, or any key's value. A person SHALL never receive the Cloudflare key itself.

#### Scenario: A person looks up a setting

- **WHEN** a person with Cloudflare: Read asks for the app's hosting settings through their assistant
- **THEN** the settings are returned and no key is included

#### Scenario: A person asks for stored data

- **WHEN** that person asks Cloudflare for rows of the app's database
- **THEN** the look-up is refused and no rows are returned

### Requirement: Access sets an app's key levels beside the app and shows each gap

Where a person or a role is opened, Access SHALL show every area and every key in one list with its level, Project code apart as its one tick, so the employer gives an app and sets its keys' levels in one place. A key SHALL be one level however many of the set's apps and skills use it. A key nothing of the set uses SHALL still be settable in the same place. The People and Roles lists SHALL say how many apps and keys each person and role has, and SHALL say on the row when a held level is below what one of their apps or a skill needs; the opened person or role SHALL name each area and each key with its level in words, and each such gap with the app or skill it stops. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer gives a person an app that changes things with Stripe, picks Read & write for Stripe in the same list and saves
- **THEN** the person has the app and Stripe: Read & write, and every other app and skill of theirs that uses Stripe is judged by that one level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list marks that person's row as having a gap without the employer opening them, and opening them says that app can look up but not change

### Requirement: Project code is a key with one level

Access SHALL list Project code among the keys, offering Read as its only level, settable per person and per role like any key and usable with no app ticked. A person's page and a role's page SHALL offer it as one tick that says the person can install the project, off for a new person, and that tick SHALL be the same choice as Read in Keys. It SHALL count as saved when the installation holds a read-only credential for its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credential SHALL be usable for reading that one project only, and no action or mini app SHALL be handed it.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a read-only key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens Keys on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: The employer lets a new person install the project with no key saved

- **WHEN** the employer adds a person on a GitHub installation with no read-only key and ticks that they can install the project
- **THEN** the page says a read-only GitHub key comes first and gives the request to copy, the tick saves, and the person can install the project once the key is saved with no further change in Access

#### Scenario: The project can be handed out

- **WHEN** the employer opens a person on an installation that can hand its project out
- **THEN** the tick shows with no step under it, and ticking it and saving lets that person install the project on their next request
