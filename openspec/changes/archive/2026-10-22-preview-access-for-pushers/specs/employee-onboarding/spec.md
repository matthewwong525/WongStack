## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Previews keep a practice list

On staging and previews the employer SHALL be able to open Access, add people and choose apps against the preview's own data. A preview SHALL hold no login-management credential, SHALL make no login-provider change, SHALL say that its list is for practice, and SHALL NOT read or change the live app's people. A signed-in person whom the practice list does not name SHALL get every app and every key on a preview, and SHALL manage nothing there; a person the practice list names SHALL get what it gives them.

#### Scenario: The employer tries Access on a preview

- **WHEN** the employer adds a person on a preview link
- **THEN** the person and their apps are saved in the preview's data, the screen says the real sign-in list is untouched, and the live app's people are unchanged

#### Scenario: A pusher signs in to a preview

- **WHEN** someone the preview's sign-in admits, and the practice list does not name, opens a preview
- **THEN** every app opens for them, and Access shows them only their own apps, with nothing to manage
