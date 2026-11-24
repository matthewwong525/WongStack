## RENAMED Requirements

- FROM: `### Requirement: The inbox keeps past review pages in an Archive`
- TO: `### Requirement: The inbox keeps past pages in Artifacts`

## MODIFIED Requirements

### Requirement: Items close on their own

A plan item SHALL close once a tap on it, notes or an action, reaches its chat, when its link's time runs out, or when its chat closes. A plan whose tap did not arrive SHALL stay open. An approval or question SHALL close once its answer reaches the chat, when its chat closes, or when the daily watch that sent it ends. A closed item SHALL leave *Open*. A closed review page SHALL be kept with its page and its answers, and SHALL never be deleted; any other closed item SHALL be removed after a day. A plan the chat updates and opens again SHALL come back as a new item.

#### Scenario: The answer arrived

- **WHEN** an approval's tap is delivered
- **THEN** the approval leaves the inbox, and a day later it is gone

#### Scenario: Notes on a plan arrived

- **WHEN** the person sends notes on a plan and the chat gets them
- **THEN** the plan moves to *Artifacts* with its page, and its updated version waits as a new entry once the chat opens it again

### Requirement: An archived review page opens read-only

An archived review page SHALL open in the same view as an open one, showing the same page. It SHALL offer no action and take no notes, and no tap on it SHALL ever reach a chat. Above the page it SHALL say what reached the chat and when, with any notes sent, or that no answer came and when it closed. A page whose answer has just reached the chat SHALL look the same at once, before it moves to *Artifacts*.

#### Scenario: Opening an answered page

- **WHEN** the person opens a page they answered with *Build and publish* and notes
- **THEN** the page shows read-only under the answer, its time and the notes, and offers no button

#### Scenario: Just answered

- **WHEN** the person taps *Approve* on a page in the inbox and the chat gets it
- **THEN** the page shows read-only under *Approve* and its time, with no *Send notes* and no *Remove* on a sent file

#### Scenario: An older page tries to send

- **WHEN** an archived page built before this change sends its notes
- **THEN** nothing reaches the chat, and the page says the link has closed

### Requirement: The inbox keeps past pages in Artifacts

Below *Open*, the inbox SHALL show every signed-in person *Artifacts*: their own answered or closed pages, newest first, whether or not they use the daily. A search SHALL find pages by their title, open or closed, and no page SHALL show twice. *Artifacts* SHALL show no other person's pages, and no question, approval, private link or hidden item.

#### Scenario: Looking back at a past plan

- **WHEN** Jo, who never set up the daily, opens the inbox and searches *profit*
- **THEN** Jo sees each version of the profit plan they reviewed, newest first, and no one else's pages

#### Scenario: A page that ran out of time

- **WHEN** a review page's 24 hours pass with no answer
- **THEN** it leaves *Open*, and the page shows in *Artifacts* with no answer

### Requirement: The inbox opens on the pages waiting for the person

The inbox SHALL open on the signed-in person's pages that wait on them, under *Open*, newest first, only theirs, each with its title, its folder, and when it came, and a tap SHALL open that page. A page SHALL leave *Open* when it is answered, closed, or runs out of time. The inbox SHALL show no list of open chats, and no days, dates, tasks or backlog. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo has two plans waiting on Jo's review and four open chats with nothing waiting
- **THEN** Jo sees the two plans under *Open*, newest first, and no row for the four chats, and a tap on the first opens its plan

#### Scenario: Nothing waits

- **WHEN** no page waits on Jo
- **THEN** the inbox says *Nothing open.*, and shows *Artifacts* below
