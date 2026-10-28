## ADDED Requirements

### Requirement: The link reaches the person in the turn's last message
When `open` succeeds, it SHALL print, directly after the `HANDOVER_LINK=` line, one `HANDOVER_SEND=` line that tells the agent to run `wait` in the background and then end its turn with the link on its own line. The reminder SHALL hold no part of the link or its key. The agent SHALL put the `HANDOVER_LINK` value in the final message of the turn that opened it, and SHALL NOT send it only in text between tool calls. A failed or refused `open` SHALL print neither line.

#### Scenario: A link opens
- **WHEN** `hand-over.mjs open` prints `HANDOVER_LINK=<url>`
- **THEN** the next line is `HANDOVER_SEND=` with the reminder, holding no address, key, or Cloudflare name, and the agent's last message of the turn holds the link on its own line

#### Scenario: Open is refused
- **WHEN** `open` exits non-zero, such as while another link is open or when the address never answers
- **THEN** it prints neither `HANDOVER_LINK=` nor `HANDOVER_SEND=`
