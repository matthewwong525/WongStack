## ADDED Requirements

### Requirement: Personal browsing uses one browser session

Personal browsing with the saved profile SHALL run in the session `AGENT_BROWSER_SESSION` already names, else agent-browser's `default` session. The agent SHALL NOT start a new named session on the saved profile, even when the installed tool's guide advises one per task, because only one browser can open the profile. A new session SHALL use its own temporary profile.

#### Scenario: The guide advises a session per task

- **WHEN** the agent loads agent-browser's guide, which says to start a named session for each task, and then browses with the person's logins
- **THEN** it runs its commands in the session already named, or `default`, and never starts a second browser on the saved profile

#### Scenario: A session with its own profile

- **WHEN** a preview check or a practice run needs a separate browser
- **THEN** it starts a named session with a temporary profile, never the saved one

### Requirement: Changes to a website go through the browser

The agent SHALL change a website, such as adding to a cart, sending a form, posting, or paying, only through agent-browser, never with `curl` or a fetch tool, so the person sees pictures and the login, check, and confirmation rules apply. Research and plain reads MAY use a direct request.

#### Scenario: A price question

- **WHEN** the person asks what something costs on a site
- **THEN** the agent may read the price with a direct request, and changes nothing on the site

#### Scenario: A cart to fill

- **WHEN** an errand needs items in a site's cart
- **THEN** the agent adds them in the browser, never with a direct POST

### Requirement: A hand-over stays open for a step only the person can give

Reaching a named finish page SHALL always close the link, even when that page has card or code fields. Once a finish named only as a box going away is met, the link SHALL stay open while the page then showing asks for a step only the person can give: a password, a one-time or verification code, card details, or an embedded payment frame. It SHALL close when the page asks for none of these, such as a logged-in page with only a search box. To tell them apart it SHALL read only the kinds, names, and labels of the page's fields and the titles, names, and hosts of its embedded frames, never a value. The 10-minute limit and the person's *done* SHALL end it as before.

#### Scenario: A code step after the password

- **WHEN** the finish is the password box going away, and the next page asks for a texted code
- **THEN** the link stays open until the code is entered and the page moves on

#### Scenario: A bank code after the card

- **WHEN** the finish is the card box going away, and the bank's page asks for a code
- **THEN** the person enters the code through the same link

#### Scenario: A named finish page with a card box

- **WHEN** a login link names the checkout page as its finish, and that page has a card box
- **THEN** the link closes on reaching the checkout, so the agent can show the page before the person pays

#### Scenario: A logged-in page with a search box

- **WHEN** the finish is met on a page whose only field is a search box
- **THEN** the link closes and the agent gets the browser back

### Requirement: The agent checks a page before calling it blocked

Before the agent calls a page blocked or a bot check, it SHALL run the cloud browser's `check` on it, even when a picture shows the check plainly, because the answer decides whether to switch browsers.

#### Scenario: A page that shows a human check

- **WHEN** the agent's browser lands on a *Verify you are human* page
- **THEN** the agent runs `check` before telling the person or switching browsers
