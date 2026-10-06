# Spec Delta

## ADDED Requirements

### Requirement: An area is held at a level

Each app a person or role is given SHALL be an area held at one of two levels: Look up, which permits calls that only read, and Look up & change, which also permits calls that change or send things. The server SHALL check the caller's current level for every area a call belongs to before business work, for an app screen's calls, direct API calls, and assistant discovery and calls alike, in addition to key levels and any stricter action or record check. Opening an app's screen SHALL need Look up. A refusal SHALL name the area and the level needed. The employer SHALL hold every area at Look up & change. A newly given area SHALL start at Look up.

#### Scenario: A person at Look up tries to change something

- **WHEN** a person who holds Orders at Look up calls an Orders action that changes an order
- **THEN** the server refuses before any business work and names Orders and Look up & change, while that person's Orders look-ups still run

#### Scenario: A level is lowered during a session

- **WHEN** the employer lowers a person's area to Look up and that person sends a changing request with the same valid session
- **THEN** the request is refused with no logout needed

### Requirement: An area may have no screen

A group of company actions with no screen SHALL be an area the employer can give and take away like an app. Access SHALL list it, marked as having no screen, and the home page SHALL show no card for it. A business route that belongs to no listed area SHALL fail the checks that gate publishing, not silently deny everyone.

#### Scenario: Work built for a skill alone

- **WHEN** the employer gives a person an area that has actions and no screen
- **THEN** that person's assistant can discover and call its actions at the level given, and their home page shows no new card

### Requirement: Area levels arrive without taking anything away

When an installation updates to area levels, every person and role SHALL hold each app they had at Look up & change, and nobody SHALL be refused a call they could make before the update. People recorded at the employer's first Access visit SHALL likewise hold every built area at Look up & change.

#### Scenario: An existing team updates

- **WHEN** an installation whose people hold apps takes the update
- **THEN** each person's apps, screens and changing calls work as before, and Access shows each of those areas at Look up & change

### Requirement: A panel starts from an app or skill and shows what is enforced

Where a person's own set or a role is opened, Access SHALL offer each app and skill as a starting point that fills in what it needs without saving, SHALL show the areas and key levels the server enforces as one editable list that names what each opens, and SHALL list each app or skill the set cannot fully use with what is missing. Choosing an app SHALL fill its area at Look up and its keys at Read; choosing a skill SHALL fill every level it needs. A level a starting point raised SHALL be marked until the save, and nothing SHALL change for the person before the employer saves.

#### Scenario: The employer gives a skill in one press

- **WHEN** the employer opens a role, chooses a skill that changes things in Orders with Stripe, and saves
- **THEN** before the save the panel marks Orders at Look up & change and Stripe at Read & write as raised, and after it the role's holders can run the skill

#### Scenario: The employer leaves without saving

- **WHEN** the employer chooses a starting point and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged
