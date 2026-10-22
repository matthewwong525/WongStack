# Employee onboarding

## Purpose

Let employees connect an assistant from an existing business app using their app identity, with employer-managed app/API permissions. Repository access and authentication remain manual and independent.

## Requirements

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

Published setup SHALL support an empty folder and supported remote workspace through a setup file the business app itself serves. Setup SHALL work in the folder the assistant runs it in unless another is named: it SHALL install the project only into an empty or new folder, SHALL update the read-only copy it finds there, SHALL leave any other copy of the project as it is, and SHALL stop without changing a folder that holds other files. An employee without Project code, where the apps-only connection still applies, SHALL obtain a usable company API client without the project. Setup SHALL NOT hand a device a repository credential, register a repository integration or change the device's own repository authentication. Setup SHALL preserve dirty work, conflicting local folders and unpushed commits, and an update SHALL never discard a person's local changes; interrupted setup SHALL resume against the same target. A downloaded setup file SHALL remove itself when it finishes. API readiness SHALL require actual authorized connection evidence, and the project SHALL be reported installed only after it is on the device.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps, on an app that can not hand its project out, pastes the setup message into their assistant
- **THEN** the assistant can run setup and call their approved company actions without needing access to the private project source

#### Scenario: Setup runs in an empty folder

- **WHEN** a person who holds Project code has their assistant run the setup file in an empty folder
- **THEN** the project is installed in that folder, and the setup file is no longer there

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

#### Scenario: The folder holds another copy of the project

- **WHEN** setup runs in a copy of the project that came from where the project is kept, not from the app
- **THEN** the person is signed in, the copy is left as it is, and nothing says the project is not included for them

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

### Requirement: App access removal reports actual login outcomes

Full removal SHALL deny company work immediately, withdraw managed app admission, revoke existing app sessions and refuse further project downloads. Policy and session outcomes SHALL be reported separately, remain retryable and follow current desired membership. App removal SHALL NOT claim to remove a copy already on a device, repository access granted by hand, downloaded data or independently installed memory, and Access SHALL say so when a person is removed.

#### Scenario: Repository access was granted manually

- **WHEN** the employer removes a person's app access
- **THEN** company work and project downloads are blocked, and the app explains that a copy on their device stays and that access granted where the project is kept must be removed there

#### Scenario: Full removal partly fails

- **WHEN** local removal commits but a provider policy or session revocation fails
- **THEN** new company work is denied and Access reports and retries unresolved provider outcomes without claiming full completion

### Requirement: People who could already sign in keep their apps

Per-app permissions SHALL start automatically at the employer's first Access visit and SHALL NOT reduce anyone's access. On the live app, every email already admitted by the recorded login policy SHALL first be recorded as a current person with every built app; if that import cannot complete, permissions SHALL stay off and everyone SHALL keep their existing access. Before permissions start, every signed-in person SHALL keep every app, except a person the employer or a manager has removed: that person SHALL be denied company work and memory from their next request, as after permissions start. After they start, unavailable permission data SHALL deny business work.

#### Scenario: Teammates existed before Access

- **WHEN** the employer first opens Access on a live app whose sign-in list already admits three other people
- **THEN** those three appear with every app selected and keep using every app until the employer changes them

#### Scenario: The existing sign-in list cannot be read

- **WHEN** the first visit cannot read the recorded login policy
- **THEN** permissions stay off, nobody loses an app, and Access reports the step left

#### Scenario: A person is removed before permissions start

- **WHEN** permissions have not started on the live app and the employer removes a person who can still sign in
- **THEN** that person's next app page, app request and memory request are refused, while every other signed-in person keeps every app

### Requirement: Previews keep a practice list

On staging and previews the employer SHALL be able to open Access, add people and choose apps against the preview's own data. A preview SHALL hold no login-management credential, SHALL make no login-provider change, SHALL say that its list is for practice, and SHALL NOT read or change the live app's people. A signed-in person whom the practice list does not name SHALL get every app and every key on a preview, and SHALL manage nothing there; a person the practice list names SHALL get what it gives them.

#### Scenario: The employer tries Access on a preview

