# Spec Delta

## REMOVED Requirements

### Requirement: An area is held at a level

**Reason**: An app is given by a tick that covers all of it; look-only access to an app is no longer offered.

**Migration**: A grant held at Look up & change is the tick. A grant held at Look up ends, by *Look-only access ends without giving more*.

### Requirement: An area may have no screen

**Reason**: Work with no screen is no longer given by itself.

**Migration**: Move it inside an app or have it use a key, by *Work with no screen belongs to an app or a key*.

### Requirement: Area levels arrive without taking anything away

**Reason**: Area levels are removed.

**Migration**: None; *Look-only access ends without giving more* says what an update keeps.

### Requirement: A panel starts from an app or skill and shows what is enforced

**Reason**: A person and a role open to a list of apps and a list of keys, with no starting points and no list of what is missing.

**Migration**: None; *A person or a role opens to apps and keys* replaces it.

## ADDED Requirements

### Requirement: A given app is the whole app

An app SHALL be given to a person or a role as one choice, given or not. A person who holds an app SHALL be able to open its screen and run every call it makes, look-ups and changes alike, from the screen, a direct API call, or an assistant, whatever saved keys the app uses and whatever the person's level for those keys. A person who does not hold it SHALL be refused all of it before business work. The employer SHALL hold every app. Any stricter action or record check SHALL still apply.

#### Scenario: A person with an app and no key level changes something

- **WHEN** a person who holds Orders and has no level for Stripe issues a refund from the Orders screen, where Orders uses Stripe
- **THEN** the refund runs

#### Scenario: A person without the app

- **WHEN** a person who does not hold Orders, and holds Stripe at Read & write, calls an Orders action
- **THEN** the server refuses before any business work

### Requirement: Work with no screen belongs to an app or a key

Company actions with no screen of their own SHALL either belong to an app, where holding that app permits them, or use a saved key, where the caller's level for that key permits them. Only an app that has a screen SHALL be offered where a person or a role is opened. Such work that belongs to no app and uses no key SHALL fail the checks that gate publishing, naming it, and SHALL be refused for everyone if it runs.

#### Scenario: Work built for a skill alone uses no key

- **WHEN** a change adds actions with no screen that belong to no app and use no saved key
- **THEN** the checks fail and name them, before the change can publish

### Requirement: Look-only access ends without giving more

When an installation updates from area levels, a person or role that held an app at Look up & change SHALL hold that app, and one that held it at Look up SHALL not hold it. Access SHALL name each person and role that lost an app this way, with the app, until the next change saved in Access. Nobody SHALL gain the ability to change an app's own data through the update.

#### Scenario: A person who could only look

- **WHEN** an installation where a person held Orders at Look up takes the update
- **THEN** that person's Orders requests are refused, and Access names them and Orders to the employer until the next save

### Requirement: A person or a role opens to apps and keys

Where a person's own set or a role is opened, Access SHALL show the apps as choices to give or not, the saved keys each with its level, and Project code as its one tick, and SHALL change nothing for the person before the employer saves. Access SHALL not mark a person, a role or an app as lacking a key level. The People and Roles lists SHALL say how many apps and keys each person and role has. A signed-in person who manages nothing SHALL see their own apps and key levels.

#### Scenario: The employer gives an app

- **WHEN** the employer opens a person, gives them Orders and saves
- **THEN** the person holds Orders, their key levels are unchanged, and no row is marked as missing anything

#### Scenario: The employer leaves without saving

- **WHEN** the employer gives an app and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged

## MODIFIED Requirements

### Requirement: Access lists line up and keep one frame

Access SHALL have two views, People and Roles, each listing its rows with the same columns, each row one line on a computer, readable on a phone without sideways scrolling. Apps and key levels SHALL be set only where a person or a role is opened. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed. Opening a person or a role SHALL show it with its list still in place, at an address that opens it again, and closing it SHALL return to the list. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person or role included. A removal and leaving with unsaved changes SHALL ask in the same way.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's fields show with the people list and the switch between the two views still in place, and closing them shows the list as it was

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row
