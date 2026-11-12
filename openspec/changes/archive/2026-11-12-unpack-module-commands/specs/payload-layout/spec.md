## ADDED Requirements

### Requirement: Each module command loads in every chat of an install

A WongStack install, from setup or an update, SHALL give each command a module keeps in its own `skills/<command>/` folder a top-level skill in the repo's skills folder, so the command loads by its bare name in every chat, also where the host loads no plugin, such as a folder the person did not trust. The command SHALL load once. Its other files SHALL stay inside the module. Every shipped page, guide, and message SHALL name the command by its bare name, such as `/schedule`, never by the module's prefix. An update SHALL move an older install's command to its top-level place and keep the install's own edits. A project skill that already has the name SHALL be named in the update plan and kept; the install record's skill rename SHALL give WongStack's command another name.

#### Scenario: A chat in an untrusted folder

- **WHEN** a person opens a chat in a new Paseo workspace of an install and asks to make a schedule
- **THEN** the install's `/schedule` loads and handles it, and Claude Code's own cloud schedules do not

#### Scenario: A project with its own `shop` skill

- **WHEN** an install that has its own `shop` skill takes the update
- **THEN** the update plan names the clash, keeps the project's skill, and installs WongStack's command only under the name the install record gives it