- **WHEN** the employer adds a person on a preview link
- **THEN** the person and their apps are saved in the preview's data, the screen says the real sign-in list is untouched, and the live app's people are unchanged

#### Scenario: A pusher signs in to a preview

- **WHEN** someone the preview's sign-in admits, and the practice list does not name, opens a preview
- **THEN** every app opens for them, and Access shows them only their own apps, with nothing to manage

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer or a manager SHALL create, change, give or remove a role, no role but the built-in Admin SHALL let its holder manage Access, no role SHALL take the name Admin, and giving a role SHALL NOT change who can sign in.

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

### Requirement: Access lists line up and keep one frame

Access SHALL have two views, People and Roles, each listing its rows with the same columns, each row one line on a computer, readable on a phone without sideways scrolling. Apps and key levels SHALL be set only where a person or a role is opened. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed. Opening a person or a role SHALL show it with its list still in place, at an address that opens it again, and closing it SHALL return to the list. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person or role included. A removal and leaving with unsaved changes SHALL ask in the same way.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's fields show with the people list and the switch between the two views still in place, and closing them shows the list as it was

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row

### Requirement: The employer changes a person's role from the people list

The employer or a manager SHALL be able to give a current person a role, or their own set, from the people list without opening the person's page. The change SHALL be saved at once and govern the person's next request, except that picking Admin SHALL ask first and SHALL be offered to the employer alone. Access SHALL then say what changed and offer to undo it, and undoing SHALL return the person to the role or own set they had, with the same apps and key levels. A role change that did not save SHALL be reported and SHALL leave the list showing what the person has.

#### Scenario: A role is picked in the list

- **WHEN** the employer picks Sales for a person who had their own set of two apps
- **THEN** the person has exactly what Sales gives on their next request, and Access says so and offers to undo it

#### Scenario: The employer undoes the change

- **WHEN** the employer undoes that change
- **THEN** the person again has their own set with the same two apps and the key levels they held before

### Requirement: Connecting an assistant is numbered steps from one place

The app SHALL offer Connect your assistant from one place, the home page's list, and no other screen SHALL carry a second copy of the steps. The steps SHALL be numbered, SHALL open with having an AI assistant on the person's computer, with install links for more than one assistant named as examples, not requirements, and SHALL say what an assistant is, who the person signs in as and which apps the connection reaches, and SHALL say what the person can do once connected. When the steps can not be loaded, the app SHALL say so and offer to try again, and SHALL NOT tell a signed-in person to sign in. When there is nothing to copy, because the person lacks Project code, the app SHALL say what to do next and offer nothing to copy.

#### Scenario: A person follows the steps

- **WHEN** a signed-in person opens Connect your assistant from the home page
- **THEN** they see numbered steps that start with having an assistant, with install links, then copying their setup message, name their own email and their apps, and end with what to ask their assistant

#### Scenario: The steps can't load

- **WHEN** the setup steps fail to load for a signed-in person
- **THEN** the popup says the steps couldn't load and offers to try again, with no instruction to sign in

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. A push from the copy SHALL NOT publish: the app SHALL refuse every push that would change the published project and say that a push saves a change and that publishing is its own step. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person, with or without the publish tick, pushes to the published branch at the address their copy came from
- **THEN** it is refused before anything is asked of where the project is kept, nothing in the project changes, and the message says a push saves a change and publishing is its own step

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

Where a person's own set or a role is opened, Access SHALL show the apps as choices to give or not, the saved keys each with its level, and Project code as its install and publish ticks, and SHALL change nothing for the person before the employer saves. Access SHALL not mark a person, a role or an app as lacking a key level. The People and Roles lists SHALL say how many apps and keys each person and role has. A signed-in person who manages nothing SHALL see their own apps and key levels.

#### Scenario: The employer gives an app

- **WHEN** the employer opens a person, gives them Orders and saves
- **THEN** the person holds Orders, their key levels are unchanged, and no row is marked as missing anything

#### Scenario: The employer leaves without saving

- **WHEN** the employer gives an app and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged

### Requirement: Setup shows the sign-in link at once

