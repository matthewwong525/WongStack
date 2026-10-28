## ADDED Requirements

### Requirement: Boxes in a frame from another site name their site

The page text SHALL include the boxes of a frame from another site with their refs, and SHALL say on its first line that frame boxes follow, naming each such frame and its site. Each frame's header SHALL name the frame's site, or say the site is unknown.

#### Scenario: A sign-in box in another site's frame

- **WHEN** the agent reads a page on `shop.example.com` whose sign-in box is a frame from `login.example.com`
- **THEN** the first line says frame boxes are at the end and names `login.example.com`, and the frame's header names `login.example.com` above the email box and its ref

#### Scenario: A page with no frame boxes

- **WHEN** the page has no frame with boxes
- **THEN** the page text has no frame note

### Requirement: A login reports a next step apart from a wrong password

After a password, a login SHALL report `accepted` when the page's address leaves the login page, `next-step` when it stays but the password box is gone, and `rejected` when it stays and the password box is still there.

#### Scenario: A code page after the password

- **WHEN** the page stays on the same address after the password and shows a code page with no password box
- **THEN** the login reports `next-step`, not `rejected`

#### Scenario: A wrong password

- **WHEN** the page stays on the same address and still shows the password box
- **THEN** the login reports `rejected`

### Requirement: A selector that can not read the page says why

A command given a selector the page can not read SHALL fail with a plain reason: a selector reads only the main page, and a box in a frame needs its ref. It SHALL NOT fail with a code error.

#### Scenario: A frame selector

- **WHEN** the agent runs `get count` with a selector that names a box inside a frame
- **THEN** the command fails with that plain reason

## MODIFIED Requirements

### Requirement: A saved login is typed only on its saved site

The browser SHALL type a saved login's username or password only while the tab's page is on that login's saved host: the same host, `www.` dropped, or one sitting under the other. For a box in a frame, the frame's own site SHALL match the same way; a frame whose site can not be read SHALL count as another site. It SHALL check right before each value it types, so a page that moves to another site between the username and the password gets no password. On any other host it SHALL type nothing, submit nothing, and report `wrong-site`; the agent SHALL then treat the page as having no saved login.

#### Scenario: A look-alike site

- **WHEN** a login is saved for `bank.example` and the agent runs it on a page at `bank.example.attacker.example`
- **THEN** the browser reports `wrong-site`, and neither the username nor the password is typed

#### Scenario: The page moves after the email step

- **WHEN** the username is typed on the saved site and the page is on another host before the password is typed
- **THEN** the browser reports `wrong-site`, and the password is not typed

#### Scenario: A box in the login site's own frame

- **WHEN** a login is saved for `example.com` and its box is in a frame from `login.example.com` on a `shop.example.com` page
- **THEN** the browser types into the box

#### Scenario: A box in another site's frame

- **WHEN** the page is on the login's site but the password box is in a frame from another site, or from a site that can not be read
- **THEN** nothing is typed and the browser reports `wrong-site`

### Requirement: A page reading never shows what a secret box holds

Every way the agent reads a page's text SHALL show a filled secret box only as filled, never its contents. A box SHALL count as secret when it is a password box, when its label or kind names a password, passcode, PIN, card number, card expiry, security code, or one-time code, or when the agent's saved-login step typed a password into it, in the page or in any frame, even after the site switches it to plain text. The browser SHALL NOT keep a typed password in plain text or in a form that can be guessed back without the browser's private key. An empty secret box, a dropdown's picked choice, and every other box SHALL read as before.

#### Scenario: A rejected login leaves the password typed

- **WHEN** a saved login is rejected and the agent reads the login page, with the password still in its box
- **THEN** the reading shows the password box as filled and hidden, and shows the username as typed

#### Scenario: A card box the private form filled

- **WHEN** the agent reads a checkout page whose card number box still holds the number the person sent through the private form
- **THEN** that box reads as filled and hidden, by the page reading and by asking for that one box's contents

#### Scenario: A frame shows the typed password as text

- **WHEN** a login typed a password into a frame from another site, and the site then shows the box's value as text
- **THEN** the page text shows `[hidden]` for that box
