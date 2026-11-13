## ADDED Requirements

### Requirement: No module loads as a plugin

The source and every install SHALL load no WongStack module as a plugin: no module folder SHALL hold a plugin manifest, and the root SHALL hold no plugin list. The project's own settings for each agent SHALL run each module's hooks, once each, so they run in every chat, also in a folder the person did not trust. Each command a module keeps in its own `skills/<command>/` folder SHALL load by its bare name as a top-level skill. An update SHALL move an older install off plugins: it SHALL remove the module plugin files, add the module hooks to the project's settings, turn off any module plugin the settings name, drop a hook the project added by hand that runs the same module script, and remove WongStack's module plugins from that computer's Codex. A Codex chat on a computer that still has them SHALL name the one command that removes them, and go on.

#### Scenario: A chat in an untrusted folder

- **WHEN** a person opens a new Claude Code chat in a Paseo workspace of an install the person never trusted
- **THEN** the memory digest and Daily's start check run, Daily's stop check runs at the end of each reply, each hook runs once, `/schedule` loads once, and no module plugin is listed

#### Scenario: An install that ran Daily's hooks by hand

- **WHEN** an install whose settings run Daily's hooks by hand and turn Daily's plugin off takes the update
- **THEN** its settings run each Daily hook once, name no module plugin, and keep every other hook it added
