## ADDED Requirements

### Requirement: Previews have their own sign-in

The live app and staging with its previews SHALL each be protected by their own Access application, with their own audience and their own verification service token. A sign-in or machine assertion issued for staging or a preview SHALL NOT authenticate on the live app, on any route, including the routes the Worker checks itself. Both applications SHALL admit the same people: adding or removing a person through the live app SHALL update both sign-in lists, and SHALL leave each application's machine policy intact. Setup SHALL create both applications on a new install. The Access step SHALL split an existing shared application without changing who can sign in or how: the live application SHALL keep its login methods, and the previews application SHALL get the same ones. The deploy gate SHALL refuse a staging or preview deploy while the two environments share an application or audience, naming the Access step. It SHALL still let the live app publish, with a warning.

#### Scenario: A sign-in copied on a preview

- **WHEN** code running on a preview records a visitor's sign-in and sends it to the live app's memory or git route
- **THEN** the live app refuses it as signed out, while the same person's own live-app sign-in still works

#### Scenario: An install that still shares one sign-in

- **WHEN** an updated install whose two environments still share an Access application pushes a branch
- **THEN** the preview deploy stops and names the Access step, and a publish to the live app still goes through

### Requirement: Each Worker loads its own secrets file

`app/.dev.vars` SHALL be the declared list of the live app's runtime secrets, and `secrets:push` SHALL load it into the production Worker alone. Staging SHALL hold only what a git-ignored `app/.dev.vars.staging` declares; with no such file, staging SHALL hold no runtime secret. A push SHALL leave staging holding exactly the staging file's names, removing any other; with no staging Worker yet, it SHALL load production and pass with a note. While the two environments still share one Access application or audience, a push SHALL load production alone and leave staging as it is, with a note naming the Access step. The Access step SHALL prune staging by the same rule, and SHALL NOT change production's secrets. Before it changes anything, the split SHALL record the keys staging held; the Access step SHALL name those it removes for rotation, and roll the read-only Cloudflare key when staging held it, until it has done both once, even after a stopped run. A linked worktree with no copy SHALL read the primary worktree's files. The staging file SHALL NOT declare a production-only secret: the login-management key, the project write key, or the read-only Cloudflare key. It SHALL NOT give any key the same value production holds. Both sources and the staging config SHALL be validated before the first provider write; an invalid source SHALL load nothing into either Worker. Output SHALL name keys only, never values.

#### Scenario: No staging file

- **WHEN** `secrets:push` runs with `app/.dev.vars` and no `app/.dev.vars.staging`
- **THEN** production gets every key, staging is left holding none, and the output names the keys previews lack

#### Scenario: A push before the Access step

- **WHEN** `secrets:push` runs while both environments still name one Access application or audience
- **THEN** production gets every key, staging keeps what it holds, and the output names the Access step

#### Scenario: An Access step stopped part-way

- **WHEN** the Access step stops after removing the read-only Cloudflare key from staging, and runs again
- **THEN** the rerun rolls that key, and names for rotation every key staging held at the split

#### Scenario: A staging file that reaches production

- **WHEN** `app/.dev.vars.staging` declares `WONG_CODE_WRITE`, or repeats production's value for any key
- **THEN** the push fails before either Worker changes and names the key without its value

### Requirement: A gate keeps previews to their own keys

`secrets:check` SHALL fail when staging holds a runtime secret production does not declare, when staging holds a production-only secret (only warning, naming the Access step, while the two environments still share one Access application or audience), when a stateful top-level binding is absent from `env.staging`, or when staging config carries private Access management authority. It SHALL exclude documented production-only memory bindings. It SHALL list, without failing, the production secrets staging lacks. It SHALL only warn about disagreement with `app/.dev.vars.example`, compare names only, and never read or print secret values.

#### Scenario: Previews lack a business key

- **WHEN** production holds `STRIPE_SECRET_KEY` and staging does not
- **THEN** the check passes and names `STRIPE_SECRET_KEY` as missing on previews, with no value in its output

#### Scenario: Staging holds the project write key

- **WHEN** the staging Worker's secret names include `WONG_CODE_WRITE`
- **THEN** the check fails and names it; while both environments still name one Access application, it passes with a warning naming the Access step, so the live app keeps publishing

### Requirement: Setup supplies the read-only Cloudflare key to the live app only

Setup SHALL create a Cloudflare key limited to reading settings, logs and usage, with no permission that changes anything and none that reads databases, stored files, key-value data, queues or memory. It SHALL store the key for the production Worker alone and record its identifier for reuse and rotation. The key SHALL NOT reach staging or previews, and the Access step SHALL remove a copy staging already holds. The key SHALL NOT be the user token, the deploy key or the login-management key, and the user token SHALL still never reach a Worker. A rerun SHALL reuse the key when the production Worker holds it. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes
- **THEN** the production Worker holds the read-only key, staging holds no copy, the user token is in neither Worker, and the employer can give a person Cloudflare: Read from Access without another step

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access shows Cloudflare with one step left

