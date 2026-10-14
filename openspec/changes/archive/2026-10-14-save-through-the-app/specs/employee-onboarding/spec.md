# Spec Delta

## MODIFIED Requirements

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. The copy SHALL NOT publish: the app SHALL refuse every attempt to change the published project through it and say that it saves changes and never publishes. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person pushes to the published branch at the address their copy came from
- **THEN** it is refused before anything is asked of where the project is kept, nothing in the project changes, and the message says the app saves changes and never publishes

## ADDED Requirements

### Requirement: A person who holds Project code sends their work up through the app

A signed-in person who currently holds Project code SHALL be able to send a change from their installed copy up through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL then give back that change's checks, the output of a check that failed, and its preview, for the exact commit sent. Each such request SHALL be judged against the person's access at that moment, and a machine SHALL be refused on the live app.

The app SHALL accept one change at a time and nothing else: it SHALL refuse, before anything is asked of where the project is kept, a request that would move the published project, delete anything, or touch anything that is not a change. Where the project is kept on GitHub, the change SHALL be opened or updated there for the employer to review, and SHALL say who saved it. The credential the app uses to save SHALL never reach a device, a prompt, a response body or a log.

#### Scenario: A teammate saves with no GitHub account

- **WHEN** a person who holds Project code saves work from a copy installed through Connect, on a device with no GitHub account and no GitHub tool
- **THEN** the change is where the project is kept, its checks ran for that commit, and the person's assistant has their result and the preview

#### Scenario: Project code is taken away before a save

- **WHEN** the employer unticks Project code for a person, who then saves from the copy on their device
- **THEN** the save is refused with ask-your-admin guidance and nothing reaches where the project is kept
