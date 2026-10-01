## MODIFIED Requirements

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs input only the person can give on the page (a captcha or picture puzzle, a passkey or device check, a single sign-on or other login with no password to save, a backup or recovery code, or any other such input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself, except that a password login with no saved or a rejected saved password SHALL follow the pre-filled password link requirement below, a one-time login code SHALL follow the login-code requirement below, API key or token website steps SHALL follow the own-browser requirement above, and a bot check or block that stops the agent's own browser SHALL first move the site to the cloud browser. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time. Before it opens a link, the agent SHALL ask in the chat whether the person is ready and SHALL open the link only after they reply, unless the person's latest message asked to take over.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

#### Scenario: The person is away when a login comes up

- **WHEN** a site asks for a login and the person has not replied for an hour
- **THEN** the agent asks in the chat whether they're ready, opens no link (the password link or a hand-over) until they reply, and the link's 10 minutes start from that reply

#### Scenario: A Cloudflare check in the agent's own browser

- **WHEN** a site shows a Cloudflare "Verify you are human" check in the agent's own browser
- **THEN** the agent moves the site to the cloud browser instead of sending a hand-over link

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When the site then asks for a one-time code or an app approval, the agent SHALL follow the login-code requirement. When the saved login is rejected, the agent SHALL send the password link with the site and that username filled in, so a new password replaces the old. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, with no hand-over

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and sends the password link with the site and username filled in, not a hand-over

## ADDED Requirements

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in, not a hand-over. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. Once the person saves and continues, the agent SHALL log in with the saved login and carry on.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box, fills only the username and password, and the agent logs in with them

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form
- **THEN** the agent hands the browser over instead of sending the password link

### Requirement: The agent gets a login code without a hand-over

When a login the agent submitted reaches a one-time code step, the agent SHALL get the code without a hand-over link: from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent. It SHALL enter the code itself. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT log in to email to fetch a code, and SHALL NOT ask for a backup or recovery code in the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link. A code the person types during a hand-over stays in the hand-over.

#### Scenario: A code sent by text

- **WHEN** the agent logs in with a saved password and the site texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no hand-over link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is logged out of that email
- **THEN** the agent asks for the code in the chat and does not try to log in to the email
