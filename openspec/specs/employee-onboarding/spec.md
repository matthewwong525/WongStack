# Employee onboarding

## Purpose

Let employees connect an assistant from an existing business app using their app identity, with employer-managed app/API permissions. Repository access and authentication remain manual and independent.

## Requirements

### Requirement: The business app is the employee setup entry point

Every signed-in person SHALL receive a copyable assistant setup prompt and their own connection status after signing into the existing protected business app, before and after per-app permissions start. The prompt SHALL contain nonsecret routing and instructions only, SHALL remain manually copyable after clipboard failure, and SHALL perform no work or grant access when copied. Employees SHALL require no Cloudflare administration account or repository identity for the supported company API connection. Repository access SHALL be granted and authenticated separately through its provider. Expired or new-device sessions SHALL use the same employee app identity for renewed approval.

#### Scenario: Employee copies setup instructions

- **WHEN** a current employee copies the setup prompt from the app
- **THEN** the page confirms copying and the prompt identifies this business and its published setup instructions without including any credential

#### Scenario: A new computer needs approval

- **WHEN** the assistant has no valid employee session on that computer
- **THEN** setup requests approval through the same business login rather than asking for a provider token or separate employee GitHub account

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer and the managers the employer chose SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive no repository authority from app login. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service setup/status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only and the owner sees the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: App admission follows current desired employee membership

Saving a person SHALL commit their app choices and, in the same request on the live app, attempt to reconcile the current exact-email roster to the recorded app login policy, preserving the employer, other employees, the policy's other controls, unrelated policies and machine access. Each person SHALL show one sign-in status; failed admission/removal and session-revocation work SHALL remain observable and retryable. Stale work SHALL not restore a removed member. The login-management credential SHALL be supplied by setup, remain private in the live installation, stay separate from deployment authority, and have its actual provider scope disclosed. A live installation without that credential SHALL still open Access and save app choices while reporting the one remaining setup step. An open or unverified installation SHALL report onboarding unavailable rather than silently granting access.

#### Scenario: Login policy update fails

- **WHEN** the roster is saved but the provider refuses its email-policy update
- **THEN** admission remains pending and retryable without claiming the person can log in or asking them for a management token

#### Scenario: The credential has not been supplied yet

- **WHEN** the employer saves a person on a live installation that has no login-management credential
- **THEN** the app choices are saved, the person is shown as not yet able to sign in, and Access names the one setup step left

#### Scenario: A removed person's earlier add is retried

- **WHEN** stale add work runs after the person has been removed
- **THEN** reconciliation converges to current membership and reports any provider removal still pending

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a verified reviewed bootstrap artifact. An employee SHALL obtain a usable company API client without cloning a private project. Setup SHALL NOT issue repository credentials, register a repository integration or change repository authentication. Interrupted setup SHALL preserve dirty work, conflicting local folders and unpushed commits and resume against the same target. API readiness SHALL require actual authorized connection evidence; repository access SHALL be labeled separate manual setup.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps pastes the setup prompt into their assistant
- **THEN** the assistant can bootstrap and call their approved company actions without needing access to the private project source

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

### Requirement: Connections remain private and destination bound

Employee sessions SHALL remain in private OS-user state outside checkouts and SHALL not appear in prompt text, model output, token-bearing arguments, URLs, git remotes, tracked files or ordinary diagnostics. App credentials SHALL go only to the verified business origin. Company API setup SHALL not receive or manage repository credentials. Owner, deployment, business-service, memory and verification credentials SHALL never substitute for employee connection. Employee sessions SHALL not be inherited by builds or unrelated commands.

#### Scenario: A redirect requests credential forwarding

- **WHEN** a setup response redirects a credential-bearing request to another destination
- **THEN** the helper refuses forwarding without exposing the credential

#### Scenario: Project command execution begins

- **WHEN** the connected assistant executes a build or unrelated business command
- **THEN** the command does not inherit the employee session used by selected company API operations

### Requirement: Current app grants govern business access everywhere

Current employee grants SHALL govern app lists, direct app visits, associated described and bare API routes, and assistant discovery/calls. Server authorization SHALL apply before business work, preserve stricter existing action and record checks, and deny unavailable or unmapped policy. Client state, existing login, cached descriptions and repository access SHALL grant no extra permission. The installation's verification service token SHALL keep every built app on previews and the live app, as before permissions started. On a preview it SHALL be able to open and save the employer's Access screens against the practice list; on the live app it SHALL never manage people. Acknowledged grant removal SHALL deny subsequent requests; work already admitted SHALL not be claimed undone.

#### Scenario: An employee calls a hidden app API

- **WHEN** an employee assigned Orders but not Payroll calls Payroll directly with a valid session
- **THEN** the server denies Payroll before business work while Orders remains available

#### Scenario: The verification machine checks a preview

- **WHEN** the verification service token opens an app page or calls its API on a preview after permissions have started
- **THEN** the request is allowed, and it can open the employer's Access screens and save a change to the practice list

#### Scenario: An assigned app is removed during a session

- **WHEN** app deselection is acknowledged and the employee sends their next request with the same valid session
- **THEN** that app's request is denied without needing logout or changing other app grants

#### Scenario: The verification machine tries to manage people on the live app

- **WHEN** the verification service token sends a people-management request to the live app
- **THEN** it is denied and nobody's access changes

### Requirement: Existing memory authority is preserved

