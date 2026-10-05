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
- **THEN** that person's line, the Stripe key's page and every app that uses Stripe show Read for them

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

On a person's page and a role's page, Access SHALL show the level of each key an app uses beside that app once the app is ticked, so the employer gives the app and sets the level in one place. A key that several ticked apps use SHALL remain one level, shown the same beside each. A key no ticked app uses SHALL still be settable on the same page. The People and Roles lists SHALL show each person's and role's apps and key levels as separate items with the level in words, and SHALL say where a held level is below what one of their apps does. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer ticks an app that changes things with Stripe on a person's page, picks Read & write beside that app and saves
- **THEN** the person has the app and Stripe: Read & write, and every other ticked app that uses Stripe shows the same level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list says that app can look up but not change, without the employer opening the person's page
