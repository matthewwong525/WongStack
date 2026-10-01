## MODIFIED Requirements

### Requirement: The main Worker answers its own routes

The main Worker SHALL handle `/api/`, `/_memory/`, and `/apps/<name>/api/` itself, never the single-page fallback, and SHALL never serve a mini app's source or test files. The main app SHALL bundle every mini app's server side itself, so adding an app needs no edit outside its folders.

#### Scenario: An API path in a browser tab

- **WHEN** a person opens `/apps/hello/api/greeting`
- **THEN** the hello app's handler answers

#### Scenario: A source file by path

- **WHEN** a client requests a mini app's `api.mjs` or test file
- **THEN** the Worker does not return its contents

## REMOVED Requirements

### Requirement: An untouched main app is not redeployed

**Reason**: Mini apps are main-app code, so a mini-app change is a main-app change; the mini-app scenario no longer applies.

**Migration**: See "A docs-only change is not redeployed".

### Requirement: A sync ships only the example mini app

**Reason**: Mini apps moved into `app/`; the old folder path no longer exists.

**Migration**: See "A sync ships only the example mini app's folders".

## ADDED Requirements

### Requirement: A docs-only change is not redeployed

When a branch changes only docs, CI SHALL skip the main app's migration, build, and deploy and say so. Any change to the main app, a mini app included, SHALL deploy it.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/`
- **THEN** the check is green and no main-app deploy ran

#### Scenario: A mini-app change

- **WHEN** a push to the default branch changes only one mini app's folders
- **THEN** CI deploys the production main app with that change in it

### Requirement: A sync ships only the example mini app's folders

The payload SHALL carry the example mini app `hello` and no other mini app, so an app made in the source repo never reaches a target.

#### Scenario: An app in the source repo

- **WHEN** the source has the mini app `tips` and a target syncs
- **THEN** no path of the `tips` app is selected
