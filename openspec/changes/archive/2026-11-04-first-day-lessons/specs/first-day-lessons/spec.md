## ADDED Requirements

### Requirement: A person opens each lesson by name in a new chat

A person SHALL be able to start Lesson 1 or Lesson 2 by asking for it in plain words, such as `lesson 1`, as the first message of a new chat in the project, with no other setup and with or without Paseo. A lesson SHALL run one step at a time and wait for the person to do each step before it goes on, and SHALL NOT do a step for them when doing it is what the step teaches.

#### Scenario: Starting Lesson 1

- **WHEN** a person types `lesson 1` in a new chat in the project
- **THEN** the chat starts Lesson 1 at its first step and waits for them before the second

#### Scenario: Asking for a lesson that does not exist

- **WHEN** a person asks for `lesson 3`
- **THEN** the chat says there are two lessons and offers Lesson 1 or Lesson 2

### Requirement: Lesson 1 teaches skills and one task per chat

Lesson 1 SHALL learn who the person is and what they work on, and SHALL save a short page about them in the company knowledge when none lists their email. It SHALL teach what a skill is, how to list skills, how asking in plain words picks one, and how to answer a question card, and the person SHALL run one real skill that fits their job. It SHALL end by teaching one task per chat or workspace, how to close a finished chat, and how to open Lesson 2 in a new one, in words for the person's own assistant. Lesson 1 SHALL change no file in the project.

#### Scenario: Finishing Lesson 1

- **WHEN** a person finishes the last step of Lesson 1
- **THEN** the chat tells them how to open a new chat or workspace from the newest version and type `lesson 2` there, and the project has no changed file

#### Scenario: A person already known

- **WHEN** the company knowledge already has a page that lists the person's email
- **THEN** the lesson reads it instead of asking again for what it holds, and writes no second page

### Requirement: Lesson 2 takes a real change through to a saved change, never published

Lesson 2 SHALL have the person pick a small, real task from their own job, such as a skill for a task they repeat or a small tool, and take it through planning, the plan's review page, building and saving. It SHALL end with the link that shows the saved change, name who can make it live, and say how to come back to unfinished work. The lesson SHALL NOT publish the change, even when the person may publish.

#### Scenario: Finishing Lesson 2

- **WHEN** the person's change is saved
- **THEN** the chat shows the link to the saved change, names who makes it live, and does not publish it

#### Scenario: The person has no task in mind

- **WHEN** the person can not name a task from their job
- **THEN** the chat suggests two or three small ones from what it knows of their work and lets them pick
