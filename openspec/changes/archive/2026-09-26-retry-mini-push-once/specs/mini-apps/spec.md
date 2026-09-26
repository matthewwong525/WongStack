## MODIFIED Requirements

### Requirement: A mini app saves straight to the default branch

When a save's whole diff is inside one app's folder, `mini-apps/apps/<name>/`, `/save` SHALL run that app's tests on the agent host, then commit and push to the default branch, with no branch, no pull request, and no CI wait. This is a direct route like the prose route, and it SHALL have the same limits: the pushed commits hold only that folder, and a push is never forced. When the push is rejected only because the default branch moved, the save SHALL fetch it, rebase once, run the app's tests again, and push once more. It SHALL fall back to the normal route with a pull request when that rebase, those tests, or that second push fails, or when the push is refused for any other reason. CI on the default branch SHALL run the app's tests again and deploy only the production mini Worker. The save SHALL say that the app is now live on production and uses production data. The folder on the default branch and the dashboard SHALL be the record; no memory fact is needed for the app.

#### Scenario: Save a mini app

- **WHEN** the person saves `mini-apps/apps/tips/` and its tests pass on the host
- **THEN** one commit is pushed to the default branch, and the save reports the app as live on production
- **AND** no branch or pull request is created

#### Scenario: The diff leaves the folder

- **WHEN** a mini-app save also changes a file under `schema/migrations/`, `mini-apps/worker.ts`, or `mini-apps/wrangler.jsonc`
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