When assistant setup needs the person to sign in, the copied setup prompt and the setup tool's own output SHALL both tell the assistant to show the person the sign-in link as soon as it is printed and to wait for them. Only a link checked to be this business's own sign-in address SHALL be passed on, and the tool SHALL say beside it that it is safe to show. No credential and no other sign-in output SHALL be shown.

#### Scenario: The assistant runs setup where it can open no browser

- **WHEN** an assistant runs the setup step and the tool prints the sign-in link
- **THEN** the person sees the link in the chat without asking for it, and the assistant waits while they sign in

#### Scenario: The sign-in prints something that is not this business's sign-in address

- **WHEN** the sign-in output carries another address or a credential
- **THEN** it is not passed on and nothing tells the assistant to show it

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

### Requirement: One setup message serves everyone who may connect

The app SHALL give every person who may connect the same short setup message, whether or not they hold Project code. The message SHALL name the business, say in one line what the file does, invite the assistant to read the file before running it, name one download link, tell the assistant to print the sign-in link into the chat and wait, and ask for a report of what works. It SHALL carry no key, no fingerprint to check and no instruction about where to store files. What a person receives SHALL be decided by setup against their access at that moment, never by the wording of the message.

#### Scenario: Two people with different access copy the message

- **WHEN** a person who holds Project code and a person on an apps-only connection each open Connect your assistant
- **THEN** they see the same message

#### Scenario: A person without Project code runs a message meant for anyone

- **WHEN** a person who lacks Project code runs the setup file from a message someone else copied
- **THEN** setup refuses the project for them and says to ask their admin

#### Scenario: A careful assistant reads the message

- **WHEN** an assistant is given the message pasted with nothing else
- **THEN** it can tell whose file it is and what it does, reads it, and runs it without a second request

### Requirement: The app serves the setup file at a fixed public link

The live app SHALL serve the setup file at one fixed address under its own, the same for every person and every time, with no sign-in. The served file SHALL carry the address of the app that served it and SHALL carry no key, session or other secret; everything it does for a person SHALL still need that person's own sign-in. The link SHALL need no change to an installation's sign-in rules.

#### Scenario: An assistant fetches the file with no sign-in

- **WHEN** an assistant fetches the link from the live app with no sign-in
- **THEN** it receives the setup file, which sets up against that app with no address typed

#### Scenario: Someone with no account runs the file

- **WHEN** a person who can not sign in to the app runs the setup file
- **THEN** setup stops at sign-in, and nothing of the project or the apps reaches them

### Requirement: A person who holds Project code sends their work up through the app

A signed-in person who currently holds Project code SHALL be able to send a change from their installed copy up through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL then give back that change's checks, the output of a check that failed, and its preview, for the exact commit sent. Each such request SHALL be judged against the person's access at that moment, and a machine SHALL be refused on the live app.

The app SHALL accept one change at a time through a push and nothing else: it SHALL refuse, before anything is asked of where the project is kept, a push that would move the published project, delete anything, or touch anything that is not a change. Publishing SHALL happen only through the separate publish request. Where the project is kept on GitHub, the change SHALL be opened or updated there for the employer to review, and SHALL say who saved it. The credential the app uses to save SHALL never reach a device, a prompt, a response body or a log.

#### Scenario: A teammate saves with no GitHub account

- **WHEN** a person who holds Project code saves work from a copy installed through Connect, on a device with no GitHub account and no GitHub tool
- **THEN** the change is where the project is kept, its checks ran for that commit, and the person's assistant has their result and the preview

#### Scenario: Project code is taken away before a save

- **WHEN** the employer unticks Project code for a person, who then saves from the copy on their device
- **THEN** the save is refused with ask-your-admin guidance and nothing reaches where the project is kept

### Requirement: Setup ends with memory and project updates working

Setup SHALL leave the person's copy with memory, plain git and the project's own company tools working through the same sign-in, with no option to pass. Its final report SHALL say in plain words who is signed in, which apps work, that memory and updates work, and that nothing else is needed, and SHALL say *nothing else is needed* only after the copy's own tools find the saved sign-in. When setup reused a sign-in this computer already held, the report SHALL say so and name its email. The report SHALL NOT tell the assistant to run a further command, and SHALL NOT mention an environment file or a key.

