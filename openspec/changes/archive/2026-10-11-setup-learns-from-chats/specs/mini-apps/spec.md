# Spec Delta

## MODIFIED Requirements

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its employer guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it. Every signed-in person SHALL see one assistant connection prompt on the page. Once Access per-app permissions have started, employees SHALL see that prompt and their authorized apps without employer personalization or administration guidance; the employer's existing removable welcome SHALL be preserved.

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

### Requirement: The first request changes only the page

The first request SHALL ask the agent to ask what to call the page, update its heading, remove the welcome, explain each step, and show a preview before publishing. It SHALL NOT ask the agent to read the person's chats or to interview them about themselves; setup owns learning about the person. The request SHALL name no file, folder, or command.

#### Scenario: The request is pasted

- **WHEN** a person pastes the request into their chat
- **THEN** the agent asks what to call the page, shows a preview with the new heading and no welcome, and asks before publishing
- **AND** it reads no past chats on account of the request

## REMOVED Requirements

### Requirement: The first request learns about the person

**Reason**: Setup now learns about the person from their past chats while it installs, so the first request no longer asks permission, skims chats, or runs question rounds.

**Migration**: A new install learns during setup. On an install made before this release, ask the assistant *get to know me from my past chats*; the memory skill's recent-chats read still serves it.
