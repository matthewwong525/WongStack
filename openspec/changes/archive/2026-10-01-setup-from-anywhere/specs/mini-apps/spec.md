## MODIFIED Requirements

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to get to know the person, personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

## ADDED Requirements

### Requirement: The first request learns about the person

The first request SHALL ask the agent to ask permission before reading anything, then skim the person's Claude Code and Codex chats from the last 30 days on this computer, then ask two or three short rounds of questions about what it could not find. It SHALL ask the agent to save short notes about the person on their wiki page and in memory, never passwords, keys, or copies of chats, and only then to personalize the page with a preview and ask before publishing. The request SHALL name no file, folder, or command.

#### Scenario: Past chats found

- **WHEN** a person pastes the request on a computer with recent chats and allows the skim
- **THEN** the agent asks only what the chats did not answer, saves short notes about them, and shows a preview of their page before publishing

#### Scenario: No past chats or no permission

- **WHEN** the person declines the skim, or the computer has no recent chats, such as a hosted server
- **THEN** the agent reads nothing and goes straight to the question rounds
