## MODIFIED Requirements

### Requirement: The daily's own jobs are default schedules

WongStack SHALL ship the daily's built-in timed jobs as default schedules. Each SHALL be added to the person's schedules in the company app the first time a chat starts after install or update, approved on that computer, without a question. A default the person never changed SHALL take WongStack's newer version at an update; one they changed, paused or ended SHALL be left as it is, and an ended one SHALL never be added again. A schedule's run list SHALL leave out runs that found nothing to do, and show how many there were.

While the person's check-ins are off on a computer, each default they never changed SHALL wait paused on that computer, so its run list gets no runs that could not start. When check-ins go on, each default paused this way SHALL go on again. A default the person paused, changed or ended SHALL never be paused or resumed by check-ins, and one they resume while check-ins are off SHALL stay on.

#### Scenario: First chat after the update

- **WHEN** Jo opens a chat after the update and has no line-up or wiki tidy schedule
- **THEN** both appear in Jo's *Schedules* list, approved on that computer, and the wiki tidy runs once a period, not twice

#### Scenario: Jo changed the line-up

- **WHEN** Jo set the line-up to every 15 minutes, and a later update ships a new line-up
- **THEN** Jo's line-up stays every 15 minutes with Jo's text

#### Scenario: Check-ins off for three days

- **WHEN** Jo turns check-ins off on Monday and on again on Thursday
- **THEN** from Monday to Thursday the line-up and the wiki tidy show *Paused* and their run lists get no *didn't start* lines, and on Thursday both run on time again

#### Scenario: Jo paused the wiki tidy first

- **WHEN** Jo paused the wiki tidy, then turns check-ins off and on again
- **THEN** the line-up pauses and goes on again, and the wiki tidy stays paused
