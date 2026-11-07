# Spec Delta

## MODIFIED Requirements

### Requirement: People who could already sign in keep their apps

Per-app permissions SHALL start automatically at the employer's first Access visit and SHALL NOT reduce anyone's access. On the live app, every email already admitted by the recorded login policy SHALL first be recorded as a current person with every built app; a policy that carries no session duration SHALL import the same as one that does. If that import cannot complete, permissions SHALL stay off, everyone SHALL keep their existing access, the app SHALL log the reason, and Access SHALL show the employer why. Before permissions start, every signed-in person SHALL keep every app, except a person the employer or a manager has removed: that person SHALL be denied company work and memory from their next request, as after permissions start. After they start, unavailable permission data SHALL deny business work.

#### Scenario: Teammates existed before Access

- **WHEN** the employer first opens Access on a live app whose sign-in list already admits three other people
- **THEN** those three appear with every app selected and keep using every app until the employer changes them

#### Scenario: The sign-in rule has no session duration

- **WHEN** the employer first opens Access and Cloudflare returns the recorded login policy without a session duration
- **THEN** permissions start, and a later sign-in list change sends the new list without adding a session duration

#### Scenario: The existing sign-in list cannot be read

- **WHEN** the first visit cannot read the recorded login policy
- **THEN** permissions stay off, nobody loses an app, the app logs the reason, and Access reports the step left and why

#### Scenario: A person is removed before permissions start

- **WHEN** permissions have not started on the live app and the employer removes a person who can still sign in
- **THEN** that person's next app page, app request and memory request are refused, while every other signed-in person keeps every app