#### Scenario: A teammate finishes setup

- **WHEN** a teammate with Project code finishes setup in an empty folder
- **THEN** the report says they are done, memory loads in their next chat, and a new worktree starts from the newest version

#### Scenario: The project's tools right after setup

- **WHEN** setup has downloaded the project and the person runs the project's own status, list or call command in it with no extra option
- **THEN** the command uses the sign-in setup saved

#### Scenario: A computer already signed in

- **WHEN** setup runs on a computer that already holds a valid sign-in to the business
- **THEN** no sign-in link is shown, and the report says it used this computer's existing sign-in and names its email

### Requirement: A person allowed to publish publishes through the app

A signed-in person who currently holds Project code's publish level SHALL be able to publish a change they or a teammate saved, through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL publish only a change whose checks all passed for its newest commit, SHALL judge each request against the person's access at that moment, and SHALL say who published it. A person without the publish level SHALL be refused with ask-your-admin guidance, and their assistant SHALL end with *saved, and here is who publishes it*. A machine SHALL be refused on the live app.

#### Scenario: A teammate with the tick ships

- **WHEN** Ana, who holds the publish tick, runs `/ship` from her copy with no GitHub account and the change's checks pass
- **THEN** the change is live, the project records Ana as its publisher, and her copy moves to the published version

#### Scenario: The checks have not passed

- **WHEN** a person with the publish tick asks to publish a change whose newest commit has a failing or unfinished check
- **THEN** nothing is published and the reply names the check

### Requirement: Giving a person the project offers a message to send

When the employer or an Admin saves a person and the save newly lets that person install the project, whether they are new or already listed and whether by their own set or a role, the app SHALL open a popup with a message to copy and send them. The message SHALL be written so the person can paste it straight into their own assistant: it SHALL name the app's address and the email they sign in with, say to install an assistant if they have none, naming more than one as examples, and carry the one setup message unchanged. It SHALL carry no key and SHALL send nothing by itself. A save that gives no new project access SHALL open no popup. A person's own Project tick, while ticked on a saved person, SHALL offer the same message folded under it.

#### Scenario: The owner gives a teammate the project

- **WHEN** the owner saves ann@example.com with Can install the project newly ticked
- **THEN** a popup offers a message to copy that names the app's address and ann@example.com, says to install an assistant if needed, and carries the setup message, and nothing is sent

#### Scenario: A save that gives no project

- **WHEN** the owner adds a person with apps but no Project code
- **THEN** the save says Saved. and no popup opens

### Requirement: People who can push on GitHub can open previews

On a project kept on GitHub, the live app SHALL read, at least every 15 minutes, who has push rights on the repository, using the GitHub key it already holds, and SHALL give each such person sign-in to previews alone. A pusher's email SHALL come from the owner when the owner has typed one, else from an address GitHub has verified as theirs: their public profile email, or the author email of their own commits in the project, never a GitHub no-reply address. Access SHALL list every pusher with their email and whether they can open previews, and SHALL let the owner or an Admin type the email of a pusher with none. A person who loses push rights SHALL leave the previews list, unless they are a person in Access, and their preview sessions SHALL end. A failed read from GitHub SHALL change nobody's sign-in. A project kept in Cloudflare, or one with no GitHub key, SHALL change nothing, and Access SHALL say why no pushers are listed. A preview SHALL NOT read GitHub or change a sign-in list.

#### Scenario: A collaborator added on GitHub opens a preview

- **WHEN** the owner gives someone write access on GitHub and their commits carry a verified email
- **THEN** within 15 minutes they can sign in to a preview with that email, and the live app still refuses them

#### Scenario: A pusher with no email GitHub shares

- **WHEN** a pusher has no public email and no commit email in the project
- **THEN** Access lists them as needing an email, and once the owner types it, they can sign in to previews

#### Scenario: Push rights are taken away

- **WHEN** the owner removes a pusher's write access on GitHub
- **THEN** within 15 minutes their email leaves the previews list and their open preview sessions end, while people in Access keep both