## MODIFIED Requirements

### Requirement: Protection covers every address of this workspace

The workspace's Access protection SHALL cover its production and staging Workers across default addresses, custom domains, routes, branch aliases, and unique version URLs, including addresses added later and previews created before adoption. The live app's application SHALL cover only the production Worker, and the previews' application only the staging Worker. Provisioning SHALL NOT gate unrelated Workers or create account-wide protection. More-specific conflicting policies SHALL prevent a successful coverage report until resolved.

#### Scenario: A new preview or custom domain

- **WHEN** a new version, alias, or custom domain reaches a protected workspace Worker
- **THEN** the same allowed emails control access without a manual hostname-policy update

#### Scenario: A shared Cloudflare account

- **WHEN** the account also contains unrelated Workers and a conflicting preview policy
- **THEN** unrelated Workers keep their access settings, and this workspace is not reported fully protected until its conflicting policy is resolved

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification on each of the two applications, each admitting only its own service token: one for the live app, one for staging and previews. Automated checks of a preview SHALL use the preview token, never the live app's. Membership updates SHALL preserve both machine policies. The Access step SHALL NOT create or rotate the live app's service token; it SHALL make only the previews token. The production memory route and the project's git route SHALL be the only automatic exceptions to the edge sign-in wall, and the Worker SHALL verify the company sign-in on each of them itself; other public routes require explicit reviewed configuration. Staging and CI branch previews SHALL carry no memory bindings.

#### Scenario: Automated checks and memory

- **WHEN** automated checks use the dedicated service token and a memory caller sends a valid company sign-in
- **THEN** each reaches its intended protected service, while an anonymous memory or git caller is denied by the Worker

#### Scenario: Team membership changes

- **WHEN** a person is added or removed
- **THEN** machine permissions and the two Worker-checked routes remain intact, and no broad public prefix becomes exempt

### Requirement: Setup supplies what Access needs

Setup SHALL record the owner's email as committed nonsecret configuration for both Workers, and SHALL create a key limited to Access application-and-policy writes. It SHALL store the key with the account identifier and both applications' human-policy identifiers as the production Worker's login-management secret, and record the key's identifier for reuse and rotation. The key SHALL NOT be the deploy key, SHALL NOT be written to staging, and a rerun SHALL reuse it while its recorded identifiers still match, judged from the committed install record when the machine has no provisioning state. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes on an account with sign-in turned on
- **THEN** the owner email is in both Workers' committed configuration, production holds the login-management secret, staging holds none, and the owner can add a person from Access without another step

#### Scenario: An existing install updates

- **WHEN** an installation made before this change updates and its saved token can create keys
- **THEN** the update adds the owner email and the production secret and leaves existing people's access unchanged

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access still opens and names the step left

### Requirement: Setup tells the app which project it hands out

Setup and the Access step SHALL record, as committed nonsecret configuration, the one project the app hands out, on the live app and on staging. On an install whose project is kept in the employer's Cloudflare account they SHALL also connect the live app to that repository, so no key is made or pasted; staging SHALL get no connection that can write to it. On a GitHub install they SHALL leave the read-only key to the employer through the private key link, and SHALL report it as missing with its numbered steps. Whether the project can be handed out and saved SHALL be judged from the production Worker alone; the project write key SHALL never be required on, or stored for, staging. They SHALL NOT raise that key as a to-do, and setup's closing report SHALL NOT mention it: the employer is asked in Access when they first let someone install the project. Running the step again SHALL change nothing that is already right. The account token SHALL still never reach a Worker.

#### Scenario: A Cloudflare-kept install updates

- **WHEN** the Access step runs on an install with no GitHub
- **THEN** the app is connected to its own repository, Project code shows as saved after the next publish, and no key was asked for

#### Scenario: A GitHub install updates

- **WHEN** the Access step runs on a GitHub install with no read-only key saved
- **THEN** the project is recorded, the report names the key as missing with its steps, no to-do asks for it, and Connect keeps working as before for everyone

#### Scenario: Setup finishes on GitHub with no teammate yet

- **WHEN** setup finishes a new GitHub install
- **THEN** its closing report says nothing about a read-only GitHub key, and the employer is not asked for one

## REMOVED Requirements

### Requirement: One secrets file loads both Workers

**Reason**: Staging ran production's keys, which any pushed branch's code could read.
**Migration**: Replaced by *Each Worker loads its own secrets file*; add test keys to `app/.dev.vars.staging` for previews that need a service.

### Requirement: A gate keeps the two Workers in step

**Reason**: Staging no longer mirrors production's secret names; a missing preview key is expected, not drift.
**Migration**: Replaced by *A gate keeps previews to their own keys*.

### Requirement: Setup supplies the read-only Cloudflare key

**Reason**: The key reads every Worker's logs, the live app's included, so it must not sit where branch code runs.
**Migration**: Replaced by *Setup supplies the read-only Cloudflare key to the live app only*; the Access step removes staging's copy.
