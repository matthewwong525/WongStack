# mini-apps Specification

## Purpose
Let a person get a working app from one request in under a minute, however large the main app is, try it on a preview, change it by chatting, and save it straight to production, where a dashboard lists every mini app.
## Requirements
### Requirement: A mini app lives apart from the main app

Each mini app SHALL live in its own folder, `mini-apps/apps/<name>/`, beside the main app, with a manifest `app.json` that holds at least a title and a one-line description. The main app's Worker SHALL serve every mini app: its pages under `/apps/<name>/`, and its optional handler under `/apps/<name>/api/*`. A handler SHALL receive the repo's app database and no other binding, so a mini app can never read the memory store. A mini app's pages SHALL need no build step of their own. The main app's lint and tests SHALL NOT include `mini-apps/apps/`. There SHALL be no separate mini-app Worker.

#### Scenario: A large main app

- **WHEN** the repo's `app/` holds a very large codebase and the person asks for a mini app
- **THEN** the mini app is written under `mini-apps/apps/<name>/`, and its preview builds the whole main app with the mini app in it

#### Scenario: A mini app is served at the main address

- **WHEN** the mini app `tips` is saved and production deploys
- **THEN** `https://<app>/apps/tips/` serves its page from the main app's Worker

#### Scenario: A mini app stores data

- **WHEN** a mini app's API writes a row on its preview
- **THEN** the row is written to the staging database, never the production one

#### Scenario: A handler can not reach memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** the handler's environment holds the app database and no memory binding

### Requirement: A mini-app request builds without the full loop

When the person asks for a new standalone page or small tool, `/apply` SHALL build it as a mini app, with no branch, no OpenSpec change, and no review page. It SHALL ask only when it can not act without an answer. A request that changes the main app SHALL take the full change loop.

#### Scenario: A new tool

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent builds `mini-apps/apps/tips/` with no `/explore` round and no OpenSpec change

#### Scenario: A change to the main app

- **WHEN** the person asks to change the main app's login page
- **THEN** the agent runs the full change loop

### Requirement: A mini app carries its own tests

`/apply` SHALL write tests for a mini app's logic — its API handler and its scripts — in the app's own folder, runnable by Node's built-in test runner with no install. Before a direct save, `/save` SHALL run that app's tests on the agent host, and a failing test SHALL stop the save with nothing pushed. On a push that changes mini apps, CI SHALL run the tests of the changed mini apps only, in the required `test` check.

#### Scenario: Save an app with a failing test

- **WHEN** the person saves a mini app whose test fails on the host
- **THEN** the save stops, names the failing test, and pushes nothing

#### Scenario: Only the changed app is tested

- **WHEN** a push changes `mini-apps/apps/tips/` and no other mini app
- **THEN** CI runs the tests under `mini-apps/apps/tips/` and no other suite

### Requirement: The mini-app preview comes from the agent host

After each build of a mini app, `/apply` SHALL upload a preview version of the staging main Worker from the agent host, under the alias `mini-<name>`, and SHALL report the preview URL without waiting for CI. The upload SHALL build the whole main app, with the mini apps in it, and SHALL install the main app's dependencies first when they are missing. When the staging Worker does not exist yet, the upload SHALL create it first. When the upload can not run — no stack pack or no credential — `/apply` SHALL state the reason in one line. `/apply` SHALL NOT save on its own: saving puts the app live on production, so the person saves when the preview is right.

#### Scenario: Change the app by chatting

- **WHEN** the person asks for a different color on a mini app that has a preview
- **THEN** `/apply` builds and uploads again and reports the new preview URL, with no CI wait

#### Scenario: A fresh worktree

- **WHEN** the main app has no installed dependencies on the agent host
- **THEN** the upload installs them, builds the app, and then uploads the preview

#### Scenario: The first mini app in a repo

- **WHEN** the staging main Worker does not exist
- **THEN** the first preview upload creates it and then uploads the preview

### Requirement: A mini app saves straight to the default branch

When a save's whole diff is inside one app's folder, `mini-apps/apps/<name>/`, `/save` SHALL run that app's tests on the agent host, then commit and push to the default branch, with no branch, no pull request, and no CI wait. This is a direct route like the prose route, and it SHALL have the same limits: the pushed commits hold only that folder, and a push is never forced. When the push is rejected only because the default branch moved, the save SHALL fetch it, rebase once, run the app's tests again, and push once more. It SHALL fall back to the normal route with a pull request when that rebase, those tests, or that second push fails, or when the push is refused for any other reason. CI on the default branch SHALL run the app's tests again, skip the main app's suite, and build and deploy the production main Worker. The save SHALL say that the app goes live on production at `/apps/<name>/` when that deploy finishes, and that it uses production data. The folder on the default branch and the app list SHALL be the record; no memory fact is needed for the app.

