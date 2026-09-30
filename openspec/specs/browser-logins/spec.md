# browser-logins Specification

## Purpose

Let the agent use the person's own web accounts through agent-browser, with each login done once and reused, kept out of preview checks.

## Requirements

### Requirement: One persistent profile keeps logins

When a task first needs a login and agent-browser has no `profile`, the agent SHALL set one to an absolute folder. It SHALL NOT change a `profile` already set.

#### Scenario: An existing config

- **WHEN** the config has other keys and no `profile`
- **THEN** the agent adds `profile` and keeps the rest

### Requirement: The person does each login once

The agent SHALL hand the browser to the person to log in, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password anywhere but the browser tool's encrypted login store, which only the person fills through the password link.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

### Requirement: Personal browsing runs one task at a time

Browsing tasks and scheduled runs SHALL NOT share the profile at once; a task that finds it busy SHALL wait or report, never delete its lock. Preview checks SHALL NOT use the personal profile.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run finds the profile in use
- **THEN** it reports the browser busy and leaves the lock alone

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses a temporary profile with none of the person's logins

### Requirement: Personal browsing follows the installed tool's guide

Before a task's first agent-browser command, the agent SHALL load the guide agent-browser serves for its installed version.

#### Scenario: A first browsing task in a session

- **WHEN** a task needs the person's saved logins and has not yet loaded the guide
- **THEN** the agent loads it before opening the site

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs the person (a login, a captcha, a code, or any other input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself, except that API key or token website steps SHALL follow the own-browser requirement above. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time. Before it opens a link, the agent SHALL ask in the chat whether the person is ready and SHALL open the link only after they reply, unless the person's latest message asked to take over.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

#### Scenario: The person is away when a login comes up

- **WHEN** a site asks for a login and the person has not replied for an hour
- **THEN** the agent asks in the chat whether they're ready to log in, opens no link until they reply, and the link's 10 minutes start from that reply

### Requirement: A hand-over link closes itself

A hand-over link SHALL stop working when the finish the agent named is reached, when the person says they are done, or after 10 minutes, whichever comes first, even if the agent's session has ended. A closed link SHALL never work again. When the agent named a finish, it SHALL resume the task on reaching it without the person saying they are done.

#### Scenario: The person logs in

- **WHEN** the browser reaches the logged-in address the agent named
- **THEN** the link stops working and the agent resumes the task

#### Scenario: Nobody finishes

- **WHEN** 10 minutes pass without reaching the finish or hearing done
- **THEN** the link stops working and the agent tells the person it timed out

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open for input, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, geometry, and dropdown choices, visible form layout width, navigation metadata limited to history length and the initial handed-over page address, and its form actions' labels, association, geometry, and visible/enabled state to list or position them for the person, and MAY set a field or resolve a mirrored action on the person's action. It SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result. Private input and browser control through the link SHALL end before the originating workspace is notified to resume.

#### Scenario: A two-step code page
- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list
- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read

### Requirement: The agent shows its browsing in the chat

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, and take none while the person has the browser.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A hand-over mid-task

- **WHEN** the agent hands the person its browser for a login
- **THEN** no picture appears until the hand-over ends

### Requirement: The person can click and type in a handed-over browser

A hand-over link SHALL open the page the task was using, never a blank tab, and SHALL let the person click any spot on it and type into the field they chose, from a phone's on-screen keyboard or a computer's keyboard. The link SHALL show only that task's browser, not other browser sessions on the computer. When the link is open in a window narrower than 800 CSS pixels, the handed page SHALL initially take that window's width and a taller browser viewport. A visible form wider than that SHALL increase the bounded remote viewport width and permit preview panning so its edges remain reachable at readable size; sites whose layout fits SHALL retain their phone width. A wider window SHALL get 1280×720. When the link closes, however it closes, the page SHALL return to 1280×720 before the agent carries on.

#### Scenario: A card number from a phone
- **WHEN** the agent hands over a card form and the person, on a phone, taps the card box and types the number
- **THEN** the number appears in the card box on the agent's page

#### Scenario: A stray blank tab
- **WHEN** the browser has a blank tab in front of the task's page at hand-over
- **THEN** the link opens on the task's page

#### Scenario: A link opened on a phone
- **WHEN** the person opens the link on a phone 390 points wide
- **THEN** the preview fits the phone, the site's full form is reachable by panning when necessary, and a tap lands on the spot tapped
- **AND** after the link closes, the page is 1280×720 again

### Requirement: The person can fill a handed-over form from a list of its fields

A hand-over page SHALL list the handed page's text fields, dropdowns, and tick boxes, each labelled and in page order, with a dropdown showing the page's own choices. A value the person enters in the list SHALL reach the matching field on the page, as they type or pick it. Each box SHALL carry the kind of value it holds, from the page field's own marking, name, or label, so a password manager or a phone's autofill can fill the list. The list SHALL follow the page as it changes, and a field the list can't show SHALL stay reachable by tapping it on the picture and typing.

#### Scenario: Expiry dropdowns from a phone

- **WHEN** a handed-over card page has dropdowns for expiry month and year, and the person picks 03 and 2028 in the list on a phone
- **THEN** the page's dropdowns show 03 and 2028

#### Scenario: A password manager fills the card

- **WHEN** the person's password manager fills the list's card number, expiry, and security code boxes at once
- **THEN** each value lands in its own field on the page

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. It SHALL NOT hand the browser over to get that answer.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

### Requirement: The person saves logins through a private password link

When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, ending private input on successful completion, explicit closure, or after 10 minutes. The link's page SHALL be one screen that takes CSV password exports, dropped onto it or picked from the device, and logins typed or autofilled, into one list. Its primary completion action SHALL save the selected pending logins, including a valid filled login not yet added to the list, and return to the requesting task in one tap. Failed saves SHALL stay open for correction and SHALL NOT announce readiness. For an export, the person's device SHALL read the file and list its sites with none ticked; a typed login SHALL join the list ticked. Only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-a-login form from their phone's saved passwords and taps its save-and-continue action
- **THEN** that login is saved and the requesting chat is notified, and no command, log, file in the repo, or chat message holds its password

#### Scenario: An export plus a typed login

- **WHEN** the person drops an export on a laptop, ticks one site from it, adds a login for a site the export lacks, and taps its save-and-continue action once
- **THEN** both logins are saved, and the agent names both sites in the chat

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When it fails, or the site then asks for a code, the agent SHALL hand the browser over as for any login. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, with no hand-over

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and hands the browser over

### Requirement: Completed private input wakes the originating workspace

A successful private-input completion opened by an identifiable workspace SHALL make one automatic notification attempt to that same workspace, even when its chat is idle. The notification SHALL contain only completion identity, outcome, and saved-entry names, never credentials, private addresses, or page content. The agent SHALL handle the same completion once if both a waiting tool call and the notification report it. An expired, cancelled, or incomplete input SHALL NOT declare the task ready. A failed or unavailable notification SHALL preserve saved inputs and tell the person how to return to the chat manually.

#### Scenario: The chat stopped waiting

- **WHEN** the person successfully finishes a private-input step whose originating chat is idle
- **THEN** the private input ends and its workspace receives a result-only notification that starts the chat on the existing task without another message from the person
- **AND** a waiting tool call reporting the same completion does not cause the task to run twice

#### Scenario: Workspace notification is unavailable

- **WHEN** entries have been saved but there is no identifiable originating workspace or the notification is unconfirmed
- **THEN** the entries stay saved, the result remains available, and the page directs the person back to the chat without claiming the assistant was notified

### Requirement: The person can submit from outside the website preview

A hand-over page SHALL mirror identifiable visible native form-submit actions outside its live preview, with their own labels, form association, order, and disabled state. The person's tap SHALL activate the corresponding real website control after their queued field changes, preserving the site's validation and click behavior. Stale actions SHALL be refused rather than redirected to a different control, and no failed or uncertain submission SHALL be automatically repeated. Unsupported actions SHALL remain reachable through the preview. Submitting SHALL NOT by itself end the hand-over before its requested finish is reached.

#### Scenario: A login asks for a code next

- **WHEN** the person finishes typing a password and immediately taps the mirrored Sign in action, and the website then asks for a code
- **THEN** the last typed character reaches the page before its actual Sign in button is clicked, the field list and actions follow the code page, and the hand-over stays with the person

#### Scenario: The action changed before the tap

- **WHEN** a mirrored submit action was removed, replaced, or disabled after it was shown
- **THEN** the hand-over does not click a different action or repeat the submit, and offers a refresh or a tap in the preview

### Requirement: The person can recover from browser navigation

The hand-over SHALL offer icon controls for Back, Forward, Reload, and Return to start at the bottom in both Page and Fill fields views on phones and below the workspace on computers. On phones the controls SHALL hide while the on-screen keyboard is open and return when it closes. They SHALL act on the handed-over website, not the private link's own browser history. Navigation SHALL wait for queued field edits and SHALL never automatically retry an uncertain action. Closed links and unauthenticated requests SHALL NOT navigate the website. Every icon SHALL have an accessible name and tooltip, and a touch target of at least44 CSS pixels in both dimensions. Return to start SHALL open the initial handed-over HTTP(S) page address captured by the server once as this private link opens, keeping its path, query and fragment and removing URL credentials. Its destination SHALL remain unchanged across website navigation, including visits to other origins, and SHALL never be supplied by the client. Home-to-origin SHALL no longer be offered. The start address SHALL remain private to the short-lived watcher state and server; unavailable or unsupported start addresses SHALL report unavailability without clearing local fields or preview position. If the browser has only one history entry, Back and Forward SHALL report that no traversal is available without clearing local fields or resetting preview pan. A no-history action SHALL not be replaced with a different destination.

#### Scenario: An accidental external page
- **WHEN** the person follows an unwanted website link and taps Back
- **THEN** the handed-over browser returns to its preceding page and the field list follows that page

#### Scenario: A decorative logo and fresh browser history
- **WHEN** the person opens a page with no prior browser history and taps Back
- **THEN** the hand-over explains there is no previous page, preserves typing and pan, and offers Return to start to reach the original page without relying on its logo

#### Scenario: Returning from another website
- **WHEN** the hand-over begins on a specific page with a path, query and fragment, and the person later follows a link to another website then taps Return to start
- **THEN** the handed-over browser opens that exact original page address, rather than either website's root, and the field list and preview follow it

#### Scenario: No valid start address
- **WHEN** the starting page address is unavailable or not HTTP(S) and the person taps Return to start
- **THEN** the hand-over explains that the original page is unavailable, preserves typing and preview position, and does not navigate to a guessed page

#### Scenario: Navigation outside the private link
- **WHEN** a closed link or an unauthenticated request attempts navigation
- **THEN** the browser does not navigate

### Requirement: Page and fields have separate space

On windows narrower than 800 CSS pixels the hand-over SHALL offer Page and Fill fields views, with one visible at a time, and keep user-entered fields when switching. The Page view SHALL use the available screen height without requiring scrolling the hand-over document to reach its controls. On wider windows it SHALL show the live page and independently scrollable fields side by side. Connection and closure state SHALL remain visible in both layouts, with phone chrome temporarily hidden during keyboard entry and restored on closure.

#### Scenario: A phone login
- **WHEN** a person opens the hand-over on a phone and switches between Page and Fill fields after typing
- **THEN** the views fit the phone, the typing is preserved, and only the selected view accepts focus

#### Scenario: A desktop login
- **WHEN** a person opens the hand-over on a computer
- **THEN** the live page and fields are visible together and scrolling the fields does not move the page

### Requirement: The handed-over page scrolls dependably

A touch drag on the live page SHALL move the viewed content without scrolling the outer hand-over or turning that drag into a click. A phone preview SHALL allow panning a taller browser viewport so fixed-height pages can be viewed even when they provide no native scroll range. Scroll distance beyond the preview's available range SHALL scroll the website at the touched position. A cancelled gesture SHALL never click. Wider pages SHALL permit dragging left and right to reach both edges. Remaining horizontal and vertical scroll distance SHALL be forwarded independently at the gesture origin. Desktop wheels SHALL scroll at the pointer's page position. Navigation SHALL return the preview to its initial position.

#### Scenario: A phone swipe
- **WHEN** a person drags upward on the live page and releases outside its original position
- **THEN** the viewed content moves down through the page, additional distance scrolls the website, the outer hand-over remains still, and no click is sent

#### Scenario: A wide login form
- **WHEN** a login form extends beyond the phone width and the person drags sideways
- **THEN** the opposite edge becomes visible, a tap lands at its displayed position, and no form is submitted

#### Scenario: A swipe starting over a text field
- **WHEN** a person starts a drag on a text field and releases after moving
- **THEN** the preview scrolls without focusing or clicking that field

### Requirement: A page field opens the phone keyboard

On phones, a tap on a supported text field in the preview SHALL focus a native local input within that trusted gesture and send edits to the corresponding remote field through the existing private typing transport. Password fields SHALL remain password inputs and keep their autocomplete metadata. Local edits SHALL be shared with Fill fields. Geometry updates SHALL preserve active local inputs and SHALL NOT read remote values. Removed Up/Down and Type launchers SHALL not be needed for these interactions.

#### Scenario: Direct phone typing
- **WHEN** a person taps a supported text field in Page and types with the phone keyboard
- **THEN** the local field receives native focus, the typing reaches the correct website field, and switching to Fill fields retains it

#### Scenario: A moving field
- **WHEN** field geometry changes while the person is typing
- **THEN** the input position updates without replacing the focused input or reading the remote value

### Requirement: Phone typing keeps room for the active field

When an on-screen phone keyboard reduces the visual viewport, the hand-over SHALL hide its header, view tabs, and navigation while typing, and give the selected workspace that space. It SHALL keep the focused input mounted and pan its local scroller only as needed to show the active field in the remaining area. The remote viewport and page scale SHALL remain unchanged by height-only keyboard changes. Dismissing the keyboard SHALL restore the controls even if the input remains focused. A hardware keyboard without a reduced visual viewport SHALL not hide controls. Closure SHALL restore the status.

#### Scenario: A password field above the keyboard
- **WHEN** a person taps a password field and the on-screen keyboard shrinks the phone's visible area
- **THEN** the header, tabs and navigation disappear, the password field is visible in the local stage, focus and typing are retained, and the remote page is not resized

#### Scenario: Dismissing the keyboard without blurring
- **WHEN** the person dismisses the keyboard while the native field keeps focus
- **THEN** the original controls return without clearing typing or resetting the preview pan

#### Scenario: Typing with a physical keyboard
- **WHEN** a person focuses a field with a physical keyboard and the viewport does not shrink
- **THEN** the navigation stays available

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. It SHALL NOT use browser automation, saved logins, screenshots, page extraction, or a remote browser hand-over for that token step. A newly supplied or replacement value SHALL use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request with a saved service login

- **WHEN** a task needs a missing API token and the agent has a saved login for the service
- **THEN** it gives the person a token-management link and steps without opening the service in its browser, receives the value through the private key link, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward
