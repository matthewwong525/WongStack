# Spec Delta

## ADDED Requirements

### Requirement: The browser runs the build its disguise is made for

The shared browser SHALL run the Camoufox build that the official Camoufox library pins, and SHALL tell sites that build's own Firefox version. It SHALL never run a build with a disguise made for another build.

#### Scenario: Sites see the true version

- **WHEN** the browser opens a page that reads the browser version
- **THEN** the page sees the Firefox version of the build that runs, and a site that checks the version shows no "unsupported browser" page

#### Scenario: A disguise for another build

- **WHEN** the installed library and the installed build don't match
- **THEN** the browser does not start, and `browse.mjs status` says which part to install again

### Requirement: Pages and logins stay between commands and restarts

The browser SHALL keep each task's open page between commands, and SHALL keep site logins and site storage in one profile folder on disk, with one disguise kept from start to start, so a login survives a browser restart.

#### Scenario: A page stays open

- **WHEN** a task types into a page, and its next command reads the page
- **THEN** the page is still open as the task left it

#### Scenario: A restart

- **WHEN** the browser stops and starts again
- **THEN** sites that were signed in are still signed in, and they see the same browser as before

### Requirement: Logins move from the old browser once, without Meta

On its first start, the browser SHALL copy the old camofox browser's saved site logins into its profile folder one time, and SHALL leave out Facebook, Messenger, Instagram and other Meta logins. It SHALL never copy a login into it again after that first start.

#### Scenario: First start

- **WHEN** the new browser starts for the first time and the old camofox profile exists
- **THEN** the non-Meta sites are signed in, and Facebook asks for a fresh sign-in

#### Scenario: Later starts

- **WHEN** the browser starts again
- **THEN** it copies nothing, and logins made in the new browser stay as they are

### Requirement: An update moves the build and the disguise together

An update of the browser SHALL move the Camoufox build and the library that makes its disguise in one step, and SHALL keep the previous install until the new one starts. The dependency update SHALL only report a newer library to the person, and SHALL never move the pin itself.

#### Scenario: A failed update

- **WHEN** a new build fails to start
- **THEN** the browser keeps running the previous build and its disguise

#### Scenario: A newer library

- **WHEN** the dependency update finds a newer Camoufox library
- **THEN** it names the new version to the person and leaves the pin in `browse.mjs` as it is
