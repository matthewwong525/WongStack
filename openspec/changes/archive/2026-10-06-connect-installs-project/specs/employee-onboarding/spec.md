# Spec Delta

## ADDED Requirements

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. The copy SHALL be read-only: the app SHALL refuse every attempt to publish through it and say how publishing is granted. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person pushes a change to the address their copy came from
- **THEN** it is refused, nothing in the project changes, and the message says the employer grants publishing where the project is kept

## MODIFIED Requirements

### Requirement: The business app is the employee setup entry point

A signed-in person who may connect SHALL receive a copyable assistant setup prompt and their own connection status after signing into the existing protected business app. Once the installation can hand its project out, the people who may connect SHALL be those who currently hold Project code; before that, and before key levels start, every signed-in person SHALL keep the prompt. A person who may not connect SHALL be told to ask their admin and SHALL receive no prompt. The prompt SHALL contain nonsecret routing and instructions only, SHALL remain manually copyable after clipboard failure, and SHALL perform no work or grant access when copied. Employees SHALL require no Cloudflare administration account or repository identity to connect or to receive the project. Expired or new-device sessions SHALL use the same employee app identity for renewed approval.

#### Scenario: Employee copies setup instructions

- **WHEN** a current employee who may connect copies the setup prompt from the app
- **THEN** the page confirms copying and the prompt identifies this business and its published setup instructions without including any credential

#### Scenario: A new computer needs approval

- **WHEN** the assistant has no valid employee session on that computer
- **THEN** setup requests approval through the same business login rather than asking for a provider token or separate employee GitHub account

#### Scenario: A person without Project code asks for the prompt

- **WHEN** the installation can hand its project out and a person who lacks Project code opens their setup
- **THEN** no prompt is returned and they are told to ask their admin for access

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer and the managers the employer chose SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive the project only when given Project code; app login alone SHALL grant no project copy and no authority to publish. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only, holds no Project code, and the owner sees the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a verified reviewed bootstrap artifact. An employee without Project code, where the apps-only connection still applies, SHALL obtain a usable company API client without the project. Setup SHALL NOT hand a device a repository credential, register a repository integration or change the device's own repository authentication. Setup SHALL install the project only into an empty or new folder, SHALL preserve dirty work, conflicting local folders and unpushed commits, and an update SHALL never discard a person's local changes; interrupted setup SHALL resume against the same target. API readiness SHALL require actual authorized connection evidence, and the project SHALL be reported installed only after it is on the device.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps pastes an apps-only setup prompt into their assistant
- **THEN** the assistant can bootstrap and call their approved company actions without needing access to the private project source

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

#### Scenario: An update meets local changes

- **WHEN** a person who changed files in their copy runs the update
- **THEN** their changes are kept, and they are told when the update could not be applied on top of them

### Requirement: Connections remain private and destination bound

Employee sessions SHALL remain in private OS-user state outside checkouts and SHALL not appear in prompt text, model output, token-bearing arguments, URLs, git remotes, tracked files or ordinary diagnostics. App credentials SHALL go only to the verified business origin, including when the project is downloaded. The device SHALL receive no repository credential. Owner, deployment, business-service, memory and verification credentials SHALL never substitute for employee connection. Employee sessions SHALL not be inherited by builds or unrelated commands.

#### Scenario: A redirect requests credential forwarding

- **WHEN** a setup response redirects a credential-bearing request to another destination
- **THEN** the helper refuses forwarding without exposing the credential

#### Scenario: Project command execution begins

- **WHEN** the connected assistant executes a build or unrelated business command
- **THEN** the command does not inherit the employee session used by selected company API operations

### Requirement: App access removal reports actual login outcomes

Full removal SHALL deny company work immediately, withdraw managed app admission, revoke existing app sessions and refuse further project downloads. Policy and session outcomes SHALL be reported separately, remain retryable and follow current desired membership. App removal SHALL NOT claim to remove a copy already on a device, repository access granted by hand, downloaded data or independently installed memory, and Access SHALL say so when a person is removed.

#### Scenario: Repository access was granted manually

- **WHEN** the employer removes a person's app access
- **THEN** company work and project downloads are blocked, and the app explains that a copy on their device stays and that access granted where the project is kept must be removed there

#### Scenario: Full removal partly fails

- **WHEN** local removal commits but a provider policy or session revocation fails
- **THEN** new company work is denied and Access reports and retries unresolved provider outcomes without claiming full completion
