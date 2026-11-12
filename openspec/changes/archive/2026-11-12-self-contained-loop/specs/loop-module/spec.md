## MODIFIED Requirements

### Requirement: A project adds the build loop from one pasted message

A project with no WongStack SHALL be able to add `/explore`, `/plan`, `/apply`, `/save`, `/ship`, `/verify`, and `/close` by pasting one message into any AI tool. Setup copies the module in as real folders, fills each missing part, asks before each step that costs money or makes something public, and asks before any push. In a WongStack project, setup SHALL stop and change nothing.

#### Scenario: A project with no OpenSpec adds the loop

- **WHEN** a person pastes the install message in a project with no WongStack and no OpenSpec
- **THEN** the project gets all seven commands under their own names, OpenSpec is installed after a yes, and a sample plan page opens

#### Scenario: A WongStack project pastes the message

- **WHEN** the install message runs in a WongStack project
- **THEN** setup stops and changes no file

## ADDED Requirements

### Requirement: The loop works the same with or without memory

No loop command SHALL read or write the memory store, or depend on the memory plugin being installed. Where memory is installed, it SHALL reach the chat only through its own hooks and skill. There SHALL be no separate resume command: `/apply` picks up saved work.

#### Scenario: A project without memory

- **WHEN** a project has the loop and no memory plugin, and the person runs `/explore`, `/apply`, and `/close`
- **THEN** each finishes its job, and none says memory is missing or unreachable

#### Scenario: Pick up saved work in a new chat

- **WHEN** the person types `/apply add-auth` in a new chat, and `add-auth` is saved on its branch
- **THEN** the chat switches to that branch, by the same review as any pick-up, and recaps the change before it builds
