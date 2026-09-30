# Spec Delta

## MODIFIED Requirements

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs the person (a login, a captcha, a code, or any other input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself, except that API key or token website steps SHALL follow the own-browser requirement above, and a bot check or block that stops the agent's own browser SHALL first move the site to the cloud browser. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time. Before it opens a link, the agent SHALL ask in the chat whether the person is ready and SHALL open the link only after they reply, unless the person's latest message asked to take over.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

#### Scenario: The person is away when a login comes up

- **WHEN** a site asks for a login and the person has not replied for an hour
- **THEN** the agent asks in the chat whether they're ready to log in, opens no link until they reply, and the link's 10 minutes start from that reply

#### Scenario: A Cloudflare check in the agent's own browser

- **WHEN** a site shows a Cloudflare "Verify you are human" check in the agent's own browser
- **THEN** the agent moves the site to the cloud browser instead of sending a hand-over link

## ADDED Requirements

### Requirement: A site that blocks the agent's browser moves to the cloud browser

When a site shows a bot check the agent's own browser can't pass, or refuses it, the agent SHALL carry on in Cloudflare's cloud browser, saying so in one line in the chat, without retrying in its own browser. When the cloud browser is refused too, the agent SHALL stop browsing that site and give the person its link and the steps to do on their own device. Hand-overs SHALL work in whichever browser the task uses.

#### Scenario: An order page behind a check

- **WHEN** the agent's own browser stays on a "Verify you are human" page for a restaurant's Uber Eats store
- **THEN** the chat says the site blocked the agent's browser, and the store's menu opens in the cloud browser with no tap from the person

#### Scenario: Both browsers are refused

- **WHEN** a DoorDash store refuses both browsers
- **THEN** the agent sends no hand-over link and gives the store's link and the steps for the person's phone

### Requirement: A site's login carries over between the browsers

Before a site moves to the cloud browser, the agent SHALL copy only that site's login from its own browser into the cloud browser, and after the task SHALL copy any refreshed login for that site back. It SHALL NOT copy another site's login, or any cookie a bot check issued, and SHALL keep no copy after the switch. When the copied login is rejected, the agent SHALL use a saved login or hand the browser over, as for any login.

#### Scenario: An order from a logged-in account

- **WHEN** the person is logged in to Uber Eats in the agent's browser and the Uber Eats store moves to the cloud browser
- **THEN** the cloud browser opens the store logged in, and no other site's login and no check's pass cookie is in it

#### Scenario: A login tied to one device

- **WHEN** a site rejects the copied login and asks for a code
- **THEN** the agent asks whether the person is ready and hands over the cloud browser

### Requirement: The agent never disguises its browser

The agent SHALL NOT hide that its browser is automated, change the browser's identity to pass a check, send its traffic through another person's or a hired network address, use a check-solving service, or move a check's pass from one browser to another. This SHALL hold even when the person asks, including when the person does the tapping.

#### Scenario: The person offers to tap the check

- **WHEN** the person asks the agent to turn off its automated flag so their hand-over tap passes a check
- **THEN** the agent declines and offers the cloud browser or the step on the person's own device

### Requirement: One setting picks the first browser

A machine-wide setting SHALL choose which browser a task tries first: the agent's own browser by default, or the cloud browser. The other browser SHALL remain the fallback.

#### Scenario: The person flips the default

- **WHEN** the person asks to use the cloud browser first
- **THEN** later tasks open sites in the cloud browser first, and a site that refuses it moves to the agent's own browser

### Requirement: A cloud browser session ends with its task

A cloud browser session SHALL close when its task finishes or fails, and SHALL close by itself after a bounded time even if the agent's session ends. When the account's cloud browser allowance is used up, the agent SHALL say so plainly and give the person the step to do on their own device.

#### Scenario: The chat stops mid-task

- **WHEN** the agent's session ends while a cloud browser session is open
- **THEN** the cloud browser session closes by itself within its time bound

#### Scenario: The daily allowance runs out

- **WHEN** a free-plan account has used its daily cloud browser minutes
- **THEN** the agent names the limit in plain words and gives the person the site's link and steps
