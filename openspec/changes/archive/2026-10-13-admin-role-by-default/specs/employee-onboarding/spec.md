# Spec Delta

## ADDED Requirements

### Requirement: A built-in Admin role holds everything and manages Access

Every installation SHALL have one built-in role named Admin, listed first among the roles, that nobody can rename, change or remove. A current person who holds Admin SHALL hold every built app and every saved key at the highest level the key offers, apps and keys added later included, once key levels have started, and SHALL be able to do in Access what the employer can: add, change and remove people, create, change, give and remove other roles, and set app grants and key levels. Wherever these requirements name a manager, they SHALL mean a current person who holds Admin. Only the employer SHALL give Admin, take it away, or remove a person who holds it; such a request from anyone else, about themselves included, SHALL be denied and change nothing. Giving Admin SHALL ask the employer first and say that it is full trust. An Admin SHALL NOT be the employer: no screen SHALL change who the employer is. Admin's authority SHALL be read on every request: once the employer takes it away or removes the person, that person's next management request SHALL be refused, and a removed person added again SHALL NOT hold Admin. No one SHALL be given Admin without the employer choosing it, and on the live app the verification service token SHALL never hold it.

#### Scenario: The employer makes a person an Admin

- **WHEN** the employer picks Admin for a person who held one app, confirms, and a new app is built afterwards
- **THEN** the person opens every app, the new one included, uses every saved key at its highest level, and can add a person in Access

#### Scenario: An Admin tries to pick or remove an Admin

- **WHEN** an Admin sends a request that gives someone Admin, takes it from anyone, removes a person who holds it, renames, changes or removes the Admin role, or changes the employer
- **THEN** it is denied and nobody's access or authority changes

### Requirement: An update moves managers onto Admin and takes nothing else

When an installation updates from the per-person manager switch, each current person who was a manager SHALL hold Admin, and nobody else SHALL gain it. A role the employer had already named Admin SHALL keep its apps, key levels and holders under another name that says it is their own, and its holders SHALL gain nothing. Every other person and role SHALL keep the apps and key levels they had.

#### Scenario: An installation with a manager updates

- **WHEN** an installation whose employer had made one person a manager updates
- **THEN** that person holds Admin and still manages Access, and a person who was not a manager holds what they held before

#### Scenario: A role was already named Admin

- **WHEN** an installation with its own role named Admin, giving one app to two people, updates
- **THEN** that role shows under its new name with the same app and the same two people, and neither person can manage Access

## MODIFIED Requirements

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer or a manager SHALL create, change, give or remove a role, no role but the built-in Admin SHALL let its holder manage Access, no role SHALL take the name Admin, and giving a role SHALL NOT change who can sign in.

#### Scenario: The employer changes a role

- **WHEN** the employer removes an app from a role two people hold and saves
- **THEN** both people's next request to that app is denied, and a person with their own set is unaffected

#### Scenario: The employer removes a role people hold

- **WHEN** the employer removes a role that two people hold
- **THEN** each keeps the same apps and key levels as their own set

### Requirement: The employer changes a person's role from the people list

The employer or a manager SHALL be able to give a current person a role, or their own set, from the people list without opening the person's page. The change SHALL be saved at once and govern the person's next request, except that picking Admin SHALL ask first and SHALL be offered to the employer alone. Access SHALL then say what changed and offer to undo it, and undoing SHALL return the person to the role or own set they had, with the same apps and key levels. A role change that did not save SHALL be reported and SHALL leave the list showing what the person has.

#### Scenario: A role is picked in the list

- **WHEN** the employer picks Sales for a person who had their own set of two apps
- **THEN** the person has exactly what Sales gives on their next request, and Access says so and offers to undo it

#### Scenario: The employer undoes the change

- **WHEN** the employer undoes that change
- **THEN** the person again has their own set with the same two apps and the key levels they held before

## REMOVED Requirements

### Requirement: The employer chooses who else manages Access

**Reason**: The per-person manager switch is replaced by the built-in Admin role, which carries managing Access together with every app and key.

**Migration**: Each current manager holds Admin after the update and keeps managing Access. Give or take Admin where a person's role is picked; a save that names the old switch is refused.
