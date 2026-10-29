## MODIFIED Requirements

### Requirement: Standalone explore asks in small groups

Standalone `/explore` SHALL ask material questions in small groups of related questions that can be answered together, SHALL wait for answers before asking what depends on them, and MAY ask several groups as the thinking develops. It SHALL change no repo file; throwaway files in the git-ignored `.scratch/` folder are allowed. When the thinking is done, it SHALL end with a next-step question whose recommended option is to plan it, and SHALL NOT start `/plan` without that answer.

#### Scenario: One answer shapes the next question

- **WHEN** a later question depends on an earlier answer
- **THEN** `/explore` asks it only after that answer arrives

#### Scenario: The thinking is done

- **WHEN** a person who typed `/explore` has answered its last round
- **THEN** it summarizes and asks whether to plan it, keep thinking, or stop, and drafts nothing until they choose
