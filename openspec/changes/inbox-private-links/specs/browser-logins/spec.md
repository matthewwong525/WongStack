## MODIFIED Requirements

### Requirement: Every private link goes through Cloudflare and closes itself
A password link, a key link, and a private form SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. Each link SHALL default to a 24-hour time limit from opening and SHALL honor an explicit time override. A link SHALL stop working on successful completion, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again. When the computer can reach the person's inbox, every private link, a live view included, SHALL also be listed there while it is open, with its title, kind, closing time and address only; nothing typed into it SHALL pass through the app, and opening the link SHALL never wait on the listing.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person asks to save a password while at the computer the agent runs on
- **THEN** the link is a Cloudflare address, the same kind a phone would get

#### Scenario: A card form while the inbox is on

- **WHEN** a payment needs a card and the computer can reach the inbox
- **THEN** the private form opens at a Cloudflare address, the inbox lists it with *Open* until it ends, and the card goes only from the person's device to the computer

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a private form without a send or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in. When the site asks for the email or username on a page of its own before any password, the agent SHALL send that link at the first page, asking for the username and the password together, with the password optional; a login saved with no password SHALL type only the username, and a later password page SHALL get the password link with the username filled in. When the agent's browser shows a page on that site as the link opens, the page SHALL open with one picture of that page, taken before the link opens, which the person can view full screen and zoom; a page on another site SHALL give no picture. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. The inbox's listing of the link MAY name the site and carry it in its address, but SHALL never carry the username, so a link opened from the inbox asks for it. Once the person saves and continues, the agent SHALL log in with the saved login and carry on. When a login page offers only another provider's sign-in, the agent SHALL follow it to the provider's own login page and treat that page the same way.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box and a picture of Netflix's login page above it, fills only the username and password, and the agent logs in with them

#### Scenario: A login that asks for the email first

- **WHEN** a site's first login page shows only an email box and no saved login matches
- **THEN** the agent asks nothing in the chat and sends one password link where the password is optional, then types the email, and the password too when one was given

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form and no saved Google login matches
- **THEN** the agent opens Google's sign-in and sends the password link with Google's website filled in

#### Scenario: The browser is on another site

- **WHEN** the agent sends a password link for netflix.com while its browser shows a page on another site
- **THEN** the page opens with no picture

#### Scenario: Opened from the inbox

- **WHEN** the password link for a rejected netflix.com login is opened from the inbox
- **THEN** the page has netflix.com filled in and an empty username box, and the app never held the username
