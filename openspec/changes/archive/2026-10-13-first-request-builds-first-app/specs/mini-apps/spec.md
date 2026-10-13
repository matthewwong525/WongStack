# Spec Delta

## MODIFIED Requirements

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its employer guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to question the person about a first app, build it, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it. Every signed-in person SHALL see one assistant connection prompt on the page. Once Access per-app permissions have started, employees SHALL see that prompt and their authorized apps without employer personalization or administration guidance; the employer's existing removable welcome SHALL be preserved.

#### Scenario: A fresh install

- **WHEN** the employer opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

#### Scenario: Employee opens a configured app

- **WHEN** an employee opens the business app after Access per-app permissions have started
- **THEN** the page offers their assistant setup prompt and allowed apps, without giving them employer personalization or administration guidance

## ADDED Requirements

### Requirement: The first request builds a first app

The first request SHALL ask the agent to question the person about their work and where their time goes, one question at a time, starting from what the agent already knows about them. It SHALL ask the agent to then suggest a few apps the person would use, build the one they pick, remove the welcome, explain each step, and show a preview before publishing. It SHALL NOT ask the agent to read the person's chats; setup owns that. The request SHALL name no file, folder, or command.

#### Scenario: The request is pasted

- **WHEN** a person pastes the request into their chat
- **THEN** the agent asks about their work one question at a time, suggests a few apps, and builds the one they pick
- **AND** it shows a preview with the new app and no welcome, and asks before publishing
- **AND** it reads no past chats on account of the request

## REMOVED Requirements

### Requirement: The first request changes only the page

**Reason**: The first request now asks for a first app built around the person's work, so it interviews them about that work instead of only renaming the page.
**Migration**: Ask in chat to change the page heading. An install whose welcome is still showing gets the new request with an update; a removed welcome stays removed.
