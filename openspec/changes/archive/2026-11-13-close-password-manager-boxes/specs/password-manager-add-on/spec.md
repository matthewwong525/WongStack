## MODIFIED Requirements

### Requirement: The agent picks a login from an unlocked password manager only after a yes

The agent SHALL NOT unlock a password manager add-on. When a site needs a login and the add-on is already unlocked and offers a login for the page's site, the agent SHALL ask the person in the chat, every time, naming the login, the site, and each step it will take once signed in, and SHALL pick that one login from the add-on's fill list only after a yes. When the list does not open by itself, the agent MAY open it by the add-on's own icon in the page's login box. A passkey saved in the add-on SHALL count as a login: when the site asks for a passkey and the add-on offers one, the agent SHALL ask the same way, naming the passkey, and SHALL press the add-on's passkey sign-in once, only after a yes. It SHALL then take only the named steps; a step outside them SHALL first get a new yes, and an outward action its own yes. When the task ends, it SHALL say which named steps it did. Apart from the add-on's icon in the login box, the names of the logins or passkeys offered for that site, that one pick, and the close of a box by its own close button, the agent SHALL NOT click, type in, or read the add-on's own button, menus, or fill lists: its page readings SHALL leave out the add-on's parts and show a filled password box only as filled, and any other click or typing step aimed at the add-on SHALL be refused, as SHALL a key that could pick from its fill list while that list shows. When the add-on is locked or offers no login, the person SHALL sign in in a sign-in turn, as before. When a password manager is added, the agent SHALL tell the person to set its auto-lock to 8 hours; after the default 1Password add, it SHALL say so in its first sign-in turn for 1Password. It SHALL NOT give that advice for another add-on.

#### Scenario: Unlocked, with a login for the site

- **WHEN** a task needs Canva, and the person's unlocked 1Password offers "Canva (work)" for it
- **THEN** the agent asks to sign in with "Canva (work)" and names the steps after it, picks it only after a yes, does only those steps, and reports them

#### Scenario: The list opens only from the icon

- **WHEN** a login page's email box shows 1Password's icon, and focusing the box opens no list
- **THEN** the agent opens the list by the icon, reads only the login names, and asks before a pick

#### Scenario: A passkey saved in 1Password

- **WHEN** a site asks for a passkey and the person's unlocked 1Password offers "Shopify (info@)"
- **THEN** the agent asks to sign in with that passkey and names the steps after it, presses 1Password's passkey sign-in once after a yes, and does only those steps

#### Scenario: Locked

- **WHEN** a site needs a login and 1Password is locked
- **THEN** the agent does not unlock it, opens the sign-in page, and sends the person a sign-in turn; the first one for the default 1Password says to set its auto-lock to 8 hours

#### Scenario: A fill list is on the page

- **WHEN** the agent reads a login page while the password manager shows its fill list there
- **THEN** the reading holds no part of that list but the offered login names asked for, and a click aimed at it outside an approved pick is refused

#### Scenario: No vault advice for another add-on

- **WHEN** the agent adds Dark Reader after the person's yes
- **THEN** it says nothing about an auto-lock

## ADDED Requirements

### Requirement: The agent closes a password manager's box that covers the page

When a password manager's own box, such as 1Password's *Save login?*, shows over the page, the agent SHALL close it with no ask, only by the box's own close button: one named *Close*, *Dismiss*, *Not now*, or *No thanks*, or an X with one of those names. It SHALL NOT press a button that saves, updates, or changes a setting, such as *Save*, *Update*, or *Never*, and SHALL read nothing else in the box. When the box has no such button, the person SHALL close it in a live view, as before.

#### Scenario: A Save login box covers the button the task needs

- **WHEN** 1Password's *Save login?* box covers a site's *Confirm* button during a task
- **THEN** the agent presses the box's close button, saves nothing to the vault, presses *Confirm*, and asks the person nothing about the box

#### Scenario: A box with no close button

- **WHEN** a password manager's box covers the page and has none of the close buttons
- **THEN** the agent presses nothing in it and sends the person a live view to close it