#### Scenario: Save a mini app

- **WHEN** the person saves `mini-apps/apps/tips/` and its tests pass on the host
- **THEN** one commit is pushed to the default branch, and the save reports that the app goes live at `/apps/tips/`
- **AND** no branch or pull request is created

#### Scenario: The diff leaves the folder

- **WHEN** a mini-app save also changes a file under `schema/migrations/`, `app/`, or a shared file under `mini-apps/` outside `mini-apps/apps/`
- **THEN** the save takes the normal route with a branch and a pull request

#### Scenario: The push is rejected

- **WHEN** the push to the default branch is refused by branch rules the person can not bypass
- **THEN** the save does not force it or retry it, and takes the normal route with a pull request

#### Scenario: Main moved during the save

- **WHEN** another change reached the default branch between the save's fetch and its push, and touched other files
- **THEN** the save rebases once, runs the app's tests again, and pushes, with no pull request

#### Scenario: The rebase does not apply

- **WHEN** the default branch moved and the rebase conflicts with a change to the same app
- **THEN** the save leaves no rebase in progress and takes the normal route with a pull request

### Requirement: A mini-app pull request merges through the short path

When a mini-app save fell back to a pull request, `/ship` SHALL merge it with no OpenSpec change, no archive, and no walk, on its CI result. The pull request body SHALL come from the app's `app.json`. Production SHALL receive a mini app only through a push or a merge to the default branch, never from the agent host.

#### Scenario: A mini app with a migration

- **WHEN** a mini app's save added a migration and fell back to a pull request
- **THEN** `/ship` merges it after CI runs the app's tests, with no OpenSpec change and no walk
- **AND** the production main Worker deploys from the merge, not from the host

### Requirement: A dashboard lists every mini app

A script SHALL build the mini-app list from the `app.json` of each folder under `mini-apps/apps/`, each time the main app is built, with no model step. It SHALL write the list twice: as a page at `/apps/` and as data at `/apps/apps.json`. Each entry SHALL show the title and description and link to the app. The production list SHALL therefore hold every saved mini app, and a preview's list SHALL also hold the app being previewed.

#### Scenario: A saved app appears

- **WHEN** a mini app reaches the default branch
- **THEN** the production `/apps/` page and `/apps/apps.json` list it with its title, description, and link

#### Scenario: A malformed manifest

- **WHEN** a folder's `app.json` is missing a title
- **THEN** the script names the folder and fails the build

### Requirement: The starter landing page lists the mini apps and teaches the loop

The starter app's landing page SHALL open with a tutorial titled *Learn the development loop*. The tutorial SHALL show one plain-language message for the person to paste into their chat with the agent, and a button that copies it. The message SHALL ask the agent to remove the tutorial from the home page and to explain each step as it goes. It SHALL NOT be a command. The tutorial SHALL NOT list the loop's steps itself; the agent explains them in chat. Removing it is the person's first change, so it teaches the loop by doing. When copying fails, the button SHALL say to copy the message by hand, and the message SHALL stay selectable.

The tutorial SHALL be one part of the page that can be removed with no other change. Below it, the page SHALL list the mini apps from `/apps/apps.json`, each with its title, description, and a link to it. With no mini apps, it SHALL say how to ask for one.

Setup's closing report SHALL point the person to the tutorial on their site. `/wong-sync` SHALL add or update the tutorial only when the target's landing page still renders it; a removed tutorial SHALL stay removed.

#### Scenario: A fresh install

- **WHEN** a person opens the production app of a new install
- **THEN** the landing page opens with *Learn the development loop*, the message, and a Copy button, and lists the example app below it

#### Scenario: Copying the message

- **WHEN** the person presses Copy
- **THEN** the message is on their clipboard and the button says it was copied

#### Scenario: Copying is blocked

- **WHEN** the browser refuses clipboard access
- **THEN** the button says to copy the message by hand, and the message can be selected

#### Scenario: The agent teaches the loop

- **WHEN** the person pastes the message into the chat
- **THEN** the agent explains each step before it runs it, stops at the plan to ask "build it now?", and stops after the preview to ask "publish it?"

#### Scenario: The list can not load

- **WHEN** `/apps/apps.json` fails to load
- **THEN** the landing page still shows the tutorial and a link to `/apps/`

#### Scenario: The tutorial is done

- **WHEN** the person publishes the change that removes the tutorial
- **THEN** the landing page shows only the app list, and nothing else on it changes

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial is added back to its landing page
