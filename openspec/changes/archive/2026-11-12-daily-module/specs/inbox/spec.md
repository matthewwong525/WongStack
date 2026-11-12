## ADDED Requirements

### Requirement: The inbox opens on the pages waiting for the person

The inbox SHALL open on the signed-in person's review pages that wait on them, newest first, only theirs, each with its title, its folder, and when it came, and a tap SHALL open that page. A page SHALL leave the list when it is answered, closed, or runs out of time. The inbox SHALL show no list of open chats, and no days, dates, tasks or backlog. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo has two plans waiting on Jo's review and four open chats with nothing waiting
- **THEN** Jo sees the two plans under *Needs you*, newest first, and no row for the four chats, and a tap on the first opens its plan

#### Scenario: Nothing waits

- **WHEN** no page waits on Jo
- **THEN** the inbox says nothing waits, and shows the Archive below

## MODIFIED Requirements

### Requirement: The inbox keeps past review pages in an Archive

Below the waiting pages, the inbox SHALL show every signed-in person an Archive of their own answered or closed review pages, newest first, whether or not they use the daily. A search SHALL find pages by their title, waiting or archived. The Archive SHALL show no other person's pages, and no question, approval, private link or hidden item.

#### Scenario: Looking back at a past plan

- **WHEN** Jo, who never set up the daily, opens the inbox and searches *profit*
- **THEN** Jo sees each version of the profit plan they reviewed, newest first, and no one else's pages

#### Scenario: A page that ran out of time

- **WHEN** a review page's 24 hours pass with no answer
- **THEN** it leaves *Needs you*, and the page shows in the Archive with no answer

## REMOVED Requirements

### Requirement: The inbox opens on the person's chats

**Reason**: The chat list goes; *The inbox opens on the pages waiting for the person* replaces it.
**Migration**: The app's saved list of chats is deleted; the chat app shows open chats.

### Requirement: The person closes a chat from its row

**Reason**: With no chat rows, there is no row to close from.
**Migration**: Ask *what's going on?* in any chat, which offers to close finished chats.