Setup SHALL preserve the installed memory target, machine authority and private history. Fresh memory enrollment SHALL remain outside this employee connection; app login and repository access SHALL not create memory authority. Missing trusted operator setup SHALL be reported as not connected without affecting otherwise ready API access.

#### Scenario: A fresh computer has no memory grant

- **WHEN** the employee connects their API on a computer lacking trusted memory setup
- **THEN** API access reports its own readiness while memory remains not connected with trusted-owner setup guidance

### Requirement: App access removal reports actual login outcomes

Full removal SHALL deny company work immediately, withdraw managed app admission and revoke existing app sessions. Policy and session outcomes SHALL be reported separately, remain retryable and follow current desired membership. App removal SHALL NOT claim to revoke manually granted repository access, downloaded data or independently installed memory.

#### Scenario: Repository access was granted manually

- **WHEN** the employer removes a person's app access
- **THEN** company work is blocked and the app explains that repository access must be removed separately through its provider

#### Scenario: Full removal partly fails

- **WHEN** local removal commits but a provider policy or session revocation fails
- **THEN** new company work is denied and Access reports and retries unresolved provider outcomes without claiming full completion

### Requirement: People who could already sign in keep their apps

Per-app permissions SHALL start automatically at the employer's first Access visit and SHALL NOT reduce anyone's access. On the live app, every email already admitted by the recorded login policy SHALL first be recorded as a current person with every built app; if that import cannot complete, permissions SHALL stay off and everyone SHALL keep their existing access. Before permissions start, every signed-in person SHALL keep every app. After they start, unavailable permission data SHALL deny business work.

#### Scenario: Teammates existed before Access

- **WHEN** the employer first opens Access on a live app whose sign-in list already admits three other people
- **THEN** those three appear with every app selected and keep using every app until the employer changes them

#### Scenario: The existing sign-in list cannot be read

- **WHEN** the first visit cannot read the recorded login policy
- **THEN** permissions stay off, nobody loses an app, and Access reports the step left

### Requirement: Previews keep a practice list

On staging and previews the employer SHALL be able to open Access, add people and choose apps against the preview's own data. A preview SHALL hold no login-management credential, SHALL make no login-provider change, SHALL say that its list is for practice, and SHALL NOT read or change the live app's people.

#### Scenario: The employer tries Access on a preview

- **WHEN** the employer adds a person on a preview link
- **THEN** the person and their apps are saved in the preview's data, the screen says the real sign-in list is untouched, and the live app's people are unchanged

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer or a manager SHALL create, change, give or remove a role, a role SHALL never make its holder a manager, and giving a role SHALL NOT change who can sign in.

#### Scenario: The employer changes a role

- **WHEN** the employer removes an app from a role two people hold and saves
- **THEN** both people's next request to that app is denied, and a person with their own set is unaffected

#### Scenario: The employer removes a role people hold

- **WHEN** the employer removes a role that two people hold
- **THEN** each keeps the same apps and key levels as their own set

### Requirement: Access never loses an unsaved change silently

Access SHALL tell the employer plainly whether a save finished, where they land after it. When the employer leaves a person's, role's, app's or key's page with changes not yet saved, Access SHALL ask before the changes are dropped, and SHALL keep them when the employer chooses to stay.

#### Scenario: The employer leaves with unsaved changes

- **WHEN** the employer changes a level on a person's page and opens another view without saving
- **THEN** Access asks whether to leave, and staying keeps the change on the page

### Requirement: The employer chooses who else manages Access

The employer SHALL be able to make a current person a manager, and only the employer SHALL make or unmake one. A manager SHALL be able to do in Access what the employer can: add, change and remove people, create, change, give and remove roles, and set app grants and key levels, for any person, themselves and other managers included. A manager SHALL NOT make or unmake a manager, remove a manager, or change or remove the employer, and no screen SHALL change who the employer is. Being a manager SHALL give no app, no key level and no other employer authority by itself. Where the employer chooses a manager, Access SHALL say that a manager can give themselves any app or key level. A manager's authority SHALL be read on every request: once the employer unmakes or removes a manager, that person's next management request SHALL be refused, and a removed person added again SHALL NOT be a manager. On the live app the verification service token SHALL never be a manager.

#### Scenario: A manager adds a person

- **WHEN** a manager saves a new person's email with Orders access
- **THEN** that person is assigned Orders only and their sign-in status is reported, as it would be for the employer

#### Scenario: A manager tries to pick or remove a manager

- **WHEN** a manager sends a request that makes someone a manager, unmakes one, removes one, or changes the employer
- **THEN** it is denied and nobody's access or authority changes

### Requirement: Access lists line up and keep one frame

Each of Access's four views SHALL list its people, roles, apps or keys as rows that share the same columns, readable on a phone without sideways scrolling. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person, role, app or key included. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's page shows with the switch between the four views still in place

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row

### Requirement: The employer changes a person's role from the people list

The employer or a manager SHALL be able to give a current person a role, or their own set, from the people list without opening the person's page. The change SHALL be saved at once and govern the person's next request. Access SHALL then say what changed and offer to undo it, and undoing SHALL return the person to the role or own set they had, with the same apps and key levels. A role change that did not save SHALL be reported and SHALL leave the list showing what the person has.

#### Scenario: A role is picked in the list

- **WHEN** the employer picks Sales for a person who had their own set of two apps
- **THEN** the person has exactly what Sales gives on their next request, and Access says so and offers to undo it

#### Scenario: The employer undoes the change

- **WHEN** the employer undoes that change
- **THEN** the person again has their own set with the same two apps and the key levels they held before
