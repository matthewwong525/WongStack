## MODIFIED Requirements

### Requirement: Items close on their own

A plan item SHALL close once a tap on it, notes or an action, reaches its chat, when its link's time runs out, or when its chat closes. A plan whose tap did not arrive SHALL stay open. An approval or question SHALL close once its answer reaches the chat, when its chat closes, or when the daily watch that sent it ends. A closed item SHALL leave the waiting items. A closed review page SHALL be kept with its page and its answers, and SHALL never be deleted; any other closed item SHALL be removed after a day. A plan the chat updates and opens again SHALL come back as a new item.

#### Scenario: The answer arrived

- **WHEN** an approval's tap is delivered
- **THEN** the approval leaves the inbox, and a day later it is gone

#### Scenario: Notes on a plan arrived

- **WHEN** the person sends notes on a plan and the chat gets them
- **THEN** the plan moves to the Archive with its page, and its updated version waits as a new entry once the chat opens it again

## ADDED Requirements

### Requirement: The inbox lists the person's review pages

The inbox SHALL show every signed-in person a Reviews list of their own review pages, whether or not they use the daily: the pages waiting on them first, then an Archive of every answered or closed page, each part newest first. A search SHALL find pages in both parts by their title. The list SHALL show no other person's pages, and no question, approval, private link or hidden item.

#### Scenario: Looking back at a past plan

- **WHEN** Jo, who never set up the daily, opens *Reviews* and searches *profit*
- **THEN** Jo sees each version of the profit plan they reviewed, newest first, and no one else's pages

#### Scenario: A page that ran out of time

- **WHEN** a review page's 24 hours pass with no answer
- **THEN** it leaves *Waiting* and shows in the Archive with no answer

### Requirement: An archived review page opens read-only

An archived review page SHALL open in the same view as a waiting one, showing the same page. It SHALL offer no action and take no notes, and no tap on it SHALL ever reach a chat. Above the page it SHALL say what reached the chat and when, with any notes sent, or that no answer came and when it closed.

#### Scenario: Opening an answered page

- **WHEN** the person opens a page they answered with *Build and publish* and notes
- **THEN** the page shows read-only under the answer, its time and the notes, and offers no button

#### Scenario: An older page tries to send

- **WHEN** an archived page built before this change sends its notes
- **THEN** nothing reaches the chat, and the page says the link has closed
