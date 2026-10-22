## MODIFIED Requirements

### Requirement: Previews have their own sign-in

The live app and staging with its previews SHALL each be protected by their own Access application, with their own audience and their own verification service token. A sign-in or machine assertion issued for staging or a preview SHALL NOT authenticate on the live app, on any route, including the routes the Worker checks itself. The previews application SHALL admit everyone the live application admits, plus the project's GitHub pushers who have a known email; it SHALL NOT admit anyone else. Adding or removing a person through the live app SHALL update both sign-in lists, and a change in who can push SHALL update the previews list alone; each update SHALL leave each application's machine policy intact. Setup SHALL create both applications on a new install. The Access step SHALL split an existing shared application without changing who can sign in or how: the live application SHALL keep its login methods, and the previews application SHALL get the same ones. The deploy gate SHALL refuse a staging or preview deploy while the two environments share an application or audience, naming the Access step. It SHALL still let the live app publish, with a warning.

#### Scenario: A sign-in copied on a preview

- **WHEN** code running on a preview records a visitor's sign-in and sends it to the live app's memory or git route
- **THEN** the live app refuses it as signed out, while the same person's own live-app sign-in still works

#### Scenario: An install that still shares one sign-in

- **WHEN** an updated install whose two environments still share an Access application pushes a branch
- **THEN** the preview deploy stops and names the Access step, and a publish to the live app still goes through

#### Scenario: A pusher is on the previews list alone

- **WHEN** a GitHub pusher who is not a person in Access has a known email
- **THEN** the previews sign-in list holds that email and the live app's list does not
