## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open for input, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, geometry, and dropdown choices, visible form layout width, navigation metadata limited to history length and the initial handed-over page address, and its form actions' labels, association, geometry, and visible/enabled state to list or position them for the person, and MAY set a field or resolve a mirrored action on the person's action. It SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result. Private input and browser control through the link SHALL end before the originating workspace is notified to resume.

#### Scenario: A two-step code page
- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list
- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read
