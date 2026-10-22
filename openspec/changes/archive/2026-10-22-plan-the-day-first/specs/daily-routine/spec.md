## ADDED Requirements

### Requirement: Morning agents plan before they work

Where the host can open and watch other agents, every agent `/daily` opens for the morning's steps, and every agent a caller asks `/daily` to plan first, SHALL first only read and plan. While planning it SHALL change, save, send or pay for nothing. Its plan SHALL say what it will do, what it needs from the person, what it will ask before it acts outside its own work, and any question it has now. The chief SHALL never reply *keep going* or pick an answer for an agent that is still planning. An agent that stops without a plan SHALL get one nudge, then show as having no plan.

#### Scenario: A step opens in the morning

- **WHEN** the person runs `/daily` and their ad brief step opens its own workspace
- **THEN** its agent reads, writes its plan, and stops, and nothing outside its workspace changes

#### Scenario: A plan that never comes

- **WHEN** an agent stops twice while planning without writing a plan
- **THEN** the chief stops nudging it and its card shows *No plan*

### Requirement: The person's Go starts each planned agent

Once every planning agent has a plan, or 15 minutes after the first opened, the chief SHALL put each plan before the person together. No planned agent SHALL start working before the person's answer on it. On *Go*, the agent SHALL receive the person's note and answers and start working, and the chief SHALL watch it as any other agent. On *Not today*, the agent SHALL stop and its workspace SHALL close; a one-off task SHALL come back as a reminder for the next day, and a step on the person's list SHALL come back on its own days. Where the inbox is unavailable, the chief SHALL ask in the daily chat which agents go today, in one question with their questions alongside.

#### Scenario: Two go, one waits

- **WHEN** the person sends two plans on *Go* and the TikTok Shop task on *Not today*
- **THEN** the two agents start with the person's notes, the TikTok Shop workspace closes, and tomorrow's `/daily` lists it as a reminder

#### Scenario: No inbox

- **WHEN** the morning plans are in and the inbox does not answer
- **THEN** the daily chat shows each plan and asks one question for which agents go today, and starts only those

### Requirement: The watch tells the inbox where each agent stands

While the inbox is available, the daily watch SHALL report each watched agent's state to it: planning, waiting on the person, working with its latest step and the chief's last action, or done with its checked proof. A report SHALL carry no more of the agent's words than its latest step's one line. An agent that closes SHALL leave the inbox.

#### Scenario: The chief keeps an agent going

- **WHEN** the chief replies *keep going* to the landing-page agent
- **THEN** its inbox card shows its latest step and *Kept going* within a minute

### Requirement: Tasks handed over mid-day start at once

A task the person asks the daily chat to start after the morning round SHALL start working at once from its brief, with no planning round.

#### Scenario: A task asked at noon

- **WHEN** the person tells the daily chat at noon to get someone to research packaging suppliers
- **THEN** the agent starts researching at once and the chief watches it
